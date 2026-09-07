# -*- coding: utf-8 -*-
import io

Z = '''  /* 殘日・餘暉灼目（canri，精英×1；傳說三尊美術卷 2026-09-07）：第 1 拍開打前，對面前鋒 atk −2。
     編舞（祖靈＝靜如樹、動時瞬發）：0–260ms 只有日盤反向慢轉、邊光漸亮，獸身幾乎不動（蓄）
          → 260ms 日盤猛轉正，盤面射出一片罩住對面的白光（dome）＋一道掃過前鋒的光束
          → 前鋒被灼：退縮、往後退半步、金火星、鏡頭小推 → 680ms 起姿態回 0。 */
  eliteBlind(st) {
    const sun = st.byBody(st.actor, 'elite')[0] || st.actor[0];
    const front = st.byBody(st.target, 'ward')[0] || st.biggest(st.target) || st.target[0] || null;
    const disc = st.worldOf(sun, 'Disc', new THREE.Vector3());
    const core = st.orb(disc, 0.05, { opacity: 0 });
    st.tween({ ms: 260, ease: 'out', update(t, e) {
      st.rot(sun, 'Neck', -0.10 * e); st.rot(sun, 'Crown', -0.16 * e);
      st.rot(sun, 'Disc', 0, 0, -0.5 * e);
      st.rim(sun, 1 + 1.1 * e);
      st.worldOf(sun, 'Disc', core.position);
      core.material.opacity = 0.9 * e;
      core.scale.setScalar(0.4 + 1.2 * e);
    } });
    st.at(260, () => {
      const mid = front ? st.worldOf(front, null, new THREE.Vector3()) : disc.clone().addScaledVector(st.dir, 1.6);
      const flash = st.dome(mid, 0.9, { opacity: 0.55 });
      flash.scale.setScalar(0.2);
      st.grow(flash, { ms: 260, from: 0.2, to: 1.25 });
      st.fade(flash, { ms: 300, delay: 60, from: 0.55, to: 0 });
      const ray = st.beam(core.position.clone(), mid, { opacity: 0 });
      ray.material.opacity = 0.95; st.fade(ray, { ms: 240, from: 0.95, to: 0 });
      st.burst(mid, { power: 0.85, n: 55 });
      st.punch(0.4);
      st.fade(core, { ms: 200, to: 0 });
      if (front) {
        st.flinch([front], { strength: 1.25, burst: false });
        st.tween({ ms: 420, ease: 'out', update(t, e) { st.move(front, 0, 0, -0.20 * Math.sin(Math.PI * e)); } });
      }
      st.tween({ ms: 420, ease: 'snap', update(t, e) {
        const k = 1 - t;
        st.rot(sun, 'Neck', -0.10 * k + 0.06 * e); st.rot(sun, 'Crown', -0.16 * k + 0.10 * e);
        st.rot(sun, 'Disc', 0, 0, -0.5 * k + 0.9 * e);
        st.rim(sun, 1 + 1.1 * k);
      } });
    });
    st.at(680, () => st.tween({ ms: 220, ease: 'inout', update(t, e) {
      const k = 1 - e;
      st.rot(sun, 'Neck', 0.06 * k); st.rot(sun, 'Crown', 0.10 * k); st.rot(sun, 'Disc', 0, 0, 0.9 * k);
      st.rim(sun, 1);
    } }));
  },

'''

X = '''  /* 大士爺紙尊・普渡（dashiye，護法×1；傳說三尊美術卷 2026-09-07）：本方全體 hp+2。
     編舞（香火＝緩慢、先蓄後落，像抬轎）：0–320ms 整尊下沉、舌垂、頭低（蓄）
          → 320ms 紙軀往上抬、口張、頭頂小龕跟著抬；同時本方每一尊腳下升起一圈光環，罩成半透明護罩
          → 700ms 起護罩淡出、姿態回 0。 */
  wardGuardAll(st) {
    const lead = st.byBody(st.actor, 'ward')[0] || st.actor[0];
    st.tween({ ms: 320, ease: 'inout', update(t, e) {
      st.move(lead, 0, -0.09 * e, 0);
      st.rot(lead, 'Hips', 0.10 * e); st.rot(lead, 'Chest', 0.09 * e); st.rot(lead, 'HeadRoot', 0.13 * e);
      st.rot(lead, 'TongueRoot', 0.18 * e); st.rot(lead, 'Tong1', 0.16 * e);
      st.rim(lead, 1 + 0.5 * e);
    } });
    st.at(320, () => {
      st.tween({ ms: 380, ease: 'snap', update(t, e) {
        const k = 1 - t;
        st.move(lead, 0, -0.09 * k + 0.12 * e, 0);
        st.rot(lead, 'Hips', 0.10 * k - 0.14 * e); st.rot(lead, 'Chest', 0.09 * k - 0.12 * e);
        st.rot(lead, 'HeadRoot', 0.13 * k - 0.18 * e);
        st.rot(lead, 'JawRoot', 0.34 * Math.sin(Math.PI * e));
        st.rot(lead, 'TongueRoot', 0.18 * k - 0.30 * e); st.rot(lead, 'Tong1', 0.16 * k - 0.26 * e);
        st.rot(lead, 'ShrineRoot', -0.16 * e);
        st.rim(lead, 1 + 1.2 * e);
      } });
      st.actor.forEach((f, i) => {
        const foot = st.foot(f, new THREE.Vector3());
        const c = st.worldOf(f, null, new THREE.Vector3());
        st.at(40 * i, () => {
          const r = st.ring(foot, 0.30, 0.05, { opacity: 0.9 });
          r.scale.setScalar(0.25); st.grow(r, { ms: 280, from: 0.25, to: 1.05 });
          st.fade(r, { ms: 320, delay: 200, from: 0.9, to: 0 });
          const d = st.dome(c, 0.78, { opacity: 0 });
          d.scale.setScalar(0.35);
          st.grow(d, { ms: 300, from: 0.35, to: 1 });
          st.fade(d, { ms: 300, from: 0, to: 0.32 });
          st.at(420, () => st.fade(d, { ms: 300, from: 0.32, to: 0 }));
          st.rim(f, 1.5);
        });
      });
    });
    st.at(700, () => st.tween({ ms: 200, ease: 'inout', update(t, e) {
      const k = 1 - e;
      st.move(lead, 0, 0.12 * k, 0);
      st.rot(lead, 'Hips', -0.14 * k); st.rot(lead, 'Chest', -0.12 * k); st.rot(lead, 'HeadRoot', -0.18 * k);
      st.rot(lead, 'TongueRoot', -0.30 * k); st.rot(lead, 'Tong1', -0.26 * k); st.rot(lead, 'ShrineRoot', -0.16 * k);
      st.actor.forEach((f) => st.rim(f, 1 + 0.5 * k));
    } }));
  },

'''

Y = '''  /* 有應公・有求必應（youyinggong，作祟×2；傳說三尊美術卷 2026-09-07）：第 3 拍作祟時，
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
  },

'''

for path, block in [('js/trait-fx/zuling.js', Z), ('js/trait-fx/xianghuo.js', X), ('js/trait-fx/yinqi.js', Y)]:
    s = io.open(path, encoding='utf-8').read()
    anchor = 'export default {\n'
    assert anchor in s, path
    s = s.replace(anchor, anchor + block, 1)
    io.open(path, 'w', encoding='utf-8').write(s)
    print('inserted into', path)
