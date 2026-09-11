import { Image, Text, View } from '@tarojs/components'
import './index.scss'

interface ProductBrandProps {
  compact?: boolean
}

export default function ProductBrand({ compact = false }: ProductBrandProps) {
  return (
    <View className={`product-brand ${compact ? 'product-brand--compact' : ''}`}>
      <Image
        className="product-brand__mark"
        src={require('../../assets/yikeyimi-mark-blackwhite.png')}
        mode="aspectFit"
      />
      <View className="product-brand__company">
        <Text className="product-brand__company-cn">一颗薏米</Text>
        <Text className="product-brand__company-en">YIKEYIMI</Text>
      </View>
      <View className="product-brand__divider" />
      <Text className="product-brand__title">一念六爻</Text>
    </View>
  )
}
