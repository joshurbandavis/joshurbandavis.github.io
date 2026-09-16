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
  formId: '1FAIpQLScsixPIGetgVFzxZoRqOx-WNuKvzt0kDN9MbTjvqWuKKTHd0g',

  // The entry.NNNNNNNNN field name Google assigned each question, confirmed
  // from a real formResponse payload.
  entries: {
    adjective1: 'entry.1606799391', // Q1 — how did you feel during the pandemic
    noun1: 'entry.430402113',       // Q2 — what mattered before that no longer feels essential
    verb: 'entry.419737142',        // Q3 — what ritual/behavior did you carry forward
    adjective2: 'entry.271601746',  // Q4 — describe your experience of isolation
    noun2: 'entry.77067357',        // Q5 — the most important thing in your life now
  },

  // The "publish to web" CSV link for the response Sheet:
  //   File > Share > Publish to web > (sheet) > Comma-separated values (.csv)
  sheetCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vShyxrOvUMmGrKTT005to-3BKw1kUctkULKkimcfP7GBcR5AEiCmR61kU-YtzTfa8Dz2fd29HTbTVVA/pub?gid=191794618&single=true&output=csv',
};
