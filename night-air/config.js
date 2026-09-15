/* the night air — backend wiring
 *
 * This project has no server. Submissions go straight into a Google Form
 * (free, public, no login required to answer) and the READ page pulls the
 * form's linked Google Sheet back out as CSV to re-assemble the poem.
 *
 * Fill in the four values below once the form + sheet exist. Until then
 * the site runs in "demo" mode: the create form shows a warning instead of
 * submitting, and the read page shows a handful of sample lines instead of
 * real ones, so you can see the whole thing working end to end before you
 * wire it up for real.
 *
 * See night-air/SETUP.md for exactly how to get these four values.
 */
window.NIGHT_AIR_CONFIG = {
  // The numeric/alphanumeric form id from the form's edit or view URL:
  //   https://docs.google.com/forms/d/e/FORM_ID_GOES_HERE/viewform
  formId: '',

  // The entry.NNNNNNNNN field name Google assigned each question, in the
  // SAME ORDER the questions were added to the form. Get these from the
  // page source of the live viewform (see SETUP.md step 4).
  entries: {
    adjective1: '', // Q1 — how did you feel during the pandemic
    noun1: '',      // Q2 — what mattered before that no longer feels essential
    verb: '',       // Q3 — what ritual/behavior did you carry forward
    adjective2: '', // Q4 — describe your experience of isolation
    noun2: '',      // Q5 — the most important thing in your life now
  },

  // The "publish to web" CSV link for the response Sheet:
  //   File > Share > Publish to web > (sheet) > Comma-separated values (.csv)
  // Looks like: https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv
  sheetCsvUrl: '',
};
