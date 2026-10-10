"""Reconcile release answer fields against each sitting's pinned IPA answer PDF."""
import hashlib
import json
import re
import sys
from pathlib import Path
import pdfplumber

sys.stdout.reconfigure(encoding='utf-8')
payload = json.loads(Path('data/sc-b-cases-2023-2025-ready.json').read_text(encoding='utf-8'))
sources = json.loads(Path('data/sc-b-v1-sources.json').read_text(encoding='utf-8'))['sources']
for s in sources:
    assert s['sha256'] == 'sha256:' + hashlib.sha256(Path(s['path']).read_bytes()).hexdigest(), s['path']
def norm(t):
    return re.sub(r'\s+', '', t).replace('，', ',').replace('（', '(').replace('）', ')')
errors = []
checked = 0
for case in payload['cases']:
    source = next(s for s in sources if s['examSetId'] == case['examSetId'] and s['kind'] == 'ans')
    with pdfplumber.open(source['path']) as pdf:
        if case['year'] == 2023:
            indices = [0] if case['questionNumber'] < 3 else [1] if case['questionNumber'] == 3 else [1,2]
        else:
            indices = [case['questionNumber']-1]
        full = ''
        for i in indices:
            page = pdf.pages[i]
            full += norm(page.extract_text() or '')
            # Answer column crops prevent row labels / notes from interleaving wrapped prose.
            for left in [110,120,129,145,159,170,287]:
                full += norm(page.crop((left,0,470,page.height)).extract_text() or '')
        for unit in case['questionUnits']:
            for field in unit['answerFields']:
                if field['fieldId'].startswith('org-') or field.get('answerFormat') == 'diagram':
                    continue
                examples = re.split(r'(?:^|\n)公式例[①②③④⑤⑥⑦⑧⑨⑩]：\n', field['officialAnswer'])
                for example in filter(None, examples):
                    if norm(example) not in full:
                        errors.append(f"{unit['questionId']}/{field['fieldId']}: {example}")
                checked += 1
print(f'公式3資料×5回hash一致 / 解答文字列{checked}欄 / 要照合{len(errors)}欄')
print('\n'.join(errors))
if errors:
    sys.exit(1)
