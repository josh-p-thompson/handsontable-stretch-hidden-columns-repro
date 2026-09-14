import { HotTable, HotTableRef } from '@handsontable/react-wrapper'
import { registerAllModules } from 'handsontable/registry'
import { RefObject, memo, useCallback, useEffect, useRef, useState } from 'react'
import 'handsontable/styles/handsontable.min.css'
import 'handsontable/styles/ht-theme-main.min.css'
import Handsontable from 'handsontable'

registerAllModules()

const NUM_ROWS = 40
const NUM_SCENARIOS = 20 // columns 2..21; columns 0-1 are frozen
const SCENARIO_COLS = Array.from({ length: NUM_SCENARIOS }, (_, i) => i + 2)

const data = Array.from({ length: NUM_ROWS }, (_, row) =>
  Array.from({ length: 2 + NUM_SCENARIOS }, (_, col) =>
    col === 0 ? `Attribute ${row}` : col === 1 ? `G${row % 5}` : row * 100 + col,
  ),
)

/**
 * The grid is memoized (and receives only the stable ref) so that state updates in
 * the parent never re-render <HotTable>. The react-wrapper forwards its props to
 * updateSettings() on every render, and the presence of the `hiddenColumns` key
 * makes Handsontable cycle the plugin and drop the hidden-columns state — a
 * separate wrapper gotcha we keep out of this repro.
 */
const Grid = memo(({ hotRef }: { hotRef: RefObject<HotTableRef> }) => (
  <HotTable
    ref={hotRef}
    data={data}
    colHeaders={true}
    width={900}
    height={400}
    fixedColumnsStart={2}
    stretchH="all"
    hiddenColumns={{ indicators: true }} // indicators: true is required to reproduce
    themeName="ht-theme-main"
    licenseKey="non-commercial-and-evaluation"
  />
))

interface Diagnostics {
  version: string
  scrollWidth: number
  clientWidth: number
  phantomScrollbar: boolean
  frozenCloneHeight: number
  masterUsableHeight: number
}

export function App() {
  const hotRef = useRef<HotTableRef>(null)
  const [diag, setDiag] = useState<Diagnostics | null>(null)

  const report = useCallback(() => {
    const hot = hotRef.current?.hotInstance
    if (!hot) return
    const master = hot.rootElement.querySelector<HTMLElement>('.ht_master .wtHolder')!
    const frozenClone = hot.rootElement.querySelector<HTMLElement>(
      '.ht_clone_inline_start .wtHolder',
    )!
    setDiag({
      version: Handsontable.version ?? 'unknown',
      scrollWidth: master.scrollWidth,
      clientWidth: master.clientWidth,
      phantomScrollbar: master.scrollWidth > master.clientWidth,
      frozenCloneHeight: frozenClone.offsetHeight,
      masterUsableHeight: master.clientHeight,
    })
  }, [])

  useEffect(() => {
    // let the initial render settle before the first measurement
    const timer = setTimeout(report, 100)
    return () => clearTimeout(timer)
  }, [report])

  const runAndReport = (action: (hot: Handsontable) => void) => {
    const hot = hotRef.current?.hotInstance
    if (!hot) return
    action(hot)
    setTimeout(report, 100)
  }

  const hideAllButThree = () =>
    runAndReport(hot => {
      hot.getPlugin('hiddenColumns').hideColumns(SCENARIO_COLS.slice(3))
      hot.render()
    })

  const showAll = () =>
    runAndReport(hot => {
      hot.getPlugin('hiddenColumns').showColumns(SCENARIO_COLS)
      hot.render()
    })

  const scrollToBottom = () =>
    runAndReport(hot => {
      const master = hot.rootElement.querySelector<HTMLElement>('.ht_master .wtHolder')!
      master.scrollTop = master.scrollHeight
    })

  const heightMismatch = diag ? diag.frozenCloneHeight - diag.masterUsableHeight : 0

  return (
    <div style={{ fontFamily: 'sans-serif', margin: 16 }}>
      <h3>
        Repro: stretchH:'all' + hiddenColumns.indicators → phantom horizontal scrollbar → frozen
        rows misalign
      </h3>
      <ol>
        <li>
          Click <b>"Hide all but 3 columns"</b>. The 3 remaining columns stretch to fill the width
          exactly — yet a horizontal scrollbar appears (scrollWidth is 1px larger than clientWidth).
          Clicking it just flashes.
        </li>
        <li>
          Scroll to the bottom. The frozen columns (left pane) stop ~15px before the scrollable
          columns do, so rows across the frozen boundary are misaligned at the bottom.
        </li>
        <li>
          Set <code>hiddenColumns: {'{ indicators: false }'}</code> (or{' '}
          <code>stretchH: 'none'</code>) and the problem disappears.
        </li>
      </ol>
      <p>
        <button onClick={hideAllButThree}>Hide all but 3 columns</button>{' '}
        <button onClick={showAll}>Show all</button>{' '}
        <button onClick={scrollToBottom}>Scroll to bottom</button>
      </p>
      <Grid hotRef={hotRef} />
      {diag && (
        <pre style={{ fontFamily: 'monospace', fontSize: 13, marginTop: 12 }}>
          Handsontable {diag.version}
          {'\n'}
          master scrollWidth: {diag.scrollWidth} clientWidth: {diag.clientWidth}
          {diag.phantomScrollbar && (
            <strong style={{ color: '#c00' }}>
              {' '}
              ← PHANTOM HORIZONTAL SCROLLBAR (content fits exactly)
            </strong>
          )}
          {'\n'}
          frozen-clone holder height: {diag.frozenCloneHeight} master usable height:{' '}
          {diag.masterUsableHeight}
          {heightMismatch > 0 && (
            <strong style={{ color: '#c00' }}>
              {' '}
              ← frozen pane is {heightMismatch}px taller → rows misalign at the bottom
            </strong>
          )}
        </pre>
      )}
    </div>
  )
}
