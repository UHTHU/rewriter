import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, applyChanges } from '../engine.mjs';

const grammar = { sources: ['rewriter'] };

test('verb-of slips rewrite to have', () => {
  const { changes } = analyze('We could of finished.', grammar);
  const fix = changes.find(change => change.original === 'of');
  assert.equal(fix.replacement, 'have');
  assert.equal(applyChanges('We could of finished.', changes, { [fix.id]: 'accepted' }), 'We could have finished.');
});

test('then/than are distinguished by context', () => {
  const more = analyze('It was more then enough.', grammar);
  assert.equal(more.changes.find(change => change.original === 'then')?.replacement, 'than');
  const since = analyze('We waited, and since than nothing moved.', grammar);
  assert.equal(since.changes.find(change => change.original === 'than')?.replacement, 'then');
  const correct = analyze('Better late than never, more than usual.', grammar);
  assert.equal(correct.changes.length, 0);
});

test('their/there are distinguished by context', () => {
  const existence = analyze('Their is a problem.', grammar);
  assert.equal(existence.changes.find(change => change.original === 'Their')?.replacement, 'There');
  const possession = analyze('We saw there new house.', grammar);
  assert.equal(possession.changes.find(change => change.original === 'there')?.replacement, 'their');
  const correct = analyze('Their house is over there.', grammar);
  assert.equal(correct.changes.length, 0);
});

test('its/it’s and your/you’re are distinguished by context', () => {
  const its = analyze('Its been a while.', grammar);
  assert.equal(its.changes.find(change => change.original === 'Its')?.replacement, 'It’s');
  const itIs = analyze('The dog wagged it’s tail.', grammar);
  assert.equal(itIs.changes.find(change => change.original === 'it’s')?.replacement, 'its');
  const youAre = analyze('Your welcome here.', grammar);
  assert.equal(youAre.changes.find(change => change.original === 'Your')?.replacement, 'You’re');
  const possessive = analyze('Please attach you’re files.', grammar);
  assert.equal(possessive.changes.find(change => change.original === 'you’re')?.replacement, 'your');
});

test('intensifier and article slips are caught', () => {
  const too = analyze('It was to much.', grammar);
  assert.equal(too.changes.find(change => change.original === 'to')?.replacement, 'too');
  const alot = analyze('We waited alot.', grammar);
  assert.equal(alot.changes.find(change => change.original === 'alot')?.replacement, 'a lot');
  const article = analyze('She ate a apple and waited a hour.', grammar);
  assert.deepEqual(article.changes.map(change => change.replacement), ['an', 'an']);
  const silent = analyze('She waited an hour at a university.', grammar);
  assert.equal(silent.changes.length, 0);
});

test('contested usage becomes findings, not rewrites', () => {
  const double = analyze('We did not see nothing.', grammar);
  assert.equal(double.changes.length, 0);
  assert.ok(double.findings.some(finding => finding.reason.includes('double negative')));
  const less = analyze('There were less issues today.', grammar);
  assert.ok(less.findings.some(finding => finding.original === 'less'));
});

test('grammar rewrites are review-first', () => {
  const text = 'We could of finished.';
  const { changes } = analyze(text, grammar);
  for (const change of changes) assert.ok(change.reviewOnly);
  assert.equal(applyChanges(text, changes, {}), text);
});
