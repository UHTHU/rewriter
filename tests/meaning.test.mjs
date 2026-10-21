import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyze, applyChanges, isApplied } from '../engine.mjs';
import { rules } from '../rules.mjs';
import { patterns } from '../vendor/retext-simplify/patterns.mjs';
import { upstreamRules } from '../upstream-rules.mjs';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/meaning.json', import.meta.url)));
for (const fixture of fixtures) {
  test(`meaning regression: ${fixture.name}`, () => {
    // This corpus measures the original contextual edits plus its named
    // upstream examples. Full upstream coverage is exercised separately below.
    const { changes } = analyze(fixture.input, { protectedTerms: fixture.terms || [], categories: fixture.categories, includeUpstream: Boolean(fixture.accepted) });
    assert.equal(applyChanges(fixture.input, changes), fixture.expected);
    const accepted = Object.fromEntries(changes.map(change => [change.id, 'accepted']));
    assert.equal(applyChanges(fixture.input, changes, accepted), fixture.accepted || fixture.expected);
    const rejected = Object.fromEntries(changes.map(change => [change.id, 'rejected']));
    assert.equal(applyChanges(fixture.input, changes, rejected), fixture.input);
    // Keep quantities and negation/uncertainty; normalize the equivalent
    // indirect-question idiom separately from propositional negation.
    const importantTokens = text => text.replace(/\bwhether or not\b/gi, 'whether').match(/\d+(?:[.,]\d+)*|\b(?:not|never|may|might|could|possible)\b/gi) || [];
    assert.deepEqual(importantTokens(applyChanges(fixture.input, changes, accepted)), importantTokens(fixture.input));
  });
}

test('upstream rules retain source, approved alternatives and review requirement', () => {
  assert.equal(upstreamRules.length, Object.keys(patterns).length);
  for (const rule of upstreamRules) {
    const expected = [...new Set(patterns[rule.phrase].replace.map(value => value === 'remove' ? '' : value).concat(patterns[rule.phrase].omit ? [''] : []))];
    assert.deepEqual(rule.alternatives, expected);
    assert.ok(expected.includes(rule.replacement));
    const merged = rules.find(candidate => candidate.phrase === rule.phrase);
    assert.ok(merged);
    assert.ok(expected.every(value => merged.alternatives.includes(value)));
    if (merged.upstreamSource) {
      assert.equal(merged.upstreamSource.commit, rule.source.commit);
      continue; // Original rules keep their context guards and defaults.
    }
    const { changes } = analyze(rule.phrase);
    const change = changes.find(change => change.id.startsWith(rule.id));
    assert.ok(change, rule.phrase);
    assert.equal(change.source.license, 'MIT');
    assert.match(change.source.commit, /^[a-f0-9]{40}$/);
    assert.equal(isApplied(change), false);
    assert.equal(applyChanges(rule.phrase, changes), rule.phrase);
    assert.equal(applyChanges(rule.phrase, changes, { [change.id]: 'accepted' }), rule.replacement);
    assert.equal(isApplied(change, { [change.id]: 'rejected' }), false);
  }
});
test('context declines are observable without proposing an unsafe edit', () => {
  const result = analyze('approximately normal; make a decision easier; work has commenced.');
  assert.equal(result.changes.length, 0);
  assert.equal(result.skippedContext.length, 3);
});
test('protected terms are literal, case insensitive and do not swallow adjacent words', () => {
  const source = 'We utilize C++ to utilize data and utilize tools.';
  const { changes } = analyze(source, { protectedTerms: ['C++', 'utilize data'] });
  assert.equal(applyChanges(source, changes), 'We use C++ to utilize data and use tools.');
  assert.equal(analyze('We UTILIZE DATA.', { protectedTerms: ['utilize data'] }).changes.length, 0);
  assert.equal(analyze('We utilize datasets.', { protectedTerms: ['utilize data'] }).changes.length, 1);
});
test('protected terms validate bounded input', () => {
  for (const terms of ['not an array', Array(101).fill('x'), ['a'.repeat(121)], [null]]) {
    assert.throws(() => analyze('data', { protectedTerms: terms }), /protected terms/);
  }
});
test('no duplicate phrase rules or unstable rule identifiers', () => {
  assert.equal(new Set(rules.map(rule => rule.id)).size, rules.length);
  assert.equal(new Set(rules.map(rule => rule.phrase)).size, rules.length);
});
