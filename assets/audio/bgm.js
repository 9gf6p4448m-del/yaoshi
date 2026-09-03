/* =====================================================================
   妖市 背景音樂層 — Web Audio 無縫環，檔案缺席時完全空操作
   ---------------------------------------------------------------------
   掛法：<script src="assets/audio/bgm.js"></script>
         之後演出層呼叫 YS_BGM.play("market")。
   紀律（與 assets/audio/sfx.js 同一套，見 docs/art-integration-guide.md §8.3）：
     1. 本檔**不含任何亂數**、**不讀寫遊戲狀態**。要不要播由呼叫端決定。
     2. **只能從演出層呼叫**，引擎函式（resolveAuction／resolveBattles／simulate）
        一律零呼叫——headless 載入時 YS_BGM 根本不存在。
     3. 手機瀏覽器要先在一次使用者手勢裡 unlock()；與 YS_SFX 共用同一個 AudioContext，
        兩者音量各自獨立（BGM 一條 gain、音效一條 gain）。
     4. **曲子檔案不存在時是完全的空操作**：fetch 404／解碼失敗都只是靜默，不 throw、
        不 console.error、不擋任何遊戲流程。這樣「還沒生好曲子」的版本照樣能上線。
   曲目與情境對照見 §9（四層：標題／牌桌／對決／局末回顧）。
   無縫環：檔案本身已預先做成首尾可直接相接的環（節錄＋crossfade），
   這裡用 AudioBufferSourceNode.loop=true 做取樣級精準循環，不靠 <audio loop>（有縫）。
   ===================================================================== */
(function (global) {
  "use strict";

  /* ★安裝旗標★：曲子檔案放進 assets/audio/bgm/ 之後，把對應這一行改成 true。
     為什麼要手動旗標而不是「抓抓看、失敗就算了」——瀏覽器會把 404 記成 console error，
     而「console 0 error」是這個專案的驗收條件之一（會遮住真正的錯誤）。
     旗標是 false 時這一層連 fetch 都不發，完全不碰網路。 */
  const READY = { title: true, market: true, duel: true, review: true }; /* 2026-09-03 四首已安裝（Flow Music 生成，節錄 60 秒無縫環；備選 take 在 bgm/alt/，換曲改 TRACKS 路徑即可） */

  /* 場景 → 檔名。改這張表就等於換曲，不必動任何呼叫端 */
  const TRACKS = {
    title:  "assets/audio/bgm/title.m4a",   /* 標題頁與選角畫面 */
    market: "assets/audio/bgm/market.m4a",  /* 牌桌：盯上／出價／開標，全局常駐 */
    duel:   "assets/audio/bgm/duel.m4a",    /* 結算戰對決場景 */
    review: "assets/audio/bgm/review.m4a",  /* 局末回顧 */
  };

  const FADE = 1.2;        /* 交叉淡入淡出秒數 */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const BGM = {
    enabled: true,
    volume: 0.45,          /* 相對音效壓低——音樂是底，音效才是資訊 */
    scene: null,           /* 目前這首的場景名 */
    ctx: null,
    _bus: null,            /* 總音量 */
    _cur: null,            /* {src, gain, scene} */
    _buf: {},              /* 場景 → AudioBuffer 快取 */
    _miss: {},             /* 場景 → true 代表這首載不到，之後不再重試 */
    onChange: null,        /* 播放狀態變化時的回呼（呼叫端用來壓低環境音） */

    /* 與 YS_SFX 共用 AudioContext：兩層音樂／音效不會各開一個 ctx（iOS 會很吵） */
    _ensure() {
      if (this.ctx) return this.ctx;
      const sfx = global.YS_SFX;
      let ctx = sfx && sfx.ctx;
      if (!ctx) {
        const AC = global.AudioContext || global.webkitAudioContext; if (!AC) return null;
        if (sfx && typeof sfx._ensure === "function") ctx = sfx._ensure();
        if (!ctx) ctx = new AC();
      }
      this.ctx = ctx;
      this._bus = ctx.createGain();
      this._bus.gain.value = this.volume;
      this._bus.connect(ctx.destination);
      return ctx;
    },

    unlock() {
      const ctx = this._ensure(); if (!ctx) return false;
      if (ctx.state === "suspended") ctx.resume();
      return true;
    },

    setVolume(v) {
      this.volume = clamp(v, 0, 1);
      if (this._bus) this._bus.gain.value = this.volume;
    },

    setEnabled(on) {
      this.enabled = !!on;
      if (!this.enabled) this.stop();
      else if (this.scene) { const s = this.scene; this.scene = null; this.play(s); }
      if (this.onChange) this.onChange(this.playing());
    },

    /* 真的有聲音在跑（enabled、檔案在、ctx 活著）才算 */
    playing() { return !!(this.enabled && this._cur && this.ctx && this.ctx.state === "running"); },

    /* 等 ctx 真的 running 才回來（2026-09-03 iPhone 主畫面實測：ctx 一直 suspended、resume 與 <audio> 都懸著）。
       iOS 在 ctx 還 suspended 時跑 decodeAudioData 會把音訊執行緒卡住，之後連音效都不會醒——
       所以音樂一律等 running 才 fetch＋decode；statechange 會叫醒這裡，最多等 20 秒就放棄本次（下次切場景再試）。 */
    _whenRunning(ctx) {
      if (ctx.state === "running") return Promise.resolve(true);
      return new Promise((res) => {
        let done = false;
        const ok = () => { if (done) return; done = true; ctx.removeEventListener("statechange", h); res(ctx.state === "running"); };
        const h = () => { if (ctx.state === "running") ok(); };
        ctx.addEventListener("statechange", h);
        setTimeout(ok, 20000);
      });
    },
    async _load(scene) {
      if (this._buf[scene]) return this._buf[scene];
      if (this._miss[scene]) return null;
      const url = TRACKS[scene];
      const ctx = this._ensure();
      if (ctx && !(await this._whenRunning(ctx))) return null; /* 還沒醒：不記 miss、下次再試 */
      /* READY 是 false ＝曲子還沒安裝：直接記成缺曲，連 fetch 都不發（避免 404 污染 console） */
      if (!READY[scene] || !url || !ctx || typeof fetch !== "function") { this._miss[scene] = true; return null; }
      try {
        const r = await fetch(url);
        if (!r.ok) { this._miss[scene] = true; return null; }
        const ab = await r.arrayBuffer();
        const buf = await ctx.decodeAudioData(ab);
        this._buf[scene] = buf;
        return buf;
      } catch (e) { this._miss[scene] = true; return null; }  /* 檔案還沒生好＝靜默，不擋遊戲 */
    },

    /* play(scene)：切到這一層。同一層重複呼叫是空操作（不會重頭播） */
    async play(scene) {
      if (!this.enabled || !TRACKS[scene]) return false;
      if (this.scene === scene && this._cur) return true;
      const ctx = this._ensure(); if (!ctx) return false;
      this.scene = scene;
      const buf = await this._load(scene);
      if (!buf) { if (this.onChange) this.onChange(this.playing()); return false; }
      if (this.scene !== scene) return false;   /* 載入期間又切走了 */
      const t = ctx.currentTime;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(1, t + FADE);
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.connect(g).connect(this._bus);
      src.start(t);
      this._fadeOutCur(t);
      this._cur = { src, gain: g, scene };
      if (this.onChange) this.onChange(this.playing());
      return true;
    },

    _fadeOutCur(t) {
      const c = this._cur; if (!c) return;
      this._cur = null;
      try {
        c.gain.gain.cancelScheduledValues(t);
        c.gain.gain.setValueAtTime(c.gain.gain.value, t);
        c.gain.gain.linearRampToValueAtTime(0.0001, t + FADE);
        c.src.stop(t + FADE + 0.05);
      } catch (e) { }
    },

    /* 已安裝哪幾首（給探針與回報用） */
    installed() { return Object.keys(TRACKS).filter(k => READY[k]); },

    /* 音訊系統被徹底關閉時（sfx.release 走 ctx.close()）要跟著丟掉綁在舊 ctx 上的東西：bus、正在播的 source、解碼快取。
       下次 play() 會用新的 ctx 重新 _ensure＋重新解碼（檔案有 HTTP 快取，重解一首 60 秒約幾十毫秒）。 */
    reset() {
      try { if (this._cur && this._cur.src) this._cur.src.stop(); } catch (e) {}
      this._cur = null; this.scene = null; this.ctx = null; this._bus = null; this._buf = {}; this._miss = {};
      if (this.onChange) this.onChange(false);
    },
    stop() {
      const ctx = this.ctx; if (!ctx) { this.scene = null; return; }
      this._fadeOutCur(ctx.currentTime);
      this.scene = null;
      if (this.onChange) this.onChange(false);
    },
  };

  global.YS_BGM = BGM;
})(typeof window !== "undefined" ? window : globalThis);
