import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { calculateQuestionContentHash } from '../src/domain/questionContent.mjs';
import {
  isQuestionImagePath,
  maximumQuestionImageBytes,
} from '../src/features/pwa/questionAssets.mjs';

const hashPattern = /^sha256:[a-f0-9]{64}$/;
const assetHashPattern = /^[a-f0-9]{64}$/;
const sourceIdPattern = /^([A-Z]{2,8})-([0-9]{4})-(SPRING|FALL|OCTOBER)-Q([0-9]{2})$/;
const a1OfficialSourceIdPattern = /^IPA-(KOUDO-AM1)-([0-9]{4})-(SPRING|FALL)-Q([0-9]{2})$/;
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function isStrictScA2(payload, strictScA2 = false) {
  return strictScA2 || /^sc-a2-/.test(payload?.metadata?.dataset_version ?? '');
}

export function readQuestionImageHash(src, publicDirectory) {
  if (!isQuestionImagePath(src))
    throw new Error('srcはquestions/sc/a2/等のローカル画像パスにしてください');
  const root = realpathSync(publicDirectory);
  const file = realpathSync(resolve(root, src));
  const withinRoot = relative(root, file);
  if (withinRoot.startsWith('..') || isAbsolute(withinRoot))
    throw new Error('画像がpublicディレクトリ外を参照しています');
  const stat = statSync(file);
  if (!stat.isFile() || stat.size > maximumQuestionImageBytes)
    throw new Error('画像は2MiB以下のファイルにしてください');
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

export function validateQuestionMaterialData(
  payload,
  { strictScA2 = false, publicDirectory = resolve('public'), checkHashes = true } = {},
) {
  const errors = [];
  const strict = isStrictScA2(payload, strictScA2);
  if (!record(payload) || !Array.isArray(payload.questions) || payload.questions.length === 0)
    return ['questionsは空でない配列にしてください'];
  if (strict && payload.questions.length > 240) errors.push('SC A-2問題数は240以下にしてください');
  if (!Number.isInteger(payload.schema_version) || payload.schema_version < 1)
    errors.push('schema_versionが不正です');
  if (!record(payload.metadata)) errors.push('metadataがありません');
  const version = payload.metadata?.dataset_version;
  if (
    (strict || version !== undefined) &&
    (!nonEmpty(version) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(version))
  )
    errors.push('metadata.dataset_versionが不正です');
  if (strict && (!nonEmpty(version) || !/^sc-a2-/.test(version)))
    errors.push('SC A-2にはsc-a2-で始まるdataset_versionが必要です');
  const sourceIds = new Map();
  const codes = new Set();
  const ids = new Set();
  for (const [index, question] of payload.questions.entries()) {
    const label = question?.code ?? `index:${index + 1}`;
    const startErrors = errors.length;
    if (!record(question)) {
      errors.push(`${label}: 問題がオブジェクトではありません`);
      continue;
    }
    if (!nonEmpty(question.code) || codes.has(question.code))
      errors.push(`${label}: codeが空又は重複しています`);
    codes.add(question.code);
    if (!Number.isInteger(question.id) || question.id < 1 || ids.has(question.id))
      errors.push(`${label}: idが不正又は重複しています`);
    ids.add(question.id);
    const pilotCode = /^A2-PILOT-SC-[0-9]{4}-(SPRING|FALL|OCTOBER)-Q[0-9]{2}$/;
    const validCode =
      version === 'sc-a2-pilot-v1'
        ? pilotCode.test(question.code ?? '')
        : /^A2-[0-9]{3}$/.test(question.code ?? '');
    if (strict && (question.subject_id !== 'a2' || !validCode))
      errors.push(`${label}: SC A-2のsubject_id/codeが不正です`);
    if ('dataset_version' in question)
      errors.push(`${label}: dataset_versionはmetadataに一度だけ指定してください`);
    for (const key of [
      'question',
      'explanation',
      'memory_point',
      'domain_id',
      'category_id',
      'subcategory_id',
      'subcategory',
      'status',
    ]) {
      if (!nonEmpty(question[key])) errors.push(`${label}: ${key}が空です`);
    }
    if (
      question.choice_explanations !== undefined &&
      (!record(question.choice_explanations) ||
        Object.keys(question.choice_explanations).sort().join(',') !== 'A,B,C,D' ||
        Object.values(question.choice_explanations).some((value) => !nonEmpty(value)))
    )
      errors.push(`${label}: choice_explanationsはA/B/C/Dすべての説明が必要です`);
    if (question.exam_tip !== undefined && !nonEmpty(question.exam_tip))
      errors.push(`${label}: exam_tipが空です`);
    if (
      question.related_terms !== undefined &&
      (!Array.isArray(question.related_terms) ||
        question.related_terms.length > 5 ||
        question.related_terms.some((term) => !nonEmpty(term)) ||
        new Set(question.related_terms).size !== question.related_terms.length)
    )
      errors.push(`${label}: related_termsは重複のない0～5件の用語にしてください`);
    if (!['基礎', '標準', '応用'].includes(question.difficulty))
      errors.push(`${label}: difficultyが不正です`);
    if (!['S', 'A', 'B'].includes(question.priority)) errors.push(`${label}: priorityが不正です`);
    if (!record(question.question_set) || !nonEmpty(question.question_set.id))
      errors.push(`${label}: question_setが不正です`);
    if (!Number.isInteger(question.schema_version) || question.schema_version < 1)
      errors.push(`${label}: schema_versionが不正です`);
    const choices = Array.isArray(question.choices) ? question.choices : [];
    const choiceIds = choices.map((choice) => choice?.id);
    if (
      choices.length !== 4 ||
      new Set(choiceIds).size !== 4 ||
      choiceIds.some((id) => !['A', 'B', 'C', 'D'].includes(id))
    )
      errors.push(`${label}: 選択肢IDはA/B/C/Dを一度ずつ指定してください`);
    if (!choiceIds.includes(question.correct_choice))
      errors.push(`${label}: correct_choiceが不正です`);
    for (const choice of choices) {
      if (!nonEmpty(choice?.text)) errors.push(`${label}: 選択肢本文が空です`);
      validateStimulus(
        choice?.stimulus,
        `${label} choice:${choice?.id}`,
        strict,
        publicDirectory,
        checkHashes,
        errors,
      );
    }
    validateStimulus(question.stimulus, label, strict, publicDirectory, checkHashes, errors);
    const source = record(question.source) ? question.source : {};
    if (!record(question.source)) errors.push(`${label}: sourceが不正です`);
    const sourceId = source.source_id;
    if (
      source.official_answer_choice_id !== undefined &&
      source.official_answer_choice_id !== question.correct_choice
    )
      errors.push(`${label}: 公式正解とcorrect_choiceが一致しません`);
    if (
      source.official_answer !== undefined &&
      ['A', 'B', 'C', 'D'][['ア', 'イ', 'ウ', 'エ'].indexOf(source.official_answer)] !==
        question.correct_choice
    )
      errors.push(`${label}: 公式正解のカナと選択肢IDが一致しません`);
    if (strict || sourceId !== undefined) {
      const isA1 = /^sc-a1-/.test(version ?? '');
      const originalA1 = isA1 && /^SC-A1-ORIGINAL-[0-9]{3}$/.test(sourceId ?? '');
      const match =
        typeof sourceId === 'string'
          ? sourceId.match(isA1 ? a1OfficialSourceIdPattern : sourceIdPattern)
          : null;
      if (originalA1) {
        if (source.type !== 'original' || source.verbatim_past_question !== false)
          errors.push(`${label}: A-1独自問題の出典種別が不正です`);
      } else if (match === null) errors.push(`${label}: source_idが不正です`);
      else if (
        source.exam !== match[1] ||
        source.year !== Number(match[2]) ||
        source.term !== match[3].toLowerCase() ||
        source.question_number !== Number(match[4])
      )
        errors.push(`${label}: source_idとexam/year/term/question_numberが一致しません`);
      if (nonEmpty(sourceId)) {
        if (sourceIds.has(sourceId))
          errors.push(`${label}: source_id重複: ${sourceId} (${sourceIds.get(sourceId)})`);
        sourceIds.set(sourceId, label);
      }
    }
    if (
      (strict || source.year !== undefined) &&
      (!Number.isInteger(source.year) || source.year < 2000 || source.year > 2100)
    )
      errors.push(`${label}: yearが不正です（2000～2100の整数）`);
    if (
      (strict || source.term !== undefined) &&
      !['spring', 'fall', 'october'].includes(source.term)
    )
      errors.push(`${label}: termが不正です`);
    if (
      (strict || source.question_number !== undefined) &&
      (!Number.isInteger(source.question_number) ||
        source.question_number < 1 ||
        source.question_number > 99)
    )
      errors.push(`${label}: question_numberが不正です`);
    for (const key of ['official_question_url', 'official_answer_url']) {
      if (strict || source[key] !== undefined) {
        try {
          const url = new URL(source[key]);
          if (
            url.protocol !== 'https:' ||
            (url.hostname !== 'ipa.go.jp' && !url.hostname.endsWith('.ipa.go.jp')) ||
            url.username ||
            url.password ||
            url.port
          )
            throw new Error();
        } catch {
          errors.push(`${label}: ${key}はIPA公式HTTPS URLにしてください`);
        }
      }
    }
    if (
      strict &&
      (source.exam !== 'SC' ||
        source.type !== 'official_past_question' ||
        !nonEmpty(source.basis) ||
        typeof source.verbatim_past_question !== 'boolean')
    )
      errors.push(`${label}: SC公式出典のexam/type/basis/verbatim_past_questionが不正です`);
    if (checkHashes && (strict || question.content_hash !== undefined)) {
      if (!hashPattern.test(question.content_hash ?? ''))
        errors.push(`${label}: content_hashがありません、又は形式が不正です`);
      else if (
        errors.length === startErrors &&
        calculateQuestionContentHash(question) !== question.content_hash
      )
        errors.push(`${label}: content_hashが問題内容と一致しません`);
    }
  }
  return errors;
}

function validateStimulus(stimulus, label, strict, publicDirectory, checkHashes, errors) {
  if (stimulus === undefined) return;
  if (!Array.isArray(stimulus)) {
    errors.push(`${label}: stimulusは配列にしてください`);
    return;
  }
  for (const item of stimulus) {
    if (!record(item)) {
      errors.push(`${label}: stimulusが不正です`);
      continue;
    }
    if (item.caption !== undefined && typeof item.caption !== 'string')
      errors.push(`${label}: captionは文字列にしてください`);
    switch (item.type) {
      case 'table':
        if (
          !Array.isArray(item.headers) ||
          !item.headers.length ||
          item.headers.some((value) => !nonEmpty(value)) ||
          !Array.isArray(item.rows) ||
          !item.rows.length ||
          item.rows.some(
            (row) =>
              !Array.isArray(row) ||
              row.length !== item.headers.length ||
              row.some((cell) => typeof cell !== 'string'),
          )
        )
          errors.push(`${label}: tableのheaders/rowsの構造が不正です`);
        break;
      case 'code':
        if (!nonEmpty(item.content)) errors.push(`${label}: code.contentが空です`);
        if (item.language !== undefined && !nonEmpty(item.language))
          errors.push(`${label}: code.languageが不正です`);
        break;
      case 'image':
        if (!nonEmpty(item.alt)) errors.push(`${label}: image.altがありません`);
        if (strict && !(typeof item.src === 'string' && item.src.startsWith('questions/sc/a2/')))
          errors.push(`${label}: SC A-2画像はquestions/sc/a2/へ配置してください`);
        try {
          const actualHash = readQuestionImageHash(item.src, publicDirectory);
          if (
            checkHashes &&
            (!assetHashPattern.test(item.asset_sha256 ?? '') || actualHash !== item.asset_sha256)
          )
            errors.push(`${label}: image.asset_sha256が画像内容と一致しません`);
        } catch (error) {
          errors.push(`${label}: image: ${error.message}`);
        }
        break;
      default:
        errors.push(`${label}: stimulus.typeが不正です`);
    }
  }
}

export function processQuestionContentHashes(
  payload,
  { mode, publicDirectory = resolve('public'), strictScA2 = false },
) {
  const output = structuredClone(payload);
  if (mode === 'check')
    return {
      payload: output,
      errors: validateQuestionMaterialData(output, { publicDirectory, strictScA2 }),
    };
  if (mode !== 'update') throw new Error('modeはcheck又はupdateにしてください');
  const errors = validateQuestionMaterialData(output, {
    publicDirectory,
    strictScA2,
    checkHashes: false,
  });
  if (errors.length) return { payload: output, errors };
  for (const question of output.questions) {
    for (const item of [
      ...(question.stimulus ?? []),
      ...question.choices.flatMap((choice) => choice.stimulus ?? []),
    ]) {
      if (item.type === 'image')
        item.asset_sha256 = readQuestionImageHash(item.src, publicDirectory);
    }
    question.content_hash = calculateQuestionContentHash(question);
  }
  return {
    payload: output,
    errors: validateQuestionMaterialData(output, { publicDirectory, strictScA2 }),
  };
}
