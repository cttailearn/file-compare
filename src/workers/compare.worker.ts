import type { ComparisonConfig } from '../types/comparison'
import { computeDiffLines } from '../utils/diffEngine'

type CompareRequest = {
  id: string
  type: 'compare'
  payload: {
    textA: string
    textB: string
    config: ComparisonConfig
  }
}

type CompareResponse =
  | {
      id: string
      ok: true
      payload: {
        lines: ReturnType<typeof computeDiffLines>['lines']
        stats: ReturnType<typeof computeDiffLines>['stats']
      }
    }
  | { id: string; ok: false; error: string }

const ctx = self as unknown as {
  postMessage: (message: CompareResponse) => void
  onmessage: ((event: MessageEvent<CompareRequest>) => void) | null
}

ctx.onmessage = async (event: MessageEvent<CompareRequest>) => {
  const msg = event.data
  if (!msg || msg.type !== 'compare') return

  try {
    const { textA, textB, config } = msg.payload
    const { lines, stats } = computeDiffLines(textA, textB, config)
    const res: CompareResponse = {
      id: msg.id,
      ok: true,
      payload: {
        lines,
        stats,
      },
    }
    ctx.postMessage(res)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'worker_error'
    const res: CompareResponse = { id: msg.id, ok: false, error: message }
    ctx.postMessage(res)
  }
}

