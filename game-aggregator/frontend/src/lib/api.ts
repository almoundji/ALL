export type Health = { status: string; app: string; version: string; environment: string }
export type ModuleInfo = { key: string; name: string; name_en: string; sprint: number; status: 'planifié' | 'en cours' | 'livré' }
export type Operator = { id: number; name: string; slug: string; currency: string; status: string; api_key_prefix: string }
export type Stats = { games_active: number; players: number; sessions_open: number; rounds_today: number; ggr_today_minor: number; stake_today_minor: number; win_today_minor: number; currency: string }
export type Game = { id: number; key: string; name: string; category: string; rtp_percent: number; volatility: string; currency: string; min_stake_minor: number; max_stake_minor: number; status: string; active?: boolean; provider?: { id: number; key: string; name: string } }
export type Player = { id: number; external_id: string; display_name: string; birth_date: string; currency: string; status: string; balance_minor: number; created_at: string }
export type Ledger = { id: number; kind: string; amount_minor: number; currency: string; balance_after_minor: number; reference: string; idempotency_key: string; created_at: string }
export type GameSession = { id: number; token: string; player_id: number; game_id: number; mode: 'demo' | 'real'; status: string; launch_url: string; expires_at: string; game?: Game }
export type Round = { id: number; status: string; stake_minor: number; win_minor: number; currency: string; server_seed: string | null; server_seed_hash: string; client_seed: string; nonce: number; result: { roll: number; range: number; win_below: number; payout_bp: number; won: boolean }; balance_minor: number | null }

const KEY = 'yoon.apiKey'
export function getApiKey(): string | null { try { return localStorage.getItem(KEY) } catch { return null } }
export function setApiKey(k: string | null) { try { k ? localStorage.setItem(KEY, k) : localStorage.removeItem(KEY) } catch { /* ignore */ } }

export class ApiError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status } }

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) }
  const k = getApiKey(); if (k) headers['X-Api-Key'] = k
  const r = await fetch(path, { ...init, headers })
  if (!r.ok) {
    let detail = r.statusText
    try { const j = await r.json(); detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail ?? j) } catch { /* corps vide */ }
    throw new ApiError(r.status, detail)
  }
  return r.json() as Promise<T>
}
export const post = <T,>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) })

/** Formate un montant en unités mineures (entier) selon la devise. Jamais de flottant côté serveur. */
const MINOR: Record<string, number> = { XOF: 0, XAF: 0, EUR: 2, USD: 2, GBP: 2, MAD: 2 }
export function money(minor: number, currency = 'XOF'): string {
  const d = MINOR[currency] ?? 2
  const v = minor / 10 ** d
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })} ${currency}`
}
export const idem = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
