import { reactive } from 'vue'
import type { ComparisonConfig, ComparisonResult, ComparisonStatus } from '../types/comparison'

export interface ComparisonState {
  status: ComparisonStatus
  error: string | null
  config: ComparisonConfig
  result: ComparisonResult | null
}

export const comparisonState = reactive<ComparisonState>({
  status: 'idle',
  error: null,
  config: {
    ignoreWhitespace: true,
    ignoreEmptyLines: false,
    caseSensitive: true,
    granularity: 'line',
  },
  result: null,
})

