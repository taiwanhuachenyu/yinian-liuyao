const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const ts = require('typescript')

const projectRoot = path.resolve(__dirname, '..')

function resolveLocal(requestPath) {
  const candidates = [
    requestPath,
    `${requestPath}.ts`,
    `${requestPath}.tsx`,
    `${requestPath}.js`,
    `${requestPath}.json`,
    path.join(requestPath, 'index.ts'),
    path.join(requestPath, 'index.tsx'),
    path.join(requestPath, 'index.js'),
  ]
  const filename = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
  if (!filename) throw new Error(`Cannot resolve local module: ${requestPath}`)
  return filename
}

function createSourceLoader() {
  const cache = new Map()

  function load(requestPath) {
    const filename = resolveLocal(path.resolve(requestPath))
    if (cache.has(filename)) return cache.get(filename).exports
    if (path.extname(filename) === '.json') return JSON.parse(fs.readFileSync(filename, 'utf8'))

    const moduleRecord = { exports: {} }
    cache.set(filename, moduleRecord)
    const nativeRequire = createRequire(filename)
    const localRequire = id => id.startsWith('.')
      ? load(path.resolve(path.dirname(filename), id))
      : nativeRequire(id)
    const source = fs.readFileSync(filename, 'utf8')
    const executable = /\.tsx?$/.test(filename)
      ? ts.transpileModule(source, {
          fileName: filename,
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
            esModuleInterop: true,
            jsx: ts.JsxEmit.ReactJSX,
          },
        }).outputText
      : source

    new Function('require', 'module', 'exports', '__filename', '__dirname', executable)(
      localRequire,
      moduleRecord,
      moduleRecord.exports,
      filename,
      path.dirname(filename),
    )
    return moduleRecord.exports
  }

  return load
}

const load = createSourceLoader()
const divination = () => load(path.join(projectRoot, 'src/utils/divination.ts'))
const yao = (index, yin, changing = false) => ({ index, yin, changing })
const pickYaoState = ({ yin, changing, name }) => ({ yin, changing, name })

test('project JSON files are valid and point WeChat DevTools at the Taro build', () => {
  for (const relativePath of ['project.config.json', 'src/sitemap.json']) {
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')), relativePath)
  }
  const config = JSON.parse(fs.readFileSync(path.join(projectRoot, 'project.config.json'), 'utf8'))
  assert.equal(config.miniprogramRoot, 'dist/')
  assert.equal(config.appid, 'wx0bb71e2af814cfed')
  assert.equal(config.setting.urlCheck, true)
})

test('all 64 yin-yang combinations map to distinct hexagrams', () => {
  const { getHexagramFromYaos } = divination()
  const ids = new Set()
  for (let value = 0; value < 64; value += 1) {
    const lines = Array.from({ length: 6 }, (_, index) => Boolean(value & (1 << index)))
    const hexagram = getHexagramFromYaos(lines)
    assert.ok(hexagram)
    assert.ok(hexagram.id >= 1 && hexagram.id <= 64)
    assert.equal(hexagram.lines.length, 6)
    ids.add(hexagram.id)
  }
  assert.equal(ids.size, 64)
})

test('all eight coin faces map to the four traditional yao states', () => {
  const { readCoins, tossCoins } = divination()
  const originalRandom = Math.random
  try {
    for (let mask = 0; mask < 8; mask += 1) {
      const coins = Array.from({ length: 3 }, (_, index) => Boolean(mask & (1 << index)))
      const backs = coins.filter(coin => !coin).length
      const expected = {
        0: { yin: true, changing: true, name: '老阴' },
        1: { yin: false, changing: false, name: '少阳' },
        2: { yin: true, changing: false, name: '少阴' },
        3: { yin: false, changing: true, name: '老阳' },
      }[backs]
      assert.deepEqual(pickYaoState(readCoins(coins)), expected)
      let cursor = 0
      Math.random = () => coins[cursor++] ? 0.75 : 0.25
      const tossed = tossCoins()
      assert.deepEqual(tossed.coins, coins)
      assert.deepEqual(pickYaoState(tossed), expected)
    }
  } finally {
    Math.random = originalRandom
  }
})

test('every hexagram and changing-line mask transforms without corruption', () => {
  const { getChangedHexagram, getHexagramFromYaos } = divination()
  for (let hexagramMask = 0; hexagramMask < 64; hexagramMask += 1) {
    const yinValues = Array.from({ length: 6 }, (_, index) => Boolean(hexagramMask & (1 << index)))
    assert.ok(getHexagramFromYaos(yinValues))
    for (let changingMask = 0; changingMask < 64; changingMask += 1) {
      const original = yinValues.map((yin, index) => yao(index, yin, Boolean(changingMask & (1 << index))))
      const transformed = getChangedHexagram(original)
      assert.equal(Boolean(transformed.hexagram), changingMask !== 0)
      assert.deepEqual(
        transformed.changedYaos.map(item => item.yin),
        yinValues.map((yin, index) => changingMask & (1 << index) ? !yin : yin),
      )
      assert.ok(transformed.changedYaos.every(item => item.changing === false))
    }
  }
})

test('time divination is valid for every hour of every day from 2024 through 2026', () => {
  const { timeDivination, shichenName } = divination()
  for (let year = 2024; year <= 2026; year += 1) {
    const cursor = new Date(`${year}-01-01T12:00:00`)
    while (cursor.getFullYear() === year) {
      const date = `${year}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
      for (let hour = 0; hour < 24; hour += 1) {
        const result = timeDivination(date, hour)
        assert.equal(result.length, 6, `${date} ${hour}:00`)
        assert.equal(result.filter(item => item.changing).length, 1, `${date} ${hour}:00`)
        assert.deepEqual(result.map(item => item.index), [0, 1, 2, 3, 4, 5])
        assert.match(shichenName(hour), /^[子丑寅卯辰巳午未申酉戌亥]时$/)
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  }
})

test('complete divination produces a reusable result model', () => {
  const { createDivination } = divination()
  const original = [
    yao(0, false), yao(1, true), yao(2, false, true),
    yao(3, true), yao(4, false), yao(5, true),
  ]
  const result = createDivination(original, '', '2026-09-11', 'manual', 9)
  assert.equal(result.question, '')
  assert.equal(result.method, 'manual')
  assert.equal(result.hour, 9)
  assert.equal(result.originalYao.length, 6)
  assert.equal(result.changedYao.length, 6)
  assert.equal(result.najia.length, 6)
  assert.ok(result.original)
  assert.ok(result.changed)
  assert.equal(typeof result.dayGanZhi, 'string')
  assert.equal(typeof result.monthJian, 'string')
  assert.equal(typeof result.xunKong, 'string')
})

test('Taro source registers both pages and omits question and AI entry points', () => {
  const appConfig = fs.readFileSync(path.join(projectRoot, 'src/app.config.ts'), 'utf8')
  for (const page of ['pages/index/index', 'pages/result/index']) {
    assert.ok(appConfig.includes(page), `missing page: ${page}`)
  }
  assert.ok(!appConfig.includes('pages/settings/index'))
  const home = fs.readFileSync(path.join(projectRoot, 'src/pages/index/index.tsx'), 'utf8')
  assert.match(home, /准备排盘/)
  assert.match(home, /六爻已定/)
  assert.match(home, /还需完成/)
  assert.ok(!home.includes('你想问什么'))
  assert.ok(!home.includes('AI 解读'))
  assert.match(home, /useState<Method \| null>\(null\)/)
})
