"""Extract unchanged diagram regions from the audited official PDF page renders."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
output = root / 'public/questions/sc/a1/v1'
output.mkdir(parents=True, exist_ok=True)
regions = [
    ('2024-SPRING-question-05.png', 'binary-tree.png', (315, 655, 950, 1168)),
    ('2024-SPRING-question-07.png', 'timing-chart.png', (360, 1045, 875, 1315)),
    ('2024-SPRING-question-07.png', 'circuit-a.png', (195, 1445, 372, 1535)),
    ('2024-SPRING-question-07.png', 'circuit-b.png', (432, 1445, 612, 1535)),
    ('2024-SPRING-question-07.png', 'circuit-c.png', (667, 1445, 845, 1535)),
    ('2024-SPRING-question-07.png', 'circuit-d.png', (902, 1445, 1082, 1535)),
]
for page, name, bounds in regions:
    with Image.open(root / 'tmp/pdfs/sc-a1' / page) as image:
        image.crop(bounds).save(output / name)
    print(name)
