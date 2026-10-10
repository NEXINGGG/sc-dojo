"""Pin the one graphical official answer, without reconstructing its layout."""
from pathlib import Path
import subprocess
from PIL import Image

dest = Path('tmp/sc-b-v1/2024-fall')
dest.mkdir(parents=True, exist_ok=True)
subprocess.run(['pdftoppm', '-png', '-r', '150', '-f', '3', '-l', '3',
                'reference/sc-b-official/2024-fall/ans.pdf', str(dest / 'answer')], check=True)
target = Path('public/questions/sc/b/2024-fall/q3-answer-diagram.png')
target.parent.mkdir(parents=True, exist_ok=True)
with Image.open(dest / 'answer-3.png') as page:
    page.crop((230, 560, 565, 986)).save(target)
print(target)
