import fs from 'fs';
/* 把 index.html 的 <script> 內容在 Node 裡跑起來，回傳 window.__yaoshi（IMPLEMENTATION_GUIDE §6.4 的做法）。
   每次呼叫都是全新的一份（獨立 CFG／獨立 S），可同時載入舊版與新版做對照。 */
export function loadGame(htmlPath){
  const html=fs.readFileSync(htmlPath,'utf8');
  const code=html.match(/<script>[\s\S]*?<\/script>/)[0].replace('<script>','').replace('</script>','');
  const stub=`
  const location={search:''};
  const localStorage={getItem(){return null;},setItem(){}};
  const document={getElementById:()=>null,addEventListener:()=>{},querySelectorAll:()=>[],
    title:'',documentElement:{style:{}},body:{style:{},cssText:'',innerHTML:''}};
  const window={};
  `;
  const fn=new Function('URLSearchParams','Math','JSON','Object','Array','Set','Date','String','Number',
    stub+code+'\nreturn window.__yaoshi;');
  return fn(URLSearchParams,Math,JSON,Object,Array,Set,Date,String,Number);
}
