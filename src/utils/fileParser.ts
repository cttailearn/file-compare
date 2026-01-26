import type { ParsedFile, SupportedFileKind } from '../types/comparison'

const textExtensions = new Set([
  'txt',
  'js',
  'jsx',
  'ts',
  'tsx',
  'vue',
  'css',
  'scss',
  'less',
  'html',
  'htm',
  'svg',
  'py',
  'java',
  'c',
  'cc',
  'cpp',
  'h',
  'hpp',
  'cs',
  'go',
  'rs',
  'ini',
  'conf',
  'properties',
  'log',
  'toml',
  'env',
])

let pdfWorkerSingleton: Worker | null = null

async function ensurePdfWorker(pdfjs: unknown): Promise<void> {
  const globalOptions = (pdfjs as unknown as { GlobalWorkerOptions?: Record<string, unknown> }).GlobalWorkerOptions
  if (!globalOptions) return

  if (!pdfWorkerSingleton) {
    const PdfWorker = (await import('pdfjs-dist/legacy/build/pdf.worker?worker&inline')).default as unknown as new (
      opts?: WorkerOptions,
    ) => Worker
    pdfWorkerSingleton = new PdfWorker({ type: 'module' })
  }

  if ('workerPort' in globalOptions) {
    ;(globalOptions as { workerPort: Worker | null }).workerPort = pdfWorkerSingleton
    return
  }

  const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker?url')).default
  ;(globalOptions as { workerSrc: string }).workerSrc = workerUrl
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot < 0) return ''
  return fileName.slice(lastDot + 1).toLowerCase()
}

export function detectFileKind(file: File): SupportedFileKind {
  const ext = getFileExtension(file.name)
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext === 'json') return 'json'
  if (ext === 'yaml' || ext === 'yml') return 'yaml'
  if (ext === 'xml') return 'xml'
  if (ext === 'xlsx' || ext === 'xls') return 'excel'
  if (ext === 'docx') return 'word'
  if (ext === 'pdf') return 'pdf'
  if (ext === 'pptx') return 'pptx'
  if (textExtensions.has(ext) || !ext) return 'text'
  return 'text'
}

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>()
  const sortObject = (input: unknown): unknown => {
    if (input === null) return null
    if (typeof input !== 'object') return input
    if (input instanceof Date) return input.toISOString()

    if (Array.isArray(input)) return input.map(sortObject)

    const obj = input as Record<string, unknown>
    if (seen.has(obj)) return '[Circular]'
    seen.add(obj)

    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b))
    const out: Record<string, unknown> = {}
    for (const key of keys) out[key] = sortObject(obj[key])
    return out
  }

  return JSON.stringify(sortObject(value), null, 2) + '\n'
}

function stripJsonComments(input: string): string {
  let out = ''
  let i = 0
  let inString = false
  let stringQuote: '"' | "'" | null = null
  let escaped = false

  while (i < input.length) {
    const ch = input[i] ?? ''
    const next = input[i + 1] ?? ''

    if (inString) {
      out += ch
      if (escaped) {
        escaped = false
        i += 1
        continue
      }
      if (ch === '\\') {
        escaped = true
        i += 1
        continue
      }
      if (stringQuote && ch === stringQuote) {
        inString = false
        stringQuote = null
      }
      i += 1
      continue
    }

    if (ch === '"' || ch === "'") {
      inString = true
      stringQuote = ch as '"' | "'"
      out += ch
      i += 1
      continue
    }

    if (ch === '/' && next === '/') {
      i += 2
      while (i < input.length && input[i] !== '\n') i += 1
      continue
    }

    if (ch === '/' && next === '*') {
      i += 2
      while (i < input.length) {
        const a = input[i] ?? ''
        const b = input[i + 1] ?? ''
        if (a === '*' && b === '/') {
          i += 2
          break
        }
        i += 1
      }
      continue
    }

    out += ch
    i += 1
  }

  return out
}

function stripTrailingCommas(input: string): string {
  return input.replace(/,\s*([}\]])/g, '$1')
}

function parseJsonLenient(text: string): unknown {
  const noComments = stripJsonComments(text)
  const noTrailingCommas = stripTrailingCommas(noComments)
  return JSON.parse(noTrailingCommas)
}

async function parseExcelToText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const parts: string[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as unknown[][]
    parts.push(`--- Sheet: ${sheetName} ---`)
    for (const row of rows) {
      const cells = Array.isArray(row) ? row.map((v) => String(v ?? '')) : []
      parts.push(cells.join('\t'))
    }
    parts.push('')
  }

  return parts.join('\n')
}

async function parseWordToText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const mammothModule = await import('mammoth/mammoth.browser')
  const mammoth = (mammothModule as unknown as { extractRawText: (i: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> })
    .extractRawText
  const result = await mammoth({ arrayBuffer })
  const value = result?.value ?? ''
  return value.endsWith('\n') ? value : value + '\n'
}

async function parsePdfToText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf')
  await ensurePdfWorker(pdfjs)

  const loadingTask = (pdfjs as unknown as { getDocument: (src: unknown) => { promise: Promise<any> } }).getDocument({
    data: new Uint8Array(arrayBuffer),
  })
  const pdf = await loadingTask.promise
  const parts: string[] = []

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex)
    const content = await page.getTextContent()
    const items = (content?.items ?? []) as Array<{ str?: string }>
    const text = items.map((x) => x.str ?? '').join(' ').replace(/\s+/g, ' ').trim()
    parts.push(`--- Page: ${pageIndex} ---`)
    parts.push(text)
    parts.push('')
  }

  return parts.join('\n')
}

async function parseYamlToText(raw: string): Promise<string> {
  const yaml = await import('js-yaml')
  const data = (yaml as unknown as { load: (input: string) => unknown }).load(raw)
  return stableStringify(data)
}

async function parseXmlToText(raw: string): Promise<string> {
  const fxp = await import('fast-xml-parser')
  const parser = new (fxp as unknown as { XMLParser: new (opts: unknown) => { parse: (input: string) => unknown } }).XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: false,
  })
  const data = parser.parse(raw)
  return stableStringify(data)
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const kind = detectFileKind(file)
  if (kind === 'unsupported') {
    return { kind, name: file.name, size: file.size, text: '' }
  }

  if (kind === 'pptx') {
    return { kind, name: file.name, size: file.size, text: '' }
  }

  if (kind === 'excel') {
    const text = await parseExcelToText(file)
    return { kind, name: file.name, size: file.size, text }
  }

  if (kind === 'word') {
    const text = await parseWordToText(file)
    return { kind, name: file.name, size: file.size, text }
  }

  if (kind === 'pdf') {
    const text = await parsePdfToText(file)
    return { kind, name: file.name, size: file.size, text }
  }

  const rawText = await file.text()

  if (kind === 'json') {
    try {
      const json = parseJsonLenient(rawText)
      return { kind, name: file.name, size: file.size, text: stableStringify(json) }
    } catch {
      return { kind: 'text', name: file.name, size: file.size, text: rawText }
    }
  }

  if (kind === 'yaml') {
    try {
      const text = await parseYamlToText(rawText)
      return { kind, name: file.name, size: file.size, text }
    } catch {
      return { kind: 'text', name: file.name, size: file.size, text: rawText }
    }
  }

  if (kind === 'xml') {
    try {
      const text = await parseXmlToText(rawText)
      return { kind, name: file.name, size: file.size, text }
    } catch {
      return { kind: 'text', name: file.name, size: file.size, text: rawText }
    }
  }

  return { kind, name: file.name, size: file.size, text: rawText }
}
