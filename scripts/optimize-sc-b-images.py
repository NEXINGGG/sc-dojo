"""Lossless SC B candidate images; decoded RGB pixels and dimensions must match.

Only assets referenced by the candidate are shipped. Full-page workpapers remain
for untranscribed cases, and are never classified as finished E figures.
"""
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path('public/questions/sc/b').resolve()
BACKUP = Path('tmp/sc-b-completion/preoptimization-images').resolve()
REPORT = Path('data/sc-b-v1-image-report.json')
DATA = Path('data/sc-b-cases-2023-2025-ready.json')


def digest(data):
    return 'sha256:' + hashlib.sha256(data).hexdigest()


def stats(files, root=ROOT):
    entries = [(p.relative_to(root).as_posix(), p.stat().st_size) for p in files]
    total = sum(n for _, n in entries)
    by_year = {}
    by_sitting = {}
    for name, size in entries:
        sitting = name.split('/')[0]
        by_sitting[sitting] = by_sitting.get(sitting, 0) + size
        by_year[sitting[:4]] = by_year.get(sitting[:4], 0) + size
    largest = max(entries, key=lambda x: x[1], default=('', 0))
    return {'fileCount': len(entries), 'totalBytes': total,
            'totalMiB': round(total / 1048576, 3),
            'averageBytes': round(total / len(entries), 2) if entries else 0,
            'largest': {'path': largest[0], 'bytes': largest[1]},
            'bytesByYear': by_year, 'bytesBySitting': by_sitting}


def pixel_hash(im):
    return digest(f'{im.width}x{im.height}:RGB:'.encode() + im.convert('RGB').tobytes())


payload = json.loads(DATA.read_text(encoding='utf-8'))
prior = json.loads(REPORT.read_text(encoding='utf-8')) if REPORT.exists() else None
before = prior['before'] if prior else (stats(list(BACKUP.glob('*/*.png')), BACKUP)
                                      if BACKUP.exists() else stats(list(ROOT.glob('*/*.png'))))
if not prior and not BACKUP.exists():
    for path in ROOT.glob('*/*.png'):
        target = BACKUP / path.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)

# The region is the figure and its note, not an entire page. Preserve pixels.
for c in payload['cases']:
    for m in c['body']['materials']:
        if m.get('crop'):
            sitting = f"{c['year']}-{c['term']}"
            source = Path(f"tmp/sc-b-v1/{sitting}/qs-{m['sourcePhysicalPage']:02}.png")
            dest = ROOT / sitting / f"q{c['questionNumber']}-{m['id']}.png"
            Image.open(source).crop(tuple(m['crop'])).save(dest)
            m.update(assetUrl='/questions/sc/b/' + dest.relative_to(ROOT).as_posix(),
                     assetHash=digest(dest.read_bytes()))

nodes = []


def collect(obj):
    if isinstance(obj, dict):
        if obj.get('assetUrl', '').startswith('/questions/sc/b/'):
            nodes.append(obj)
        for value in obj.values():
            collect(value)
    elif isinstance(obj, list):
        for value in obj:
            collect(value)


collect(payload)
urls = sorted(set(n['assetUrl'] for n in nodes))
mapping = {}
proofs = []
previous = {p['optimizedUrl']: p for p in prior['pixelProofs']} if prior else {}
for url in urls:
    source = (Path('public') / url.lstrip('/')).resolve()
    assert source.is_relative_to(ROOT), source
    if source.suffix == '.svg':
        assert source.exists(), url
        for n in nodes:
            if n['assetUrl'] == url:
                n['assetHash'] = digest(source.read_bytes())
        continue
    if source.suffix == '.webp':
        proof = previous[url]
        assert digest(source.read_bytes()) == proof['optimizedHash'], url
        with Image.open(source) as decoded:
            assert pixel_hash(decoded) == proof['pixelHash'], url
        proofs.append(proof)
        continue
    target = source.with_suffix('.webp')
    with Image.open(source) as original:
        original.save(target, format='WEBP', lossless=True, method=6)
        with Image.open(target) as decoded:
            assert original.size == decoded.size, url
            assert ImageChops.difference(original.convert('RGB'), decoded.convert('RGB')).getbbox() is None, url
        proofs.append({'originalUrl': url, 'originalHash': digest(source.read_bytes()),
                       'optimizedUrl': '/questions/sc/b/' + target.relative_to(ROOT).as_posix(),
                       'optimizedHash': digest(target.read_bytes()), 'width': original.width,
                       'height': original.height, 'pixelHash': pixel_hash(original),
                       'decodedPixelEquality': True})
    mapping[url] = proofs[-1]

for node in nodes:
    if node['assetUrl'] in mapping:
        proof = mapping[node['assetUrl']]
        node['assetUrl'] = proof['optimizedUrl']
        node['assetHash'] = proof['optimizedHash']

DATA.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
referenced = {n['assetUrl'] for n in nodes}
removed = []
for path in ROOT.glob('*/*'):
    if not path.is_file():
        continue
    absolute = path.resolve()
    assert absolute.is_relative_to(ROOT) and absolute.parent.parent == ROOT, absolute
    url = '/questions/sc/b/' + absolute.relative_to(ROOT).as_posix()
    if url not in referenced:
        removed.append(url)
        absolute.unlink()

image_reasons = []
for c in payload['cases']:
    for m in c['body']['materials']:
        if m.get('assetUrl'):
            image_reasons.append({'source_id': c['source_id'], 'materialId': m['id'],
                                 'assetUrl': m['assetUrl'],
                                 'classification': m.get('classification', 'pending_secondary_review'),
                                 'reason': m.get('imageReason',
                                     '接続・方向・境界を保持した再構成SVG。図の情報は隣接するテキストでも参照できる。'
                                     if m.get('classification') == 'D' else
                                     '原本情報の保持用。構造化・A～E最終分類が未完了なので，教材完成画像として承認しない。')})
    for u in c['questionUnits']:
        for f in u['answerFields']:
            if f.get('officialAnswerAsset'):
                image_reasons.append({'source_id': c['source_id'], 'fieldId': f['fieldId'],
                                     'assetUrl': f['officialAnswerAsset']['assetUrl'],
                                     'classification': 'E',
                                     'reason': '図示答案のIPA公式解答例そのもの。位置・形状を含め公式例と比較するため切出し画像を保持。'})
after = stats(list(ROOT.glob('*/*')))
report = {'schemaVersion': 1, 'dataset_version': 'sc-b-v1', 'before': before, 'after': after,
          'reductionPercent': round(100 * (1 - after['totalBytes'] / before['totalBytes']), 2),
          'encoding': 'WebP lossless; no resizing, quantization or thresholding',
          'pixelProofs': proofs, 'imageReasons': image_reasons,
          'removedUrls': sorted(set((prior or {}).get('removedUrls', []) + removed)),
          'note': '画素一致は転記・図表・内容の二次校閲を代替しない。全ページ画像は配布から除外。再構成SVGと必要な原本部分・図示解答だけを保持。'}
REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'before': before, 'after': after, 'reductionPercent': report['reductionPercent'],
                  'losslessImages': len(proofs)}, ensure_ascii=False))
