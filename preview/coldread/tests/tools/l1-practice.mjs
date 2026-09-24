const CASES = {
  water: { title: '水陸偷渡', first: 'boat', second: 'buoy', guide: '袋中先有拼板舟；首夜標下水鬼浮標。另一件詛咒將由練習 AI 毒標給你，觀察連鎖如何銷毀轉入的詛咒。' },
  eyes: { title: '千眼神算', first: 'eye', second: 'bell', guide: '袋中先有祖靈之眼；首夜標下千里眼銅鈴。查看明夜三件預告，揭盅後再看上一夜已公開標額的第二高提示。' },
  tiger: { title: '雙虎滅煞', first: 'tiger', second: 'nail', guide: '袋中先有虎爺印；首夜標下虎姑婆指甲。夜戰可看金斑黑虎、橫掃與撕甲。' },
  eyesDestiny: { title: '冷讀測試局', first: 'eye', second: 'bell', destiny: 'eyes', guide: '冷讀主持用：玩家 1 的私密天命為千眼神算，袋中先有祖靈之眼；首夜標下千里眼銅鈴即覺醒。不要把本說明給受試者看。' },
};

const frame = document.querySelector('#game');
const panel = document.querySelector('#menu');
const status = document.querySelector('#status');
let sequence = 0;

function configurePractice(key) {
  const w = frame.contentWindow;
  const y = w.__yaoshi;
  const cfg = y.CFG;
  Object.assign(cfg, { MARK_ON: false, WISH_ON: false, EVENT_ON: false, RULE_ON: false, LEGEND_ON: false, ROUNDS: 3 });
  const recipe = CASES[key];
  // 天命情境：玩家 1 指定私密天命，其餘三席固定為其他鏈；其他情境維持原本的 makeState 呼叫。
  const state = recipe.destiny
    ? y.makeState('solo', 20260921, undefined, [recipe.destiny, 'water', 'twinTiger', 'bloodOath'], 'original')
    : y.makeState('solo', 20260921);
  state.practice = { kind: 'l1-chain-trial', case: key, preset: true };
  const originalReplay = w.replayExport;
  w.replayExport = function (run) {
    const record = originalReplay(run);
    if (run?.practice) record.practice = run.practice;
    return record;
  };
  y.replayExport = w.replayExport;
  const find = ab => y.POOL.find(item => item.ab === ab);
  if (!find(recipe.first) || !find(recipe.second)) throw new Error('找不到練習材料');
  state.players[0].bag.push({ ...find(recipe.first) });
  state.market[0] = { ...find(recipe.second) };
  state.market[1] = { ...y.POOL.find(item => item.ab !== recipe.first && item.ab !== recipe.second && item.unit) };
  state.market[2] = { ...y.POOL.find(item => item.ab !== recipe.first && item.ab !== recipe.second && item.unit && item.f === 'xianghuo') };
  if (key === 'water') state.market[3] = { ...y.CURSES.find(item => item.n === '白虎煞') };
  if (key === 'eyes' || key === 'eyesDestiny') {
    state.nextMarket[0] = { ...find('tiger') };
    state.nextMarket[1] = { ...find('boat') };
    state.nextMarket[2] = { ...find('nail') };
  }
  // 練習 AI 在固定拍品上出價，讓補件由玩家取得，並留下可讀的公開標額。
  for (const p of state.players.slice(1)) {
    const role = y.ROLES[p.roleId];
    const old = role.hooks || {};
    const extra = old.onAiExtraBids;
    const curse = old.onAiCurse;
    const plan = old.onAiPlan;
    role.hooks = {
      ...old,
      onAiPlan(ctx) {
        if (plan) plan(ctx);
        if (state.round === 1) ctx.skipAll = false;
      },
      onAiCurse(ctx) {
        if (curse) curse(ctx);
        if (state.round === 1 && key === 'water' && ctx.item === state.market[3]) {
          ctx.intent = p.id === 1 ? 'poison' : null;
          ctx.target = p.id === 1 ? 0 : null;
        }
      },
      onAiExtraBids(ctx) {
        if (extra) extra(ctx);
        if (state.round !== 1) return;
        ctx.bids[0] = null;
        if (key === 'water') {
          ctx.bids[3] = p.id === 1 ? { amt: 5, type: 'cons', intent: 'poison', target: 0 } : null;
        }
        if (p.id === 1 || p.id === 2) ctx.bids[2] = { amt: p.id === 1 ? 4 : 3, type: 'cons', intent: 'keep', target: null };
      },
    };
  }
  w.localStorage.setItem('yaoshi_intro_v1', '1');
  w.document.querySelector('#titleScr').style.display = 'none';
  w.document.querySelector('#table').classList.add('on');
  w.beginRound();
}

export function launch(key) {
  const ticket = ++sequence;
  const practice = CASES[key];
  status.textContent = practice ? `練習・${practice.title}` : '正常隨機局';
  document.querySelector('#guide').textContent = practice ? `${practice.guide} 建議在第 1 件拍品出價 3。` : '正常隨機局使用原始設定與隨機市集。';
  panel.hidden = true;
  status.hidden = true;
  document.querySelector('#openMenu').hidden = true;
  frame.onload = () => {
    if (ticket !== sequence) return;
    try {
      const w = frame.contentWindow;
      const originalHelp = w.openHelp;
      w.openHelp = function (...args) {
        originalHelp.apply(w, args);
        const entry = w.document.createElement('button');
        entry.type = 'button';
        entry.className = 'side';
        entry.textContent = '返回連攜試玩選單';
        entry.addEventListener('click', () => { w.closeModal(); panel.hidden = false; });
        const label = w.document.createElement('p');
        label.className = 'mut';
        label.textContent = practice ? `練習：${practice.title}（預置局，非平衡結果）` : '正常隨機局（原始設定）';
        w.document.querySelector('#modalbox').prepend(entry, label);
      };
      if (practice) configurePractice(key);
      else frame.contentWindow.__yaoshi.newGame('solo');
    } catch (error) {
      panel.hidden = false;
      status.hidden = false;
      status.textContent = `練習載入失敗：${error.message}`;
      console.error(error);
    }
  };
  frame.src = `../../index.html?l1trial=${encodeURIComponent(key)}&reload=${ticket}`;
}

for (const button of document.querySelectorAll('[data-case]')) {
  button.addEventListener('click', () => launch(button.dataset.case));
}
document.querySelector('#openMenu').addEventListener('click', () => { panel.hidden = false; });
document.querySelector('#closeMenu').addEventListener('click', () => { panel.hidden = true; });
