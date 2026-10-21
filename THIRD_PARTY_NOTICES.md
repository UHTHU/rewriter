# Third-party notices

## retext-simplify

- Source: https://github.com/retextjs/retext-simplify
- Pinned commit: `c7686ac9c3e07c28f84be87e48d28328b4047e3c`
- Original file: `lib/patterns.js`
- Local copy: `vendor/retext-simplify/patterns.mjs` (unchanged contents, extension adapted for ES modules)
- License: MIT; the complete upstream notice is retained at `vendor/retext-simplify/LICENSE`.

Rewriter enables all 327 upstream entries. Nineteen overlaps are merged with original rules, retaining original context guards and defaults while exposing the upstream alternatives. Upstream-only suggestions require explicit acceptance; choosing a different alternative also resets acceptance. All source alternatives are retained, with the literal editorial marker `remove` normalized to an empty replacement and `omit` adding a removal choice. Preferred defaults are listed explicitly in `upstream-rules.mjs`. The upstream plugin and its runtime dependencies are not bundled. New context checks, matching behavior, case handling, and whitespace adjustment belong to Rewriter, not the upstream authors.

Every imported suggestion exposes its source name, pinned revision, license, and repository URL. No code or rules from Turnitout or TextHumanize are included.

## write-good

- Source: https://github.com/btford/write-good
- Pinned commit: `6940b034c6f5a7e101c01a24d651a778fc3fe435` (v1.0.8)
- Local copy: `vendor/write-good/lexicons.mjs` (phrase and pattern data only; no upstream runtime code)
- License: MIT; the upstream notice is retained at `vendor/write-good/LICENSE`.

The word lists live in write-good's own MIT-licensed dependencies, bundled here as data at pinned versions: `weasel-words` 0.1.1 and `passive-voice` 0.1.0 (Brian Ford; MIT declared in their package metadata), `adverb-where` 0.2.6, `too-wordy` 0.3.6, and `no-cliches` 0.3.6 (Matt Blair). Upstream only reports suggestions with positions; Rewriter's mapping to findings and review-first rewrites, the intensifier-removal choices, the cliché replacements, and the extended "too many"/"too few" exemption are Rewriter's own editorial layer.

## proselint

- Source: https://github.com/amperser/proselint
- Pinned commit: `dbed789caae662d06c7c8a5a13dd31f1acd36f5c`
- Local copy: `vendor/proselint/checks.mjs` (check data only; the Python engine is not bundled)
- License: BSD-3-Clause; the complete upstream notice is retained at `vendor/proselint/LICENSE.md`.

Only proselint-original lists covered by its BSD-3-Clause license are reproduced: hedging, RAS syndrome and redundancy pairs, uncomparables, and the lexical-illusion pattern (which proselint itself credits to write-good, MIT). Datasets that proselint bundles from third-party sources are deliberately excluded: extracts from Garner's Modern American Usage (book-derived), the GNU diction cliché list (GPL-3.0), and After the Deadline redundancy data (AGPL-3.0).

## textstat

- Source: https://github.com/textstat/textstat
- Pinned commit: `30303f95031f5e29f2811ea1bd4126f76cb828a1`
- Local copy: `vendor/textstat/formulas.mjs` (published formula constants; no Python code)
- License: MIT; the complete upstream notice is retained at `vendor/textstat/LICENSE`.

Rewriter re-expresses textstat's published readability formulas (Flesch Reading Ease, Flesch–Kincaid Grade, Gunning Fog, SMOG, Coleman–Liau, ARI). textstat counts syllables with CMUdict and pyphen; Rewriter uses its own heuristic estimator in `readability.mjs`, so scores are approximate and may differ from textstat for the same text.

## Vale (not included)

Vale is not bundled. Its engine is written in Go and its popular style packs (Google, Microsoft, write-good) carry separate licenses, so no part of it is reproduced here. Its editorial ideas overlap with the checks above; contributions that vendor Vale rule data under a clearly compatible license are welcome.

## dictionary-en (Hunspell en_US)

- Source: https://github.com/wooorm/dictionaries (npm `dictionary-en` 4.0.0)
- Pinned commit: `8cfea406b505e4d7df52d5a19bce525df98c54ab`
- Local copy: `vendor/dictionary-en/dictionary.mjs` (verbatim `index.aff` + `index.dic` data; no checker runtime)
- License: (MIT AND BSD), SCOWL-derived; the complete upstream notice is retained at `vendor/dictionary-en/license`.

Rewriter parses the Hunspell data at load time and expands its affix rules in its own `spell.mjs` — no code from nspell or any Hunspell implementation is bundled.

## misspell

- Source: https://github.com/client9/misspell
- Pinned commit: `c0b55c8239520f6b5aa15a0207ca8b28027ba49e`
- Local copy: `vendor/misspell/corrections.mjs` (the generated `DictMain` typo pairs)
- License: MIT; the complete upstream notice is retained at `vendor/misspell/LICENSE`.

Only the locale-neutral `DictMain` is reproduced (28,047 pairs). The British/American locale dictionaries are deliberately excluded so Rewriter makes no spelling-variant opinions.

No code or rules from Turnitout or TextHumanize are included.
