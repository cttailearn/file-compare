import type { ComparisonResult } from '../types/comparison'

const storageKey = 'file-compare:history:v1'

export function loadHistory(): ComparisonResult[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ComparisonResult[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x) => typeof x?.id === 'string' && typeof x?.createdAt === 'number')
  } catch {
    return []
  }
}

export function saveToHistory(result: ComparisonResult): void {
  const history = loadHistory()
  const next = [result, ...history.filter((h) => h.id !== result.id)].slice(0, 50)
  localStorage.setItem(storageKey, JSON.stringify(next))
}

export function clearHistory(): void {
  localStorage.removeItem(storageKey)
}

