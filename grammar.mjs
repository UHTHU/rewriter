// Grammar and confused-word checks. These are Rewriter's own authored rules
// (dataset "rewriter"), written as context patterns in the spirit of
// Grammarly's correctness pass. Context decides which fix applies, so each
// pattern names its own target word (hitGroup) and carries a static
// replacement. Everything is review-first: the engine shows the rewrite,
// the user decides. Where English usage is genuinely contested (double
// negatives, "less" + plural), the check is a finding instead.

// "could of" and friends are always "could have".
const auxiliaries = 'could|would|should|must|might|may';

// Comparators after which "then" is a slip for "than".
const comparators = 'more|less|rather|other|better|worse|greater|fewer|bigger|smaller|higher|lower|faster|slower|older|younger|stronger|weaker|larger|easier|harder|further';

// Time markers after which "than" is a slip for "then" ("since then").
const timeMarkers = 'since|until|till|from|back|before|by';

// Nouns that usually follow a possessive pronoun ("their house").
const possessed = 'own|parents|friends|house|car|way|time|work|job|lives|children|team|money|role|turn|first|last|best|new|home|family|life|name|place|purpose|value|meaning|history|future|position|status|performance|account|password|email|files|device|phone|computer|tail|head|hand|side|end|start|size|cost|color|colour|length|width|height|area|share|impact|effect|use|content|form|function|features|owner|creator|author|members|staff|customers|users';

// Verb-ish followers that make "its" / "your" contraction slips ("its been").
const contracted = 'a|an|not|been|going|welcome|already|still|too|so|very';

// "a university" (consonant sound) and "an hour" (vowel sound): words whose
// spelling misleads the article.
const consonantSound = 'university|universities|user|users|uniform|uniforms|unit|units|unique|united|universal|universe|universes|usage|use|used|useful|useless|usual|usually|utility|utilities|european|europeans|one|once|unicorn|unicorns|union|unions|url|urls|ukulele|eulogy|euphemism|ubiquitous';
const vowelSound = 'hour|hours|honest|honestly|honor|honour|honors|honours|honorable|honourable|heir|heirs|heirloom|heirlooms';

const rule = (id, pattern, replacement, reason, extra = {}) => ({
  id: `grammar-${id}`,
  category: 'grammar',
  reviewOnly: true,
  pattern,
  flags: 'gi',
  hitGroup: 'hit',
  replacement,
  reason,
  ...extra,
});

export const grammarRules = [
  rule('could-of', `\\b(?:${auxiliaries})[ \\t]+(?<hit>of)\\b`, 'have',
    '“could of” is a mishearing of “could have”.'),
  rule('then-than', `\\b(?:${comparators})[ \\t]+(?<hit>then)\\b`, 'than',
    'Comparisons use “than”; “then” marks time.'),
  rule('than-then', `\\b(?:${timeMarkers})[ \\t]+(?<hit>than)\\b`, 'then',
    'Time references use “then”; “than” compares.'),
  rule('their-there', '\\b(?<hit>their)(?=[ \\t]+(?:is|are|was|were|will\\s+be|would\\s+be|has\\s+been|have\\s+been|had\\s+been)\\b)', 'there',
    '“there” points to existence; “their” shows possession.'),
  rule('there-their', `\\b(?<hit>there)[ \\t]+(?:${possessed})\\b`, 'their',
    '“their” shows possession; “there” points to existence.'),
  rule('its-its', `\\b(?<hit>it['’]s)(?=[ \\t]+(?:${possessed})\\b)`, 'its',
    '“its” is possessive; “it’s” means “it is”.'),
  rule('its-its-2', `\\b(?<hit>its)(?=[ \\t]+(?:${contracted})\\b)`, 'it’s',
    '“it’s” means “it is”; “its” is possessive.'),
  rule('your-youre', `\\b(?<hit>your)(?=[ \\t]+(?:${contracted})\\b)`, 'you’re',
    '“you’re” means “you are”; “your” shows possession.'),
  rule('youre-your', `\\b(?<hit>you['’]re)(?=[ \\t]+(?:${possessed})\\b)`, 'your',
    '“your” shows possession; “you’re” means “you are”.'),
  rule('to-too', '\\b(?<hit>to)(?=[ \\t]+(?:much|many)(?![ \\t]+of\\b)|[ \\t]+(?:late|far|early|small|big|long|short|old|young|soon|difficult|easy|expensive|cheap|heavy|light|hot|cold|slow|fast|loud|quiet|rare|common)\\b)', 'too',
    '“too” means excessively; “to” is a preposition.'),
  rule('alot', '\\b(?<hit>alot)\\b', 'a lot',
    '“a lot” is two words.'),
  rule('you-and-i', '\\b(?<hit>you[ \\t]+and[ \\t]+I)\\b', 'you and me',
    'After a preposition like “between”, the object form “me” is standard.',
    { allowMixedCase: true }),
  rule('a-an', `\\b(?<hit>a)(?=[ \\t]+(?:(?!${consonantSound}\\b)[aeiouAEIOU]\\w*|(?:${vowelSound})\\b))`, 'an',
    'Use “an” before a vowel sound.'),
  rule('an-a', `\\b(?<hit>an)(?=[ \\t]+(?!${vowelSound}\\b)[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]\\w*)`, 'a',
    'Use “a” before a consonant sound.'),
  // Contested or heuristic: findings only, never rewrites.
  {
    id: 'grammar-double-negative',
    category: 'grammar',
    pattern: "\\b(?:don['’]t|doesn['’]t|didn['’]t|can['’]t|won['’]t|couldn['’]t|wouldn['’]t|shouldn['’]t|isn['’]t|aren['’]t|wasn['’]t|weren['’]t|haven['’]t|hasn['’]t|hadn['’]t|ain['’]t|(?:do|does|did|is|are|was|were|have|has|had|will|would|could|should|must)[ \\t]+not)[ \\t]+(?:\\w+[ \\t]+){0,2}(?:no|nothing|nobody|none|nowhere|never)\\b",
    flags: 'gi',
    reason: 'A double negative cancels itself in standard English. Use “any”-forms instead (“didn’t see anything”).',
  },
  {
    id: 'grammar-less-plural',
    category: 'grammar',
    pattern: '\\b(?<hit>less)(?=[ \\t]+(?!is\\b|was\\b|has\\b|as\\b|than\\b|of\\b|about\\b|so\\b|such\\b)(?:[a-z]+s))\\b',
    flags: 'gi',
    hitGroup: 'hit',
    reason: '“fewer” counts things (“fewer issues”); “less” measures amounts (“less effort”). Review the noun first.',
  },
];
