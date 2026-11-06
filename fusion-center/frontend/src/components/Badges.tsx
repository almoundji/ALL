import { CLASS, CLASS_COLOR, CLASS_LABEL, TYPE_COLOR, TYPE_ICON, TYPE_LABEL } from '../lib/api'

export const ClassBadge = ({ level, compartment }: { level: number; compartment?: string | null }) => (
  <span className="badge" style={{ background: CLASS_COLOR[level] }} title={CLASS_LABEL[level]}>
    {CLASS[level]}{compartment ? ` / ${compartment}` : ''}
  </span>
)

export const TypeChip = ({ type }: { type: string }) => (
  <span className="chip"><span className="dot" style={{ background: TYPE_COLOR[type] || '#999' }} />{TYPE_ICON[type]} {TYPE_LABEL[type] || type}</span>
)

export const Confidence = ({ value }: { value: number }) => {
  const pct = Math.round(value * 100)
  return <span className="mono" title="Confiance agrégée (nombre et fiabilité des sources)">{pct}%</span>
}
