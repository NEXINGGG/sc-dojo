"""Download only the audited IPA PDFs and render source pages for editorial review."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'tmp/sc-a2-v1'
WORK.mkdir(parents=True, exist_ok=True)
inventory = json.loads((ROOT / 'data/sc-a2-past-question-inventory.json').read_text(encoding='utf-8'))

def acquire(sitting):
    sid = sitting['sitting_id']
    for kind in ['question', 'answer']:
        path = WORK / f'{sid}-{kind}.pdf'
        pilot = ROOT / 'tmp/pilot' / path.name
        if not path.exists():
            if pilot.exists():
                shutil.copyfile(pilot, path)
            else:
                with urllib.request.urlopen(sitting[f'{kind}_pdf_url'], timeout=45) as r:
                    path.write_bytes(r.read())
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        assert digest == sitting[f'{kind}_pdf_sha256'], path
        count = sitting[f'{kind}_pdf_page_count']
        for page in range(1, count + 1):
            if kind == 'question' and page == 2:
                continue
            image = WORK / f'{sid}-{kind}-p{page}.png'
            if not image.exists():
                subprocess.run(['pdftoppm', '-f', str(page), '-l', str(page), '-scale-to', '2200',
                                '-singlefile', '-png', str(path), str(image.with_suffix(''))],
                               capture_output=True, check=True)
    return sid

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for sid in pool.map(acquire, inventory['sittings']):
        print(sid, 'official PDF hashes verified / pages rendered', flush=True)
