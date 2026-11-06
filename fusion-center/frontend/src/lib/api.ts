const TOKEN_KEY = 'fc_token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY))

export class ApiError extends Error { constructor(public status: number, message: string) { super(message) } }

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json'
  const res = await fetch(path, { ...init, headers })
  if (res.status === 401) { setToken(null); if (!location.pathname.startsWith('/login')) location.href = '/login' }
  if (!res.ok) {
    let msg = res.statusText
    try { const j = await res.json(); msg = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail) } catch { /* ignore */ }
    throw new ApiError(res.status, msg)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const get = <T,>(path: string) => api<T>(path)
export const post = <T,>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) })
export const patch = <T,>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
export const del = (path: string) => api<void>(path, { method: 'DELETE' })

export async function login(username: string, password: string) {
  const body = new URLSearchParams({ username, password })
  const res = await fetch('/api/auth/login', { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  if (!res.ok) throw new ApiError(res.status, 'Identifiants incorrects')
  const j = await res.json(); setToken(j.access_token)
}

export const CLASS = ['NP', 'DR', 'CD', 'SD']
export const CLASS_LABEL = ['Non protégé', 'Diffusion restreinte', 'Confidentiel Défense', 'Secret Défense']
export const CLASS_COLOR = ['#3d8f5f', '#2f7bbf', '#c88a1a', '#c0392b']
export const TYPE_COLOR: Record<string, string> = {
  PERSON: '#5aa9ff', ORGANIZATION: '#b084ff', VEHICLE: '#ffb454', PHONE: '#3fd0a4', LOCATION: '#ff6b81', EVENT: '#ffd166',
  ACCOUNT: '#2ec4b6', DEVICE: '#8ecae6', DOCUMENT: '#cbd5e1', VESSEL: '#06b6d4',
}
export const TYPE_LABEL: Record<string, string> = {
  PERSON: 'Personne', ORGANIZATION: 'Organisation', VEHICLE: 'Véhicule', PHONE: 'Téléphone', LOCATION: 'Lieu', EVENT: 'Événement',
  ACCOUNT: 'Compte', DEVICE: 'Appareil', DOCUMENT: 'Document', VESSEL: 'Navire',
}
export const TYPE_ICON: Record<string, string> = {
  PERSON: '👤', ORGANIZATION: '🏢', VEHICLE: '🚗', PHONE: '📱', LOCATION: '📍', EVENT: '⚡', ACCOUNT: '🏦', DEVICE: '💻', DOCUMENT: '📄', VESSEL: '🚢',
}
export const REL_LABEL: Record<string, string> = {
  KNOWS: 'connaît', MEMBER_OF: 'membre de', OWNS: 'possède', USES: 'utilise', CALLED: 'a appelé', LOCATED_AT: 'localisé à',
  PARTICIPATED_IN: 'a participé à', TRANSFERRED_TO: 'a viré vers', TRAVELLED_TO: 'a voyagé vers', MENTIONS: 'mentionne',
  RELATED_TO: 'lié à', FAMILY_OF: 'famille de', EMPLOYED_BY: 'employé par',
}
export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—')
