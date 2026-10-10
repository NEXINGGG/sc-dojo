import {readFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const assets=[
 '2025-fall/q2-figure-1','2025-fall/q3-figure-1','2025-fall/q3-figure-4','2025-fall/q3-figure-5','2025-fall/q4-figure-1','2025-fall/q4-figure-3',
 '2025-spring/q3-figure-1','2025-spring/q3-figure-7','2025-spring/q4-figure-1','2025-spring/q2-figure-3','2024-fall/q3-figure-1',
];
mkdirSync('tmp/sc-b-completion/diagrams',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1300}});
 for(const asset of assets){
  const source=readFileSync('public/questions/sc/b/'+asset+'.svg','utf8');
  await page.setContent('<style>body{margin:0}svg{display:block;width:100%;height:auto}</style>'+source);
  await page.locator('svg').screenshot({path:'tmp/sc-b-completion/diagrams/'+asset.replace('/','-')+'.png'});
 }
}finally{await browser.close();}
console.log('再構成図11件を画像化。紙面との目視照合用。');
