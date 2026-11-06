export type Health = { status: string; app: string; version: string; environment: string }
export type ModuleInfo = { key: string; name: string; sprint: number; status: 'planifié' | 'en cours' | 'livré' }

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...init })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return r.json() as Promise<T>
}

/** Formate un montant en unités mineures (entier) selon la devise. Jamais de flottant côté serveur. */
const MINOR: Record<string, number> = { XOF: 0, XAF: 0, EUR: 2, USD: 2, GBP: 2, MAD: 2 }
export function money(minor: number, currency = 'XOF'): string {
  const d = MINOR[currency] ?? 2
  const v = minor / 10 ** d
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })} ${currency}`
}
