import { useEffect, useState } from 'react'
import MapView from '../components/MapView'
import { get, TYPE_LABEL } from '../lib/api'
import type { Entity } from '../lib/types'

export default function MapPage() {
  const [items, setItems] = useState<Entity[]>([])
  const [type, setType] = useState('')
  useEffect(() => { get<{ items: Entity[] }>('/api/entities?has_geo=true&limit=500').then((r) => setItems(r.items)) }, [])
  const shown = type ? items.filter((e) => e.type === type) : items
  const types = [...new Set(items.map((e) => e.type))]
  return (
    <div className="col" style={{ minHeight: 640 }}>
      <div className="row"><div className="grow"><h1>Carte opérationnelle</h1><div className="muted small">{shown.length} entité(s) géolocalisée(s) dans votre périmètre.</div></div>
        <select style={{ width: 200 }} value={type} onChange={(e) => setType(e.target.value)}><option value="">Tous les types</option>{types.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select></div>
      <div style={{ flex: 1, minHeight: 560 }}><MapView entities={shown} /></div>
    </div>
  )
}
