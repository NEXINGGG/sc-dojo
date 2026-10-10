"""Independently extract all official answers; fail closed on ambiguous PDF text."""
import hashlib
import json
from pathlib import Path
import re
import sys
import pdfplumber

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'tmp/sc-a2-v1'
inventory = json.loads((ROOT / 'data/sc-a2-past-question-inventory.json').read_text(encoding='utf-8'))
answers = {}
for sitting in inventory['sittings']:
    sid = sitting['sitting_id']
    path = WORK / f'{sid}-answer.pdf'
    assert hashlib.sha256(path.read_bytes()).hexdigest() == sitting['answer_pdf_sha256']
    with pdfplumber.open(path) as doc:
        text = '\n'.join(p.extract_text() or '' for p in doc.pages)
    extracted = {int(n): a for n, a in re.findall(r'問\s*(\d+)\s*([アイウエ])', text)}
    assert len(extracted) == 25, f'{sid}: ambiguous official PDF text; inspect the page image'
    for q in [q for q in inventory['questions'] if q['year'] == sitting['year'] and q['term'] == sitting['term']]:
        answer = extracted[q['question_number']]
        assert answer == q['official_answer']
        assert 'ABCD'['アイウエ'.index(answer)] == q['official_answer_choice_id']
        answers[q['source_id']] = answer
    print(sid, '25 official answers matched')
(WORK / 'official-answers-extracted.json').write_text(json.dumps(answers, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('PASS: 425 independently extracted official answers / selected 240 match')
