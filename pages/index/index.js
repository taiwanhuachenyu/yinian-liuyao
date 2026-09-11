const app = getApp()
const {
  readCoins,
  tossCoins,
  createDivination,
  timeDivination,
} = require('../../logic/divination')

const YAO_LABELS = ['初', '二', '三', '四', '五', '上']
const SHICHEN = [
  { name: '子时', range: '23–01', hour: 0 },
  { name: '丑时', range: '01–03', hour: 2 },
  { name: '寅时', range: '03–05', hour: 4 },
  { name: '卯时', range: '05–07', hour: 6 },
  { name: '辰时', range: '07–09', hour: 8 },
  { name: '巳时', range: '09–11', hour: 10 },
  { name: '午时', range: '11–13', hour: 12 },
  { name: '未时', range: '13–15', hour: 14 },
  { name: '申时', range: '15–17', hour: 16 },
  { name: '酉时', range: '17–19', hour: 18 },
  { name: '戌时', range: '19–21', hour: 20 },
  { name: '亥时', range: '21–23', hour: 22 },
]

const manualOptions = [
  { key: 'yang', text: '少阳 —', yin: false, changing: false },
  { key: 'yin', text: '少阴 - -', yin: true, changing: false },
  { key: 'yangChange', text: '老阳 ○', yin: false, changing: true },
  { key: 'yinChange', text: '老阴 ×', yin: true, changing: true },
]

function todayStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isDateValid(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(`${date}T12:00:00`).getTime())
}

function shichenIndex(hour) {
  return Math.floor(((hour + 1) % 24) / 2)
}

Page({
  data: {
    method: 'coins',
    question: '',
    date: todayStr(),
    hour: new Date().getHours(),
    shichenList: SHICHEN,
    autoTime: true,
    yaos: Array(6).fill(null),
    currentStep: 0,
    isFlipping: false,
    canStart: false,
    coinFaces: [true, false, true],
    coinCaption: '',
    previewLines: [],
    dateValid: true,
    shichenIndex: 0,
    shichenName: '子时',
    shichenRange: '23–01',
    manualOrder: [5, 4, 3, 2, 1, 0],
    manualOptions,
    yaoLabels: YAO_LABELS,
    actionLabel: '抛掷',
  },

  _clockTimer: null,
  _coinTimer: null,

  onLoad() {
    this.syncFromApp()
    this.startClock()
  },

  onShow() {
    this.syncFromApp()
    this.startClock()
  },

  onHide() {
    this.stopClock()
    this.stopCoinTimer()
  },

  onUnload() {
    this.stopClock()
    this.stopCoinTimer()
  },

  startClock() {
    if (this._clockTimer) return
    this._clockTimer = setInterval(() => {
      if (!this.data.autoTime) return
      const appState = app.globalData
      const now = new Date()
      const nextDate = todayStr(now)
      const nextHour = now.getHours()
      if (appState.date !== nextDate || appState.hour !== nextHour) {
        app.setDate(nextDate)
        app.setHour(nextHour)
        this.syncFromApp()
      }
    }, 20000)
  },

  stopClock() {
    if (this._clockTimer) {
      clearInterval(this._clockTimer)
      this._clockTimer = null
    }
  },

  stopCoinTimer() {
    if (this._coinTimer) {
      clearTimeout(this._coinTimer)
      this._coinTimer = null
    }
  },

  syncFromApp() {
    const state = app.globalData
    const yaos = state.yaos || Array(6).fill(null)
    const date = state.date || todayStr()
    const dateValid = isDateValid(date)
    const currentStep = Number.isInteger(state.currentStep) ? state.currentStep : 0

    const shiIndex = shichenIndex(state.hour)
    const shi = SHICHEN[shiIndex]
    const manualCount = yaos.filter(Boolean).length

    this.setData({
      method: state.method,
      question: state.question,
      date,
      hour: state.hour,
      yaos,
      currentStep,
      isFlipping: !!state.isFlipping,
      dateValid,
      shichenIndex: shiIndex,
      shichenName: shi.name,
      shichenRange: shi.range,
      previewLines: yaos.slice().reverse(),
      canStart: this.canStartDivination(state.method, yaos, dateValid),
      actionLabel: state.method === 'coins'
        ? (currentStep >= 6 ? '立即排盘' : '抛掷铜钱')
        : state.method === 'manual'
          ? `手动起卦（已设 ${manualCount}/6）`
          : '立即天机起卦',
    })
  },

  canStartDivination(method, yaos, dateValid) {
    if (!dateValid) return false
    if (method === 'coins') {
      return yaos.filter(Boolean).length === 6
    }
    if (method === 'manual') {
      return yaos.every(Boolean)
    }
    return true
  },

  syncQuestion(value) {
    const next = typeof value === 'string' ? value : ''
    app.setQuestion(next)
    this.syncFromApp()
  },

  syncDate(value) {
    const next = typeof value === 'string' ? value : todayStr()
    this.setData({ autoTime: false })
    app.setDate(next)
    this.syncFromApp()
  },

  syncHour(hour) {
    const h = Number(hour)
    if (!Number.isNaN(h)) {
      this.setData({ autoTime: false })
      app.setHour(h)
      this.syncFromApp()
    }
  },

  getOccasion() {
    if (!this.data.autoTime) return { date: this.data.date, hour: this.data.hour }
    const now = new Date()
    return { date: todayStr(now), hour: now.getHours() }
  },

  onQuestionInput(e) {
    this.syncQuestion(e.detail.value)
  },

  onDateChange(e) {
    this.syncDate(e.detail.value)
  },

  onMethodChange(e) {
    const method = e.currentTarget.dataset.method
    if (!['coins', 'manual', 'time'].includes(method)) return
    app.setMethod(method)
    this.syncFromApp()
  },

  onShichenChange(e) {
    const hour = Number(e.currentTarget.dataset.hour)
    if (Number.isNaN(hour)) return
    this.syncHour(hour)
  },

  onOpenSettings() {
    wx.navigateTo({
      url: '/pages/settings/index',
    })
  },

  onToss() {
    if (this.data.isFlipping || this.data.currentStep >= 6) return

    this.setData({
      isFlipping: true,
      coinCaption: '',
      coinFaces: [true, false, true],
    })
    app.setIsFlipping(true)

    this.stopCoinTimer()
    this._coinTimer = setTimeout(() => {
      const toss = tossCoins()
      app.addYao(toss.yin, toss.changing)
      app.setIsFlipping(false)

      const caption = readCoins(toss.coins).caption
      this.setData({
        isFlipping: false,
        coinFaces: toss.coins,
        coinCaption: caption,
      })
      this.syncFromApp()

      if (this.data.currentStep >= 6) {
        this._coinTimer = setTimeout(() => {
          this.startDivination()
        }, 450)
      }
    }, 650)
  },

  onManualPick(e) {
    const index = Number(e.currentTarget.dataset.index)
    const yin = String(e.currentTarget.dataset.yin) === 'true'
    const changing = String(e.currentTarget.dataset.changing) === 'true'
    app.setYao(index, yin, changing)
    this.syncFromApp()
  },

  onResetYaos() {
    app.resetYaos()
    this.setData({
      coinFaces: [true, false, true],
      coinCaption: '',
    })
    this.syncFromApp()
  },

  onAction() {
    if (!this.data.canStart) {
      if (!this.data.dateValid) {
        wx.showToast({
          title: '请先填写有效日期',
          icon: 'none',
        })
      } else {
        wx.showToast({
          title: this.data.method === 'coins' ? '请先抛满6爻' : '请先补齐6爻',
          icon: 'none',
        })
      }
      return
    }

    if (this.data.method === 'time') {
      this.onTimeDivination()
      return
    }

    this.startDivination()
  },

  onTimeDivination() {
    const { date, hour } = this.getOccasion()
    const yaos = timeDivination(date, hour)
    if (!yaos) {
      wx.showToast({
        title: '日期有误，无法生成梅花起卦',
        icon: 'none',
      })
      return
    }

    const result = createDivination(yaos, this.data.question, date, 'time', hour)
    app.setResult(result)

    wx.navigateTo({
      url: '/pages/result/index',
    })
  },

  startDivination() {
    if (!this.data.dateValid) {
      wx.showToast({
        title: '请选择有效日期',
        icon: 'none',
      })
      return
    }

    const state = app.globalData
    if (state.method === 'coins' && !state.yaos.every(Boolean)) {
      wx.showToast({
        title: '尚未抛满6爻',
        icon: 'none',
      })
      return
    }

    const yaos = state.yaos.filter((item) => item)
    if (state.method === 'manual' && yaos.length !== 6) {
      wx.showToast({
        title: '手动起卦请先选齐6爻',
        icon: 'none',
      })
      return
    }

    const { date, hour } = this.getOccasion()
    const result = createDivination(state.method === 'coins' ? state.yaos : state.yaos, state.question, date, state.method, hour)
    app.setResult(result)

    wx.navigateTo({
      url: '/pages/result/index',
    })
  },
})
