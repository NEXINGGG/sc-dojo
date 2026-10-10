"""Recheck all shipped lossless bytes/pixels and the reconstructed SVG hash."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

report = json.loads(Path('data/sc-b-v1-image-report.json').read_text(encoding='utf-8'))
for proof in report['pixelProofs']:
    path = Path('public' + proof['optimizedUrl'])
    assert 'sha256:' + hashlib.sha256(path.read_bytes()).hexdigest() == proof['optimizedHash'], path
    with Image.open(path) as im:
        assert im.size == (proof['width'], proof['height']), path
        pixels = f'{im.width}x{im.height}:RGB:'.encode() + im.convert('RGB').tobytes()
        assert 'sha256:' + hashlib.sha256(pixels).hexdigest() == proof['pixelHash'], path
        assert proof['decodedPixelEquality'] is True, path
payload = json.loads(Path('data/sc-b-cases-2023-2025-ready.json').read_text(encoding='utf-8'))
for c in payload['cases']:
    for m in c['body']['materials']:
        if m.get('assetUrl', '').endswith('.svg'):
            assert 'sha256:' + hashlib.sha256(Path('public' + m['assetUrl']).read_bytes()).hexdigest() == m['assetHash']
print(f"SC B可逆画像再検査: {len(report['pixelProofs'])}件のhash・寸法・RGB画素一致。再構成SVGのhash一致。")
