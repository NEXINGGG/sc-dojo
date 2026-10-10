"""Independently rerender pinned IPA PDFs. Pixel equality is not textual secondary review."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import subprocess
from PIL import Image, ImageChops

payload = json.loads(Path('data/sc-b-cases-2023-2025-ready.json').read_text(encoding='utf-8'))
sources = json.loads(Path('data/sc-b-v1-sources.json').read_text(encoding='utf-8'))['sources']

def verify(source):
    path = Path(source['path'])
    assert source['sha256'] == 'sha256:' + hashlib.sha256(path.read_bytes()).hexdigest()
    directory = Path('tmp/sc-b-v1/rerender') / path.parent.name
    directory.mkdir(parents=True, exist_ok=True)
    size = ['-scale-to-y', '1800', '-scale-to-x', '-1'] if source['examSetId'] == 'SC-2025-FALL-PM' else ['-r', '150']
    subprocess.run(['pdftoppm', '-png', *size, str(path), str(directory / 'qs')], check=True)
    count = 0
    for case in [c for c in payload['cases'] if c['examSetId'] == source['examSetId']]:
        for index, page in enumerate(case['body']['originalPages']):
            physical = case['source']['questionPdfPagesZeroBased'][index] + 1
            with Image.open(directory / f'qs-{physical:02}.png') as original, Image.open('public' + page['assetUrl']) as included:
                assert original.size == included.size, page['assetUrl']
                assert ImageChops.difference(original.convert('RGB'), included.convert('RGB')).getbbox() is None, page['assetUrl']
            count += 1
    print(source['examSetId'], count, 'pages verified', flush=True)
    return count

with ThreadPoolExecutor(max_workers=2) as pool:
    total = sum(pool.map(verify, [s for s in sources if s['kind'] == 'qs']))
print(f'IPA PDF rerender pixel equality: {total} pages / 20 cases. Textual secondary review remains separate.')
