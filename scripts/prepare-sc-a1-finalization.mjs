// Draft only. Never writes a production question or category file.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const audit = read('data/sc-a1-audit.json');
const production = read('data/questions.json');
const baseline = read('data/sc-a1-legacy-manifest.json');
const categories = read('data/categories.json').categories;
const replacementSpecs = [
  [
    7,
    2024,
    'SPRING',
    1,
    4,
    'foundation_theory',
    'technology',
    '基礎理論',
    '難',
    'M/M/1の平均待ち時間',
    '単純なサイコロから，利用率の変化と平均待ち時間の式を判断する確率モデルへ進める。',
  ],
  [
    144,
    2024,
    'FALL',
    17,
    9,
    'user_interface',
    'technology',
    'ユーザーインタフェース',
    '標準',
    '使用性の評価指標',
    '未収録のUI分野を補い，使用性・信頼性・保守性・機能性を状況で区別する。',
  ],
  [
    181,
    2024,
    'SPRING',
    3,
    5,
    'algorithms_data_structures',
    'technology',
    'アルゴリズムとプログラミング',
    '標準',
    '二分木の再帰処理の追跡',
    '探索回数の重複を解消し，処理定義と木の図を追跡する力を確認する。',
  ],
  [
    191,
    2025,
    'FALL',
    10,
    8,
    'networks',
    'technology',
    'ネットワーク',
    '標準',
    'LANの送信時間とパケット数',
    'MX定義の重複を解消し，ビット・バイト・回線速度・送信間隔を扱う計算を補充する。IPv6/AAAAは次版の拡張対象とする。',
  ],
  [
    197,
    2024,
    'FALL',
    9,
    6,
    'information_media',
    'technology',
    '情報メディア',
    '標準',
    '動画像の帯域幅',
    '欠落していた情報メディアを補い，画素数・色深度・フレーム数の積と単位を確認する。',
  ],
  [
    198,
    2024,
    'FALL',
    25,
    14,
    'business_system_strategy',
    'strategy',
    'システム企画',
    '基礎',
    '業務フローとUML図',
    'プロダクトオーナーの定義重複を解消し，業務要件定義で使う図の役割を確認する。',
  ],
  [
    202,
    2025,
    'SPRING',
    20,
    13,
    'it_service_management',
    'management',
    'サービスマネジメント',
    '標準',
    'サービス提供時間を考慮したSLA計算',
    '同値の可用性計算を解消し，営業時間と実績・目標の差を用いる適用問題へ置換する。',
  ],
  [
    205,
    2025,
    'FALL',
    25,
    14,
    'business_system_strategy',
    'strategy',
    'システム戦略',
    '標準',
    '投資回収期間法PBP',
    'PPMの花形の重複を解消し，NPV/IRRとの比較を含む投資評価を補う。',
  ],
  [
    207,
    2024,
    'FALL',
    27,
    14,
    'business_system_strategy',
    'strategy',
    '技術戦略マネジメント',
    '標準',
    '研究開発から産業化への障壁',
    '不足する技術戦略を補い，魔の川・死の谷・ダーウィンの海・キャズムを区別する。',
  ],
  [
    210,
    2024,
    'FALL',
    13,
    8,
    'security',
    'technology',
    'セキュリティ',
    '基礎',
    'ディープフェイクの悪用',
    '過学習の重複を解消し，生成AIに関する共通知識として音声偽装と他の攻撃を区別する。出力検証は解説で補う。',
  ],
  [
    229,
    2025,
    'FALL',
    29,
    16,
    'corporate_accounting',
    'strategy',
    '企業活動',
    '難',
    '製造時間制約下の利益最大化',
    'PERTの同値重複を解消し，制約と単位時間当たり限界利益を使う判断を補う。リスク期待損失そのものは次版の拡張対象とする。',
  ],
  [
    232,
    2025,
    'FALL',
    8,
    7,
    'databases',
    'technology',
    'データベース',
    '標準',
    'BASEと結果整合性',
    '容量管理の重複を解消し，NoSQLの分散更新と整合性モデルを補う。',
  ],
  [
    236,
    2024,
    'FALL',
    26,
    14,
    'business_system_strategy',
    'strategy',
    '経営戦略マネジメント',
    '標準',
    'コ・クリエーション戦略',
    '実現可能性の極端な誤答を除き，顧客・企業ネットワークと価値共創を区別する。RFPは既存A1-168の分類修正で維持する。',
  ],
  [
    237,
    2025,
    'FALL',
    30,
    16,
    'law_standards_emerging',
    'strategy',
    '法務',
    '基礎',
    '画像・GUIの意匠保護',
    '請負の定義重複を解消し，画像を含む知的財産の保護対象を確認する。',
  ],
  [
    239,
    2024,
    'SPRING',
    7,
    7,
    'computer_architecture',
    'technology',
    'ハードウェア',
    '標準',
    'タイムチャートと論理回路',
    '工場AI用途の偏りを解消し，未収録のハードウェアを図の読み取りで補う。',
  ],
];
const p1 = new Set([
  12, 28, 29, 30, 31, 44, 50, 51, 62, 64, 65, 86, 88, 89, 110, 125, 128, 151, 163, 174, 187, 189,
  190, 194, 200, 214, 218, 224, 228, 240,
]);
const p3 = new Set([100, 168, 176, 178, 179, 180]);
const equivalent = new Set([128, 151]);
const categoryMoves = {
  168: 'business_system_strategy',
  176: 'security',
  177: 'system_reliability',
  178: 'system_reliability',
  179: 'foundation_theory',
  180: 'foundation_theory',
  209: 'system_reliability',
  238: 'system_reliability',
  240: 'security',
};
const fieldMoves = {
  168: 'システム企画',
  176: 'セキュリティ',
  177: 'システム構成要素',
  178: 'システム構成要素',
  179: '基礎理論',
  180: '基礎理論',
  209: 'システム構成要素',
  238: 'システム構成要素',
  240: 'セキュリティ',
};
const swapSpecs = [
  [7, 182, '平均待ち時間の適用問題を加え，スタックの定義に近い問題を演習へ戻す'],
  [144, 234, 'UIの欠落を解消し，独立性の類題を演習へ戻す'],
  [36, 214, 'CPU性能の応用計算を加え，ページフォールトの類題を演習へ戻す'],
  [28, 215, 'キャッシュ計算を加え，RAID1の定義を演習へ戻す'],
  [51, 213, '独立故障の並列稼働率を加え，マージソートの定義を演習へ戻す'],
  [113, 219, 'SPIによる進捗判断を加え，多重度の定義を演習へ戻す'],
  [64, 227, '正規化の前提判断を加え，是正保守の定義を演習へ戻す'],
  [83, 185, '最長一致を加え，mock2のキャッシュ計算との類題を避ける'],
  [3, 192, '2の補数の計算を加え，UDPの定義を演習へ戻す'],
  [24, 193, '動的計画法を加え，電子署名の鍵の定義を演習へ戻す'],
  [156, 238, 'DXのシステム戦略を加え，エッジAIの用途を演習へ戻す'],
  [168, 217, 'RFPの調達論点を加え，DBの連鎖削除を演習へ戻す'],
  [129, 220, '容量管理を加え，IPv4アドレスの定義を演習へ戻す'],
];
const code = (id) => `A1-${String(id).padStart(3, '0')}`;
const assignment = (q) =>
  q.question_set.id === 'category_drill'
    ? 'practice'
    : q.question_set.id === 'mock_exam_1'
      ? 'mock1'
      : 'mock2';
const answerMap = { ア: 'A', イ: 'B', ウ: 'C', エ: 'D' };
const candidates = replacementSpecs.map(
  ([id, year, season, n, page, category, domain, field, difficulty, topic, reason]) => {
    const folder = year === 2025 ? 'nl10bi0000009lh8-att' : 'm42obm000000afqx-att';
    const prefix = `https://www.ipa.go.jp/shiken/mondai-kaiotu/${folder}/${year}r0${year - 2018}${season === 'SPRING' ? 'h' : 'a'}_koudo_am1`;
    const text = readFileSync(`tmp/pdfs/sc-a1/${year}-${season}-answer.txt`, 'utf8');
    const answer = text.match(new RegExp(`問\\s*${n}\\s+([アイウエ])`))?.[1];
    if (!answer) throw new Error(`Official answer missing: ${id}`);
    const digest = (kind) =>
      createHash('sha256')
        .update(readFileSync(`tmp/pdfs/sc-a1/${year}-${season}-${kind}.pdf`))
        .digest('hex');
    return {
      code: code(id),
      source_id: `IPA-KOUDO-AM1-${year}-${season}-Q${String(n).padStart(2, '0')}`,
      exam: '高度試験・SC共通 午前I',
      year,
      season,
      period: season === 'SPRING' ? '春期' : '秋期',
      question_number: n,
      pdf_page: page,
      category,
      domain,
      technology_field: field,
      difficulty,
      topic,
      adoption_reason: reason,
      official_question_url: prefix + '_qs.pdf',
      official_answer_url: prefix + '_ans.pdf',
      official_answer: answer,
      correct_choice: answerMap[answer],
      question_pdf_sha256: digest('question'),
      answer_pdf_sha256: digest('answer'),
      source_status: 'OFFICIAL_PAST_QUESTION',
      reviewed_on: '2026-10-08',
      verification: '公式年度ページ・問題冊子画像・解答PDFを照合。難度・分類は編集判断。',
      content_hash: null,
      authoring_status: 'SOURCE_FIXED_NOT_TRANSCRIBED',
    };
  },
);
const fixes = audit.questions
  .filter((q) => q.decision === 'FIX')
  .map((row) => {
    const current = production.questions.find((q) => q.code === row.code);
    const targets = [
      ...Object.entries(row.technical_review.components)
        .filter(([, value]) => value === 'REVISION_REQUIRED')
        .map(([key]) => key),
      ...row.technical_review.affected_metadata,
    ];
    const content = targets.some((t) => ['question', 'choices', 'correct_choice'].includes(t));
    return {
      code: row.code,
      current_topic: current.subcategory,
      problem: row.technical_review.note,
      targets,
      policy:
        row.id === 128
          ? 'ITILのデプロイメント（承認済みソフトウェアや設定の本番環境への移送）を問う。正解Dをデプロイメント管理へ変更し，利用可能化を担うリリース管理と区別する。本文・四択・解説・記憶文を再監査する。'
          : row.recommended_action,
      fix_class: equivalent.has(row.id)
        ? 'REPLACE_EQUIVALENT'
        : content
          ? 'FIX_CONTENT'
          : 'FIX_NON_CONTENT',
      priority: p1.has(row.id) ? 'P1' : p3.has(row.id) ? 'P3' : 'P2',
      preserve_history: !content,
      history_reason: content
        ? '本文又は選択肢の編集でcontent_hashが変わるため旧履歴を分離。論点・正解の維持だけでは引き継がない。'
        : '本文・四択・正解・回答に必要な図表を維持し，同じsource_id/content_hashで履歴を保持。',
      final_category: categoryMoves[row.id] ?? row.category,
      final_difficulty: row.id === 203 ? '基礎' : row.difficulty,
    };
  });
const entries = audit.questions.map((row) => {
  const old = baseline.entries.find((q) => q.code === row.code);
  const candidate = candidates.find((q) => q.code === row.code);
  const fix = fixes.find((q) => q.code === row.code);
  return {
    id: row.id,
    code: row.code,
    source_id: candidate?.source_id ?? old.sourceId,
    decision: ['REPLACE', 'REMOVE_CANDIDATE'].includes(row.decision) ? 'REPLACE' : row.decision,
    audit_decision: row.decision,
    assignment: assignment(row),
    sequence: row.question_set.sequence,
    category: candidate?.category ?? fix?.final_category ?? row.category,
    domain: candidate?.domain ?? (categoryMoves[row.id] ? 'technology' : row.domain),
    technology_field: candidate?.technology_field ?? fieldMoves[row.id] ?? row.technology_field,
    difficulty: candidate?.difficulty ?? fix?.final_difficulty ?? row.difficulty,
    preserve_history: candidate ? false : (fix?.preserve_history ?? true),
    history_class: candidate ? 'REPLACE' : (fix?.fix_class ?? 'KEEP'),
    fix_priority: fix?.priority ?? null,
    previous_source_id: old.sourceId,
    previous_content_hash: old.contentHash,
    content_hash: candidate || fix?.preserve_history === false ? null : old.contentHash,
    dataset_version: 'sc-a1-v1',
    current_assignment: assignment(row),
    current_category: row.category,
    current_difficulty: row.difficulty === '応用' ? '難' : row.difficulty,
    topic: candidate?.topic ?? production.questions.find((q) => q.code === row.code).subcategory,
  };
});
// RFP remains in strategy even though most metadata moves are to technology.
entries.find((q) => q.id === 168).domain = 'strategy';
for (const entry of entries) if (entry.difficulty === '応用') entry.difficulty = '難';
const swaps = swapSpecs.map(([from, to, reason]) => {
  const a = entries.find((q) => q.id === from),
    b = entries.find((q) => q.id === to);
  const oldA = a.assignment,
    oldB = b.assignment;
  a.assignment = oldB;
  b.assignment = oldA;
  return { practice_to_mock: a.code, mock_to_practice: b.code, mock: oldB, reason };
});
// Fixed order: technology then management then strategy; retain code for identity.
for (const set of ['practice', 'mock1', 'mock2']) {
  const rows = entries
    .filter((q) => q.assignment === set)
    .sort(
      (a, b) =>
        ['technology', 'management', 'strategy'].indexOf(a.domain) -
          ['technology', 'management', 'strategy'].indexOf(b.domain) || a.id - b.id,
    );
  rows.forEach((r, i) => (r.sequence = i + 1));
}
const count = (rows, key) =>
  Object.fromEntries(
    [...new Set(rows.map((r) => r[key]))]
      .sort()
      .map((value) => [value, rows.filter((r) => r[key] === value).length]),
  );
const summary = {
  total: 240,
  decisions: count(entries, 'decision'),
  history: count(entries, 'history_class'),
  fix_priorities: count(fixes, 'priority'),
  preserve_history: count(entries, 'preserve_history'),
  categories: count(entries, 'category'),
  domains: count(entries, 'domain'),
  difficulty: count(entries, 'difficulty'),
  assignments: Object.fromEntries(
    ['practice', 'mock1', 'mock2'].map((set) => {
      const rows = entries.filter((q) => q.assignment === set);
      return [
        set,
        {
          total: rows.length,
          decisions: count(rows, 'decision'),
          categories: count(rows, 'category'),
          domains: count(rows, 'domain'),
          difficulty: count(rows, 'difficulty'),
          technology_fields: count(rows, 'technology_field'),
          codes: rows.sort((a, b) => a.sequence - b.sequence).map((r) => r.code),
        },
      ];
    }),
  ),
};
const draft = {
  draft_version: 1,
  status: 'COMPOSITION_FIXED_AUTHORING_PENDING',
  runtime_enabled: false,
  production_mutation: false,
  reviewed_on: '2026-10-08',
  dataset_version: 'sc-a1-v1',
  baseline_reference: 'data/sc-a1-legacy-manifest.json',
  difficulty_note: '編集推定。難は本番JSONの応用に対応。IPA公式難度ではない。',
  category_proposals: [
    ...categories.map((c) => ({ id: c.id, name: c.name })),
    { id: 'user_interface', name: 'ユーザーインタフェース' },
    { id: 'information_media', name: '情報メディア' },
  ],
  summary,
  fixes,
  replacements: candidates,
  swaps,
  entries,
};
writeFileSync('data/sc-a1-source-code-map-draft.json', JSON.stringify(draft, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
