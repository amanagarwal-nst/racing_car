# Node Racer 🏁

A night-highway racing game that teaches Node.js. Answer questions correctly to
boost your car and beat the rival to the finish. Includes sign in / sign out,
optional Google Sign-In, and a leaderboard.

Built with Vite + React, with Vercel serverless functions under `/api`.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

Out of the box this works with **no configuration**: sign up with a username
and password (stored in your browser), and the leaderboard falls back to local
storage. Google Sign-In and the shared leaderboard are optional upgrades below.

## Deploy to Vercel

The fastest path:

```bash
npm i -g vercel
vercel        # first run links/creates the project
vercel --prod # deploy to production
```

Or push this folder to a Git repo and "Import Project" at vercel.com — Vercel
auto-detects Vite and serves the `/api` folder as serverless functions. No build
settings to change.

### Optional: real Google Sign-In

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID
   → **Web application**.
2. Add your URLs to **Authorized JavaScript origins**:
   - `http://localhost:5173` (local dev)
   - `https://YOUR-PROJECT.vercel.app` (your deployed URL)
3. In Vercel → Project → Settings → Environment Variables, add the client ID as
   **both** `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID`, then redeploy.

When `VITE_GOOGLE_CLIENT_ID` is set, the app shows the official Google button
and verifies the token server-side in `api/auth/google.js`. When it isn't set,
the app shows a built-in demo chooser instead, so it always works.

### Optional: shared leaderboard (Vercel KV)

Without a database, serverless functions can't share state between visitors, so
the leaderboard is per-browser. To make it truly shared:

1. Vercel → your project → **Storage** → create a **KV** store and connect it.
2. Vercel injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
3. Redeploy. `api/leaderboard.js` picks up KV and everyone shares one board.

## What's inside (and what it teaches)

- `src/App.jsx` — the game (React).
- `src/db.js` — the storage layer: local accounts + API/localStorage leaderboard.
- `api/leaderboard.js` — a serverless GET/POST endpoint (request/response cycle,
  `req.method`, `req.body`, status codes, an optional KV data store).
- `api/auth/google.js` — verifies a Google ID token with `google-auth-library`
  (`async/await`, `process.env`, why you verify tokens on the server).

Want more questions? Add entries to the `QUESTIONS` array at the top of
`src/App.jsx` — each has a concept, question, options, answer index, and a
short explanation shown after answering.
