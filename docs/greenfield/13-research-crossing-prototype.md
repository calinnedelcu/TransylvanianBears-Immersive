# Research Crossing / measure what changes

## Primary project sources

- EconomyNews repository: https://github.com/calinnedelcu/economynewsresearch
- EconomyNews paper: `paper/main.pdf` at commit
  `85d798ba8d0efa78bd1906c694a76696cc11b9d2`
- Automation Risk repository:
  https://github.com/BalaurulBondoc771/Evaluarea-riscului-de-automatizare-a-ocupa-iilor-utiliz-nd-metode-de-nv-are-automat-
- Automation Risk paper: `Lucrare/Estimarea probabilitatii_APA - complet.docx` at
  commit `b3d165790e7bbc5e4e4be7497b38b18126bd6fb3`

## Interaction references

- Observable interaction guidance: https://observablehq.com/plot/features/interactions
- Observable linked brushing: https://observablehq.com/blog/linked-brushing
- D3 line generation and Canvas context: https://d3js.org/d3-shape/line
- WHATWG Canvas: https://html.spec.whatwg.org/multipage/canvas.html

The prototype follows the useful parts of linked views and details-on-demand without
turning the homepage into an analytics dashboard. The static semantic form remains
complete; the canvas is an additional spatial reading.

## Verified EconomyNews facts

- Authors: Andrei Calin Nedelcu and Andrei Cheroiu.
- 2,449 unscheduled events selected from 63,016 feed messages.
- Sample: 24 March 2025 to 5 May 2026.
- Assets: EUR/USD and Nasdaq-100 proxy, one-minute OHLCV bars.
- Event magnitude is 1.3x to 1.9x matched baseline across asset-window cells.
- Directional hit rate is modest at 49-54%.
- The pre-event move is similar in magnitude to the post-event move, so the public
  feed timestamp is not a reliable informational event time.
- External Financial PhraseBank result: 84.6% accuracy, Cohen's kappa 0.72.

## Verified Automation Risk facts

- Model: LightGBM regression over occupational structure derived from ESCO.
- 3,037 ESCO occupations used by the reported model.
- Test MAE 11.03 and R-squared 0.196.
- Five-fold CV R-squared is -14.21 +/- 6.16, indicating serious instability.
- Classification accuracy 55.26% versus 53.95% majority baseline.
- 654 of 4,456 COR occupations map to ESCO at the 80% fuzzy threshold: 14.7%.
- Among mapped occupations: 330 low, 318 medium and 6 high risk.
- The paper treats scores as orientation, not exact forecasts.
- Public repository ownership and commit history do not establish the complete project
  author list. Credit remains source-linked until the team confirms authorship.

## Prototype contract

1. The 48 exit bits from Infect.exe expand into an observation field.
2. The field separates into two currents, not two cards: market events and occupations.
3. Scroll changes the shared instrument through `collect`, `compare` and `qualify`.
4. EconomyNews uses 2,449 abstract marks. Their positions do not claim exact time or
   category encoding; the authentic timeline figure carries that evidence.
5. Automation Risk uses 654 marks grouped exactly as 330 low, 318 medium and 6 high.
6. Explicit lens buttons expose either project without hiding the other project.
7. Method, finding and limitation are equal-weight content bands after the instrument.
8. Reduced motion shows a stable final field. Mobile uses fewer rendered marks while
   retaining the exact numeric totals in semantic content.
