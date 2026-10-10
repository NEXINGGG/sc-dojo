"""Acquire the five current-format SC sittings from the IPA manifest only."""
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

import pdfplumber

root = Path('reference/sc-b-official')
draft = json.loads(Path('data/sc-b-categories-draft.json').read_text(encoding='utf-8'))
manifest = []
for ref in draft['references']:
    sitting = f"{ref['year']}-{ref['term']}"
    directory = root / sitting
    directory.mkdir(parents=True, exist_ok=True)
    for kind, key in [('qs', 'question_pdf_url'), ('ans', 'answer_pdf_url'), ('cmnt', 'answer_pdf_url')]:
        url = ref[key].replace('_ans.pdf', '_cmnt.pdf') if kind == 'cmnt' else ref[key]
        target = directory / f'{kind}.pdf'
        if not target.exists():
            with urlopen(url, timeout=60) as response:
                target.write_bytes(response.read())
        content = target.read_bytes()
        assert content.startswith(b'%PDF'), target
        with pdfplumber.open(target) as pdf:
            pages = [p.extract_text(layout=False) or '' for p in pdf.pages]
            (directory / f'{kind}.txt').write_text('\n\n'.join(f'=== PAGE {i+1} ===\n{t}' for i, t in enumerate(pages)), encoding='utf-8')
        manifest.append({'examSetId': ref['exam_set_id'], 'kind': kind, 'url': url, 'path': str(target).replace('\\', '/'), 'sha256': 'sha256:' + hashlib.sha256(content).hexdigest(), 'pageCount': len(pages), 'checkedOn': '2026-10-09'})
        print(sitting, kind, len(pages), flush=True)
Path('data/sc-b-v1-sources.json').write_text(json.dumps({'schemaVersion': 1, 'dataset_version': 'sc-b-v1', 'sources': manifest}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
