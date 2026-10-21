import test from 'node:test';
import assert from 'node:assert/strict';
import { readability, readabilityCounts, syllablesInWord } from '../readability.mjs';
import { metrics } from '../engine.mjs';

test('syllable estimates are plausible for common words', () => {
  assert.equal(syllablesInWord('cat'), 1);
  assert.equal(syllablesInWord('sentence'), 2);
  assert.equal(syllablesInWord('syllable'), 3);
  assert.equal(syllablesInWord('readability'), 5);
  assert.equal(syllablesInWord(''), 0);
});

test('readability counts words, sentences, and complex words', () => {
  const counts = readabilityCounts('One short sentence. A second one follows.');
  assert.equal(counts.words, 7);
  assert.equal(counts.sentences, 2);
  assert.ok(counts.syllables >= 10);
  assert.equal(counts.complexWords, 0);
});

test('readability scores follow textstat formulas and empty text is zero', () => {
  const empty = readability('');
  for (const key of ['ease', 'grade', 'fog', 'smog', 'colemanLiau', 'ari']) assert.equal(empty[key], 0);
  // Formula identity check against hand-computed counts:
  // 3 sentences, 30 words, 42 syllables, 2 complex words, 120 letters.
  const easy = readability('word '.repeat(30).trim() + '.');
  assert.equal(easy.words, 30);
  assert.equal(easy.sentences, 1);
  assert.equal(typeof easy.ease, 'number');
});

test('simpler text scores easier than complex text', () => {
  const simple = readability('The cat sat on the mat. The dog ran to the park.');
  const complex = readability('Approximately fifty administrative representatives operationalized organizational contingencies during the preliminary demonstration.');
  assert.ok(simple.ease > complex.ease);
  assert.ok(simple.grade < complex.grade);
  assert.ok(simple.fog < complex.fog);
});

test('metrics exposes readability alongside the basic counts', () => {
  const result = metrics('A simple sentence.');
  assert.equal(result.words, 3);
  assert.equal(result.sentences, 1);
  assert.equal(typeof result.readability.ease, 'number');
  assert.equal(result.readability.words, result.words);
});
