import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, applyChanges } from '../engine.mjs';
import { suggest, spellScan } from '../spell.mjs';

const spell = { sources: ['spell'] };

test('known typos become review-first corrections from the misspell dataset', () => {
  const { changes, findings } = analyze('We recieved the results.', spell);
  assert.equal(findings.length, 0);
  const fix = changes.find(change => change.original === 'recieved');
  assert.ok(fix);
  assert.equal(fix.replacement, 'received');
  assert.ok(fix.reviewOnly);
  assert.equal(fix.source.name, 'misspell');
  assert.equal(applyChanges('We recieved the results.', changes, {}), 'We recieved the results.');
  assert.equal(applyChanges('We recieved the results.', changes, { [fix.id]: 'accepted' }), 'We received the results.');
});

test('capitalized typos keep their case', () => {
  const { changes } = analyze('Teh results are in.', spell);
  const fix = changes.find(change => change.original === 'Teh');
  assert.equal(fix.replacement, 'The');
});

test('unknown words get did-you-mean suggestions or a finding', () => {
  const suggested = analyze('An importent result.', spell);
  const change = suggested.changes.find(item => item.original === 'importent');
  assert.equal(change.replacement, 'important');
  assert.ok(change.alternatives.includes('important'));
  const unknown = analyze('The qzxwlt value.', spell);
  assert.equal(unknown.changes.length, 0);
  assert.ok(unknown.findings.some(finding => finding.original === 'qzxwlt'));
});

test('proper nouns, acronyms, and contractions are left alone', () => {
  const hits = spellScan('Rewriter and iPhone are fine. NASA works. Don\'t worry.');
  assert.equal(hits.length, 0);
});

test('inflected forms from the affix rules are accepted', () => {
  const hits = spellScan('Walking and walked and quickly and houses are all valid words.');
  assert.equal(hits.length, 0);
});

test('spell findings respect protected spans and custom terms', () => {
  const fenced = analyze('```\nrecieved\n```\n\nFine text.', spell);
  assert.equal(fenced.changes.length, 0);
  const { changes } = analyze('The qzxwlt value.', { ...spell, protectedTerms: ['qzxwlt'] });
  assert.equal(changes.length, 0);
});

test('suggestions rank close matches and are capped', () => {
  const options = suggest('recieve');
  assert.ok(options.includes('receive'));
  assert.ok(options.length <= 5);
  assert.deepEqual(suggest('qzxwlt'), []);
});

test('spell checks are a dataset of their own', () => {
  const text = 'We recieved the results.';
  assert.equal(analyze(text, { sources: ['rewriter'] }).changes.length, 0);
  assert.ok(analyze(text, spell).changes.length > 0);
});
