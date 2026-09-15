/* Non-reveal market-focus geometry RED.
 *
 * Natural fixture: the real seed-1 solo game at 852x393 with synthetic
 * safe-area T/R/B/L=0/59/21/59. It reaches the mark phase through the UI,
 * calls the real pickMark(2), then focuses the same live tray slot.
 *
 * Frozen mark standard (copied from tests/mark-token-scale.test.mjs, not
 * relaxed here): every one of the 4^4=256 legal seat-to-slot assignments must
 * keep all four projected stamps inside x=227..625 and above y=310, and no two
 * projected stamp boxes may overlap. Unlike that unit gate, this probe uses
 * the runtime camera and runtime tray layout.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium, devices } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const PORT = 8996;
const outArg = process.argv.find(arg => arg.startsWith('--out='));
const outFile = path.resolve(ROOT, outArg ? outArg.slice('--out='.length)
  : 'docs/experiments/2026-09-15-a1-opening/market-focus-red.json');
const relativeOut = path.relative(ROOT, outFile);
if (!relativeOut || relativeOut === '..' || relativeOut.startsWith(`..${path.sep}`) || path.isAbsolute(relativeOut))
  throw new Error('--out must be a repository-relative file');

async function reachMarkPhase(page) {
  await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
  for (let i = 0; i < 80; i++) {
    const state = await page.evaluate(() => {
      const button = document.querySelector('#mainbtn');
      return { text: button?.textContent || '', disabled: !button || button.disabled };
    });
    if (!state.disabled && /不盯任何一件/.test(state.text)) return;
    if (!state.disabled) await page.click('#mainbtn');
    else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find(button => !button.disabled)?.click());
    await page.waitForTimeout(180);
  }
  throw new Error('seed 1 did not reach the normal mark phase');
}

async function measureRailSwitches(page) {
  const buttons = page.locator('.railTabs button');
  const count = await buttons.count();
  if (count !== 4) throw new Error(`expected 4 real rail tab buttons, got ${count}`);
  const cases = [];
  for (let index = 0; index < count; index++) {
    const button = buttons.nth(index);
    const target = await button.evaluate(element => ({
      slot: Number(element.dataset.slot),
      rail: element.closest('[id^="rail"]')?.id || null,
      text: element.textContent,
    }));
    const before = await page.evaluate(() => ({ state: JSON.stringify(S), hover: window.__yaoshi3d.tray.hover() }));
    await button.click();
    const after = await page.evaluate(({ rail, slot }) => {
      const selected = rail ? document.querySelector(`#${rail} .railSelected`) : null;
      const pressed = rail ? document.querySelector(`#${rail} .railTabs button[data-slot="${slot}"]`) : null;
      return { state: JSON.stringify(S), hover: window.__yaoshi3d.tray.hover(),
        selectedCard: selected?.id || null, ariaPressed: pressed?.getAttribute('aria-pressed') || null };
    }, target);
    const stateEqual = before.state === after.state;
    const hoverMatches = after.hover === target.slot;
    cases.push({ index, ...target, beforeHover: before.hover, afterHover: after.hover,
      selectedCard: after.selectedCard, ariaPressed: after.ariaPressed,
      stateEqual, stateBefore: before.state, stateAfter: after.state,
      pass: hoverMatches && stateEqual && after.selectedCard === `mc${target.slot}` && after.ariaPressed === 'true' });
  }
  return { cases, pass: cases.length === 4 && cases.every(row => row.pass) };
}

const measure = async () => {
  const { camera, scene, tray } = window.__yaoshi3d;
  const V3 = camera.position.constructor;
  const M4 = camera.matrixWorld.constructor;
  const visible = object => {
    for (let node = object; node; node = node.parent) if (!node.visible) return false;
    return true;
  };
  const rect = selector => {
    const element = document.querySelector(selector);
    const box = element?.getBoundingClientRect();
    if (!box || !element.getClientRects().length || getComputedStyle(element).visibility === 'hidden') return null;
    return { left: box.left, top: box.top, right: box.right, bottom: box.bottom,
      width: box.width, height: box.height };
  };
  const project = points => {
    if (!points.length) return null;
    const box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity, points: points.length };
    const point = new V3();
    for (const world of points) {
      point.copy(world).project(camera);
      const x = (point.x + 1) * innerWidth / 2;
      const y = (1 - point.y) * innerHeight / 2;
      box.left = Math.min(box.left, x); box.right = Math.max(box.right, x);
      box.top = Math.min(box.top, y); box.bottom = Math.max(box.bottom, y);
    }
    box.width = box.right - box.left; box.height = box.bottom - box.top;
    return box;
  };
  const corners = (box, matrix) => {
    const points = [];
    if (!box || box.isEmpty()) return points;
    for (let i = 0; i < 8; i++) points.push(new V3(
      i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y : box.min.y,
      i & 4 ? box.max.z : box.min.z).applyMatrix4(matrix));
    return points;
  };
  const meshCount = root => {
    let count = 0;
    root.traverse(object => { if (visible(object) && object.isMesh && object.geometry) count++; });
    return count;
  };
  const slotX = tray.slotXs()[2];
  const subject = tray.group.children
    .filter(object => object.isObject3D && object.visible && !object.name && meshCount(object))
    .reduce((best, object) => !best || Math.abs(object.position.x - slotX) < Math.abs(best.position.x - slotX) ? object : best, null);
  if (!subject) throw new Error('no live visible market model for slot 2');

  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  const meshPoints = [], bonePoints = [], visiblePoints = [];
  const meshRows = [];
  subject.traverse(object => {
    if (!visible(object) || !object.isMesh || !object.geometry) return;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    const sourceBox = object.geometry.boundingBox;
    const sourcePoints = corners(sourceBox, object.matrixWorld);
    meshPoints.push(...sourcePoints); visiblePoints.push(...sourcePoints);
    let posed = null;
    if (object.isSkinnedMesh) {
      object.skeleton?.update();
      object.computeBoundingBox();
      posed = corners(object.boundingBox, object.matrixWorld);
      bonePoints.push(...posed); visiblePoints.push(...posed);
    }
    meshRows.push({ name: object.name || null, skinned: !!object.isSkinnedMesh,
      source: project(sourcePoints), posed: posed ? project(posed) : null });
  });
  const focusBounds = {
    visible: project(visiblePoints),
    mesh: project(meshPoints),
    bone: project(bonePoints),
    meshes: meshRows,
  };
  const obstacles = Object.fromEntries(['#feltHead', '#helpBtn', '#north', '#west', '#east', '#south']
    .map(selector => [selector, rect(selector)]).filter(([, box]) => box && box.width && box.height));
  const overlaps = (a, b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const focusOverlaps = Object.entries(obstacles).filter(([, box]) => overlaps(focusBounds.visible, box))
    .map(([selector, box]) => ({ selector, box }));

  const props = tray.props;
  const tokens = props.group.getObjectByName('prop-tokens');
  if (!tokens) throw new Error('runtime prop-tokens missing');
  if (!tokens.geometry.boundingBox) tokens.geometry.computeBoundingBox();
  const tokenSource = tokens.geometry.boundingBox;
  const instance = new M4(), world = new M4();
  const markRows = [], markFailures = [];
  let envelope = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  for (let assignment = 0; assignment < 256; assignment++) {
    props.clearRound();
    for (let seat = 0; seat < 4; seat++) props.mark(seat, (assignment >> (seat * 2)) & 3);
    props.update(1);
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const boxes = [];
    for (let i = 0; i < tokens.count; i++) {
      tokens.getMatrixAt(i, instance);
      world.multiplyMatrices(tokens.matrixWorld, instance);
      const box = project(corners(tokenSource, world));
      boxes.push(box);
      envelope.left = Math.min(envelope.left, box.left); envelope.right = Math.max(envelope.right, box.right);
      envelope.top = Math.min(envelope.top, box.top); envelope.bottom = Math.max(envelope.bottom, box.bottom);
      if (box.left < 227 || box.right > 625 || box.bottom > 310)
        markFailures.push({ assignment, kind: 'outside-frozen-safe-rect', token: i, box });
    }
    if (boxes.length !== 4) markFailures.push({ assignment, kind: 'token-count', count: boxes.length });
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      if (overlaps(boxes[i], boxes[j])) markFailures.push({ assignment, kind: 'overlap', pair: [i, j], boxes: [boxes[i], boxes[j]] });
    }
    markRows.push({ assignment, slots: [0, 1, 2, 3].map(seat => (assignment >> (seat * 2)) & 3), boxes });
  }
  return {
    fixture: { seed: 1, viewport: [innerWidth, innerHeight], syntheticSafeInsets: [0, 59, 21, 59],
      action: 'normal UI to mark phase; pickMark(2); tray.setHover(2)' },
    camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov,
      aspect: camera.aspect, view: camera.view ? { ...camera.view } : null },
    focus: { slot: 2, rootPosition: subject.position.toArray(), rootScale: subject.scale.toArray(),
      bounds: focusBounds, obstacles, overlaps: focusOverlaps,
      pass: !!focusBounds.visible && focusOverlaps.length === 0 },
    marks: { standard: { xMin: 227, xMax: 625, bottomMax: 310, assignments: 256, tokensEach: 4,
        overlapAllowed: false }, assignmentsChecked: markRows.length, envelope, failures: markFailures, rows: markRows,
      pass: markRows.length === 256 && markFailures.length === 0 },
  };
};

const server = await serve(ROOT, PORT);
let browser;
const errors = [];
let result;
let railSwitches;
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ ...devices['iPhone 14 Pro'], viewport: { width: 852, height: 393 } });
  await context.addInitScript(() => localStorage.setItem('yaoshi_intro_v1', '1'));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push('pageerror: ' + String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__yaoshi3d?.tray && !!window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(() => {
    for (const [side, value] of Object.entries({ top: 0, right: 59, bottom: 21, left: 59 }))
      document.documentElement.style.setProperty(`--safe-${side}`, `${value}px`);
  });
  await reachMarkPhase(page);
  await page.waitForFunction(() => document.querySelector('#north')?.getBoundingClientRect().left >= 59);
  await page.evaluate(async () => {
    await window.__yaoshi3d.tray.loaded();
    pickMark(2);
    await window.__yaoshi3d.tray.loaded();
    window.__yaoshi3d.tray.setHover(2);
  });
  await page.waitForTimeout(1400);
  result = await page.evaluate(measure);
  railSwitches = await measureRailSwitches(page);
  await context.close();
} catch (error) {
  errors.push('fatal: ' + String(error?.stack || error));
} finally {
  try { await browser?.close(); } finally { server.kill(); }
}

const report = { tool: 'tests/tools/market-focus-check.mjs', port: PORT, errors, ...result, railSwitches };
report.pass = !!result && result.focus.pass && result.marks.pass && railSwitches?.pass && errors.length === 0;
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n');
const summary = { pass: report.pass, errors: errors.length,
  focus: result && { pass: result.focus.pass, visible: result.focus.bounds.visible,
    mesh: result.focus.bounds.mesh, bone: result.focus.bounds.bone, overlaps: result.focus.overlaps },
  marks: result && { pass: result.marks.pass, assignmentsChecked: result.marks.assignmentsChecked,
    failures: result.marks.failures.length, envelope: result.marks.envelope },
  railSwitches: railSwitches && { pass: railSwitches.pass, cases: railSwitches.cases.map(row => ({
    index: row.index, rail: row.rail, slot: row.slot, beforeHover: row.beforeHover, afterHover: row.afterHover,
    selectedCard: row.selectedCard, ariaPressed: row.ariaPressed, stateEqual: row.stateEqual, pass: row.pass })), },
  evidence: relativeOut.replaceAll('\\', '/') };
console.log(JSON.stringify(summary, null, 2));
if (!report.pass) process.exitCode = 1;
