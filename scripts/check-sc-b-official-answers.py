"""Compare every answer field with the IPA PDF pinned by SHA-256. No third-party text."""
import hashlib
import json
import re
import sys
from pathlib import Path
import pdfplumber

data = json.loads(Path('data/sc-b-pilot-2025-fall.json').read_text(encoding='utf-8'))
directory = Path(sys.argv[1] if len(sys.argv) > 1 else 'tmp/sc-b-2025-fall')
for source in data['sources']:
    content = (directory / (source['kind'] + '.pdf')).read_bytes()
    assert source['sha256'] == 'sha256:' + hashlib.sha256(content).hexdigest(), source['kind']
def normalize(text):
    return re.sub(r'\s+', '', text).replace('，', ',').replace('（', '(').replace('）', ')')
with pdfplumber.open(directory / 'ans.pdf') as pdf:
    pages = [normalize(page.extract_text()) for page in pdf.pages]
    # Multi-column row labels and IPA remarks otherwise interleave with wrapped answers.
    pages[1] += normalize(pdf.pages[1].crop((159, 0, 468, pdf.pages[1].height)).extract_text())
    pages[3] += normalize(pdf.pages[3].crop((129, 0, 469, pdf.pages[3].height)).extract_text())
checked = 0
for i, case in enumerate(data['cases']):
    for unit in case['questionUnits']:
        for field in unit['answerFields']:
            if field['fieldId'].startswith('org-'):
                continue
            assert normalize(field['officialAnswer']) in pages[i], (unit['questionId'], field['fieldId'])
            checked += 1
matrix = data['cases'][3]['questionUnits'][2]['answerFields']
for offset in range(0, len(matrix), 3):
    row = matrix[offset:offset+3]
    name = row[0]['label'].split(' ')[0]
    assert normalize(name + ''.join(f['officialAnswer'] for f in row)) in pages[3], name
print(f'IPA公式3資料hash一致・公式解答{checked}欄＋権限表18セル一致')
