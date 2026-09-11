// 妖市 — 卷 C3 招式編舞・陰氣系（9 套，2026-09-05）
// 舞台 API 與規則見 zuling.js 檔頭；骨骼名見 docs/experiments/2026-09-05-traitfx-bones.md。
import * as THREE from 'three';

const _a = new THREE.Vector3();

const MOVES = {
  /* 有應公・有求必應（youyinggong，作祟×2；傳說三尊美術卷 2026-09-07）：第 3 拍作祟時，
     對面每有一件詛咒品就多燒一隻。
     編舞（陰氣＝attack 前先有一拍靜止、拍子卡頓）：0–200ms 完全不動，只有邊光慢慢亮起來
          → 200ms 龕口整個往前壓、從龕口噴出數股祟，逐一落到對面每一隻身上（錯開拍子）
          → 霧裾慢半拍才追上 → 720ms 起回 0。 */
  hauntAnswer(st) {
    const shrines = st.byBody(st.actor, 'haunt');
    const lead = shrines[0] || st.actor[0];
    st.tween({ ms: 200, ease: 'inout', update(t, e) { st.rim(lead, 1 + 0.9 * e); } });
    st.at(200, () => {
      const mouth = st.worldOf(lead, 'Chest', new THREE.Vector3());
      st.tween({ ms: 340, ease: 'snap', update(t, e) {
        st.move(lead, 0, 0, 0.22 * Math.sin(Math.PI * e));
        st.rot(lead, 'Spine', -0.12 * e); st.rot(lead, 'Chest', -0.20 * e); st.rot(lead, 'Top', -0.16 * e);
        st.scaleBone(lead, 'Chest', 1 + 0.10 * Math.sin(Math.PI * e));
      } });
      st.at(120, () => st.tween({ ms: 380, ease: 'out', update(t, e) {
        st.rot(lead, 'MistRoot', 0.16 * Math.sin(Math.PI * e));
        st.rot(lead, 'Mist1', -0.20 * Math.sin(Math.PI * e));
        st.rot(lead, 'Mist2', 0.22 * Math.sin(Math.PI * e));
      } }));
      (st.target || []).forEach((f, i) => st.at(60 * i, () => {
        const to = st.worldOf(f, null, new THREE.Vector3());
        const wisp = st.orb(mouth.clone(), 0.055, { opacity: 0.95 });
        st.fly(wisp, mouth.clone(), to, { ms: 220, ease: 'out', arc: 0.22, done() {
          st.burst(to, { power: 0.7, n: 40 });
          st.fade(wisp, { ms: 140, to: 0 });
          const d = st.disc(st.foot(f, new THREE.Vector3()), 0.34, { opacity: 0.5 });
          d.scale.setScalar(0.3); st.grow(d, { ms: 240, from: 0.3, to: 1.1 });
          st.fade(d, { ms: 260, delay: 120, from: 0.5, to: 0 });
          st.flinch([f], { strength: 0.9, burst: false });
        } });
      }));
      st.punch(0.3);
    });
    st.at(720, () => st.tween({ ms: 180, ease: 'inout', update(t, e) {
      const k = 1 - e;
      st.rot(lead, 'Spine', -0.12 * k); st.rot(lead, 'Chest', -0.20 * k); st.rot(lead, 'Top', -0.16 * k);
      st.scaleBone(lead, 'Chest', 1);
      st.rot(lead, 'MistRoot', 0); st.rot(lead, 'Mist1', 0); st.rot(lead, 'Mist2', 0);
      st.rim(lead, 1 + 0.9 * k);
    } }));
    /* ★Tier 3 餘韻（R1 覆審 M1）★：原本只排到 1013ms，tier 3 有 1400ms。
       只在 tier 3 追加新節拍（tier 2 行為逐項不變）：祟氣散盡之前，對面每一隻腳下浮一圈暗環、
       龕口的光緩緩闔上（陰氣＝拍子卡頓、慢半拍）。 */
    if (st.tier === 3) {
      st.target.slice(0, 4).forEach((f, i) => {
        const r = st.ring(st.foot(f, new THREE.Vector3()), 0.26, 0.035, { opacity: 0, color: 0x2f1f47 });
        st.grow(r, { ms: 270, delay: 940 + i * 28, from: 0.35, to: 1.6 });
        st.fade(r, { ms: 270, delay: 940 + i * 28, from: 0.7, to: 0 });
      });
      st.tween({ ms: 300, delay: 960, ease: 'pulse', update(t, e) { st.rim(lead, 1 + 1.2 * e); } });
      st.tween({ ms: 260, delay: 1010, ease: 'inout', update(t, e) { st.scaleBone(lead, 'Top', 1 - 0.08 * e); } });
    }
  },

  /* 林投姐髮簪・偷命（hairpin，作祟×4）：三拍結束時敗方另 −1 壽命。
     編舞：髮瀑揚起（0–420ms，四尊錯開 60ms：HairA–E 向上外翻、面紗掀、仰頭、雙手前探，整尊上浮）
          → 偷命（240ms 起：對面每一隻胸口牽一條抖動的陰綢到最近的鬼，一顆命火順著綢子被吸到鬼的頭上，
             到手那一刻鬼的邊光暴亮；對面逐隻輕退縮）→ 收（560ms 起：髮落、鬼沉回、邊光回穩）。 */
  hauntSteal(st) {
    const ghosts = st.actor;
    const foes = st.target;
    const hair = ['HairA', 'HairB', 'HairC', 'HairD', 'HairE'];
    const pose = (g, k) => {
      hair.forEach((h, i) => st.rot(g, h, -0.9 * k * (0.6 + 0.1 * i), 0, (i % 2 ? 1 : -1) * 0.35 * k));
      st.rot(g, 'VeilTip', -0.5 * k); st.rot(g, 'HeadRoot', 0.18 * k);
      st.rot(g, 'RArmRoot1Rt', -0.7 * k, 0, -0.4 * k); st.rot(g, 'LArmRoot1Rt', -0.7 * k, 0, 0.4 * k);
      st.move(g, 0, 0.14 * k, 0);
    };
    ghosts.forEach((g, i) => {
      st.tween({ ms: 420, delay: i * 60, ease: 'out', update(t, e) { pose(g, e); st.rim(g, 1 + 0.4 * e); } });
    });
    const thief = (p) => { let best = ghosts[0], bd = Infinity; ghosts.forEach((g) => { const d = st.worldOf(g, 'HeadRoot', _a).distanceTo(p); if (d < bd) { bd = d; best = g; } }); return best; };
    st.at(240, () => {
      foes.forEach((f, i) => {
        const from = st.worldOf(f, null, new THREE.Vector3());
        const g = thief(from);
        const to = st.worldOf(g, 'HeadRoot', new THREE.Vector3());
        const silk = st.bolt(from, to, { jag: 0.05, segs: 12, opacity: 0, seed: 100 + i });
        st.tween({ ms: 380, delay: i * 40, ease: 'linear', update(t) { silk.material.opacity = 0.75 * Math.sin(Math.PI * t); } });
        const ember = st.orb(from, 0.045, { opacity: 0.95 });
        st.fly(ember, from, to, { ms: 360, delay: 40 + i * 40, ease: 'inout', arc: 0.18, done() {
          st.burst(to, { power: 0.4, n: 22 }); ember.material.opacity = 0; st.rim(g, 2.2);
        } });
      });
      st.flinch(foes, { stagger: 40, strength: 0.7, burst: false });
    });
    ghosts.forEach((g, i) => st.at(560 + i * 40, () => st.tween({ ms: 320, ease: 'inout', update(t, e) { const k = 1 - e; pose(g, k); st.rim(g, 1 + 1.2 * k); } })));
  },

  /* 魔神仔紅帽・迷途（redhat，作祟×4）：三拍對面 1 隊不出手（對精英無效）。
     ★v0.55 招式可辨性卷 批 0 示範招（陰氣）★
     盲讀 r1 的病因（計畫 §6 第 26 列）：**A 短版「認不出」、B 短版「中間看不到任何飛行物」**；
       A 完整版猜成水鬼浮標 ⇒ 失敗類型 E（因果斷裂：沒有飛行物，只有原地繞圈的 0.052 小球）＋C（對比不足）。
     改法（ART_BIBLE §10）：
       ① windup：帽尖後仰蓄勢的同時，領頭那尊頭上浮出一頂**紅帽徽記**
          （陰氣授權的「那一點刺眼的紅」hot 色＋ink 底板，這是本卷唯一准用刺眼紅的位置）；
       ② travel：紅帽**真的飛過去**扣在被迷那隻頭上（原本完全沒有飛行物，這一段就是 E 的修法）；
       ③ react：被迷的原地打轉**並踉蹌位移**（只有 spin 不算反應，因果門檻量的是 move／scale），
          地面留下一串**不規則的暗斑腳印**（陰氣的腳下語彙；原本那圈 ring 與過陰咒的兩圈暗環直接撞，整組退役）。
     ★tier 1／2／3 共用這一支★（時間軸由 st.beat 換算）。 */
  hauntLost(st) {
    const B = st.beat, C = st.colors, LAST = st.ms * 0.88;
    const ghosts = st.byBody(st.actor, 'haunt').length ? st.byBody(st.actor, 'haunt') : st.actor;
    const lost = (st.byBody(st.target, 'swarm').length ? st.byBody(st.target, 'swarm') : st.target).slice(0, 2);
    const W = B.windup[1], T0 = B.travel[0], TL = B.travel[1] - B.travel[0], R0 = B.react[0], RL = LAST - B.react[0];
    const fwd = ghosts.map((g) => st.toward(g, new THREE.Vector3()));
    // k<0：帽尖後仰蓄勢；k>0：帽尖往前一點
    const point = (g, k) => {
      const open = Math.max(0, k);
      st.rot(g, 'HatRoot', 0.44 * k, 0.26 * k, 0);
      st.rot(g, 'Hat1', 0.36 * k, 0.32 * k, 0);
      st.rot(g, 'HatTip', 0.48 * k, 0.42 * k, 0);
      st.rot(g, 'NeckB', 0.12 * k); st.rot(g, 'Neck2', 0.14 * k);
      st.rot(g, 'HeadRoot', 0.24 * k, 0.20 * k, 0); st.rot(g, 'Skull', 0.12 * k);
      st.rot(g, 'JawRoot', 0.30 * open); st.rot(g, 'Jaw1', 0.26 * open); st.rot(g, 'JawTip', 0.22 * open);
      st.rot(g, 'MistRoot', -0.18 * k, 0.30 * k, 0);
      st.rot(g, 'Mist1', -0.22 * k, 0.36 * k, 0);
      st.rot(g, 'Mist2', -0.24 * k, 0.40 * k, 0);
      st.rot(g, 'MistTip', -0.28 * k, 0.46 * k, 0);
      st.rot(g, 'RArmRoot1Rt', -0.55 * k, 0, -0.28 * k); st.rot(g, 'RElbow1El', -0.42 * k); st.rot(g, 'RWrist1Wr', -0.26 * k);
      st.rot(g, 'LArmRoot1Rt', -0.28 * k, 0, 0.20 * k); st.rot(g, 'LElbow1El', -0.20 * k);
    };
    // 飛出去的紅帽：一隻被迷的獵物配一頂（上限 2 頂，draw call 預算）
    const flying = lost.map((f, i) => {
      const g = ghosts[Math.min(i, ghosts.length - 1)];
      const from = st.top(g, new THREE.Vector3()); from.y += 0.14;
      const to = st.top(f, new THREE.Vector3()); to.y += 0.13;
      return { f, from, to, mesh: st.icon(st.kind, from, { color: C.hot, inkColor: C.ink, opacity: 0 }) };
    });
    // 地面錯亂腳印：同一個 kind 壓平貼桌、近黑不規則（陰氣的「不規則暗斑」，InstancedMesh = 1 個 draw call）
    const prints = [];
    const rolls = [];
    lost.forEach((f) => {
      const seat = st.foot(f, new THREE.Vector3());
      for (let j = 0; j < 3; j++) {
        const a = st.rnd() * Math.PI * 2, r = 0.14 + 0.22 * st.rnd();
        prints.push(new THREE.Vector3(seat.x + Math.cos(a) * r, st.tableY + 0.004, seat.z + Math.sin(a) * r));
        rolls.push(st.rnd() * Math.PI * 2);
      }
    });
    const stain = prints.length ? st.icons(st.kind, prints, { flat: true, rolls, size: st.iconFlatSize, color: C.ink, opacity: 0 }) : null;

    st.phase('windup');
    /* ① 帽尖後仰蓄勢（windup）：陰氣＝出招前一拍完全靜止、拍子卡頓，四尊錯開 */
    ghosts.forEach((g, i) => {
      st.tween({ ms: W * 0.9, delay: i * W * 0.06, ease: 'out', update(t, e) { point(g, -0.62 * e); st.rim(g, 1 + 0.5 * e); } });
      st.tween({ ms: TL * 0.5, delay: T0 + i * W * 0.06, ease: 'strike', update(t, e) { // 往前猛地一點
        const k = -0.62 + 1.58 * e;
        point(g, k); st.move(g, fwd[i].x * 0.11 * Math.max(0, k), 0, fwd[i].z * 0.11 * Math.max(0, k));
        st.rim(g, 1.5 + 0.9 * e);
      } });
      // 收勢的錯開要從 ms 裡扣回來，否則最後一尊的 horizon 會超出 LAST（tier 1 下 rate 立刻 >1）
      st.tween({ ms: LAST - R0 - i * W * 0.03, delay: R0 + i * W * 0.03, ease: 'inout', update(t, e) { // 帽落回
        const k = 0.96 * (1 - e);
        point(g, k); st.move(g, fwd[i].x * 0.11 * k, 0, fwd[i].z * 0.11 * k); st.rim(g, 1 + 1.4 * (1 - e));
      } });
    });
    // 帽徽記在蓄勢末才浮現（陰氣不補間：一格到位）
    flying.forEach((F, i) => st.tween({ ms: W * 0.28, delay: W * 0.62 + i * W * 0.05, ease: 'out', update(t, e) {
      st.alpha(F.mesh, e); F.mesh.scale.setScalar(st.iconSize * (0.55 + 0.45 * e));
    }, done() { if (i === 0) st.phase('travel'); } }));
    /* ② 紅帽飛過去扣在頭上（travel）——原本這一段完全沒有飛行物 */
    flying.forEach((F, i) => st.trail(F.mesh, F.from, F.to, {
      ms: TL * 0.68, delay: T0 + TL * 0.22 + i * TL * 0.1, ease: 'in', arc: 0.26, spin: 3.1,
      color: C.line, opacity: 0.8, segs: 10,
      done() {
        if (i === 0) st.phase('react');
        st.burst(F.to, { power: 0.55, n: 26, color: C.hot });
      },
    }));
    /* ③ 迷途（react）：原地打轉＋踉蹌位移＋地面錯亂腳印浮出來 */
    if (stain) {
      st.fade(stain, { ms: RL * 0.3, delay: R0, from: 0, to: 0.9 });
      st.fade(stain, { ms: RL * 0.45, delay: R0 + RL * 0.5, from: 0.9, to: 0 });
    }
    lost.forEach((f, i) => {
      const sway = st.toward(f, new THREE.Vector3());
      st.tween({ ms: RL * 0.95, delay: R0 + i * RL * 0.08, ease: 'linear', update(t) {
        const w = Math.sin(Math.PI * t);
        st.spin(f, 0, w * (0.62 + 0.2 * i) * Math.sin(t * Math.PI * 2.5), 0);
        // 踉蹌：只有轉圈不算反應（因果門檻量 move／scale），迷路的人會走歪
        st.move(f, sway.x * 0.075 * w * Math.sin(t * Math.PI * 3), 0, sway.z * 0.075 * w * Math.sin(t * Math.PI * 3));
        st.rim(f, 1 - 0.45 * w);
      } });
      // 頭上那頂帽子跟著它晃（印記的功能，但沿用飛過來的那一頂，不再多開一個 mesh）
      const F = flying[i];
      if (F) {
        st.tween({ ms: RL * 0.62, delay: R0 + i * RL * 0.08, ease: 'linear', update(t) {
          st.top(f, F.mesh.position); F.mesh.position.y += 0.13 + 0.03 * Math.sin(t * Math.PI * 4);
          F.mesh.userData.fxRoll = 3.1 + t * Math.PI * 2;
        } });
        st.fade(F.mesh, { ms: RL * 0.32, delay: R0 + RL * 0.63, from: 1, to: 0 });
      }
    });
  },

  /* 椅仔姑竹椅・看穿（chair，作祟×3）：本方圍毆額外 +1。
     編舞：竹椅前後搖（0–300ms，三尊錯開 40ms：SeatRoot/PostA/PostB 一來一回問事）
          → 椎頭一抬（300ms 起 strike：NeckRoot/Head1/HeadTop 挑起來，邊光亮）
          → 看穿（340ms 起：椅腳下一圈問事的環擴出去，一條細線從椅頭指到對面每一隻，被指到的邊光點亮一下）
          → 收（560ms 起：頭落回）。 */
  hauntSee(st) {
    const chairs = st.actor;
    const seer = chairs[0];
    const foes = st.target;
    const rock = (c, s) => {
      st.rot(c, 'SeatRoot', 0.30 * s); st.rot(c, 'SeatMid', 0.17 * s); st.rot(c, 'SeatFront', 0.23 * s);
      st.rot(c, 'PostA', 0.21 * s); st.rot(c, 'PostB', 0.21 * s);
      st.rot(c, 'Waist', -0.14 * s);
    };
    const lift = (c, k) => {
      st.rot(c, 'NeckRoot', -0.52 * k); st.rot(c, 'Head1', -0.38 * k); st.rot(c, 'HeadTop', -0.30 * k);
      st.rot(c, 'Crest', -0.26 * k); st.rot(c, 'Yoke', -0.16 * k); st.rot(c, 'Chest', -0.13 * k);
    };
    chairs.forEach((c, i) => {
      st.tween({ ms: 300, delay: i * 40, ease: 'linear', update(t) {
        rock(c, Math.sin(t * Math.PI * 3) * Math.sin(Math.PI * t)); st.rim(c, 1 + 0.35 * Math.sin(Math.PI * t));
      } });
      st.tween({ ms: 220, delay: 300 + i * 40, ease: 'strike', update(t, e) { lift(c, e); st.rim(c, 1 + 1.1 * e); } });
      st.tween({ ms: 260, delay: 560 + i * 40, ease: 'inout', update(t, e) { lift(c, 1 - e); st.rim(c, 1 + 1.1 * (1 - e)); } });
    });
    st.at(340, () => {
      const from = st.worldOf(seer, 'HeadTop', new THREE.Vector3());
      const circle = st.ring(st.foot(seer, new THREE.Vector3()), 0.44, 0.05, { opacity: 0.85 });
      circle.scale.setScalar(0.35);
      st.grow(circle, { ms: 320, from: 0.35, to: 1.3 });
      st.fade(circle, { ms: 330, delay: 110, from: 0.85, to: 0 });
      st.burst(from, { power: 0.45, n: 24 });
      foes.forEach((f, j) => {
        const to = st.worldOf(f, null, new THREE.Vector3());
        const sight = st.beam(from, to, { opacity: 0 });
        st.tween({ ms: 320, delay: j * 40, ease: 'linear', update(t) { sight.material.opacity = 0.92 * Math.sin(Math.PI * t); } });
        st.tween({ ms: 280, delay: 60 + j * 40, ease: 'linear', update(t) { st.rim(f, 1 + 1.6 * Math.sin(Math.PI * t)); } });
      });
      st.flinch(foes, { delay: 60, stagger: 40, strength: 0.4, burst: false });
    });
  },

  /* 黃色小雨衣・恐懼（raincoat，作祟×4）：三拍對面群體再 −1 atk。
     編舞：兜帽緩緩抬起（0–560ms，四尊錯開 30ms，慢，醞釀最久的一套）
          → 錯開閃現靠近半步（300ms 起，每尊 150ms 一步，邊光同時閃一下）
          → 一圈暗陰氣從對面腳下掃出去（280ms），對面群體整個縮小退縮
          → 收（580ms 起：兜帽落、退回原位）。 */
  hauntDread1(st) {
    const coats = st.actor;
    const foes = st.target;
    const swarm = st.byBody(foes, 'swarm');
    const shrinkers = swarm.length ? swarm : foes;
    const step = coats.map((c) => st.toward(c, new THREE.Vector3()));
    const hood = (c, k) => {
      st.rot(c, 'HoodRoot', -0.46 * k); st.rot(c, 'Hood1', -0.36 * k); st.rot(c, 'HoodTop', -0.30 * k);
      st.rot(c, 'ShoulderTop', -0.16 * k); st.rot(c, 'Yoke', -0.12 * k); st.rot(c, 'Chest', -0.10 * k); st.rot(c, 'Waist', -0.07 * k);
      st.rot(c, 'MistRoot', 0.26 * k);
      st.rot(c, 'Skirt1', 0.12 * k); st.rot(c, 'Skirt2', 0.17 * k); st.rot(c, 'SkirtTip', 0.23 * k);
      st.rot(c, 'LSlvRoot1Rt', -0.30 * k, 0, 0.22 * k); st.rot(c, 'LSlvElbow1El', -0.26 * k); st.rot(c, 'LSlvCuff1Sl', -0.20 * k);
      st.rot(c, 'RSlvRoot1Rt', -0.30 * k, 0, -0.22 * k); st.rot(c, 'RSlvElbow1El', -0.26 * k); st.rot(c, 'RSlvCuff1Sl', -0.20 * k);
    };
    coats.forEach((c, i) => {
      const d = step[i];
      st.tween({ ms: 470, delay: i * 30, ease: 'out', update(t, e) { hood(c, e); st.rim(c, 1 + 0.7 * e); } });
      st.tween({ ms: 150, delay: 300 + i * 30, ease: 'out', update(t, e) {
        st.move(c, d.x * 0.18 * e, 0, d.z * 0.18 * e); st.rim(c, 1.7 + 1.2 * Math.sin(Math.PI * t));
      } });
      st.tween({ ms: 220, delay: 580 + i * 30, ease: 'inout', update(t, e) {
        const k = 1 - e; hood(c, k); st.move(c, d.x * 0.18 * k, 0, d.z * 0.18 * k); st.rim(c, 1 + 0.7 * k);
      } });
    });
    st.at(280, () => {
      const c0 = new THREE.Vector3();
      foes.forEach((f) => c0.add(st.worldOf(f, null, _a)));
      if (foes.length) c0.multiplyScalar(1 / foes.length);
      c0.y = st.tableY;
      const sweep = st.ring(c0, 0.98, 0.07, { opacity: 0.88 });
      sweep.scale.setScalar(0.28);
      st.grow(sweep, { ms: 340, from: 0.28, to: 1.32 });
      st.fade(sweep, { ms: 340, delay: 120, from: 0.88, to: 0 });
      st.flinch(foes, { stagger: 40, strength: 0.85, burst: false });
      shrinkers.forEach((f, j) => {
        st.tween({ ms: 440, delay: j * 35, ease: 'pulse', update(t, e) { st.scale(f, 1 - 0.21 * e); st.rim(f, 1 + 0.9 * e); } });
      });
    });
  },

  /* 水鬼浮標・抓交替（buoy，作祟×4）：燒掉對面 1 隻小兵，本方也燒 1 隻。
     編舞：繩子往後盪起蓄力（0–385ms，四尊錯開 35ms：RopeA–F 甩開、雙臂後拉）
          → 甩繩（300ms 起 strike：領頭那尊整條繩往前拋出、半步前傾）
          → 勾住（330ms：一條抖動的繩線從 KnotTop 連到對面一隻小兵，那隻被拖半步、邊光暴亮）
          → 抓交替（390ms：本方最後一尊自己沉下去，腳下一圈漣漪擴出去、邊光被水吞掉）
          → 收（540ms 起：繩落回）。 */
  hauntSwap(st) {
    const buoys = st.actor;
    const thrower = buoys[0];
    const sinker = buoys[buoys.length - 1];
    const swarm = st.byBody(st.target, 'swarm');
    const prey = swarm[0] || st.target[0] || null;
    const ropes = ['RopeA', 'RopeB', 'RopeC', 'RopeD', 'RopeE', 'RopeF'];
    const swing = (b, k) => {
      ropes.forEach((r, i) => st.rot(b, r, 0.55 * k * (0.55 + 0.14 * i), 0.30 * k * (i % 2 ? 1 : -1), 0));
      st.rot(b, 'KnotTop', 0.40 * k); st.rot(b, 'KnotBot', 0.30 * k);
      st.rot(b, 'Yoke', 0.14 * k); st.rot(b, 'Chest', 0.12 * k); st.rot(b, 'Belly', 0.08 * k);
      st.rot(b, 'MastTop', 0.18 * k); st.rot(b, 'DrumCap', 0.12 * k); st.rot(b, 'DrumBase', 0.08 * k);
      st.rot(b, 'RSh1Sh', -0.52 * k, 0, -0.30 * k); st.rot(b, 'RElbow1El', -0.42 * k); st.rot(b, 'RWrist1Wr', -0.30 * k);
      st.rot(b, 'LSh1Sh', -0.52 * k, 0, 0.30 * k); st.rot(b, 'LElbow1El', -0.42 * k); st.rot(b, 'LWrist1Wr', -0.30 * k);
      st.rot(b, 'WeedRoot', -0.22 * k); st.rot(b, 'Weed1', -0.30 * k); st.rot(b, 'WeedTip', -0.40 * k);
    };
    const fwd = st.toward(thrower, new THREE.Vector3());
    buoys.forEach((b, i) => {
      st.tween({ ms: 280, delay: i * 35, ease: 'out', update(t, e) { swing(b, -0.60 * e); st.rim(b, 1 + 0.5 * e); } });
      const home = b === thrower ? 0.95 : -0.60;
      st.tween({ ms: 250, delay: 540 + i * 35, ease: 'inout', update(t, e) {
        const k = home * (1 - e); swing(b, k);
        if (b === thrower) st.move(b, fwd.x * 0.12 * (1 - e), 0, fwd.z * 0.12 * (1 - e));
        st.rim(b, 1 + 0.6 * (1 - e));
      } });
    });
    st.at(300, () => {
      st.tween({ ms: 210, ease: 'strike', update(t, e) {
        swing(thrower, -0.60 + 1.55 * e);
        st.move(thrower, fwd.x * 0.12 * e, 0, fwd.z * 0.12 * e);
        st.rim(thrower, 1 + 1.4 * e);
      } });
    });
    st.at(330, () => {
      if (!prey) return;
      const from = st.worldOf(thrower, 'KnotTop', new THREE.Vector3());
      const to = st.worldOf(prey, null, new THREE.Vector3());
      const rope = st.bolt(from, to, { jag: 0.07, segs: 14, opacity: 0, seed: 41 });
      st.tween({ ms: 380, ease: 'linear', update(t) { rope.material.opacity = 0.92 * Math.sin(Math.PI * t); } });
      st.burst(to, { power: 0.62, n: 30 });
      st.punch(0.3);
      const pull = st.toward(prey, new THREE.Vector3()); // prey 朝出招方＝被拖過去的方向
      st.tween({ ms: 420, delay: 60, ease: 'pulse', update(t, e) {
        st.move(prey, pull.x * 0.23 * e, 0, pull.z * 0.23 * e); st.rim(prey, 1 + 1.6 * e);
      } });
    });
    st.at(390, () => {
      const foot = st.foot(sinker, new THREE.Vector3());
      const ripple = st.ring(foot, 0.34, 0.045, { opacity: 0.82 });
      ripple.scale.setScalar(0.32);
      st.grow(ripple, { ms: 350, from: 0.32, to: 1.45 });
      st.fade(ripple, { ms: 340, delay: 100, from: 0.82, to: 0 });
      st.tween({ ms: 340, ease: 'pulse', update(t, e) {
        st.move(sinker, 0, -0.15 * e, 0);
        st.rot(sinker, 'Waist', 0.20 * e); st.rot(sinker, 'Neck', 0.24 * e); st.rot(sinker, 'Head1', 0.28 * e); st.rot(sinker, 'Crown', 0.18 * e);
        st.rim(sinker, 1 - 0.4 * e);
      } });
    });
  },

  /* 虎姑婆指甲・咬手指（nail，精英×1）：打群體目標額外 +2。
     編舞：長爪高舉、罩子後仰、張口（0–300ms，爪尖凝一點光）
          → 撲下（240ms 起 strike：爪從高處掃到身前、整尊前傾半步、鏡頭小推）
          → 咬（380ms 起每 85ms 一隻：對面小兵依序噴火星並退縮）
          → 舔爪收勢（620ms：爪抬到嘴邊、頭湊過去，到 900ms 全部回 0）。 */
  eliteVsSwarm(st) {
    const gran = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const swarm = st.byBody(st.target, 'swarm');
    const list = swarm.length ? swarm : st.target;
    const fwd = st.toward(gran, new THREE.Vector3());
    // k>0：長爪高舉後仰蓄勢；k<0：爪撲下前伸。lick：舔爪
    const pose = (k, lick) => {
      lick = lick || 0;
      const gape = Math.abs(k);
      st.rot(gran, 'ClawRoot', -1.00 * k, 0, 0.32 * k);
      st.rot(gran, 'ClawElbow', -0.72 * k + 0.85 * lick);
      st.rot(gran, 'ClawWrist', -0.55 * k - 0.45 * lick);
      st.rot(gran, 'ClawHand', -0.45 * k - 0.35 * lick);
      st.rot(gran, 'StubRoot', -0.48 * k, 0, -0.28 * k); st.rot(gran, 'StubElbow', -0.38 * k); st.rot(gran, 'StubTip', -0.28 * k);
      st.rot(gran, 'HoodRoot', -0.24 * k); st.rot(gran, 'Hood1', -0.20 * k); st.rot(gran, 'Hood2', -0.16 * k); st.rot(gran, 'HoodTop', -0.14 * k);
      st.rot(gran, 'HeadRoot', -0.30 * k - 0.34 * lick); st.rot(gran, 'Brow', -0.16 * k); st.rot(gran, 'Snout', -0.12 * k);
      st.rot(gran, 'JawRoot', 0.34 * gape + 0.18 * lick); st.rot(gran, 'Jaw1', 0.30 * gape); st.rot(gran, 'JawTip', 0.26 * gape);
      st.rot(gran, 'Neck', -0.14 * k); st.rot(gran, 'Chest', -0.16 * k); st.rot(gran, 'Spine', -0.12 * k); st.rot(gran, 'Hips', -0.08 * k);
      st.rot(gran, 'CapeRoot', -0.22 * k); st.rot(gran, 'Cape1', -0.28 * k); st.rot(gran, 'CapeHem', -0.34 * k);
      st.rot(gran, 'RobeRoot', -0.10 * k); st.rot(gran, 'Robe1', -0.15 * k); st.rot(gran, 'RobeHem', -0.20 * k);
    };
    const spark = st.orb(st.worldOf(gran, 'ClawHand', new THREE.Vector3()), 0.055, { opacity: 0 });
    spark.scale.setScalar(0.3);
    st.tween({ ms: 660, ease: 'linear', update(t) {
      st.worldOf(gran, 'ClawHand', spark.position);
      spark.material.opacity = 0.92 * Math.sin(Math.PI * Math.min(1, t * 1.1));
      spark.scale.setScalar(0.3 + 0.95 * Math.min(1, t * 1.7));
    } });
    st.tween({ ms: 240, ease: 'out', update(t, e) { pose(e); st.move(gran, 0, 0.05 * e, 0); st.rim(gran, 1 + 0.9 * e); } });
    st.at(240, () => {
      st.tween({ ms: 200, ease: 'strike', update(t, e) {
        pose(1 - 2 * e);
        st.move(gran, fwd.x * 0.20 * e, 0.05 * (1 - e), fwd.z * 0.20 * e);
        st.rim(gran, 1 + 0.9 + 1.1 * e);
      } });
      st.punch(0.42);
    });
    list.forEach((f, j) => {
      st.at(380 + j * 85, () => {
        const p = st.worldOf(f, null, new THREE.Vector3());
        st.burst(p, { power: 0.72, n: 34 });
        st.flinch([f], { strength: 1.15, burst: false });
      });
    });
    st.at(620, () => {
      st.tween({ ms: 250, ease: 'inout', update(t, e) {
        const k = -1 * (1 - e);
        pose(k, Math.sin(Math.PI * t));
        st.move(gran, fwd.x * 0.20 * (1 - e), 0, fwd.z * 0.20 * (1 - e));
        st.rim(gran, 1 + 2.0 * (1 - e));
      } });
    });
  },

  /* 陰陽眼銅錢・陰陽眼（yinyangcoin，小兵×2）：本隊攻擊無視吸收。
     編舞：兩手抬到眼前、銅錢貼上去旋亮（0–325ms：CoinA/CoinB 位移到眼位、轉兩圈、脹大）
          → 穿透（280ms 起：每一枚銅錢射出一道直線，對準對面一隻再往後多穿 1.35 個身位——線不停在對面身上）
          → 被穿的邊光瞬亮、火星、輕退（340ms 起）
          → 收（600ms 起：手放下、銅錢再轉一圈歸位）。 */
  swarmPierce(st) {
    const seers = st.actor;
    const foes = st.target;
    const eye = (g, k, spin) => {
      st.shift(g, 'CoinA', 0, 0.055 * k, 0.045 * k); st.shift(g, 'CoinB', 0, 0.055 * k, -0.045 * k);
      st.rot(g, 'CoinA', 0, spin, 0); st.rot(g, 'CoinB', 0, -spin, 0);
      st.scaleBone(g, 'CoinA', 1 + 0.55 * k); st.scaleBone(g, 'CoinB', 1 + 0.55 * k);
      st.rot(g, 'HeadRoot', -0.22 * k); st.rot(g, 'Skull', -0.10 * k); st.rot(g, 'Neck2', -0.14 * k); st.rot(g, 'NeckB', -0.10 * k);
      st.rot(g, 'Brow', -0.14 * k); st.rot(g, 'Crown', -0.12 * k);
      st.rot(g, 'LArm1Rt', -0.85 * k, 0, 0.30 * k); st.rot(g, 'LArm1El', -0.78 * k); st.rot(g, 'LArm1Wr', -0.30 * k); st.rot(g, 'LArm1Ha', -0.18 * k);
      st.rot(g, 'RArm1Rt', -0.85 * k, 0, -0.30 * k); st.rot(g, 'RArm1El', -0.78 * k); st.rot(g, 'RArm1Wr', -0.30 * k); st.rot(g, 'RArm1Ha', -0.18 * k);
      st.rot(g, 'SkirtRoot', 0.08 * k); st.rot(g, 'Skirt1', 0.12 * k); st.rot(g, 'SkirtHem', 0.17 * k);
      st.rot(g, 'Chest', -0.09 * k); st.rot(g, 'Spine', -0.06 * k);
      st.scaleBone(g, 'BasePlate', 1 + 0.12 * k);
    };
    seers.forEach((g, i) => {
      st.tween({ ms: 280, delay: i * 45, ease: 'out', update(t, e) { eye(g, e, e * Math.PI * 4); st.rim(g, 1 + 1.0 * e); } });
      st.tween({ ms: 280, delay: 600 + i * 45, ease: 'inout', update(t, e) { eye(g, 1 - e, Math.PI * 4 + e * Math.PI * 2); st.rim(g, 1 + 1.0 * (1 - e)); } });
    });
    st.at(280, () => {
      seers.forEach((g, i) => {
        const from = st.worldOf(g, i % 2 ? 'CoinB' : 'CoinA', new THREE.Vector3());
        const mark = foes.length ? foes[i % foes.length] : null;
        const aim = mark ? st.worldOf(mark, null, new THREE.Vector3()) : from.clone().addScaledVector(st.dir, 2);
        const thru = aim.clone().sub(from);
        const len = thru.length() || 1;
        const to = from.clone().addScaledVector(thru.multiplyScalar(1 / len), len + 1.35); // 穿過去、不停在對面
        const ray = st.beam(from, to, { opacity: 0 });
        st.tween({ ms: 320, delay: i * 50, ease: 'linear', update(t) { ray.material.opacity = 0.95 * Math.sin(Math.PI * t); } });
        if (mark) st.at(60 + i * 50, () => st.burst(aim, { power: 0.55, n: 26 }));
      });
      foes.forEach((f, j) => st.tween({ ms: 300, delay: 40 + j * 35, ease: 'linear', update(t) { st.rim(f, 1 + 1.8 * Math.sin(Math.PI * t)); } }));
      st.flinch(foes, { delay: 60, stagger: 35, strength: 0.5, burst: false });
      st.punch(0.28);
    });
  },

  /* 過陰咒・恐懼加倍（guoyin，作祟×4）：三拍恐懼倍率 ×2。
     編舞：本尊低頭俯身、霧腳外散（0–375ms）
          → 虛影分離（200ms 起：VRoot 整條往上抬起並旋開，虛影的頭手往後仰＝半條命踩到那邊）
          → 兩圈暗環一前一後從本方腳下推出去（280ms／400ms）
          → 對面縮得比單純恐懼更深（360ms，−30%）並退縮
          → 收（640ms：虛影沉回本尊，姿態歸 0）。 */
  hauntFearX2(st) {
    const casters = st.actor;
    const foes = st.target;
    const flesh = (g, k) => {
      st.rot(g, 'Waist', 0.14 * k); st.rot(g, 'Spine', 0.17 * k); st.rot(g, 'Chest', 0.15 * k);
      st.rot(g, 'NeckB', 0.19 * k); st.rot(g, 'HeadRoot', 0.25 * k); st.rot(g, 'Skull', 0.16 * k); st.rot(g, 'Crown', 0.12 * k);
      st.rot(g, 'ArmRoot', -0.45 * k, 0, 0.26 * k); st.rot(g, 'ArmElbow', -0.40 * k); st.rot(g, 'ArmWrist', -0.30 * k); st.rot(g, 'ArmHand', -0.24 * k);
      st.rot(g, 'MistRoot', -0.20 * k); st.rot(g, 'Mist1', -0.26 * k); st.rot(g, 'Mist2', -0.30 * k); st.rot(g, 'MistTip', -0.36 * k);
    };
    const shade = (g, k) => {
      st.shift(g, 'VRoot', 0, 0.42 * k, 0);
      st.rot(g, 'VRoot', -0.24 * k, 1.10 * k, 0);
      st.rot(g, 'VSpine', -0.20 * k); st.rot(g, 'VChest', -0.23 * k); st.rot(g, 'VNeck', -0.27 * k);
      st.rot(g, 'VHeadRoot', -0.32 * k); st.rot(g, 'VSkull2', -0.20 * k); st.rot(g, 'VCrown', -0.16 * k);
      st.rot(g, 'VArmRoot', -0.92 * k, 0, -0.30 * k); st.rot(g, 'VArmElbow', -0.60 * k); st.rot(g, 'VArmWrist', -0.42 * k); st.rot(g, 'VArmTip', -0.30 * k);
      st.scaleBone(g, 'VRoot', 1 + 0.25 * k);
    };
    casters.forEach((g, i) => {
      st.tween({ ms: 300, delay: i * 25, ease: 'out', update(t, e) { flesh(g, e); st.rim(g, 1 + 0.5 * e); } });
      st.tween({ ms: 360, delay: 200 + i * 25, ease: 'out', update(t, e) { shade(g, e); st.rim(g, 1 + 0.5 + 1.1 * e); } });
    });
    st.at(280, () => {
      const c0 = new THREE.Vector3();
      casters.forEach((g) => c0.add(st.worldOf(g, null, _a)));
      c0.multiplyScalar(1 / Math.max(1, casters.length));
      c0.y = st.tableY;
      [0, 120].forEach((d, i) => {
        const halo = st.ring(c0, 0.70 + 0.26 * i, 0.06, { opacity: 0.8 });
        halo.scale.setScalar(0.30);
        st.grow(halo, { ms: 400, delay: d, from: 0.30, to: 1.35 });
        st.fade(halo, { ms: 370, delay: d + 140, from: 0.8, to: 0 });
      });
      st.burst(c0, { power: 0.5, n: 26 });
    });
    st.at(360, () => {
      st.flinch(foes, { stagger: 40, strength: 1.1, burst: false });
      foes.forEach((f, j) => st.tween({ ms: 460, delay: j * 30, ease: 'pulse', update(t, e) { st.scale(f, 1 - 0.30 * e); st.rim(f, 1 + 1.1 * e); } }));
    });
    st.at(640, () => {
      casters.forEach((g) => {
        st.tween({ ms: 240, ease: 'inout', update(t, e) { const k = 1 - e; flesh(g, k); shade(g, k); st.rim(g, 1 + 1.6 * k); } });
      });
    });
  },

  /* 飼鬼甕・餓鬼進食（sigui，小兵×2）：拍末對面有紙紮被燒 → 本方全體 hp+1。
     編舞：甕口張開（0–300ms：LipRoot/LipMid/LipEdge 外翻脹大、喉頸後仰、雙臂抬起捧甕）
          → 進食（250ms 起：對面每一隻頭頂飄來一顆灰火，帶弧線被吸進甕口，進去一顆甕身脹一下）
          → 回暖（520ms：本方每一尊腳下一圈暖光擴開）
          → 收（620ms：甕口閉上，邊光緩緩回穩）。 */
  swarmFeed1(st) {
    const urns = st.actor;
    const foes = st.target;
    const mouth = (u, k) => {
      st.rot(u, 'LipRoot', -0.42 * k); st.rot(u, 'LipMid', -0.36 * k); st.rot(u, 'LipEdge', -0.32 * k);
      st.scaleBone(u, 'LipEdge', 1 + 0.60 * k); st.scaleBone(u, 'LipMid', 1 + 0.38 * k);
      st.rot(u, 'ThroatRoot', -0.24 * k); st.rot(u, 'ThroatTop', -0.28 * k);
      st.rot(u, 'NeckRoot', -0.16 * k); st.rot(u, 'NeckTop', -0.20 * k);
      st.rot(u, 'HeadRoot', -0.30 * k); st.rot(u, 'Skull', -0.20 * k); st.rot(u, 'Crown', -0.14 * k);
      st.rot(u, 'Shoulders', -0.12 * k); st.rot(u, 'Chest', -0.10 * k); st.rot(u, 'Waist', -0.08 * k); st.rot(u, 'TorsoRoot', -0.06 * k);
      st.rot(u, 'LArm1Rt', -0.75 * k, 0, 0.35 * k); st.rot(u, 'LArm1El', -0.50 * k); st.rot(u, 'LArm1Ja', -0.24 * k); st.rot(u, 'LArm1Wr', -0.30 * k); st.rot(u, 'LArm1Ha', -0.22 * k);
      st.rot(u, 'RArm1Rt', -0.75 * k, 0, -0.35 * k); st.rot(u, 'RArm1El', -0.50 * k); st.rot(u, 'RArm1Ja', -0.24 * k); st.rot(u, 'RArm1Wr', -0.30 * k); st.rot(u, 'RArm1Ha', -0.22 * k);
    };
    const swell = (u) => st.tween({ ms: 220, ease: 'pulse', update(t, e) {
      st.scaleBone(u, 'PotBase', 1 + 0.10 * e); st.scaleBone(u, 'PotLow', 1 + 0.17 * e); st.scaleBone(u, 'PotSeam', 1 + 0.14 * e);
      st.scaleBone(u, 'UrnA', 1 + 0.13 * e); st.scaleBone(u, 'UrnB', 1 + 0.13 * e); st.scaleBone(u, 'UrnC', 1 + 0.11 * e); st.scaleBone(u, 'UrnTop', 1 + 0.09 * e);
    } });
    urns.forEach((u, i) => {
      st.tween({ ms: 300, delay: i * 45, ease: 'out', update(t, e) { mouth(u, e); st.rim(u, 1 + 0.6 * e); } });
      st.tween({ ms: 260, delay: 620 + i * 40, ease: 'inout', update(t, e) {
        mouth(u, 1 - e); st.rim(u, 1 + 0.6 * (1 - e) + 0.9 * Math.sin(Math.PI * t));
      } });
    });
    st.at(250, () => {
      foes.forEach((f, j) => {
        const u = urns[j % urns.length];
        const from = st.top(f, new THREE.Vector3());
        const to = st.worldOf(u, 'LipMid', new THREE.Vector3());
        const ash = st.orb(from, 0.075, { opacity: 0 });
        ash.scale.setScalar(0.35);
        st.tween({ ms: 340, delay: j * 30, ease: 'linear', update(t) {
          ash.material.opacity = 0.95 * Math.min(1, Math.sin(Math.PI * t) * 3);
          ash.scale.setScalar(0.35 + 0.85 * Math.min(1, t * 3));
        } });
        st.fly(ash, from, to, { ms: 340, delay: j * 30, ease: 'out', arc: 0.34, done() {
          ash.material.opacity = 0;
          st.burst(to, { power: 0.36, n: 18 });
          swell(u);
        } });
      });
      st.flinch(foes, { delay: 40, stagger: 35, strength: 0.5, burst: false });
    });
    st.at(520, () => {
      urns.forEach((u, i) => {
        const warm = st.disc(st.foot(u, new THREE.Vector3()), 0.42, { opacity: 0.55 });
        warm.scale.setScalar(0.40);
        st.grow(warm, { ms: 260, delay: i * 35, from: 0.40, to: 1.18 });
        st.fade(warm, { ms: 260, delay: 60 + i * 35, from: 0.55, to: 0 });
      });
    });
  },
};
export default MOVES;

/* ══════════ Tier 1 短版（260ms，v0.54 三級視覺分級）══════════
   寫法紀律與踩過的坑見 js/trait-fx/zuling.js 同一區塊的檔頭（horizon ≤230、補間一律頂層
   用 delay 排定、不用 st.at、回呼裡只放 burst／punch）。辨識元素表在
   docs/experiments/2026-09-10-plan-fx-tiers.md §5。
   陰氣系的共同語氣（照完整版）：出手前先有一拍靜止、拍子卡頓，霧裾慢半拍才追上。 */
export const SHORT = {
  /* 偷命｜辨識：抖動的陰綢牽住對面＋命火順著綢子被吸走 */
  hauntSteal(st) {
    const ghosts = st.byBody(st.actor, 'haunt').length ? st.byBody(st.actor, 'haunt') : st.actor;
    const lead = ghosts[0];
    const hand = st.worldOf(lead, 'RArmRoot1Rt', new THREE.Vector3());
    const marks = st.target.slice(0, 3);
    const silks = [], lifes = [];
    marks.forEach((f, i) => {
      const p = st.worldOf(f, null, new THREE.Vector3());
      silks.push(st.bolt(p, hand, { jag: 0.22, segs: 7, seed: 4 + i * 3, opacity: 0 })); // 抖動的陰綢
      const orb = st.orb(p, 0.04, { opacity: 0 });
      orb.scale.setScalar(0.6);
      lifes.push({ orb, from: p });
    });
    ghosts.forEach((g, i) => st.tween({ ms: 88, delay: i * 12, ease: 'out', update(t, e) { // 髮瀑揚起、整尊上浮
      st.rot(g, 'VeilTip', -0.4 * e); st.rot(g, 'HeadRoot', -0.24 * e);
      st.rot(g, 'RArmRoot1Rt', -0.55 * e); st.rot(g, 'LArmRoot1Rt', -0.45 * e);
      st.move(g, 0, 0.07 * e, 0); st.rim(g, 1 + 0.8 * e);
    } }));
    silks.forEach((b, i) => st.fade(b, { ms: 96, delay: 84 + i * 10, from: 0.9, to: 0 }));
    lifes.forEach((L, i) => { // 命火順著綢子被吸到鬼的頭上
      st.fade(L.orb, { ms: 30, delay: 86 + i * 10, from: 0, to: 1 });
      st.fly(L.orb, L.from, st.top(lead, new THREE.Vector3()), { ms: 84, delay: 90 + i * 10, ease: 'in', arc: 0.14 });
      st.fade(L.orb, { ms: 40, delay: 180, from: 1, to: 0 });
    });
    marks.forEach((f, i) => st.flinch([f], { delay: 100 + i * 12, strength: 0.85, burst: i === 0 }));
    st.tween({ ms: 60, delay: 170, ease: 'pulse', update(t, e) { st.rim(lead, 1.8 + 2 * e); },
      done() { st.punch(0.35); } }); // 到手那一刻邊光暴亮
    st.tween({ ms: 62, delay: 165, ease: 'inout', update(t, e) { // 髮落、鬼沉回
      const k = 1 - e;
      ghosts.forEach((g) => {
        st.rot(g, 'VeilTip', -0.4 * k); st.rot(g, 'HeadRoot', -0.24 * k);
        st.rot(g, 'RArmRoot1Rt', -0.55 * k); st.rot(g, 'LArmRoot1Rt', -0.45 * k);
        st.move(g, 0, 0.07 * k, 0);
      });
    } });
  },

  /* 迷途｜tier 1 短版 = 完整版**同一支函式**（v0.55，時間軸由 st.beat 換算） */
  hauntLost: MOVES.hauntLost,

  /* 看穿｜辨識：椅頭一抬＋一條細線指到對面每一隻 */
  hauntSee(st) {
    const chairs = st.byBody(st.actor, 'haunt').length ? st.byBody(st.actor, 'haunt') : st.actor;
    const lead = chairs[0];
    const eyeP = st.worldOf(lead, 'HeadTop', new THREE.Vector3());
    const ring = st.ring(st.foot(lead, new THREE.Vector3()), 0.32, 0.04, { opacity: 0 });
    const lines = st.target.slice(0, 4).map((f, i) => ({ l: st.beam(eyeP.clone(), st.worldOf(f, null, new THREE.Vector3()), { opacity: 0 }), f, i }));
    chairs.forEach((g, i) => st.tween({ ms: 86, delay: i * 10, ease: 'inout', update(t, e) { // 竹椅前後搖（一來一回問事）
      const s = Math.sin(e * Math.PI * 2);
      st.rot(g, 'SeatRoot', 0.18 * s); st.rot(g, 'PostA', -0.12 * s); st.rot(g, 'PostB', 0.12 * s);
      st.rot(g, 'Waist', 0.08 * s); st.rim(g, 1 + 0.5 * Math.abs(s));
    } }));
    st.tween({ ms: 74, delay: 84, ease: 'strike', update(t, e) { // 椅頭一抬、邊光亮
      st.rot(lead, 'NeckRoot', -0.3 * e); st.rot(lead, 'Head1', -0.26 * e); st.rot(lead, 'HeadTop', -0.2 * e);
      st.rot(lead, 'Crest', -0.18 * e); st.rim(lead, 1 + 2 * e);
    } });
    st.grow(ring, { ms: 92, delay: 104, from: 0.3, to: 1.7 }); // 椅腳下問事的環擴出去
    st.fade(ring, { ms: 92, delay: 104, from: 0.7, to: 0 });
    lines.forEach(({ l, f, i }) => { // 一條細線從椅頭指到對面每一隻
      st.fade(l, { ms: 70, delay: 108 + i * 12, from: 0.85, to: 0 });
      st.tween({ ms: 66, delay: 112 + i * 12, ease: 'pulse', update(t, e) { st.rim(f, 1 + 1.4 * e); } });
    });
    st.tween({ ms: 62, delay: 166, ease: 'inout', update(t, e) { // 頭落回
      const k = 1 - e;
      st.rot(lead, 'NeckRoot', -0.3 * k); st.rot(lead, 'Head1', -0.26 * k); st.rot(lead, 'HeadTop', -0.2 * k);
      st.rot(lead, 'Crest', -0.18 * k); st.rim(lead, 1 + 2 * k);
    } });
  },

  /* 恐懼｜辨識：兜帽抬起＋暗陰氣圈從對面腳下掃出、對面縮小 */
  hauntDread1(st) {
    const coats = st.byBody(st.actor, 'haunt').length ? st.byBody(st.actor, 'haunt') : st.actor;
    const foes = st.target;
    const mid = foes.length ? st.foot(foes[0], new THREE.Vector3()) : st.foot(coats[0], new THREE.Vector3());
    const dark = st.ring(mid, 0.38, 0.06, { opacity: 0, color: 0x2a1b3d });
    const dark2 = st.ring(mid, 0.38, 0.035, { opacity: 0, color: 0x2a1b3d });
    coats.forEach((g, i) => {
      st.tween({ ms: 96, delay: i * 8, ease: 'inout', update(t, e) { // 兜帽緩緩抬起（陰氣＝最慢的醞釀）
        st.rot(g, 'HoodRoot', -0.26 * e); st.rot(g, 'Hood1', -0.2 * e); st.rot(g, 'HoodTop', -0.16 * e);
        st.rot(g, 'Yoke', -0.08 * e); st.rot(g, 'Skirt1', 0, 0, 0.14 * e); st.rim(g, 1 + 0.5 * e);
      } });
      st.tween({ ms: 60, delay: 92 + i * 14, ease: 'snap', update(t, e) { // 錯開閃現靠近半步
        st.move(g, 0, 0, 0.1 * e); st.rim(g, 1.5 + 1.4 * Math.sin(Math.PI * e));
      } });
    });
    st.grow(dark, { ms: 100, delay: 96, from: 0.3, to: 2 }); // 一圈暗陰氣從對面腳下掃出去
    st.fade(dark, { ms: 100, delay: 96, from: 0.85, to: 0 });
    st.grow(dark2, { ms: 92, delay: 124, from: 0.3, to: 1.6 });
    st.fade(dark2, { ms: 92, delay: 124, from: 0.6, to: 0 });
    foes.forEach((f, i) => st.tween({ ms: 96, delay: 104 + i * 8, ease: 'pulse', update(t, e) { // 對面群體整個縮小退縮
      st.scale(f, 1 - 0.11 * e); st.move(f, 0, 0, -0.05 * e); st.rim(f, 1 - 0.3 * e);
    } }));
    st.tween({ ms: 58, delay: 170, ease: 'inout', update(t, e) { // 兜帽落、退回原位
      const k = 1 - e;
      coats.forEach((g) => {
        st.rot(g, 'HoodRoot', -0.26 * k); st.rot(g, 'Hood1', -0.2 * k); st.rot(g, 'HoodTop', -0.16 * k);
        st.rot(g, 'Skirt1', 0, 0, 0.14 * k); st.move(g, 0, 0, 0.1 * k); st.rim(g, 1 + 0.5 * k);
      });
    } });
  },

  /* 抓交替｜辨識：繩子甩出勾住對面＋本方自己沉下去的漣漪 */
  hauntSwap(st) {
    const bys = st.byBody(st.actor, 'haunt').length ? st.byBody(st.actor, 'haunt') : st.actor;
    const lead = bys[0];
    const sink = bys[bys.length - 1];
    const knot = st.worldOf(lead, 'KnotTop', new THREE.Vector3());
    const prey = st.byBody(st.target, 'swarm')[0] || st.target[0] || null;
    const at = prey ? st.worldOf(prey, null, new THREE.Vector3()) : knot.clone().addScaledVector(st.dir, 1.6);
    const rope = st.bolt(knot, at, { jag: 0.18, segs: 9, seed: 6, opacity: 0 }); // 一條抖動的繩線
    const ripple = st.ring(st.foot(sink, new THREE.Vector3()), 0.3, 0.045, { opacity: 0 });
    bys.forEach((g, i) => st.tween({ ms: 84, delay: i * 9, ease: 'wind', update(t, e) { // 繩子往後盪起蓄力
      st.rot(g, 'RSh1Sh', -0.5 * e); st.rot(g, 'RElbow1El', -0.35 * e); st.rot(g, 'LSh1Sh', -0.4 * e);
      st.rot(g, 'Chest', -0.12 * e); st.rot(g, 'Weed1', 0, 0, 0.22 * e); st.rim(g, 1 + 0.6 * e);
    } }));
    st.tween({ ms: 70, delay: 82, ease: 'strike', update(t, e) { // 甩繩：整條繩往前拋出、半步前傾
      st.rot(lead, 'RSh1Sh', -0.5 + 1.1 * e); st.rot(lead, 'RElbow1El', -0.35 + 0.6 * e);
      st.rot(lead, 'Chest', -0.12 + 0.26 * e); st.move(lead, 0, 0, 0.11 * e);
    }, done() { st.punch(0.4); } });
    st.fade(rope, { ms: 92, delay: 96, from: 0.95, to: 0 }); // 勾住
    if (prey) {
      st.tween({ ms: 74, delay: 104, ease: 'out', update(t, e) { st.move(prey, 0, 0, -0.14 * e); st.rim(prey, 1 + 2 * e); } });
      st.flinch([prey], { delay: 108, strength: 1.1, burst: true });
    }
    st.tween({ ms: 82, delay: 132, ease: 'in', update(t, e) { // 本方最後一尊自己沉下去
      st.move(sink, 0, -0.16 * e, 0); st.rim(sink, 1 - 0.6 * e);
    } });
    st.grow(ripple, { ms: 76, delay: 152, from: 0.3, to: 1.7 }); // 腳下一圈漣漪擴出去
    st.fade(ripple, { ms: 76, delay: 152, from: 0.7, to: 0 });
    st.tween({ ms: 58, delay: 170, ease: 'inout', update(t, e) { // 繩落回
      const k = 1 - e;
      bys.forEach((g) => { st.rot(g, 'RSh1Sh', 0.6 * k); st.rot(g, 'LSh1Sh', -0.4 * k); st.rot(g, 'Weed1', 0, 0, 0.22 * k); });
      st.move(lead, 0, 0, 0.11 * k); st.move(sink, 0, -0.16 * k, 0);
    } });
  },

  /* 咬手指｜辨識：長爪從高處掃下＋對面小兵依序噴火星 */
  eliteVsSwarm(st) {
    const gran = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const swarm = st.byBody(st.target, 'swarm').length ? st.byBody(st.target, 'swarm') : st.target;
    const claw = st.worldOf(gran, 'ClawHand', new THREE.Vector3());
    const spark = st.orb(claw, 0.04, { opacity: 0 });
    spark.scale.setScalar(0.5);
    st.tween({ ms: 84, ease: 'wind', update(t, e) { // 長爪高舉、罩子後仰、張口
      st.rot(gran, 'ClawRoot', -1.1 * e); st.rot(gran, 'ClawElbow', -0.5 * e); st.rot(gran, 'ClawWrist', -0.3 * e);
      st.rot(gran, 'HoodRoot', -0.22 * e); st.rot(gran, 'JawRoot', 0.28 * e); st.rim(gran, 1 + 0.9 * e);
      st.worldOf(gran, 'ClawHand', spark.position);
    } });
    st.fade(spark, { ms: 45, delay: 45, from: 0, to: 1 }); // 爪尖凝一點光
    st.tween({ ms: 76, delay: 82, ease: 'strike', update(t, e) { // 撲下：爪從高處掃到身前、前傾半步
      st.rot(gran, 'ClawRoot', -1.1 + 1.65 * e); st.rot(gran, 'ClawElbow', -0.5 + 0.8 * e);
      st.rot(gran, 'ClawWrist', -0.3 + 0.5 * e); st.rot(gran, 'Chest', 0.18 * e);
      st.move(gran, 0, 0, 0.1 * e); st.worldOf(gran, 'ClawHand', spark.position);
    }, done() { st.punch(0.5); } });
    st.fade(spark, { ms: 42, delay: 158, from: 1, to: 0 });
    swarm.slice(0, 4).forEach((f, i) => st.flinch([f], { delay: 120 + i * 22, strength: 1.05, burst: true })); // 依序噴火星並退縮
    st.tween({ ms: 64, delay: 164, ease: 'inout', update(t, e) { // 舔爪收勢：爪抬到嘴邊、頭湊過去
      st.rot(gran, 'ClawRoot', 0.55 * (1 - e) - 0.5 * e); st.rot(gran, 'ClawElbow', 0.3 * (1 - e) - 0.6 * e);
      st.rot(gran, 'HeadRoot', -0.18 * e); st.rot(gran, 'JawRoot', 0.28 * (1 - e)); st.rim(gran, 1 + 1.9 * (1 - e));
    } });
  },

  /* 陰陽眼｜辨識：銅錢貼上眼位旋亮＋直線穿透過對面身後 */
  swarmPierce(st) {
    const men = st.byBody(st.actor, 'swarm').length ? st.byBody(st.actor, 'swarm') : st.actor;
    const lead = men[0];
    const eyeP = st.worldOf(lead, 'Brow', new THREE.Vector3());
    const foe = st.target[0] || null;
    const at = foe ? st.worldOf(foe, null, new THREE.Vector3()) : eyeP.clone().addScaledVector(st.dir, 1.6);
    const thru = at.clone().addScaledVector(st.dir, 1.35); // 線不停在對面身上，往後多穿 1.35 個身位
    const rayA = st.beam(eyeP.clone(), thru, { opacity: 0 });
    const rayB = men[1] ? st.beam(st.worldOf(men[1], 'Brow', new THREE.Vector3()), thru, { opacity: 0 }) : null;
    men.forEach((g, i) => st.tween({ ms: 88, delay: i * 10, ease: 'out', update(t, e) { // 兩手抬到眼前、銅錢轉兩圈脹大
      st.rot(g, 'LArm1Rt', -0.75 * e); st.rot(g, 'RArm1Rt', -0.75 * e);
      st.rot(g, 'LArm1El', -0.55 * e); st.rot(g, 'RArm1El', -0.55 * e);
      st.rot(g, 'CoinA', 0, Math.PI * 2 * e, 0); st.rot(g, 'CoinB', 0, -Math.PI * 2 * e, 0);
      st.scaleBone(g, 'CoinA', 1 + 0.4 * e); st.scaleBone(g, 'CoinB', 1 + 0.4 * e);
      st.rim(g, 1 + 1 * e);
    } }));
    st.fade(rayA, { ms: 86, delay: 88, from: 0.95, to: 0 }); // 穿透
    if (rayB) st.fade(rayB, { ms: 86, delay: 100, from: 0.95, to: 0 });
    if (foe) {
      st.tween({ ms: 60, delay: 100, ease: 'pulse', update(t, e) { st.rim(foe, 1 + 2.4 * e); },
        done() { st.burst(at, { power: 0.7, n: 32 }); st.punch(0.35); } });
      st.flinch([foe], { delay: 104, strength: 0.9, burst: false });
    }
    st.tween({ ms: 64, delay: 164, ease: 'inout', update(t, e) { // 手放下、銅錢再轉一圈歸位
      const k = 1 - e;
      men.forEach((g) => {
        st.rot(g, 'LArm1Rt', -0.75 * k); st.rot(g, 'RArm1Rt', -0.75 * k);
        st.rot(g, 'LArm1El', -0.55 * k); st.rot(g, 'RArm1El', -0.55 * k);
        st.rot(g, 'CoinA', 0, Math.PI * 2 * k + Math.PI * e, 0); st.rot(g, 'CoinB', 0, -Math.PI * 2 * k - Math.PI * e, 0);
        st.scaleBone(g, 'CoinA', 1 + 0.4 * k); st.scaleBone(g, 'CoinB', 1 + 0.4 * k); st.rim(g, 1 + 1 * k);
      });
    } });
  },

  /* 恐懼加倍｜辨識：虛影從本尊分離抬起＋兩圈暗環一前一後推出 */
  hauntFearX2(st) {
    const casts = st.byBody(st.actor, 'haunt').length ? st.byBody(st.actor, 'haunt') : st.actor;
    const lead = casts[0];
    const foot = st.foot(lead, new THREE.Vector3());
    const r1 = st.ring(foot, 0.34, 0.05, { opacity: 0, color: 0x3a2450 });
    const r2 = st.ring(foot, 0.34, 0.04, { opacity: 0, color: 0x3a2450 });
    casts.forEach((g, i) => st.tween({ ms: 86, delay: i * 8, ease: 'in', update(t, e) { // 本尊低頭俯身、霧腳外散
      st.rot(g, 'Waist', 0.16 * e); st.rot(g, 'Chest', 0.12 * e); st.rot(g, 'HeadRoot', 0.2 * e);
      st.rot(g, 'Mist1', 0, 0, 0.24 * e); st.rot(g, 'Mist2', 0, 0, -0.2 * e); st.rim(g, 1 - 0.3 * e);
    } }));
    casts.forEach((g, i) => st.tween({ ms: 92, delay: 78 + i * 8, ease: 'out', update(t, e) { // 虛影分離：VRoot 整條抬起並旋開
      st.shift(g, 'VRoot', 0, 0.16 * e, -0.1 * e); st.rot(g, 'VRoot', 0, 0.7 * e, 0);
      st.rot(g, 'VHeadRoot', -0.3 * e); st.rot(g, 'VArmRoot', -0.4 * e); st.rot(g, 'VSpine', -0.16 * e);
      st.rim(g, 0.7 + 2.1 * e);
    } }));
    st.grow(r1, { ms: 96, delay: 92, from: 0.3, to: 1.9 }); // 兩圈暗環一前一後推出去
    st.fade(r1, { ms: 96, delay: 92, from: 0.8, to: 0 });
    st.grow(r2, { ms: 92, delay: 126, from: 0.3, to: 2.2 });
    st.fade(r2, { ms: 92, delay: 126, from: 0.6, to: 0 });
    st.target.forEach((f, i) => st.tween({ ms: 92, delay: 112 + i * 8, ease: 'pulse', update(t, e) { // 縮得比單純恐懼更深（−30%）
      st.scale(f, 1 - 0.3 * e); st.move(f, 0, 0, -0.06 * e); st.rim(f, 1 - 0.4 * e);
    } }));
    st.tween({ ms: 58, delay: 170, ease: 'inout', update(t, e) { // 虛影沉回本尊
      const k = 1 - e;
      casts.forEach((g) => {
        st.shift(g, 'VRoot', 0, 0.16 * k, -0.1 * k); st.rot(g, 'VRoot', 0, 0.7 * k, 0);
        st.rot(g, 'VHeadRoot', -0.3 * k); st.rot(g, 'VArmRoot', -0.4 * k);
        st.rot(g, 'Waist', 0.16 * k); st.rot(g, 'HeadRoot', 0.2 * k); st.rim(g, 1 + 1.8 * k);
      });
    } });
  },

  /* 餓鬼進食｜辨識：甕口張開＋灰火帶弧線被吸進甕、甕身脹一下 */
  swarmFeed1(st) {
    const urns = st.byBody(st.actor, 'swarm').length ? st.byBody(st.actor, 'swarm') : st.actor;
    const lead = urns[0];
    const mouth = st.worldOf(lead, 'LipRoot', new THREE.Vector3());
    const ashes = st.target.slice(0, 3).map((f, i) => {
      const from = st.top(f, new THREE.Vector3());
      const o = st.orb(from, 0.038, { opacity: 0, color: 0x8a8f9a });
      return { o, from, i };
    });
    const warmRing = st.disc(st.foot(lead, new THREE.Vector3()), 0.4, { opacity: 0 });
    warmRing.scale.setScalar(0.3);
    st.tween({ ms: 84, ease: 'out', update(t, e) { // 甕口張開：唇外翻脹大、雙臂抬起捧甕
      st.scaleBone(lead, 'LipRoot', 1 + 0.3 * e); st.scaleBone(lead, 'LipMid', 1 + 0.24 * e); st.scaleBone(lead, 'LipEdge', 1 + 0.34 * e);
      st.rot(lead, 'ThroatRoot', -0.18 * e); st.rot(lead, 'LArm1Rt', -0.5 * e); st.rot(lead, 'RArm1Rt', -0.5 * e);
      st.rim(lead, 1 + 0.8 * e);
    } });
    ashes.forEach(({ o, from, i }) => { // 灰火帶弧線被吸進甕口
      st.fade(o, { ms: 34, delay: 70 + i * 12, from: 0, to: 1 });
      st.fly(o, from, mouth, { ms: 76, delay: 76 + i * 12, ease: 'in', arc: 0.2 });
      st.fade(o, { ms: 30, delay: 152 + i * 12, from: 1, to: 0 });
      st.tween({ ms: 40, delay: 154 + i * 12, ease: 'pulse', update(t, e) { st.scale(lead, 1 + 0.07 * e); } }); // 進去一顆甕身脹一下
    });
    st.grow(warmRing, { ms: 82, delay: 148, from: 0.3, to: 1.6 }); // 回暖：本方腳下暖光擴開
    st.fade(warmRing, { ms: 82, delay: 148, from: 0.55, to: 0 });
    st.actor.forEach((f, i) => st.tween({ ms: 70, delay: 150 + i * 10, ease: 'pulse', update(t, e) { st.rim(f, 1 + 1.3 * e); } }));
    st.tween({ ms: 58, delay: 170, ease: 'inout', update(t, e) { // 甕口閉上
      const k = 1 - e;
      st.scaleBone(lead, 'LipRoot', 1 + 0.3 * k); st.scaleBone(lead, 'LipMid', 1 + 0.24 * k); st.scaleBone(lead, 'LipEdge', 1 + 0.34 * k);
      st.rot(lead, 'ThroatRoot', -0.18 * k); st.rot(lead, 'LArm1Rt', -0.5 * k); st.rot(lead, 'RArm1Rt', -0.5 * k);
      st.rim(lead, 1 + 0.8 * k);
    } });
  },
};
