import Taro from '@tarojs/taro'
import type { Divination } from '../types'

const HISTORY_KEY = 'liuyao-history-v3'
let activeResult: Divination | null = null

const validResult = (item: unknown): item is Divination => {
  const value = item as Divination
  return !!value && typeof value.id === 'string' && value.originalYao?.length === 6 && value.najia?.length === 6
}

export const setActiveResult = (result: Divination) => { activeResult = result }
export const getActiveResult = () => activeResult

export const loadHistory = (): Divination[] => {
  try {
    const stored = Taro.getStorageSync(HISTORY_KEY)
    return Array.isArray(stored) ? stored.filter(validResult) : []
  } catch { return [] }
}

export const saveResult = (result: Divination) => {
  activeResult = result
  const history = [result, ...loadHistory().filter(item => item.id !== result.id)].slice(0, 20)
  Taro.setStorageSync(HISTORY_KEY, history)
}

export const removeHistory = (id: string) => {
  Taro.setStorageSync(HISTORY_KEY, loadHistory().filter(item => item.id !== id))
}
