import test from 'node:test';
import assert from 'node:assert/strict';
import { writingScore, tone, sentiment } from '../score.mjs';

test('writing score is a bounded heuristic that favors readable text', () => {
  assert.equal(writingScore(''), 0);
  const simple = writingScore('The cat sat. The dog ran. We played all day.');
  const tangled = writingScore('The committee, which had been assembled at considerable expense by the administration during the preceding fiscal quarter in order to evaluate the various contingencies, was unable to reach any conclusion whatsoever.');
  assert.ok(simple >= 0 && simple <= 100);
  assert.ok(tangled >= 0 && tangled <= 100);
  assert.ok(simple > tangled);
});

test('sentiment follows VADER valences', () => {
  assert.equal(sentiment('I love this wonderful, excellent work.').label, 'positive');
  assert.equal(sentiment('This is a terrible, awful, horrible mess.').label, 'negative');
  assert.equal(sentiment('The report is on the table.').label, 'neutral');
});

test('tone separates formality and confidence', () => {
  const casual = tone("We can't do it, it's just not going to work for us.");
  assert.equal(casual.formality, 'casual');
  const formal = tone('The administration cannot proceed with the implementation. Nevertheless, the committee will ensure completion.');
  assert.equal(formal.formality, 'formal');
  const tentative = tone('It might perhaps seem like we could possibly maybe consider it.');
  assert.equal(tentative.confidence, 'tentative');
  const confident = tone('We will definitely finish. The team must ensure it always works.');
  assert.equal(confident.confidence, 'confident');
});
