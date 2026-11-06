import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { TYPE_COLOR, TYPE_LABEL } from '../lib/api'
import type { Entity } from '../lib/types'
import { ClassBadge } from './Badges'

// Fond de carte : surcharger VITE_TILE_URL par un serveur de tuiles interne en production isolée (voir docs/ARCHITECTURE.md).
const TILES = (import.meta.env.VITE_TILE_URL as string | undefined) || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export default function MapView({ entities, center = [14.6, -16.5], zoom = 7 }: { entities: Entity[]; center?: [number, number]; zoom?: number }) {
  const geo = entities.filter((e) => e.lat != null && e.lon != null)
  return (
    <div className="map">
      <MapContainer center={L.latLng(center[0], center[1])} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer url={TILES} attribution="&copy; OpenStreetMap" />
        {geo.map((e) => (
          <CircleMarker key={e.id} center={[e.lat!, e.lon!]} radius={8} pathOptions={{ color: TYPE_COLOR[e.type], fillColor: TYPE_COLOR[e.type], fillOpacity: 0.75, weight: 2 }}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <b>{e.label}</b><br />
                <span>{TYPE_LABEL[e.type]}</span> · <ClassBadge level={e.classification} compartment={e.compartment} /><br />
                <Link to={`/entities/${e.id}`}>Ouvrir la fiche</Link> · <Link to={`/graph?ids=${e.id}`}>Graphe</Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
