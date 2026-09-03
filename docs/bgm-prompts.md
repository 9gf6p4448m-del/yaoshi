# 妖市 BGM 生成指令稿（Google Flow Music / Lyria）

> 流程比照排球夢（2026-08-30）：**在 flowmusic.app 生成，下載那一下必須使用者親手點**——
> Chrome 只認真人手勢，程式合成的點擊觸發不了下載。生成完把 WAV 丟給我，我做節錄、
> 60 秒無縫環、響度對齊、轉 `.m4a`，再放進 `assets/audio/bgm/` 並把 `bgm.js` 的
> `READY` 旗標翻成 `true`。規格見 `art-integration-guide.md` §9。

## 怎麼用

每一首都給了**兩個候選 prompt**（甲／乙），風格差一點，各生一次、挑好聽的那個。
四首共八次生成。若某一首兩個都不喜歡，跟我說你不喜歡哪裡，我改 prompt 再來一輪。

**四首都要加的共同條件**（Flow Music 若有獨立欄位就填在那裡，沒有就已經寫進 prompt 了）：
- `instrumental only, no vocals, no singing, no chanting`（排球夢踩過人聲混入的坑）
- `seamless loop, no fade in, no fade out, consistent energy throughout`
- 長度取最長，我再節錄——素材長比較好剪環

---

## 1. `title` — 標題／選角畫面「妖市夜」

**要的感覺**：燈籠一盞盞亮起來的深夜市集，神秘但不恐怖，讓人想走進去。這是玩家看到的第一個畫面。

**甲（東方民樂路線）**
```
Slow mysterious Taiwanese folk ambient, 62 BPM. Solo erhu playing a sparse pentatonic
melody over a low drone, bamboo dizi flute answering in the distance, occasional soft
temple bell and wood block. Reverberant night-market atmosphere, lantern-lit and hushed.
Minor pentatonic, patient and unhurried, inviting rather than frightening.
Instrumental only, no vocals, no singing, no chanting. Seamless loop, no fade in or out.
```

**乙（電子＋民樂混血路線）**
```
Dark ambient world fusion, 60 BPM. Deep sub bass drone with slow analog pad swells,
plucked moon lute (yueqin) figures drifting in and out, bowed erhu long tones,
sparse hand-percussion. Cinematic and mystical, a night market that is not quite of this world.
Instrumental only, no vocals, no singing, no chanting. Seamless loop, no fade in or out.
```

---

## 2. `market` — 牌桌／暗標常駐「暗中出價」

**要的感覺**：全局待最久的一首（12 夜都在放），所以**不能有記憶點太強的旋律**，
要能壓在文字與音效底下。要的是「懸著、算計、不敢出聲」的張力，不是熱鬧。

**甲（律動優先，推薦當首選）**
```
Minimal tense underscore, 84 BPM. Repeating plucked guzheng ostinato in a low register,
muted frame drum pulse, soft breathy bamboo flute textures with no clear melody,
subtle bass movement. Restrained, suspenseful, background-safe — designed to sit under
dialogue and sound effects without competing. No big melodic hooks, no crescendos.
Instrumental only, no vocals, no singing, no chanting. Seamless loop, no fade in or out.
```

**乙（氛圍優先）**
```
Sparse dark ambient with Asian folk color, 78 BPM. Sustained low strings and a barely-moving
drone, occasional single yueqin plucks and distant metallic shimmer, no drum kit,
very light heartbeat-like pulse. Cold, watchful, patient. Extremely restrained dynamics,
stays quiet the whole time.
Instrumental only, no vocals, no singing, no chanting. Seamless loop, no fade in or out.
```

---

## 3. `duel` — 對決場景「交手」

**要的感覺**：兩個妖怪短兵相接。台灣廟會陣頭的鑼鼓，快、狠、有煞氣。時間很短（幾秒到十幾秒），
所以**一進來就要有能量**，不能慢慢鋪。

**甲（廟會陣頭路線，推薦當首選）**
```
Aggressive Taiwanese temple procession percussion, 128 BPM. Driving gong-and-drum ensemble
(luogu) with crashing cymbals, piercing suona horn stabs, low taiko-like floor toms.
Starts at full intensity immediately, relentless and ritualistic, dangerous.
Instrumental only, no vocals, no singing, no chanting. Seamless loop, no fade in or out.
```

**乙（電子強化路線）**
```
Hybrid orchestral-electronic battle cue, 132 BPM. Distorted sub bass and industrial hits
layered with Chinese gongs, cymbal crashes and a shrill suona motif, fast tom pattern.
Immediate high energy, no build-up, aggressive and supernatural.
Instrumental only, no vocals, no singing, no chanting. Seamless loop, no fade in or out.
```

---

## 4. `review` — 局末結果／本局回顧「天明」

**要的感覺**：市集散了、天亮了。有人活下來、有人沒有。收束、釋然，帶一點惆悵，不要勝利進行曲。

**甲（獨奏收束）**
```
Gentle reflective outro, 58 BPM. Solo erhu melody over warm sustained strings, sparse piano
notes, a single distant temple bell. Melancholy but resolving, dawn breaking after a long
night. Warm, spacious, unhurried.
Instrumental only, no vocals, no singing, no chanting. Seamless loop, no fade in or out.
```

**乙（環境收束）**
```
Warm ambient epilogue, 56 BPM. Soft pad washes with a slow bamboo flute line, light
guzheng arpeggios fading in and out, very gentle low drone. Peaceful and bittersweet,
the quiet after the market closes.
Instrumental only, no vocals, no singing, no chanting. Seamless loop, no fade in or out.
```

---

## 拿到檔案之後（我做的事，你不用管）

1. 節錄成 60 秒左右、首尾 crossfade 成聽不出接點的無縫環
2. 四首響度對齊：`market` 最低（要壓在文字底下）、`duel` 略高、`title`／`review` 稍亮
3. 轉 `.m4a`，四首合計壓在 4 MB 以內（單檔遊戲＋PWA）
4. 放進 `assets/audio/bgm/`，把 `bgm.js` 的 `READY` 對應行改成 `true`
5. 實跑驗四個場景切換、風聲有被壓低、console 0 error，再推上線

★**我聽不到聲音**——好不好聽、有沒有混進人聲、環的接點順不順，只有你能判斷。
不對就換備選那首，或告訴我哪裡不對，我改 prompt 重來。
