# Maison Sillage

A digital perfume workshop. A user describes a fragrance in their own words and an AI perfumer composes a structured formula — materials, percentages, longevity, projection — rendered as a luxury fragrance card.

## Stack

- Static HTML, CSS, vanilla JS — no framework.
- One Vercel serverless function (`/api/generate.js`) that calls **Claude Sonnet 4.6** (`claude-sonnet-4-6`) via `@anthropic-ai/sdk`. (Originally targeted Haiku 4.5; switched to Sonnet for more reliable multi-constraint JSON.)
- API key lives only on the server, in the `ANTHROPIC_API_KEY` Vercel environment variable.

## Local development

```bash
# 1. Install the Vercel CLI once if you don't have it.
npm i -g vercel

# 2. Install dependencies.
npm install

# 3. Copy the env template and fill in your real Anthropic key.
cp .env.local.example .env.local

# 4. Run the local dev server (static site + serverless functions).
vercel dev
```

`vercel dev` serves the static site and the `/api/*` functions at `http://localhost:3000`.

## Deploying

The repo is set up for Vercel. First-time setup:

```bash
vercel link          # link this directory to a Vercel project
vercel env add ANTHROPIC_API_KEY   # add the key to Production + Preview
vercel deploy        # preview deploy
vercel deploy --prod # production deploy
```

After the first link, `git push` to the connected branch triggers a Vercel build automatically. Pull-request branches get preview URLs.

## Project layout

```
.
├── api/
│   ├── generate.js          # serverless endpoint — POST { brief } → composition JSON
│   └── lib/                 # (Step 2) materials reference + system prompt
├── public/
│   └── motifs/              # (Step 5) SVG ornament library
├── fonts/                   # local webfonts
├── media/                   # images used in the static site
├── index.html               # the app shell
├── app.js                   # frontend logic
├── style.css                # styles
└── vercel.json              # function runtime + routing
```

## Notes

- The GitHub Pages build remains functional during the migration. The frontend will switch to calling `/api/generate` once Step 3 lands.
- `.env.local` is gitignored. Never commit real keys.
