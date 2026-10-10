"""Prepare editable OCR drafts and per-question image crops. Never publishes OCR directly."""
import json
import re
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.stdout.reconfigure(encoding='utf-8')
WORK = ROOT / 'tmp/sc-a2-v1'
inventory = json.loads((ROOT / 'data/sc-a2-past-question-inventory.json').read_text(encoding='utf-8'))
selected = [q for q in inventory['questions'] if q['adoption_status'] == 'selected']
draft = {}

def compact(text):
    # OCR segments Japanese glyphs with artificial spaces. Keep Latin word boundaries.
    text = re.sub(r'(?<=[^\x00-\x7f])\s+|\s+(?=[^\x00-\x7f])', '', text)
    return text.strip()

for sitting in inventory['sittings']:
    sid = sitting['sitting_id']
    starts = {}
    pages = {}
    for p in range(3, sitting['question_pdf_page_count'] + 1):
        path = WORK / f'{sid}-question-p{p}.ocr.json'
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding='utf-8-sig'))
        lines = []
        for line in data['lines']:
            if not line['words']:
                continue
            line['y'] = min(w['y'] for w in line['words'])
            line['x'] = min(w['x'] for w in line['words'])
            line['bottom'] = max(w['y'] + w['height'] for w in line['words'])
            line['compact'] = compact(line['text'])
            line['compact'] = re.sub(r'^問\s*(\d)\s+(\d)(?=\D|$)', r'問\1\2', line['compact'])
            match = re.match(r'^問\s*(\d{1,2})\s*(.*)', line['compact'])
            if match and line['x'] < 230:
                n = int(match[1])
                if 1 <= n <= 25:
                    starts[n] = (p, line['y'], line)
            lines.append(line)
        # OCR often separates a choice label from its text, with a slightly different baseline.
        ordered = []
        for line in sorted(lines, key=lambda l: (l['y'], l['x'])):
            same = next((old for old in ordered if abs(old['y']-line['y']) < 13), None)
            if same is None:
                ordered.append(line.copy())
            else:
                if same['x'] < line['x']:
                    same['compact'] += ' ' + line['compact']
                else:
                    same['compact'] = line['compact'] + ' ' + same['compact']
                    same['x'] = line['x']
        pages[p] = (data, ordered)
    overrides = {
        'SC-2017-FALL': {20:(10,1441)}, 'SC-2019-SPRING': {20:(12,581)},
        'SC-2021-SPRING': {1:(3,238)}, 'SC-2021-FALL': {20:(11,229)},
        'SC-2022-FALL': {20:(10,1244)}, 'SC-2024-FALL': {1:(3,225)},
        'SC-2025-FALL': {10:(6,575)},
    }
    for n,(page,y) in overrides.get(sid,{}).items():
        starts[n]=(page,y,{})
    for q in [q for q in selected if q['source_id'].startswith(sid + '-Q')]:
        n = q['question_number']
        if n not in starts:
            print('HEADER MISSING', q['source_id'])
            continue
        p, y, first = starts[n]
        end = starts.get(n+1, (sitting['question_pdf_page_count']+1, 0, {}))
        text = []
        for page in q['question_pdf_pages']:
            data, lines = pages[page]
            top = y-8 if page == p else 170
            bottom = end[1]-15 if page == end[0] else data['height']-155
            if bottom <= top:
                print('INVALID CROP', q['source_id'], page)
                continue
            cropped = Image.open(WORK / f'{sid}-question-p{page}.png').crop((155, top, data['width']-150, bottom))
            cropped.save(WORK / f'{q["source_id"]}-p{page}-crop.png')
            text.extend(l['compact'] for l in lines if top <= l['y'] < bottom)
        body = re.sub(r'^問\s*\d+\s*', '', '\n'.join(text))
        parts = re.split(r'\n[アイウエ工ェ]\s*', body)
        draft[q['source_id']] = {'question': parts[0].replace('\n', ''),
            'choices': [s.replace('\n', '') for s in parts[1:]], 'ocr_lines': text,
            'visual_class': q['display_audit']['primary_class']}
(WORK/'transcription-draft.json').write_text(json.dumps(draft, ensure_ascii=False, indent=2), encoding='utf-8')
print('Draft count', len(draft), 'four choices', sum(len(q['choices']) == 4 for q in draft.values()))
