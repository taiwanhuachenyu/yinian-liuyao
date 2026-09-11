const app = getApp()
const { resolveEndpoint, isAiConfigured } = require('../../logic/ai-mini')
const { testAiConnection } = require('../../logic/ai-mini')

const EMPTY = { baseUrl: '', apiKey: '', model: '' }

Page({
  data: {
    draft: { ...EMPTY },
    endpointText: '',
    showKey: false,
    testMessage: '',
    testing: false,
  },

  onShow() {
    const saved = app.globalData.aiConfig || EMPTY
    this.setData({
      draft: { ...saved },
      showKey: false,
      testMessage: '',
      testing: false,
      endpointText: resolveEndpoint(saved.baseUrl) || '配置中',
    })
  },

  updateBaseUrl(e) {
    const draft = { ...this.data.draft, baseUrl: e.detail.value }
    this.setData({
      draft,
      endpointText: resolveEndpoint(draft.baseUrl) || '配置中',
    })
  },

  updateApiKey(e) {
    const draft = { ...this.data.draft, apiKey: e.detail.value }
    this.setData({ draft })
  },

  updateModel(e) {
    const draft = { ...this.data.draft, model: e.detail.value }
    this.setData({ draft })
  },

  toggleKey() {
    this.setData({ showKey: !this.data.showKey })
  },

  onSave() {
    const draft = this.data.draft
    if (!isAiConfigured(draft)) {
      wx.showToast({ title: '请填写完整配置', icon: 'none' })
      return
    }
    app.setAiConfig(draft)
    wx.showToast({ title: '配置已保存', icon: 'success' })
  },

  onClear() {
    app.clearAiConfig()
    this.setData({
      draft: { ...EMPTY },
      endpointText: '',
      testMessage: '',
      testing: false,
    })
    wx.showToast({ title: '已清除配置', icon: 'success' })
  },

  async onTest() {
    if (!isAiConfigured(this.data.draft)) {
      this.setData({ testMessage: '请先补齐接口地址、密钥和模型名。' })
      return
    }

    this.setData({ testing: true, testMessage: '测试中…' })

    const result = await testAiConnection(this.data.draft)
    this.setData({
      testing: false,
      testMessage: result.ok
        ? `通过：${result.message}`
        : `失败：${result.message}`,
    })
  },

  onBack() {
    wx.navigateBack()
  },
})
