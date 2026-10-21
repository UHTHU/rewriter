import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, applyChanges, appliedEdits } from '../engine.mjs';

test('expanded upstream words are offered but do not rewrite the preview', () => {
  const text = 'We acquire additional equipment to accomplish the task.';
  const { changes } = analyze(text);
  assert.ok(changes.some(change => change.phrase === 'acquire'));
  assert.ok(changes.some(change => change.phrase === 'additional'));
  assert.ok(changes.some(change => change.phrase === 'accomplish'));
  assert.equal(applyChanges(text, changes), text);
});
test('all replacement choices are carried into the engine result and preserve case', () => {
  const { changes } = analyze('ACCURATE');
  const [change] = changes;
  assert.deepEqual(change.alternatives, ['CORRECT', 'EXACT', 'RIGHT']);
  change.replacement = 'EXACT';
  assert.equal(applyChanges('ACCURATE', changes), 'ACCURATE');
  assert.equal(applyChanges('ACCURATE', changes, { [change.id]: 'accepted' }), 'EXACT');
});
test('omission-only rules produce empty replacement, never literal undefined', () => {
  const text = 'We very carefully tested it.';
  const { changes } = analyze(text);
  const change = changes.find(change => change.phrase === 'very');
  assert.equal(change.replacement, '');
  assert.equal(applyChanges(text, changes), text);
  assert.equal(applyChanges(text, changes, { [change.id]: 'accepted' }), 'We carefully tested it.');
});
test('deletion at phrase end cleans only neighboring horizontal space', () => {
  const text = 'We tested it overall.\n\nNext paragraph.';
  const { changes } = analyze(text);
  const change = changes.find(change => change.phrase === 'overall');
  assert.equal(applyChanges(text, changes, { [change.id]: 'accepted' }), 'We tested it.\n\nNext paragraph.');
});
test('diff and output share the same adjusted deletion spans', () => {
  const text = 'Very careful work.';
  const { changes } = analyze(text);
  const change = changes.find(change => change.phrase === 'very');
  const decisions = { [change.id]: 'accepted' };
  const [edit] = appliedEdits(text, changes, decisions);
  assert.equal(edit.original, 'Very ');
  assert.equal(applyChanges(text, changes, decisions), 'careful work.');
});
test('a removal alternative can be selected and rejected without changing original', () => {
  const text = 'An appropriate response.';
  const { changes } = analyze(text);
  const change = changes.find(change => change.phrase === 'appropriate');
  assert.ok(change.alternatives.includes(''));
  change.replacement = '';
  assert.equal(applyChanges(text, changes, { [change.id]: 'rejected' }), text);
});
test('local duplicate retains guard and includes all attributed alternatives', () => {
  const { changes, skippedContext } = analyze('approximately normal');
  assert.ok(skippedContext.length);
  assert.equal(changes.some(change => change.phrase === 'approximately'), false);
  const result = analyze('We utilize tools.');
  const change = result.changes.find(change => change.phrase === 'utilize');
  assert.equal(change.replacement, 'use');
  assert.ok(change.upstreamSource);
  assert.equal(applyChanges('We utilize tools.', result.changes), 'We use tools.');
});
