# wiring up the night air

The page is fully built and runs in "demo mode" out of the box (sample poem
lines, a warning on the create form). To make it live and collecting real
answers, you need a Google Form + its linked Sheet, then four values pasted
into `config.js`. Takes about 10 minutes, no code.

## 1. Create the form

1. Go to [forms.google.com](https://forms.google.com) → blank form.
2. Title it **the night air** (description optional).
3. Add five questions, **in this exact order**, each set to **Short answer**
   and toggled **Required**:
   1. How were you feeling during the pandemic?
   2. What was important to you before that no longer feels essential?
   3. What ritual or behavior from that time have you carried forward?
   4. Describe your experience of isolation.
   5. What's the most important thing in your life now?
4. Click the gear icon (**Settings**) →
   - **Responses**: turn **off** "Collect email addresses" and **off** "Limit
     to 1 response" (so the same visitor can add more than one line over
     time, same as the original).
   - If you're on a Google Workspace account, also check there's no
     "Restrict to users in \[org\]" toggle left on — it needs to accept
     answers from anyone, signed in or not.

## 2. Link a response Sheet

In the form editor, go to the **Responses** tab → click the green Sheets
icon → **Create a new spreadsheet** → Create. Leave that sheet's tab as
**Form Responses 1** and don't reorder its columns later — `read.html`
reads them by position (Timestamp, then the five answers in the order
above).

## 3. Get the form ID

Click **Send** (top right) → the link icon → copy the link. It looks like:

```
https://docs.google.com/forms/d/e/1FAIpQLSc......................./viewform
```

The long string between `/d/e/` and `/viewform` is your **form ID** — paste
it into `config.js` as `formId`.

## 4. Get the five entry IDs

Google names each field `entry.<some number>` internally, and the numbers
are different for every form, so you have to read them off yours:

1. Open the live form link from step 3 in a normal browser tab.
2. Open DevTools (`Cmd+Option+I`) → **Network** tab → check "Preserve log".
3. Fill in all five answers with anything (e.g. "test") and click **Submit**.
4. In the Network tab, find the request named `formResponse`, click it, and
   look at its **Payload** / **Form Data**. You'll see five lines like:
   ```
   entry.1234567890: test
   entry.2345678901: test
   ...
   ```
5. Because you typed a different-ish value isn't necessary — instead, redo
   this once per field if you want certainty: fill in *only* Q1 with a
   distinctive value ("ZZZQ1ZZZ") and leave the others blank, submit, and
   read off which `entry.NNNN` carried "ZZZQ1ZZZ" in the payload. Repeat for
   Q2–Q5. (You can delete the five test rows from the response Sheet
   afterward.)
6. Paste each `entry.NNNN` number into the matching field in `config.js`'s
   `entries` object — `adjective1` gets Q1's entry id, `noun1` gets Q2's,
   and so on down the list in `SETUP.md` step 1's order.

## 5. Publish the Sheet as CSV

Open the linked response Sheet → **File → Share → Publish to web** →
under "Link", choose the **Form Responses 1** sheet (not "Entire document")
and format **Comma-separated values (.csv)** → **Publish**. Copy the URL it
gives you (ends in `/pub?output=csv`) into `config.js` as `sheetCsvUrl`.

## 6. Fill in config.js and test

Edit `night-air/config.js` with the four values from steps 3–5, save, and
reload `index.html` — the demo warning should disappear. Submit a real test
line, wait a minute or two for the Sheet to catch up, then check
`read.html` for it.

That's it — no server, no database, no build step. Everything else
(the pages, the styling, the random-article poem assembly) is already done.
