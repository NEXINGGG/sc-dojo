"""Create OCR review workpapers. OCR is never accepted as a reviewed transcript."""
import json
import re
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

root = Path('tmp/sc-b-v1')
for directory in sorted(root.iterdir()):
    if not directory.is_dir() or not list(directory.glob('*.ocr.json')):
        continue
    pages = []
    outline = []
    for file in sorted(directory.glob('qs-*.ocr.json')):
        page = int(file.name[3:5])
        data = json.loads(file.read_text(encoding='utf-8-sig'))
        lines = [line['text'] for line in data['lines']]
        pages.append(f'=== PAGE {page} ===\n' + '\n'.join(lines))
        outline.extend(f'{page}: {line}' for line in lines if re.search(r'問\s*[1-4]|設問|図\s*[0-9A-H]|表\s*[0-9]|字以内|字で|解答群', line))
    (directory / 'ocr.txt').write_text('\n\n'.join(pages), encoding='utf-8')
    (directory / 'outline.txt').write_text('\n'.join(outline), encoding='utf-8')
    tiles = []
    for file in sorted(directory.glob('qs-*.png')):
        im = ImageOps.contain(Image.open(file), (360, 500))
        tile = Image.new('RGB', (380, 530), 'white')
        tile.paste(im, ((380-im.width)//2, 25))
        ImageDraw.Draw(tile).text((5, 5), file.name, fill='black')
        tiles.append(tile)
    for offset in range(0, len(tiles), 12):
        sheet = Image.new('RGB', (1520, 1590), '#cccccc')
        for i, tile in enumerate(tiles[offset:offset+12]):
            sheet.paste(tile, ((i%4)*380, (i//4)*530))
        sheet.save(directory / f'contact-{offset//12+1}.png')
    print(directory.name, len(pages))
