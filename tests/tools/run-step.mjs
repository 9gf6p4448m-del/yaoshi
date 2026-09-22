import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ARMS, ARM_CONFIG, runArm, writeArm, aggregate, readArms, writeAggregate} from './l1-formal.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../..');
const RAW_DIR=path.join(ROOT,'docs/experiments/2026-09-21-l1e-formal/raw');
const CHUNKS_DIR=path.join(RAW_DIR,'chunks');
const AGG_DIR=path.join(ROOT,'docs/experiments/2026-09-21-l1e-formal/aggregate');

const CHUNK_SIZE=2500;
const TOTAL_SEEDS=10000;
const CHUNKS_PER_ARM=TOTAL_SEEDS/CHUNK_SIZE; // 4 chunks per arm

fs.mkdirSync(RAW_DIR,{recursive:true});
fs.mkdirSync(CHUNKS_DIR,{recursive:true});

export function getStatus(){
  const armStatus={};
  for(const arm of ARMS){
    const completedFile=path.join(RAW_DIR,`${arm}.json.gz`);
    if(fs.existsSync(completedFile)){
      armStatus[arm]={completed:true,chunks:CHUNKS_PER_ARM};
    }else{
      let chunkCount=0;
      for(let c=0;c<CHUNKS_PER_ARM;c++){
        const chunkFile=path.join(CHUNKS_DIR,`${arm}_chunk_${c}.json`);
        if(fs.existsSync(chunkFile)) chunkCount++;
      }
      armStatus[arm]={completed:false,chunks:chunkCount};
    }
  }
  return armStatus;
}

export function runNextStep(){
  const status=getStatus();
  // Check if all arms are completed
  const allCompleted=ARMS.every(arm=>status[arm].completed);
  if(allCompleted){
    const summaryFile=path.join(AGG_DIR,'summary.json');
    if(!fs.existsSync(summaryFile)){
      console.log('All arms completed. Performing aggregation...');
      writeAggregate(aggregate(readArms(RAW_DIR)),AGG_DIR);
      console.log('Aggregation complete! Generated summary.json and report.md.');
    }else{
      console.log('All arms and aggregation are already completed.');
    }
    return {done:true};
  }

  // Find first incomplete arm
  for(const arm of ARMS){
    if(status[arm].completed) continue;
    const nextChunk=status[arm].chunks;
    const startSeed=nextChunk*CHUNK_SIZE+1;
    const endSeed=startSeed+CHUNK_SIZE-1;
    const seeds=Array.from({length:CHUNK_SIZE},(_,i)=>startSeed+i);
    
    console.log(`[${arm}] Running chunk ${nextChunk+1}/${CHUNKS_PER_ARM}: seeds ${startSeed}..${endSeed}...`);
    const t0=Date.now();
    const artifactChunk=runArm(arm,{seeds});
    const elapsed=((Date.now()-t0)/1000).toFixed(1);
    
    // Save chunk
    const chunkFile=path.join(CHUNKS_DIR,`${arm}_chunk_${nextChunk}.json`);
    fs.writeFileSync(chunkFile,JSON.stringify(artifactChunk));
    console.log(`[${arm}] Chunk ${nextChunk+1}/${CHUNKS_PER_ARM} finished in ${elapsed}s.`);
    
    // If this was the last chunk, merge into final arm artifact
    if(nextChunk+1===CHUNKS_PER_ARM){
      console.log(`[${arm}] All ${CHUNKS_PER_ARM} chunks ready. Merging into final arm artifact...`);
      const allRows=[];
      let baseArtifact=null;
      for(let c=0;c<CHUNKS_PER_ARM;c++){
        const f=path.join(CHUNKS_DIR,`${arm}_chunk_${c}.json`);
        const data=JSON.parse(fs.readFileSync(f,'utf8'));
        if(c===0) baseArtifact=data;
        allRows.push(...data.rows);
      }
      
      const fullArtifact={
        ...baseArtifact,
        seeds:Array.from({length:TOTAL_SEEDS},(_,i)=>i+1),
        rows:allRows
      };
      
      const finalGz=writeArm(fullArtifact,RAW_DIR);
      console.log(`[${arm}] Successfully written ${finalGz}. Cleaning up chunk files...`);
      for(let c=0;c<CHUNKS_PER_ARM;c++){
        fs.unlinkSync(path.join(CHUNKS_DIR,`${arm}_chunk_${c}.json`));
      }
      console.log(`[${arm}] COMPLETED (${TOTAL_SEEDS} seeds)!`);
    }
    
    return {done:false,arm,chunk:nextChunk+1,totalChunks:CHUNKS_PER_ARM};
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){
  const runAll=process.argv.includes('--all');
  if(runAll){
    let result;
    do{
      result=runNextStep();
      console.log('Result:',result);
    }while(!result.done);
  }else{
    const result=runNextStep();
    console.log('Result:',result);
  }
}