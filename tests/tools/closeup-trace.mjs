// 近景切鏡卷 批 1（v0.45）P0 的引擎等價：純演出卷，trace(1..20) 必須與基準逐位元組相等。
// 作法照 docs/IMPLEMENTATION_GUIDE.md §6.4（Node 直接載 index.html 的 <script> 執行）。
//   node tests/tools/closeup-trace.mjs <舊 index.html> <新 index.html>
import fs from 'node:fs';

const [oldPath, newPath] = process.argv.slice(2);
if (!oldPath || !newPath) { console.error('need <old.html> <new.html>'); process.exit(2); }

function runTrace(file) {
  const html = fs.readFileSync(file, 'utf8');
  const code = html.match(/<script>[\s\S]*?<\/script>/)[0].replace('<script>', '').replace('</script>', '');
  const stub = `
global.location = { search: '' };
global.document = { getElementById: ()=>null, addEventListener:()=>{}, title:'',
  documentElement:{style:{}}, body:{style:{},cssText:''} };
global.window = {};
`;
  const fn = new Function('require', `${stub}${code}\nreturn trace;`);
  const trace = fn(undefined);
  return JSON.stringify(trace([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]));
}

const a = runTrace(oldPath);
const b = runTrace(newPath);
console.log(JSON.stringify({ old: oldPath, new: newPath, oldLen: a.length, newLen: b.length, identical: a === b }));
if (a !== b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) { console.log('first diff at', i, JSON.stringify(a.slice(i - 120, i + 120)), '||', JSON.stringify(b.slice(i - 120, i + 120))); break; }
  }
  process.exit(1);
}
