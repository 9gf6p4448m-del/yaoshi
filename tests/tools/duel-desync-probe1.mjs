/* 唯讀探針 1（不改程式，只在記憶體字串上還原單一處）：
   四處存活檢查（此處拆五筆：feed／atkAll／rallyHp／lost／swap）逐一還原成修前行為，
   對 seeds 1..20 跑 simulate()，跟「全修好」版比對非 trait 文字欄位，列出每處造成差異的夜數。
   跑法：node tests/tools/duel-desync-probe1.mjs [--new=index.html] [--n=20] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const argv = process.argv.slice(2);
const arg = (k, dflt) => { const a = argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : dflt; };
const NEW_HTML = path.resolve(arg('new', path.join(ROOT, 'index.html')));
const N = Number(arg('n', 20));

const html = fs.readFileSync(NEW_HTML, 'utf8');
const FIXED_CODE = html.match(/<script>[\s\S]*?<\/script>/)[0].replace('<script>', '').replace('</script>', '');

function loadFromCode(code) {
  const stub = `
  const location={search:''};
  const localStorage={getItem(){return null;},setItem(){}};
  const document={getElementById:()=>null,addEventListener:()=>{},querySelectorAll:()=>[],
    title:'',documentElement:{style:{}},body:{style:{},cssText:'',innerHTML:''}};
  const window={};
  `;
  return new Function('URLSearchParams', stub + code + '\nreturn window.__yaoshi;')(URLSearchParams);
}

const VARIANTS = {
  feed: {
    from: 'if(!f||foe.burned<=before||!pwHasAlive(sd)) return; /* 卷 E：飼鬼甕本尊死絕就沒有誰吃得到這頓 */',
    to: 'if(!f||foe.burned<=before) return;',
  },
  atkAll: {
    from: 'if(aa&&pwHasAlive(sd)){ m+=aa;   /* 媽祖令旗：本方全體 atk+1（卷 E：該側全滅就沒有誰吃得到這個 atk） */',
    to: 'if(aa){ m+=aa;   /* 媽祖令旗：本方全體 atk+1 */',
  },
  rallyHp: {
    from: '    if(!pwHasAlive(sd)) continue; /* 卷 E：該側全滅就不該再有「補位」這回事 */\r\n',
    to: '',
  },
  lost: {
    from: 'if(pwAny(sd,"lost")&&pwHasAlive(sd)){ /* 卷 E：作祟本尊死絕就不該還能對對面下迷途 */',
    to: 'if(pwAny(sd,"lost")){',
  },
  swap: {
    from: 'if(pwAny(sd,"swap")&&pwHasAlive(sd)){ /* 卷 E：抓交替的作祟本尊死絕就不該還能拖對面一隻下水 */',
    to: 'if(pwAny(sd,"swap")){',
  },
};

const FIXED = loadFromCode(FIXED_CODE);
const seeds = Array.from({ length: N }, (_, i) => i + 1);
const fixedTraces = seeds.map((s) => FIXED.simulate(s));

function nonExtraDiffNights(a, b) {
  let n = 0;
  const rows = [];
  a.nights.forEach((no, ni) => {
    const nn = b.nights[ni];
    if (!nn) { n++; rows.push(ni); return; }
    let diff = false;
    no.battles.forEach((bo, bi) => {
      const bn = nn.battles[bi];
      if (!bn) { diff = true; return; }
      for (const k of Object.keys(bo)) { if (k === 'extra') continue; if (JSON.stringify(bo[k]) !== JSON.stringify(bn[k])) diff = true; }
    });
    if (JSON.stringify(no.post) !== JSON.stringify(nn.post)) diff = true;
    if (JSON.stringify(no.deaths) !== JSON.stringify(nn.deaths)) diff = true;
    if (diff) { n++; rows.push(ni); }
  });
  return { n, rows };
}

console.log(`探針 1：seeds 1..${N}，逐一還原單一存活檢查後 vs 全修好版，simulate() 非 trait 欄位差異夜數\n`);
for (const key of Object.keys(VARIANTS)) {
  const v = VARIANTS[key];
  if (!FIXED_CODE.includes(v.from)) { console.log(`${key.padEnd(8)} 找不到比對字串，略過（請檢查 VARIANTS 定義）`); continue; }
  const variantCode = FIXED_CODE.replace(v.from, v.to);
  const VG = loadFromCode(variantCode);
  let totalDiffNights = 0;
  const perSeed = [];
  seeds.forEach((s, i) => {
    const vt = VG.simulate(s);
    const { n, rows } = nonExtraDiffNights(fixedTraces[i], vt);
    if (n) perSeed.push({ seed: s, nights: rows });
    totalDiffNights += n;
  });
  console.log(`${key.padEnd(8)} 差異夜數合計=${totalDiffNights}　命中的 seed：${perSeed.map((p) => `${p.seed}(夜${p.nights.join(',')})`).join('；') || '無'}`);
}
