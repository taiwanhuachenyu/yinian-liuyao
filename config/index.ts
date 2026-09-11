import { defineConfig, type UserConfigExport } from '@tarojs/cli'

export default defineConfig<'webpack5'>(async (merge, { command, mode }) => {
  const base: UserConfigExport<'webpack5'> = {
    projectName: '一念六爻',
    date: '2026-09-12',
    designWidth: 750,
    deviceRatio: { 750: 1 },
    sourceRoot: 'src',
    outputRoot: 'dist',
    framework: 'react',
    compiler: 'webpack5',
    cache: { enable: true },
    mini: {
      postcss: {
        pxtransform: { enable: true, config: {} },
        cssModules: { enable: false, config: { namingPattern: 'module', generateScopedName: '[name]__[local]___[hash:base64:5]' } },
      },
    },
  }
  return merge({}, base, command === 'build' ? {} : {}, mode === 'production' ? {} : {})
})
