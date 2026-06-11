# Opening Trainer — Caro-Kann & Vienna Gambit

A mobile-first chess opening trainer in the style of chess.com's Game Review.
Train the **Caro-Kann Defense** (you play Black) and the **Vienna Gambit**
(you play White) across every major variation — accepted, declined, traps,
and punishments — with on-board arrows showing what's attacked, what's
defended, and where pieces need to go.

## Features

- **Learn mode** — walks you through each line; before every one of your
  moves you see coach text plus arrows/highlights explaining the idea.
- **Drill mode** — quiz yourself. Wrong moves flash red; after 2 misses the
  hint arrow appears, after 3 the full explanation. Finish a drill with zero
  misses and zero hints to **master** the line (progress saved on-device).
- **Activity overlay** (👁) — toggleable computed arrows for the last move:
  red = pieces it attacks, green = pieces it defends, red squares = hanging
  pieces.
- **Branching lines** — opponent alternatives fork into separate trainable
  lines; "Drill all" picks lines at random, weighted toward what you haven't
  mastered yet.
- chess.com-style UI: green board, last-move highlights, move badges
  (book / best / brilliant / mistake), move list, big green button.

## Repertoire

**Caro-Kann (Black):** Advance 3...Bf5 (incl. 5.Bd3), Advance 4.h4 spike,
Exchange, Classical 4...Bf5 main line, 4...Nd7 & the Nd6# trap, Panov-
Botvinnik, Fantasy (incl. the dxe5 punishment), Two Knights, Accelerated
Panov.

**Vienna Gambit (White):** Accepted main line (incl. 4...Ne4 and 4...Qe7),
Declined 3...d5 (incl. 5...Nc6), Declined 3...d6, 2...Nc6 with 3...exf4?!
punished (Hamppe-Allgaier) and 3...d6, 2...Bc5 Qg4 sting (3 defenses),
Copycat 3...Nc6 punished.

Every line is validated by tests that replay all moves through
[chess.js](https://github.com/jhlywa/chess.js) — illegal theory cannot ship.

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # validate lines, arrow math, trainer state machine
npm run build    # typecheck + production build
```

## Deployment

Pushes to `main` deploy automatically to GitHub Pages via
`.github/workflows/deploy.yml` (Settings → Pages → Source must be set to
"GitHub Actions" once). On your phone, open the published URL and use
**Add to Home Screen** for an app-like experience.

Piece graphics: cburnett set (GPLv2+), vendored from lichess — see
`public/pieces/LICENSE.txt`.
