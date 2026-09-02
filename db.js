// src/db.js — the app's storage layer.
//
// Accounts: stored in the browser (localStorage). This is a classroom demo
// store, fine for coursework but not real credential storage.
//
// Leaderboard: posted to /api/leaderboard so every player can share one board.
// If that endpoint isn't reachable (for example a static-only deploy with no
// serverless functions), we fall back to a per-browser localStorage board so
// the game still works.

const LS = typeof localStorage !== "undefined";

// ---- Accounts (local only) -------------------------------------------------
export async function getAccount(key) {
  if (!LS) return null;
  try {
    const v = localStorage.getItem("nr:" + key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export async function saveAccount(key, value) {
  if (!LS) return false;
  try {
    localStorage.setItem("nr:" + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ---- Leaderboard (shared via API, local fallback) --------------------------
function localBoard() {
  if (!LS) return [];
  try {
    return JSON.parse(localStorage.getItem("nr:leaderboard") || "[]");
  } catch {
    return [];
  }
}

export async function getLeaderboard() {
  try {
    const r = await fetch("/api/leaderboard");
    if (r.ok) return await r.json();
  } catch {
    /* fall through to local */
  }
  return localBoard();
}

export async function addScore(entry) {
  try {
    const r = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (r.ok) return await r.json();
  } catch {
    /* fall through to local */
  }
  // local fallback: merge, sort, keep top 25
  const next = [...localBoard(), { ...entry, date: Date.now() }]
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);
  if (LS) localStorage.setItem("nr:leaderboard", JSON.stringify(next));
  return next;
}
