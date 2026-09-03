/* =====================================================================
   妖市 音效合成器 — 純 Web Audio，零音檔、零外部依賴
   ---------------------------------------------------------------------
   掛法：<script src="assets/audio/sfx.js"></script>
         之後任何地方 YS_SFX.play("gong")。
   紀律：
     1. 本檔**不含任何亂數**。要有變化的音，由呼叫端把 S.rngUi() 的值用
        opts.rnd 傳進來（0..1），沒傳就當 0.5。這樣「有沒有播音效」永遠不碰
        賽局亂數流，trace 逐位元組不變。
     2. 本檔**不讀寫遊戲狀態**。要不要播（SKIP 快轉、靜音設定）由呼叫端決定。
     3. 手機瀏覽器要先在**一次使用者手勢**（touchend／click）裡呼叫
        YS_SFX.unlock()，AudioContext 才會解鎖；之後就不用再管。
   聲部清單與觸發時機見 docs/art-integration-guide.md §8。
   ===================================================================== */
(function (global) {
  "use strict";

  /* ---------- 基礎工具 ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* 白噪音緩衝：長度固定 2 秒，每個 ctx 只做一次。內容用固定種子的 LCG 產生，
     不用瀏覽器內建亂數——同一個 ctx 的取樣率下逐次相同。 */
  function noiseBuffer(ctx) {
    if (ctx.__ysNoise) return ctx.__ysNoise;
    const len = Math.floor(ctx.sampleRate * 2), buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0); let s = 0x2545f491;
    for (let i = 0; i < len; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
    ctx.__ysNoise = buf; return buf;
  }

  /* 包絡：attack → peak → 指數衰減到 0 */
  function env(g, t0, peak, a, dur) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  /* 一個振盪器聲部 */
  function tone(ctx, out, t0, { type = "sine", f = 440, fEnd = null, dur = 0.5, peak = 0.5, a = 0.005 }) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (fEnd != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, fEnd), t0 + dur);
    env(g, t0, peak, a, dur);
    o.connect(g).connect(out); o.start(t0); o.stop(t0 + dur + 0.05);
  }

  /* 一個噪音聲部（可掛濾波器） */
  function noise(ctx, out, t0, { dur = 0.3, peak = 0.4, a = 0.002, filter = null, q = 1, fEnd = null }) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx); src.loop = true;
    const g = ctx.createGain(); env(g, t0, peak, a, dur);
    let node = src;
    if (filter) {
      const bq = ctx.createBiquadFilter(); bq.type = filter.type; bq.Q.value = q;
      bq.frequency.setValueAtTime(filter.f, t0);
      if (fEnd != null) bq.frequency.exponentialRampToValueAtTime(Math.max(20, fEnd), t0 + dur);
      node.connect(bq); node = bq;
    }
    node.connect(g).connect(out); src.start(t0); src.stop(t0 + dur + 0.05);
  }

  /* ---------- 聲部（名稱＝觸發事件，見指南 §8） ----------
     每個函式簽章 (ctx, out, t0, rnd, opts)。rnd 只用來做微小的音高／時值變化。 */
  const VOICES = {
    /* 銅鑼：開標揭曉、夜初。低頻基音＋不諧和泛音＋長尾 */
    gong(ctx, out, t0, rnd) {
      const f = 92 + rnd * 8;
      tone(ctx, out, t0, { type: "sine", f, dur: 2.4, peak: 0.55, a: 0.01 });
      tone(ctx, out, t0, { type: "sine", f: f * 1.41, dur: 1.6, peak: 0.22, a: 0.01 });
      tone(ctx, out, t0, { type: "sine", f: f * 2.27, dur: 1.1, peak: 0.14, a: 0.01 });
      noise(ctx, out, t0, { dur: 0.25, peak: 0.35, filter: { type: "bandpass", f: 900 }, q: 0.8 });
    },
    /* 木魚：出價確認、按鈕。短促、乾 */
    woodfish(ctx, out, t0, rnd) {
      tone(ctx, out, t0, { type: "triangle", f: 820 + rnd * 60, fEnd: 400, dur: 0.09, peak: 0.6, a: 0.001 });
      noise(ctx, out, t0, { dur: 0.05, peak: 0.25, filter: { type: "bandpass", f: 2400 }, q: 2 });
    },
    /* 鈸：對決碰撞。高頻噪音爆發 */
    cymbal(ctx, out, t0, rnd) {
      noise(ctx, out, t0, { dur: 0.9, peak: 0.5, a: 0.002, filter: { type: "highpass", f: 4200 + rnd * 800 }, q: 0.7 });
      noise(ctx, out, t0, { dur: 0.35, peak: 0.3, filter: { type: "bandpass", f: 6800 }, q: 1.2 });
      tone(ctx, out, t0, { type: "square", f: 3100, fEnd: 2500, dur: 0.12, peak: 0.08, a: 0.001 });
    },
    /* 蓋章：盯上宣告。悶的一記 */
    stamp(ctx, out, t0, rnd) {
      tone(ctx, out, t0, { type: "sine", f: 180 + rnd * 20, fEnd: 60, dur: 0.22, peak: 0.7, a: 0.002 });
      noise(ctx, out, t0, { dur: 0.08, peak: 0.3, filter: { type: "lowpass", f: 1200 }, q: 0.5 });
    },
    /* 鈴：得標。亮、有泛音 */
    bell(ctx, out, t0, rnd) {
      const f = 1240 + rnd * 120;
      tone(ctx, out, t0, { type: "sine", f, dur: 1.4, peak: 0.35, a: 0.003 });
      tone(ctx, out, t0, { type: "sine", f: f * 2.76, dur: 0.9, peak: 0.12, a: 0.003 });
      tone(ctx, out, t0, { type: "sine", f: f * 5.4, dur: 0.5, peak: 0.05, a: 0.003 });
    },
    /* 風聲掃過：角色滑入、換場 */
    whoosh(ctx, out, t0, rnd) {
      noise(ctx, out, t0, { dur: 0.45, peak: 0.35, a: 0.12, filter: { type: "bandpass", f: 300 + rnd * 100 }, fEnd: 2400, q: 1.5 });
    },
    /* 受傷：失血、被毒。低頻下墜 */
    hurt(ctx, out, t0, rnd) {
      tone(ctx, out, t0, { type: "sawtooth", f: 220 + rnd * 30, fEnd: 70, dur: 0.35, peak: 0.3, a: 0.004 });
      noise(ctx, out, t0, { dur: 0.12, peak: 0.2, filter: { type: "lowpass", f: 800 }, q: 0.5 });
    },
    /* 天明：夜末回血、下一夜。上行三音 */
    dawn(ctx, out, t0) {
      [392, 494, 588].forEach((f, i) => tone(ctx, out, t0 + i * 0.14, { type: "triangle", f, dur: 0.9, peak: 0.28, a: 0.02 }));
    },
    /* 出局：暗的下行 */
    death(ctx, out, t0) {
      tone(ctx, out, t0, { type: "sine", f: 196, fEnd: 49, dur: 1.6, peak: 0.45, a: 0.02 });
      tone(ctx, out, t0 + 0.05, { type: "sine", f: 147, fEnd: 37, dur: 1.5, peak: 0.25, a: 0.02 });
      noise(ctx, out, t0, { dur: 0.6, peak: 0.15, filter: { type: "lowpass", f: 300 }, q: 0.5 });
    },
    /* 燈籠風聲：常駐環境音，loop=true。只有這一個是持續音 */
    wind(ctx, out, t0, rnd, opts) {
      const dur = (opts && opts.dur) || 8;
      /* 底噪音量開放給呼叫端：BGM 播放時要把環境音壓低（使用者 2026-09-03 裁定）。不傳＝原本的 0.12 */
      const peak = (opts && typeof opts.gain === "number") ? opts.gain : 0.12;
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx); src.loop = true;
      const bq = ctx.createBiquadFilter(); bq.type = "lowpass"; bq.frequency.value = 380; bq.Q.value = 0.6;
      const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
      lfo.frequency.value = 0.11 + rnd * 0.05; lfoG.gain.value = 180;
      lfo.connect(lfoG).connect(bq.frequency);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + 1.5);
      g.gain.setValueAtTime(peak, t0 + dur - 1);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      src.connect(bq).connect(g).connect(out); src.start(t0); lfo.start(t0);
      src.stop(t0 + dur); lfo.stop(t0 + dur);
    },
  };

  /* ---------- 對外介面 ---------- */
  const SFX = {
    enabled: true,
    volume: 0.8,
    ctx: null,
    _master: null,
    names: Object.keys(VOICES),

    /* 在使用者手勢裡呼叫一次；重複呼叫無害 */
    unlock() {
      const ctx = this._ensure(); if (!ctx) return false;
      if (ctx.state === "suspended") ctx.resume();
      return true;
    },
    _ensure() {
      if (this.ctx) return this.ctx;
      const AC = global.AudioContext || global.webkitAudioContext; if (!AC) return null;
      this.ctx = new AC();
      this._master = this.ctx.createGain(); this._master.gain.value = this.volume;
      this._master.connect(this.ctx.destination);
      return this.ctx;
    },
    setVolume(v) { this.volume = clamp(v, 0, 1); if (this._master) this._master.gain.value = this.volume; },

    /* play(name, {rnd, dur})：rnd 請傳 S.rngUi()；不傳＝0.5（完全決定性） */
    play(name, opts) {
      if (!this.enabled) return false;
      const v = VOICES[name]; if (!v) return false;
      const ctx = this._ensure(); if (!ctx || ctx.state === "suspended") return false;
      const rnd = clamp((opts && typeof opts.rnd === "number") ? opts.rnd : 0.5, 0, 1);
      v(ctx, this._master, ctx.currentTime, rnd, opts || {});
      return true;
    },

    /* 離線渲染成 AudioBuffer——給測試用（量 RMS／峰值），遊戲內不需要 */
    render(name, opts) {
      const v = VOICES[name]; if (!v) return Promise.reject(new Error("no voice " + name));
      const OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
      const sec = (opts && opts.sec) || 3, ctx = new OAC(1, 44100 * sec, 44100);
      const rnd = clamp((opts && typeof opts.rnd === "number") ? opts.rnd : 0.5, 0, 1);
      v(ctx, ctx.destination, 0, rnd, opts || {});
      return ctx.startRendering();
    },
  };

  global.YS_SFX = SFX;
})(typeof window !== "undefined" ? window : globalThis);
