import type { ComparisonConfig, ComparisonStats, DiffLine } from '../types/comparison'
import CompareWorker from '../workers/compare.worker?worker'
import { computeDiffLines } from './diffEngine'

type CompareWorkerRequest = {
  id: string
  type: 'compare'
  payload: { textA: string; textB: string; config: ComparisonConfig }
}

type CompareWorkerResponse =
  | {
      id: string
      ok: true
      payload: {
        lines: DiffLine[]
        stats: ComparisonStats
      }
    }
  | { id: string; ok: false; error: string }

let workerSingleton: Worker | null = null
let workerUnsupported = false
let nextId = 1
const pending = new Map<string, { resolve: (v: CompareWorkerResponse) => void; reject: (e: unknown) => void }>()

function getWorker(): Worker | null {
  if (workerUnsupported) return null
  if (workerSingleton) return workerSingleton

  let worker: Worker
  try {
    worker = new CompareWorker()
  } catch {
    workerUnsupported = true
    return null
  }

  worker.onmessage = (event: MessageEvent<CompareWorkerResponse>) => {
    const msg = event.data
    const entry = pending.get(msg.id)
    if (!entry) return
    pending.delete(msg.id)
    entry.resolve(msg)
  }

  worker.onerror = (e) => {
    for (const [, entry] of pending) entry.reject(e)
    pending.clear()
    workerUnsupported = true
    workerSingleton = null
  }

  workerSingleton = worker
  return worker
}

function makeId(): string {
  const id = nextId
  nextId += 1
  return `${Date.now()}-${id}`
}

export async function compareFilesInWorker(input: {
  textA: string
  textB: string
  config: ComparisonConfig
}): Promise<Extract<CompareWorkerResponse, { ok: true }>['payload']> {
  const worker = getWorker()
  if (!worker) {
    const { lines, stats } = computeDiffLines(input.textA, input.textB, input.config)
    return { lines, stats }
  }
  const id = makeId()

  const response = await new Promise<CompareWorkerResponse>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const request: CompareWorkerRequest = {
      id,
      type: 'compare',
      payload: {
        textA: input.textA,
        textB: input.textB,
        config: {
          ignoreWhitespace: input.config.ignoreWhitespace,
          ignoreEmptyLines: input.config.ignoreEmptyLines,
          caseSensitive: input.config.caseSensitive,
          granularity: input.config.granularity,
        },
      },
    }
    worker.postMessage(request)
  })

  if (!response.ok) {
    throw new Error(response.error)
  }

  return response.payload
}
