const fs = require('fs')
const path = require('path')

const endpoint = 'http://127.0.0.1:39270/mcp'
const session = process.env.WECHAT_MCP_SESSION || '8476bcf0-afcd-4c85-9e49-01f202ce7849'
const project = 'C:/yike/AIProject/liuyao-divination/mini-program'
const artifacts = path.resolve(__dirname, 'artifacts')
let requestId = 300

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function call(name, args) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-session-id': session,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: requestId++, method: 'tools/call', params: { name, arguments: args } }),
  })
  const raw = await response.text()
  const line = raw.split(/\r?\n/).find(item => item.startsWith('data: '))
  if (!line) throw new Error(`MCP ${name} 无有效响应：${raw}`)
  const envelope = JSON.parse(line.slice(6))
  if (envelope.result?.isError) throw new Error(envelope.result.content?.[0]?.text || `${name} failed`)
  const value = envelope.result?.content?.[0]?.text || ''
  try { return JSON.parse(value) } catch { return value }
}

function nodeIds(wxml, className, tag = 'view') {
  if (typeof wxml !== 'string') {
    wxml = wxml?.outerWxml || wxml?.wxml || wxml?.result || wxml?.value || JSON.stringify(wxml)
  }
  const pattern = new RegExp(`<${tag}\\b[^>]*>`, 'g')
  return (wxml.match(pattern) || [])
    .map(markup => ({
      id: markup.match(/\bid="([^"]+)"/)?.[1],
      classes: markup.match(/\bclass="([^"]*)"/)?.[1] || '',
    }))
    .filter(node => node.id && node.classes.split(/\s+/).includes(className))
    .map(node => node.id)
}

function hasApplicationError(value) {
  const text = String(value).trim()
  if (!text) return false
  return !(text.includes('inspectee MPPage.getCurrent error') && text.includes('getPageMetaByWebviewId'))
}

async function run() {
  fs.mkdirSync(artifacts, { recursive: true })
  await call('simulator_refresh', { project })
  await sleep(2500)
  await call('simulator_open_page', { project, page: '/pages/index/index' })
  await sleep(1500)
  await call('simulator_screenshot', { project, path: path.join(artifacts, 'react-home.png'), wait: 1, optimize: false })

  const methodWxml = await call('automation_element_action', { project, action: 'outerWxml', selector: '.method-tabs' })
  const methodIds = nodeIds(methodWxml, 'method-tab')
  if (methodIds.length !== 3) throw new Error(`起卦方式数量异常：${methodIds.length}`)
  await call('automation_element_action', { project, action: 'tap', selector: `#${methodIds[1]}` })
  await sleep(500)

  const manualWxml = await call('automation_element_action', { project, action: 'outerWxml', selector: '.manual-panel' })
  const optionIds = nodeIds(manualWxml, 'manual-option')
  if (optionIds.length !== 24) throw new Error(`手动爻选项数量异常：${optionIds.length}`)
  for (let row = 0; row < 6; row += 1) {
    await call('automation_element_action', { project, action: 'tap', selector: `#${optionIds[row * 4]}` })
  }

  await call('automation_element_action', { project, action: 'tap', selector: '.result-btn' })
  await sleep(2500)
  const current = await call('automation_runtime_info', { project, action: 'currentPage' })
  if (current.currentPage?.path !== 'pages/result/index') throw new Error(`结果页跳转失败：${current.currentPage?.path}`)
  const consoleErrors = await call('get_simulator_console', { project, command: 'grep -n -i error' })
  if (hasApplicationError(consoleErrors)) throw new Error(`模拟器控制台错误：${consoleErrors}`)
  const screenshot = await call('simulator_screenshot', { project, path: path.join(artifacts, 'react-result.png'), wait: 1, optimize: false })

  await call('automation_navigate', { project, action: 'reLaunch', url: '/pages/index/index' })
  await sleep(1000)
  const timeMethodWxml = await call('automation_element_action', { project, action: 'outerWxml', selector: '.method-tabs' })
  const timeMethodIds = nodeIds(timeMethodWxml, 'method-tab')
  await call('automation_element_action', { project, action: 'tap', selector: `#${timeMethodIds[2]}` })
  await sleep(300)
  await call('automation_element_action', { project, action: 'tap', selector: '.result-btn' })
  await sleep(2600)
  const timePage = await call('automation_runtime_info', { project, action: 'currentPage' })
  if (timePage.currentPage?.path !== 'pages/result/index') throw new Error('天机起卦未进入结果页')

  await call('automation_navigate', { project, action: 'reLaunch', url: '/pages/index/index' })
  await sleep(1000)
  for (let cast = 0; cast < 6; cast += 1) {
    await call('automation_element_action', { project, action: 'tap', selector: '.cast-button' })
    await sleep(1050)
  }
  await call('automation_element_action', { project, action: 'tap', selector: '.result-btn' })
  await sleep(2600)
  const coinPage = await call('automation_runtime_info', { project, action: 'currentPage' })
  if (coinPage.currentPage?.path !== 'pages/result/index') throw new Error('铜钱摇卦未进入结果页')
  const finalErrors = await call('get_simulator_console', { project, command: 'grep -n -i error' })
  if (hasApplicationError(finalErrors)) throw new Error(`三模式测试后控制台错误：${finalErrors}`)

  console.log(JSON.stringify({ ok: true, modes: ['manual', 'time', 'coins'], result: coinPage.currentPage.path, screenshot }))
}

run().catch(error => {
  console.error(error && error.stack ? error.stack : error)
  process.exitCode = 1
})
