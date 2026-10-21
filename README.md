# Rewriter

A local, rule-based English writing editor. No AI models, API keys, package dependencies, analytics, or document uploads.

## Run

Install Node.js 20 or newer, then run from this folder:

```sh
npm start
```

Open **http://127.0.0.1:4173**. Stop with Ctrl+C. To use another port: `PORT=4180 npm start`.

No `npm install` or build step is required. The local server serves a fixed allowlist of application assets on loopback only. It does not accept document uploads. After the page loads, processing works without a network connection.

## Use

1. Paste text, import a UTF-8 `.txt` / `.md` / `.markdown` file, or select **Try a sample**.
2. Choose your focus: **Less wordy** and **Plain language** are on by default; **Style polish**, **Strong voice**, and **Fresh phrasing** are optional.
3. Select **Find improvements** (or Cmd/Ctrl+Enter).
4. Review each suggestion with **Accept** or **Keep original**. Local phrase edits initially enter the preview. Imported and style suggestions are marked **Review first** and enter the preview only after acceptance. Switch to **Changes** to see before/after markup.
5. For entries with multiple alternatives, choose a replacement (or **Remove phrase**) from the dropdown. Changing the choice resets its acceptance; accept again to apply it. Removal adjusts adjacent horizontal whitespace but does not repair grammar or punctuation.
6. Copy or export the current preview. Editing the draft or changing settings clears the old analysis.

Diagnostics without a safe rewrite — passive voice, repeated words, weasel words, clichés, sentence openers — appear under **Findings** with the matched text in context, an explanation, and a source link. Findings never change the draft. Where a safe rewrite exists (selected clichés, intensifiers, hedges, and redundancy pairs), it is offered as a review-first suggestion instead.

The original draft stays unchanged. Expand **Keep specific terms unchanged** to protect technical vocabulary or names (one per line, up to 100 terms, 120 characters each). Matching is case-insensitive and uses term boundaries. Terms also remain only in tab memory.

Your text is kept in tab memory, not localStorage, cookies, a database, or server logs. Reloading resets the editor. Exported files and text copied to the clipboard persist wherever you save/paste them.

## Scope and limitations

- English phrase simplification using original rules and all 327 entries of the pinned, attributed MIT-licensed retext-simplify dataset (394 distinct rules after merging 19 overlaps with 86 original rules). Context guards skip ambiguous constructions such as `approximately normal`, `has commenced`, and `make a decision easier`. These guards reduce errors; they do not establish general meaning preservation.
- Analysis checks adapt write-good (MIT): wordy phrases, passive voice, lexical illusions, weasel words, weak adverbs and sentence openers; and proselint (BSD-3-Clause): redundancy pairs, hedging, and uncomparables. They flag patterns, not grammar errors, and false positives happen. Findings are advisory and never edit the text; review-first rewrites appear only where a safe rewrite exists. Intensifier removals, ten cliché replacements, and the "too many"/"too few" exemption are Rewriter's own editorial choices, not upstream behavior.
- Readability scores (Flesch Reading Ease, Flesch–Kincaid Grade, Gunning Fog, SMOG, Coleman–Liau, ARI) follow textstat's published formulas (MIT) with a heuristic syllable counter instead of textstat's CMUdict + pyphen pipeline. Treat the scores as approximate before/after signals, not measurements.
- Vale is not included: its Go engine and separately licensed style packs cannot be bundled here.
- Pattern-based protection for fenced/inline/indented code, Markdown links, URLs, email, common citations, math, LaTeX commands/environments, block quotations, and optional quoted text.
- These protections are conservative heuristics, not full Markdown/LaTeX parsers. They can miss uncommon syntax. Natural language that resembles a protected pattern may also be skipped.
- Rules do not understand meaning, word sense, or specialist terminology. Changes can alter nuance. Review suggestions before use.
- Approximate sentence and word metrics are descriptive, not AI-authorship scores.
- No broad sentence restructuring, model-based synonym selection, AI-detector API, watermark guarantees, DOCX/PDF handling, or generated references in this version.
- Maximum input: 200,000 characters. Very large sets of suggestions can slow the browser.

## Inspect and extend

- `engine.mjs`: protected ranges, phrase matching, deterministic edit offsets, output assembly, findings, basic metrics.
- `rules.mjs`: original phrase rules, optional context requirements/exceptions, category, reason, and explicit-review status. Add curated rules here. Context conditions are bundled regular expressions, not user-entered code.
- `upstream-rules.mjs`: all upstream entries, preferred alternatives, and pinned source metadata. Removal-only entries and the upstream editorial marker `remove` become empty replacement choices. `vendor/retext-simplify/` retains upstream data and the license.
- `checks.mjs`: write-good and proselint checks mapped to findings (no rewrite) or review-first rewrites where safe. `vendor/write-good/` and `vendor/proselint/` retain upstream data and licenses.
- `readability.mjs`: textstat-derived readability formulas with a heuristic syllable estimator. `vendor/textstat/` retains formula provenance and the license.
- `app.mjs`: import/export, review decisions, findings, and DOM rendering. Imported text is rendered as text, never interpreted as HTML.
- `server.mjs`: dependency-free static server. Content Security Policy disables outgoing browser connections and external scripts.
- `tests/alternatives.test.mjs`: expanded coverage, replacement selection, explicit acceptance, deletion, and shared diff/output spans.
- `tests/engine.test.mjs`: protection, boundary, decision, and round-trip checks.
- `tests/checks.test.mjs`: findings vs review-first rewrites, exceptions, and protection behavior.
- `tests/readability.test.mjs`: syllable estimation and readability formula checks.
- `tests/fixtures/meaning.json`: curated academic, technical, grammatical and editorial regression examples. `tests/meaning.test.mjs` checks expected outputs, rejected-edit round trips, explicit acceptance, source provenance and selected quantities/negation markers. The contextual regression corpus uses original rules except where upstream examples are named; a separate exhaustive compatibility test covers every upstream entry. These are regression checks, not a representative benchmark or proof of semantic equivalence.

```sh
npm test
```

Version 0.3 includes retext-simplify phrase data pinned to commit `c7686ac9c3e07c28f84be87e48d28328b4047e3c`, write-good lexicon data pinned to commit `6940b034c6f5a7e101c01a24d651a778fc3fe435`, proselint check data pinned to commit `dbed789caae662d06c7c8a5a13dd31f1acd36f5c`, and textstat formulas pinned to commit `30303f95031f5e29f2811ea1bd4126f76cb828a1`. See `THIRD_PARTY_NOTICES.md` and the licenses under `vendor/`. The upstream linters and their runtime dependencies are not bundled. No Turnitout or TextHumanize code is included.

License: MIT; see `LICENSE`.
