import { writeFileSync, mkdirSync } from 'node:fs';

// D classification: source is IPA 2023 autumn PM Q2, printed page 8.
// The layout is for reading; the boundaries, connections and labels are preserved.
const path = 'public/questions/sc/b/2023-fall/q2-figure-1.svg';
const rect = (x, y, w, h, text) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/><text x="${x+w/2}" y="${y+h/2+7}" text-anchor="middle">${text}</text>`;
const line = (x1,y1,x2,y2,label='',x=(x1+x2)/2,y=(y1+y2)/2-7) => `<path d="M${x1} ${y1} L${x2} ${y2}"/><text x="${x}" y="${y}">${label}</text>`;
let diagram = '';
diagram += '<rect x="20" y="110" width="1000" height="660"/><text x="30" y="135">M社</text>';
diagram += '<rect x="35" y="145" width="650" height="605"/><text x="45" y="170">執務室</text>';
diagram += '<rect x="705" y="135" width="300" height="615"/><text x="715" y="160">会議室</text>';
diagram += '<g stroke-dasharray="10 6"><rect x="50" y="200" width="230" height="440"/><rect x="725" y="180" width="260" height="390"/><path d="M305 590 H395 V445 H685 V515 H985 V730 H305 Z"/></g>';
diagram += '<text x="58" y="227">サーバネットワーク</text><text x="58" y="252">192.168.30.0/24</text>';
diagram += '<text x="735" y="205">来客用無線LAN</text><text x="735" y="232">192.168.10.0/24</text>';
diagram += '<text x="315" y="615">従業員用無線LAN</text><text x="315" y="642">192.168.20.0/24</text>';
diagram += rect(35,25,225,55,'Bサービス') + rect(320,25,220,55,'インターネット');
diagram += line(260,52,320,52) + line(430,80,430,185,'WAN-IF1',440,175);
diagram += rect(350,185,160,55,'FW') + rect(360,315,240,70,'L2SW');
diagram += line(470,240,500,315,'IF1',485,266) + '<text x="510" y="309">P9</text>';
const servers = [['業務サーバ',285,'P10'],['DHCPサーバ',365,'P11'],['DNSサーバ',445,'P12'],['ディレクトリサーバ',555,'P13']];
servers.forEach(([name,y,port],i) => {
  diagram += rect(65,y,195,55,name);
  diagram += line(260,y+27,360,335+i*15,port,300,327+i*24);
});
for(let i=0;i<4;i++) {
  diagram += line(470+i*28,385,470+i*28,455+i*14,'P'+(20+i),450+i*42,415+(i%2)*25);
}
for(let i=3;i>=0;i--) diagram += rect(425+i*14,455+i*14,200,50,'AP-'+(i+1));
diagram += line(600,350,800,530,'P24',620,375);
diagram += rect(760,255,205,50,'来客持込端末') + rect(760,325,205,50,'プロジェクター') + rect(760,410,205,50,'業務PC');
diagram += rect(770,530,185,50,'AP-5');
diagram += '<path d="M860 470 l-10 14 l20 14 l-20 14 l10 14"/>';
diagram += '<path d="M510 520 l-10 14 l20 14 l-20 14 l10 14"/>';
diagram += '<path d="M860 590 l-10 14 l20 14 l-20 14 l10 14"/>';
diagram += rect(475,665,180,50,'業務PC') + rect(780,665,180,50,'業務PC');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="800" viewBox="0 0 1040 800" role="img" aria-labelledby="title desc">
<title id="title">図1 M社のネットワーク構成</title>
<desc id="desc">IPA 2023秋午後問2の再構成。FW IF1とL2SW P9，業務サーバP10，DHCPサーバP11，DNSサーバP12，ディレクトリサーバP13，AP-1～4はP20～23，AP-5はP24に接続。VLAN10来客用，VLAN20従業員用，VLAN30サーバ。P9とP24はタグVLAN有効。注記全文は教材の図1本文に収録。</desc>
<rect width="1040" height="800" fill="white"/><g fill="white" stroke="#111" stroke-width="2">${diagram}</g>
<style>text{stroke:none;fill:#111;font:20px sans-serif}path{fill:none}</style></svg>`;
mkdirSync('public/questions/sc/b/2023-fall', { recursive: true });
writeFileSync(path, svg);
console.log('図1再構成: ' + path);
