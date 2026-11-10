import { useEffect, useState } from 'react'

export type Lang = 'fr' | 'en'
const KEY = 'yoon.lang'

function initial(): Lang {
  try { const v = localStorage.getItem(KEY); if (v === 'fr' || v === 'en') return v } catch { /* stockage indisponible */ }
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'fr'
}

const listeners = new Set<(l: Lang) => void>()
let current: Lang = initial()

export function setLang(l: Lang) {
  current = l
  try { localStorage.setItem(KEY, l) } catch { /* ignore */ }
  document.documentElement.lang = l
  listeners.forEach((f) => f(l))
}

/** Langue courante de l'interface, FR par défaut, mémorisée par navigateur. */
export function useLang(): [Lang, (l: Lang) => void] {
  const [l, setL] = useState<Lang>(current)
  useEffect(() => { listeners.add(setL); return () => { listeners.delete(setL) } }, [])
  return [l, setLang]
}

export const t = (l: Lang, fr: string, en: string) => (l === 'fr' ? fr : en)
