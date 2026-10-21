import { rules } from './rules.mjs';
import { phraseChecks, patternChecks } from './checks.mjs';
import { readability, readabilityCounts } from './readability.mjs';

export const MAX_LENGTH = 200_000;
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const word = character => !!character && /[\p{L}\p{N}_]/u.test(character);
const compiledRules = [...rules, ...phraseChecks].map(rule => ({
  ...rule,
  pattern: new RegExp(escape(rule.phrase).replaceAll(' ', '[ \\t]+'), 'gi'),
  guards: Object.fromEntries(Object.entries(rule.context || {})
    .filter(([, value]) => typeof value === 'string')
    .map(([key, value]) => [key, new RegExp(value, 'i')])),
}));

// Pattern checks carry their own regex; the `d` flag exposes group indices
// so a check can report a narrower span (hitGroup) than the full match.
const compiledPatterns = patternChecks.map(check => ({
  ...check,
  regex: new RegExp(check.pattern, check.flags.includes('d') ? check.flags : `${check.flags}d`),
}));

// Removing a sentence opener would leave the next word uncapitalized, so a
// removal rewrite at sentence start is downgraded to a finding.
function breaksSentence(text, start, end) {
  const atStart = /(?:^|[.!?][ \t]*)[ \t\n]*$/.test(text.slice(0, start));
  const next = text.slice(end).match(/^[ \t]*([^\s])/);
  return atStart && !!next && /[a-z]/.test(next[1]);
}

function matchesContext(rule, text, start, end) {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const guards = rule.guards;
  if (rule.context?.sentenceStart && !/(?:^|[.!?][ \t]+|\n)[ \t]*$/.test(before)) return false;
  if (guards.before && !guards.before.test(before)) return false;
  if (guards.after && !guards.after.test(after)) return false;
  if (guards.unlessBefore?.test(before) || guards.unlessAfter?.test(after)) return false;
  // Participial uses need "begun", not "began". A previous auxiliary may
  // have intervening adverbs, so decline the entire clause conservatively.
  if (rule.phrase === 'commenced' && /\b(?:has|have|had|be|been|being|is|are|was|were)\b[^.!?;:\n]*$/i.test(before)) return false;
  return true;
}

export function protectedRanges(text, { protectQuotes = true, protectedTerms = [] } = {}) {
  if (!Array.isArray(protectedTerms) || protectedTerms.length > 100 || protectedTerms.some(term => typeof term !== 'string' || term.length > 120)) {
    throw new Error('Use up to 100 protected terms, with 120 characters or fewer per term.');
  }
  const ranges = [];
  const add = (pattern, kind) => {
    for (const match of text.matchAll(pattern)) ranges.push({ start: match.index, end: match.index + match[0].length, kind });
  };
  // Fences extend to EOF if the closing delimiter is absent.
  add(/(^|\n)[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n[ \t]*\2[ \t]*(?=\n|$)|$)/g, 'Code');
  add(/(`+)[^\n]*?\1/g, 'Code');
  add(/^([ \t]{4}|\t).+$/gm, 'Code');
  add(/\$\$[\s\S]*?\$\$|\$[^\n$]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, 'Math');
  add(/\\begin\{([^}]+)\}[\s\S]*?\\end\{\1\}/g, 'LaTeX environment');
  add(/\\[a-zA-Z]+\*?(?:\[[^\]\n]*\])?(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*/g, 'LaTeX command');
  add(/https?:\/\/[^\s<>"'\])}]+|\bwww\.[^\s<>]+|\b[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/g, 'Link');
  add(/!?\[[^\]\n]*\]\([^\n)]*\)|^\s*\[[^\]\n]+\]:[^\n]*|\[[^\]\n]*\]\[[^\]\n]*\]/gm, 'Markdown link');
  add(/\[\d+(?:[\s,;–-]+\d+)*\]|\[@[^\]\n]+\]|\([^()\n]*\b(?:19|20)\d{2}[a-z]?[^()\n]*\)/g, 'Citation');
  add(/<[^>\n]+>/g, 'Markup');
  add(/^\s*>[^\n]*/gm, 'Block quote');
  // Custom terms are literal strings, never executable regex patterns.
  for (const term of protectedTerms) {
    if (typeof term !== 'string' || !term.trim()) continue;
    const pattern = new RegExp(escape(term.trim()).replaceAll(' ', '[ \\t]+'), 'gi');
    for (const match of text.matchAll(pattern)) {
      const start = match.index, end = start + match[0].length;
      if (word(text[start - 1]) || word(text[end])) continue;
      ranges.push({ start, end, kind: 'Custom term' });
    }
  }
  if (protectQuotes) {
    add(/“[^”]*”|"[^"\n]*"|‘[^’\n]*’/g, 'Quotation');
    add(/(?<![\p{L}\p{N}])'[^'\n]+'(?![\p{L}\p{N}])/gu, 'Quotation');
  }
  return ranges.sort((a, b) => a.start - b.start);
}

function matchCase(original, replacement) {
  if (!replacement) return '';
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (/^[A-Z]/.test(original)) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

function replacementFor(rule, text, end) {
  if (rule.phrase === 'the majority of') {
    const following = text.slice(end);
    // "Most participants", but "most of the participants" / "most of us".
    const determiner = /^\s+(?:the|this|that|these|those|my|your|his|her|its|our|their|us|them|you|whom|which|it)\b|^\s+[\p{L}]+['’]s\b/iu;
    if (!determiner.test(following)) return 'most';
  }
  return rule.replacement;
}

// Dataset key for the source selector: rules without upstream provenance are
// Rewriter's own. Merged overlaps keep Rewriter's defaults, so they belong to
// "rewriter" and only expose retext-simplify as extra alternatives.
function datasetOf(rule) {
  return rule.source?.name ?? 'rewriter';
}

export function analyze(text, options = {}) {
  if (text.length > MAX_LENGTH) throw new Error(`Please use ${MAX_LENGTH.toLocaleString()} characters or fewer.`);
  const protectedSpans = protectedRanges(text, options);
  // `sources` selects datasets by repo; `categories` selects focus areas.
  // When sources are given, every category in those datasets is in scope.
  const enabled = options.sources ? null : (options.categories || ['wordiness', 'clarity']);
  const inScope = rule => (enabled ? enabled.includes(rule.category) : true)
    && (!options.sources || options.sources.includes(datasetOf(rule)));
  const candidates = [];
  const findings = [];
  const skippedContext = [];
  const covered = (start, end) => protectedSpans.some(span => start < span.end && end > span.start);
  for (const rule of compiledRules) {
    if (options.includeUpstream === false && rule.source) continue;
    if (!inScope(rule)) continue;
    for (const match of text.matchAll(rule.pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      if (rule.skip?.(text, start, end, match)) continue;
      if (word(text[start - 1]) || word(text[end])) continue;
      if (covered(start, end)) continue;
      // Avoid converting mixed-case names or title-case headings.
      if (!rule.allowMixedCase && match[0] !== match[0].toLowerCase() && match[0] !== match[0].toUpperCase()
        && match[0] !== match[0][0].toUpperCase() + match[0].slice(1).toLowerCase()) continue;
      const { pattern: _pattern, guards: _guards, skip: _skip, allowMixedCase: _allowMixedCase, protectCase: _protectCase, reason, ...publicRule } = rule;
      const resolvedReason = typeof reason === 'function' ? reason(match[0], rule.replacement) : reason;
      // Checks without a replacement are findings: advisory only.
      if (rule.replacement === undefined) {
        findings.push({ id: `${rule.id}-${start}`, start, end, original: match[0], category: rule.category,
          reason: resolvedReason, source: rule.source });
        continue;
      }
      if (!matchesContext(rule, text, start, end)) {
        skippedContext.push({ ruleId: rule.id, start, end, reason: 'Context did not meet this rule’s conditions.' });
        continue;
      }
      const replacement = matchCase(match[0], replacementFor(rule, text, end));
      // Check removals at sentence start need a manual edit to keep case.
      if (replacement === '' && rule.protectCase && breaksSentence(text, start, end)) {
        findings.push({ id: `${rule.id}-${start}`, start, end, original: match[0], category: rule.category,
          reason: `${resolvedReason} It begins a sentence, so it needs a manual edit to keep capitalization.`, source: rule.source });
        continue;
      }
      candidates.push({ ...publicRule, id: `${rule.id}-${start}`, start, end, original: match[0], replacement,
        reason: resolvedReason,
        alternatives: [...new Set([replacement, ...(rule.alternatives || []).map(value => matchCase(match[0], value))])],
      });
    }
  }
  for (const check of compiledPatterns) {
    if (options.includeUpstream === false && check.source) continue;
    if (!inScope(check)) continue;
    for (const match of text.matchAll(check.regex)) {
      const hit = check.hitGroup ? match.indices?.groups?.[check.hitGroup] : null;
      const start = hit ? hit[0] : match.index;
      const end = hit ? hit[1] : match.index + match[0].length;
      const original = text.slice(start, end);
      if (check.skip?.(text, start, end, match)) continue;
      if (covered(start, end)) continue;
      const resolvedReason = typeof check.reason === 'function' ? check.reason(original, check.replacement) : check.reason;
      if (check.replacement === undefined) {
        findings.push({ id: `${check.id}-${start}`, start, end, original, category: check.category,
          reason: resolvedReason, source: check.source });
        continue;
      }
      candidates.push({ id: `${check.id}-${start}`, start, end, original, replacement: check.replacement,
        reviewOnly: true, category: check.category, source: check.source, reason: resolvedReason,
        alternatives: [...new Set([check.replacement, ...(check.alternatives || [])])] });
    }
  }
  candidates.sort((a, b) => a.start - b.start || b.end - a.end);
  const changes = [];
  for (const change of candidates) {
    if (!changes.length || change.start >= changes.at(-1).end) changes.push(change);
  }
  // Findings never touch the draft; drop any that shadow a real change or
  // another finding on the same span.
  findings.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = [];
  for (const finding of findings) {
    if (changes.some(change => finding.start < change.end && finding.end > change.start)) continue;
    if (kept.some(other => finding.start < other.end && finding.end > other.start)) continue;
    kept.push(finding);
  }
  return { changes, findings: kept, protectedSpans, skippedContext };
}

export function applyChanges(text, changes, decisions = {}) {
  let output = '';
  let cursor = 0;
  for (const change of appliedEdits(text, changes, decisions)) {
    output += text.slice(cursor, change.start) + change.replacement;
    cursor = change.end;
  }
  return output + text.slice(cursor);
}

// Shared by clean output and visual diff, including whitespace at a deletion.
export function appliedEdits(text, changes, decisions = {}) {
  const applied = [];
  for (const change of changes) {
    if (!isApplied(change, decisions)) continue;
    const edit = { ...change };
    if (edit.replacement === '') {
      const trailing = text.slice(edit.end).match(/^[ \t]+/);
      if (trailing && /\S/.test(text[edit.end + trailing[0].length] || '')) edit.end += trailing[0].length;
      else {
        const preceding = text.slice(applied.at(-1)?.end || 0, edit.start).match(/[ \t]+$/);
        if (preceding) edit.start -= preceding[0].length;
      }
    }
    edit.original = text.slice(edit.start, edit.end);
    applied.push(edit);
  }
  return applied;
}

export function isApplied(change, decisions = {}) {
  return decisions[change.id] !== 'rejected' && (!change.reviewOnly || decisions[change.id] === 'accepted');
}

export function metrics(text) {
  const counts = readabilityCounts(text);
  return {
    words: counts.words,
    sentences: counts.sentences,
    average: counts.sentences ? Math.round(counts.words / counts.sentences) : 0,
    readability: readability(text),
  };
}
