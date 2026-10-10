import { readFileSync, writeFileSync } from 'node:fs';
import { transcripts } from './sc-b-transcripts-2023-fall.mjs';
import { q3 } from './sc-b-transcript-2023-fall-q3.mjs';
import { q4 } from './sc-b-transcript-2023-fall-q4.mjs';
import { springQ1 } from './sc-b-transcript-2024-spring-q1.mjs';
import { springQ2 } from './sc-b-transcript-2024-spring-q2.mjs';
import { springQ3 } from './sc-b-transcript-2024-spring-q3.mjs';
import { springQ4 } from './sc-b-transcript-2024-spring-q4.mjs';
import { fallQ1 } from './sc-b-transcript-2024-fall-q1.mjs';
import { fallQ2 } from './sc-b-transcript-2024-fall-q2.mjs';
import { fallQ3 } from './sc-b-transcript-2024-fall-q3.mjs';
import { fallQ4 } from './sc-b-transcript-2024-fall-q4.mjs';
import { spring25Q1 } from './sc-b-transcript-2025-spring-q1.mjs';
import { spring25Q2 } from './sc-b-transcript-2025-spring-q2.mjs';
import { spring25Q3 } from './sc-b-transcript-2025-spring-q3.mjs';
import { spring25Q4 } from './sc-b-transcript-2025-spring-q4.mjs';

const path = 'data/sc-b-cases-2023-2025-ready.json';
const payload = JSON.parse(readFileSync(path, 'utf8'));
const choiceText = (choices) => choices.map((c) => typeof c === 'string' ? c : c.id === c.text ? c.text : c.id + ' ' + c.text);
if (process.argv.includes('--choices-only')) {
  const updated = new Set();
  for (const c of payload.cases) for (const u of c.questionUnits) for (const f of u.answerFields) {
    if (f.choices?.some((choice) => typeof choice !== 'string')) {
      f.choices = choiceText(f.choices);
      updated.add(c.source_id);
    }
  }
  writeFileSync(path, JSON.stringify(payload, null, 2) + '\n');
  console.log('選択肢の記号と本文を既存の文字列仕様に整合: ' + [...updated].join(' '));
  process.exit(0);
}
const allTranscripts = { ...transcripts, 'SC-2023-FALL-PM-Q03': q3, 'SC-2023-FALL-PM-Q04': q4, 'SC-2024-SPRING-PM-Q01': springQ1, 'SC-2024-SPRING-PM-Q02': springQ2, 'SC-2024-SPRING-PM-Q03': springQ3, 'SC-2024-SPRING-PM-Q04': springQ4, 'SC-2024-FALL-PM-Q01': fallQ1 };
allTranscripts['SC-2024-FALL-PM-Q02'] = fallQ2;
allTranscripts['SC-2024-FALL-PM-Q03'] = fallQ3;
allTranscripts['SC-2024-FALL-PM-Q04'] = fallQ4;
allTranscripts['SC-2025-SPRING-PM-Q01'] = spring25Q1;
allTranscripts['SC-2025-SPRING-PM-Q02'] = spring25Q2;
allTranscripts['SC-2025-SPRING-PM-Q03'] = spring25Q3;
allTranscripts['SC-2025-SPRING-PM-Q04'] = spring25Q4;
for (const [id, transcript] of Object.entries(allTranscripts)) {
  const c = payload.cases.find((c) => c.source_id === id);
  if (!c) throw new Error('転記対象が存在しない: ' + id);
  const pdfOffset = transcript.pdfPageOffset ?? 0;
  c.body.sections = transcript.sections;
  for (const section of c.body.sections)
    for (const p of section.paragraphs) { p.sectionId = section.id; p.paragraphId = p.id; }
  c.body.materials = transcript.materials.map((m) => {
    // Keep a previously generated crop; do not attach page images to structured text.
    const prior = c.body.materials.find((prior) => prior.id === m.id);
    return m.kind === 'image' && prior?.assetUrl
      ? { ...m, assetUrl: prior.assetUrl, assetHash: prior.assetHash }
      : m;
  });
  c.body.readingOrder = transcript.readingOrder.map((id) => ({
    id,
    kind: id.startsWith('sec-') ? 'heading' : id.startsWith('p-') ? 'paragraph' : 'material',
  }));
  c.body.originalPages = [];
  c.body.originalPageMode = false;
  c.body.offlineAvailability = '段落本文・原文設問・構造化図表・必要な図の切出しをPWA precacheに同梱。公式PDFは別途端末登録。';
  c.body.figureTableInventory = c.body.materials.map((m) => ({
    id: m.id, label: m.caption.split(' ')[0], caption: m.caption.split(' ').slice(1).join(' '),
    kind: m.kind, classification: m.classification, printedPage: m.printedPage,
    printedPages: m.printedPages ?? [m.printedPage], pageRef: m.id,
    classificationStatus: 'visual_inventory_checked',
    textRenderingStatus: m.renderText ? 'structured' : 'cropped_image',
    ...(m.imageReason ? { imageReason: m.imageReason } : {}),
  }));
  c.source.modificationNote = '本文・設問・図表はIPA公式問題冊子から転記。空白・改行とコードの引用符を画面表示用に調整。Aは本文表示，Bは表，Cはコード，Dは接続・値・境界を保持した再構成図，Eは図と注記だけの切出し。解説・答案手順・根拠・自己採点の意味要素は学習用編集。';
  for (const unit of c.questionUnits) {
    const t = transcript.units.find((t) => t.label === unit.label);
    if (!t) throw new Error(unit.questionId + ':原文設問不足');
    unit.promptText = t.promptText;
    unit.promptTextIncluded = true;
    unit.requiresManualPromptTranscription = false;
    delete unit.promptSourceImages;
    unit.evidenceRefs = t.evidenceRefs;
    const paragraphs = c.body.sections.flatMap((s) => s.paragraphs);
    const promptPages = t.promptPages ?? transcript.promptPages ?? [6];
    unit.sourcePromptLocator = {
      pdfPageZeroBased: promptPages.map((p) => p + pdfOffset - 1), printedPage: promptPages,
      underlineRefs: [...t.promptText.matchAll(/下線([①-⑳])/g)].map((m) => m[1]),
      figureRefs: t.evidenceRefs.filter((r) => r.startsWith('figure-')),
      tableRefs: t.evidenceRefs.filter((r) => r.startsWith('table-')),
      paragraphIds: t.evidenceRefs.filter((r) => r.startsWith('p-')),
      sectionIds: [], materialIds: t.evidenceRefs.filter((r) => /^(figure|table)-/.test(r)),
    };
    unit.explanation.asked = t.promptText;
    unit.explanation.lookAt = t.evidenceRefs.map((ref) => {
      const p = paragraphs.find((p) => p.id === ref);
      const m = c.body.materials.find((m) => m.id === ref);
      return p ? `${p.id}（${p.printedPage}ページ）：${p.text.slice(0, 60)}` : m.caption;
    }).join('／');
    unit.explanation.necessaryKnowledge = t.knowledge;
    if (t.reasoning) unit.explanation.reasoning = t.reasoning;
    if (t.commonMistakes) unit.explanation.commonMistakes = t.commonMistakes;
    unit.explanation.officialAnswerReason = unit.answerFields
      .map((f) => `${f.label}：${f.officialAnswer}`).join('\n') + '\n' + unit.explanation.reasoning;
    unit.guidance.requirementBreakdown.answerTarget = t.promptText;
    unit.guidance.requirementBreakdown.answerForm = t.choices ? 'selection' : 'other';
    unit.guidance.requirementBreakdown.maxLength = unit.answerFields[0].maxLength;
    unit.guidance.requirementBreakdown.situation = unit.explanation.reasoning;
    unit.guidance.requirementBreakdown.trainingHint = unit.explanation.reasoning;
    unit.guidance.requirementBreakdown.commonTraps = [unit.explanation.commonMistakes];
    unit.guidance.requirementBreakdown.responseChecklist = [
      '設問番号・枝番と，指定された処理範囲を確認する',
      ...t.points,
      '回答形式と字数の上限を確認する',
    ];
    unit.guidance.officialEvidence = t.evidenceRefs.map((reference, i) => {
      const p = paragraphs.find((p) => p.id === reference);
      const m = c.body.materials.find((m) => m.id === reference);
      const page = (p ?? m).printedPage;
      return {
        evidenceId: `${unit.questionId}-E${i + 1}`,
        sourceType: p ? 'paragraph' : m.kind === 'table' ? 'table' : 'figure',
        printedPage: page, pdfPageZeroBased: page + pdfOffset - 1, reference,
        figureRef: m && m.kind !== 'table' ? m.id : null, tableRef: m?.kind === 'table' ? m.id : null,
        summary: p ? p.text : m.caption,
        reason: unit.explanation.reasoning, reviewStatus: 'completed',
      };
    });
    const topic = [t.promptText, t.knowledge, ...t.points].join(' ');
    unit.guidance.applicableFailureCauseIds = [
      'sc_b_requirement_misread','sc_b_evidence_missed','sc_b_evidence_misread',
      'sc_b_knowledge_gap','sc_b_missing_answer_element',
      ...(/主体|利用者|端末|認証|宛先|送信元/.test(topic) ? ['sc_b_actor_scope_confusion'] : []),
      ...(/脆弱性|攻撃|マルウェア/.test(topic) ? ['sc_b_attack_vulnerability_confusion'] : []),
      ...(/経緯|処理順|手順|流れ|因果/.test(topic) ? ['sc_b_direction_sequence_error'] : []),
      ...(/対策|管理策|WAF|ロック/.test(topic) ? ['sc_b_control_effect_mismatch'] : []),
      ...(/認証|認可|JWT|権限/.test(topic) ? ['sc_b_auth_access_confusion'] : []),
    ];
    unit.answerFields.forEach((f) => {
      const alternatives = transcript.alternativeOfficialExamples?.[unit.label]?.[f.fieldId];
      if (alternatives) {
        const first = /^公式例[①-⑳]：\n/.test(f.officialAnswer)
          ? f.officialAnswer.split(/\n公式例[①-⑳]：\n/)[0].replace(/^公式例[①-⑳]：\n/,'')
          : f.officialAnswer;
        const examples = [first, ...alternatives];
        const labels = transcript.officialExampleLabels?.[f.fieldId] ?? ['①','②','③'];
        f.officialAnswer = examples.map((text,i) => `公式例${labels[i]}：\n${text}`).join('\n');
        f.acceptedAnswers = examples;
      }
      if (t.choices) f.choices = choiceText(t.choices);
      if (t.fieldChoices?.[f.fieldId]) f.choices = choiceText(t.fieldChoices[f.fieldId]);
      f.scoringPoints = t.fieldPoints?.[f.fieldId] ?? (unit.answerFields.length > 1
        ? ['この設問の全欄の組合せとして確認する。', ...t.points]
        : t.points);
    });
    unit.answerStrategy = [
      '原文設問で対象・処理範囲・回答形式・字数と枝番を確認する',
      `必要知識を確認する：${t.knowledge}`,
      `根拠の条件から答案を作る：${unit.explanation.reasoning}`,
      '必要な主体・対象・条件・結果を答案に組み立て，指定形式に合わせる',
      `見直す：${unit.explanation.commonMistakes}`,
    ];
    if (transcript.alternativeOfficialExamples?.[unit.label]) {
      unit.explanation.officialAnswerReason = transcript.officialExamplesNote ?? 'IPA解答例の①～③を全て収録。同じ番号のあ～きを組合せとして比較する。①は連絡を装う添付メール，②は普段閲覧するWebサイトの改ざん，③はメール内URLと一括出力ファイルの送信という経緯。①～③以外でも本文の状況設定に沿ったリスクアセスメントの結果を認める旨がIPA解答例の備考にある。自分のあに対するい・関連項番・被害・頻度・評価・管理策の整合を確認する。';
      if (id === 'SC-2023-FALL-PM-Q04') unit.commentaryInsight = '採点講評では，シナリオが具体性に欠けて被害や頻度を評価できない解答，外部の第三者という前提に合わない解答が見られた。行為から機密性への影響までを具体的につなぐ。';
    }
  }
  if (id === 'SC-2023-FALL-PM-Q01') c.questionUnits.find((u) => u.label === '設問2').commentaryInsight =
    '採点講評では，開発者ツールで入力制限を削除したとする誤答が見られた。図3に残ったコメント区切りと複数の投稿を根拠に，実際の方法を説明する。';
  if (id === 'SC-2023-FALL-PM-Q04') {
    for (const u of c.questionUnits) {
      if (u.label === '設問1' || u.label === '設問2(1)') {
        u.relatedA2QuestionIds = ['A2-176'];
        u.relatedA2Categories = ['sc_security_management'];
      } else if (u.label === '設問2(2)') {
        u.relatedA2QuestionIds = ['A2-035'];
        u.relatedA2Categories = ['sc_security_threats'];
      }
    }
  }
  if (id === 'SC-2024-SPRING-PM-Q01') {
    const u = c.questionUnits.find((u) => u.label === '設問3(4)');
    u.relatedA2QuestionIds = ['A2-115'];
    u.relatedA2Categories = ['sc_security_assessment_controls'];
  }
  if (id === 'SC-2024-SPRING-PM-Q02') {
    for (const u of c.questionUnits) {
      if (u.label === '設問1(2)') {
        u.relatedA2QuestionIds = ['A2-211'];
        u.relatedA2Categories = ['sc_security_assessment_controls'];
        u.commentaryInsight = '採点講評ではIPS仕様を逆に理解した解答が見られた。表1の「しきい値を超えた通信」の比較条件から，低いしきい値による誤検知を説明する。';
      } else if (u.label === '設問1(3)') {
        u.relatedA2QuestionIds = ['A2-010'];
        u.relatedA2Categories = ['sc_security_threats'];
      } else if (u.label === '設問2(1)') {
        u.commentaryInsight = '採点講評では手順不足と異なる攻撃の説明が見られた。ID・パスワードとSMSコードを，正規利用者と攻撃者の入力画面に分けて順番に説明する。';
      } else if (u.label === '設問3(2)') {
        u.commentaryInsight = '採点講評の指摘に合わせて，SPAの仕様のうち盗聴済みパケットの再利用を拒否する項番2を根拠にする。';
      }
    }
  }
  if (id === 'SC-2024-SPRING-PM-Q03') {
    for (const u of c.questionUnits) {
      if (u.label === '設問1(2)') u.commentaryInsight = '採点講評では，スクリプトを実行する管理者と，全会員の情報を取得できる会員管理機能を結びつける観点が求められた。';
      if (u.label === '設問2(1)') u.commentaryInsight = '採点講評では攻撃者が取得したトークンの悪用を記述できない答案が多かった。表2の手順3と，罠フォームのトークンの取得主体を結びつける。';
      if (u.label === '設問4(3)') u.commentaryInsight = '採点講評ではクレデンシャル取得の方式の区別が不十分だった。PUTでトークンを取得する処理と，ヘッダ付き要求の処理を分ける。';
    }
  }
  if (id === 'SC-2024-SPRING-PM-Q04') {
    for (const u of c.questionUnits) {
      if (u.label === '設問2(4)') {
        u.relatedA2QuestionIds = ['A2-147'];
        u.relatedA2Categories = ['sc_security_implementation'];
      }
      if (u.label === '設問2(5)') u.commentaryInsight = '採点講評では例外発生時の動作を理解していない解答が見られた。ハッシュ化できなかったパスワードを正常なオブジェクトとして保存できる経路を止める。';
      if (u.label === '設問2(6)') u.commentaryInsight = '採点講評では例外時にも必ず実行する仕組みが重要とされた。finallyに資源解放を置き，途中の例外でcloseが飛ばされる経路を防ぐ。';
    }
  }
  if (id === 'SC-2024-FALL-PM-Q01') {
    const u = c.questionUnits.find((u) => u.label === '設問1(8)');
    u.relatedA2QuestionIds = ['A2-053'];
    u.relatedA2Categories = ['sc_security_assessment_controls'];
    u.commentaryInsight = '採点講評ではログ源のない解答が多かった。停止やRDPの反復という動作と，それを記録するサービス/ドメインサーバのログを対応づける。';
    c.questionUnits.find((u) => u.label === '設問2').commentaryInsight = '採点講評ではアクセス権の最小化を答えた誤答があった。今回は特別な権限を用いず持ち出しているため，読取り可能なファイルの外部送信を制限する。';
  }
  if (id === 'SC-2024-FALL-PM-Q03') {
    c.questionUnits.find((u) => u.label === '設問1').relatedA2QuestionIds = ['A2-052'];
    c.questionUnits.find((u) => u.label === '設問1').relatedA2Categories = ['sc_security_implementation'];
  }
  if (id === 'SC-2024-FALL-PM-Q04') {
    for (const u of c.questionUnits.filter((u) => ['設問1(1)','設問1(4)'].includes(u.label))) {
      u.relatedA2QuestionIds = ['A2-003'];
      u.relatedA2Categories = ['sc_security_threats'];
    }
  }
  if (id === 'SC-2025-SPRING-PM-Q02') {
    for (const u of c.questionUnits.filter((u) => ['設問4(1)','設問5(1)','設問6'].includes(u.label))) {
      u.relatedA2QuestionIds = ['A2-012'];
      u.relatedA2Categories = ['sc_security_assessment_controls'];
    }
  }
  if (id === 'SC-2025-SPRING-PM-Q03') {
    for (const u of c.questionUnits.filter((u) => ['設問2(1)','設問2(3)'].includes(u.label))) {
      u.relatedA2QuestionIds = ['A2-172'];
      u.relatedA2Categories = ['sc_crypto_auth_pki'];
    }
  }
  if (id === 'SC-2025-SPRING-PM-Q04') {
    const u = c.questionUnits.find((u) => u.label === '設問4(4)');
    u.relatedA2QuestionIds = ['A2-012'];
    u.relatedA2Categories = ['sc_security_assessment_controls'];
  }
}
writeFileSync(path, JSON.stringify(payload, null, 2) + '\n');
console.log('原本転記を適用: ' + Object.keys(allTranscripts).length + '大問（校閲承認は別工程）');
