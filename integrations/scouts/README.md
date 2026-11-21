# KALESH scouts: Instinct + Meta Muse

Two personal AI agents hunt for real kalesh on X and drop it into the **KALESH Desk Inbox** Google Sheet,
on the **`scout`** tab. Nothing they find goes live until you set **approve** to **yes** on that row (the
Google Sheets app on your phone works). The sheet script then posts it within 5 minutes.

```
Instinct (cloud browser, logged into X) ─┐
                                          ├─► Sheet tab "scout" ─(you pick approve: yes)─► ingest ─► site
Meta Muse (web + news coverage)  ─────────┘
```

Why both: they hunt differently, so they find different fights.

| Agent | What it has | Its beat |
|---|---|---|
| **Instinct** | A persistent cloud browser it can log into sites with, a Google Workspace (Sheets) connector, scheduled tasks | Live X: search, trending in India, quote-tweet wars as they happen |
| **Meta Muse** | Google Sheets connector, recurring tasks (down to every few minutes), web research | The coverage: Indian news and viral pages that write up "Twitter is divided over…" stories, then the original tweets |

## One-time setup

1. **Sheet:** paste the latest `integrations/google-sheet/sync.gs` into Apps Script (Extensions → Apps Script), save, and run **`setup`** again. That creates the `scout` tab with a yes/no approve dropdown. Script properties stay as they are.
2. **Instinct:** connect Google Workspace in Instinct and give it access to the KALESH Desk Inbox sheet. Log in to X once inside Instinct's browser when it asks. A spare X account is fine, since it only reads. Then text it the message in [`instinct.md`](instinct.md).
3. **Muse:** Settings → Connectors → Google Sheets (read + write). Then send it the message in [`muse.md`](muse.md). Muse will ask to confirm the recurring schedule.
4. Check the `scout` tab after their first run. Set **approve** to **yes** on the good ones and leave the rest. To teach them, reply to the agent with what was off ("too political", "too small", "more tech fights").

## The rules both scouts follow

These are in each brief too. Change them here and in the briefs together.

**Kalesh = a public, funny, low-stakes fight.** Good examples:
- founder vs founder, VC vs founder, AI bros vs everyone, "70-hour week" takes, layoffs-as-content, Bangalore vs Gurgaon vs Mumbai
- cricket fan wars, Bollywood/OTT fan wars, food wars (biryani, dosa, chai vs coffee), city wars, UPSC/IIT/MBA takes, corporate culture, dating app takes, landlord and rent wars
- a hot take that got ratioed, quote-tweeted into oblivion, or turned into a meme

**Spicy enough** when it is from the last 48 hours and at least one of:
- 500+ likes on the original, or 100+ quote tweets / replies arguing
- two or more known accounts (10k+ followers) going at each other
- it became a meme format the same day

**Never** (skip it, don't even add it as a maybe):
- religion, caste, communal, regional hate, or anything that could start a real fight offline
- party politics, elections, government or military
- deaths, tragedies, accidents, disasters, violence, crime, health, mental health
- accusations: harassment, fraud, abuse, legal cases. Real people can sue, and it isn't funny.
- private people and small accounts (under ~5k followers) being dunked on, and anyone who looks under 18
- sexual content, slurs, doxxing, screenshots that show phone numbers, addresses or DMs

**How to write a row** (append below the last row of the `scout` tab, columns A–G only):

| Column | What to put |
|---|---|
| A links | The tweet URL(s) as `https://x.com/<user>/status/<id>`. The original first, then up to 3 key replies or quote tweets, separated by spaces. |
| B title | Optional. A short Hinglish meme headline, max 120 characters. Leave blank to let the site write one. |
| C side | Leave blank. |
| D tags | 1 to 3 lowercase tags, comma separated, like `startups, bangalore`. |
| E why | One line: who is fighting, about what, and the numbers (likes, quote tweets). |
| F found_by | `instinct` or `muse`. |
| G found_at | Today's date and time, like `2026-11-21 21:30 IST`. |
| H, I, J | Leave empty. Those are for you and the script. |

**Before adding:** read columns A of both the `scout` and `kalesh` tabs and skip any tweet that is already there.
**Per run:** at most 5 rows. Adding nothing is fine when nothing is good.
