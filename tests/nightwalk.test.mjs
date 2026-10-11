/* 夜行錄 N1（首 3 章）機械驗收：凍結 docs/experiments/2026-09-25-acceptance-n1-nightwalk.md 的 #3–#6、#8。
   跑法：node --test tests/nightwalk.test.mjs
   突變驗紅：NW_TARGET=<暫存副本.html> node --test tests/nightwalk.test.mjs（副本由呼叫端產生，原檔不動、不做反向 sed）。
   #1（常規局逐位元組不變）的主判定是 tests/tools/trace-eq.mjs；這裡另補「常規局 S 的欄位與座位／亂數」對 3a0d971 的對照。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadGame } from './tools/load.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = process.env.NW_TARGET || path.join(ROOT, 'index.html');
const COPY = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/experiments/2026-09-25-n1-nightwalk/copy-r1.json'), 'utf8'));
const BASE_SHA = '3a0d971';
const COPY2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/experiments/2026-10-11-n1-ch4-6/copy-r2.json'), 'utf8'));

const memStore = () => { const m = new Map(); const calls = []; return { m, calls, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { calls.push(k); m.set(k, String(v)); } }; };
const load = (storage) => loadGame(TARGET, storage ? { storage } : {});
const chState = (G, n, seed, picks, draws) => { G.makeState('solo', seed, picks, draws, undefined, undefined, { chapter: n }); return G.S; };
const item = (G, ab) => { const x = G.POOL.find((it) => it.ab === ab); assert.ok(x, `POOL 找不到 ab=${ab}`); return { ...x }; };
const ids = (arr) => arr.map((c) => c.id);

/* ---------------- #3 章節設定生效 ---------------- */
test('#3 三章各 seeds 1–50：主角恰好一次、在 AI 席；四席互不重複；真人席照選', () => {
  const G = load();
  for (const ch of G.NIGHTWALK) {
    const pool = G.selectPool(ch.n);
    for (let seed = 1; seed <= 50; seed++) {
      for (const picks of [undefined, [pool[seed % pool.length]], [ch.boss]]) {
        const S = chState(G, ch.n, seed, picks);
        const roles = S.players.map((p) => p.roleId);
        const bossSeats = S.players.filter((p) => p.roleId === ch.boss);
        assert.equal(bossSeats.length, 1, `第${ch.n}章 seed ${seed} 主角出現 ${bossSeats.length} 次`);
        assert.ok(bossSeats[0].ai, `第${ch.n}章 seed ${seed} 主角落在真人席`);
        assert.equal(new Set(roles).size, 4, `第${ch.n}章 seed ${seed} 四席有重複：${roles}`);
        const humans = S.players.filter((p) => !p.ai);
        assert.equal(humans.length, 1);
        assert.notEqual(humans[0].roleId, ch.boss);
        if (picks && picks[0] !== ch.boss) assert.equal(humans[0].roleId, picks[0], '真人選的池角色要照選');
        assert.equal(S.chapter, ch.n);
        assert.equal(S.mode, 'solo');
      }
    }
  }
});

test('#3 真人選主角：開局函式改抽，不會出現兩個主角', () => {
  const G = load();
  for (const ch of G.NIGHTWALK) {
    for (let seed = 1; seed <= 50; seed++) {
      const S = chState(G, ch.n, seed, [ch.boss]);
      assert.equal(S.players.filter((p) => p.roleId === ch.boss).length, 1);
      assert.notEqual(S.players[0].roleId, ch.boss);
      assert.equal(S.players[0].ai, null);
    }
  }
});

/* 對一位玩家袋子注入某組連鎖的完整材料；回 activeChains 與 chainsCompletedBy 的 id */
function inject(G, S, chain, seat = 0) {
  const p = S.players[seat];
  p.bag = chain.requirements.map((ab) => item(G, ab));
  const act = ids(G.activeChains(p));
  p.bag = [item(G, chain.requirements[0])];
  const comp = ids(G.chainsCompletedBy(p, item(G, chain.requirements[1])));
  return { act, comp };
}
/* 對四席各注入「已覺醒＋配方在袋」的天命，回天命效果判定 */
function destinyOn(G, S, chainId) {
  return S.players.map((p) => {
    p.alive = true; p.destiny = chainId; p.destinyAwakened = true;
    p.bag = G.CHAINS[chainId].requirements.map((ab) => item(G, ab));
    return G.activeTrueDestiny(p, p.destiny);
  });
}

test('#3 第 1 章：六組連鎖注入 activeChains／chainsCompletedBy 皆空（常規局同注入非空＝正對照）', () => {
  const G = load();
  for (const chain of Object.values(G.CHAINS)) {
    const on = inject(G, (G.makeState('solo', 11), G.S), chain);
    assert.deepEqual(on.act, [chain.id], `正對照：常規局 ${chain.id} 應生效`);
    assert.deepEqual(on.comp, [chain.id], `正對照：常規局 ${chain.id} 應可補齊`);
    const S1 = chState(G, 1, 11);
    assert.equal(S1.chainsOff, true);
    const off = inject(G, S1, chain);
    assert.deepEqual(off.act, [], `第 1 章 ${chain.id} activeChains 應為 []`);
    assert.deepEqual(off.comp, [], `第 1 章 ${chain.id} chainsCompletedBy 應為空`);
  }
});

test('#3 第 1 章：雙虎合陣不成隊、袋子不列連鎖進度（常規局對照）', () => {
  const G = load();
  const tiger = () => [item(G, 'tiger'), item(G, 'nail')];
  G.makeState('solo', 3);
  assert.ok(G.buildArmy(tiger()).teams.some((t) => t.ab === 'twinTiger'), '正對照：常規局合陣');
  chState(G, 1, 3);
  assert.ok(!G.buildArmy(tiger()).teams.some((t) => t.ab === 'twinTiger'), '第 1 章不得合陣');
});

test('#3 第 1、2 章：天命效果判定四席皆 false、AI 不追天命、命函不顯示（常規單人局正對照）', () => {
  const G = load();
  for (const chainId of Object.keys(G.CHAINS)) {
    G.makeState('solo', 21);
    assert.deepEqual(destinyOn(G, G.S, chainId), [true, true, true, true], `正對照：常規局真・${chainId} 生效`);
    for (const n of [1, 2]) {
      const S = chState(G, n, 21);
      assert.equal(S.destinyEffectMode, 'off');
      assert.equal(S.destinyAiChase, false);
      assert.deepEqual(destinyOn(G, S, chainId), [false, false, false, false], `第${n}章 真・${chainId} 不得生效`);
    }
  }
  const req = G.CHAINS.water.requirements;
  const chase = () => { const p = G.S.players[1]; p.life = 30; p.destiny = 'water'; p.bag = []; return G.destinyChaseBonus(p, item(G, req[0])); };
  G.makeState('solo', 21); assert.equal(chase(), 2, '正對照：常規局 AI 追天命 +2');
  for (const n of [1, 2]) { chState(G, n, 21); assert.equal(chase(), 0, `第${n}章 AI 不追天命`); }
  G.makeState('solo', 21); assert.match(G.destinyLetterHTML(G.S.players[0]), /天命/, '正對照：常規局袋子有命函');
  for (const n of [1, 2]) { const S = chState(G, n, 21); assert.equal(G.destinyLetterHTML(S.players[0]), '', `第${n}章 不得出現命函`); }
});

test('#3 第 2 章：連鎖注入非空；真實開標補齊天命配方也不覺醒、不公開（常規局正對照）', () => {
  const G = load();
  for (const chain of Object.values(G.CHAINS)) {
    const S2 = chState(G, 2, 13);
    assert.equal(S2.chainsOff, false);
    assert.deepEqual(inject(G, S2, chain).act, [chain.id], `第 2 章 ${chain.id} 應生效`);
  }
  const bid = (amt) => ({ amt, type: 'cons', intent: 'keep', target: null });
  const run = (chapter) => {
    const H = load();
    H.CFG.WISH_ON = false; H.CFG.EVENT_ON = false; H.CFG.RULE_ON = false;
    H.makeState('solo', 5, undefined, ['water', 'water', 'water', 'water'], undefined, undefined, chapter ? { chapter } : undefined);
    const S = H.S;
    S.players.forEach((p) => { p.ai = null; p.roleId = 'human'; p.bag = []; p.life = 40; p.alive = true; p.wish = null; p.grudge = {}; });
    S.players[0].bag = [item(H, 'boat')];
    S.market = [item(H, 'buoy')];
    S.humanBids = { 0: [bid(3)] };
    const r = H.resolveAuction();
    return { won: S.players[0].bag.some((x) => x.ab === 'buoy'), aw: r[0].destinyAwakenings, awakened: S.players[0].destinyAwakened, pub: S.destinyPublic[0] };
  };
  const reg = run(null);
  assert.ok(reg.won, '正對照：真人標下水鬼浮標');
  assert.deepEqual(reg.aw, [{ pid: 0, chainId: 'water' }], '正對照：常規局覺醒');
  const c2 = run(2);
  assert.ok(c2.won, '第 2 章同樣標下');
  assert.deepEqual(c2.aw, [], '第 2 章不得覺醒');
  assert.equal(c2.awakened, false);
  assert.equal(c2.pub, false);
});

test('#3 第 3 章：destinyEffectMode 與常規單人局相同（original），連鎖注入非空', () => {
  const G = load();
  G.makeState('solo', 9);
  const reg = { mode: G.S.destinyEffectMode, chase: G.S.destinyAiChase };
  assert.equal(reg.mode, 'original');
  const S3 = chState(G, 3, 9);
  assert.equal(S3.destinyEffectMode, reg.mode);
  assert.equal(S3.destinyAiChase, reg.chase);
  assert.equal(S3.chainsOff, false);
  for (const chain of Object.values(G.CHAINS)) assert.deepEqual(inject(G, chState(G, 3, 9), chain).act, [chain.id]);
  assert.deepEqual(destinyOn(G, chState(G, 3, 9), 'eyes'), [true, true, true, true]);
});

test('#3／#1 恩怨台詞只耗 S.rngUi，S.rng 不動', () => {
  const G = load();
  chState(G, 1, 33);
  const a = G.nwFeudPick('open');
  assert.equal(a.text, G.NIGHTWALK[0].feud.open[0]);
  assert.equal(a.pid, G.S.players.find((p) => p.roleId === 'qingmian').id);
  const after = G.S.rng();
  chState(G, 1, 33);
  assert.equal(G.S.rng(), after, 'nwFeudPick 不得消耗 S.rng');
});

test('#1 常規局：S 不多欄位；座位與亂數流與 3a0d971 相同（seeds 1–50、solo／hotseat）', () => {
  const baseSrc = execSync(`git show ${BASE_SHA}:index.html`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  const B = loadGame(null, { sourceText: baseSrc });
  const G = load();
  const pool = G.selectPool();
  for (let seed = 1; seed <= 50; seed++) {
    for (const [mode, picks] of [['solo', undefined], ['solo', [pool[seed % 10]]], ['hotseat', [pool[seed % 10], pool[(seed + 3) % 10]]]]) {
      const draws = ['water', 'eyes', 'godKing', 'water'];
      B.makeState(mode, seed, picks, draws); G.makeState(mode, seed, picks, draws);
      assert.deepEqual(Object.keys(G.S), Object.keys(B.S), `seed ${seed} ${mode} S 欄位不同`);
      assert.ok(!('chapter' in G.S) && !('chainsOff' in G.S));
      assert.deepEqual(G.S.players.map((p) => [p.roleId, !!p.ai, p.name]), B.S.players.map((p) => [p.roleId, !!p.ai, p.name]));
      assert.deepEqual([G.S.rng(), G.S.rng(), G.S.rng()], [B.S.rng(), B.S.rng(), B.S.rng()], `seed ${seed} ${mode} 亂數流不同`);
      assert.deepEqual(G.S.market.map((x) => x.n), B.S.market.map((x) => x.n));
    }
  }
});

/* ---------------- #4 過關判定 ---------------- */
test('#4 nightwalkPass 表格：只比真人與主角；平手、真人出局皆未過', () => {
  const G = load();
  const ch = { boss: 'qingmian' };
  const st = (me, boss, bossSeat = 1) => {
    const players = [
      { id: 0, ai: null, roleId: 'hunter', ...me },
      { id: 1, ai: {}, roleId: 'zutou', alive: true, life: 99 },
      { id: 2, ai: {}, roleId: 'luzhu', alive: true, life: 98 },
      { id: 3, ai: {}, roleId: 'dangpu', alive: true, life: 97 },
    ];
    players[bossSeat] = { id: bossSeat, ai: {}, roleId: 'qingmian', ...boss };
    return { players };
  };
  const cases = [
    ['真人活＋主角出局 → 過', { alive: true, life: 3 }, { alive: false, life: 0 }, true],
    ['皆活＋真人壽命大於主角 → 過', { alive: true, life: 20 }, { alive: true, life: 19 }, true],
    ['皆活＋壽命相等 → 未過', { alive: true, life: 20 }, { alive: true, life: 20 }, false],
    ['皆活＋真人壽命較少 → 未過', { alive: true, life: 10 }, { alive: true, life: 19 }, false],
    ['真人出局＋主角活 → 未過', { alive: false, life: 0 }, { alive: true, life: 5 }, false],
    ['真人出局＋主角出局 → 未過', { alive: false, life: 0 }, { alive: false, life: 0 }, false],
    ['主角坐別席也只比主角（其餘 AI 壽命更高不影響）', { alive: true, life: 12 }, { alive: true, life: 11 }, true],
  ];
  for (const [name, me, boss, want] of cases) {
    assert.equal(G.nightwalkPass(st(me, boss), ch), want, name);
    assert.equal(G.nightwalkPass(st(me, boss, 3), ch), want, name + '（主角坐東）');
  }
});

/* ---------------- #5 存檔 ---------------- */
test('#5 過關寫入 {"v":1,"cleared":[…]}、讀回一致、重複通關不重複、未過關不寫', () => {
  const store = memStore();
  const G = load(store);
  const force = (S, pass) => { const me = S.players[0], boss = S.players.find((p) => p.roleId === G.nwChapter(S.chapter).boss); me.alive = true; me.life = 20; boss.alive = true; boss.life = pass ? 19 : 20; };
  let S = chState(G, 1, 4); force(S, false);
  let r = G.nwRecord(S);
  assert.equal(r.pass, false);
  assert.equal(store.calls.filter((k) => k === G.NW_KEY).length, 0, '未過關不得寫入（makeState 另寫的天命抽籤鍵不算）');
  assert.equal(store.getItem(G.NW_KEY), null);
  S = chState(G, 1, 4); force(S, true);
  r = G.nwRecord(S);
  assert.equal(r.pass, true);
  assert.equal(store.getItem(G.NW_KEY), '{"v":1,"cleared":[1]}');
  assert.deepEqual(G.nwLoad(), { v: 1, cleared: [1] });
  S = chState(G, 1, 5); force(S, true); G.nwRecord(S);
  assert.deepEqual(JSON.parse(store.getItem(G.NW_KEY)).cleared, [1], '同章重複通關不重複');
  S = chState(G, 2, 6); force(S, true); G.nwRecord(S);
  assert.deepEqual(JSON.parse(store.getItem(G.NW_KEY)), { v: 1, cleared: [1, 2] });
  S = chState(G, 3, 7); force(S, false); G.nwRecord(S);
  assert.deepEqual(JSON.parse(store.getItem(G.NW_KEY)), { v: 1, cleared: [1, 2] }, '第 3 章未過不寫');
});

test('#5 壞資料／讀寫丟例外：當空進度、不丟例外、選單只開第 1 章、可開局', () => {
  const bad = ['{bad json', '{"v":2,"cleared":[1,2]}', '{"v":1,"cleared":"1,2"}', '{"v":1}', 'null', '[1,2]', '"x"', '{"v":"1","cleared":[1]}'];
  const stores = bad.map((raw) => ({ label: raw, getItem: () => raw, setItem: () => {} }));
  stores.push({ label: 'getItem／setItem 丟例外', getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } });
  for (const s of stores) {
    const G = load(s);
    assert.deepEqual(G.nwLoad(), { v: 1, cleared: [] }, s.label);
    assert.deepEqual(G.nwMenuModel(G.nwLoad().cleared, false).map((m) => m.open), [true, false, false, false, false, false], s.label);
    assert.doesNotThrow(() => G.nwSave(1), s.label);
    const S = chState(G, 1, 8);
    assert.equal(S.players.length, 4, s.label + ' 可開局');
  }
});

/* ---------------- #6 章節開放與選角 ---------------- */
test('#6 依序開放；?nwall=1 全開', () => {
  const G = load();
  const open = (cleared, all = false) => G.NIGHTWALK.map((c) => G.nwChapterOpen(c.n, cleared, all));
  assert.deepEqual(open([]), [true, false, false, false, false, false]);
  assert.deepEqual(open([1]), [true, true, false, false, false, false]);
  assert.deepEqual(open([1, 2]), [true, true, true, false, false, false]);
  assert.deepEqual(open([], true), [true, true, true, true, true, true]);
  assert.deepEqual(G.nwMenuModel([]).map((m) => m.open), [true, false, false, false, false, false], '沒帶 ?nwall＝依序');
  const src = fs.readFileSync(TARGET, 'utf8');
  const anchor = 'const NW_ALL=(()=>{ try{ return new URLSearchParams(typeof location!=="undefined"&&location.search?location.search:"")';
  assert.ok(src.includes(anchor), 'NW_ALL 讀網址參數的寫法變了，要同步更新本測試');
  const A = loadGame(null, { sourceText: src.replace(anchor, 'const NW_ALL=(()=>{ try{ return new URLSearchParams("?nwall=1")') });
  assert.deepEqual(A.nwMenuModel([]).map((m) => m.open), [true, true, true, true, true, true], '?nwall=1 六章皆可進');
});

test('#6 章節局選角：可選任一池角色，唯獨該章主角不可選；常規模式 10 角色全開且與 3a0d971 相同', () => {
  const G = load();
  const all = Object.keys(G.ROLES).filter((k) => G.ROLES[k].pool);
  assert.equal(all.length, 10);
  assert.deepEqual(G.selectPool(), all);
  assert.deepEqual(G.selectPool(null), all);
  const baseSrc = execSync(`git show ${BASE_SHA}:index.html`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  const B = loadGame(null, { sourceText: baseSrc });
  assert.deepEqual(G.selectPool(), Object.keys(B.ROLES).filter((k) => B.ROLES[k].pool), '常規選角清單與改動前相同');
  for (const ch of G.NIGHTWALK) {
    const pool = G.selectPool(ch.n);
    assert.deepEqual(pool, all.filter((k) => k !== ch.boss));
    for (const k of pool) assert.equal(chState(G, ch.n, 17, [k]).players[0].roleId, k);
  }
  const src = fs.readFileSync(TARGET, 'utf8');
  const render = src.slice(src.indexOf('function renderSelect(){'), src.indexOf('function pickRole('));
  assert.match(render, /const pool=selectPool\(SEL\.chapter\)/, '選角畫面要讀 selectPool');
  const pick = src.slice(src.indexOf('function pickRole('), src.indexOf('function confirmRole('));
  assert.match(pick, /SEL\.chapter&&!selectPool\(SEL\.chapter\)\.includes\(k\)\) return/, '章節局點主角要被拒');
});

/* ---------------- #8 文案格式 ---------------- */
/* 常見簡體字表（只收「繁體中文不使用」的簡化字形；可能兼作繁體的字如 后、里、台、干、只、余、范、种 等一律不收） */
const SIMPLIFIED = [...new Set([...(
  '这们说时会过还进对开关问题学个来为国样实现从动发当没两头见觉认识话语请谢读写听买卖钱银铁门间闻阅马鸟鱼龙东车长书专业乐习乡亲仅众优伤体儿兴养军农刘则刚创别剧办务劳势区医华协单卫厂厅历压县双变吗员响团园围图圆圣场坏块坚墙声处备复夺妇妈孙宁宝审宫宽宾寻导寿将尔尘尝层属岁岛岭帅师带帮庆庙废张归录忆忧怀态总恋恶惊惯战戏户执扩扫扬护报担拥择挤挥损换摆敌数断无旧显晓暂杀杂权条杨极构枪标树桥检楼气汉汤泽洁浅测济浓润涨湾满灭灯灵炉点烂热爱爷牵犹狮独猎献环电画疗盖盘矿码砖础离积称稳穷竞笔简签类粮紧罗罚职联聪脑脸脏艺节苏荣药获营蓝虑虽补装触誉赵践轨辞边迁运远违连迟适选递遗邮邻郑释鉴闪队阳阴阶际陆陈险随隐难雾龟齐齿纸线红绿细经结给统继续绝编缘织纪约级练组终钟钢锁错锅镜针铜链财货贵费贺资赏赢贫购贴账转轮软轻较辆输辈驾验骑骗驱鸡鸣鸭鲜页顶项顺须顾顿预领颜额风观规视览词译论设访证评试诗诉讲许议记计订讨训诚误调谈谁谓谋课残'
)])];
const cjkSentences = (arr) => (arr.join('').match(/[。！？]+/g) || []).length;
const charLen = (s) => [...s.replace(/\s/g, '')].length;
const simpHits = (text) => [...text].filter((c) => SIMPLIFIED.includes(c));

test('#8 NIGHTWALK 逐字等於讀者驗收過的 copy-r1.json', () => {
  const G = load();
  const pick = (c) => ({ n: c.n, title: c.title, boss: c.boss, intro: c.intro, teach: c.teach, feud: c.feud, scroll: c.scroll });
  assert.deepEqual(JSON.parse(JSON.stringify(G.NIGHTWALK.slice(0, 3).map(pick))), COPY.map(pick), '第 1–3 章仍逐字等於 copy-r1.json');
  assert.deepEqual(G.NIGHTWALK.slice(0, 3).map((c) => c.rules), [{ chains: false, destiny: false }, { chains: true, destiny: false }, { chains: true, destiny: true }]);
  for (const c of G.NIGHTWALK) assert.ok(G.ROLES[c.boss] && G.ROLES[c.boss].pool, `主角 ${c.boss} 要是池角色`);
});

test('#8 文案格式：引言 3–5 句、新規則 2–4 條、恩怨三時機各 ≥1、殘卷標題＋150–300 字', () => {
  const G = load();
  assert.equal(G.NIGHTWALK.length, 6);
  for (const c of G.NIGHTWALK) {
    const k = `第${c.n}章`;
    const s = cjkSentences(c.intro);
    assert.ok(s >= 3 && s <= 5, `${k} 引言 ${s} 句`);
    assert.ok(c.teach.length >= 2 && c.teach.length <= 4, `${k} 新規則 ${c.teach.length} 條`);
    for (const key of ['open', 'bossLose', 'bossWin']) {
      assert.ok(Array.isArray(c.feud[key]) && c.feud[key].length >= 1 && c.feud[key].every((t) => typeof t === 'string' && t.trim()), `${k} feud.${key}`);
    }
    assert.ok(typeof c.scroll.title === 'string' && c.scroll.title.trim(), `${k} 殘卷標題`);
    const L = charLen(c.scroll.text);
    assert.ok(L >= 150 && L <= 300, `${k} 殘卷 ${L} 字`);
    assert.ok(typeof c.title === 'string' && c.title.trim(), `${k} 標題`);
  }
});

test('#8 不含簡體字：內建字表 ≥100 字（正對照抓得到），文案與夜行錄介面字串掃描 0', () => {
  assert.ok(SIMPLIFIED.length >= 100, `字表只有 ${SIMPLIFIED.length} 字`);
  assert.ok(simpHits('这是简体测试，庙里点灯，惊魂未定').length >= 5, '正對照：字表要抓得到簡體');
  const G = load();
  const all = G.NIGHTWALK.flatMap((c) => [c.title, c.scroll.title, c.scroll.text, ...c.intro, ...c.teach, ...c.feud.open, ...c.feud.bossLose, ...c.feud.bossWin]).join('');
  assert.deepEqual(simpHits(all), [], '文案不得含簡體字');
  const src = fs.readFileSync(TARGET, 'utf8');
  const ui = src.split(/\r?\n/).filter((l) => /\bnw[A-Z]|NW_|NIGHTWALK|nightwalk|夜行錄/.test(l)).join('\n');
  assert.ok(ui.length > 2000, '介面字串掃描範圍太小（活性）');
  assert.deepEqual(simpHits(ui), [], '夜行錄介面字串不得含簡體字');
});

/* ---------------- 覆審 MEDIUM：開局台詞泡不得漏到第 2 夜 ---------------- */
test('開局台詞泡：第 1 夜重畫補回（正對照）、第 2 夜不補回、常規局不動作', () => {
  const inj = `
  const __fake={textContent:'',shown:false,classList:{add(){__fake.shown=true;},remove(){}}};
  document.getElementById=(id)=>id==='bub1'?__fake:null;
  window.__yaoshi.__nwBub={
    run(s,bub,said){ S=s; NW_BUBBLE=bub; NW_OPEN_SAID=said; __fake.shown=false; __fake.textContent=''; nwBidScreenBubble(); return {shown:__fake.shown,text:__fake.textContent}; },
  };`;
  const src = fs.readFileSync(TARGET, 'utf8').replace(/<script>[\s\S]*?<\/script>/, (m) => m.replace('</script>', inj + '\n</script>'));
  const H = loadGame(null, { sourceText: src }).__nwBub;
  assert.ok(H, '測試掛點注入失敗');
  const bub = () => ({ pid: 1, text: '開局台詞', until: Date.now() + 60000 });
  const r1 = H.run({ chapter: 1, round: 1 }, bub(), true);
  assert.deepEqual(r1, { shown: true, text: '開局台詞' }, '正對照：第 1 夜重畫後要補回');
  const r2 = H.run({ chapter: 1, round: 2 }, bub(), true);
  assert.equal(r2.shown, false, '第 2 夜不得補回第 1 夜的開局台詞');
  const r0 = H.run({ round: 1 }, bub(), true);
  assert.equal(r0.shown, false, '常規局（無 S.chapter）不得動作');
});

/* =====================================================================
   第 4–6 章「規則補課」（凍結 docs/experiments/2026-10-11-acceptance-n1-ch4-6.md #3–#9）
   ===================================================================== */
const BOSS46 = ['lvshan', 'zutou', 'dangpu'];
const forcePass = (G, S, pass) => { const me = S.players.find((p) => !p.ai), boss = S.players.find((p) => p.roleId === G.nwChapter(S.chapter).boss); me.alive = true; me.life = 20; boss.alive = true; boss.life = pass ? 19 : 20; };

test('#3(46) 第 4–6 章：主角／規則欄位正確；destinyEffectMode original、連鎖與天命皆開（注入六組連鎖皆生效）', () => {
  const G = load();
  assert.deepEqual(G.NIGHTWALK.slice(3).map((c) => [c.n, c.boss, c.rules]), BOSS46.map((b, i) => [4 + i, b, { chains: true, destiny: true }]));
  G.makeState('solo', 9);
  const reg = { mode: G.S.destinyEffectMode, chase: G.S.destinyAiChase };
  for (const n of [4, 5, 6]) {
    for (let seed = 1; seed <= 50; seed++) {
      const S = chState(G, n, seed);
      assert.equal(S.chainsOff, false);
      assert.equal(S.destinyEffectMode, reg.mode);
      assert.equal(S.destinyAiChase, reg.chase);
      assert.equal(S.players.filter((p) => p.roleId === BOSS46[n - 4] && p.ai).length, 1, `第${n}章 seed ${seed}`);
    }
    for (const chain of Object.values(G.CHAINS)) assert.deepEqual(inject(G, chState(G, n, 9), chain).act, [chain.id], `第${n}章 ${chain.id} 應生效`);
    assert.deepEqual(destinyOn(G, chState(G, n, 9), 'eyes'), [true, true, true, true], `第${n}章 天命應生效`);
  }
});

test('#4(46) 第 4–6 章依序開放；選角恰排除該章主角', () => {
  const G = load();
  const open = (cleared) => G.NIGHTWALK.map((c) => G.nwChapterOpen(c.n, cleared, false));
  assert.deepEqual(open([1, 2, 3]), [true, true, true, true, false, false]);
  assert.deepEqual(open([1, 2, 3, 4]), [true, true, true, true, true, false]);
  assert.deepEqual(open([1, 2, 3, 4, 5]), [true, true, true, true, true, true]);
  assert.deepEqual(open([1, 2, 3, 4, 5, 6]), [true, true, true, true, true, true]);
  const all = Object.keys(G.ROLES).filter((k) => G.ROLES[k].pool);
  for (const n of [4, 5, 6]) assert.deepEqual(G.selectPool(n), all.filter((k) => k !== BOSS46[n - 4]));
  assert.equal(G.selectPool().length, 10);
});

test('#5(46) 第 4–6 章：過關判定比對各章主角；過關才存、未過不寫、依序累積', () => {
  const store = memStore();
  const G = load(store);
  for (const boss of BOSS46) {
    const st = (me, b) => ({ players: [{ id: 0, ai: null, roleId: 'hunter', ...me }, { id: 1, ai: {}, roleId: boss, ...b }, { id: 2, ai: {}, roleId: 'xiaonv', alive: true, life: 99 }, { id: 3, ai: {}, roleId: 'luzhu', alive: true, life: 98 }] });
    assert.equal(G.nightwalkPass(st({ alive: true, life: 20 }, { alive: true, life: 19 }), { boss }), true, `${boss} 壽命大 → 過`);
    assert.equal(G.nightwalkPass(st({ alive: true, life: 20 }, { alive: true, life: 20 }), { boss }), false, `${boss} 平手 → 未過`);
    assert.equal(G.nightwalkPass(st({ alive: false, life: 0 }, { alive: false, life: 0 }), { boss }), false, `${boss} 真人出局 → 未過`);
    assert.equal(G.nightwalkPass(st({ alive: true, life: 3 }, { alive: false, life: 0 }), { boss }), true, `${boss} 主角出局 → 過`);
  }
  const cleared = [];
  for (const n of [4, 5, 6]) {
    let S = chState(G, n, 40 + n); forcePass(G, S, false);
    const lose = G.nwRecord(S);
    assert.equal(lose.pass, false);
    assert.equal(lose.boss.roleId, BOSS46[n - 4]);
    assert.deepEqual(G.nwLoad().cleared, cleared, `第${n}章未過不寫`);
    S = chState(G, n, 50 + n); forcePass(G, S, true);
    const win = G.nwRecord(S);
    assert.equal(win.pass, true);
    assert.equal(win.ch.n, n);
    cleared.push(n);
    assert.equal(store.getItem(G.NW_KEY), JSON.stringify({ v: 1, cleared }), `第${n}章過關存檔`);
    G.nwRecord(S);
    assert.deepEqual(JSON.parse(store.getItem(G.NW_KEY)).cleared, cleared, `第${n}章重複通關不重複`);
  }
});

/* ---------- #6(46) 教學文字與引擎相符 ---------- */
const toHalf = (c) => String(c.charCodeAt(0) - 0xFF10);
const nightsOf = (text) => {
  const out = new Set();
  for (const m of text.matchAll(/第([0-9０-９、／和及]+)夜/g)) for (const d of m[1].matchAll(/[0-9０-９]+/g)) out.add(Number(d[0].replace(/[０-９]/g, toHalf)));
  return [...out].sort((a, b) => a - b);
};
function checkTeach(G, n, teach, label) {
  const all = teach.join('\n');
  const itemWith = (kw) => teach.filter((t) => t.includes(kw) && nightsOf(t).length);
  if (n === 4) {
    const names = Object.values(G.NIGHTRULES).map((r) => r.name);
    assert.equal(names.length, 3, `${label} 文案說三條規則夜，引擎有 ${names.length}`);
    for (const nm of names) assert.ok(all.includes(nm), `${label} 缺規則夜名稱「${nm}」`);
    const it = teach.filter((t) => nightsOf(t).length);
    assert.equal(it.length, 1, `${label} 應恰有一條提到夜數`);
    assert.deepEqual(nightsOf(it[0]), [...G.CFG.RULE_NIGHTS].sort((a, b) => a - b), `${label} 規則夜夜數 ≠ CFG.RULE_NIGHTS`);
    assert.equal(G.CFG.RULE_ON, true);
    assert.ok(all.includes('抽兩條') && G.CFG.RULE_NIGHTS.length === 2, `${label} 「抽兩條」要等於 RULE_NIGHTS 長度`);
    assert.ok(G.ROLES.lvshan.desc.includes('實付減半') && /只[付收]一半/.test(all), `${label} 法師買銷減半說法與角色說明不符`);
  } else if (n === 5) {
    assert.ok(all.includes('心願') && all.includes('盯上'), `${label} 要教心願與盯上`);
    assert.equal(G.CFG.MARK_ON, true); assert.equal(G.CFG.WISH_ON, true);
    assert.ok(G.ROLES.zutou.desc.includes('小額標'), `${label} 組頭小額標說法與角色說明不符`);
  } else if (n === 6) {
    const ev = itemWith('異事'), sh = itemWith('請神');
    assert.equal(ev.length, 1, `${label} 應恰有一條「異事＋夜數」`);
    assert.equal(sh.length, 1, `${label} 應恰有一條「請神＋夜數」`);
    assert.ok(!ev[0].includes('請神') && !sh[0].includes('異事'), `${label} 兩條夜數不得混在同一條`);
    assert.deepEqual(nightsOf(ev[0]), [...G.CFG.EVENT_NIGHTS].sort((a, b) => a - b), `${label} 異事夜數 ≠ CFG.EVENT_NIGHTS`);
    assert.deepEqual(nightsOf(sh[0]), [...G.CFG.SHRINE_NIGHTS].sort((a, b) => a - b), `${label} 請神夜數 ≠ CFG.SHRINE_NIGHTS`);
    assert.equal(G.CFG.EVENT_ON, true); assert.equal(G.CFG.LEGEND_ON, true);
    const evNames = Object.values(G.EVENTS).map((e) => e.name);
    const said = ['陰間放貸', '博杯'].filter((x) => all.includes(x));
    assert.ok(said.length >= 1, `${label} 至少舉一個異事名稱`);
    for (const x of said) assert.ok(evNames.includes(x), `${label} 異事「${x}」不存在於 EVENTS`);
    if (all.includes('八樁')) assert.equal(evNames.length, 8, `${label} 「八樁」≠ EVENTS 數量`);
    assert.ok(all.includes('壽命加8') ? G.ROLES.dangpu.desc.includes('壽命+8') : true, `${label} 當鋪上限說法與角色說明不符`);
  }
}

test('#6(46) 教學文字與引擎相符（夜數取自 CFG、名稱取自 NIGHTRULES／EVENTS；掛載版與 v1／v2 兩版皆驗）', () => {
  const G = load();
  for (const c of G.NIGHTWALK.slice(3)) checkTeach(G, c.n, c.teach, `掛載版第${c.n}章`);
  for (const ch of COPY2.chapters) for (const v of ['v1', 'v2']) checkTeach(G, ch.n, ch[v].teach, `copy-r2 第${ch.n}章 ${v}`);
  /* 活性：解析器抓得到夜數 */
  assert.deepEqual(nightsOf('第3、7夜與第５／８和11夜'), [3, 5, 7, 8, 11]);
});

/* ---------- #7(46) 文案檔與切換 ---------- */
const pickCopy = (c) => ({ n: c.n, title: c.title, boss: c.boss, intro: c.intro, teach: c.teach, feud: c.feud, scroll: c.scroll });
const flatCopy = (c) => [c.title, c.scroll.title, c.scroll.text, ...c.intro, ...c.teach, ...c.feud.open, ...c.feud.bossLose, ...c.feud.bossWin].join('');
function fmtCheck(c, k) {
  const s = cjkSentences(c.intro);
  assert.ok(s >= 3 && s <= 5, `${k} 引言 ${s} 句`);
  assert.ok(c.teach.length >= 2 && c.teach.length <= 4, `${k} 新規則 ${c.teach.length} 條`);
  for (const key of ['open', 'bossLose', 'bossWin']) assert.ok(Array.isArray(c.feud[key]) && c.feud[key].length >= 1 && c.feud[key].every((t) => typeof t === 'string' && t.trim()), `${k} feud.${key}`);
  assert.ok(typeof c.scroll.title === 'string' && c.scroll.title.trim(), `${k} 殘卷標題`);
  const L = charLen(c.scroll.text);
  assert.ok(L >= 150 && L <= 300, `${k} 殘卷 ${L} 字`);
  assert.deepEqual(simpHits(flatCopy(c)), [], `${k} 不得含簡體字`);
}

test('#7(46) copy-r2.json：標「待簽」、兩版同結構不同文字；掛載版逐字等於 selected 版', () => {
  const G = load();
  assert.equal(COPY2.status, '待簽');
  assert.ok(['v1', 'v2'].includes(COPY2.selected));
  assert.deepEqual(COPY2.chapters.map((c) => c.n), [4, 5, 6]);
  for (const ch of COPY2.chapters) {
    assert.deepEqual(ch.rules, { chains: true, destiny: true });
    assert.notDeepEqual(ch.v1.intro, ch.v2.intro, `第${ch.n}章兩版引言不得相同`);
    assert.notDeepEqual(ch.v1.scroll.text, ch.v2.scroll.text, `第${ch.n}章兩版殘卷不得相同`);
    assert.notDeepEqual(ch.v1.teach, ch.v2.teach, `第${ch.n}章兩版新規則不得相同`);
  }
  const want = COPY2.chapters.map((ch) => pickCopy({ n: ch.n, title: ch.title, boss: ch.boss, ...ch[COPY2.selected] }));
  assert.deepEqual(JSON.parse(JSON.stringify(G.NIGHTWALK.slice(3).map(pickCopy))), want);
  assert.deepEqual(G.NIGHTWALK.slice(3).map((c) => c.rules), COPY2.chapters.map((c) => c.rules));
});

test('#8(46) 兩版文案格式：引言 3–5 句、新規則 2–4 條、恩怨三時機、殘卷 150–300 字、無簡體字', () => {
  for (const ch of COPY2.chapters) for (const v of ['v1', 'v2']) fmtCheck({ title: ch.title, ...ch[v] }, `copy-r2 第${ch.n}章 ${v}`);
  /* 活性：格式檢查抓得到壞資料 */
  assert.throws(() => fmtCheck({ title: 'x', intro: ['一。'], teach: ['a', 'b'], feud: { open: ['a'], bossLose: ['a'], bossWin: ['a'] }, scroll: { title: 't', text: '短' } }, 'bad'));
});

test('#7(46) 切換工具：另一版套到副本後逐字等於該版、改動全在標記區間內；selected 版套用於原檔為冪等', async () => {
  const { apply } = await import('./tools/nw-copy-apply.mjs');
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.equal(apply(src, COPY2.selected, COPY2), src, '冪等：selected 版重套應零差異');
  const other = COPY2.selected === 'v1' ? 'v2' : 'v1';
  const sw = apply(src, other, COPY2);
  assert.notEqual(sw, src);
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const a = src.split(eol), b = sw.split(eol);
  const ia = a.findIndex((l) => l.includes('/*NW-COPY-4-6 BEGIN*/')), ea = a.findIndex((l) => l.includes('/*NW-COPY-4-6 END*/'));
  const ib = b.findIndex((l) => l.includes('/*NW-COPY-4-6 BEGIN*/')), eb = b.findIndex((l) => l.includes('/*NW-COPY-4-6 END*/'));
  assert.ok(ia > 0 && ea > ia && ib === ia && eb > ib);
  assert.deepEqual(b.slice(0, ib), a.slice(0, ia), '標記前不得有差異');
  assert.deepEqual(b.slice(eb + 1), a.slice(ea + 1), '標記後不得有差異');
  const H = loadGame(null, { sourceText: sw });
  const want = COPY2.chapters.map((ch) => pickCopy({ n: ch.n, title: ch.title, boss: ch.boss, ...ch[other] }));
  assert.deepEqual(JSON.parse(JSON.stringify(H.NIGHTWALK.slice(3).map(pickCopy))), want, `${other} 套用後要逐字等於 copy-r2.json`);
  for (const c of H.NIGHTWALK.slice(3)) { fmtCheck(c, `套用 ${other} 第${c.n}章`); checkTeach(H, c.n, c.teach, `套用 ${other} 第${c.n}章`); }
});

/* ---------- #9(46) 範圍守衛：不動引擎 ---------- */
test('#9(46) 相對基準：只動允許的檔案；index.html 只有 NW-COPY-4-6 標記內的純新增（基準＝env NW46_BASE，否則 merge-base HEAD origin/main）', { skip: process.env.NW_TARGET ? 'NW_TARGET 突變體模式不驗' : false }, () => {
  const sh = (c) => execSync(c, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  let BASE = (process.env.NW46_BASE || '').trim();
  if (!BASE) { try { BASE = sh('git merge-base HEAD origin/main').trim(); } catch (e) { BASE = ''; } }
  assert.ok(BASE, '範圍守衛未驗證：沒有 NW46_BASE，也算不出 merge-base HEAD origin/main（沒有 origin/main）——明確失敗，不靜默通過');
  try { sh(`git cat-file -t ${BASE}`).trim() === "commit" || assert.fail("not commit"); } catch (e) { assert.fail(`範圍守衛未驗證：基準 ${BASE} 不是有效提交`); }
  const files = new Set([...sh(`git diff --name-only ${BASE}`).split('\n'), ...sh('git ls-files --others --exclude-standard').split('\n')].map((s) => s.trim()).filter(Boolean));
  const allowed = [/^index\.html$/, /^tests\/nightwalk\.test\.mjs$/, /^tests\/tools\/(nw-|nightwalk46-)[\w-]*\.mjs$/, /^docs\//];
  for (const f of files) assert.ok(allowed.some((re) => re.test(f)), `不允許的改動檔案：${f}`);
  const lines = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').split('\n');
  const start = lines.findIndex((l) => l.startsWith('const NIGHTWALK=[')) + 1;
  const close = lines.findIndex((l, i) => i + 1 > start && l.replace(/\r$/, '') === '];') + 1;
  assert.ok(start > 0 && close > start);
  const mb = lines.findIndex((l) => l.includes('/*NW-COPY-4-6 BEGIN*/')) + 1, me = lines.findIndex((l) => l.includes('/*NW-COPY-4-6 END*/')) + 1;
  assert.ok(mb > start && me > mb && me < close, '標記區間要在 NIGHTWALK 內');
  const diff = sh(`git diff -U0 ${BASE} -- index.html`);
  const hunks = [...diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)];
  for (const h of hunks) {
    const oldN = h[2] === undefined ? 1 : Number(h[2]), c = Number(h[3]), d = h[4] === undefined ? 1 : Number(h[4]);
    assert.equal(oldN, 0, `index.html 不得刪改既有行（基準 ${BASE} 舊行 ${h[1]} 起 ${oldN} 行）`);
    assert.ok(c >= mb && c + d - 1 <= me, `hunk 新行 ${c}–${c + d - 1} 落在標記區間(${mb}–${me}) 之外`);
  }
  if (files.has('index.html')) assert.ok(hunks.length >= 1, '活性：有 hunk 才算驗到');
});
