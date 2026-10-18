# onlybills.app — project guide for Claude

GitHub Pages site for OnlyBills. **`main` is live** at onlybills.app (push to `main` deploys).
- `index.html` — the privacy policy (linked from the App Store listing and the app). Never change
  its wording without the founder; styling changes are fine.
- `split-app/` — the guest bill page source (React + Vite). Built output is committed to `split/`
  (`npm run build`, then `rsync -a --delete dist/ ../split/` from `split-app/`). Served at
  onlybills.app/split/?id=<table>. Demo states: `?demo=2&state=join|claiming|pay|paid|settled|expired`, `?demo=1`.
- `.well-known/apple-app-site-association` + `.nojekyll` — App Clip + universal links. Don't remove.

## Design
This site uses the same design language as the iOS app. The full guide is in the app repo:
`~/Desktop/Projects/Apps/OnlyBills/SplitSwift/DESIGN.md` — read it before any UI change.
Web tokens: `split-app/src/design/tokens.css` (+ `base.css`, `components.css`, `screens.css`);
components in `split-app/src/components/` (Glass, Sheet, Avatar faces, Money, Section, HeroArt, Pay).
Rules in short: system light/dark, one blue accent, grouped surfaces, glass only on floating
chrome, one primary capsule CTA, faces not initials, rounded money digits, plain British copy
with no em dashes, WCAG AA, mobile first (390px).

## Logic that must match the app
`split-app/src/lib/money.js` (money engine) and `faces.js` (face assignment) are ports of the iOS
code; shared fixtures in `src/lib/__fixtures__/` prove parity — run `node --test src/lib` after
any change. Firestore writes must satisfy the deployed rules (app repo `SplitSwift/firebase/`).
