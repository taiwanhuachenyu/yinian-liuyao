export interface Yao {
  index: number
  yin: boolean
  changing: boolean
}

export interface Trigram {
  id: number
  name: string
  symbol: string
  element: string
  nature: string
}

export interface LineText {
  position: number
  text: string
}

export interface Hexagram {
  id: number
  name: string
  symbol: string
  upperTrigram: Trigram
  lowerTrigram: Trigram
  judgment: string
  lines: LineText[]
  interpretation?: string
  tuan?: string
  xiang?: string
}

export interface NajiaItem {
  position: number
  sixQin: string
  sixShen: string
  naJia: string
  shi: boolean
  ying: boolean
  wangShuai?: string  // 旺/相/休/囚/死（以月建定）
  tags?: string[]     // 月破/旬空/暗动/日破/进神/退神/伏吟/反吟
}

// 变卦纳甲与六亲（六亲以本卦之宫为准，用于回头生克）
export interface ChangedNajiaItem {
  position: number
  naJia: string
  sixQin: string
}

// 伏神：本卦六亲不全时，自本宫首卦补入，伏于同爻位飞神之下
export interface FushenItem {
  position: number
  sixQin: string
  naJia: string
  feiNajia: string // 所伏之飞神（本卦该爻纳甲）
}

export interface Divination {
  id: string
  question: string
  date: string
  hour?: number                               // 起卦时辰所在小时；旧版卦例无此字段
  method: 'coins' | 'manual' | 'time'
  originalYao: Yao[]
  changedYao: Yao[]
  original: Hexagram
  changed: Hexagram | null
  najia: NajiaItem[]
  changedNajia?: ChangedNajiaItem[] | null
  fushen?: FushenItem[]
  originalRelation?: '六冲' | '六合' | null  // 本卦卦体
  changedRelation?: '六冲' | '六合' | null   // 变卦卦体
  yinTags?: string[]                          // 卦反吟/伏吟（内卦/外卦）
  gongName?: string                           // 卦宫，如「坎宫」
  world?: string                              // 世级：本宫/一世…游魂/归魂
  heju?: string[]                             // 三合局/三会局
  guaShen?: { zhi: string; positions: number[] }  // 月卦身
  chongHe?: string                            // 合处逢冲/冲中逢合
  yearGanZhi?: string                         // 太岁，以立春为界；旧版卦例无此字段
  dayGanZhi: string
  monthJian: string
  xunKong: string
  created: number
}

// AI 解卦接口配置。纯静态部署藏不住密钥，故由用户自带，仅存于其本机浏览器
export interface AiConfig {
  baseUrl: string
  apiKey: string
  model: string
}
