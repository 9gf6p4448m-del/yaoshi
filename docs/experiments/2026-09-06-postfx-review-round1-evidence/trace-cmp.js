const fs = require('fs');
function run(file) {
  const html = fs.readFileSync(file, 'utf8');
  const code = html.match(/<script>[\s\S]*?<\/script>/)[0].replace('<script>', '').replace('</script>', '');
  const stub = `
global.location = { search: '' };
global.document = { getElementById: ()=>null, addEventListener:()=>{}, title:'',
  documentElement:{style:{}}, body:{style:{},cssText:''} };
global.window = {};
`;
  const fn = new Function('require', 'module', 'exports', stub + code + '\nreturn trace;');
  const trace = fn(require, { exports: {} }, {});
  return trace([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
}
const a = JSON.stringify(run(process.argv[2]));
const b = JSON.stringify(run(process.argv[3]));
console.log('old bytes', a.length, 'new bytes', b.length);
console.log(a === b ? 'IDENTICAL' : 'DIFFERENT');
if (a !== b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      console.log('first diff at', i);
      console.log('old:', a.slice(Math.max(0, i - 120), i + 120));
      console.log('new:', b.slice(Math.max(0, i - 120), i + 120));
      break;
    }
  }
}
