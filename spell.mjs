// Spell checking: dictionary lookup (Hunspell en_US, expanded via its affix
// rules) plus typo corrections and edit-distance suggestions. Everything is
// local data from vendor/dictionary-en and vendor/misspell; no runtime code
// from upstream is bundled. Detection is faithful, the suggestion ranking and
// the conservative word-shape filters below are Rewriter's own.
import { aff, dic, source as dictionarySource } from './vendor/dictionary-en/dictionary.mjs';
import { corrections, source as misspellSource } from './vendor/misspell/corrections.mjs';

let state = null;

function parseAff(text) {
  const rules = { PFX: [], SFX: [] };
  for (const line of text.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] !== 'PFX' && parts[0] !== 'SFX') continue;
    const [kind, flag, strip, value, condition] = parts;
    if (condition === undefined) continue; // header line: kind flag cross count
    rules[kind].push({
      flag,
      cross: strip !== undefined && parts.length === 5,
      strip: strip === '0' ? '' : strip,
      value: value === '0' ? '' : value,
      test: condition === '.' ? () => true
        : kind === 'SFX' ? stem => new RegExp(`${condition}$`).test(stem)
          : stem => new RegExp(`^${condition}`).test(stem),
      kind,
    });
  }
  return rules;
}

function ensure() {
  if (state) return state;
  const rules = parseAff(aff);
  const stems = new Map();
  const lines = dic.split('\n');
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const [word, flags = ''] = line.trim().split('/');
    stems.set(word, flags);
  }
  // Expand affix rules into valid surface forms, like a Hunspell checker.
  const words = new Set();
  const noSuggest = new Set();
  const add = (word, flags) => {
    words.add(word);
    if (flags.includes('!')) noSuggest.add(word);
  };
  for (const [stem, flags] of stems) {
    add(stem, flags);
    for (const rule of rules.PFX) {
      if (!flags.includes(rule.flag)) continue;
      if (!rule.test(stem) || (rule.strip && !stem.startsWith(rule.strip))) continue;
      add(rule.value + stem.slice(rule.strip.length), flags);
    }
    for (const rule of rules.SFX) {
      if (!flags.includes(rule.flag)) continue;
      if (!rule.test(stem) || (rule.strip && !stem.endsWith(rule.strip))) continue;
      add(stem.slice(0, stem.length - rule.strip.length) + rule.value, flags);
      // Cross products: prefix applied to an already-suffixed form.
      for (const pre of rules.PFX) {
        if (!flags.includes(pre.flag)) continue;
        const suffixed = stem.slice(0, stem.length - rule.strip.length) + rule.value;
        if (!pre.test(suffixed) || (pre.strip && !suffixed.startsWith(pre.strip))) continue;
        add(pre.value + suffixed.slice(pre.strip.length), flags);
      }
    }
  }
  const typos = new Map();
  for (let i = 0; i < corrections.length; i += 2) typos.set(corrections[i], corrections[i + 1]);
  state = { words, noSuggest, typos };
  return state;
}

// Norvig-style candidate generation against the expanded dictionary.
function edits1(word) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const out = [];
  for (let i = 0; i < word.length; i++) out.push(word.slice(0, i) + word.slice(i + 1));
  for (let i = 0; i + 1 < word.length; i++) out.push(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
  for (let i = 0; i < word.length; i++) for (const letter of letters) out.push(word.slice(0, i) + letter + word.slice(i + 1));
  for (let i = 0; i <= word.length; i++) for (const letter of letters) out.push(word.slice(0, i) + letter + word.slice(i));
  return out;
}

export function suggest(word, limit = 5) {
  const { words, noSuggest } = ensure();
  const lower = word.toLowerCase();
  const rank = candidate => [
    candidate[0] === lower[0] ? 0 : 1,
    Math.abs(candidate.length - lower.length),
    candidate,
  ];
  const collect = variants => variants.filter(candidate => words.has(candidate) && !noSuggest.has(candidate));
  let found = collect([...new Set(edits1(lower))]);
  if (!found.length && lower.length <= 10) {
    const second = new Set();
    for (const variant of new Set(edits1(lower))) for (const more of edits1(variant)) second.add(more);
    found = collect([...second]);
  }
  return found.sort((a, b) => {
    const [ra, rb] = [rank(a), rank(b)];
    return ra[0] - rb[0] || ra[1] - rb[1] || (ra[2] < rb[2] ? -1 : 1);
  }).slice(0, limit);
}

function matchCase(original, replacement) {
  if (!replacement) return '';
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (/^[A-Z]/.test(original)) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

// Scan a text for words worth flagging. Conservative word-shape filters:
// contractions and possessives (apostrophes), acronyms (ALLCAPS), and
// inner-caps names (iPhone) are skipped; capitalized unknowns are treated
// as proper nouns unless they match a known typo.
export function spellScan(text) {
  const { words, typos } = ensure();
  const hits = [];
  for (const match of text.matchAll(/[\p{L}][\p{L}]*/gu)) {
    const original = match[0];
    const lower = original.toLowerCase();
    if (original.length < 2) continue;
    const isUpper = original === original.toUpperCase();
    const isCapitalized = /^[A-Z]/.test(original) && original.slice(1) === original.slice(1).toLowerCase();
    if (isUpper || (!isCapitalized && original !== lower)) continue;
    const known = words.has(lower) || words.has(original);
    const typo = typos.get(lower);
    if (typo) {
      hits.push({
        start: match.index,
        end: match.index + original.length,
        original,
        replacement: matchCase(original, typo),
        alternatives: [matchCase(original, typo), ...suggest(lower, 4).map(value => matchCase(original, value))],
        source: misspellSource,
        reason: `“${original}” is a common misspelling of “${matchCase(original, typo)}”.`,
      });
      continue;
    }
    if (known) continue;
    if (isCapitalized) continue; // proper noun by assumption
    const options = suggest(lower);
    if (options.length) {
      hits.push({
        start: match.index,
        end: match.index + original.length,
        original,
        replacement: matchCase(original, options[0]),
        alternatives: options.map(value => matchCase(original, value)),
        source: dictionarySource,
        reason: `“${original}” is not in the bundled dictionary. Did you mean “${matchCase(original, options[0])}”?`,
      });
    } else {
      hits.push({
        start: match.index,
        end: match.index + original.length,
        original,
        source: dictionarySource,
        reason: `“${original}” is not in the bundled dictionary. If it is a name or a technical term, protect it under Keep specific terms unchanged.`,
      });
    }
  }
  return hits;
}

export const spellChecks = [{
  id: 'spell',
  category: 'spelling',
  dataset: 'spell',
  reviewOnly: true,
  scan: spellScan,
}];
