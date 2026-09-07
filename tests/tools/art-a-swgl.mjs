/* 美術甲卷的邊界測試（2026-09-07）：**軟體 GL（SwiftShader）上不得有 console error**。
   為什麼要測這一條：v0.46 把 bloom 的合成那一趟從 RawShaderMaterial 換成 ShaderMaterial
   （才吃得到 three 注入的 tonemapping／colorspace），而 js/bloom.js 檔頭記載 ShaderMaterial
   在 SwiftShader 上會連結失敗。理論上 renderer.js 的 bloomOK 會在軟體 GL 上完全不呼叫
   bloom.render()，那支 program 就不會被編譯——這支治具是去真的把它跑一遍，不是用推論放行。
   跑法：node tests/tools/art-a-swgl.mjs [--port=8971] [--root=<靜態根目錄>] [--duels=2]
   判定：console／pageerror 0 筆，且 window.__yaoshi3d.bloomOn === false（確認真的走到軟體 GL 那條）。 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { drive, serve, parseArgs } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const { opt } = parseArgs(process.argv.slice(2));
const PORT = Number(opt.port || 8971);
const SRC_ROOT = opt.root ? path.resolve(opt.root) : ROOT;

const srv = await serve(SRC_ROOT, PORT);
try {
  // 不給 --use-gl=angle：headless chromium 退回 SwiftShader（軟體光柵）
  const browser = await chromium.launch({ args: ['--disable-gpu', '--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
  let gl = null;
  const r = await drive(page, `http://127.0.0.1:${PORT}/index.html?paperwar=1`, {
    duels: Number(opt.duels || 2),
    onDuel: async (pg) => {
      await pg.waitForTimeout(900);
      gl = await pg.evaluate(() => {
        const Y3 = window.__yaoshi3d;
        return Y3 ? { bloomOn: Y3.bloomOn, glName: Y3.glName, programs: Y3.renderer.info.programs.length } : null;
      });
    },
  });
  await browser.close();
  const pass = r.errors.length === 0;
  console.log(JSON.stringify({ gl, errors: r.errors.length, sample: r.errors.slice(0, 6), pass }, null, 1));
  process.exit(pass ? 0 : 1);
} finally { srv.kill(); }
