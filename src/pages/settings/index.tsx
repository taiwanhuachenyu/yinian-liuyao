import { useState } from 'react'
import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { AiConfig } from '../../types'
import { loadAiConfig, saveAiConfig } from '../../state/runtime'
import ProductBrand from '../../components/ProductBrand'
import './index.scss'
import './index.polish.scss'
import '../../styles/alignment.scss'

const ai = require('../../utils/ai-mini')

export default function SettingsPage() {
  const systemInfo = Taro.getSystemInfoSync()
  const menuButton = typeof Taro.getMenuButtonBoundingClientRect === 'function' ? Taro.getMenuButtonBoundingClientRect() : null
  const safeTopHeight = menuButton?.top || ((systemInfo.statusBarHeight || 24) + 8)
  const [config, setConfig] = useState<AiConfig>(loadAiConfig())
  const [testing, setTesting] = useState(false)
  const update = (key: keyof AiConfig, value: string) => setConfig(current => ({ ...current, [key]: value }))
  const save = () => { saveAiConfig(config); Taro.showToast({ title: '配置已保存到本机', icon: 'success' }) }
  const test = async () => {
    saveAiConfig(config); setTesting(true)
    const outcome = await ai.testAiConnection(config)
    setTesting(false); Taro.showModal({ title: outcome.ok ? '连接成功' : '连接失败', content: outcome.message, showCancel: false })
  }

  return <View className="page-shell settings-page">
    <View className="grain" /><View className="safe-top" style={{ height: `${safeTopHeight}px` }} />
    <View className="settings-hero fade-up"><View className="settings-nav"><View className="settings-nav__back" onClick={() => Taro.navigateBack()}><Text className="back-mark">‹</Text><Text>返回</Text></View><ProductBrand compact /><View /></View><Text className="settings-kicker">AI 设置</Text><Text className="settings-title">配置解读模型</Text><Text className="settings-copy">按服务商提供的信息完成配置，内容仅保存在当前设备。</Text></View>
    <View className="settings-content">
      <View className="paper-card form-card fade-up">
        <View className="form-head"><Text className="section-kicker">接 入</Text><Text className="section-title">模型配置</Text></View>
        <View className="field"><Text className="field-label">接口地址</Text><Input value={config.baseUrl} placeholder="填写服务商提供的接口地址" placeholderClass="field-placeholder" onInput={e => update('baseUrl', e.detail.value)} /></View>
        <View className="field"><Text className="field-label">API 密钥</Text><Input password value={config.apiKey} placeholder="填写服务商提供的 API 密钥" placeholderClass="field-placeholder" onInput={e => update('apiKey', e.detail.value)} /><Text className="field-help">密钥仅保存在当前设备</Text></View>
        <View className="field"><Text className="field-label">模型名称</Text><Input value={config.model} placeholder="填写服务商提供的模型名称" placeholderClass="field-placeholder" onInput={e => update('model', e.detail.value)} /></View>
        <Button className="seal-button save-button" onClick={save}>保存配置</Button>
        <Button className="test-button" disabled={testing || !ai.isAiConfigured(config)} onClick={test}>{testing ? '正在试问…' : '测试连接'}</Button>
      </View>
    </View><View className="safe-bottom" />
  </View>
}
