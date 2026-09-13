/* 妖市 — 治具旗標的白名單守衛（唯一一份）
   2026-09-13 覆審 r4 MEDIUM-3：`blindread-sheet.mjs` 早就有這道守衛，而剛加上
   `--mate／--mategap／--foe` 的 `traitfx-drive.mjs` 沒有 ⇒ 同一個危險效果**兩個入口只堵了一個**
   （`02 §6.1` 第 7 條）。實測：`--mateGap=1.9`（大寫 G）在 drive 上**靜默**被丟掉，
   量到的是另一個站位，而報告 §6.4 給人抄的指令寫的正是大寫 G 的那一種。

   危險的效果是「旗標打錯 ⇒ 實際跑的規格與操作者以為的不同」，所以：
     ① 鍵一律**正規化成小寫**（`--mateGap` 與 `--mategap` 同義，打對意思就照做）；
     ② 不認得的 `--xxx` **當場 throw**（黑名單擋不住沒想到的拼法）。 */

/** 把 `--a=b`／`--a` 解析成 `{ pos, opt }`，鍵一律小寫；不認得的旗標當場 throw。
 *  `known`＝這一支真的吃的旗標（分母），`who`＝出現在錯誤訊息裡的治具名。 */
export function parseFlags(argv, known, who) {
  const pos = [];
  const opt = {};
  const bad = [];
  for (const a of argv) {
    const m = a.match(/^--([a-zA-Z0-9_-]+)(?:=([\s\S]*))?$/);
    if (!m) { pos.push(a); continue; }
    const k = m[1].toLowerCase();
    if (known.indexOf(k) < 0) { bad.push(m[1]); continue; }
    opt[k] = m[2] === undefined ? true : m[2];
  }
  if (bad.length) {
    throw new Error(`${who}：不認得的旗標 --${bad.join('／--')}——這一支只認 `
      + `${known.map((k) => '--' + k).join(' ')}；打錯會靜默跑成另一種規格，所以一律當場停（覆審 r2 L4／r4 MEDIUM-3）。`);
  }
  return { pos, opt };
}

/** 只做檢查、不解析（給還在用自己那套解析的治具）。 */
export function assertKnownFlags(argv, known, who) {
  const bad = argv.filter((x) => x.startsWith('--'))
    .map((x) => x.replace(/^--/, '').split('=')[0].toLowerCase())
    .filter((k) => known.indexOf(k) < 0);
  if (bad.length) {
    throw new Error(`${who}：不認得的旗標 --${bad.join('／--')}——這一支只認 `
      + `${known.map((k) => '--' + k).join(' ')}；打錯會靜默跑成另一種規格，所以一律當場停（覆審 r2 L4／r4 MEDIUM-3）。`);
  }
}
