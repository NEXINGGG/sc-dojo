import json, hashlib, shutil, sys
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'tmp/sc-b-2025-fall')
dest = Path('data/sc-b-pilot-assets/2025-fall')
dest.mkdir(parents=True, exist_ok=True)
shutil.copyfile(root / 'qs.pdf', dest / '2025r07a_sc_pm_qs.pdf')
datafile = Path('data/sc-b-pilot-2025-fall.json')
data = json.loads(datafile.read_text(encoding='utf-8'))
previews = []
for case in data['cases']:
    for page in case['body']['originalPages']:
        file = dest / Path(page['assetUrl']).name
        shutil.copyfile(root / f"qs-{page['printedPage']:02}.png", file)
        page['assetHash'] = 'sha256:' + hashlib.sha256(file.read_bytes()).hexdigest()
    for material in case['body']['materials']:
        file = dest / Path(material['assetUrl']).name
        with Image.open(root / f"qs-{material['printedPage']:02}.png") as source:
            crop = source.crop(tuple(material['sourceCrop']))
            crop.save(file, optimize=True)
            thumb = ImageOps.contain(crop, (480, 480))
            tile = Image.new('RGB',(500,520),'#e0e0e0')
            tile.paste(thumb,((500-thumb.width)//2,30))
            ImageDraw.Draw(tile).text((10,10),file.name,fill='black')
            previews.append(tile)
        material['assetHash'] = 'sha256:' + hashlib.sha256(file.read_bytes()).hexdigest()
for offset in range(0,len(previews),8):
    sheet = Image.new('RGB',(2000,1040),'white')
    for i,tile in enumerate(previews[offset:offset+8]): sheet.paste(tile,((i%4)*500,(i//4)*520))
    sheet.save(root / f'crops-{offset//8+1}.png')
datafile.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"Extracted {len(previews)} materials, {len(list(dest.glob('page-*.png')))} original pages; regenerate content_hash next")
