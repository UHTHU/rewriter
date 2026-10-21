// Writing score and tone readout. The score is a documented heuristic blend
// of textstat-based readability, sentence shape, and vocabulary variety; the
// tone readout aggregates VADER valences (MIT) with Rewriter's own
// formality and confidence signals. Descriptive before/after indicators,
// not grades or authorship scores.
import { readability, syllablesInWord } from './readability.mjs';
import { valence } from './vendor/vader/lexicon.mjs';

export { source as vaderSource } from './vendor/vader/lexicon.mjs';

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const round = value => Math.round(value * 10) / 10;

// Word tokens follow engine.mjs metrics so all counts agree.
const tokenize = text => text.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu) || [];
const sentences = text => text.trim() ? text.split(/[.!?]+(?:\s|$)/).filter(part => part.trim()) : [];

const contraction = /['’]\w+$/;
const firstOrSecondPerson = /^(i|we|you|me|us|my|our|your|yours|ours|mine)$/i;
const tentative = ['maybe', 'perhaps', 'possibly', 'might', 'could', 'seems', 'seem', 'appears', 'appear', 'probably', 'somewhat', 'rather', 'fairly', 'guess'];
const assertive = ['will', 'must', 'definitely', 'certainly', 'clearly', 'always', 'never', 'absolutely', 'obviously', 'proves', 'prove', 'ensures', 'ensure'];

// VADER-style aggregation: sum valences, then bound the total.
export function sentiment(text) {
  const words = tokenize(text).map(word => word.toLowerCase().replace(/[^a-z']/g, ''));
  let total = 0;
  let hits = 0;
  for (const word of words) {
    if (word in valence) { total += valence[word]; hits += 1; }
  }
  if (!hits) return { label: 'neutral', compound: 0 };
  const compound = total / Math.sqrt(total * total + 15);
  return { label: compound >= 0.05 ? 'positive' : compound <= -0.05 ? 'negative' : 'neutral', compound: round(compound) };
}

export function tone(text) {
  const words = tokenize(text);
  const lower = words.map(word => word.toLowerCase());
  const count = words.length || 1;
  const contractions = words.filter(word => contraction.test(word)).length / count;
  const personal = lower.filter(word => firstOrSecondPerson.test(word)).length / count;
  const longWords = words.filter(word => syllablesInWord(word) >= 3).length / count;
  const tentativeRate = lower.filter(word => tentative.includes(word)).length / count;
  const assertiveRate = lower.filter(word => assertive.includes(word)).length / count;
  const formality = contractions > 0.02 || personal > 0.06 ? 'casual'
    : contractions < 0.005 && personal < 0.01 && longWords > 0.12 ? 'formal' : 'neutral';
  const confidence = tentativeRate >= 0.02 ? 'tentative'
    : assertiveRate >= 0.02 && tentativeRate < 0.01 ? 'confident' : 'neutral';
  return { ...sentiment(text), formality, confidence };
}

// 0-100 blend: readability (55%), long-sentence share (20%), vocabulary
// variety (25%). Accepting edits moves the score because the text moves.
export function writingScore(text) {
  const words = tokenize(text);
  if (!words.length) return 0;
  const easeNorm = clamp(readability(text).ease, 0, 100);
  const parts = sentences(text);
  const longShare = parts.filter(part => tokenize(part).length > 30).length / parts.length;
  const unique = new Set(words.map(word => word.toLowerCase())).size / words.length;
  return Math.round(
    0.55 * easeNorm
    + 0.2 * (100 - 100 * longShare)
    + 0.25 * clamp((unique - 0.35) / 0.4 * 100, 0, 100),
  );
}
