import { Link } from 'react-router-dom'

export type TileProps = { to: string; title: string; sub: string; icon: string; value?: string | number; caption?: string; tone?: 'ok' | 'warn' | 'neg'; off?: boolean }

/** Tuile de lanceur Fiori : titre, sous-titre, indicateur vivant, légende. */
export default function Tile({ to, title, sub, icon, value, caption, tone, off }: TileProps) {
  return (
    <Link to={to} className={`tile${off ? ' off' : ''}`}>
      <div className="ico">{icon}</div>
      <div className="tt">{title}</div>
      <div className="ts">{sub}</div>
      <div className="tb"><div><div className={`tv ${tone ?? ''}`}>{value ?? '—'}</div>{caption && <div className="tc">{caption}</div>}</div></div>
    </Link>
  )
}
