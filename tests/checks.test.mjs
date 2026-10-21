import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, applyChanges, isApplied } from '../engine.mjs';

const all = { categories: ['wordiness', 'clarity', 'style', 'voice', 'phrasing'] };

test('findings flag passive voice without rewriting', () => {
  const text = 'The decision was made by the committee.';
  const { changes, findings } = analyze(text, all);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].original, 'was made');
  assert.ok(!findings[0].replacement);
  assert.equal(applyChanges(text, changes, {}), text);
});

test('lexical illusions flag repeated words and respect exceptions', () => {
  const repeated = analyze('We the the results.', all);
  assert.equal(repeated.findings.length, 1);
  assert.equal(repeated.findings[0].original, 'the the');
  const exception = analyze('She had had enough.', all);
  assert.ok(!exception.findings.some(finding => finding.original.toLowerCase() === 'had had'));
});

test('weasel words are findings, but "too many" is allowed', () => {
  const { findings } = analyze('This is clearly excellent work.', all);
  assert.ok(findings.some(finding => finding.original === 'clearly'));
  const allowed = analyze('Too many cooks spoil the broth.', all);
  assert.ok(!allowed.findings.some(finding => finding.original === 'many'));
});

test('safe rewrites are review-first and enter the preview only after acceptance', () => {
  const text = 'This is absolutely essential.';
  const { changes } = analyze(text, all);
  const change = changes.find(candidate => candidate.original === 'absolutely essential');
  assert.equal(change.replacement, 'essential');
  assert.ok(change.reviewOnly);
  assert.equal(isApplied(change, {}), false);
  assert.equal(applyChanges(text, changes, {}), text);
  assert.equal(applyChanges(text, changes, { [change.id]: 'accepted' }), 'This is essential.');
});

test('intensifiers and hedges can be removed once accepted', () => {
  const text = 'It was really useful.';
  const { changes } = analyze(text, all);
  const removal = changes.find(candidate => candidate.original === 'really');
  assert.equal(removal.replacement, '');
  assert.equal(applyChanges(text, changes, { [removal.id]: 'accepted' }), 'It was useful.');
});

test('punctuation-led phrases match against their neighbors', () => {
  const mid = 'The result was, so to speak, final.';
  const { changes } = analyze(mid, all);
  const both = changes.find(candidate => candidate.original === ', so to speak,');
  assert.ok(both);
  assert.equal(both.replacement, '');
  assert.ok(both.reviewOnly);
  assert.equal(applyChanges(mid, changes, { [both.id]: 'accepted' }), 'The result was final.');
  const end = 'The result was, so to speak.';
  const tail = analyze(end, all);
  const single = tail.changes.find(candidate => candidate.original === ', so to speak');
  assert.ok(single);
  assert.equal(applyChanges(end, tail.changes, { [single.id]: 'accepted' }), 'The result was.');
});

test('removal rewrites at sentence start stay findings to protect capitalization', () => {
  const text = 'Really good work.';
  const { changes, findings } = analyze(text, all);
  assert.ok(!changes.some(candidate => candidate.original === 'Really'));
  assert.ok(findings.some(finding => finding.original === 'Really'));
});

test('clichés without a curated rewrite are findings; curated ones rewrite', () => {
  const finding = analyze('It was a blessing in disguise.', all);
  assert.ok(finding.findings.some(item => item.original === 'blessing in disguise'));
  const { changes } = analyze('In a nutshell, it works.', all);
  const rewrite = changes.find(candidate => candidate.original === 'In a nutshell');
  assert.equal(rewrite.replacement, 'Briefly');
  assert.ok(rewrite.alternatives.includes(''));
});

test('redundancy pairs keep acronym case', () => {
  const { changes } = analyze('Enter your PIN number.', all);
  const change = changes.find(candidate => candidate.original === 'PIN number');
  assert.equal(change.replacement, 'PIN');
});

test('findings respect protected spans', () => {
  const { findings } = analyze('```\nThe decision was made.\n```\n\nThe decision was made.', all);
  assert.equal(findings.filter(finding => finding.original === 'was made').length, 1);
});

test('findings never shadow a real change on the same span', () => {
  const text = 'We utilized the system.';
  const { changes, findings } = analyze(text, all);
  assert.ok(changes.some(candidate => candidate.original === 'utilized'));
  assert.ok(!findings.some(finding => finding.start < changes[0].end && finding.end > changes[0].start));
});

test('new categories stay opt-in', () => {
  const text = 'The decision was made. So we left.';
  const defaults = analyze(text);
  assert.equal(defaults.findings.length, 0);
  const opted = analyze(text, { categories: ['voice'] });
  assert.ok(opted.findings.length >= 2);
});

test('source selection isolates each dataset by repo', () => {
  const text = 'Due to the fact that the decision was made, we left. Enter your PIN number.';
  const rewriter = analyze(text, { sources: ['rewriter'] });
  assert.deepEqual(rewriter.changes.map(change => change.original), ['Due to the fact that']);
  assert.equal(rewriter.findings.length, 0);
  const writeGood = analyze(text, { sources: ['write-good'] });
  assert.equal(writeGood.changes.length, 0);
  assert.ok(writeGood.findings.some(finding => finding.original === 'was made'));
  const proselint = analyze(text, { sources: ['proselint'] });
  assert.deepEqual(proselint.changes.map(change => change.original), ['PIN number']);
  assert.equal(proselint.findings.length, 0);
  const none = analyze(text, { sources: [] });
  assert.equal(none.changes.length + none.findings.length, 0);
});

test('every suggestion and finding names its dataset', () => {
  const text = 'The decision was made. It was quite unique.';
  const { changes, findings } = analyze(text, { sources: ['rewriter', 'retext-simplify', 'write-good', 'proselint'] });
  for (const item of [...changes, ...findings]) {
    const name = item.source?.name ?? 'rewriter';
    assert.ok(['rewriter', 'retext-simplify', 'write-good', 'proselint'].includes(name));
  }
});
