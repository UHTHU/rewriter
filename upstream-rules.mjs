import { patterns } from './vendor/retext-simplify/patterns.mjs';

// All pinned upstream phrase mappings, not the upstream linter runtime.
// Pin updates explicitly; these suggestions never enter the preview unaccepted.
export const upstream = {
  name: 'retext-simplify',
  commit: 'c7686ac9c3e07c28f84be87e48d28328b4047e3c',
  url: 'https://github.com/retextjs/retext-simplify',
  license: 'MIT',
};
// Prefer an upstream alternative that fits ordinary prose; never strengthen
// "demonstrate" to "prove", or convert "subsequently" into a conjunction.
const preferred = { assistance: 'help', demonstrate: 'show', expedite: 'speed up', 'in a timely manner': 'promptly', subsequently: 'later', ameliorate: 'improve', deem: 'consider', facilitate: 'help' };
export const upstreamRules = Object.entries(patterns).map(([phrase, pattern]) => {
  // Upstream's literal "remove" is editorial guidance, not replacement prose.
  const alternatives = [...new Set(pattern.replace.map(value => value === 'remove' ? '' : value).concat(pattern.omit ? [''] : []))];
  if (!alternatives.length) throw new Error(`Missing upstream alternatives: ${phrase}`);
  return {
    id: `retext-${phrase.replaceAll(' ', '-')}`,
    phrase,
    replacement: preferred[phrase] ?? alternatives[0],
    alternatives,
    category: 'clarity',
    reason: 'An upstream plain-language suggestion. Review word sense, grammar, and technical meaning before accepting.',
    reviewOnly: true,
    source: upstream,
  };
});
