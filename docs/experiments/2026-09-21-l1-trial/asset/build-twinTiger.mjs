import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const source = JSON.parse(readFileSync(path.join(root, 'assets/creatures/tiger_c.json'), 'utf8'));
const model = structuredClone(source);
model.name = 'twinTiger_l1';
model._variant = '雙虎滅煞 L1 試玩候選：虛構融合獸，非新真實神祇考據。黑金為已批准色例外，紅綬帶保留香火線索。';
model._provenance = '由 assets/creatures/tiger_c.json 複製骨架、四足低伏比例及 idle/move/attack 動畫；新鍵獨立建模，不改原虎。';
model._brief = '長身低伏的四足黑虎將；黑漆底、金色捲雲虎紋、寬肩金護片、深臉白牙、紅綬帶。威嚴鎮煞，不可圓潤可愛。';
model.palette.fur_body.color = '#171715';
model.palette.fur_head.color = '#1b1918';
model.palette.fur_jaw.color = '#29231e';
model.palette.fur_tail.color = '#1c1a18';
model.palette.fur_leg.color = '#24211d';
model.palette.fur_paw.color = '#1b1917';
model.palette.stripe.color = '#c99b35';
model.palette.glow_mane.color = '#b58b31';
model.palette.glow_tail.color = '#d2aa48';
model.palette.mouth_glow.color = '#bb7223';
model.palette.glow_seal.color = '#d6b657';
model.palette.shoulder_gold = { color: '#cba748', rough: 0.38 };
model.shading.noise.amount = 0.12;
model.volumes[0].colors.arcs = [
  { from: 0, to: 20, color: '#2a261d' },
  { from: 82.5, to: 90, color: '#8d6a2c' },
  { from: 97.5, to: 120, color: '#c7b89a' },
  { from: 127.5, to: 180, color: '#151412' }
];
// The paired shoulder plates sit just above the front legs and stay with the torso bone.
for (const around of [63, 117]) {
  model.parts.push({
    type: 'fin', host: 'Chest', material: 'shoulder_gold', thickness: 0.045,
    anchor: { chain: 'body', t: 0.70, around },
    udir: [0, 0.35, 0.94], vdir: [1, 0, 0],
    points: [[-0.19,-0.12],[0.12,-0.15],[0.26,-0.07],[0.25,0.11],[0.06,0.19],[-0.19,0.12]]
  });
}
writeFileSync(path.join(root, 'assets/creatures/twinTiger.json'), JSON.stringify(model, null, 2) + '\n');
