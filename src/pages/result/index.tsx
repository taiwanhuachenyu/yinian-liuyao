import { useMemo, useRef, useState } from 'react'
import { Button, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import type { Divination } from '../../types'
import { getHexagramInterpretation } from '../../utils/divination'
import { getActiveResult, loadAiConfig, loadHistory } from '../../state/runtime'
import HexLine from '../../components/HexLine'
import ProductBrand from '../../components/ProductBrand'
import './index.scss'
import './index.polish.scss'
import '../../styles/alignment.scss'

const ai = require('../../utils/ai-mini')
const POSITIONS = ['初', '二', '三', '四', '五', '上']
const METHOD_NAMES = { coins: '铜钱摇卦', manual: '手动选卦', time: '天机起卦' }
const yaoName = (yin: boolean, moving: boolean) => moving ? (yin ? '老阴' : '老阳') : (yin ? '少阴' : '少阳')
const tagClass = (tag: string) => tag === '世' ? 'world' : tag === '应' ? 'response' : tag === '身' ? 'body' : 'plain'

export default function ResultPage() {
  const systemInfo = Taro.getSystemInfoSync()
  const menuButton = typeof Taro.getMenuButtonBoundingClientRect === 'function' ? Taro.getMenuButtonBoundingClientRect() : null
  const safeTopHeight = menuButton?.top || ((systemInfo.statusBarHeight || 24) + 8)
  const [result, setResult] = useState<Divination | null>(null)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chart' | 'reading'>('chart')
  const taskRef = useRef<{ abort?: () => void } | null>(null)

  useDidShow(() => {
    const id = Taro.getCurrentInstance().router?.params?.id
    setResult(getActiveResult() || loadHistory().find(item => item.id === id) || null)
  })

  const changing = useMemo(() => result?.originalYao.map((item, index) => item.changing ? index : -1).filter(index => index >= 0) || [], [result])
  const interpretations = useMemo(() => result ? getHexagramInterpretation(result.original, result.changed, changing) : [], [result, changing])

  const runAi = () => {
    if (!result || aiLoading) return
    const config = loadAiConfig()
    if (!ai.isAiConfigured(config)) {
      Taro.showModal({ title: '暂未配置 AI', content: '请先填写兼容接口、API 密钥与模型名称。', confirmText: '前往设置', success: res => res.confirm && Taro.navigateTo({ url: '/pages/settings/index' }) })
      return
    }
    setAiText(''); setAiLoading(true)
    taskRef.current = ai.aiDivination(result, result.question, config, {
      onToken: (text: string) => setAiText(current => current + text),
      onDone: () => setAiLoading(false),
      onError: (message: string) => { setAiLoading(false); Taro.showModal({ title: '解读中断', content: message, showCancel: false }) },
    })
  }

  const stopAi = () => { taskRef.current?.abort?.(); setAiLoading(false) }

  if (!result) return <View className="page-shell result-empty"><View className="safe-top" style={{ height: `${safeTopHeight}px` }} /><Text className="result-empty__gua">☷</Text><Text>没有找到这次卦象</Text><Button className="ghost-button" onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>重新起卦</Button></View>

  const { original, changed, originalYao, changedYao, najia, changedNajia } = result
  const metaTags = [result.gongName, result.world, result.originalRelation, result.changedRelation, result.chongHe, ...(result.yinTags || []), ...(result.heju || [])].filter(Boolean)

  return <View className="page-shell result-page">
    <View className="grain" /><View className="safe-top" style={{ height: `${safeTopHeight}px` }} />
    <View className="result-hero fade-up">
      <View className="result-blob result-blob--one" />
      <View className="result-blob result-blob--two" />
      <View className="result-nav">
        <View className="result-nav__button" hoverClass="result-nav__button--pressed" onClick={() => Taro.navigateBack({ fail: () => Taro.reLaunch({ url: '/pages/index/index' }) })}><Text className="back-mark">‹</Text><Text>返回</Text></View>
        <View className="result-nav__identity"><ProductBrand compact /></View>
        <View className="result-nav__button result-nav__button--right" hoverClass="result-nav__button--pressed" onClick={() => Taro.navigateTo({ url: '/pages/settings/index' })}><Text>AI 设置</Text></View>
      </View>
      <Text className="result-eyebrow">{METHOD_NAMES[result.method]} · {result.date}</Text>
      <Text className="result-question">{result.question || '未填写占问事项'}</Text>
      <View className="hex-pair">
        <View className="hex-summary">
          <Text className="hex-role">本 卦</Text><Text className="hex-symbol">{original.symbol}</Text><Text className="hex-name">{original.name}</Text><Text className="hex-trigrams">{original.upperTrigram.name}上 · {original.lowerTrigram.name}下</Text>
        </View>
        <View className="change-axis"><View /><Text>{changed ? '之' : '静'}</Text><View /></View>
        <View className={`hex-summary ${changed ? '' : 'hex-summary--quiet'}`}>
          <Text className="hex-role">{changed ? '变 卦' : '静 卦'}</Text><Text className="hex-symbol">{changed?.symbol || '·'}</Text><Text className="hex-name">{changed?.name || '六爻皆静'}</Text><Text className="hex-trigrams">{changed ? `${changed.upperTrigram.name}上 · ${changed.lowerTrigram.name}下` : '以本卦卦辞为主'}</Text>
        </View>
      </View>
      {metaTags.length > 0 && <View className="hero-tags">{metaTags.map((tag, index) => <Text className="hero-tag" key={`${tag}-${index}`}>{tag}</Text>)}</View>}
    </View>

    <View className="result-content">
      <View className="calendar-strip paper-card fade-up">
        <View><Text>太岁</Text><Text>{result.yearGanZhi || '—'}</Text></View><View><Text>月建</Text><Text>{result.monthJian}</Text></View><View><Text>日辰</Text><Text>{result.dayGanZhi}</Text></View><View><Text>旬空</Text><Text>{result.xunKong}</Text></View>
      </View>

      <View className="result-switch">
        <View hoverClass="result-switch__pressed" className={activeTab === 'chart' ? 'active' : ''} onClick={() => setActiveTab('chart')}>六爻排盘</View>
        <View hoverClass="result-switch__pressed" className={activeTab === 'reading' ? 'active' : ''} onClick={() => setActiveTab('reading')}>卦辞与爻辞</View>
      </View>

      {activeTab === 'chart' && <>
        <View className="paper-card chart-card fade-up">
          <View className="chart-heading"><View><Text className="section-kicker">排盘详情</Text><Text className="section-title">六爻纳甲</Text></View><View className="chart-legend"><View><Text className="legend-mark legend-mark--o">O</Text><Text>老阳 · 动</Text></View><View><Text className="legend-mark legend-mark--x">X</Text><Text>老阴 · 动</Text></View><View><View className="legend-dot legend-dot--jade" /><Text>变化后</Text></View></View></View>
          <View className="chart-columns">
            <Text className="chart-columns__spirit">六神</Text>
            <Text className="chart-columns__relation">世应</Text>
            <Text className="chart-columns__original">本卦 · 六亲纳甲</Text>
            <Text className="chart-columns__changed">变卦 · 六亲纳甲</Text>
          </View>
          <View className="yao-table">
            {[5,4,3,2,1,0].map(index => {
              const yao = originalYao[index], info = najia[index], changedInfo = changedNajia?.[index]
              const tags = [...(info.tags || [])]
              if (info.shi) tags.unshift('世'); if (info.ying) tags.unshift('应')
              if (result.guaShen?.positions?.includes(index)) tags.push('身')
              return <View className={`yao-row ${yao.changing ? 'yao-row--moving' : ''}`} key={index}>
                <View className="yao-spirit"><Text>{info.sixShen}</Text><Text>{POSITIONS[index]}爻</Text></View>
                <View className="yao-core">
                  <View className="yao-detail"><Text className="yao-qin">{info.sixQin}</Text><Text className="yao-najia">{info.naJia}</Text><Text className={`yao-power ${info.wangShuai === '旺' || info.wangShuai === '相' ? 'yao-power--good' : ''}`}>{info.wangShuai || '—'}</Text></View>
                  <HexLine yin={yao.yin} changing={yao.changing} compact />
                  <View className="yao-tags">{tags.map(tag => <Text className={`yao-tag yao-tag--${tagClass(tag)}`} key={tag}>{tag}</Text>)}</View>
                </View>
                <View className="yao-changed">
                  {changed && changedYao[index] ? <><HexLine yin={changedYao[index].yin} compact changed /><View className="yao-detail yao-detail--changed"><Text className="yao-qin yao-qin--changed">{changedInfo?.sixQin || '—'}</Text><Text className="yao-najia yao-najia--changed">{changedInfo?.naJia || '—'}</Text><Text className="yao-power yao-power--placeholder">—</Text></View></> : <Text className="yao-quiet">静</Text>}
                </View>
              </View>
            })}
          </View>
          {result.fushen && result.fushen.length > 0 && <View className="fushen-block"><Text className="fushen-title">伏 神</Text><View>{result.fushen.map(item => <Text key={item.position}>{item.sixQin} {item.naJia} · 伏于{POSITIONS[item.position]}爻</Text>)}</View></View>}
        </View>

        <View className="paper-card classic-card fade-up">
          <Text className="section-kicker">易 经</Text><Text className="section-title">卦辞与动爻</Text>
          <View className="judgment"><Text className="judgment-label">本卦</Text><Text>{original.judgment}</Text></View>
          {changed && <View className="judgment judgment--changed"><Text className="judgment-label">变卦</Text><Text>{changed.judgment}</Text></View>}
          <View className="line-readings">{original.lines.map((line, index) => {
            const moving = originalYao[index].changing
            return <View className={`line-reading ${moving ? 'line-reading--moving' : ''}`} key={index}>
              <View className="line-reading__head"><Text>{POSITIONS[index]}爻 · {yaoName(originalYao[index].yin, moving)}</Text>{moving && <Text>动</Text>}</View>
              <Text className="line-reading__text">{line.text}</Text>
              {moving && changed && <Text className="line-reading__change">变 · {changed.lines[index].text}</Text>}
            </View>
          })}</View>
        </View>
      </>}

      {activeTab === 'reading' && <View className="paper-card reading-card fade-up">
        <Text className="section-kicker">断 语</Text><Text className="section-title">卦象解析</Text>
        <View className="reading-lead"><Text>{original.symbol}</Text><Text>观其象，玩其辞；观其变，玩其占。</Text></View>
        {interpretations.map((text, index) => <View className="interpretation" key={index}><Text className="interpretation-index">{String(index + 1).padStart(2, '0')}</Text><Text>{text}</Text></View>)}
        <Text className="reading-disclaimer">卦象提供观察问题的另一种视角，不替代医疗、法律、投资等专业意见。</Text>
      </View>}

      <View className="ai-card fade-up">
        <View className="ai-card__head"><View><Text className="ai-kicker">AI 辅助解读</Text><Text className="ai-title">把复杂卦象整理成清晰线索</Text></View><View className={`ai-orb ${aiLoading ? 'ai-orb--loading' : ''}`}><Text>AI</Text></View></View>
        {!aiText ? <View className="ai-empty"><Text>AI 将结合用神、旺衰、动变与卦辞，整理出便于理解的综合解读。</Text><Button className="ai-button" onClick={runAi}>{aiLoading ? '正在梳理卦象…' : '开始 AI 解读'}</Button></View> : <View className="ai-answer"><ScrollView scrollY className="ai-scroll"><Text userSelect>{aiText}</Text>{aiLoading && <View className="ai-cursor" />}</ScrollView><Button className="ai-stop" onClick={aiLoading ? stopAi : runAi}>{aiLoading ? '停止解读' : '重新解读'}</Button></View>}
      </View>

      <Button className="seal-button new-cast" onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>再起一卦</Button>
    </View><View className="safe-bottom" />
  </View>
}
