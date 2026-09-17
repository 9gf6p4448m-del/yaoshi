// 燈可行性閘（2026-09-18）：只動燈。從 before/ 備份重建，確保可重跑。
import fs from 'node:fs';
const SRC='docs/experiments/2026-09-18-lamp-gate/before/fushou.json';
const DST='assets/creatures/fushou.json';
const o=JSON.parse(fs.readFileSync(SRC,'utf8'));
const PLUG=+(process.env.PLUG||0.25), FLOOR=+(process.env.FLOOR||0.178), POOL=+(process.env.POOL||0.118), FS=+(process.env.FS||0.95);

// ── 1. palette：拆掉與龜身撞色的三顆 ───────────────────────────────
o.palette.lamp_bowl={color:'#3d271c',rough:0.88};   // 煤黑上漆碗身：外深
o.palette.lamp_lip ={color:'#f0cd80',rough:0.3};    // 亮黃銅碗沿＋碗內底：內亮
o.palette.glow_lamp={color:'#e07d12',rough:0.3};    // 火：同亮度、更純橘

// ── 1b. brim volume：碗沿外翻加寬成一圈亮黃銅法蘭（ref-fushou ④「碗口外翻、口徑遠大於碗深」）
//      根環 0.29 對齊封板外緣，讓封板（暗）夾在碗沿（亮）與碗內底（亮）之間＝碗口亮／內壁暗／碗底亮
const cup=o.volumes.find(v=>v.chain==='cup');
// 碗身後半維持方斷面（與油壺身同語彙），碗口三環改成圓的：exp 5 的圓角方斷面在特寫裡讀成托盤／匾額
const CEXP=[3.4,3.0,2.6];
cup.profile.slice(-3).forEach((r,i)=>{ r[3]={...r[3],exp:CEXP[i]}; });
const brim=o.volumes.find(v=>v.chain==='brim');
const BR=+(process.env.BRIM||0.325);
brim.profile=[[0,0.26,0.212,{exp:2.8}],
              [0.5,+((0.26+BR)/2).toFixed(4),+((0.26+BR)/2*0.815).toFixed(4),{exp:2.6}],
              [1,BR,+(BR*0.815).toFixed(4),{exp:2.4}]];

// ── 2. parts ──────────────────────────────────────────────────────
const P=o.parts;
const iOil=P.findIndex(p=>p._c && p._c.startsWith('burning oil surface'));
const iWick=P.findIndex(p=>p._c==='wick nub');
const iFlame=P.findIndex(p=>p._c==='flame teardrop A');
const nFlame=P.filter(p=>p.host==='FlmR').length;

// 碗口斷面＝superellipse(exp 5)，與 cup volume 最後一環同式（engine/core/section.js:10）
const sect=(ru,rv,exp,n=14)=>Array.from({length:n},(_,i)=>{const a=2*Math.PI*i/n,e=2/exp;
  return [ +(Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),e)*ru).toFixed(5),
           +(Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),e)*rv).toFixed(5) ];});
const teardrop=(h,w)=>{const ys=[-0.08,0.12,0.36,0.74,1.0].map(y=>+(y*h).toFixed(5));
  const xs=[0,0.66,1.0,0.52,0].map(x=>+(x*w).toFixed(5));
  const pts=[[0,ys[0]]];
  for(let k=1;k<=3;k++) pts.push([xs[k],ys[k]]);
  pts.push([0,ys[4]]);
  for(let k=3;k>=1;k--) pts.push([-xs[k],ys[k]]);
  return pts;};
const dirU=(deg)=>{const r=deg*Math.PI/180; return [+Math.cos(r).toFixed(3),0,+Math.sin(r).toFixed(3)];};
const AX=[0,0.8,0.6];                       // cup 末段軸向（Cp2→Cp3 正規化）
const along=d=>[0,+(AX[1]*d).toFixed(5),+(AX[2]*d).toFixed(5)];
const UD=[1,0,0], VD=[0,-0.6,0.8];          // 碗口平面的 (U,W)：U＝世界 +X（frame:"up"）

// 2a. 碗口封板（暗碗身）：碗口 caps 是 "none"、GLB 只有 membrane 才 doubleSided，
//     所以整個碗在單面渲染下是一個洞。用一片與碗口同斷面的板把它補起來。
const plug={type:'fin',_c:'lamp bowl inner floor, shadowed (seals the open mouth)',host:'Cp3',material:'socket',
  thickness:0.016,smooth_angle:26,offset:[0,0,0],udir:UD,vdir:VD,points:sect(PLUG,PLUG*0.816,2.6)};
// 2b. 黃銅碗內底：材質沿用 lamp_lip（＝不新增材質、不新增 draw call）
const floor={type:'fin',_c:'lamp inner floor (brass)',host:'Cp3',material:'lamp_lip',
  thickness:0.012,smooth_angle:26,offset:along(0.012),udir:UD,vdir:VD,points:sect(FLOOR,FLOOR*0.816,2.4)};
// 2c. 油面：縮小成碗心一池、改成跟碗口同離心率的斷面
const oil=P[iOil];
oil.points=sect(POOL,POOL*0.816,2.2);
oil.offset=along(0.022);
oil.thickness=0.010;
// 2d. 燈芯：加粗，當油面與火之間的暗隔
const wick=P[iWick];
wick.offset=along(0.030);
wick.segments=[{len:0.034,r:0.019},{len:0.02,r:0.01,taper:true}];
// 2e. 火苗：3 片 → 5 片不等高不同傾角 ＋ 3 條長短不一的細舌（_traps_batch10 ⑥）
const flames=[
  {_c:'flame teardrop A',h:0.300,w:0.088,u:dirU(0),  t:0.020,off:[0,0.030,0]},
  {_c:'flame teardrop B',h:0.268,w:0.080,u:dirU(90), t:0.020,off:[0,0.030,0]},
  {_c:'flame teardrop C',h:0.232,w:0.072,u:dirU(45), t:0.018,off:[0,0.026,0]},
  {_c:'flame teardrop D',h:0.190,w:0.062,u:dirU(135),t:0.016,off:[0.014,0.024,0.010]},
  {_c:'flame teardrop E',h:0.156,w:0.052,u:dirU(22), t:0.015,off:[-0.016,0.022,-0.008]},
].map(f=>({type:'fin',_c:f._c,host:'FlmR',material:'glow_lamp',thickness:f.t,smooth_angle:26,
  offset:f.off,udir:f.u,vdir:[0,1,0],points:teardrop(f.h*FS,f.w*FS)}));
const tongues=[
  {_c:'flame tongue 1',off:[0,0.024,0],           dir:[0,1,0.05],    segs:[{len:0.098,r:0.017},{len:0.072,r:0.009},{len:0.062,r:0.004,taper:true}]},
  {_c:'flame tongue 2',off:[0.030,0.030,0.012],   dir:[0.14,1,0.04], segs:[{len:0.062,r:0.010},{len:0.05,r:0.004,taper:true}]},
  {_c:'flame tongue 3',off:[-0.026,0.028,-0.014], dir:[-0.12,1,-0.05],segs:[{len:0.044,r:0.008},{len:0.036,r:0.003,taper:true}]},
].map(t=>({type:'curve',_c:t._c,host:'FlmR',material:'glow_lamp',offset:t.off,sides:6,dir:t.dir,
  segments:t.segs,smooth_angle:26}));

for(const f of [plug,...(FLOOR>0?[floor]:[]),oil,...flames]){const p=f.points;
  for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],c=p[(i+2)%p.length];
    const cr=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
    if(!(cr>1e-9)) throw new Error(`${f._c} 不是嚴格凸：i=${i} cross=${cr}`);}}

P.splice(iFlame,nFlame,...flames,...tongues);
P.splice(iOil,1,...(FLOOR>0?[plug,floor]:[plug]),oil);

o._glow_materials=o._glow_materials+
 '\n\n【燈可行性閘 2026-09-18 實測】① 碗口 caps 第二格是 "none"，而 GLB 只有 membrane 會 doubleSided（engine/core/compile.js:427），'+
 '所以碗的內壁在單面渲染下整片被背面剔除：judge 的 ID pass 是 DoubleSide，量到的 lamp_bowl front 8.62% 裡有 83%（lamp_lip 61%）在 beauty／遊戲裡根本沒畫，'+
 '讀者看到的是穿過碗看見的背景、牌桌紅布與描邊外殼的內面——「碗」不是太小或太暗，是不存在。補法是一片與碗口同 superellipse 斷面的封板（fin，不是 cap：cap 用 ngon／fan 都會在 bind pose 產生 20 個翻面三角形）。'+
 '② lamp_bowl 原 #d9d2c4 與 shell_rim 逐字元相同、lamp_lip 原 #d8b45c 與 gold_trim 逐字元相同：碗與香灰白裙邊融成一塊、碗沿與十三片甲片鑲邊同一種金。改成煤黑碗身＋亮黃銅碗沿／碗內底（外深內亮）。'+
 '③ 自發光只存在於遊戲端（js/creature-figures.js:51 的 /^glow_/ ＋ emissive×COLOR_0），anyCreature 的 GLB 沒有 emissiveFactor，hero／judge 這兩種離線圖一律沒有自發光——特寫圖的亮度只能靠 albedo（黃銅碗內底），不能靠發光。';

fs.writeFileSync(DST,JSON.stringify(o,null,1));
console.log('parts',P.length,'flame parts',P.filter(p=>p.host==='FlmR').length);
