# Dinoguessr

A minimal dinosaur guessing game. Pick a popularity difficulty and mode first, then type the dinosaur name from a photo and compact facts.

## Modes

- `Easy` uses the most popular dinosaurs.
- `Medium` uses the middle popularity tier.
- `Hard` uses the most obscure dinosaurs.
- `Normal` is a 10-question run.
- `Zen` is endless random play.
- `Browse` walks through the selected dinosaur list in order.
- All difficulties use type-in answers with typo tolerance.
- Each round has four sequential hints. Press `H` or the hint button to reveal them; diet is intentionally excluded.

## Data

Run `npm run fetch:data` to regenerate `public/data/dinosaurs.json`, then `npm run rank:popularity` to refresh difficulty tiers. Facts are normalized from the RESTasaurus API, which derives text from Wikipedia. Clue images are matched from DinosaurPictures.org so rounds avoid isolated-bone Wikimedia photos and name-labeled scientific plates.

## Scripts

- `npm run dev` starts Vite locally.
- `npm run build` creates a production build.
- `npm run preview` previews the production build.
- `npm run fetch:data` refreshes the dinosaur dataset.
- `npm run rank:popularity` ranks dinosaurs into Easy/Medium/Hard tiers.
