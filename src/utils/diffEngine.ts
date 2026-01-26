import { diffLines } from 'diff'
import type { ComparisonConfig, ComparisonStats, DiffLine } from '../types/comparison'

function normalizeText(input: string, config: ComparisonConfig): string {
  let text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (config.ignoreEmptyLines) {
    text = text
      .split('\n')
      .filter((line: string) => line.trim().length > 0)
      .join('\n')
  }
  if (!text.endsWith('\n')) text += '\n'
  if (!config.caseSensitive) text = text.toLowerCase()
  return text
}

function splitLines(value: string): string[] {
  const lines = value.split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

export function computeDiffLines(
  aTextRaw: string,
  bTextRaw: string,
  config: ComparisonConfig,
): { lines: DiffLine[]; stats: ComparisonStats } {
  const aText = normalizeText(aTextRaw, config)
  const bText = normalizeText(bTextRaw, config)

  const aLineCount = splitLines(aText).length
  const bLineCount = splitLines(bText).length

  const parts = diffLines(aText, bText, { ignoreWhitespace: config.ignoreWhitespace })
  const lines: DiffLine[] = []

  let added = 0
  let deleted = 0
  let unchanged = 0
  let index = 0

  for (const part of parts) {
    const partLines = splitLines(part.value)
    if (part.added) {
      for (const line of partLines) {
        lines.push({ index, left: null, right: line, type: 'added' })
        added += 1
        index += 1
      }
      continue
    }

    if (part.removed) {
      for (const line of partLines) {
        lines.push({ index, left: line, right: null, type: 'deleted' })
        deleted += 1
        index += 1
      }
      continue
    }

    for (const line of partLines) {
      lines.push({ index, left: line, right: line, type: 'unchanged' })
      unchanged += 1
      index += 1
    }
  }

  const denom = Math.max(1, Math.max(aLineCount, bLineCount))
  const similarity = Math.max(0, Math.min(1, unchanged / denom))

  return {
    lines,
    stats: {
      added,
      deleted,
      unchanged,
      totalA: aLineCount,
      totalB: bLineCount,
      similarity,
    },
  }
}

export function getChangedLineIndices(lines: DiffLine[]): number[] {
  const indices: number[] = []
  for (const line of lines) {
    if (line.type !== 'unchanged') indices.push(line.index)
  }
  return indices
}
