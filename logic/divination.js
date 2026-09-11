"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shichenName = void 0;
exports.readCoins = readCoins;
exports.tossCoins = tossCoins;
exports.timeDivination = timeDivination;
exports.getHexagramFromYaos = getHexagramFromYaos;
exports.getChangedHexagram = getChangedHexagram;
exports.getHexagramInterpretation = getHexagramInterpretation;
exports.createDivination = createDivination;
// Vendored runtime keeps the native mini-program self-contained and avoids
// requiring a separate WeChat DevTools "Build npm" step after import.
const lunar_typescript_1 = require("../vendor/lunar-typescript");
const trigrams_1 = require("../data/trigrams");
const hexagrams_1 = require("../data/hexagrams");
const SIX_SHEN = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
const NAJIA_GANZHI = {
    '乾': ['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌'],
    '坤': ['乙未', '乙巳', '乙卯', '癸丑', '癸亥', '癸酉'],
    '震': ['庚子', '庚寅', '庚辰', '庚午', '庚申', '庚戌'],
    '巽': ['辛丑', '辛亥', '辛酉', '辛未', '辛巳', '辛卯'],
    '坎': ['戊寅', '戊辰', '戊午', '戊申', '戊戌', '戊子'],
    '离': ['己卯', '己丑', '己亥', '己酉', '己未', '己巳'],
    '艮': ['丙辰', '丙午', '丙申', '丙戌', '丙子', '丙寅'],
    '兑': ['丁巳', '丁卯', '丁丑', '丁亥', '丁酉', '丁未'],
};
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI_WUXING = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木',
    '辰': '土', '巳': '火', '午': '火', '未': '土',
    '申': '金', '酉': '金', '戌': '土', '亥': '水',
};
const WUXING_SHENG = { '金': '水', '水': '木', '木': '火', '火': '土', '土': '金' };
const WUXING_KE = { '金': '木', '木': '土', '土': '水', '水': '火', '火': '金' };
const DI_ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const zhiOf = (naJia) => naJia?.slice(1) || '';
// 地支相冲：相隔六位（子午、丑未、寅申、卯酉、辰戌、巳亥）
const isChongZhi = (a, b) => {
    const ia = DI_ZHI_ORDER.indexOf(a), ib = DI_ZHI_ORDER.indexOf(b);
    return ia >= 0 && ib >= 0 && (ia - ib + 12) % 12 === 6;
};
// 地支六合：子丑、寅亥、卯戌、辰酉、巳申、午未
const HE_MAP = {
    '子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯',
    '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午',
};
const isHeZhi = (a, b) => HE_MAP[a] === b;
// 化进神／退神（同五行地支顺进为进、逆退为退）
const JINSHEN = { '寅': '卯', '巳': '午', '申': '酉', '亥': '子', '丑': '辰', '辰': '未', '未': '戌', '戌': '丑' };
const TUISHEN = { '卯': '寅', '午': '巳', '酉': '申', '子': '亥', '辰': '丑', '未': '辰', '戌': '未', '丑': '戌' };
// 以月建（月令）定爻之旺相休囚死
function wangShuaiByMonth(yaoEl, monthEl) {
    if (yaoEl === monthEl)
        return '旺';
    if (WUXING_SHENG[monthEl] === yaoEl)
        return '相';
    if (WUXING_SHENG[yaoEl] === monthEl)
        return '休';
    if (WUXING_KE[yaoEl] === monthEl)
        return '囚';
    if (WUXING_KE[monthEl] === yaoEl)
        return '死';
    return '—';
}
const isWangXiang = (ws) => ws === '旺' || ws === '相';
// 以宫的五行为准，判定某爻地支五行的六亲
function getLiuqin(gongElement, yaoElement) {
    if (yaoElement === gongElement)
        return '兄弟';
    if (WUXING_SHENG[gongElement] === yaoElement)
        return '子孙';
    if (WUXING_KE[gongElement] === yaoElement)
        return '妻财';
    if (WUXING_SHENG[yaoElement] === gongElement)
        return '父母';
    if (WUXING_KE[yaoElement] === gongElement)
        return '官鬼';
    return '兄弟';
}
// 卦的六爻纳甲地支（初至上）：下卦取本纳甲前三、上卦取后三
function najiaOf(hexagram) {
    const upperNajia = NAJIA_GANZHI[hexagram.upperTrigram.name] || [];
    const lowerNajia = NAJIA_GANZHI[hexagram.lowerTrigram.name] || [];
    return [lowerNajia[0], lowerNajia[1], lowerNajia[2], upperNajia[3], upperNajia[4], upperNajia[5]];
}
const yaoElementOf = (naJia) => ZHI_WUXING[naJia?.slice(1) || ''] || '木';
// 生成唯一 id：优先 crypto.randomUUID，老浏览器（Safari <15.4）降级
function genId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
const COIN_SUM_YAO = {
    6: { yin: true, changing: true, name: '老阴', caption: '三枚字面 · 老阴动爻 X' },
    7: { yin: false, changing: false, name: '少阳', caption: '一背两字 · 少阳静爻' },
    8: { yin: true, changing: false, name: '少阴', caption: '两背一字 · 少阴静爻' },
    9: { yin: false, changing: true, name: '老阳', caption: '三枚背面 · 老阳动爻 O' },
};
// coins[i] 为 true 表示该钱「字」面向上（阴面记二），false 为「背」面向上（阳面记三）
function readCoins(coins) {
    const backs = coins.filter(c => !c).length;
    return COIN_SUM_YAO[backs + 6];
}
function tossCoins() {
    const coins = [Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5];
    return { coins, ...readCoins(coins) };
}
function getHourZhi(hour) {
    if (hour >= 23 || hour < 1)
        return 0;
    if (hour >= 1 && hour < 3)
        return 1;
    if (hour >= 3 && hour < 5)
        return 2;
    if (hour >= 5 && hour < 7)
        return 3;
    if (hour >= 7 && hour < 9)
        return 4;
    if (hour >= 9 && hour < 11)
        return 5;
    if (hour >= 11 && hour < 13)
        return 6;
    if (hour >= 13 && hour < 15)
        return 7;
    if (hour >= 15 && hour < 17)
        return 8;
    if (hour >= 17 && hour < 19)
        return 9;
    if (hour >= 19 && hour < 21)
        return 10;
    return 11;
}
// 时辰名，与 getHourZhi 同出一源，免得起卦所用与界面所示两处各算一套
const shichenName = (hour) => `${DI_ZHI_ORDER[getHourZhi(hour)]}时`;
exports.shichenName = shichenName;
// 以 lunar-typescript 精确推算日辰、月建（按节气）与旬空，取代原有近似算法
function getGanZhiInfo(date) {
    const solar = lunar_typescript_1.Solar.fromYmdHms(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
    const lunar = solar.getLunar();
    // 日辰以子时（23 时）换日，非零点：Exact 一系正是此口径，旬空须与日辰同源，否则两处各说一套
    const dayGanZhi = lunar.getDayInGanZhiExact();
    const dayGan = Math.max(0, TIAN_GAN.indexOf(dayGanZhi.charAt(0)));
    const monthZhi = lunar.getMonthInGanZhiExact().charAt(1); // 月建地支，以节为界
    return {
        // 太岁与月建同用节气口径：年交立春、月交节，皆不取农历正月初一
        yearGanZhi: lunar.getYearInGanZhiExact(),
        dayGanZhi,
        dayGan,
        monthJian: monthZhi + '月',
        xunKong: lunar.getDayXunKongExact() + '空', // 返回如「午未」
    };
}
function trigramIdToYaos(id) {
    return trigrams_1.TRIGRAM_YAO_MAP[id] || [false, false, false];
}
// 梅花易数年月日时起卦。《梅花易数》「子年一数」「正月一数」「初一一数」皆指农历，
// 故年取农历年地支序（子一至亥十二）、月日取农历月日，闰月以其本月之数论。
// 日期无效时返回 null，交由调用方处理，不臆造卦象
function timeDivination(dateStr, hour) {
    const h = hour ?? new Date().getHours();
    const date = new Date(`${dateStr}T${String(h).padStart(2, '0')}:00:00`);
    if (isNaN(date.getTime()))
        return null;
    const lunar = lunar_typescript_1.Solar.fromYmdHms(date.getFullYear(), date.getMonth() + 1, date.getDate(), h, 0, 0).getLunar();
    const yearNum = DI_ZHI_ORDER.indexOf(lunar.getYearZhi()) + 1;
    const monthNum = Math.abs(lunar.getMonth());
    const dayNum = lunar.getDay();
    const hourZhi = getHourZhi(h) + 1;
    const sum = yearNum + monthNum + dayNum;
    const upperNum = sum % 8;
    const lowerNum = (sum + hourZhi) % 8;
    const changingYao = (sum + hourZhi) % 6;
    const upperTrigramId = upperNum === 0 ? 8 : upperNum;
    const lowerTrigramId = lowerNum === 0 ? 8 : lowerNum;
    const changingIdx = changingYao === 0 ? 5 : changingYao - 1;
    const upperYaos = trigramIdToYaos(upperTrigramId);
    const lowerYaos = trigramIdToYaos(lowerTrigramId);
    const yaos = [];
    for (let i = 0; i < 3; i++) {
        yaos.push({ index: i, yin: lowerYaos[i], changing: i === changingIdx });
    }
    for (let i = 0; i < 3; i++) {
        yaos.push({ index: i + 3, yin: upperYaos[i], changing: i + 3 === changingIdx });
    }
    return yaos;
}
function getHexagramFromYaos(yaos) {
    const lowerYaos = [yaos[0], yaos[1], yaos[2]];
    const upperYaos = [yaos[3], yaos[4], yaos[5]];
    const lowerTrigram = (0, trigrams_1.getTrigramFromYaos)(lowerYaos);
    const upperTrigram = (0, trigrams_1.getTrigramFromYaos)(upperYaos);
    const hexagram = hexagrams_1.HEXAGRAMS.find(h => h.upperTrigram.id === upperTrigram.id &&
        h.lowerTrigram.id === lowerTrigram.id);
    if (hexagram)
        return hexagram;
    return hexagrams_1.HEXAGRAMS[0];
}
function getChangedHexagram(originalYaos) {
    const changedYaos = originalYaos.map(yao => ({
        ...yao,
        yin: yao.changing ? !yao.yin : yao.yin,
        changing: false,
    }));
    const hasChanging = originalYaos.some(y => y.changing);
    if (!hasChanging)
        return { hexagram: null, changedYaos };
    const yaoBools = changedYaos.map(y => y.yin);
    return { hexagram: getHexagramFromYaos(yaoBools), changedYaos };
}
function getGongAndShiYing(upperId, lowerId) {
    const yaos = [
        ...trigramIdToYaos(lowerId),
        ...trigramIdToYaos(upperId)
    ];
    for (let gong = 1; gong <= 8; gong++) {
        const base = [...trigramIdToYaos(gong), ...trigramIdToYaos(gong)];
        if (yaos.every((y, i) => y === base[i]))
            return { gongId: gong, shi: 5, ying: 2, world: '本宫' };
        let c = [...base];
        c[0] = !c[0];
        if (yaos.every((y, i) => y === c[i]))
            return { gongId: gong, shi: 0, ying: 3, world: '一世' };
        c = [...base];
        c[0] = !c[0];
        c[1] = !c[1];
        if (yaos.every((y, i) => y === c[i]))
            return { gongId: gong, shi: 1, ying: 4, world: '二世' };
        c = [...base];
        c[0] = !c[0];
        c[1] = !c[1];
        c[2] = !c[2];
        if (yaos.every((y, i) => y === c[i]))
            return { gongId: gong, shi: 2, ying: 5, world: '三世' };
        c = [...base];
        c[0] = !c[0];
        c[1] = !c[1];
        c[2] = !c[2];
        c[3] = !c[3];
        if (yaos.every((y, i) => y === c[i]))
            return { gongId: gong, shi: 3, ying: 0, world: '四世' };
        c = [...base];
        c[0] = !c[0];
        c[1] = !c[1];
        c[2] = !c[2];
        c[3] = !c[3];
        c[4] = !c[4];
        if (yaos.every((y, i) => y === c[i]))
            return { gongId: gong, shi: 4, ying: 1, world: '五世' };
        // 游魂卦：初、二、三、五爻变（相对本宫），世四应初
        c = [...base];
        c[0] = !c[0];
        c[1] = !c[1];
        c[2] = !c[2];
        c[4] = !c[4];
        if (yaos.every((y, i) => y === c[i]))
            return { gongId: gong, shi: 3, ying: 0, world: '游魂' };
        // 归魂卦：仅五爻变（相对本宫），世三应六
        c = [...base];
        c[4] = !c[4];
        if (yaos.every((y, i) => y === c[i]))
            return { gongId: gong, shi: 2, ying: 5, world: '归魂' };
    }
    return { gongId: upperId, shi: 2, ying: 5, world: '本宫' };
}
function calculateNajia(hexagram, dayGan) {
    const najia = [];
    const { gongId, shi, ying, world } = getGongAndShiYing(hexagram.upperTrigram.id, hexagram.lowerTrigram.id);
    const gongElement = trigrams_1.TRIGRAMS[gongId - 1].element;
    const naJiaArr = najiaOf(hexagram);
    const sixShenStartMap = [0, 0, 1, 1, 2, 3, 4, 4, 5, 5];
    const sixShenStart = sixShenStartMap[dayGan];
    for (let i = 0; i < 6; i++) {
        const naJia = naJiaArr[i];
        najia.push({
            position: i,
            sixQin: getLiuqin(gongElement, yaoElementOf(naJia)),
            sixShen: SIX_SHEN[(sixShenStart + i) % 6],
            naJia,
            shi: i === shi,
            ying: i === ying,
        });
    }
    return { najia, gongId, gongElement, shi, world };
}
// 三合局（生旺墓三支）与三会局（四方本气三支）
const SANHE = [
    { zhi: ['申', '子', '辰'], name: '三合水局' },
    { zhi: ['亥', '卯', '未'], name: '三合木局' },
    { zhi: ['寅', '午', '戌'], name: '三合火局' },
    { zhi: ['巳', '酉', '丑'], name: '三合金局' },
];
const SANHUI = [
    { zhi: ['亥', '子', '丑'], name: '三会水局' },
    { zhi: ['寅', '卯', '辰'], name: '三会木局' },
    { zhi: ['巳', '午', '未'], name: '三会火局' },
    { zhi: ['申', '酉', '戌'], name: '三会金局' },
];
// 检出卦中三合／三会局。依《增删卜易·三合章》「静而不动者不取」：三支须各自发动，
// 一支安静即不成局；静爻惟逢日辰冲起（暗动）方作动论；逢旬空、月破者力已散，亦不入局。
// 须在 computeYaoStates 之后调用，暗动、旬空、月破皆取其所记之爻情
function detectHeju(najia, originalYao) {
    // 同一地支可现于两爻（如乾卦无重支，坤宫诸卦则有），其中任一爻可用即以该支论
    const usable = new Map();
    najia.forEach((n, i) => {
        const zhi = zhiOf(n.naJia);
        const tags = n.tags ?? [];
        const ok = !tags.includes('旬空') && !tags.includes('月破')
            && (!!originalYao[i]?.changing || tags.includes('暗动'));
        usable.set(zhi, (usable.get(zhi) ?? false) || ok);
    });
    const result = [];
    for (const group of [...SANHE, ...SANHUI]) {
        if (group.zhi.every(z => usable.get(z)))
            result.push(group.name);
    }
    return result;
}
// 月卦身：阳世从子起、阴世从午起，自初爻数至世爻（《卜筮正宗》安身诀）
function calcGuaShen(najia, originalYao, shi) {
    const shiYin = originalYao[shi]?.yin;
    const startZhi = shiYin ? '午' : '子';
    const startIdx = DI_ZHI_ORDER.indexOf(startZhi);
    const shenZhi = DI_ZHI_ORDER[(startIdx + shi) % 12];
    const positions = najia.map((n, i) => (zhiOf(n.naJia) === shenZhi ? i : -1)).filter(i => i >= 0);
    return { zhi: shenZhi, positions };
}
const LIUQIN_ALL = ['父母', '兄弟', '子孙', '妻财', '官鬼'];
// 伏神：本卦六亲不全者，以本宫首卦（八纯卦）补之。
// 依《增删卜易·飞伏神章》：首卦中所缺六亲所在爻位，即伏神伏于本卦同爻位飞神之下。
function calculateFushen(gongId, najia) {
    const gongElement = trigrams_1.TRIGRAMS[gongId - 1].element;
    const gongNajia = NAJIA_GANZHI[trigrams_1.TRIGRAMS[gongId - 1].name] || [];
    const present = new Set(najia.map(n => n.sixQin));
    const missing = new Set(LIUQIN_ALL.filter(q => !present.has(q)));
    if (missing.size === 0)
        return [];
    const fushen = [];
    for (let i = 0; i < 6; i++) {
        const naJia = gongNajia[i];
        const sixQin = getLiuqin(gongElement, yaoElementOf(naJia));
        // 首卦此爻六亲恰为本卦所缺者，则伏于本卦同爻位之下
        if (missing.has(sixQin)) {
            fushen.push({ position: i, sixQin, naJia, feiNajia: najia[i]?.naJia || '' });
        }
    }
    return fushen;
}
// 变卦纳甲与六亲：纳甲取变卦本身，六亲仍以本卦之宫五行为准（回头生克）
function calculateChangedNajia(changed, gongElement) {
    return najiaOf(changed).map((naJia, i) => ({
        position: i,
        naJia,
        sixQin: getLiuqin(gongElement, yaoElementOf(naJia)),
    }));
}
// 逐爻旺衰与动态标记：月破、旬空、暗动/日破、进神/退神、爻伏吟/爻反吟
function computeYaoStates(najia, originalYao, changedNajia, monthZhi, dayZhi, kongZhi) {
    const monthEl = ZHI_WUXING[monthZhi] || '';
    najia.forEach((item, i) => {
        const zhi = zhiOf(item.naJia);
        item.wangShuai = wangShuaiByMonth(ZHI_WUXING[zhi] || '', monthEl);
        const tags = [];
        const kong = kongZhi.includes(zhi);
        const yuePo = isChongZhi(zhi, monthZhi);
        if (kong)
            tags.push('旬空');
        if (yuePo)
            tags.push('月破');
        const moving = originalYao[i]?.changing;
        // 静爻逢日辰冲：旺相为暗动，休囚为日破（月破、旬空者另论，不计）
        if (!moving && !kong && !yuePo && isChongZhi(zhi, dayZhi)) {
            tags.push(isWangXiang(item.wangShuai) ? '暗动' : '日破');
        }
        // 动爻之化：进退神、爻伏吟（化同支）、爻反吟（化冲支）
        if (moving && changedNajia?.[i]) {
            const bZhi = zhiOf(changedNajia[i].naJia);
            if (bZhi === zhi)
                tags.push('伏吟');
            else if (isChongZhi(zhi, bZhi))
                tags.push('反吟');
            if (JINSHEN[zhi] === bZhi)
                tags.push('进神');
            else if (TUISHEN[zhi] === bZhi)
                tags.push('退神');
        }
        item.tags = tags;
    });
}
// 卦体六冲／六合：初四、二五、三上三对地支皆冲为六冲，皆合为六合
function hexagramRelation(naJiaArr) {
    const pairs = [[0, 3], [1, 4], [2, 5]];
    if (pairs.every(([a, b]) => isChongZhi(zhiOf(naJiaArr[a]), zhiOf(naJiaArr[b]))))
        return '六冲';
    if (pairs.every(([a, b]) => isHeZhi(zhiOf(naJiaArr[a]), zhiOf(naJiaArr[b]))))
        return '六合';
    return null;
}
// 卦反吟／伏吟：内卦（初二三）或外卦（四五上）有爻发动，且变出之三支与本支全同（伏吟）或全冲（反吟）。
// 不必三爻俱动：如乾内变震内，二三两爻动而三支（子寅辰）全同，正是内卦伏吟
function hexagramYinTags(najia, changedNajia, originalYao) {
    if (!changedNajia)
        return [];
    const tags = [];
    const check = (positions, name) => {
        // 该卦（内/外）须有动爻，且变出之支与本支全同为伏吟、全冲为反吟
        if (!positions.some(i => originalYao[i]?.changing))
            return;
        if (positions.every(i => zhiOf(najia[i].naJia) === zhiOf(changedNajia[i].naJia)))
            tags.push(`${name}伏吟`);
        else if (positions.every(i => isChongZhi(zhiOf(najia[i].naJia), zhiOf(changedNajia[i].naJia))))
            tags.push(`${name}反吟`);
    };
    check([0, 1, 2], '内卦');
    check([3, 4, 5], '外卦');
    return tags;
}
const YAO_POSITION_LABELS = ['初', '二', '三', '四', '五', '上'];
function getHexagramInterpretation(hexagram, changed, changingYaos) {
    const interpretations = [];
    const baseMeaning = hexagram.interpretation ?? hexagram.judgment;
    interpretations.push(`【本卦释义】${hexagram.name}：${baseMeaning}`);
    if (changed) {
        const changedMeaning = changed.interpretation ?? changed.judgment;
        interpretations.push(`【变卦趋势】事态终将转向${changed.name}：${changedMeaning}`);
    }
    if (changingYaos.length === 1) {
        const yaoIdx = changingYaos[0];
        const label = YAO_POSITION_LABELS[yaoIdx] ?? String(yaoIdx + 1);
        interpretations.push(`【动爻独发】${label}爻独发，主断在此，当以其爻辞为凭：${hexagram.lines[yaoIdx].text}`);
    }
    else if (changingYaos.length > 1) {
        interpretations.push(`【多爻发动】共有${['零', '一', '二', '三', '四', '五', '六'][changingYaos.length] ?? changingYaos.length}爻发动，事情复杂多变，宜以本卦卦义为主、变卦为辅，参酌动爻综合判断。`);
    }
    else {
        interpretations.push(`【六爻安静】卦无动爻，事态相对稳定，宜以本卦卦义与卦辞为主要参考，静守其常。`);
    }
    interpretations.push('【总断】心诚则灵，卦不妄成。以上仅供参考，谋事在人，成事在天，积德行善，自然逢凶化吉。');
    return interpretations;
}
function createDivination(originalYao, question, date, method, hour) {
    const yaoBools = originalYao.map(y => y.yin);
    const original = getHexagramFromYaos(yaoBools);
    const { hexagram: changed, changedYaos } = getChangedHexagram(originalYao);
    // 日辰、月建、旬空、六神均以起卦所选之时日推算，而非当前时刻。
    // 时辰不可省：月建以节之精确交接时刻为界（如 2026 立秋在 08-07 19:42），
    // 日辰又以 23 时换日，若一律钉作正午，交节当日与夜子时段的整列旺衰俱错
    const hh = String(hour ?? 12).padStart(2, '0');
    const selected = new Date(`${date}T${hh}:00:00`);
    const ganZhiDate = isNaN(selected.getTime()) ? new Date() : selected;
    const { yearGanZhi, dayGanZhi, dayGan, monthJian, xunKong } = getGanZhiInfo(ganZhiDate);
    const { najia, gongId, gongElement, shi, world } = calculateNajia(original, dayGan);
    const changedNajia = changed ? calculateChangedNajia(changed, gongElement) : null;
    const fushen = calculateFushen(gongId, najia);
    // 逐爻旺衰与动态标记（月破/旬空/暗动/日破/进退神/爻伏吟反吟）
    const monthZhi = monthJian.charAt(0);
    const dayZhi = dayGanZhi.charAt(1);
    const kongZhi = xunKong.replace('空', '').split('');
    computeYaoStates(najia, originalYao, changedNajia, monthZhi, dayZhi, kongZhi);
    // 卦体标记：本卦/变卦六冲六合、卦反吟伏吟
    const originalRelation = hexagramRelation(najia.map(n => n.naJia));
    const changedRelation = changed && changedNajia ? hexagramRelation(changedNajia.map(n => n.naJia)) : null;
    const yinTags = hexagramYinTags(najia, changedNajia, originalYao);
    // 卦宫世级、三合三会局、月卦身、合处逢冲/冲中逢合
    const gongName = `${trigrams_1.TRIGRAMS[gongId - 1].name}宫`;
    const heju = detectHeju(najia, originalYao);
    const guaShen = calcGuaShen(najia, originalYao, shi);
    const chongHe = originalRelation === '六合' && changedRelation === '六冲' ? '合处逢冲'
        : originalRelation === '六冲' && changedRelation === '六合' ? '冲中逢合' : '';
    return {
        id: genId(),
        question,
        date: `${date} ${dayGanZhi}日 ${monthJian} ${xunKong}`,
        // 时辰既定下卦与动爻（天机起卦），又定月建日辰，不存则此卦无从复现
        hour,
        method,
        originalYao,
        changedYao: changed ? changedYaos : originalYao.map(y => ({ ...y, changing: false })),
        original,
        changed,
        najia,
        changedNajia,
        fushen,
        originalRelation,
        changedRelation,
        yinTags,
        gongName,
        world,
        heju,
        guaShen,
        chongHe,
        yearGanZhi,
        dayGanZhi,
        monthJian,
        xunKong,
        created: Date.now(),
    };
}
