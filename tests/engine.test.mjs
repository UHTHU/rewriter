import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, applyChanges, metrics, MAX_LENGTH } from '../engine.mjs';

const rewrite = (text, options) => applyChanges(text, analyze(text, options).changes);

test('rewrites repeated phrases using stable original offsets and preserves case', () => {
  assert.equal(rewrite('In order to learn, we utilize examples. IN ORDER TO improve, utilize examples.'), 'To learn, we use examples. TO improve, use examples.');
});
test('does not substitute inside words, Unicode words, or mixed-case names', () => {
  assert.equal(rewrite('reutilized préutilize utilizeé UtilizePro Utilize'), 'reutilized préutilize utilizeé UtilizePro Use');
});
test('protects code fences, incomplete fences, inline code, and indented code', () => {
  for (const source of ['```python\nutilize\n```', '~~~\nutilize\n~~~', '```\nutilize', '`utilize`', '``utilize ` example``', '    utilize', '\tutilize']) {
    assert.equal(rewrite(`${source}\n\nWe utilize it.`), `${source}\n\n${source === '```\nutilize' ? 'We utilize it.' : 'We use it.'}`);
  }
});
test('protects URL paths, email, Markdown links, reference links, and HTML tags', () => {
  const source = 'https://example.com/in-order-to/utilize test@utilize.com [utilize](https://example.com) [utilize][reference]\n[reference]: https://utilize.com\n<div title="utilize">We utilize it.</div>';
  assert.equal(rewrite(source), source.replace('We utilize it.', 'We use it.'));
});
test('protects quotations by default, including multi-line curly quotes', () => {
  const source = '“We utilize\na large number of samples.” "We utilize it." \'utilize\' We utilize it.';
  assert.equal(rewrite(source), source.replace(/We utilize it\.$/, 'We use it.'));
  assert.equal(rewrite('"We utilize it."', { protectQuotes: false }), '"We use it."');
});
test('apostrophes in contractions do not swallow editable prose', () => {
  assert.equal(rewrite("We don't utilize it, and we don't commence today."), "We don't use it, and we don't begin today.");
});
test('preserves common citations, math and LaTeX commands', () => {
  const source = 'We utilize data (Utilize et al., 2024) [1, 2] [@utilize]. $utilize$ $$in order to$$ \\(utilize\\) \\[utilize\\] \\cite{utilize} \\textbf{utilize} \\begin{equation}utilize\\end{equation}';
  assert.equal(rewrite(source), source.replace('We utilize data', 'We use data'));
});
test('preserves numbers, negations and technical identifiers', () => {
  assert.equal(rewrite('We do not utilize 1,200 values at 3.14 ms; utilize_count = 42.'), 'We do not use 1,200 values at 3.14 ms; utilize_count = 42.');
});
test('category switches limit the edits', () => {
  assert.equal(rewrite('We utilize tools in order to work.', { categories: ['wordiness'] }), 'We utilize tools to work.');
  assert.equal(rewrite('We utilize tools in order to work.', { categories: [] }), 'We utilize tools in order to work.');
  assert.equal(rewrite('It is worth noting that we work.'), 'It is worth noting that we work.');
  const source = 'It is worth noting that we work.';
  const { changes } = analyze(source, { categories: ['style'] });
  assert.equal(applyChanges(source, changes), source);
  assert.equal(applyChanges(source, changes, { [changes[0].id]: 'accepted' }), 'Note that we work.');
});
test('individual decisions restore exact original wording without shifting subsequent edits', () => {
  const source = 'We utilize data in order to make a decision.';
  const { changes } = analyze(source);
  assert.equal(applyChanges(source, changes, { [changes[0].id]: 'rejected' }), 'We utilize data to decide.');
  const allRejected = Object.fromEntries(changes.map(change => [change.id, 'rejected']));
  assert.equal(applyChanges(source, changes, allRejected), source);
});
test('supports flexible whitespace without crossing paragraphs', () => {
  assert.equal(rewrite('in  order\tto work'), 'to work');
  assert.equal(rewrite('in order\n\nto work'), 'in order\n\nto work');
});
test('unmatched input and line endings round-trip exactly', () => {
  const source = 'A precise observation.\r\n\r\nα + β = 3. No change needed. 🎉';
  assert.equal(rewrite(source), source);
});
test('rejects documents beyond the stated limit', () => {
  assert.throws(() => analyze('a'.repeat(MAX_LENGTH + 1)), /characters or fewer/);
});
test('metrics support empty text and count words without an authorship score', () => {
  assert.deepEqual(metrics(''), {
    words: 0,
    sentences: 0,
    average: 0,
    readability: { words: 0, sentences: 0, syllables: 0, complexWords: 0, letters: 0, ease: 0, grade: 0, fog: 0, smog: 0, colemanLiau: 0, ari: 0 },
  });
  assert.equal(metrics('One short sentence. Another short sentence.').words, 6);
  assert.equal(metrics('One short sentence. Another short sentence.').sentences, 2);
});
