const fs = require('fs')
const path = require('path')
const automator = require('miniprogram-automator')

const wsEndpoint = process.env.WECHAT_WS_ENDPOINT
const artifacts = path.resolve(__dirname, 'artifacts')
const projectPath = path.resolve(__dirname, '..', 'dist')
const cliPath = 'C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat'

async function shot(miniProgram, name) {
  const file = path.join(artifacts, name)
  await miniProgram.screenshot({ path: file })
  return file
}

async function run() {
  fs.mkdirSync(artifacts, { recursive: true })
  const miniProgram = wsEndpoint
    ? await automator.connect({ wsEndpoint })
    : await automator.launch({ projectPath, cliPath })
  const systemInfo = await miniProgram.callWxMethod('getSystemInfoSync')

  let page = await miniProgram.reLaunch('/pages/index/index')
  await page.waitFor(1000)
  const methods = await page.$$('.method-tab')
  if (methods.length !== 3) throw new Error(`method count: ${methods.length}`)
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

  page = await miniProgram.reLaunch('/pages/index/index')
  await page.waitFor(500)
  await miniProgram.pageScrollTo(1350)
  await page.waitFor(350)
  for (let cast = 0; cast < 6; cast += 1) {
    await (await page.$('.cast-button')).trigger('tap')
    await page.waitFor(1900)
  }
  if ((await page.$$('.preview-line--ready')).length !== 6) throw new Error('coin casts incomplete')
  await shot(miniProgram, 'redesign-coins-complete.png')
  await miniProgram.pageScrollTo(10000)
  await page.waitFor(350)
  await (await page.$('.result-btn')).trigger('tap')
  await page.waitFor(2800)
  if ((await miniProgram.currentPage()).path !== 'pages/result/index') throw new Error('coins result failed')

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
    modes: ['manual', 'time', 'coins'],
  }))
  process.exit(0)
}

run().catch(error => {
  console.error(error && error.stack ? error.stack : error)
  process.exit(1)
})
