// Check data extracted from proselint (BSD-3-Clause).
// proselint <https://github.com/amperser/proselint> pinned at commit
// dbed789caae662d06c7c8a5a13dd31f1acd36f5c. Data only; the Python engine is
// not bundled and its checks are re-implemented against Rewriter's engine.
//
// License note: only proselint-original, BSD-3-Clause-covered lists are
// reproduced here. Lists that proselint bundles from other sources are NOT
// included: Garner's Modern American Usage extracts (book-derived),
// GNU diction (GPL-3.0) cliches, and After the Deadline (AGPL-3.0) redundancy
// data. See THIRD_PARTY_NOTICES.md.
export const source = {
  name: 'proselint',
  commit: 'dbed789caae662d06c7c8a5a13dd31f1acd36f5c',
  url: 'https://github.com/amperser/proselint',
  license: 'BSD-3-Clause',
};
// checks/hedging.py — "Hedging. Just say it." (credited to Pinker's book on writing).
export const hedgePhrases = [
    "I would argue that",
    ", so to speak",
    "to a certain degree"
  ];
// checks/redundancy/ras_syndrome.py — "RAS syndrome. Use X instead of Y."
export const rasSyndrome = [
    [
      "abm missile",
      "ABM"
    ],
    [
      "act test",
      "ACT"
    ],
    [
      "abm missiles",
      "ABMs"
    ],
    [
      "abs braking system",
      "ABS"
    ],
    [
      "atm machine",
      "ATM"
    ],
    [
      "cd disc",
      "CD"
    ],
    [
      "cpi Index",
      "CPI"
    ],
    [
      "gps system",
      "GPS"
    ],
    [
      "gui interface",
      "GUI"
    ],
    [
      "hiv virus",
      "HIV"
    ],
    [
      "isbn number",
      "ISBN"
    ],
    [
      "lcd display",
      "LCD"
    ],
    [
      "pdf format",
      "PDF"
    ],
    [
      "pin number",
      "PIN"
    ],
    [
      "ras syndrome",
      "RAS"
    ],
    [
      "rip in peace",
      "RIP"
    ],
    [
      "please RSVP",
      "RSVP"
    ],
    [
      "salT talks",
      "SALT"
    ],
    [
      "sat test",
      "SAT"
    ],
    [
      "upc codes",
      "UPC"
    ]
  ];
// checks/redundancy/misc.py (check_wallace) — redundancy pairs.
export const wallaceRedundancy = [
    [
      "rectangular in shape",
      "rectangular"
    ],
    [
      "audible to the ear",
      "audible"
    ]
  ];
// checks/redundancy/misc.py (check_nordquist) — redundancy pairs.
export const nordquistRedundancy = [
    [
      "absolutely essential",
      "essential"
    ],
    [
      "absolutely necessary",
      "necessary"
    ],
    [
      "a.m. in the morning",
      "a.m."
    ],
    [
      "p.m. at night",
      "p.m."
    ]
  ];
// checks/uncomparables.py — comparators and absolute adjectives that cannot
// be graded (credited to David Foster Wallace).
export const comparators = [
    "extremely",
    "increasingly",
    "kind of",
    "largely",
    "less",
    "mildly",
    "more",
    "quite",
    "very"
  ];
export const fancyComparators = [
    "least",
    "most"
  ];
export const uncomparables = [
    "absolute",
    "adequate",
    "chief",
    "complete",
    "correct",
    "devoid",
    "entire",
    "false",
    "fatal",
    "favorite",
    "final",
    "ideal",
    "impossible",
    "inevitable",
    "infinite",
    "irrevocable",
    "main",
    "manifest",
    "only",
    "paramount",
    "perfect",
    "perpetual",
    "possible",
    "preferable",
    "principal",
    "singular",
    "stationary",
    "sufficient",
    "true",
    "unanimous",
    "unavoidable",
    "unbroken",
    "uniform",
    "unique",
    "universal",
    "void",
    "whole"
  ];
// checks/lexical_illusions.py — repeated-word illusion pattern; proselint
// credits write-good (MIT). Upstream pattern, padded to whole words:
export const lexicalIllusionPattern = "\\b(\\w+(?:\\s+\\w+){0,3})(\\s+\\1)+\\b";
export const lexicalIllusionExceptions = ['had had', 'that that'];
