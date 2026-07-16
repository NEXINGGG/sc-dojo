#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, sys
from pathlib import Path
from collections import Counter

CHOICES={"A","B","C","D"}
DIFFICULTIES={"基礎","標準","応用"}
PRIORITIES={"S","A","B"}

def load(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)

def validate(questions_path: Path, categories_path: Path):
    payload=load(questions_path)
    cats=load(categories_path)
    questions=payload.get("questions",[])
    errors=[]; warnings=[]
    category_ids={x["id"] for x in cats.get("categories",[])}
    domain_ids={x["id"] for x in cats.get("domains",[])}
    subcategory_ids={s["id"] for c in cats.get("categories",[]) for s in c.get("subcategories",[])}
    if len(questions)!=240: errors.append(f"問題数が240ではありません: {len(questions)}")
    ids=[q.get("id") for q in questions]; codes=[q.get("code") for q in questions]
    if ids!=list(range(1,241)): errors.append("idが1～240の昇順連番ではありません")
    if len(set(ids))!=len(ids): errors.append("idが重複しています")
    if len(set(codes))!=len(codes): errors.append("codeが重複しています")
    for i,q in enumerate(questions,1):
        label=q.get("code",f"index:{i}")
        required=["id","code","domain_id","category_id","subcategory_id","difficulty","priority","question","choices","correct_choice","explanation","memory_point"]
        for key in required:
            if key not in q or q[key] in (None,"",[]): errors.append(f"{label}: {key} が空です")
        if q.get("domain_id") not in domain_ids: errors.append(f"{label}: 不明なdomain_id")
        if q.get("category_id") not in category_ids: errors.append(f"{label}: 不明なcategory_id")
        if q.get("subcategory_id") not in subcategory_ids: errors.append(f"{label}: 不明なsubcategory_id")
        if q.get("difficulty") not in DIFFICULTIES: errors.append(f"{label}: difficulty不正")
        if q.get("priority") not in PRIORITIES: errors.append(f"{label}: priority不正")
        choices=q.get("choices",[])
        if len(choices)!=4: errors.append(f"{label}: 選択肢が4件ではありません")
        choice_ids=[c.get("id") for c in choices]
        if set(choice_ids)!=CHOICES or len(choice_ids)!=4: errors.append(f"{label}: 選択肢IDがA～Dではありません")
        texts=[str(c.get("text","")).strip() for c in choices]
        if any(not t for t in texts): errors.append(f"{label}: 空の選択肢があります")
        if len(set(texts))!=len(texts): errors.append(f"{label}: 同一選択肢があります")
        if q.get("correct_choice") not in CHOICES: errors.append(f"{label}: correct_choice不正")
    normalized=[" ".join(str(q.get("question","")).split()) for q in questions]
    dup=[k for k,v in Counter(normalized).items() if k and v>1]
    if dup: errors.append(f"完全一致する重複問題文があります: {len(dup)}件")
    return errors,warnings,len(questions)

def main():
    p=argparse.ArgumentParser()
    p.add_argument("questions",nargs="?",default="data/questions.json")
    p.add_argument("--categories",default="data/categories.json")
    args=p.parse_args()
    errors,warnings,count=validate(Path(args.questions),Path(args.categories))
    print(f"checked: {count} questions")
    for w in warnings: print(f"WARNING: {w}")
    for e in errors: print(f"ERROR: {e}")
    if errors:
        print(f"FAILED: {len(errors)} error(s)")
        return 1
    print("PASSED: no structural errors")
    return 0
if __name__=="__main__": sys.exit(main())
