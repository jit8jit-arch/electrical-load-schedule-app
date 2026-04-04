# DEWA Cable & Protection Selector

Mobile-first static web app prepared for GitHub Pages deployment on `jit8jit-arch`.

## What it does

- Add electrical equipment one by one.
- Calculates load current from kW or accepts direct current input.
- Selects power cable size using embedded DEWA Appendix 5 tables.
- Selects ECC size using the default rule: same size up to 16 mm², then next standard at 50%.
- Auto-selects MCB or MCCB based on profile breaker sizes and MCCB threshold.
- Auto-selects ELCB / RCCB rating and sensitivity.
- Recommends ABB enclosed isolator models from the attached ABB extract.
- Recommends glands and lug quantities using attached cable OD data where available.
- Builds a load schedule and exports CSV.
- Supports custom dropdown profiles stored locally in the browser.
- Includes a web app manifest and service worker for an app-like mobile experience.

## Files

- `index.html` - main app shell
- `styles.css` - mobile-first styling
- `data.js` - embedded standards and reference tables
- `logic.js` - calculation engine
- `app.js` - UI logic and local storage
- `service-worker.js` - offline shell cache
- `manifest.webmanifest` - installable app metadata
- `assets/` - icons

## Deploy to GitHub Pages

1. Create or open the repository on GitHub.
2. Upload all files from this folder to the repository root.
3. Commit the files.
4. In GitHub repository settings, open **Pages**.
5. Set the source to **Deploy from a branch**.
6. Choose the main branch and root folder.
7. Save.
8. GitHub will publish the site URL.

## Important engineering note

This app is a fast selection tool based on the attached reference material. Final issue drawings and submissions should still be checked for:

- fault level and breaking capacity
- ambient and grouping correction factors
- motor starting duty and special loads
- final voltage drop confirmation for standards not covered in the attached data
- manufacturer terminal compatibility and accessory details

