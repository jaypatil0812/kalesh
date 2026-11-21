/**
 * KALESH.EXE — Google Sheet → site sync (Apps Script).
 *
 * Sheet tab "kalesh" (name configurable below), header row 1:
 *   A links | B title | C side | D tags | E note | F status | G post_id
 * Any automation (Zapier/Make/"Instant"/"Muse"/a Claude chat with the Google Sheets connector, or a human)
 * appends rows with A–E filled and F/G empty. Every 5 minutes this script sends new rows to the
 * `ingest` Edge Function and writes back "posted ✅" / "duplicate ♻️" / "error: …" and the post id.
 *
 * Setup (once):
 *   1. Extensions → Apps Script, paste this file.
 *   2. Project Settings → Script properties:
 *        INGEST_URL     = https://<project-ref>.supabase.co/functions/v1/ingest
 *        INGEST_SECRET  = <same value as `supabase secrets set KALESH_INGEST_SECRET=...`>
 *   3. Run `setup` once (approve the permissions). It writes the header row and installs the 5-minute trigger.
 * The secret lives only in Script Properties — never type it into the sheet itself.
 */

const SHEET_NAME = 'kalesh';
const HEADERS = ['links', 'title', 'side', 'tags', 'note', 'status', 'post_id'];
const COL = { links: 1, title: 2, side: 3, tags: 4, note: 5, status: 6, post_id: 7 };
const BATCH = 20;           // rows per ingest call (function max is 25)
const MAX_PER_RUN = 60;     // keep each run well under the Apps Script 6-minute limit

function onOpen() {
  SpreadsheetApp.getUi().createMenu('KALESH')
    .addItem('Sync now', 'syncKalesh')
    .addItem('Retry errors', 'retryErrors')
    .addItem('Setup (headers + 5-min trigger)', 'setup')
    .addToUi();
}

function setup() {
  const sheet = getSheet_();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  const sideRule = SpreadsheetApp.newDataValidation().requireValueInList(['', 'balaks', 'bataks'], true).setAllowInvalid(true).build();
  sheet.getRange(2, COL.side, sheet.getMaxRows() - 1, 1).setDataValidation(sideRule);
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'syncKalesh')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncKalesh').timeBased().everyMinutes(5).create();
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('INGEST_URL') || !props.getProperty('INGEST_SECRET')) {
    SpreadsheetApp.getActive().toast('Set INGEST_URL and INGEST_SECRET in Project Settings → Script properties.', 'KALESH', 10);
  }
}

/** Main job (5-minute trigger). Picks rows with links and an empty status. */
function syncKalesh() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return; // previous run still going
  try {
    const props = PropertiesService.getScriptProperties();
    const url = props.getProperty('INGEST_URL');
    const secret = props.getProperty('INGEST_SECRET');
    if (!url || !secret) throw new Error('Missing INGEST_URL / INGEST_SECRET script properties');

    const sheet = getSheet_();
    const last = sheet.getLastRow();
    if (last < 2) return;
    const values = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
    const todo = [];
    values.forEach((r, i) => {
      const links = String(r[COL.links - 1] || '').trim();
      const status = String(r[COL.status - 1] || '').trim();
      if (links && !status) todo.push({ row: i + 2, r });
    });
    const work = todo.slice(0, MAX_PER_RUN);
    for (let i = 0; i < work.length; i += BATCH) sendBatch_(sheet, url, secret, work.slice(i, i + BATCH));
  } finally {
    lock.releaseLock();
  }
}

/** Clears the status of rows that failed so the next sync retries them. */
function retryErrors() {
  const sheet = getSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return;
  const range = sheet.getRange(2, COL.status, last - 1, 1);
  range.setValues(range.getValues().map(([s]) => [/^(error|sending)/.test(String(s)) ? '' : s]));
  syncKalesh();
}

function sendBatch_(sheet, url, secret, batch) {
  batch.forEach(b => sheet.getRange(b.row, COL.status).setValue('sending…'));
  SpreadsheetApp.flush();
  const rows = batch.map(({ row, r }) => ({
    ref: String(row),
    links: String(r[COL.links - 1]),
    title: String(r[COL.title - 1] || '').trim() || null,
    side: String(r[COL.side - 1] || '').trim() || null,
    tags: String(r[COL.tags - 1] || '').trim() || null,
    note: String(r[COL.note - 1] || '').trim() || null,
  }));
  let results = [];
  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-kalesh-secret': secret },
      payload: JSON.stringify({ rows }),
      muteHttpExceptions: true,
    });
    const body = JSON.parse(res.getContentText() || '{}');
    if (res.getResponseCode() !== 200) throw new Error(body.error || ('HTTP ' + res.getResponseCode()));
    results = body.results || [];
  } catch (e) {
    batch.forEach(b => sheet.getRange(b.row, COL.status).setValue('error: ' + String(e.message || e).slice(0, 120)));
    return;
  }
  const byRef = {};
  results.forEach(x => { byRef[x.ref] = x; });
  batch.forEach(({ row }) => {
    const x = byRef[String(row)];
    const label = !x ? 'error: no result'
      : x.status === 'published' ? 'posted ✅'
      : x.status === 'duplicate' ? 'duplicate ♻️'
      : x.status === 'pending' ? 'pending 🕵️'
      : 'error: ' + String(x.error || 'unknown').slice(0, 120);
    sheet.getRange(row, COL.status, 1, 2).setValues([[label, (x && x.post_id) || '']]);
  });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}
