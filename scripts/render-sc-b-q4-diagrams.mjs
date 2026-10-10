import { writeFileSync } from 'node:fs';

const start = (width, height) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#111"/></marker></defs><rect width="100%" height="100%" fill="white"/><g stroke="#111" stroke-width="2" fill="none">`;
const box = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const line = (x1, y1, x2, y2, arrow = false, both = false) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${arrow ? ' marker-end="url(#arrow)"' : ''}${both ? ' marker-start="url(#arrow)"' : ''}/>`;
const label = (x, y, text, size = 24) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size}" fill="#111" stroke="none">${text.split('\n').map((s,i) => `<tspan x="${x}" dy="${i ? size + 3 : 0}">${s}</tspan>`).join('')}</text>`;
let svg = start(1000, 450);
svg += box(255,30,510,350) + label(510,62,'W社 本社事務所');
svg += box(25,165,190,80) + label(120,213,'Sサービス');
svg += box(295,155,215,90) + label(402,190,'配送管理用\nPC');
svg += box(570,110,170,85) + label(655,145,'在庫管理\nサーバ');
svg += box(790,330,185,80) + label(882,362,'配送管理\nSaaS');
svg += box(790,110,185,80) + label(882,145,'配送用車両');
svg += line(215,205,295,205,true) + label(255,188,'(1)');
svg += line(510,160,570,150,true,true) + label(545,130,'(2)');
svg += line(510,235,790,370,true) + label(660,290,'(3)');
svg += line(885,330,885,190,true) + label(920,268,'(4)');
svg += label(405,320,'配送管理課員') + line(40,400,120,400,true) + label(205,410,'データの流れ');
writeFileSync('public/questions/sc/b/2023-fall/q4-figure-1.svg', svg + '</g></svg>');

svg = start(1100,600);
svg += box(385,30,690,490) + label(550,65,'W社 本社事務所');
svg += box(25,100,190,70) + box(35,90,190,70) + label(123,123,'配送用スマート\nフォン');
svg += box(25,220,190,80) + label(120,250,'メール\nSaaS');
svg += box(25,360,190,80) + label(120,390,'配送管理\nSaaS');
svg += '<ellipse cx="295" cy="260" rx="55" ry="205"/>' + label(295,250,'インター\nネット',21);
svg += line(225,135,250,135) + line(215,260,240,260) + line(215,400,260,400);
svg += box(425,220,190,80) + label(520,270,'FW');
svg += box(425,100,190,70) + label(520,130,'プロキシ\nサーバ');
svg += line(350,260,425,260) + line(520,170,520,220);
for (const y of [100,220,340]) {
  svg += box(715,y,130,70) + label(780,y+44,'L2SW') + line(615,260,715,y+35);
}
svg += box(920,95,130,85) + label(985,127,'配送管理用\nPC');
svg += line(845,135,920,135);
svg += box(900,205,130,70)+box(910,215,130,70)+box(920,225,130,70)+label(985,251,'その他の\nPC',21);
svg += line(845,255,900,240)+line(845,255,920,260);
for (const [x, txt] of [[600,'ファイル\nサーバ'],[770,'パッチ管理\nサーバ'],[940,'在庫管理\nサーバ']])
  svg += box(x-75,435,150,70)+label(x,462,txt,22)+line(780,410,x,435);
svg += label(320,565,'FW：ファイアウォール',21)+label(785,565,'L2SW：レイヤー2スイッチ',21);
writeFileSync('public/questions/sc/b/2023-fall/q4-figure-2.svg', svg + '</g></svg>');
console.log('2023秋問4のデータフロー・ネットワーク図を再構成');

svg = start(1000,500);
svg += box(25,70,235,330)+label(142,110,'スマートフォン');
svg += box(55,145,175,85)+label(142,176,'G社スマホ\nアプリ');
svg += box(55,280,175,85)+label(142,312,'メール\nアプリ');
svg += '<ellipse cx="360" cy="240" rx="75" ry="65"/>'+label(360,233,'インター\nネット');
svg += line(260,240,285,240)+line(435,240,470,240);
svg += box(470,60,500,290)+label(700,104,'E社クラウドサービス');
svg += box(490,135,460,185)+label(572,170,'Sシステム');
for (const [x,name] of [[510,'サービスK'],[655,'サービスL'],[800,'サービスM']])
  svg += box(x,220,125,60)+label(x+62,257,name,21);
svg += box(470,400,210,65)+label(575,440,'外部サービス');
svg += '<path d="M360 305 V430 H470"/>';
writeFileSync('public/questions/sc/b/2024-spring/q1-figure-2.svg',svg+'</g></svg>');
console.log('2024春問1のサービス構成を再構成');
