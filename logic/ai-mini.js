"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAiConfigured = void 0;
exports.resolveEndpoint = resolveEndpoint;
exports.aiDivination = aiDivination;
exports.testAiConnection = testAiConnection;
const divination_1 = require("./divination");
const METHOD_NAMES = {
    coins: '铜钱摇卦',
    manual: '手动起卦',
    time: '天机起卦（梅花易数时间起卦）',
};
const POS = ['初', '二', '三', '四', '五', '上'];
function buildPrompt(divination, question) {
    const { original, changed, originalYao, method, hour, najia, changedNajia, fushen, originalRelation, changedRelation, yinTags, gongName, world, heju, guaShen, chongHe, yearGanZhi, dayGanZhi, monthJian, xunKong } = divination;
    const changingYaos = originalYao.map((y, i) => y.changing ? i : -1).filter((i) => i >= 0);
    const changingDesc = changingYaos.length === 0
        ? '六爻安静，无动爻（以本卦卦爻辞及用神旺衰断之）'
        : `第${changingYaos.map((i) => POS[i]).join('、')}爻发动`;
    const linesDesc = original.lines
        .map((line, idx) => {
        const yao = originalYao[idx];
        const type = yao.yin
            ? (yao.changing ? '老阴×(动)' : '少阴--')
            : (yao.changing ? '老阳○(动)' : '少阳—');
        const item = najia[idx];
        const mark = `${item.shi ? '〔世〕' : ''}${item.ying ? '〔应〕' : ''}`;
        const ws = item.wangShuai ? `[${item.wangShuai}]` : '';
        const tags = item.tags && item.tags.length ? `〔${item.tags.join('、')}〕` : '';
        let head = `${POS[idx]}爻 ${item.sixShen} ${item.sixQin} ${item.naJia} ${type}${ws}${mark ? ' ' + mark : ''}${tags}`;
        const cn = yao.changing ? changedNajia?.[idx] : undefined;
        if (cn) {
            head += ` → 变出 ${cn.sixQin}${cn.naJia}`;
        }
        return `${head}  ${line.text}`;
    })
        .join('\n');
    const fushenDesc = fushen && fushen.length > 0
        ? fushen.map((f) => `${f.sixQin}${f.naJia}（伏于${POS[f.position]}爻飞神${f.feiNajia}之下）`).join('；')
        : '六亲俱全，无伏神';
    const relDesc = [
        originalRelation ? `本卦系${originalRelation}卦` : '',
        changedRelation ? `变卦系${changedRelation}卦` : '',
        chongHe,
        ...(yinTags || []),
        ...(heju || []),
    ]
        .filter(Boolean)
        .join('；') || '卦体无六冲六合、反吟伏吟、合局之特殊象';
    const guaShenDesc = guaShen
        ? `${guaShen.zhi}${guaShen.positions.length ? `（持于${guaShen.positions.map((i) => POS[i]).join('、')}爻）` : '（不上卦）'}`
        : '（未取）';
    // 卦宫世级与时辰皆是后加的字段，旧版存下的卦例并无，径直插值会写出「undefinedundefined卦」送进提示词
    const gongDesc = gongName && world ? `（${gongName}${world}卦）` : '';
    const shiChenDesc = typeof hour === 'number'
        ? `\n占时：${(0, divination_1.shichenName)(hour)}（六爻旺衰以年月日为纲，时辰不与；天机起卦之下卦与动爻则由此而定）`
        : '';
    return `你是一位精通周易六爻纳甲筮法的国手，宗京房纳甲、法《卜筮正宗》《增删卜易》《黄金策》之古法，断卦严谨、引理有据。请依下列完整卦象详为剖断：

【占问事项】${question || '（未明言，请就卦象总体气数而论）'}
【起卦方式】${METHOD_NAMES[method] ?? method}

【时令纲纪】${yearGanZhi ? `
太岁：${yearGanZhi}年（主一年之气，久远之事、国事大端方取，寻常小事不必强参）` : ''}
月建：${monthJian}（司权，为提纲，主一月之旺衰）
日辰：${dayGanZhi}日（主宰，能生克冲合卦爻，最为有力）
旬空：${xunKong}（值旬空之爻为空亡，待冲空、填实之期而应）${shiChenDesc}

【卦体】
本卦：${original.name}，${original.upperTrigram.name}上${original.lowerTrigram.name}下${gongDesc}（${original.judgment}）
${changed ? `变卦：${changed.name}，${changed.upperTrigram.name}上${changed.lowerTrigram.name}下（${changed.judgment}）` : '本卦无变（六爻安静）'}
发动：${changingDesc}
月卦身：${guaShenDesc}
卦象：${relDesc}（六冲主速动散、六合主缓聚成；伏吟主呻吟难进，反吟主反复不安；三合三会成局则其气专旺，宜察世爻是否在局）

【纳甲装卦（初爻至上爻；[旺相休囚死]为月令旺衰，〔…〕为月破/旬空/暗动/日破/进退神/伏吟反吟等爻情，动爻另标其变出）】
${linesDesc}

【伏神】${fushenDesc}

请依古法层层剖断，分条陈述：
一、定用神：按所占之事择用神（求财问利取妻财，功名官讼疾病取官鬼，文书房宅尊长取父母，子女平安医药取子孙，手足朋辈竞争取兄弟）。用神持世者事在己、易掌握；用神不上卦者，察其伏神能否得飞神引拔、临日月而出伏。
二、审旺衰：以月建为提纲、日辰为主宰，久远之事参太岁，定用神、原神（生用神者）、忌神（克用神者）之旺相休囚死；旺相则吉，休囚受制则凶。
三、察空破动变：用神逢旬空、月破则力弱待时；旺静之爻逢日冲为暗动（暗中有力），衰静之爻逢日冲为日破（力散）；动爻生克冲合用神，变爻回头生扶为吉、回头克害为凶，动化进神则递进有力、退神则渐退，化空化破亦须留意。
四、参卦象：六冲主速、主动、主散（事多不久或难成），六合主缓、主聚、主成；六合变六冲为合处逢冲（先成后败），六冲变六合为冲中逢合（先难后成）；卦逢伏吟则事滞难进、多呻吟忧疑，逢反吟则反复无常、去而复来；若成三合三会局，其气专旺，尤要世爻或用神在局为美，局生世用则吉、局克世用则凶（《增删卜易·三合章》）。
五、看世应飞伏：世为求测者本身，应为对方或所测之事；用神伏藏者，辨飞伏生克（飞生伏为得长生可出、伏克飞为出暴、飞克伏为伤身难出），伏神临日月或值旬空冲实之期可出伏。
六、断吉凶应期：综上明断吉凶成败，并以生旺墓绝、冲合、填实出空等定其应期（何月何日）。
七、结合卦爻辞与六亲类象，紧扣所占之事，给出切实可行的趋避建议。

要求：说理有据、层次分明，先总断吉凶再分述缘由，语言文雅而通俗，切忌空泛套话与模棱两可，约600字。`;
}
const SYSTEM_PROMPT = '你是周易六爻解卦国手，宗京房纳甲之学，深谙《卜筮正宗》《增删卜易》《黄金策》诸经，以用神为纲，参月建日辰之旺衰、动变飞伏之生克、空破墓绝之应期，断卦严谨、引理有据、切中肯綮。行文文雅通达，不作空泛套话，不模棱两可。';
const ENDPOINT_PATH = '/chat/completions';
function resolveEndpoint(baseUrl) {
    const raw = baseUrl.trim();
    if (!raw)
        return '';
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let url;
    try {
        url = new URL(withScheme);
    }
    catch {
        return '';
    }
    const path = url.pathname.replace(/\/+$/, '');
    if (path.toLowerCase().endsWith(ENDPOINT_PATH))
        url.pathname = path;
    // 已带版本号（/v1、/v3、/v1beta）的 base 直接接路径，免得拼出 /v1/v1
    else if (/\/v\d+[a-z0-9]*$/i.test(path))
        url.pathname = `${path}${ENDPOINT_PATH}`;
    else
        url.pathname = `${path}/v1${ENDPOINT_PATH}`;
    return url.toString();
}
const isAiConfigured = (config) => config.baseUrl.trim() !== '' && config.apiKey.trim() !== '' && config.model.trim() !== '';
exports.isAiConfigured = isAiConfigured;
function readPath(source, ...path) {
    let current = source;
    for (const key of path) {
        if (typeof current !== 'object' || current === null)
            return undefined;
        current = current[key];
    }
    return current;
}
const asText = (value) => typeof value === 'string' && value.length > 0 ? value : undefined;
function describeHttpError(responseData, status, endpoint) {
    let detail = '';
    if (typeof responseData === 'string') {
        try {
            detail = JSON.parse(responseData)?.error?.message || responseData.slice(0, 200);
        }
        catch {
            detail = responseData.slice(0, 200);
        }
    }
    else if (typeof responseData === 'object' && responseData !== null) {
        detail =
            asText(readPath(responseData, 'error', 'message')) ??
                asText(readPath(responseData, 'message')) ??
                asText(readPath(responseData, 'error')) ??
                JSON.stringify(responseData).slice(0, 200);
    }
    let reason = '请求失败';
    if (status === 401 || status === 403)
        reason = '密钥无效或无访问权限';
    else if (status === 404)
        reason = '接口地址不存在，请核对地址是否填写正确';
    else if (status === 400)
        reason = '请求被拒绝，通常是模型名填写有误';
    else if (status === 429)
        reason = '请求过于频繁，或账户额度不足';
    else if (status >= 500)
        reason = '请求服务端异常';
    return `${reason}（HTTP ${status}）${detail ? `：${detail}` : ''}｜请求地址：${endpoint}`;
}
function extractContent(data) {
    const payload = typeof data === 'string' ? (() => {
        try {
            return JSON.parse(data);
        }
        catch {
            return null;
        }
    })() : data;
    if (!payload || typeof payload !== 'object') return '';
    const error = asText(readPath(payload, 'error', 'message')) || asText(readPath(payload, 'error'));
    if (error)
        return `__ERROR__:${error}`;
    const choice = readPath(payload, 'choices', '0', 'message') || readPath(payload, 'choices', 0, 'message') || readPath(payload, 'choices', '0', 'delta');
    const text = asText(readPath(choice, 'content')) || asText(readPath(choice, 'text'));
    if (text)
        return text;
    const delta = asText(readPath(payload, 'choices', '0', 'delta', 'content')) || asText(readPath(payload, 'choices', 0, 'delta', 'content'));
    return delta || '';
}
function requestCompletion(config, userPrompt, callbacks) {
    const endpoint = resolveEndpoint(config.baseUrl);
    if (!endpoint) {
        callbacks.onError('接口地址无法解析，请在设置中检查所填地址（形如 https://api.example.com/v1）');
        return { abort() { } };
    }
    const payload = {
        model: config.model.trim(),
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
        ],
        stream: false,
    };
    const req = wx.request({
        url: endpoint,
        method: 'POST',
        header: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey.trim()}`,
        },
        data: payload,
        timeout: 60000,
        success: (res) => {
            const statusCode = res.statusCode || 0;
            if (statusCode < 200 || statusCode >= 300) {
                callbacks.onError(describeHttpError(res.data, statusCode, endpoint));
                return;
            }
            const text = extractContent(res.data);
            if (text?.startsWith('__ERROR__:')) {
                callbacks.onError(text.replace('__ERROR__:', '')); 
                return;
            }
            if (!text) {
                callbacks.onError('接口返回内容为空，未拿到模型回复。');
                return;
            }
            callbacks.onToken(text);
            callbacks.onDone();
        },
        fail: (err) => {
            if (String(err?.errMsg || '').includes('abort')) {
                callbacks.onDone();
                return;
            }
            const hint = err instanceof Error && err.message ? `（${err.message}）` : String(err?.errMsg || '');
            callbacks.onError(`无法连接到接口地址${hint}。常见原因：该端点不可访问，请核对地址和网络。｜请求地址：${endpoint}`);
        },
    });
    return {
        abort: () => {
            if (typeof req?.abort === 'function') {
                req.abort();
            }
        },
    };
}
function aiDivination(divination, question, config, callbacks = {}, signal) {
    if (!exports.isAiConfigured(config)) {
        callbacks.onError?.('尚未配置 AI 接口，请先在设置中填写接口地址、密钥与模型名');
        return { abort() { } };
    }
    const normalizedQuestion = question || divination.question || '';
    const prompt = buildPrompt(divination, normalizedQuestion);
    return requestCompletion(config, prompt, {
        onToken: callbacks.onToken || (() => { }),
        onDone: callbacks.onDone || (() => { }),
        onError: callbacks.onError || (() => { }),
    });
}
async function testAiConnection(config) {
    if (!exports.isAiConfigured(config)) {
        return { ok: false, message: '请先填写接口地址、密钥与模型名' };
    }
    return new Promise((resolve) => {
        let answered = false;
        let failed = '';
        let settled = false;

        const task = requestCompletion(config, '这是一次连通性测试，请只回复两个字：可用。', {
            onToken: (piece) => {
                if (settled)
                    return;
                if (answered || !piece?.trim())
                    return;
                answered = true;
                settled = true;
                task.abort();
                resolve({
                    ok: true,
                    message: `连接成功，${config.model.trim()} 可正常调用`,
                });
            },
            onDone: () => {
                if (settled)
                    return;
                settled = true;
                if (answered)
                    return;
                resolve({
                    ok: false,
                    message: failed || '接口已连通，但未返回任何内容，请检查模型名是否正确',
                });
            },
            onError: (message) => {
                if (settled)
                    return;
                settled = true;
                if (answered)
                    return;
                resolve({
                    ok: false,
                    message: message || failed || '接口返回异常',
                });
            },
        });
        setTimeout(() => {
            if (settled)
                return;
            settled = true;
            if (!answered) {
                task.abort();
                resolve({
                    ok: false,
                    message: failed || '连接超时，未拿到返回。',
                });
            }
        }, 120000);
    });
}
