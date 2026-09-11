const app = getApp()
const { getHexagramInterpretation, shichenName } = require('../../logic/divination')
const {
  aiDivination,
  isAiConfigured,
  testAiConnection,
} = require('../../logic/ai-mini')

const YAO_LABELS = ['初', '二', '三', '四', '五', '上']

Page({
  data: {
    result: null,
    rows: [],
    interpretations: [],
    changingCount: 0,
    history: [],
    fushenText: '',
    relationTags: [],
    changingTags: '',
    aiText: '',
    aiLoading: false,
    aiReady: false,
    isConfigured: false,
    aiTask: null,
    historyCount: 0,
  },

  onShow() {
    this.refreshFromApp()
  },

  onHide() {
    this.stopAiTask()
  },

  refreshFromApp() {
    const state = app.globalData
    const result = state.result
    const history = state.history || []

    if (!result) {
      this.setData({
        result: null,
        rows: [],
        interpretations: [],
        history,
        relationTags: [],
        aiReady: isAiConfigured(state.aiConfig),
      })
      return
    }

    const changingYaos = result.originalYao
      .map((y, i) => (y.changing ? i : -1))
      .filter((i) => i >= 0)

    const rows = []
    for (let i = 5; i >= 0; i--) {
      const oYao = result.originalYao[i]
      const line = result.original.lines[i] || { text: '' }
      const n = result.najia[i]
      const ch = result.changedYao ? result.changedYao[i] : null
      const cn = result.changedNajia ? result.changedNajia[i] : null
      rows.push({
        label: YAO_LABELS[i],
        yaoText: oYao.yin ? '少阴' : '少阳',
        fullYao: oYao.changing
          ? `${oYao.yin ? '老阴' : '老阳'}${oYao.yin ? ' ×' : ' ○'}`
          : oYao.yin ? '少阴' : '少阳',
        isYin: oYao.yin,
        isChanging: oYao.changing,
        changed: oYao.changing ? (ch ? (ch.yin ? '少阴' : '少阳') : '—') : '',
        changedTag: cn ? `${cn.sixQin} ${cn.naJia}` : '',
        changedLineText: ch ? (result.changed.lines[i].text || '') : '',
        sixQin: n?.sixQin || '',
        naJia: n?.naJia || '',
        sixShen: n?.sixShen || '',
        shi: !!n?.shi,
        ying: !!n?.ying,
        tags: (n?.tags || []).join(' '),
        ws: n?.wangShuai || '',
        originalLineText: line.text || '',
      })
    }

    const changedText =
      changingYaos.length === 0
        ? '六爻安静'
        : `${changingYaos.length} 爻发动`

    const rel = []
    if (result.originalRelation) rel.push(`本卦${result.originalRelation}`)
    if (result.changedRelation) rel.push(`变卦${result.changedRelation}`)
    if (result.chongHe) rel.push(result.chongHe)
    if (result.heju && result.heju.length > 0) rel.push(...result.heju)

    const fushenText =
      result.fushen && result.fushen.length > 0
        ? result.fushen
            .map((f) => `${YAO_LABELS[f.position]}爻：${f.sixQin}${f.naJia}（伏于 ${f.feiNajia} 之下）`)
            .join('；')
        : ''

    const interpretations = getHexagramInterpretation(result.original, result.changed, changingYaos)

    this.setData({
      result,
      rows,
      changingCount: changingYaos.length,
      changedText,
      history,
      historyCount: history.length,
      relationTags: rel,
      fushenText,
      aiText: '',
      interpretations,
      isConfigured: isAiConfigured(state.aiConfig),
      aiReady: isAiConfigured(state.aiConfig),
    })
  },

  methodName(method) {
    return method === 'coins' ? '铜钱摇卦' : method === 'manual' ? '手动起卦' : '天机起卦'
  },

  formatHour(hour) {
    if (typeof hour !== 'number') return ''
    return shichenName(hour)
  },

  onNewDivination() {
    app.resetDraft()
    wx.redirectTo({
      url: '/pages/index/index',
    })
  },

  onCopySummary() {
    if (!this.data.result) return

    const r = this.data.result
    const changed = r.changed ? `之${r.changed.name}` : '（六爻安静）'
    const text = [
      `占问：${r.question || '（未填写）'}`,
      `得卦：${r.original.name}${changed}`,
      `本卦辞：${r.original.judgment}`,
      `变卦辞：${r.changed ? r.changed.judgment : '—'}`,
      `起卦时：${r.date}`,
      `方法：${this.methodName(r.method)}`,
    ].join('\n')

    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success',
        })
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none',
        })
      },
    })
  },

  onAskAi() {
    if (!this.data.result) return
    if (!this.data.isConfigured) {
      wx.navigateTo({
        url: '/pages/settings/index',
      })
      return
    }

    const config = app.globalData.aiConfig
    this.setData({
      aiLoading: true,
      aiText: '',
    })

    const task = aiDivination(
      this.data.result,
      this.data.result.question,
      config,
      {
        onToken: (piece) => {
          this.setData({ aiText: (this.data.aiText || '') + piece })
        },
        onDone: () => {
          this.setData({ aiLoading: false })
        },
        onError: (message) => {
          this.setData({
            aiLoading: false,
            aiText: `解读失败：${message}`,
          })
        },
      },
    )

    if (task) {
      this.setData({ aiTask: task })
    } else {
      this.setData({ aiLoading: false })
    }
  },

  onTestAi() {
    const cfg = app.globalData.aiConfig
    this.setData({ aiText: '测试连通性中…' })
    testAiConnection(cfg)
      .then((result) => {
        this.setData({ aiText: result.ok ? `测试通过：${result.message}` : `测试失败：${result.message}` })
      })
      .catch(() => {
        this.setData({ aiText: '测试失败：网络异常' })
      })
  },

  stopAiTask() {
    if (this.data.aiTask && this.data.aiTask.abort) {
      this.data.aiTask.abort()
    }
    this.setData({ aiTask: null })
    this.setData({ aiLoading: false })
  },

  onStopAi() {
    this.stopAiTask()
  },

  openSettings() {
    wx.navigateTo({
      url: '/pages/settings/index',
    })
  },

  onLoadHistory(e) {
    const id = e.currentTarget.dataset.id
    const item = app.globalData.history.find((d) => d.id === id)
    if (!item) return
    app.globalData.result = item
    this.refreshFromApp()
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 0,
    })
  },

  onDeleteHistory(e) {
    const id = e.currentTarget.dataset.id
    app.deleteHistoryById(id)
    this.refreshFromApp()
  },
})
