const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const projectRoot = path.resolve(__dirname, '..', '..');
const miniRoot = path.resolve(projectRoot, 'mini-program');

function createMiniProgramLoader() {
  const cache = new Map();

  function load(requestPath) {
    let filename = path.resolve(requestPath);
    if (!path.extname(filename)) filename += '.js';
    if (cache.has(filename)) return cache.get(filename).exports;

    const moduleRecord = { exports: {} };
    cache.set(filename, moduleRecord);
    const nativeRequire = createRequire(filename);
    const localRequire = id => (
      id.startsWith('.')
        ? load(path.resolve(path.dirname(filename), id))
        : nativeRequire(id)
    );
    const source = fs.readFileSync(filename, 'utf8');
    const execute = new Function(
      'require',
      'module',
      'exports',
      '__filename',
      '__dirname',
      source,
    );
    execute(
      localRequire,
      moduleRecord,
      moduleRecord.exports,
      filename,
      path.dirname(filename),
    );
    return moduleRecord.exports;
  }

  return load;
}

function yao(index, yin, changing = false) {
  return { index, yin, changing };
}

test('all mini-program JSON files are valid', () => {
  const files = [
    'app.json',
    'project.config.json',
    'sitemap.json',
    'pages/index/index.json',
    'pages/result/index.json',
    'pages/settings/index.json',
  ];

  for (const relativePath of files) {
    const filename = path.resolve(miniRoot, relativePath);
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(filename, 'utf8')), relativePath);
  }
});

test('all 64 yin-yang combinations map to distinct hexagrams', () => {
  const load = createMiniProgramLoader();
  const { getHexagramFromYaos } = load(path.resolve(miniRoot, 'logic/divination.js'));
  const ids = new Set();

  for (let value = 0; value < 64; value += 1) {
    const yaos = Array.from({ length: 6 }, (_, index) => Boolean(value & (1 << index)));
    const hexagram = getHexagramFromYaos(yaos);
    assert.ok(hexagram, `missing hexagram for combination ${value}`);
    assert.ok(hexagram.id >= 1 && hexagram.id <= 64);
    assert.equal(hexagram.lines.length, 6);
    ids.add(hexagram.id);
  }

  assert.equal(ids.size, 64);
});

test('coin combinations preserve the four yao states', () => {
  const load = createMiniProgramLoader();
  const { readCoins, tossCoins } = load(path.resolve(miniRoot, 'logic/divination.js'));
  const cases = [
    [[true, true, true], { yin: true, changing: true, name: '老阴' }],
    [[true, true, false], { yin: false, changing: false, name: '少阳' }],
    [[true, false, false], { yin: true, changing: false, name: '少阴' }],
    [[false, false, false], { yin: false, changing: true, name: '老阳' }],
  ];

  for (const [coins, expected] of cases) {
    const actual = readCoins(coins);
    assert.equal(actual.yin, expected.yin);
    assert.equal(actual.changing, expected.changing);
    assert.equal(actual.name, expected.name);
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = tossCoins();
    assert.equal(result.coins.length, 3);
    assert.ok(result.coins.every(coin => typeof coin === 'boolean'));
    assert.equal(typeof result.yin, 'boolean');
    assert.equal(typeof result.changing, 'boolean');
  }
});

test('all eight coin faces map to the exact traditional yao result', () => {
  const load = createMiniProgramLoader();
  const { readCoins, tossCoins } = load(path.resolve(miniRoot, 'logic/divination.js'));
  const originalRandom = Math.random;

  try {
    for (let mask = 0; mask < 8; mask += 1) {
      const coins = Array.from({ length: 3 }, (_, index) => Boolean(mask & (1 << index)));
      const backs = coins.filter(coin => !coin).length;
      const expected = {
        0: { yin: true, changing: true, name: '老阴' },
        1: { yin: false, changing: false, name: '少阳' },
        2: { yin: true, changing: false, name: '少阴' },
        3: { yin: false, changing: true, name: '老阳' },
      }[backs];
      const read = readCoins(coins);
      assert.deepEqual({ yin: read.yin, changing: read.changing, name: read.name }, expected);

      let cursor = 0;
      Math.random = () => coins[cursor++] ? 0.75 : 0.25;
      const tossed = tossCoins();
      assert.deepEqual(tossed.coins, coins);
      assert.deepEqual({ yin: tossed.yin, changing: tossed.changing, name: tossed.name }, expected);
    }
  } finally {
    Math.random = originalRandom;
  }
});

test('every hexagram and every changing-line mask transforms without corruption', () => {
  const load = createMiniProgramLoader();
  const { getChangedHexagram, getHexagramFromYaos } = load(path.resolve(miniRoot, 'logic/divination.js'));

  for (let hexagramMask = 0; hexagramMask < 64; hexagramMask += 1) {
    const yinValues = Array.from({ length: 6 }, (_, index) => Boolean(hexagramMask & (1 << index)));
    assert.ok(getHexagramFromYaos(yinValues));
    for (let changingMask = 0; changingMask < 64; changingMask += 1) {
      const original = yinValues.map((yin, index) => yao(index, yin, Boolean(changingMask & (1 << index))));
      const transformed = getChangedHexagram(original);
      assert.equal(Boolean(transformed.hexagram), changingMask !== 0);
      assert.deepEqual(
        transformed.changedYaos.map(item => item.yin),
        yinValues.map((yin, index) => changingMask & (1 << index) ? !yin : yin),
      );
      assert.ok(transformed.changedYaos.every(item => item.changing === false));
    }
  }
});

test('time divination is valid for every hour of every day from 2024 through 2026', () => {
  const load = createMiniProgramLoader();
  const { timeDivination, shichenName } = load(path.resolve(miniRoot, 'logic/divination.js'));

  for (let year = 2024; year <= 2026; year += 1) {
    const cursor = new Date(`${year}-01-01T12:00:00`);
    while (cursor.getFullYear() === year) {
      const date = `${year}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      for (let hour = 0; hour < 24; hour += 1) {
        const result = timeDivination(date, hour);
        assert.equal(result.length, 6, `${date} ${hour}:00`);
        assert.equal(result.filter(item => item.changing).length, 1, `${date} ${hour}:00`);
        assert.deepEqual(result.map(item => item.index), [0, 1, 2, 3, 4, 5]);
        assert.match(shichenName(hour), /^[子丑寅卯辰巳午未申酉戌亥]时$/);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
});

test('homepage copy has meaningful empty, progress, and complete states', () => {
  const source = fs.readFileSync(path.resolve(miniRoot, 'src/pages/index/index.tsx'), 'utf8');
  assert.match(source, /准备起卦/);
  assert.match(source, /已起\$\{CN\[count\]\}爻，还需\$\{CN\[6 - count\]\}爻/);
  assert.match(source, /六爻已定/);
  assert.doesNotMatch(source, /已完成 \$\{CN\[count\]\} 爻/);
  assert.doesNotMatch(source, /六 爻 已 成/);
});

test('time divination always returns six lines and exactly one changing line', () => {
  const load = createMiniProgramLoader();
  const { timeDivination, shichenName } = load(path.resolve(miniRoot, 'logic/divination.js'));

  for (const date of ['2024-02-10', '2025-08-07', '2026-09-11']) {
    for (let hour = 0; hour < 24; hour += 1) {
      const yaos = timeDivination(date, hour);
      assert.equal(yaos.length, 6);
      assert.equal(yaos.filter(item => item.changing).length, 1);
      assert.deepEqual(yaos.map(item => item.index), [0, 1, 2, 3, 4, 5]);
      assert.equal(typeof shichenName(hour), 'string');
    }
  }
});

test('changing lines flip polarity and clear their changing state', () => {
  const load = createMiniProgramLoader();
  const { getChangedHexagram } = load(path.resolve(miniRoot, 'logic/divination.js'));
  const original = [
    yao(0, false, true),
    yao(1, true),
    yao(2, false),
    yao(3, true, true),
    yao(4, true),
    yao(5, false),
  ];
  const result = getChangedHexagram(original);

  assert.ok(result.hexagram);
  assert.deepEqual(result.changedYaos.map(item => item.yin), [true, true, false, false, true, false]);
  assert.ok(result.changedYaos.every(item => item.changing === false));

  const staticResult = getChangedHexagram(original.map(item => ({ ...item, changing: false })));
  assert.equal(staticResult.hexagram, null);
});

test('complete divination produces a reusable result model', () => {
  const load = createMiniProgramLoader();
  const { createDivination } = load(path.resolve(miniRoot, 'logic/divination.js'));
  const original = [
    yao(0, false),
    yao(1, true),
    yao(2, false, true),
    yao(3, true),
    yao(4, false),
    yao(5, true),
  ];
  const result = createDivination(original, '测试事业走向', '2026-09-11', 'manual', 9);

  assert.equal(result.question, '测试事业走向');
  assert.equal(result.method, 'manual');
  assert.equal(result.hour, 9);
  assert.equal(result.originalYao.length, 6);
  assert.equal(result.changedYao.length, 6);
  assert.equal(result.najia.length, 6);
  assert.ok(result.original);
  assert.ok(result.changed);
  assert.match(result.date, /^2026-09-11 /);
  assert.equal(typeof result.dayGanZhi, 'string');
  assert.equal(typeof result.monthJian, 'string');
  assert.equal(typeof result.xunKong, 'string');
});

test('app and all three pages register in a mocked WeChat runtime', () => {
  const load = createMiniProgramLoader();
  const registeredPages = [];
  let registeredApp;

  global.wx = new Proxy({
    getStorageSync: () => undefined,
    setStorageSync: () => undefined,
    showToast: () => undefined,
    navigateTo: () => undefined,
    redirectTo: () => undefined,
    navigateBack: () => undefined,
  }, {
    get(target, property) {
      return property in target ? target[property] : () => undefined;
    },
  });
  global.App = definition => { registeredApp = definition; };
  global.Page = definition => { registeredPages.push(definition); };
  global.getApp = () => registeredApp;

  try {
    load(path.resolve(miniRoot, 'app.js'));
    assert.ok(registeredApp);
    if (typeof registeredApp.onLaunch === 'function') {
      registeredApp.onLaunch.call(registeredApp);
    }

    for (const pagePath of [
      'pages/index/index.js',
      'pages/result/index.js',
      'pages/settings/index.js',
    ]) {
      load(path.resolve(miniRoot, pagePath));
    }

    assert.equal(registeredPages.length, 3);
    for (const definition of registeredPages) {
      assert.ok(definition.data && typeof definition.data === 'object');
      const context = {
        ...definition,
        data: { ...definition.data },
        setData(patch) {
          Object.assign(this.data, patch);
        },
      };
      if (typeof context.onLoad === 'function') context.onLoad.call(context);
      if (typeof context.onShow === 'function') context.onShow.call(context);
      if (typeof context.onUnload === 'function') context.onUnload.call(context);
    }
  } finally {
    delete global.wx;
    delete global.App;
    delete global.Page;
    delete global.getApp;
  }
});
