/* 妖市 — P4 材料規格「同伴換成不同體型的同系模型」的**唯一一份**對照表
   （2026-09-13 P4 第 2 輪材料規格，製作人指示；第 3 輪回修時由 blindread-sheet.mjs 搬出來共用）。

   ★為什麼要單獨一支★：`traitfx-drive.mjs` 也要能在**同一個同伴設定**下量 anchor
   （P4 第 3 輪回修 (b)：媽祖令旗換同伴之後旗掃到底有沒有碰到新同伴的佔地）。
   照抄第二份到 drive 就是下一個分岔——材料換了同伴、量測沒換，兩邊各說各話。
   ★它是材料規格，不是判準★：不帶 `--mate` 時兩支治具都與第 1 輪材料一個位元組不變。
   ★不放進 `fx-consts.mjs`★：那一支是門檻／時長的凍結檔（覆審逐輪對它做零 diff 核對）。 */

/** 逐系、逐施招者體型挑一個「同系、`body` 不同、`ab` 也不同」的同伴模型（`ab:body`）。 */
export const MATE_BY_FAC = {
  zuling: { elite: 'shield:ward', ward: 'bow:elite', swarm: 'shield:ward', haunt: 'bow:elite' },
  xianghuo: { elite: 'flag:ward', ward: 'sword:elite', swarm: 'flag:ward', haunt: 'sword:elite' },
  yinqi: { elite: 'redhat:haunt', ward: 'redhat:haunt', swarm: 'nail:elite', haunt: 'nail:elite' },
};

/** `--mate=<值>` → 治具頁的 `&mate=` 後綴。`auto` 走上表；空字串＝不帶（站位與模型都不變）。
 *  `c`＝這一案（要有 `fac`／`body`／`ab`／`trait`）。挑到與施招者同一個模型時當場 throw：
 *  那就失去「兩尊分得出來」的意義，靜默放行等於材料規格失效。 */
export function mateQuery(value, c) {
  if (!value) return '';
  if (value !== 'auto') return '&mate=' + encodeURIComponent(value);
  const t = (MATE_BY_FAC[c.fac] || {})[c.body];
  if (!t) throw new Error(`--mate=auto 沒有 ${c.fac}／${c.body} 的同伴模型（見 tests/tools/fx-mate.mjs 的 MATE_BY_FAC）`);
  if (t.split(':')[0] === c.ab) throw new Error(`--mate=auto 為 ${c.trait} 挑到與施招者同一個模型（${t}）——那就失去「兩尊分得出來」的意義`);
  return '&mate=' + encodeURIComponent(t);
}
