import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {ARMS,runArm,aggregate} from './l1-formal.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const sourcePath=path.join(HERE,'l1-formal.mjs');
const source=fs.readFileSync(sourcePath,'utf8');
const event={round:1,phase:'auction',mutationSequence:1};
const arms=ARMS.map(arm=>runArm(arm,{seeds:[1,2]}));
const normal=arms.find(a=>a.arm==='h9-normal');
const zero=arms.find(a=>a.arm==='h9-zero-water');
for(const row of normal.rows){row.winnerId=2;row.holders.water=[2];row.first.water={2:event};}
zero.rows[0].winnerId=1;zero.rows[0].holders.water=[1];zero.rows[0].first.water={1:event};
zero.rows[1].winnerId=2;zero.rows[1].holders.water=[1];zero.rows[1].first.water={1:event};
const baseline=aggregate(arms,{requiredSeeds:[1,2]}).h9.water;
if(baseline.differencePp!==50||baseline.normal.winnerHolderGames!==2)
  throw Error('baseline fixture is not discriminating');

function mutant(from,to){
  if(source.split(from).length!==2) throw Error(`mutation target must occur exactly once: ${from}`);
  let code=source.replace(from,to);
  for(const name of ['load','l1-balance','l1-information']){
    const spec=`from './${name}.mjs'`;
    code=code.replace(spec,`from '${pathToFileURL(path.join(HERE,`${name}.mjs`)).href}'`);
  }
  code=code.replace('const HERE=path.dirname(fileURLToPath(import.meta.url));',
    `const HERE=${JSON.stringify(HERE)};`);
  code=code.replace('const ownFile=fileURLToPath(import.meta.url);',
    `const ownFile=${JSON.stringify(sourcePath)};`);
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

const seatZero=await mutant('holders.includes(row.winnerId)','holders.includes(0)');
const inverted=await mutant('normal.winnerHolderRate-zero.winnerHolderRate',
  'zero.winnerHolderRate-normal.winnerHolderRate');
const seatZeroResult=seatZero.aggregate(arms,{requiredSeeds:[1,2]}).h9.water;
const invertedResult=inverted.aggregate(arms,{requiredSeeds:[1,2]}).h9.water;
if(seatZeroResult.normal.winnerHolderGames===baseline.normal.winnerHolderGames||
  invertedResult.differencePp===baseline.differencePp) throw Error('mutant survived');
console.log(JSON.stringify({baseline:{winnerHolderGames:baseline.normal.winnerHolderGames,
  differencePp:baseline.differencePp},mutants:[
  {name:'seat-zero-holder-instead-of-all-four',outcome:'killed',
    observedWinnerHolderGames:seatZeroResult.normal.winnerHolderGames},
  {name:'invert-normal-minus-zero',outcome:'killed',
    observedDifferencePp:invertedResult.differencePp}],requiredSeeds:[1,2]},null,2));
