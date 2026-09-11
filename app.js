const HISTORY_STORAGE_KEY = 'liuyao-mini-history-v1'
const AI_CONFIG_STORAGE_KEY = 'liuyao-mini-ai-config-v1'
const MAX_HISTORY = 20

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function emptyYaos() {
  return Array(6).fill(null)
}

function asHexagram(obj) {
  return !!obj
    && typeof obj === 'object'
    && typeof obj.name === 'string'
    && typeof obj.judgment === 'string'
    && !!obj.upperTrigram
    && !!obj.lowerTrigram
    && Array.isArray(obj.lines)
    && obj.lines.length === 6
}

function isRenderableDivination(item) {
  return !!item
    && typeof item === 'object'
    && typeof item.id === 'string'
    && typeof item.dayGanZhi === 'string'
    && typeof item.monthJian === 'string'
    && typeof item.date === 'string'
    && ['coins', 'manual', 'time'].includes(item.method)
    && Array.isArray(item.originalYao)
    && item.originalYao.length === 6
    && Array.isArray(item.changedYao)
    && item.changedYao.length === 6
    && Array.isArray(item.najia)
    && item.najia.length === 6
    && asHexagram(item.original)
    && (item.changed == null || asHexagram(item.changed))
}

function dedupeById(list, item) {
  if (!item?.id) return list
  return [item, ...list.filter((i) => i.id !== item.id)].slice(0, MAX_HISTORY)
}

App({
  globalData: {
    appVersion: '1.0.0',
    question: '',
    date: todayStr(),
    hour: new Date().getHours(),
    method: 'coins',
    yaos: emptyYaos(),
    currentStep: 0,
    isFlipping: false,
    result: null,
    history: [],
    aiConfig: {
      baseUrl: '',
      apiKey: '',
      model: '',
    },
  },

  onLaunch() {
    this._restoreHistory()
    this._restoreAiConfig()
    if (typeof __wxConfig !== 'undefined' && __wxConfig.mpVersion) {
      this.globalData.appVersion = __wxConfig.mpVersion
    }
    this.resetDraft()
  },

  _restoreHistory() {
    try {
      const raw = wx.getStorageSync(HISTORY_STORAGE_KEY)
      if (!Array.isArray(raw)) {
        this.globalData.history = []
        return
      }
      this.globalData.history = raw.filter(isRenderableDivination)
    } catch (err) {
      this.globalData.history = []
    }
  },

  _persistHistory() {
    try {
      wx.setStorageSync(HISTORY_STORAGE_KEY, this.globalData.history)
    } catch (err) {
      // ignore
    }
  },

  _restoreAiConfig() {
    try {
      const raw = wx.getStorageSync(AI_CONFIG_STORAGE_KEY)
      if (raw && typeof raw === 'object' && typeof raw.baseUrl === 'string' && typeof raw.apiKey === 'string' && typeof raw.model === 'string') {
        this.globalData.aiConfig = {
          baseUrl: raw.baseUrl.trim(),
          apiKey: raw.apiKey.trim(),
          model: raw.model.trim(),
        }
      }
    } catch (err) {
      // ignore
    }
  },

  _persistAiConfig() {
    try {
      wx.setStorageSync(AI_CONFIG_STORAGE_KEY, this.globalData.aiConfig)
    } catch (err) {
      // ignore
    }
  },

  resetDraft() {
    const now = new Date()
    this.globalData.question = ''
    this.globalData.date = todayStr(now)
    this.globalData.hour = now.getHours()
    this.globalData.method = 'coins'
    this.globalData.yaos = emptyYaos()
    this.globalData.currentStep = 0
    this.globalData.isFlipping = false
    this.globalData.result = null
  },

  resetYaos() {
    this.globalData.yaos = emptyYaos()
    this.globalData.currentStep = 0
    this.globalData.isFlipping = false
    this.globalData.result = null
  },

  setQuestion(question) {
    this.globalData.question = typeof question === 'string' ? question : ''
  },

  setDate(date) {
    this.globalData.date = typeof date === 'string' ? date : todayStr()
  },

  setHour(hour) {
    const h = Number(hour)
    if (Number.isNaN(h) || h < 0 || h > 23) {
      return
    }
    this.globalData.hour = h
  },

  setMethod(method) {
    if (!['coins', 'manual', 'time'].includes(method)) {
      return
    }
    this.globalData.method = method
    this.globalData.yaos = emptyYaos()
    this.globalData.currentStep = 0
    this.globalData.isFlipping = false
    this.globalData.result = null
  },

  setIsFlipping(flipping) {
    this.globalData.isFlipping = !!flipping
  },

  setYao(index, yin, changing) {
    const idx = Number(index)
    if (Number.isNaN(idx) || idx < 0 || idx > 5) return
    const next = [...this.globalData.yaos]
    next[idx] = {
      index: idx,
      yin: !!yin,
      changing: !!changing,
    }
    this.globalData.yaos = next
  },

  addYao(yin, changing) {
    const idx = this.globalData.currentStep
    if (!Number.isInteger(idx) || idx < 0 || idx >= 6) return
    this.setYao(idx, yin, changing)
    this.globalData.currentStep = idx + 1
  },

  setAiConfig(config) {
    if (!config || typeof config !== 'object') {
      return
    }
    this.globalData.aiConfig = {
      baseUrl: String(config.baseUrl || '').trim(),
      apiKey: String(config.apiKey || '').trim(),
      model: String(config.model || '').trim(),
    }
    this._persistAiConfig()
  },

  clearAiConfig() {
    this.globalData.aiConfig = { baseUrl: '', apiKey: '', model: '' }
    try {
      wx.removeStorageSync(AI_CONFIG_STORAGE_KEY)
    } catch (err) {
      // ignore
    }
  },

  setResult(result) {
    this.globalData.result = result
    if (!result) {
      return
    }
    if (!isRenderableDivination(result)) {
      return
    }
    this.globalData.history = dedupeById(this.globalData.history, result)
    this._persistHistory()
  },

  loadHistoryById(id) {
    const target = this.globalData.history.find((item) => item.id === id)
    this.globalData.result = target || null
    return target || null
  },

  deleteHistoryById(id) {
    this.globalData.history = this.globalData.history.filter((item) => item.id !== id)
    this._persistHistory()
  },

  clearHistory() {
    this.globalData.history = []
    this._persistHistory()
  },
})
