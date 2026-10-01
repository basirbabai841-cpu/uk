# Stratum

Static site. `npm run build` creates `dist/` (pages + fonts + poster + videos).

## Deploy (recommended: Git)
1. Push this folder to a GitHub repo (index.html must be at the repo root).
2. **Vercel:** Add New > Project > import repo > Deploy. Settings are read from vercel.json.
   **Netlify:** Add new site > Import from Git > Deploy. Settings are read from netlify.toml.

## Deploy from your computer (Node 18+)
- Vercel:  `npx vercel --prod`
- Netlify: `npx netlify deploy --build --prod`

## Drag-and-drop (Netlify Drop only)
`npm install && npm run build`, then drag the **dist** folder (not the zip) onto app.netlify.com/drop.

Test locally: `npm install && npm run build && npx serve dist`
