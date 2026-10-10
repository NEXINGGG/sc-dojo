"""Render immutable IPA pages for transcription and visual source verification."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess

import pdfplumber

def render(directory):
    dest = Path('tmp/sc-b-v1') / directory.name
    dest.mkdir(parents=True, exist_ok=True)
    if not (dest / 'qs-02.png').exists():
        subprocess.run(['pdftoppm', '-png', '-r', '150', str(directory / 'qs.pdf'), str(dest / 'qs')], check=True)
    print(directory.name, 'rendered', flush=True)

with ThreadPoolExecutor(max_workers=2) as pool:
    list(pool.map(render, [p for p in Path('reference/sc-b-official').iterdir() if p.name != '2025-fall']))
