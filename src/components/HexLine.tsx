import { View, Text } from '@tarojs/components'
import './HexLine.scss'

interface Props {
  yin: boolean
  changing?: boolean
  compact?: boolean
  changed?: boolean
}

export default function HexLine({ yin, changing = false, compact = false, changed = false }: Props) {
  return (
    <View className={`hex-line ${compact ? 'hex-line--compact' : ''} ${changing ? 'hex-line--moving' : ''} ${changed ? 'hex-line--changed' : ''}`}>
      <View className="hex-line__stroke" />
      {yin && <View className="hex-line__gap" />}
      {yin && <View className="hex-line__stroke" />}
      {changing && <Text className="hex-line__mark">{yin ? 'X' : 'O'}</Text>}
    </View>
  )
}
