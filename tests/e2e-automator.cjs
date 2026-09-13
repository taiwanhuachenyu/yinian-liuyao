const fs = require('fs')
const path = require('path')
const net = require('net')
const { execFileSync } = require('child_process')
const automator = require('miniprogram-automator')

const wsEndpoint = process.env.WECHAT_WS_ENDPOINT
const artifacts = path.resolve(__dirname, 'artifacts')
const projectPath = path.resolve(__dirname, '..')
const cliPath = process.env.WECHAT_CLI_PATH || 'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat'
const autoPort = Number(process.env.WECHAT_AUTO_PORT || 9420)

async function shot(miniProgram, name) {
  const file = path.join(artifacts, name)
  await miniProgram.screenshot({ path: file })
  return file
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

async function run() {
  fs.mkdirSync(artifacts, { recursive: true })
  let endpoint = wsEndpoint || `ws://127.0.0.1:${autoPort}`
  let miniProgram
  try {
    miniProgram = await automator.connect({ wsEndpoint: endpoint })
  } catch (error) {
    if (wsEndpoint) throw error
    const port = await findFreePort()
    execFileSync(process.env.ComSpec || 'cmd.exe', [
      '/d', '/c', cliPath,
      'auto', '--project', projectPath, '--auto-port', String(port), '--trust-project', '--lang', 'zh',
    ], { stdio: 'inherit' })
    endpoint = `ws://127.0.0.1:${port}`
    miniProgram = await automator.connect({ wsEndpoint: endpoint })
  }
  const runtimeErrors = []
  miniProgram.on('exception', value => runtimeErrors.push(`exception: ${JSON.stringify(value)}`))
  miniProgram.on('console', value => {
    const level = String(value?.type || value?.level || '')
    if (/error/i.test(level)) runtimeErrors.push(`console: ${JSON.stringify(value)}`)
  })
  const systemInfo = await miniProgram.callWxMethod('getSystemInfoSync')

  let page = await miniProgram.reLaunch('/pages/index/index')
  console.log('[e2e] home loaded')
  await page.waitFor(1000)
  const methods = await page.$$('.method-tab')
  if (methods.length !== 3) throw new Error(`method count: ${methods.length}`)
  if ((await page.$$('.method-tab--active')).length !== 0) throw new Error('a method is selected before user action')
  if ((await page.$$('.coin-stage')).length !== 0) throw new Error('coins are visible before user selects coin mode')
  await shot(miniProgram, 'redesign-home.png')

  await miniProgram.pageScrollTo(1100)
  await page.waitFor(350)
  await (await page.$$('.method-tab'))[1].tap()
  await page.waitFor(350)
  const manualOptions = await page.$$('.manual-option')
  if (manualOptions.length !== 24) throw new Error(`manual option count: ${manualOptions.length}`)
  for (let row = 0; row < 6; row += 1) {
    await manualOptions[row * 4 + (row % 2 ? 3 : 2)].tap()
    await page.waitFor(180)
  }
  if ((await page.$$('.manual-option--active')).length !== 6) throw new Error('manual selections incomplete')
  await page.waitFor(350)
  await shot(miniProgram, 'redesign-manual.png')
  await miniProgram.pageScrollTo(10000)
  await page.waitFor(350)
  await (await page.$('.result-btn')).trigger('tap')
  await page.waitFor(2800)
  page = await miniProgram.currentPage()
  if (page.path !== 'pages/result/index') throw new Error(`manual result path: ${page.path}`)
  console.log('[e2e] manual flow passed')
  await shot(miniProgram, 'redesign-result.png')

  page = await miniProgram.reLaunch('/pages/index/index')
  await page.waitFor(500)
  await miniProgram.pageScrollTo(1100)
  await page.waitFor(350)
  await (await page.$$('.method-tab'))[2].tap()
  await page.waitFor(350)
  await shot(miniProgram, 'redesign-time.png')
  await miniProgram.pageScrollTo(10000)
  await page.waitFor(350)
  await (await page.$('.result-btn')).trigger('tap')
  await page.waitFor(2800)
  if ((await miniProgram.currentPage()).path !== 'pages/result/index') throw new Error('time result failed')
  console.log('[e2e] time flow passed')

  page = await miniProgram.reLaunch('/pages/index/index')
  await page.waitFor(500)
  await (await page.$$('.method-tab'))[0].tap()
  await page.waitFor(350)
  await miniProgram.pageScrollTo(1350)
  await page.waitFor(350)
  for (let cast = 0; cast < 6; cast += 1) {
    await (await page.$('.cast-button')).trigger('tap')
    await page.waitFor(2500)
  }
  if ((await page.$$('.preview-line--ready')).length !== 6) throw new Error('coin casts incomplete')
  await shot(miniProgram, 'redesign-coins-complete.png')
  await miniProgram.pageScrollTo(10000)
  await page.waitFor(350)
  await (await page.$('.result-btn')).trigger('tap')
  await page.waitFor(2800)
  if ((await miniProgram.currentPage()).path !== 'pages/result/index') throw new Error('coins result failed')
  console.log('[e2e] coin flow passed')

  page = await miniProgram.reLaunch('/pages/index/index')
  await page.waitFor(500)
  await (await page.$$('.home-shortcut'))[0].tap()
  await page.waitFor(350)
  const historyItems = await page.$$('.history-item')
  if (historyItems.length < 3) throw new Error(`history count: ${historyItems.length}`)
  await (await page.$('.history-main')).tap()
  await page.waitFor(3500)
  if ((await miniProgram.currentPage()).path !== 'pages/result/index') throw new Error('history restore failed')
  console.log('[e2e] history flow passed')

  if (runtimeErrors.length > 0) throw new Error(`runtime errors:\n${runtimeErrors.join('\n')}`)

  console.log(JSON.stringify({
    ok: true,
    device: {
      brand: systemInfo.brand,
      model: systemInfo.model,
      pixelRatio: systemInfo.pixelRatio,
      screenWidth: systemInfo.screenWidth,
      screenHeight: systemInfo.screenHeight,
      safeArea: systemInfo.safeArea,
    },
    flows: ['manual', 'time', 'coins', 'history'],
  }))
  process.exit(0)
}

run().catch(error => {
  console.error(error && error.stack ? error.stack : error)
  process.exit(1)
})
