import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pilotQ1Materials,pilotQ1Knowledge} from './sc-b-final-pilot-q1.mjs';
import {pilotQ2Materials,pilotQ2Knowledge} from './sc-b-final-pilot-q2.mjs';
import {pilotQ3Materials,pilotQ3Knowledge} from './sc-b-final-pilot-q3.mjs';
import {pilotQ4Materials,pilotQ4Knowledge} from './sc-b-final-pilot-q4.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const hash=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
const path='data/sc-b-cases-2023-2025-ready.json';
const data=read(path),pilot=read('data/sc-b-pilot-2025-fall.json');
const patches={1:{materials:pilotQ1Materials,knowledge:pilotQ1Knowledge},2:{materials:pilotQ2Materials,knowledge:pilotQ2Knowledge},3:{materials:pilotQ3Materials,knowledge:pilotQ3Knowledge},4:{materials:pilotQ4Materials,knowledge:pilotQ4Knowledge}};
for(const original of process.argv.includes('--proof-only')?[]:pilot.cases){
 const patch=patches[original.questionNumber]; if(!patch)continue;
 const c=data.cases.find(c=>c.source_id===original.source_id);
 c.body.sections=structuredClone(original.body.sections);
 for(const s of c.body.sections)for(const p of s.paragraphs){p.sectionId=s.id;p.paragraphId=p.id;}
 c.body.materials=original.body.materials.map(m=>{
  const change=patch.materials[m.id]; if(!change)throw Error(c.source_id+'/'+m.id+':分類/原文が未校閲');
  const result={...structuredClone(m),...change};
  if(['A','B','C'].includes(result.classification)){delete result.assetUrl;delete result.assetHash;delete result.sourceCrop;delete result.alt;}
  return result;
 });
 c.body.originalPages=[];c.body.originalPageMode=false;
 c.body.figureTableInventory=c.body.materials.map(m=>({id:m.id,label:m.caption.split(' ')[0],caption:m.caption.split(' ').slice(1).join(' '),kind:m.kind,classification:m.classification,printedPage:m.printedPage,printedPages:m.printedPages??[m.printedPage],pageRef:m.id,classificationStatus:'visual_inventory_checked',textRenderingStatus:m.renderText?'structured':'cropped_image',...(m.imageReason?{imageReason:m.imageReason}:{})}));
 c.questionUnits=structuredClone(original.questionUnits);
 for(const u of c.questionUnits){
  if(!patch.knowledge[u.label])throw Error(u.questionId+':必要知識の校閲待ち');
  u.explanation.necessaryKnowledge=patch.knowledge[u.label];
 }
}
if(!process.argv.includes('--proof-only'))writeFileSync(path,JSON.stringify(data,null,2)+'\n');
const proofs=pilot.cases.filter(c=>patches[c.questionNumber]).map(original=>{
 const current=data.cases.find(c=>c.source_id===original.source_id);
 return {source_id:original.source_id,originalMaterialHash:hash(original.body.materials),structuredMaterialHash:hash(current.body.materials),materialIds:current.body.materials.map(m=>m.id),method:'IPA公式紙面を再読し，全セル・手順を転記。既存の段落・設問・公式答案・学習支援を維持し，必要知識だけを補足。詳細と正本hashは最終二次校閲記録に保存。'};
});
writeFileSync('data/sc-b-v1-pilot-material-review.json',JSON.stringify({entries:proofs},null,2)+'\n');
console.log('2025秋pilotの図表を構造化: '+proofs.length+'大問。校閲完了承認は別工程。');
