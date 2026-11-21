/**
 * KALESH.EXE — Google Sheet → site sync (Apps Script).
 *
 * Sheet tab "kalesh" (name configurable below), header row 1:
 *   A links | B title | C side | D tags | E note | F status | G post_id
 * Any automation (Zapier/Make/"Instant"/"Muse"/a Claude chat with the Google Sheets connector, or a human)
 * appends rows with A–E filled and F/G empty. Every 5 minutes this script sends new rows to the
 * `ingest` Edge Function and writes back "posted ✅" / "duplicate ♻️" / "error: …" and the post id.
 *
 * Tab "scout" (for AI scouts like Instinct and Meta Muse), header row 1:
 *   A links | B title | C side | D tags | E why | F found_by | G found_at | H approve | I status | J post_id
 * Scouts append A–G. Nothing goes live until a human sets H "approve" to yes; the next sync then
 * posts it and fills I/J. Other rows just wait.
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
const SCOUT_SHEET = 'scout';
const SCOUT_HEADERS = ['links', 'title', 'side', 'tags', 'why', 'found_by', 'found_at', 'approve', 'status', 'post_id'];
const SCOUT_COL = { links: 1, title: 2, side: 3, tags: 4, note: 5, found_by: 6, found_at: 7, approve: 8, status: 9, post_id: 10 };
const BATCH = 20;           // rows per ingest call (function max is 25)
const MAX_PER_RUN = 60;     // keep each run well under the Apps Script 6-minute limit

function onOpen() {
  SpreadsheetApp.getUi().createMenu('KALESH')
    .addItem('Sync now', 'syncKalesh')
    .addItem('Retry errors', 'retryErrors')
    .addItem('Setup (headers, scout tab, 5-min trigger)', 'setup')
    .addToUi();
}

function setup() {
  const sheet = getSheet_();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  const sideRule = SpreadsheetApp.newDataValidation().requireValueInList(['', 'balaks', 'bataks'], true).setAllowInvalid(true).build();
  sheet.getRange(2, COL.side, sheet.getMaxRows() - 1, 1).setDataValidation(sideRule);
  const scout = getSheet_(SCOUT_SHEET);
  scout.getRange(1, 1, 1, SCOUT_HEADERS.length).setValues([SCOUT_HEADERS]).setFontWeight('bold');
  scout.setFrozenRows(1);
  scout.getRange(2, SCOUT_COL.side, scout.getMaxRows() - 1, 1).setDataValidation(sideRule);
  // A yes/no dropdown, not a checkbox: checkboxes make every empty row count as data, so an agent's
  // "append row" would land at the bottom of the sheet (row 1000+) instead of under the last real row.
  const approve = scout.getRange(2, SCOUT_COL.approve, scout.getMaxRows() - 1, 1);
  approve.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['yes', 'no'], true).setAllowInvalid(true).build());
  approve.setValues(approve.getValues().map(([v]) => [v === false ? '' : v]));
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

    // Your own rows: everything with links and no status.
    syncTab_(getSheet_(), COL, HEADERS.length, () => true, url, secret);
    // Scout rows: only the ones you set "approve" to yes.
    const scout = SpreadsheetApp.getActive().getSheetByName(SCOUT_SHEET);
    if (scout) syncTab_(scout, SCOUT_COL, SCOUT_HEADERS.length, r => isYes_(r[SCOUT_COL.approve - 1]), url, secret);
  } finally {
    lock.releaseLock();
  }
}

/** Clears the status of rows that failed so the next sync retries them. */
function retryErrors() {
  [[getSheet_(), COL], [SpreadsheetApp.getActive().getSheetByName(SCOUT_SHEET), SCOUT_COL]].forEach(([sheet, col]) => {
    if (!sheet) return;
    const last = sheet.getLastRow();
    if (last < 2) return;
    const range = sheet.getRange(2, col.status, last - 1, 1);
    range.setValues(range.getValues().map(([s]) => [/^(error|sending)/.test(String(s)) ? '' : s]));
  });
  syncKalesh();
}

function syncTab_(sheet, col, width, ready, url, secret) {
  const last = sheet.getLastRow();
  if (last < 2) return;
  const values = sheet.getRange(2, 1, last - 1, width).getValues();
  const todo = [];
  values.forEach((r, i) => {
    const links = String(r[col.links - 1] || '').trim();
    const status = String(r[col.status - 1] || '').trim();
    if (links && !status && ready(r)) todo.push({ row: i + 2, r });
  });
  const work = todo.slice(0, MAX_PER_RUN);
  for (let i = 0; i < work.length; i += BATCH) sendBatch_(sheet, col, url, secret, work.slice(i, i + BATCH));
}

function sendBatch_(sheet, COL, url, secret, batch) {
  batch.forEach(b => sheet.getRange(b.row, COL.status).setValue('sending…'));
  SpreadsheetApp.flush();
  const rows = batch.map(({ row, r }) => ({
    ref: String(row),
    links: String(r[COL.links - 1]),
    title: String(r[COL.title - 1] || '').trim() || null,
    side: String(r[COL.side - 1] || '').trim() || null,
    tags: [String(r[COL.tags - 1] || '').trim(), COL.found_by ? String(r[COL.found_by - 1] || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') : '']
      .filter(Boolean).join(', ') || null,
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

function isYes_(v) {
  return v === true || /^\s*(yes|y|haan|ha|ok|approve|✅)\s*$/i.test(String(v || ''));
}

function getSheet_(name) {
  const ss = SpreadsheetApp.getActive();
  name = name || SHEET_NAME;
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
