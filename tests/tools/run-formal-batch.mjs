import {spawn} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../..');
const L1_FORMAL=path.join(HERE,'l1-formal.mjs');

const ARMS=[
  'h1-splitter',
  'h1-water',
  'h1-twinTiger',
  'h1-eyes',
  'h9-normal',
  'h9-zero-water',
  'h9-zero-twinTiger',
  'h9-zero-eyes'
];

export async function runFormalBatch({n=10000,concurrency=3,rawDir,aggDir}={}){
  if(!rawDir) rawDir=path.join(ROOT,'docs/experiments/2026-09-21-l1e-formal/raw');
  if(!aggDir) aggDir=path.join(ROOT,'docs/experiments/2026-09-21-l1e-formal/aggregate');
  
  fs.mkdirSync(rawDir,{recursive:true});
  
  console.log(`Starting formal batch: n=${n}, concurrency=${concurrency}`);
  console.log(`Raw directory: ${rawDir}`);
  console.log(`Aggregate directory: ${aggDir}`);
  
  const queue=[...ARMS];
  const running=new Set();
  
  function runArmProcess(arm){
    return new Promise((resolve,reject)=>{
      const targetFile=path.join(rawDir,`${arm}.json.gz`);
      if(fs.existsSync(targetFile)){
        console.log(`[${arm}] Output already exists at ${targetFile}, skipping.`);
        return resolve({arm,skipped:true});
      }
      
      console.log(`[${arm}] Starting execution for n=${n}...`);
      const child=spawn(process.execPath,[L1_FORMAL,'--arm',arm,'--n',String(n),'--out',rawDir],{
        cwd:ROOT,
        stdio:['ignore','pipe','inherit']
      });
      
      let stdout='';
      child.stdout.on('data',data=>{
        stdout+=data.toString();
      });
      
      child.on('error',reject);
      child.on('exit',code=>{
        if(code===0){
          console.log(`[${arm}] Finished successfully.`);
          resolve({arm,skipped:false,output:stdout.trim()});
        }else{
          reject(new Error(`[${arm}] Process failed with exit code ${code}`));
        }
      });
    });
  }
  
  const pool=new Promise((resolve,reject)=>{
    function next(){
      while(running.size<concurrency&&queue.length>0){
        const arm=queue.shift();
        const p=runArmProcess(arm);
        running.add(p);
        p.then(()=>{
          running.delete(p);
          next();
        }).catch(err=>{
          running.delete(p);
          reject(err);
        });
      }
      if(running.size===0&&queue.length===0){
        resolve();
      }
    }
    next();
  });
  
  await pool;
  console.log('All arms completed. Running aggregation...');
  
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[L1_FORMAL,'--aggregate',rawDir,'--out',aggDir],{
      cwd:ROOT,
      stdio:'inherit'
    });
    child.on('error',reject);
    child.on('exit',code=>{
      if(code===0){
        console.log('Aggregation completed successfully.');
        resolve();
      }else{
        reject(new Error(`Aggregation failed with exit code ${code}`));
      }
    });
  });
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){
  const args=process.argv.slice(2);
  let n=10000;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--n'&&args[i+1]) n=Number(args[++i]);
  }
  runFormalBatch({n}).catch(err=>{
    console.error(err);
    process.exitCode=1;
  });
}
