/* 對決字幕修復的附帶缺陷 F1／F3／F4 回歸（2026-10-10，凍結檔 docs/experiments/2026-10-10-duel-side-findings/acceptance.md D1／D4／D5）。
   走真實引擎 paperWar 與 index.html 匯出的同一支組字 pwMoveCapText（對決播放也呼叫它）。 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadGame} from './tools/load.mjs';

const IDX=new URL('../index.html',import.meta.url);

test('F1 血祭過陰：字幕的真命標記與說明血量，跟引擎實際扣的血一致',()=>{
  /* 夾具同 l1-destiny-night「true blood oath…」：off＝沒覺醒真命（每次 1 血）、original＝首次 2 血其後 1 血 */
  const run=mode=>{
    const g=loadGame(IDX);
    g.makeState('solo',345,['qingmian'],['bloodOath','water','eyes','godKing'],mode);
    g.S.players[0].destinyAwakened=true;
    const [a,b]=g.S.players;
    a.bag=['xianji','xianji','guoyin'].map(ab=>({...g.POOL.find(x=>x.ab===ab)}));
    b.bag=[{n:'硬兵',f:'zuling',p:1,unit:{body:'elite',count:1,atk:1,hp:50,trait:null}}];
    return {g,r:g.paperWar(a,b,{rng:()=>.5,phase:null,windId:null})};
  };
  const seen={off:[],original:[]};
  for(const mode of ['off','original']){
    const {g,r}=run(mode);
    r.beats.forEach((e,i)=>{
      if(e.kind!=='bloodSacrifice') return;
      const n=e.amount, tb=r.beats[i+1];
      assert.ok(tb&&tb.kind==='trait'&&tb.side===e.side,`${mode} 血祭事件後沒有招式拍：${JSON.stringify(tb)}`);
      const cap=g.pwMoveCapText(tb.trId);
      const line=`${cap.item}：${cap.move}｜${cap.desc}`;
      seen[mode].push(n);
      /* 行為斷言：說明寫的血量＝實際扣的血；「真・」只在真命那一下（扣 2）出現 */
      assert.ok(cap.desc.includes(`${n} 血`),`${mode} 實扣 ${n} 血，字幕卻是「${line}」`);
      assert.equal(cap.item.startsWith('真・'),n===2,`${mode} 實扣 ${n} 血，字幕真命標記不符：「${line}」`);
      assert.ok(/血祭/.test(cap.item+cap.move)&&!/undefined/.test(line),`${mode} 字幕沒點名血祭或含 undefined：「${line}」`);
    });
  }
  /* 活性：兩種模式都真的觸發了血祭，original 兩種血量都出現 */
  assert.ok(seen.off.includes(1),`off 沒有 1 血的血祭：${seen.off}`);
  assert.ok(seen.original.includes(2)&&seen.original.includes(1),`original 沒同時出現 2 血與 1 血：${seen.original}`);
});

test('F3 怒濤破浪：同一場 log 不印兩行一模一樣的「濺射減半」，兩種招式拍仍各自記錄',()=>{
  const G=loadGame(IDX);
  const item=ab=>JSON.parse(JSON.stringify(G.POOL.find(x=>x.ab===ab)));
  const elites=['bow','sword','tiger','thunder'];
  let both=0, lines=0;
  for(let s=1;s<=20;s++){
    const A={id:0,name:'甲',bag:[item(elites[s%4]),item(elites[(s+1)%4])],alive:true};
    const B={id:1,name:'乙',bag:[item('boat'),item('buoy')],alive:true};
    const r=G.paperWar(A,B,{rng:G.mulberry32(s),phase:G.phaseFor(1+(s%12)),windId:null});
    const hs=r.log.filter(l=>l.includes('怒濤破浪'));
    lines+=hs.length;
    const ids=new Set(r.beats.filter(b=>b.kind==='trait'&&b.side==='B').map(b=>b.trId));
    if(ids.has('swarmHalfSplash')&&ids.has('chainHalfSplash')) both++;
    /* 行為斷言：同一行文字不重複 */
    assert.equal(new Set(hs).size,hs.length,`seed ${s} 怒濤破浪重複：${JSON.stringify(hs)}`);
  }
  /* 活性：夾具確實同時觸發飛魚躍與連鎖怒濤破浪（重複的成因），且有 log 可驗 */
  assert.ok(both>0,'沒有任何一場同時觸發飛魚躍與連鎖怒濤破浪，夾具失效');
  assert.ok(lines>0,'沒有任何怒濤破浪 log');
  /* 去重只吞「一模一樣」的行：兩隊都帶水陸偷渡＋精英時，兩隊名的濺射減半仍各自印得出來（不是整場只印一行） */
  let bothNames=0;
  for(let s=1;s<=20;s++){
    const A={id:0,name:'甲',bag:[item('boat'),item('buoy'),item('sword')],alive:true};
    const B={id:1,name:'乙',bag:[item('boat'),item('buoy'),item('bow')],alive:true};
    const r=G.paperWar(A,B,{rng:G.mulberry32(s),phase:G.phaseFor(1+(s%12)),windId:null});
    const hs=r.log.filter(l=>l.includes('怒濤破浪'));
    assert.equal(new Set(hs).size,hs.length,`雙水 seed ${s} 怒濤破浪重複：${JSON.stringify(hs)}`);
    if(hs.some(l=>l.includes('：甲 '))&&hs.some(l=>l.includes('：乙 '))) bothNames++;
  }
  assert.ok(bothNames>0,'雙水夾具 20 場都沒有兩隊名各一行，去重吞掉了不同隊的合法行');
});

test('F4 未註冊的招式 id：字幕兜底為「法寶：招式」，不把 id 本身或 undefined 印上去',()=>{
  const G=loadGame(IDX);
  for(const id of ['__未註冊__',undefined]){
    const cap=G.pwMoveCapText(id);
    assert.equal(cap.move,'招式',`id=${String(id)} 的招名兜底應為「招式」：${JSON.stringify(cap)}`);
    assert.equal(cap.item,'法寶',`id=${String(id)} 的法寶名兜底應為「法寶」：${JSON.stringify(cap)}`);
    for(const k of ['item','move','desc'])
      assert.ok(typeof cap[k]==='string'&&!/undefined/.test(cap[k]),`id=${String(id)} 的 ${k} 含 undefined：${JSON.stringify(cap)}`);
  }
});
