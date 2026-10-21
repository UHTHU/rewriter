// Readability and sentence-complexity metrics, adapted from textstat (MIT,
// pinned in vendor/textstat/formulas.mjs). Counts feed the published
// formulas; syllable counts use an English heuristic instead of textstat's
// CMUdict + pyphen pipeline, so every value here is approximate.
import * as formulas from './vendor/textstat/formulas.mjs';

export const readabilitySource = formulas.source;

// Vowel-group heuristic with common silent-e and -le endings. Deliberately
// simple: good enough for before/after comparisons, not for linguistics.
export function syllablesInWord(input) {
  const word = input.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  const stripped = word
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '');
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return groups ? Math.max(1, groups.length) : 1;
}

// Word and sentence counting follow engine.mjs metrics so both agree.
export function readabilityCounts(text) {
  const words = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu) || [];
  const sentences = text.trim() ? text.split(/[.!?]+(?:\s|$)/).filter(part => part.trim()).length || 1 : 0;
  let syllables = 0;
  let complexWords = 0;
  let letters = 0;
  for (const word of words) {
    const count = syllablesInWord(word);
    syllables += count;
    if (count >= formulas.gunningFog.complexSyllableThreshold) complexWords += 1;
    letters += (word.match(/[\p{L}\p{N}]/gu) || []).length;
  }
  return { words: words.length, sentences, syllables, complexWords, letters };
}

const round = value => Math.round(value * 10) / 10;

export function readability(text) {
  const counts = readabilityCounts(text);
  const { words, sentences, syllables, complexWords, letters } = counts;
  const perWord = words ? syllables / words : 0;
  const wordsPerSentence = sentences ? words / sentences : 0;
  const sentencesPerWord = words ? sentences / words : 0;
  const lettersPerWord = words ? letters / words : 0;
  return {
    ...counts,
    ease: words && sentences
      ? round(formulas.fleschReadingEase.base
        - formulas.fleschReadingEase.sentenceLength * wordsPerSentence
        - formulas.fleschReadingEase.syllablesPerWord * perWord)
      : 0,
    grade: words && sentences
      ? round(formulas.fleschKincaidGrade.sentenceLength * wordsPerSentence
        + formulas.fleschKincaidGrade.syllablesPerWord * perWord
        + formulas.fleschKincaidGrade.base)
      : 0,
    fog: words && sentences
      ? round(formulas.gunningFog.sentenceWeight * (wordsPerSentence + 100 * complexWords / words))
      : 0,
    smog: sentences
      ? round(formulas.smogIndex.base * Math.sqrt(formulas.smogIndex.sampleSentences * complexWords / sentences)
        + formulas.smogIndex.offset)
      : 0,
    colemanLiau: words && sentences
      ? round(formulas.colemanLiau.letters * lettersPerWord * 100
        - formulas.colemanLiau.sentences * sentencesPerWord * 100
        + formulas.colemanLiau.base)
      : 0,
    ari: words && sentences
      ? round(formulas.automatedReadabilityIndex.characters * lettersPerWord
        + formulas.automatedReadabilityIndex.sentenceLength * wordsPerSentence
        + formulas.automatedReadabilityIndex.base)
      : 0,
  };
}
