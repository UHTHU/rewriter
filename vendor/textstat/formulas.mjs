// Readability formulas adapted from textstat (MIT).
// textstat <https://github.com/textstat/textstat> pinned at commit
// 30303f95031f5e29f2811ea1bd4126f76cb828a1. The Python engine is not
// bundled; only the published formulas below are re-expressed for the
// browser. textstat computes syllables with CMUdict + pyphen; Rewriter uses
// a heuristic estimator (see readability.mjs), so results are approximate.
export const source = {
  name: 'textstat',
  commit: '30303f95031f5e29f2811ea1bd4126f76cb828a1',
  url: 'https://github.com/textstat/textstat',
  license: 'MIT',
};

// textstat/backend/metrics/_flesch_reading_ease.py (en config):
//   fre_base - fre_sentence_length * words/sentences - fre_syll_per_word * syllables/words
export const fleschReadingEase = { base: 206.835, sentenceLength: 1.015, syllablesPerWord: 84.6 };

// textstat/backend/metrics/_flesch_kincaid_grade.py:
//   0.39 * words/sentences + 11.8 * syllables/words - 15.59
export const fleschKincaidGrade = { sentenceLength: 0.39, syllablesPerWord: 11.8, base: -15.59 };

// textstat/backend/metrics/_gunning_fog.py:
//   0.4 * (words/sentences + 100 * complex words / words)
// textstat's "difficult words" cut-off is the syllable threshold (3).
export const gunningFog = { sentenceWeight: 0.4, complexSyllableThreshold: 3 };

// textstat/backend/metrics/_smog_index.py:
//   1.043 * sqrt(30 * polysyllables / sentences) + 3.1291
export const smogIndex = { base: 1.043, sampleSentences: 30, offset: 3.1291 };

// textstat/backend/metrics/_coleman_liau_index.py:
//   0.058 * (letters/words * 100) - 0.296 * (sentences/words * 100) - 15.8
export const colemanLiau = { letters: 0.058, sentences: 0.296, base: -15.8 };

// textstat/backend/metrics/_automated_readability_index.py:
//   4.71 * characters/words + 0.5 * words/sentences - 21.43
export const automatedReadabilityIndex = { characters: 4.71, sentenceLength: 0.5, base: -21.43 };
