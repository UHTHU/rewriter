// Analysis checks adapted from write-good (MIT) and proselint (BSD-3-Clause).
// Data lives in vendor/write-good/ and vendor/proselint/; this file maps that
// data onto Rewriter's engine as two kinds of rule:
//
//   - entries with a replacement become review-first suggestions the user
//     can accept ("Findings + rewrites where safe");
//   - entries without a replacement become findings: advisory flags with a
//     position and an explanation that never touch the draft.
//
// The rewrites marked "original curation" below are Rewriter's own editorial
// choices; upstream only detects the phrase.
import {
  source as writeGood,
  weasels,
  weaselExceptions,
  passiveAuxiliaries,
  passiveIrregulars,
  passiveExceptions,
  adverbStems,
  weakeners,
  wordyPhrases,
  cliches,
} from './vendor/write-good/lexicons.mjs';
import {
  source as proselint,
  hedgePhrases,
  rasSyndrome,
  wallaceRedundancy,
  nordquistRedundancy,
  comparators,
  fancyComparators,
  uncomparables,
  lexicalIllusionPattern,
  lexicalIllusionExceptions,
} from './vendor/proselint/checks.mjs';
import { spellChecks } from './spell.mjs';
import { grammarRules } from './grammar.mjs';

// Original curation: intensifiers whose removal leaves the meaning intact.
// Removal rewrites only survive at match time when grammar stays sound (the
// engine downgrades sentence-initial removals to findings).
const intensifiers = [
  'very', 'really', 'extremely', 'exceedingly', 'completely', 'totally',
  'absolutely', 'utterly', 'incredibly', 'remarkably', 'quite', 'simply',
  'just', 'merely', 'basically', 'actually', 'literally', 'truly',
];

// Original curation: plain alternatives for a conservative subset of the
// no-cliches list. Every other cliché stays a finding.
const clicheRewrites = {
  'in a nutshell': 'briefly',
  'in the nick of time': 'just in time',
  'time and time again': 'repeatedly',
  'last but not least': 'finally',
  'few and far between': 'rare',
  'tried and true': 'reliable',
  'once in a blue moon': 'rarely',
  'a dime a dozen': 'common',
  'under the weather': 'unwell',
  'hit the nail on the head': 'exactly right',
};

const quoted = text => `“${text}”`;
const findingId = (check, phrase) => `${check}-${phrase.toLowerCase().replaceAll(' ', '-')}`;

// write-good exempts "too many" / "too few" as quantifiers. Upstream's
// adverb list still catches "many" through its "man" stem, so Rewriter
// extends the same exemption there — an explicit curation choice.
const tooQuantifier = (text, start, end) => weaselExceptions.includes(text.slice(start, end).toLowerCase())
  && text.slice(Math.max(0, start - 4), start).toLowerCase() === 'too ';

// --- phrase-based checks ----------------------------------------------------
export const phraseChecks = [
  // write-good "tooWordy": "is wordy or unneeded". Where Rewriter already has
  // a rewrite rule for the same span, the engine keeps the rewrite and drops
  // this finding.
  ...wordyPhrases.map(phrase => ({
    id: findingId('write-good-wordy', phrase),
    phrase,
    category: 'wordiness',
    source: writeGood,
    reviewOnly: true,
    reason: original => `${quoted(original)} is wordy or unneeded.`,
  })),
  // write-good "weasel": "is a weasel word".
  ...weasels.map(phrase => ({
    id: findingId('write-good-weasel', phrase),
    phrase,
    category: 'voice',
    source: writeGood,
    reviewOnly: true,
    reason: original => `${quoted(original)} is a weasel word: it hides who says or does what.`,
    skip: tooQuantifier,
  })),
  // write-good "adverb": "can weaken meaning". Adverb stems take "y"
  // (absolutel → absolutely), matching the upstream regex.
  ...adverbStems.map(stem => `${stem}y`).concat(weakeners).map(phrase => ({
    id: findingId('write-good-adverb', phrase),
    phrase,
    category: 'voice',
    source: writeGood,
    reviewOnly: true,
    reason: original => `${quoted(original)} can weaken meaning.`,
    skip: (text, start, end) => intensifiers.includes(text.slice(start, end).toLowerCase()) || tooQuantifier(text, start, end),
  })),
  // Original curation over write-good's lists: safe intensifier removals.
  ...intensifiers.map(phrase => ({
    id: findingId('write-good-intensifier', phrase),
    phrase,
    replacement: '',
    category: 'voice',
    source: writeGood,
    reviewOnly: true,
    protectCase: true,
    reason: original => `${quoted(original)} is an intensifier. Removing it usually strengthens the sentence.`,
  })),
  // write-good "cliches" (via no-cliches, MIT): "is a cliche".
  ...cliches.map(phrase => {
    const rewrite = clicheRewrites[phrase];
    return {
      id: findingId('write-good-cliche', phrase),
      phrase,
      ...(rewrite ? { replacement: rewrite, alternatives: [rewrite, ''] } : {}),
      category: 'phrasing',
      source: writeGood,
      reviewOnly: true,
      reason: rewrite
        ? original => `${quoted(original)} is a cliché. ${quoted(rewrite)} is plainer.`
        : original => `${quoted(original)} is a cliché. Say the specific thing you mean.`,
    };
  }),
  // proselint "hedging": "Hedging. Just say it." Punctuation-led phrases
  // also get a both-commas form so a mid-sentence parenthetical (", so to
  // speak,") removes cleanly without leaving a stray comma.
  ...hedgePhrases.flatMap(phrase => [phrase, ...(phrase.startsWith(',') ? [`${phrase},`] : [])]).map(phrase => ({
    id: findingId('proselint-hedge', phrase),
    phrase,
    replacement: '',
    category: 'phrasing',
    source: proselint,
    reviewOnly: true,
    protectCase: true,
    reason: original => `Hedging. Removing ${quoted(original)} makes the claim direct.`,
  })),
  // proselint "redundancy": preferred-form pairs (RAS syndrome, Wallace,
  // Nordquist). Acronym case ("PIN number") is expected, so the engine's
  // mixed-case guard is disabled here.
  ...[...rasSyndrome, ...wallaceRedundancy, ...nordquistRedundancy].map(([phrase, replacement]) => ({
    id: findingId('proselint-redundancy', phrase),
    phrase,
    replacement,
    alternatives: [replacement, ''],
    category: 'phrasing',
    source: proselint,
    allowMixedCase: true,
    reviewOnly: true,
    reason: original => `Redundancy. Use ${quoted(replacement)} instead of ${quoted(original)}.`,
  })),
];

// --- pattern-based checks ---------------------------------------------------
export const patternChecks = [
  // write-good "passive": "may be passive voice" (auxiliary + past participle).
  {
    id: 'write-good-passive',
    category: 'voice',
    source: writeGood,
    pattern: `\\b(?:${passiveAuxiliaries.join('|')})\\b\\s*(?:[\\w]+ed|${passiveIrregulars.join('|')})\\b`,
    flags: 'gi',
    reason: original => `${quoted(original)} may be passive voice. Name the actor when the action matters.`,
    skip: (text, start, end) => passiveExceptions.includes(text.slice(start, end).split(/\s+/).pop().toLowerCase()),
  },
  // write-good "illusion" / proselint "lexical_illusions" (proselint credits
  // write-good): a phrase accidentally repeated.
  {
    id: 'write-good-illusion',
    category: 'voice',
    source: writeGood,
    pattern: lexicalIllusionPattern,
    flags: 'gi',
    reason: original => `A phrase is repeated: ${quoted(original)}. This is often a lexical illusion, not emphasis.`,
    skip: (text, start, end) => lexicalIllusionExceptions.includes(text.slice(start, end).toLowerCase()),
  },
  // write-good "so": "adds no meaning". Flagged, not removed: deleting a
  // sentence opener would leave the next word uncapitalized.
  {
    id: 'write-good-so',
    category: 'voice',
    source: writeGood,
    pattern: '(?:^|[.!?][ \\t]+|\\n)[ \\t]*(?<hit>so)\\b',
    flags: 'gim',
    hitGroup: 'hit',
    reason: original => `Opening with ${quoted(original)} adds no meaning. Consider cutting the sentence opener.`,
  },
  // write-good "thereIs": "is unnecessary verbiage".
  {
    id: 'write-good-there-is',
    category: 'voice',
    source: writeGood,
    pattern: '(?:^|[.!?][ \\t]+|\\n)[ \\t]*(?<hit>there\\b[ \\t]+(?:is|are)\\b)',
    flags: 'gim',
    hitGroup: 'hit',
    reason: original => `${quoted(original)} is unnecessary verbiage. Lead with the real subject.`,
  },
  // proselint "uncomparables": absolute adjectives cannot be graded.
  {
    id: 'proselint-uncomparables',
    category: 'phrasing',
    source: proselint,
    pattern: `\\b(?<hit>(?:${[...comparators, ...fancyComparators].join('|')})[ \\t]+(?:${uncomparables.join('|')}))\\b`,
    flags: 'gi',
    hitGroup: 'hit',
    reason: original => `Comparison of an uncomparable: ${quoted(original)} is not comparable.`,
  },
];

// Every text-level check the engine runs: regex-based patterns plus
// scan-based checks (spell) that report their own spans and replacements.
export const textChecks = [...patternChecks, ...grammarRules, ...spellChecks];
