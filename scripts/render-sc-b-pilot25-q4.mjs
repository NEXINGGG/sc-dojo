import {writeFileSync} from 'node:fs';
const t=(x,y,text)=>'<text x="'+x+'" y="'+y+'" fill="#111" stroke="none">'+text+'</text>';
const b=(x,y,w,h,text)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="white"/>'+t(x+10,y+32,text);
const start=(w,h)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'"><rect width="'+w+'" height="'+h+'" fill="white"/><g stroke="#111" stroke-width="2" fill="none" font-family="sans-serif" font-size="23">';
const out=(n,s)=>writeFileSync('public/questions/sc/b/2025-fall/q4-figure-'+n+'.svg',s+'</g></svg>');
let s=start(1100,650)+'<path d="M240 275 H330 M330 135 V425 M330 135 H410 M330 275 H410 M330 425 H410 M285 275 V565 H340 M610 135 H670 M670 135 V265 H750 M670 135 H750 M610 425 H670 M670 425 V605 H750 M670 425 H750 M670 515 H750"/>';
s+=b(30,245,210,65,'社長')+b(410,105,200,65,'総務部')+b(410,245,200,65,'営業部')+b(410,395,200,65,'製造部')+b(750,105,300,65,'総務課')+b(750,235,300,65,'情報システム課')+b(750,395,300,65,'設計課')+b(750,485,300,65,'製造課')+b(750,575,300,65,'品質保証課')+b(235,535,210,65,'CISO');
out(1,s);
s=start(1600,1260);
const boundary=(x,y,w,h,label)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" stroke-dasharray="10 7"/>'+t(x+12,y+30,label);
s+=boundary(20,270,275,550,'サーバ室')+boundary(410,720,260,180,'総務部')+boundary(410,940,260,180,'営業部')+boundary(705,230,400,225,'設計課')+boundary(1175,230,395,225,'品質保証課')+boundary(705,595,865,605,'');
s+=t(1445,630,'製造課');
// Each branch from L3SW is separate, as in the source. The manufacture branch
// contains NC PC, general PCs, and the SCADA/machine bus; dedicated ports
// connect SCADA/machines to their operation PCs outside the LAN.
s+='<path d="M180 410 L340 330 L440 275 M480 180 L500 245 M670 180 L615 245 M180 410 V505 M180 565 V680 H180 M60 535 H40 V797 H60 M270 535 H785 V395 M270 550 H985 V395 M270 565 H1250 V395 M270 580 H1460 V395 M270 595 H720 V525 H875 V735 M720 525 H1045 V735 M720 525 V900 H1460 M875 900 V960 M1045 900 V960 M1245 900 V960 M1460 900 V960 M270 610 H340 V800 H410 M340 800 V1020 H410 M875 1040 V1100 M1045 1040 V1100 M1245 1040 V1100 M1460 1040 V1100"/>';
s+='<ellipse cx="540" cy="280" rx="195" ry="40"/>'+t(440,288,'インターネット');
s+=b(390,105,220,75,'電子メール')+t(430,163,'SaaS')+b(635,105,230,75,'Webプロキシ')+t(685,163,'SaaS');
s+=b(60,370,210,60,'FW')+b(60,505,210,60,'L3SW')+b(60,680,210,65,'ファイルサーバ')+b(60,765,210,45,'LDAPサーバ');
const stack=(x,y,w,name)=>b(x+16,y-16,w,65,'')+b(x+8,y-8,w,65,'')+b(x,y,w,65,name);
s+=stack(730,330,155,'CAD PC')+stack(930,330,155,'一般PC')+stack(1195,330,155,'一般PC')+b(1380,330,175,65,'製造監視用PC');
s+=stack(435,800,205,'一般PC')+stack(435,1020,205,'一般PC')+stack(750,735,235,'NC PC')+stack(1000,735,235,'一般PC');
s+=b(755,960,235,80,'SCADA')+b(755,1100,235,85,'SCADA')+t(765,1165,'操作用PC');
[1010,1210,1420].forEach((x)=>s+=b(x,960,165,80,'工作機械')+b(x,1100,165,85,'工作機械')+t(x+10,1165,'操作用PC'));
s+=t(1385,1010,'…');
const point=(x,y,label,tx,ty)=>'<circle cx="'+x+'" cy="'+y+'" r="8" fill="#111"/>'+t(tx,ty,'('+label+')')+'<path d="M'+(tx+42)+' '+(ty-8)+' L'+(x-10)+' '+y+'"/>';
s+=point(340,330,'あ',350,370)+point(180,470,'い',240,478)+point(785,490,'う',710,505)+point(985,490,'え',905,505)+point(1250,490,'お',1170,505)+point(1460,490,'か',1380,505)+point(180,625,'き',70,637)+point(340,645,'く',365,640)+point(680,595,'け',600,580)+point(875,655,'こ',790,674)+point(1045,655,'さ',970,674)+point(875,935,'し',770,940)+point(935,900,'す',995,940);
out(3,s);
