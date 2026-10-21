import { analyze, applyChanges, appliedEdits, isApplied, metrics, MAX_LENGTH } from './engine.mjs';

const $ = id => document.getElementById(id);
const source = $('source');
let result = null;
let decisions = {};
let showDiff = false;
let name = 'Untitled draft';
let importRevision = 0;
const sample = 'In order to understand the results, we utilized a large number of examples. Due to the fact that the dataset contains approximately 1,200 entries, we are able to compare several approaches.\n\nIt is important to note that each and every change needs a second look. The final outcome should sound like you.\n\nThe original citation stays intact (Smith, 2024). So does the quotation: “We utilized a large number of examples.”\n\n```python\n# In order to preserve executable code\nresult = "utilize"\n```';
function message(text) { $('message').textContent = text; }
function wordLabel(text) { return `${metrics(text).words.toLocaleString()} words`; }
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function invalidate() {
  result = null;
  decisions = {};
  $('review').hidden = true;
  $('source-count').textContent = wordLabel(source.value);
  $('output-count').textContent = 'Ready when you are';
  $('copy').disabled = $('download').disabled = true;
  const empty = element('div', undefined, 'empty-state');
  empty.append(element('span', '↗', 'empty-symbol'), element('h3', 'Make room for the meaning.'), element('p', 'Find improvements to create a revised draft.'));
  $('output').replaceChildren(empty);
  message('');
}
function outputText() { return result ? applyChanges(source.value, result.changes, decisions) : ''; }
function renderFindings() {
  const block = $('findings-block');
  const list = $('findings');
  list.replaceChildren();
  block.hidden = !result.findings.length;
  $('finding-count').textContent = result.findings.length ? `· ${result.findings.length}` : '';
  for (const finding of result.findings) {
    const card = element('article', undefined, 'suggestion finding');
    const detail = element('div');
    const context = element('p', undefined, 'finding-context');
    const before = source.value.slice(Math.max(0, finding.start - 32), finding.start);
    const after = source.value.slice(finding.end, finding.end + 32);
    context.append(
      element('span', before ? `…${before}` : '', 'context-before'),
      element('mark', finding.original),
      element('span', after ? `${after}…` : '', 'context-after'),
    );
    detail.append(element('span', `${finding.category} · Finding`, 'suggestion-label'), context,
      element('p', finding.reason, 'suggestion-reason'));
    if (finding.source) {
      const attribution = element('a', `Source: ${finding.source.name} · ${finding.source.license}`, 'rule-source');
      attribution.href = `${finding.source.url}/blob/${finding.source.commit}`;
      attribution.target = '_blank';
      attribution.rel = 'noopener noreferrer';
      detail.append(attribution);
    }
    card.append(detail);
    list.append(card);
  }
}
function renderOutput() {
  const output = outputText();
  const container = $('output');
  container.replaceChildren();
  if (!showDiff) container.textContent = output;
  else {
    let cursor = 0;
    for (const change of appliedEdits(source.value, result.changes, decisions)) {
      container.append(document.createTextNode(source.value.slice(cursor, change.start)), element('del', change.original, 'diff-old'), element('ins', change.replacement, 'diff-new'));
      cursor = change.end;
    }
    container.append(document.createTextNode(source.value.slice(cursor)));
  }
  const active = result.changes.filter(change => isApplied(change, decisions));
  const pending = result.changes.filter(change => !decisions[change.id]).length;
  $('output-count').textContent = `${wordLabel(output)} · ${active.length} ${active.length === 1 ? 'edit' : 'edits'}`;
  $('copy').disabled = $('download').disabled = false;
  const before = metrics(source.value), after = metrics(output);
  $('summary').replaceChildren();
  for (const [label, value] of [['Words', `${before.words} → ${after.words}`], ['Words / sentence ≈', `${before.average} → ${after.average}`], ['Reading ease ≈', `${before.readability.ease} → ${after.readability.ease}`], ['Grade level ≈', `${before.readability.grade} → ${after.readability.grade}`], ['Edits in preview', active.length]]) {
    const row = element('div', undefined, 'summary-row');
    row.append(element('span', label), element('strong', String(value)));
    $('summary').append(row);
  }
  $('review-status').textContent = pending ? `${pending} unreviewed. Suggestions marked “Review first” enter the preview only after acceptance.` : 'All suggestions reviewed.';
  $('accept-all').disabled = result.changes.every(change => decisions[change.id] === 'accepted');
}
function renderSuggestions() {
  const list = $('suggestions');
  list.replaceChildren();
  $('change-count').textContent = result.changes.length;
  if (!result.changes.length) {
    const card = element('div', undefined, 'suggestion');
    card.append(element('div', 'No matches for the selected rules. Your text has been left unchanged.'));
    list.append(card);
  }
  for (const change of result.changes) {
    const card = element('article', undefined, 'suggestion');
    card.dataset.decision = decisions[change.id] || 'pending';
    const detail = element('div');
    const snippet = element('p', undefined, 'suggestion-text');
    const replacementLabel = element('ins', change.replacement || 'Remove phrase');
    snippet.append(element('del', change.original), element('span', '→', 'arrow'), replacementLabel);
    detail.append(element('span', `${change.category}${change.reviewOnly ? ' · Review first' : ''}`, 'suggestion-label'), snippet, element('p', change.reason, 'suggestion-reason'));
    const ruleSource = change.source || change.upstreamSource;
    if (ruleSource) {
      const attribution = element('a', `${change.source ? 'Source' : 'Additional alternatives'}: ${ruleSource.name} · ${ruleSource.license}`, 'rule-source');
      attribution.href = `${ruleSource.url}/blob/${ruleSource.commit}`;
      attribution.target = '_blank';
      attribution.rel = 'noopener noreferrer';
      detail.append(attribution);
    }
    const controls = element('div', undefined, 'decision-controls');
    const decisionButtons = [];
    if (change.alternatives.length > 1) {
      const label = element('label', 'Replacement', 'alternative-label');
      const select = element('select');
      select.setAttribute('aria-label', `Replacement for ${change.original}`);
      for (const alternative of change.alternatives) {
        const option = element('option', alternative || 'Remove phrase');
        option.value = alternative;
        option.selected = alternative === change.replacement;
        select.append(option);
      }
      select.addEventListener('change', () => {
        change.replacement = select.value;
        change.reviewOnly = true;
        delete decisions[change.id];
        card.dataset.decision = 'pending';
        for (const button of decisionButtons) {
          button.setAttribute('aria-pressed', 'false');
          button.setAttribute('aria-label', `${button.textContent}: ${change.original} to ${change.replacement || 'Remove phrase'}`);
        }
        replacementLabel.textContent = change.replacement || 'Remove phrase';
        detail.querySelector('.suggestion-label').textContent = `${change.category} · Review first`;
        renderOutput();
        message('Replacement selected. Accept it to update the preview.');
      });
      label.append(select);
      detail.append(label);
    }
    for (const [value, label, className] of [['rejected', 'Keep original', 'reject'], ['accepted', 'Accept', 'accept']]) {
      const button = element('button', label, className);
      decisionButtons.push(button);
      button.setAttribute('aria-pressed', String(decisions[change.id] === value));
      button.setAttribute('aria-label', `${label}: ${change.original} to ${change.replacement}`);
      button.addEventListener('click', () => {
        decisions[change.id] = value;
        card.dataset.decision = value;
        for (const child of decisionButtons) child.setAttribute('aria-pressed', String(child === button));
        renderOutput();
        message(value === 'accepted' ? (change.replacement ? `Accepted: ${change.replacement}` : `Removed: ${change.original}`) : `Kept: ${change.original}`);
      });
      controls.append(button);
    }
    card.append(detail, controls);
    list.append(card);
  }
}
function run() {
  if (!source.value.trim()) { message('Add some writing first, or try the sample.'); source.focus(); return; }
  const sources = ['rewriter', 'retext-simplify', 'write-good', 'proselint', 'spell'].filter(id => $(`source-${id}`).checked);
  if (!sources.length) { message('Choose at least one source to find improvements.'); return; }
  try {
    result = analyze(source.value, { sources, protectQuotes: $('protect-quotes').checked, protectedTerms: $('protected-terms').value.split('\n').map(term => term.trim()).filter(Boolean) });
    decisions = {};
    $('review').hidden = false;
    renderSuggestions();
    renderFindings();
    renderOutput();
    const skipped = result.skippedContext.length;
    const found = result.findings.length ? ` ${result.findings.length} ${result.findings.length === 1 ? 'finding' : 'findings'} listed — they never change your text.` : '';
    message((result.changes.length ? `${result.changes.length} ${result.changes.length === 1 ? 'suggestion' : 'suggestions'} found. Review first: upstream and style suggestions require acceptance before they change the preview.` : 'No matches found. This only checks the bundled rules, not every possible writing issue.') + found + (skipped ? ` ${skipped} context-sensitive ${skipped === 1 ? 'match was' : 'matches were'} left unchanged.` : ''));
  } catch (error) { message(error.message); }
}
source.addEventListener('input', () => { importRevision++; invalidate(); });
$('sample').addEventListener('click', () => {
  if (source.value.trim() && !window.confirm('Replace your current draft with the sample?')) return;
  importRevision++;
  source.value = sample;
  name = 'Sample draft';
  $('filename').textContent = name;
  invalidate();
  run();
});
$('clear').addEventListener('click', () => {
  if (source.value.trim() && !window.confirm('Clear your draft and suggestions?')) return;
  importRevision++;
  source.value = '';
  name = 'Untitled draft';
  $('filename').textContent = name;
  invalidate();
  source.focus();
});
for (const id of ['source-rewriter', 'source-retext-simplify', 'source-write-good', 'source-proselint', 'source-spell', 'protect-quotes']) $(id).addEventListener('change', () => {
  const hadResult = !!result;
  invalidate();
  if (hadResult) message('Settings changed. Find improvements again to refresh your preview.');
});
$('protected-terms').addEventListener('input', () => {
  const hadResult = !!result;
  invalidate();
  if (hadResult) message('Protected terms changed. Find improvements again to refresh your preview.');
});
$('analyze').addEventListener('click', run);
document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); run(); } });
for (const [id, enabled] of [['clean-view', false], ['diff-view', true]]) $(id).addEventListener('click', () => {
  showDiff = enabled;
  $('clean-view').setAttribute('aria-pressed', String(!enabled));
  $('diff-view').setAttribute('aria-pressed', String(enabled));
  if (result) renderOutput();
});
for (const [id, value] of [['accept-all', 'accepted'], ['reject-all', 'rejected']]) $(id).addEventListener('click', () => {
  if (!result) return;
  for (const change of result.changes) decisions[change.id] = value;
  renderSuggestions(); renderOutput();
  message(value === 'accepted' ? 'All suggestions accepted.' : 'All original wording restored.');
});
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(outputText()); message('Preview copied to clipboard.'); }
  catch { message('Clipboard is unavailable. Use Export to save your revised draft.'); }
});
$('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([outputText()], { type: 'text/plain;charset=utf-8' }));
  const link = element('a');
  const extension = /\.(md|markdown)$/i.test(name) ? 'md' : 'txt';
  link.href = url;
  link.download = `${name.replace(/\.(txt|md|markdown)$/i, '').replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'draft'}-revised.${extension}`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  message('Preview exported.');
});
$('import').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (!/\.(txt|md|markdown)$/i.test(file.name)) { message('Choose a plain text (.txt) or Markdown (.md) file.'); return; }
  if (file.size > MAX_LENGTH * 4) { message('That file is too large. Use 200,000 characters or fewer.'); return; }
  if (source.value.trim() && !window.confirm('Replace your current draft with this file?')) return;
  const revision = ++importRevision;
  try {
    const text = await file.text();
    if (revision !== importRevision) return;
    if (text.length > MAX_LENGTH || text.includes('\0')) { message('Use a text file with no binary data and 200,000 characters or fewer.'); return; }
    source.value = text; name = file.name;
    $('filename').textContent = name;
    invalidate(); message('Imported locally. Choose Find improvements to review your draft.');
  } catch { message('This file could not be read.'); }
});
for (const id of ['privacy-open', 'about-open']) $(id).addEventListener('click', () => $('about').showModal());
$('about-close').addEventListener('click', () => $('about').close());
$('about').addEventListener('click', event => { if (event.target === $('about')) { const r = $('about').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('about').close(); } });
window.addEventListener('pageshow', () => { if (!result) { source.value = ''; $('protected-terms').value = ''; } $('source-count').textContent = wordLabel(source.value); });
