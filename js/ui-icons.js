/* 妖市 介面圖示（v0.59.0 畫面精美度第二階段，凍結 docs/experiments/2026-09-26-acceptance-visual-polish-p2.md #1）
 *
 * 介面上的系統 emoji（😊💀🕯️🔊🎲🏷 …）一律換成單色線條圖示。
 * ★為什麼在顯示端換、不改資料字串★：emoji 同時出現在引擎寫出的戰報／事件字串裡（ctx.log、pwFire、nightly…），
 *   那些字串是 trace() 的一部分——改資料就改了引擎輸出，trace-eq 不再相等。所以資料一個字不動，
 *   只在字進到畫面時換：MutationObserver 看整個 <body>，任何新增／改寫的文字節點裡的 Extended_Pictographic
 *   換成 <svg class="ic"><use href="#ic-…"></svg>，後面緊跟一個 display:none 的 <span class="icT">原字</span>——
 *   textContent 因此與換之前逐字相同（主鈕雙擊防護 sigOf 讀的就是 textContent：🔊／🔇 換面仍要算「改了語意」）。
 * 手繪角色頭像是 <img>／<svg>（不是文字），盯章是 SVG，都不經過這裡。
 * title（tooltip）屬性裡的 emoji 直接拿掉（tooltip 放不了圖示）。
 * 本檔不讀寫任何賽局欄位、不耗亂數；headless（tests/tools/load.mjs 只載入第一個 <script>）不會載到它。 */
(function () {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  /* 24×24 線條圖示。stroke＝currentColor（由 .ic 的 color 決定），需要實心的部分自己寫 fill="currentColor"。 */
  const P = {
    dot: '<path d="M12 5l7 7-7 7-7-7z"/>',
    candle: '<path d="M9 10h6v11H9z"/><path d="M12 3c2 2.4 2 4.4 0 6-2-1.6-2-3.6 0-6z"/>',
    lantern: '<path d="M9 3h6M9 21h6M12 1v2"/><path d="M7 6c-3 4-3 8 0 12h10c3-4 3-8 0-12z"/><path d="M12 6v12M8.5 12h7"/>',
    eye: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    web: '<path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8"/>',
    packet: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M5 8l7 4 7-4"/><circle cx="12" cy="14" r="2"/>',
    gift: '<rect x="4" y="9" width="16" height="11"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1s6 1 6 1zm0 0c2-4 6-4 6-1s-6 1-6 1z"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/>',
    tile: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 9h6M12 7v8M9 15h6"/>',
    torii: '<path d="M3 5c6 1.5 12 1.5 18 0M5 9h14M7 7v14M17 7v14M12 7v2"/>',
    boat: '<path d="M3 15h18l-3 5H6z"/><path d="M12 3v12M12 4l6 9h-6"/>',
    moonNew: '<circle cx="12" cy="12" r="8"/>',
    moonCres: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16a5 8 0 0 0 0-16z" fill="currentColor"/>',
    moonFirst: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
    moonFull: '<circle cx="12" cy="12" r="8" fill="currentColor"/>',
    moonLast: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/>',
    crescent: '<path d="M15 3a9 9 0 1 0 6 13A7 7 0 0 1 15 3z"/>',
    skull: '<path d="M5 11a7 7 0 0 1 14 0v4h-3v4H8v-4H5z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/>',
    swords: '<path d="M4 4l11 11M20 4L9 15M14 18l4-4M6 14l4 4M3 21l3-3M21 21l-3-3"/>',
    speaker: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9c1.5 1.5 1.5 4.5 0 6M18.5 6.5c3 3 3 8 0 11"/>',
    mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6"/>',
    demon: '<path d="M5 4l3 4M19 4l-3 4"/><path d="M6 9c0-2 3-3 6-3s6 1 6 3v5c0 4-3 6-6 6s-6-2-6-6z"/><path d="M9 12h1.5M13.5 12H15M9 17c2-1.5 4-1.5 6 0"/>',
    cup: '<path d="M6 4h12l-2 16H8z"/><path d="M7 9h10"/>',
    coin: '<circle cx="12" cy="12" r="8"/><rect x="10" y="10" width="4" height="4"/>',
    orb: '<circle cx="12" cy="10" r="6"/><path d="M7 20h10M9 16l-1 4M15 16l1 4"/>',
    swirl: '<path d="M12 12a2 2 0 1 1 2 2c-3 0-5-2-5-5a5 5 0 0 1 5-5c4 0 7 3 7 7a9 9 0 0 1-9 9"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
    claw: '<circle cx="12" cy="16" r="4"/><circle cx="6" cy="10" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14" cy="6" r="1.8"/><circle cx="18" cy="10" r="1.8"/>',
    tusk: '<path d="M4 14c0-5 4-8 8-8s8 3 8 8"/><path d="M8 13c-1 3 0 6 2 7M16 13c1 3 0 6-2 7"/><circle cx="9.5" cy="10" r="1" fill="currentColor"/><circle cx="14.5" cy="10" r="1" fill="currentColor"/>',
    scroll: '<path d="M7 4h11v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1h10"/><path d="M7 4a2 2 0 0 0-2 2v11M10 9h5M10 13h5"/>',
    bowl: '<path d="M3 12h18a9 9 0 0 1-18 0z"/><path d="M7 12c0-3 2-5 5-5s5 2 5 5"/>',
    mirror: '<ellipse cx="12" cy="9" rx="6" ry="7"/><path d="M12 16v6M9 22h6"/>',
    star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6.1L12 16.6 6.6 19.6l1.2-6.1-4.5-4.2 6.1-.7z"/>',
    knife: '<path d="M4 20l9-9M13 11l7-7c1 4-1 8-4 10z"/>',
    needle: '<path d="M5 19L19 5"/><ellipse cx="17.5" cy="6.5" rx="1" ry="2" transform="rotate(45 17.5 6.5)"/><path d="M5 19c-2-3 1-6 4-4"/>',
    drop: '<path d="M12 3c3 4.5 6 8 6 11a6 6 0 0 1-12 0c0-3 3-6.5 6-11z"/>',
    hands: '<path d="M3 11l4-4 5 3 5-3 4 4-7 7a2 2 0 0 1-3 0z"/><path d="M9 12l3 3"/>',
    tag: '<path d="M3 12l9-9h8v8l-9 9z"/><circle cx="16" cy="8" r="1.5"/>',
    good: '<circle cx="12" cy="12" r="8"/><path d="M8 13c2 3 6 3 8 0"/><path d="M9 9.5h.01M15 9.5h.01"/>',
    worry: '<circle cx="12" cy="12" r="8"/><path d="M8 16c2-2 6-2 8 0"/><path d="M9 10h.01M15 10h.01"/>',
    wilt: '<path d="M12 21V11c0-4 4-6 6-4-1 3-3 4-6 4M12 13c-3 0-6-2-6-5 3 0 5 1 6 5"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    flame: '<path d="M12 3c4 4 6 7 6 10a6 6 0 0 1-12 0c0-2 1-4 3-5 0 2 1 3 2 3 0-3 0-5 1-8z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    scales: '<path d="M12 4v16M8 20h8M4 7h16M6 7l-3 6a3 3 0 0 0 6 0zM18 7l-3 6a3 3 0 0 0 6 0z"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c1 1 1 2 1 3.5h6c0-1.5 0-2.5 1-3.5A6 6 0 0 0 12 3z"/>',
    ban: '<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>',
    fog: '<path d="M4 8h13M7 12h13M4 16h12M8 20h9"/>',
    cloud: '<path d="M7 16a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1A4.5 4.5 0 0 1 17 16z"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
    helmet: '<path d="M4 16a8 8 0 0 1 16 0z"/><path d="M3 16h18M12 8v3"/>',
    beads: '<circle cx="12" cy="4.5" r="1.8"/><circle cx="17.3" cy="6.7" r="1.8"/><circle cx="19.5" cy="12" r="1.8"/><circle cx="17.3" cy="17.3" r="1.8"/><circle cx="6.7" cy="17.3" r="1.8"/><circle cx="4.5" cy="12" r="1.8"/><circle cx="6.7" cy="6.7" r="1.8"/><path d="M12 19.5v2.5"/>',
    shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
    mountain: '<path d="M2 20l7-12 4 6 3-4 6 10z"/>',
    flag: '<path d="M5 21V4M5 4h12l-3 4 3 4H5"/>',
    chain: '<rect x="3" y="9" width="9" height="6" rx="3"/><rect x="12" y="9" width="9" height="6" rx="3"/>',
    sun: '<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 7V5M5.5 11.5L4 10M18.5 11.5L20 10"/>',
    mask: '<path d="M4 5h16v6a8 8 0 0 1-16 0z"/><path d="M8 10h2M14 10h2M9 15c2 1.5 4 1.5 6 0"/>',
    hole: '<ellipse cx="12" cy="14" rx="9" ry="4"/><ellipse cx="12" cy="14" rx="5" ry="2" fill="currentColor"/>',
    hand: '<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5a1.5 1.5 0 0 1 3 0v8c0 5-3 8-7 8-3 0-5-2-6-5l-1-3a1.5 1.5 0 0 1 3-1l1 2"/>',
    chair: '<path d="M7 3v18M17 13v8M7 13h10M7 3h8v10"/>',
    jar: '<path d="M9 3h6M10 3v3c-3 1-5 4-5 8 0 4 3 7 7 7s7-3 7-7c0-4-2-7-5-8V3"/>',
    burst: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/>',
    battery: '<rect x="3" y="7" width="16" height="10" rx="1.5"/><path d="M21 10v4M6 10v4"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/>',
    spark: '<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    heart: '<path d="M12 20S3 14 3 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 2.5C21 14 12 20 12 20z"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8M9 18h6"/>',
    leaf: '<path d="M5 19C5 10 10 5 20 4c-1 10-6 15-15 15z"/><path d="M5 19l8-8"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    wrench: '<path d="M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
    bow: '<path d="M6 3c8 3 8 15 0 18M6 3v18M4 12h16M17 9l3 3-3 3"/>',
    coffin: '<path d="M8 2h8l3 6-3 14H8L5 8z"/><path d="M12 7v7M9.5 9.5h5"/>',
    swap: '<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
    cross: '<path d="M6 6l12 12M18 6L6 18"/>',
  };
  const MAP = {
    '🕯': 'candle', '🏮': 'lantern', '👁': 'eye', '🧿': 'eye', '🕸': 'web', '🧧': 'packet', '🎁': 'gift', '🎲': 'dice', '🀄': 'tile',
    '⛩': 'torii', '⛵': 'boat', '🛶': 'boat', '🌑': 'moonNew', '🌒': 'moonCres', '🌓': 'moonFirst', '🌔': 'moonFull', '🌕': 'moonFull',
    '🌖': 'moonFull', '🌗': 'moonLast', '🌘': 'moonLast', '🌙': 'crescent', '💀': 'skull', '☠': 'skull', '⚔': 'swords', '🔊': 'speaker',
    '🔉': 'speaker', '🔈': 'speaker', '🔇': 'mute', '👹': 'demon', '🥤': 'cup', '🪙': 'coin', '💸': 'coin', '🔮': 'orb', '🌀': 'swirl',
    '👑': 'crown', '🐯': 'claw', '🐗': 'tusk', '📜': 'scroll', '🍚': 'bowl', '🪞': 'mirror', '🌟': 'star', '⭐': 'star', '🔪': 'knife',
    '🪡': 'needle', '🩸': 'drop', '💧': 'drop', '🤝': 'hands', '🏷': 'tag', '😊': 'good', '😀': 'good', '🙂': 'good', '😰': 'worry',
    '😟': 'worry', '🥀': 'wilt', '🎯': 'target', '🔥': 'flame', '🔒': 'lock', '⚖': 'scales', '💡': 'bulb', '🚫': 'ban', '🌫': 'fog',
    '🌧': 'cloud', '🔔': 'bell', '⚡': 'bolt', '🪖': 'helmet', '📿': 'beads', '🛡': 'shield', '⛰': 'mountain', '🎏': 'flag', '🚩': 'flag',
    '🏴': 'flag', '⛓': 'chain', '🌇': 'sun', '🌅': 'sun', '🎭': 'mask', '🕳': 'hole', '💅': 'hand', '🪑': 'chair', '🏺': 'jar',
    '💢': 'burst', '🪫': 'battery', '📈': 'chart', '🆕': 'spark', '⚠': 'warn', '❤': 'heart', '🏆': 'trophy', '🍂': 'leaf', '✔': 'check',
    '✅': 'check', '🔧': 'wrench', '📱': 'phone', '🧑': 'person', '👵': 'person', '🧔': 'person', '🏹': 'bow', '⚰': 'coffin', '↔': 'swap',
    '❌': 'cross', '✂': 'cross',
  };
  const NS = 'http://www.w3.org/2000/svg';
  /* 圖示庫：一份隱藏的 <svg><symbol>…，各處用 <use> 引用（同一個圖示全頁只存一份路徑） */
  const sprite = document.createElementNS(NS, 'svg');
  sprite.setAttribute('aria-hidden', 'true');
  sprite.setAttribute('id', 'icSprite');
  sprite.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  sprite.innerHTML = Object.entries(P).map(([k, d]) => `<symbol id="ic-${k}" viewBox="0 0 24 24">${d}</symbol>`).join('');
  const EP = /\p{Extended_Pictographic}️?/u;
  const EPG = /\p{Extended_Pictographic}️?/gu;
  const SKIP = 'svg,script,style,textarea,.icT,#icSprite';
  function icon(ch) {
    const base = ch.replace('️', '');
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'ic');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    const u = document.createElementNS(NS, 'use');
    u.setAttribute('href', '#ic-' + (MAP[base] || 'dot'));
    s.appendChild(u);
    return s;
  }
  function swapText(n) {
    const t = n.nodeValue;
    if (!t || !EP.test(t)) return;
    const p = n.parentNode;
    if (!p || (p.closest && p.closest(SKIP))) return;
    const f = document.createDocumentFragment();
    let last = 0;
    for (const m of t.matchAll(EPG)) {
      if (m.index > last) f.appendChild(document.createTextNode(t.slice(last, m.index)));
      f.appendChild(icon(m[0]));
      const keep = document.createElement('span');   /* 原字留在 DOM（display:none）：textContent 與換之前逐字相同 */
      keep.className = 'icT';
      keep.textContent = m[0];
      f.appendChild(keep);
      last = m.index + m[0].length;
    }
    if (last < t.length) f.appendChild(document.createTextNode(t.slice(last)));
    p.replaceChild(f, n);
  }
  function swapTitle(el) {
    const v = el.getAttribute && el.getAttribute('title');
    if (v && EP.test(v)) el.setAttribute('title', v.replace(EPG, '').replace(/\s{2,}/g, ' ').trim());
  }
  function sweep(root) {
    if (!root) return;
    if (root.nodeType === 3) { swapText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (root.closest(SKIP)) return; swapTitle(root); }
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = [];
    for (let n = tw.nextNode(); n; n = tw.nextNode()) if (EP.test(n.nodeValue)) list.push(n);
    list.forEach(swapText);
    if (root.querySelectorAll) root.querySelectorAll('[title]').forEach(swapTitle);
  }
  function start() {
    document.body.insertBefore(sprite, document.body.firstChild);
    sweep(document.body);
    new MutationObserver((recs) => {
      for (const r of recs) {
        if (r.type === 'characterData') swapText(r.target);
        else if (r.type === 'attributes') swapTitle(r.target);
        else r.addedNodes.forEach(sweep);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title'] });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.__uiIcons = { map: MAP, names: Object.keys(P) };
})();
