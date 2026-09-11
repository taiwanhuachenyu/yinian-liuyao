import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Image, Input, Picker, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { Divination, Yao } from '../../types'
import { createDivination, readCoins, timeDivination, tossCoins } from '../../utils/divination'
import { loadHistory, removeHistory, saveResult, setActiveResult } from '../../state/runtime'
import HexLine from '../../components/HexLine'
import ProductBrand from '../../components/ProductBrand'
import './index.scss'
import './index.polish.scss'
import './motion.scss'
import '../../styles/alignment.scss'

type Method = 'coins' | 'manual' | 'time'
const METHODS: { key: Method; glyph: string; title: string; note: string }[] = [
  { key: 'coins', glyph: '钱', title: '铜钱摇卦', note: '依次六掷' },
  { key: 'manual', glyph: '爻', title: '手动选卦', note: '逐爻选定' },
  { key: 'time', glyph: '时', title: '天机起卦', note: '年月日时' },
]
const SHICHEN = [
  ['子时', '23–01', 0], ['丑时', '01–03', 2], ['寅时', '03–05', 4], ['卯时', '05–07', 6],
  ['辰时', '07–09', 8], ['巳时', '09–11', 10], ['午时', '11–13', 12], ['未时', '13–15', 14],
  ['申时', '15–17', 16], ['酉时', '17–19', 18], ['戌时', '19–21', 20], ['亥时', '21–23', 22],
] as const
const CN = ['零', '一', '二', '三', '四', '五', '六']
const POSITIONS = ['初', '二', '三', '四', '五', '上']
const QUICK_QUESTIONS = ['事业选择', '关系发展', '近期决策', '当下重点']
const MANUAL = [
  { name: '少阳', hint: '静', mark: '—', yin: false, changing: false },
  { name: '少阴', hint: '静', mark: '--', yin: true, changing: false },
  { name: '老阳', hint: '动', mark: 'O', yin: false, changing: true },
  { name: '老阴', hint: '动', mark: 'X', yin: true, changing: true },
]
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const hourIndex = (hour: number) => Math.floor(((hour + 1) % 24) / 2)

export default function Home() {
  const now = new Date()
  const systemInfo = Taro.getSystemInfoSync()
  const menuButton = typeof Taro.getMenuButtonBoundingClientRect === 'function' ? Taro.getMenuButtonBoundingClientRect() : null
  const safeTopHeight = menuButton?.top || ((systemInfo.statusBarHeight || 24) + 8)
  const [method, setMethod] = useState<Method>('coins')
  const [question, setQuestion] = useState('')
  const [date, setDate] = useState(ymd(now))
  const [hour, setHour] = useState(now.getHours())
  const [yaos, setYaos] = useState<(Yao | null)[]>(Array(6).fill(null))
  const [coins, setCoins] = useState<boolean[]>([true, false, true])
  const [flipping, setFlipping] = useState(false)
  const [settling, setSettling] = useState(false)
  const [tossVariant, setTossVariant] = useState(0)
  const [lastCaption, setLastCaption] = useState('字面记二，背面记三')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<Divination[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const count = yaos.filter(Boolean).length
  const complete = count === 6
  const progressTitle = method === 'time'
    ? '时间信息已确认'
    : complete
      ? '六爻已定'
      : count === 0
        ? '准备起卦'
        : `已起${CN[count]}爻，还需${CN[6 - count]}爻`
  const progressBadge = method === 'time'
    ? '时间已确认'
    : complete
      ? '已完成'
      : count === 0
        ? '未开始'
        : `${CN[count]} / 六`
  const resultButtonText = method === 'time'
    ? '天机起卦'
    : complete
      ? '查看卦象'
      : count === 0
        ? '请先完成六次起卦'
        : `还需完成${CN[6 - count]}爻`

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => clearTimers, [])
  const preview = useMemo(() => yaos.slice().reverse(), [yaos])
  const selectedHourIndex = hourIndex(hour)
  const feedback = () => { try { Taro.vibrateShort({ type: 'light' }) } catch (_) {} }

  const resetLines = () => {
    clearTimers()
    setYaos(Array(6).fill(null)); setFlipping(false); setSettling(false); setLastCaption('字面记二，背面记三')
  }

  const switchMethod = (next: Method) => { feedback(); setMethod(next); resetLines() }

  const cast = () => {
    if (flipping || settling || complete) return
    setTossVariant((Date.now() + count * 17) % 4)
    setFlipping(true); setSettling(false); setLastCaption('铜钱旋起，等待落定')
    const casted = tossCoins()
    timers.current = [
      setTimeout(() => setCoins(casted.coins), 760),
      setTimeout(() => {
      setCoins(casted.coins)
      setLastCaption(readCoins(casted.coins).caption)
      setYaos(current => {
        const next = [...current]
        const index = next.filter(Boolean).length
        next[index] = { index, yin: casted.yin, changing: casted.changing }
        return next
      })
      setFlipping(false)
      setSettling(true)
      feedback()
      }, 1780),
      setTimeout(() => setSettling(false), 2240),
    ]
  }

  const chooseYao = (index: number, yin: boolean, changing: boolean) => {
    feedback()
    setYaos(current => { const next = [...current]; next[index] = { index, yin, changing }; return next })
  }

  const enterResult = (result: Divination) => {
    saveResult(result)
    Taro.navigateTo({ url: `/pages/result/index?id=${encodeURIComponent(result.id)}` })
  }

  const generate = () => {
    if (method === 'time') {
      const lines = timeDivination(date, hour)
      if (lines) enterResult(createDivination(lines, question.trim(), date, method, hour))
      return
    }
    const lines = yaos.filter((item): item is Yao => !!item)
    if (lines.length !== 6) return
    enterResult(createDivination(lines, question.trim(), date, method, hour))
  }

  const openHistory = () => { setHistory(loadHistory()); setHistoryOpen(true) }
  const loadRecord = (item: Divination) => {
    setActiveResult(item); setHistoryOpen(false)
    Taro.navigateTo({ url: `/pages/result/index?id=${encodeURIComponent(item.id)}` })
  }
  const deleteRecord = (id: string) => { removeHistory(id); setHistory(items => items.filter(item => item.id !== id)) }

  return (
    <View className="page-shell home-page">
      <View className="grain" />
      <View className="home-orbit home-orbit--one" />
      <View className="home-orbit home-orbit--two" />
      <View className="home-orbit home-orbit--three" />
      <View className="safe-top" style={{ height: `${safeTopHeight}px` }} />

      <View className="nav">
        <ProductBrand />
      </View>

      <View className="hero fade-up">
        <View className="hero-spark hero-spark--one" />
        <View className="hero-spark hero-spark--two" />
        <View className="spirit-aura" />
        <Image className="hero-spirit" src={require('../../assets/gua-spirit.png')} mode="aspectFit" />
        <Text className="hero-title">你想问什么？</Text>
        <Text className="hero-copy">输入要占问的问题，也可以直接开始起卦。卦象结果将作为分析和决策的参考。</Text>
        <View className="hero-symbol"><Text>☰</Text><View className="hero-symbol__dot" /><Text>☷</Text></View>
      </View>

      <View className="home-shortcuts fade-up">
        <View className="home-shortcut" hoverClass="home-shortcut--pressed" onClick={openHistory}><Text className="home-shortcut__icon">册</Text><View><Text>卦象记录</Text><Text>回看每一次问卦</Text></View><Text className="home-shortcut__arrow">›</Text></View>
        <View className="home-shortcut" hoverClass="home-shortcut--pressed" onClick={() => Taro.navigateTo({ url: '/pages/settings/index' })}><Text className="home-shortcut__icon home-shortcut__icon--ai">AI</Text><View><Text>AI 解读</Text><Text>接入你的模型</Text></View><Text className="home-shortcut__arrow">›</Text></View>
      </View>

      <View className="paper-card inquiry-card fade-up">
        <View className="card-index">壹</View>
          <Text className="section-kicker">占问事项</Text>
          <Text className="section-title">写下你的问题</Text>
        <View className="question-field">
          <Input className="question-input" maxlength={300} value={question} placeholder="可不填写，直接开始起卦" placeholderClass="question-placeholder" onInput={event => setQuestion(event.detail.value)} />
          <Text className="question-count">{question.length}/300</Text>
        </View>
        <View className="quick-area">
          <Text className="quick-label">常见问题</Text>
          <ScrollView scrollX className="quick-scroll" enhanced showScrollbar={false}>
            <View className="quick-list">
              {QUICK_QUESTIONS.map((item, index) => <View className={`quick-chip quick-chip--${index}`} hoverClass="quick-chip--pressed" key={item} onClick={() => { feedback(); setQuestion(item) }}><Text>{item}</Text></View>)}
            </View>
          </ScrollView>
        </View>
        <View className="occasion-row">
          <Picker mode="date" value={date} onChange={event => setDate(String(event.detail.value))}>
            <View className="occasion-item"><Text className="occasion-label">选择日期</Text><Text className="occasion-value">{date.replace(/-/g, '.')}</Text></View>
          </Picker>
          <View className="occasion-line" />
          <Picker range={SHICHEN.map(item => `${item[0]}  ${item[1]}`)} value={selectedHourIndex} onChange={event => setHour(SHICHEN[Number(event.detail.value)][2])}>
            <View className="occasion-item"><Text className="occasion-label">选择时辰</Text><Text className="occasion-value">{SHICHEN[selectedHourIndex][0]} · {SHICHEN[selectedHourIndex][1]}</Text></View>
          </Picker>
        </View>
      </View>

      <View className="paper-card method-card fade-up">
        <View className="card-index">贰</View>
        <Text className="section-kicker">起卦方式</Text>
        <Text className="section-title">选择起卦方式</Text>
        <View className="method-tabs">
          {METHODS.map(item => <View key={item.key} hoverClass="method-tab--pressed" className={`method-tab method-tab--${item.key} ${method === item.key ? 'method-tab--active' : ''}`} onClick={() => switchMethod(item.key)}>
            <Text className="method-glyph">{item.glyph}</Text><Text className="method-name">{item.title}</Text><Text className="method-note">{item.note}</Text>
          </View>)}
        </View>

        {method === 'coins' && <View className="coins-panel">
          <View className={`coin-stage coin-stage--${tossVariant} ${flipping ? 'coin-stage--tossing' : ''} ${settling ? 'coin-stage--settling' : ''}`}>
            <View className="coin-halo" />
            {coins.map((head, index) => {
              const showFront = count === 0 ? index !== 1 : head
              return <View key={index} className={`coin cash-coin coin--${index} ${showFront ? 'coin--front' : 'coin--back'} ${flipping ? 'coin--flipping' : ''} ${settling ? 'coin--settling' : ''}`} style={{ animationDelay: `${index * 70}ms` }}>
                <View className="cash-coin-image" />
              </View>
            })}
          </View>
          <Text className="cast-caption">{lastCaption}</Text>
          {complete
            ? <View className="cast-complete"><Text>六次投掷已完成</Text><Text>可以在下方查看卦象结果</Text></View>
            : <Button className="cast-button" disabled={flipping || settling} onClick={cast}>{flipping ? '铜钱旋起' : settling ? '正在落定' : `起${POSITIONS[count]}爻`}</Button>}
        </View>}

        {method === 'manual' && <View className="manual-panel">
          <Text className="panel-note">按上爻到初爻的顺序显示，请逐项选择爻象</Text>
          {[5,4,3,2,1,0].map(index => <View className="manual-row" key={index}>
            <View className="manual-position"><Text>{POSITIONS[index]}</Text><Text>爻</Text></View>
            <View className="manual-options">{MANUAL.map((item, optionIndex) => {
              const selected = yaos[index]?.yin === item.yin && yaos[index]?.changing === item.changing
              return <View key={item.name} hoverClass="manual-option--pressed" className={`manual-option manual-option--${index}-${optionIndex} ${selected ? 'manual-option--active' : ''}`} onClick={() => chooseYao(index, item.yin, item.changing)}>
                <Text className="manual-option__mark">{item.mark}</Text><Text className="manual-option__name">{item.name}</Text><Text className="manual-option__hint">{item.hint}</Text>
              </View>
            })}</View>
          </View>)}
        </View>}

        {method === 'time' && <View className="time-panel">
          <View className="time-emblem"><Text className="time-emblem__outer">天</Text><Text className="time-emblem__inner">機</Text></View>
          <Text className="time-title">梅花易数 · 天机起卦</Text>
          <Text className="time-copy">系统根据所选日期和时辰计算上卦、下卦与动爻。确认信息后即可起卦。</Text>
          <View className="time-stamp"><Text>{date}</Text><Text>{SHICHEN[selectedHourIndex][0]}</Text></View>
        </View>}
      </View>

      <View className="paper-card preview-card fade-up">
        <View className="card-index">叁</View>
        <View className="preview-head"><View><Text className="section-kicker">起卦进度</Text><Text className="section-title">{progressTitle}</Text></View><Text className="preview-count">{progressBadge}</Text></View>
        <View className="progress-track"><View className="progress-value" style={{ width: `${method === 'time' ? 100 : Math.round(count / 6 * 100)}%` }} /></View>
        <View className="yao-preview">
          {preview.map((yao, reverseIndex) => <View className={`preview-line ${yao ? 'preview-line--ready' : ''}`} key={reverseIndex} style={{ animationDelay: `${reverseIndex * 60}ms` }}>
            <Text className="preview-pos">{POSITIONS[5 - reverseIndex]}</Text>
            {yao ? <HexLine yin={yao.yin} changing={yao.changing} /> : <View className="empty-line"><View /><View /></View>}
            <Text className={`preview-state ${yao?.changing ? 'preview-state--moving' : ''}`}>{yao ? `${yao.changing ? (yao.yin ? 'X · 老阴动' : 'O · 老阳动') : (yao.yin ? '少阴 · 静' : '少阳 · 静')}` : '待起'}</Text>
          </View>)}
        </View>
        <Button className="seal-button result-btn" disabled={method !== 'time' && !complete} onClick={generate}>{resultButtonText}</Button>
        {(method !== 'time' && count > 0) && <Button className="reset-link" onClick={resetLines}>重新起卦</Button>}
      </View>

      <View className="safe-bottom" />

      {historyOpen && <View className="drawer-layer">
        <View className="drawer-mask" onClick={() => setHistoryOpen(false)} />
        <View className="history-drawer">
          <View className="drawer-handle" />
          <View className="drawer-title"><View><Text className="section-kicker">历史记录</Text><Text className="section-title">起卦记录</Text></View><Text className="drawer-close" onClick={() => setHistoryOpen(false)}>收起</Text></View>
          <ScrollView scrollY className="history-list">
            {history.length === 0 ? <View className="history-empty"><Text className="history-empty__symbol">☷</Text><Text>还没有卦象记录</Text><Text>完成起卦后，记录会自动保存在这里</Text></View> : history.map(item => <View className="history-item" key={item.id}>
              <View className="history-main" onClick={() => loadRecord(item)}><Text className="history-symbol">{item.original.symbol}</Text><View><Text className="history-name">{item.original.name}{item.changed ? ` 之 ${item.changed.name}` : ''}</Text><Text className="history-question">{item.question || '未填写占问事项'}</Text><Text className="history-date">{item.date}</Text></View></View>
              <Text className="history-delete" onClick={() => deleteRecord(item.id)}>删除</Text>
            </View>)}
          </ScrollView>
        </View>
      </View>}
    </View>
  )
}
