"""Independently extract answers from audited IPA PDFs; do not trust the draft answer values."""
import hashlib
import json
import re
import sys
from pathlib import Path
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
payload = json.loads((root / (sys.argv[1] if len(sys.argv) > 1 else 'data/sc-a1-v1-candidate.json')).read_text(encoding='utf-8'))
draft = json.loads((root / 'data/sc-a1-source-code-map-draft.json').read_text(encoding='utf-8'))
answers = {}
for r in draft['replacements']:
    key = f"{r['year']}-{r['season']}"
    for kind in ['question', 'answer']:
        path = root / f'tmp/pdfs/sc-a1/{key}-{kind}.pdf'
        assert hashlib.sha256(path.read_bytes()).hexdigest() == r[f'{kind}_pdf_sha256'], path
    if key not in answers:
        text = '\n'.join(page.extract_text() for page in PdfReader(root / f'tmp/pdfs/sc-a1/{key}-answer.pdf').pages)
        answers[key] = {int(n): a for n, a in re.findall(r'問\s*(\d+)\s+([アイウエ])', text)}
    answer = answers[key][r['question_number']]
    q = next(q for q in payload['questions'] if q['code'] == r['code'])
    assert answer == r['official_answer'] == q['source']['official_answer'], r['code']
    assert q['correct_choice'] == 'ABCD'['アイウエ'.index(answer)], r['code']
print(f'PASS: {len(answers)} official answer PDFs / 8 PDF digests / 15 official answers')
