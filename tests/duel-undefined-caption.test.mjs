/* 對決招式字幕「〈角色〉・法寶：undefined」回歸（2026-10-10，凍結檔 docs/experiments/2026-10-10-duel-undefined-caption/acceptance.md C1／C2）。
   走真實引擎 paperWar 產生的拍序列，字幕走 index.html 匯出的同一支組字 pwMoveCapText（對決播放也呼叫它），不另抄公式。 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadGame} from './tools/load.mjs';

const G=loadGame(new URL('../index.html',import.meta.url));
const item=ab=>JSON.parse(JSON.stringify(G.POOL.find(x=>x.ab===ab)));
const SEEDS=Array.from({length:20},(_,i)=>i+1);

test('C1 長明渡幽全隊回血：每筆招式都有 id，字幕不含 undefined 且點名長明渡幽',()=>{
  let regenAllLogs=0, regenAllBeats=0, traitBeats=0;
  for(const s of SEEDS){
    const A={id:0,name:'甲',bag:[item('fushou'),item('sigui')],alive:true};
    const B={id:1,name:'乙',bag:[item('fushou'),item('sigui')],alive:true};
    const r=G.paperWar(A,B,{rng:G.mulberry32(s),phase:G.phaseFor(1+(s%12)),windId:null});
    const fired=r.log.some(l=>l.includes('長明渡幽：'));
    if(fired) regenAllLogs++;
    /* 行為斷言 1（純引擎，先於組字）：引擎記下的每一筆招式拍都要能指認是哪一招 */
    for(const b of r.beats) if(b.kind==='trait')
      assert.ok(typeof b.trId==='string'&&b.trId.length>0,`seed ${s} 拍 ${b.beat} 側 ${b.side} 的招式拍沒有 trId`);
    for(const b of r.beats){
      if(b.kind!=='trait') continue;
      traitBeats++;
      const cap=G.pwMoveCapText(b.trId);
      const line=`${b.side==='B'?B.name:A.name}・${cap.item}：${cap.move} ${cap.desc}`;
      /* 行為斷言 2：字幕不得出現 undefined */
      assert.ok(!/undefined/.test(line),`seed ${s} 字幕含 undefined：${line}`);
      if(G.TRAITS[b.trId]||/^true|^bloodSacrifice$/.test(b.trId)) continue;
      /* 不屬於任何一件法寶的招＝連鎖本身觸發；在這組袋子裡只可能是長明渡幽的全隊回血 */
      regenAllBeats++;
      assert.ok(/長明渡幽|全隊回血/.test(cap.item+cap.move),`長明渡幽那筆字幕沒點名：${line}`);
    }
  }
  /* 活性：fixture 真的觸發了長明渡幽（否則上面的斷言全是空轉） */
  assert.ok(regenAllLogs>0,'20 個 seed 都沒觸發長明渡幽，fixture 失效');
  assert.ok(traitBeats>0,'沒有任何招式拍');
  assert.ok(regenAllBeats>0,'沒有任何一筆長明渡幽招式拍被指認出來');
});

test('C2 水陸偷渡怒濤破浪：濺射前那筆招式是濺射減半本身，不是被濺射隊自己的招',()=>{
  const elites=['bow','sword','tiger','thunder'];
  let splashes=0, chainMarks=0;
  for(const s of SEEDS){
    const A={id:0,name:'甲',bag:[item(elites[s%4]),item(elites[(s+1)%4])],alive:true};
    const B={id:1,name:'乙',bag:[item('boat'),item('buoy')],alive:true};
    const r=G.paperWar(A,B,{rng:G.mulberry32(s),phase:G.phaseFor(1+(s%12)),windId:null});
    r.beats.forEach((b,i)=>{
      if(!(b.kind==='splash'&&b.side==='A')) return;
      splashes++;
      const prev=r.beats[i-1];
      assert.ok(prev&&prev.kind==='trait'&&prev.side==='B',`seed ${s} 濺射前沒有乙方的濺射減半標示：${JSON.stringify(prev)}`);
      const own=G.TRAITS[prev.trId];
      const ok=prev.trId==='chainHalfSplash'||(own&&own.halfSplash===true);
      assert.ok(ok,`seed ${s} 濺射減半被報成 ${prev.trId}（${own?own.name:'無名'}）`);
      if(prev.trId==='chainHalfSplash'){
        chainMarks++;
        const cap=G.pwMoveCapText(prev.trId);
        assert.ok(/怒濤破浪/.test(cap.move)&&!/undefined/.test(cap.item+cap.move+cap.desc),`怒濤破浪字幕不對：${JSON.stringify(cap)}`);
      }
    });
  }
  assert.ok(splashes>0,'沒有任何濺射事件，fixture 失效');
  assert.ok(chainMarks>0,'沒有任何一筆以連鎖 id 標示的怒濤破浪');
});
