import cytoscape, { Core, ElementDefinition } from 'cytoscape'
import coseBilkent from 'cytoscape-cose-bilkent'
import { useEffect, useRef } from 'react'
import { CLASS, REL_LABEL, TYPE_COLOR, TYPE_LABEL } from '../lib/api'
import type { Graph } from '../lib/types'

cytoscape.use(coseBilkent)

interface Props {
  graph: Graph
  highlight?: number[]
  selected?: number | null
  onSelect?: (id: number | null) => void
  onExpand?: (id: number) => void
}

export default function GraphView({ graph, highlight = [], selected, onSelect, onExpand }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const cy = useRef<Core | null>(null)

  useEffect(() => {
    if (!ref.current) return
    cy.current = cytoscape({
      container: ref.current,
      wheelSensitivity: 0.25,
      style: [
        { selector: 'node', style: {
          'background-color': 'data(color)', label: 'data(label)', color: '#e6ebf5', 'font-size': 10, 'text-valign': 'bottom', 'text-margin-y': 5,
          'text-outline-color': '#0b1020', 'text-outline-width': 2, width: 'data(size)', height: 'data(size)', 'border-width': 2, 'border-color': 'data(border)',
        } },
        { selector: 'node.hl', style: { 'border-color': '#ffd166', 'border-width': 4 } },
        { selector: 'node:selected', style: { 'border-color': '#fff', 'border-width': 4 } },
        { selector: 'edge', style: {
          width: 'data(width)', 'line-color': '#3a4668', 'target-arrow-color': '#3a4668', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier',
          label: 'data(label)', 'font-size': 8, color: '#8b95b3', 'text-rotation': 'autorotate', 'text-outline-color': '#0b1020', 'text-outline-width': 2,
        } },
        { selector: 'edge.hl', style: { 'line-color': '#ffd166', 'target-arrow-color': '#ffd166', width: 4 } },
      ],
    })
    cy.current.on('tap', 'node', (e) => onSelect?.(Number(e.target.id())))
    cy.current.on('tap', (e) => { if (e.target === cy.current) onSelect?.(null) })
    cy.current.on('dbltap', 'node', (e) => onExpand?.(Number(e.target.id())))
    return () => { cy.current?.destroy(); cy.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const c = cy.current
    if (!c) return
    const degree: Record<number, number> = {}
    graph.edges.forEach((e) => { degree[e.source_id] = (degree[e.source_id] || 0) + 1; degree[e.target_id] = (degree[e.target_id] || 0) + 1 })
    const ids = new Set(graph.nodes.map((n) => n.id))
    const els: ElementDefinition[] = [
      ...graph.nodes.map((n) => ({ data: {
        id: String(n.id), label: n.label.length > 28 ? n.label.slice(0, 26) + '…' : n.label, color: TYPE_COLOR[n.type] || '#999',
        size: 18 + Math.min(30, (degree[n.id] || 0) * 4), border: ['#3d8f5f', '#2f7bbf', '#c88a1a', '#c0392b'][n.classification],
        type: TYPE_LABEL[n.type], cls: CLASS[n.classification],
      } })),
      ...graph.edges.filter((e) => ids.has(e.source_id) && ids.has(e.target_id)).map((e) => ({ data: {
        id: 'e' + e.id, source: String(e.source_id), target: String(e.target_id), label: REL_LABEL[e.type] || e.type, width: 1 + Math.min(5, Math.log2(e.weight + 1)),
      } })),
    ]
    // Conserve la position des nœuds déjà affichés ; place les nouveaux près d'un voisin connu (stabilité visuelle).
    const prev: Record<string, { x: number; y: number }> = {}
    c.nodes().forEach((n) => { prev[n.id()] = { ...n.position() } })
    c.elements().remove()
    c.add(els)
    const hadPrev = Object.keys(prev).length > 0
    if (hadPrev) {
      const ext = c.extent(); const cx = (ext.x1 + ext.x2) / 2; const cy0 = (ext.y1 + ext.y2) / 2
      c.nodes().forEach((n) => {
        if (prev[n.id()]) { n.position(prev[n.id()]); return }
        const anchor = n.neighborhood('node').filter((m) => !!prev[m.id()]).first()
        const base = anchor.nonempty() ? prev[anchor.id()] : { x: cx, y: cy0 }
        const a = Math.random() * Math.PI * 2; const r = 80 + Math.random() * 80
        n.position({ x: base.x + Math.cos(a) * r, y: base.y + Math.sin(a) * r })
      })
    }
    const layout = c.layout({ name: 'cose-bilkent', animate: hadPrev ? 'end' : false, randomize: !hadPrev, nodeRepulsion: 6000, idealEdgeLength: 110, fit: true, padding: 30, numIter: 2500 } as any)
    layout.run()
  }, [graph])

  useEffect(() => {
    const c = cy.current
    if (!c) return
    c.elements().removeClass('hl')
    highlight.forEach((id, i) => {
      c.getElementById(String(id)).addClass('hl')
      if (i > 0) c.edges().filter((e) => (e.source().id() === String(highlight[i - 1]) && e.target().id() === String(id)) || (e.target().id() === String(highlight[i - 1]) && e.source().id() === String(id))).addClass('hl')
    })
    c.nodes().unselect()
    if (selected) c.getElementById(String(selected)).select()
  }, [highlight, selected, graph])

  return (
    <div className="graph">
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      <div className="graph-tools">
        <button className="small" onClick={() => cy.current?.fit(undefined, 30)}>Ajuster</button>
        <button className="small" onClick={() => cy.current?.layout({ name: 'cose-bilkent', animate: true, randomize: true } as any).run()}>Réorganiser</button>
        <button className="small" onClick={() => cy.current?.layout({ name: 'concentric', animate: true, concentric: (n: any) => n.degree(), levelWidth: () => 2 } as any).run()}>Concentrique</button>
        <button className="small" onClick={() => cy.current?.layout({ name: 'breadthfirst', animate: true, directed: false } as any).run()}>Hiérarchique</button>
      </div>
      <div className="legend">
        {Object.entries(TYPE_COLOR).map(([t, c]) => <span key={t} className="chip"><span className="dot" style={{ background: c }} />{TYPE_LABEL[t]}</span>)}
      </div>
    </div>
  )
}
