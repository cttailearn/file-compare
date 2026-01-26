export type SupportedFileKind =
  | 'text'
  | 'markdown'
  | 'json'
  | 'yaml'
  | 'xml'
  | 'excel'
  | 'word'
  | 'pdf'
  | 'pptx'
  | 'unsupported'

export type ComparisonStatus = 'idle' | 'reading' | 'parsing' | 'comparing' | 'done' | 'error'

export type DiffLineType = 'added' | 'deleted' | 'unchanged'

export type DiffGranularity = 'line'

export interface ComparisonConfig {
  ignoreWhitespace: boolean
  ignoreEmptyLines: boolean
  caseSensitive: boolean
  granularity: DiffGranularity
}

export interface FileSelection {
  id: string
  file: File | null
}

export interface ParsedFile {
  kind: SupportedFileKind
  name: string
  size: number
  text: string
}

export interface DiffLine {
  index: number
  left: string | null
  right: string | null
  type: DiffLineType
}

export interface ComparisonStats {
  added: number
  deleted: number
  unchanged: number
  totalA: number
  totalB: number
  similarity: number
}

export interface ComparisonResult {
  id: string
  createdAt: number
  fileA: { name: string; size: number }
  fileB: { name: string; size: number }
  config: ComparisonConfig
  lines: DiffLine[]
  stats: ComparisonStats
}
