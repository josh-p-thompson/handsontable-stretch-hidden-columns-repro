# Repro: `stretchH: 'all'` + `hiddenColumns.indicators` → phantom horizontal scrollbar → frozen rows misalign

Minimal reproduction for a Handsontable bug (reproduces on **18.0.0 and 18.1.0**):

With `stretchH: 'all'` and `hiddenColumns: { indicators: true }`, hiding columns at
runtime via `getPlugin('hiddenColumns').hideColumns()` leaves the master holder's
`scrollWidth` 1px larger than `clientWidth` even though the stretched columns fit the
viewport exactly. A horizontal scrollbar appears with nothing to scroll. With
`fixedColumnsStart` set, the scrollbar consumes ~15px of the master pane's height that
the frozen (inline-start) clone doesn't lose, so rows across the frozen boundary are
misaligned at the bottom of the scroll.

Setting `indicators: false` — or `stretchH: 'none'` — eliminates both symptoms.
`fixedColumnsStart` is not required for the phantom scrollbar itself, only for the
visible row misalignment.

## Run it

Open in StackBlitz (or `npm install && npm run dev` locally), then:

1. Click **"Hide all but 3 columns"** — the phantom horizontal scrollbar appears; the
   status line below the grid shows `scrollWidth = clientWidth + 1`.
2. Click **"Scroll to bottom"** — the frozen columns stop ~15px before the scrollable
   columns; rows are visibly misaligned.

All logic is in `index.html`; Handsontable is loaded from the jsDelivr CDN (pin the
version in the two URLs at the top).
