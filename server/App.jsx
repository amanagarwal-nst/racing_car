import React, { useState, useEffect, useRef, useCallback } from "react";

/*
  NODE RACER — learn Node.js by winning a night highway race.
  - Sign up / sign in / sign out; optional real Google Sign-In
  - Answer Node.js questions to boost your car; beat the rival to the finish
  - Scores post to a leaderboard (shared via /api when a KV store is attached)

  Storage: local accounts are kept in the browser (a classroom demo store —
  passwords are only lightly obfuscated, not secure). The leaderboard goes
  through /api/leaderboard and falls back to localStorage if that's absent.
*/

// ---------------------------------------------------------------------------
// Question bank — each teaches one Node concept
// ---------------------------------------------------------------------------
const QUESTIONS = [
  {
    concept: "Modules",
    q: "What does require('./math') do in Node.js?",
    options: [
      "Deletes the math module from memory",
      "Loads and runs the math.js file and returns its exports",
      "Downloads the math package from npm",
      "Creates a new empty module named math",
    ],
    answer: 1,
    why: "require() loads a module, executes it once (cached after), and returns whatever the module assigned to module.exports.",
  },
  {
    concept: "Modules",
    q: "How do you expose a function so other files can require() it?",
    options: [
      "return myFunc",
      "export default myFunc",
      "module.exports = myFunc  (or exports.myFunc = ...)",
      "global.myFunc = myFunc",
    ],
    answer: 2,
    why: "In CommonJS, whatever you attach to module.exports is what require() hands back to the caller.",
  },
  {
    concept: "Event Loop",
    q: "The Node.js event loop lets a single thread handle many connections by…",
    options: [
      "Running blocking code faster",
      "Spawning one OS thread per request",
      "Offloading I/O and running callbacks when work completes",
      "Compiling JavaScript to C++ at runtime",
    ],
    answer: 2,
    why: "Node stays non-blocking: it starts I/O, keeps going, and later runs your callback when the result is ready — all on one main thread.",
  },
  {
    concept: "Event Loop",
    q: "Which of these runs FIRST in the same tick?",
    options: [
      "setTimeout(fn, 0)",
      "setImmediate(fn)",
      "process.nextTick(fn)",
      "fs.readFile callback",
    ],
    answer: 2,
    why: "process.nextTick callbacks run before the event loop continues — ahead of timers, immediates, and I/O callbacks.",
  },
  {
    concept: "npm",
    q: "What does 'npm' stand for?",
    options: [
      "Node Package Manager",
      "New Programming Method",
      "Node Process Monitor",
      "Network Protocol Module",
    ],
    answer: 0,
    why: "npm is the default package manager for Node — it installs and manages the libraries your project depends on.",
  },
  {
    concept: "package.json",
    q: "Which file records a project's dependencies and scripts?",
    options: ["index.js", "node.config", "package.json", "modules.list"],
    answer: 2,
    why: "package.json is the manifest: name, version, dependencies, and the scripts you run with `npm run`.",
  },
  {
    concept: "File System",
    q: "How does fs.readFileSync differ from fs.readFile?",
    options: [
      "readFileSync is faster in every case",
      "readFileSync blocks the thread until the file is read",
      "readFile can only read images",
      "There is no difference",
    ],
    answer: 1,
    why: "The Sync version blocks the event loop until done. The async fs.readFile takes a callback and keeps the app responsive.",
  },
  {
    concept: "Globals",
    q: "What does __dirname contain?",
    options: [
      "The name of the current function",
      "The absolute path of the folder holding the current module",
      "The user's home directory",
      "The Node.js version",
    ],
    answer: 1,
    why: "__dirname is the directory of the current file — handy for building reliable paths with the path module.",
  },
  {
    concept: "Events",
    q: "Which EventEmitter method registers a listener for an event?",
    options: [".emit()", ".on()", ".listen()", ".watch()"],
    answer: 1,
    why: "emitter.on('event', cb) subscribes; emitter.emit('event') fires it. This pub/sub pattern is core to Node's streams and servers.",
  },
  {
    concept: "Async",
    q: "async/await is mainly syntactic sugar over…",
    options: ["Callbacks", "Promises", "Threads", "Generators only"],
    answer: 1,
    why: "await pauses inside an async function until a Promise settles, letting you write async code that reads top-to-bottom.",
  },
  {
    concept: "Callbacks",
    q: "In Node's classic error-first callback (err, data) => {}, err is…",
    options: [
      "Always null",
      "The first argument, holding an error or null",
      "The returned data",
      "A boolean success flag",
    ],
    answer: 1,
    why: "Convention: the first callback argument is the error (null when all is well), so you check it before using data.",
  },
  {
    concept: "process",
    q: "What does process.argv hold?",
    options: [
      "Environment variables",
      "The command-line arguments passed to the script",
      "The exit code",
      "A list of loaded modules",
    ],
    answer: 1,
    why: "process.argv is an array of CLI arguments; the actual user args start at index 2 (after node and the script path).",
  },
  {
    concept: "Express",
    q: "In Express, a middleware function has the signature…",
    options: [
      "(req, res, next)",
      "(request, callback)",
      "(err, done)",
      "(socket, data)",
    ],
    answer: 0,
    why: "Middleware receives req, res, and next(). Calling next() passes control to the next middleware in the chain.",
  },
  {
    concept: "Express",
    q: "Which sends a response back to the client in Express?",
    options: ["res.send()", "req.reply()", "res.get()", "server.push()"],
    answer: 0,
    why: "res.send() (or res.json(), res.end()) writes the response. Forgetting to send leaves the request hanging.",
  },
  {
    concept: "Streams",
    q: "Streams are useful because they let you…",
    options: [
      "Load an entire file into memory at once",
      "Process data in chunks as it arrives",
      "Encrypt every request automatically",
      "Replace the event loop",
    ],
    answer: 1,
    why: "Streams handle data piece by piece, so you can process huge files or network data without buffering it all in memory.",
  },
  {
    concept: "Buffer",
    q: "A Node Buffer is designed to hold…",
    options: [
      "Only UTF-8 strings",
      "Raw binary data",
      "SQL query results",
      "HTML templates",
    ],
    answer: 1,
    why: "Buffers store fixed-length raw bytes — essential for files, network packets, and other binary data.",
  },
  {
    concept: "Core modules",
    q: "Which of these is NOT a built-in Node core module?",
    options: ["fs", "http", "path", "express"],
    answer: 3,
    why: "express is a third-party package installed via npm. fs, http, and path ship with Node itself.",
  },
  {
    concept: "Runtime",
    q: "Node.js runs JavaScript using which engine?",
    options: ["SpiderMonkey", "V8", "Chakra", "Nashorn"],
    answer: 1,
    why: "Node embeds Google's V8 engine (the same one in Chrome) to compile and execute JavaScript.",
  },
];

// ---------------------------------------------------------------------------
// Storage layer
//   - Accounts live in the browser (localStorage) — a classroom demo store.
//   - The leaderboard goes through /api/leaderboard so it can be shared across
//     everyone. If that API isn't reachable (e.g. a static-only deploy) it
//     transparently falls back to localStorage. See src/db.js.
// ---------------------------------------------------------------------------
import * as db from "./db.js";

const obf = (s) => (typeof btoa === "function" ? btoa("nr::" + s) : "nr::" + s);
const storeGet = (key) => db.getAccount(key);
const storeSet = (key, value) => db.saveAccount(key, value);

// Accounts are keyed by provider so Google and local names never collide
const accountKey = (u) =>
  u.provider === "google" ? "account:google:" + u.email : "account:" + u.username;

const FINISH = 100;
const shuffle = (a) => {
  const c = [...a];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
};

// ---------------------------------------------------------------------------
// SVG car
// ---------------------------------------------------------------------------
function Car({ body, glass = "#101725", flip = false }) {
  return (
    <svg
      width="82"
      height="40"
      viewBox="0 0 82 40"
      style={{ transform: flip ? "scaleX(-1)" : "none", overflow: "visible" }}
    >
      <ellipse cx="41" cy="35" rx="34" ry="4" fill="rgba(0,0,0,.35)" />
      <path
        d="M6 26 Q8 18 20 17 L28 10 Q31 7 38 7 L54 7 Q60 7 63 12 L70 17 Q76 18 76 25 L76 27 Q76 30 72 30 L10 30 Q6 30 6 27 Z"
        fill={body}
      />
      <path d="M31 10 L52 10 Q56 10 58 15 L60 17 L30 17 Z" fill={glass} opacity="0.9" />
      <rect x="6" y="24" width="70" height="4" rx="2" fill="rgba(0,0,0,.25)" />
      <circle cx="22" cy="31" r="7" fill="#0b0f18" />
      <circle cx="22" cy="31" r="3" fill="#6b7486" />
      <circle cx="60" cy="31" r="7" fill="#0b0f18" />
      <circle cx="60" cy="31" r="3" fill="#6b7486" />
      <rect x="72" y="19" width="5" height="4" rx="1.5" fill="#ffe89a" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export default function App() {
  const [screen, setScreen] = useState("auth"); // auth | menu | race | results | board
  const [user, setUser] = useState(null); // {username, bestScore, gamesPlayed}
  const [board, setBoard] = useState([]);
  const [boardLoading, setBoardLoading] = useState(true);

  // load leaderboard once
  const loadBoard = useCallback(async () => {
    setBoardLoading(true);
    const b = await db.getLeaderboard();
    setBoard(Array.isArray(b) ? b : []);
    setBoardLoading(false);
  }, []);
  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  return (
    <div style={styles.root}>
      <StyleTag />
      <div style={styles.frame}>
        <Header
          user={user}
          onBoard={() => setScreen("board")}
          onMenu={() => setScreen("menu")}
          onSignOut={() => {
            setUser(null);
            setScreen("auth");
          }}
        />

        {screen === "auth" && (
          <Auth
            onAuthed={(u) => {
              setUser(u);
              setScreen("menu");
            }}
          />
        )}

        {screen === "menu" && user && (
          <Menu
            user={user}
            onPlay={() => setScreen("race")}
            onBoard={() => setScreen("board")}
          />
        )}

        {screen === "race" && user && (
          <Race
            onDone={async (result) => {
              // update account best + games
              const updated = {
                ...user,
                gamesPlayed: (user.gamesPlayed || 0) + 1,
                bestScore: Math.max(user.bestScore || 0, result.score),
              };
              await storeSet(accountKey(user), updated);
              setUser(updated);

              // post the result to the (possibly shared) leaderboard
              const next = await db.addScore({
                username: user.username,
                score: result.score,
                correct: result.correct,
                won: result.won,
              });
              setBoard(next);

              setScreen("results");
              window.__lastResult = result;
            }}
            onQuit={() => setScreen("menu")}
          />
        )}

        {screen === "results" && (
          <Results
            result={window.__lastResult}
            user={user}
            onAgain={() => setScreen("race")}
            onBoard={() => setScreen("board")}
          />
        )}

        {screen === "board" && (
          <Board
            board={board}
            loading={boardLoading}
            me={user?.username}
            onBack={() => setScreen(user ? "menu" : "auth")}
            onReload={loadBoard}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
function Header({ user, onMenu, onBoard, onSignOut }) {
  return (
    <div style={styles.header}>
      <button
        onClick={user ? onMenu : undefined}
        style={{ ...styles.logo, cursor: user ? "pointer" : "default" }}
      >
        <span style={styles.logoMark}>◈</span>
        <span>
          NODE<span style={{ color: "#66c060" }}>RACER</span>
        </span>
      </button>
      {user && (
        <div style={styles.headerRight}>
          <button style={styles.ghostBtn} onClick={onBoard}>
            Leaderboard
          </button>
          <div style={styles.userChip}>
            <span style={styles.userDot} />
            {user.username}
            {user.provider === "google" && (
              <span style={styles.googleTag}>Google</span>
            )}
          </div>
          <button style={styles.ghostBtn} onClick={onSignOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
function Auth({ onAuthed }) {
  const [mode, setMode] = useState("in"); // in | up
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Google demo modal
  const [showG, setShowG] = useState(false);
  const [gName, setGName] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gErr, setGErr] = useState("");

  const submit = async () => {
    setErr("");
    const u = username.trim().toLowerCase();
    if (u.length < 2) return setErr("Pick a username of at least 2 characters.");
    if (password.length < 3) return setErr("Password needs at least 3 characters.");
    setBusy(true);
    const key = "account:" + u;
    const existing = await storeGet(key);
    if (mode === "up") {
      if (existing) {
        setBusy(false);
        return setErr("That username is taken. Try signing in instead.");
      }
      const acct = {
        username: u,
        provider: "local",
        password: obf(password),
        bestScore: 0,
        gamesPlayed: 0,
      };
      await storeSet(key, acct);
      setBusy(false);
      onAuthed(acct);
    } else {
      if (!existing) {
        setBusy(false);
        return setErr("No racer found with that name. Create an account?");
      }
      if (existing.password !== obf(password)) {
        setBusy(false);
        return setErr("Wrong password. Give it another go.");
      }
      setBusy(false);
      onAuthed(existing);
    }
  };

  const googleContinue = async () => {
    setGErr("");
    const email = gEmail.trim().toLowerCase();
    const name = gName.trim() || email.split("@")[0];
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return setGErr("Enter a valid email to continue.");
    setBusy(true);
    const key = "account:google:" + email;
    let acct = await storeGet(key);
    if (!acct) {
      acct = {
        username: name,
        email,
        provider: "google",
        bestScore: 0,
        gamesPlayed: 0,
      };
      await storeSet(key, acct);
    }
    setBusy(false);
    setShowG(false);
    onAuthed(acct);
  };

  return (
    <div style={styles.center}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>Learn Node.js at full speed</p>
        <h1 style={styles.h1}>
          {mode === "in" ? "Get back on the track" : "Start your engine"}
        </h1>
        <p style={styles.sub}>
          {mode === "in"
            ? "Sign in to keep your best time and your spot on the board."
            : "Create a racer name. Every correct answer is a burst of speed."}
        </p>

        <GoogleButton
          onDemo={() => setShowG(true)}
          onUser={async (p) => {
            const email = (p.email || "").toLowerCase();
            const key = "account:google:" + email;
            let acct = await storeGet(key);
            if (!acct) {
              acct = {
                username: p.name || email.split("@")[0],
                email,
                provider: "google",
                bestScore: 0,
                gamesPlayed: 0,
              };
              await storeSet(key, acct);
            }
            onAuthed(acct);
          }}
        />

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine} />
        </div>

        <label style={styles.label}>Username</label>
        <input
          style={styles.input}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. async_ace"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        {err && <div style={styles.error}>{err}</div>}

        <button style={styles.primaryBtn} onClick={submit} disabled={busy}>
          {busy ? "Warming up…" : mode === "in" ? "Sign in & drive" : "Create racer"}
        </button>

        <div style={styles.switchRow}>
          {mode === "in" ? "New here?" : "Already have a racer?"}{" "}
          <button
            style={styles.linkBtn}
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setErr("");
            }}
          >
            {mode === "in" ? "Create an account" : "Sign in"}
          </button>
        </div>
      </div>

      {showG && (
        <div style={styles.modalWrap} onClick={() => setShowG(false)}>
          <div style={styles.gModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.gModalHead}>
              <GoogleWordmark />
            </div>
            <h2 style={styles.gTitle}>Choose an account</h2>
            <p style={styles.gSub}>to continue to Node Racer</p>

            <label style={styles.gLabel}>Name (optional)</label>
            <input
              style={styles.gInput}
              value={gName}
              onChange={(e) => setGName(e.target.value)}
              placeholder="Ada Lovelace"
            />
            <label style={styles.gLabel}>Email</label>
            <input
              style={styles.gInput}
              value={gEmail}
              onChange={(e) => setGEmail(e.target.value)}
              placeholder="you@gmail.com"
              onKeyDown={(e) => e.key === "Enter" && googleContinue()}
            />
            {gErr && <div style={styles.gError}>{gErr}</div>}

            <button style={styles.primaryBtn} onClick={googleContinue} disabled={busy}>
              {busy ? "Signing in…" : "Continue"}
            </button>
            <button
              style={styles.gCancel}
              onClick={() => setShowG(false)}
            >
              Cancel
            </button>
            <p style={styles.gDemoNote}>
              Classroom demo of the Google flow. Real Google Sign-In needs a
              deployed Node.js server — see the setup that came with this game.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Reads the payload out of a Google ID token (used only as a display fallback;
// the server verifies the signature for real in /api/auth/google).
function decodeJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

// Shows the real "Sign in with Google" button when a client ID is configured
// (VITE_GOOGLE_CLIENT_ID). Without one, falls back to the demo chooser so the
// app still works out of the box.
function GoogleButton({ onUser, onDemo }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const holder = useRef(null);

  useEffect(() => {
    if (!clientId) return;

    const handleCredential = async (resp) => {
      let profile = null;
      try {
        const r = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: resp.credential }),
        });
        if (r.ok) profile = (await r.json()).user;
      } catch {
        /* API not available — fall back to client-side decode */
      }
      if (!profile) {
        const p = decodeJwt(resp.credential);
        if (p) profile = { sub: p.sub, name: p.name, email: p.email, picture: p.picture };
      }
      if (profile) onUser(profile);
    };

    const init = () => {
      if (!window.google || !holder.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
      });
      window.google.accounts.id.renderButton(holder.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
      });
    };

    if (window.google) {
      init();
    } else {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = init;
      document.head.appendChild(s);
    }
  }, [clientId, onUser]);

  if (!clientId) {
    return (
      <button style={styles.googleBtn} onClick={onDemo}>
        <GoogleG />
        Continue with Google
      </button>
    );
  }
  return <div ref={holder} style={{ display: "flex", justifyContent: "center" }} />;
}

// Google "G" logo
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function GoogleWordmark() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <GoogleG />
      <span style={{ fontWeight: 600, color: "#5f6368", fontSize: 15 }}>
        Sign in with Google
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------
function Menu({ user, onPlay, onBoard }) {
  return (
    <div style={styles.center}>
      <div style={{ ...styles.card, maxWidth: 620 }}>
        <p style={styles.eyebrow}>Welcome back, {user.username}</p>
        <h1 style={styles.h1}>Ready to race?</h1>

        <div style={styles.statRow}>
          <div style={styles.stat}>
            <div style={styles.statNum}>{user.bestScore || 0}</div>
            <div style={styles.statLabel}>best score</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statNum}>{user.gamesPlayed || 0}</div>
            <div style={styles.statLabel}>races run</div>
          </div>
        </div>

        <div style={styles.rules}>
          <p style={styles.rulesTitle}>How the race works</p>
          <ol style={styles.ol}>
            <li>You and a rival car sprint down the highway toward the finish.</li>
            <li>A Node.js question appears — answer it right to slam the boost.</li>
            <li>Wrong answers cost you ground, and the rival never stops.</li>
            <li>Reach the finish first, then read the explanation and level up.</li>
          </ol>
        </div>

        <button style={styles.primaryBtn} onClick={onPlay}>
          Start race →
        </button>
        <button style={{ ...styles.ghostBtn, ...styles.blockGhost }} onClick={onBoard}>
          View leaderboard
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Race
// ---------------------------------------------------------------------------
function Race({ onDone, onQuit }) {
  const [pool] = useState(() => {
    // ensure enough questions by cycling the shuffled bank
    const base = shuffle(QUESTIONS);
    return [...base, ...shuffle(QUESTIONS)];
  });
  const [qi, setQi] = useState(0);
  const [player, setPlayer] = useState(0);
  const [rival, setRival] = useState(0);
  const [picked, setPicked] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState("racing"); // racing | done
  const [countdown, setCountdown] = useState(3);
  const qStart = useRef(Date.now());
  const finishedRef = useRef(false);

  const q = pool[qi % pool.length];

  // starting countdown
  useEffect(() => {
    if (countdown <= 0) {
      qStart.current = Date.now();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [countdown]);

  // rival advances in real time (only after countdown, while racing)
  useEffect(() => {
    if (countdown > 0 || status !== "racing") return;
    const id = setInterval(() => {
      setRival((r) => {
        const nr = r + 0.42;
        if (nr >= FINISH && !finishedRef.current) {
          finishedRef.current = true;
          endRace(false);
          return FINISH;
        }
        return nr;
      });
    }, 120);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, status]);

  const endRace = (won) => {
    setStatus("done");
    setScore((s) => {
      const final = s + (won ? 400 : 0);
      // defer to allow state to settle
      setTimeout(
        () =>
          onDone({
            score: final,
            correct: correctCountRef.current,
            won,
          }),
        900
      );
      return final;
    });
  };

  // keep a ref of correct count for the deferred callback
  const correctCountRef = useRef(0);
  useEffect(() => {
    correctCountRef.current = correctCount;
  }, [correctCount]);

  const choose = (i) => {
    if (picked !== null || status !== "racing") return;
    setPicked(i);
    const good = i === q.answer;
    const elapsed = (Date.now() - qStart.current) / 1000;

    if (good) {
      const speedBonus = elapsed < 6 ? 50 : elapsed < 10 ? 25 : 0;
      setScore((s) => s + 100 + speedBonus);
      setCorrectCount((c) => c + 1);
      setPlayer((p) => {
        const np = Math.min(FINISH, p + 14);
        if (np >= FINISH && !finishedRef.current) {
          finishedRef.current = true;
          setTimeout(() => endRace(true), 550);
        }
        return np;
      });
    } else {
      setPlayer((p) => Math.max(0, p - 4));
    }
  };

  const next = () => {
    if (finishedRef.current) return;
    setPicked(null);
    setQi((n) => n + 1);
    qStart.current = Date.now();
  };

  const pLeft = 5 + (player / FINISH) * 80;
  const rLeft = 5 + (rival / FINISH) * 80;
  const lead = player - rival;

  return (
    <div style={styles.raceWrap}>
      {/* HUD */}
      <div style={styles.hud}>
        <div style={styles.hudItem}>
          <span style={styles.hudLabel}>score</span>
          <span style={styles.hudValue}>{score}</span>
        </div>
        <div style={styles.hudItem}>
          <span style={styles.hudLabel}>correct</span>
          <span style={styles.hudValue}>{correctCount}</span>
        </div>
        <div style={styles.hudItem}>
          <span style={styles.hudLabel}>position</span>
          <span
            style={{
              ...styles.hudValue,
              color: lead >= 0 ? "#66c060" : "#ff5470",
            }}
          >
            {lead >= 0 ? "LEADING" : "BEHIND"}
          </span>
        </div>
        <button style={styles.quitBtn} onClick={onQuit}>
          Quit
        </button>
      </div>

      {/* Track */}
      <div style={styles.track}>
        <div style={styles.sky} />
        <div className="nr-road" style={styles.road}>
          <div className="nr-dash" style={styles.dashTop} />
          <div className="nr-dash" style={styles.dashMid} />
          <div className="nr-dash" style={styles.dashBot} />
          <div style={styles.finish} />
          <div
            className="nr-car"
            style={{ ...styles.carLane, top: "22%", left: pLeft + "%" }}
          >
            <Car body="#35e6d0" />
          </div>
          <div
            className="nr-car"
            style={{ ...styles.carLane, top: "60%", left: rLeft + "%" }}
          >
            <Car body="#ff5470" />
          </div>
        </div>

        {countdown > 0 && (
          <div style={styles.countdown}>
            <div className="nr-count" key={countdown} style={styles.countNum}>
              {countdown}
            </div>
          </div>
        )}
        {status === "done" && (
          <div style={styles.countdown}>
            <div style={styles.countNum}>
              {player >= FINISH ? "🏁 YOU WIN" : "RIVAL WINS"}
            </div>
          </div>
        )}
      </div>

      {/* Question */}
      {countdown <= 0 && status === "racing" && (
        <div style={styles.qBox}>
          <div style={styles.qConcept}>{q.concept}</div>
          <div style={styles.qText}>{q.q}</div>
          <div style={styles.options}>
            {q.options.map((opt, i) => {
              let s = { ...styles.opt };
              if (picked !== null) {
                if (i === q.answer) s = { ...s, ...styles.optCorrect };
                else if (i === picked) s = { ...s, ...styles.optWrong };
                else s = { ...s, ...styles.optDim };
              }
              return (
                <button
                  key={i}
                  style={s}
                  onClick={() => choose(i)}
                  disabled={picked !== null}
                >
                  <span style={styles.optKey}>{String.fromCharCode(65 + i)}</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div style={styles.feedback}>
              <div
                style={{
                  ...styles.feedbackTag,
                  color: picked === q.answer ? "#66c060" : "#ff5470",
                }}
              >
                {picked === q.answer ? "Boost! +speed" : "Missed — lost ground"}
              </div>
              <p style={styles.why}>{q.why}</p>
              <button style={styles.primaryBtn} onClick={next}>
                Next question →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------
function Results({ result, user, onAgain, onBoard }) {
  const r = result || { score: 0, correct: 0, won: false };
  return (
    <div style={styles.center}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>{r.won ? "Checkered flag" : "Race over"}</p>
        <h1 style={styles.h1}>{r.won ? "You took the win 🏁" : "The rival edged it"}</h1>
        <div style={styles.bigScore}>{r.score}</div>
        <p style={styles.sub}>final score</p>

        <div style={styles.statRow}>
          <div style={styles.stat}>
            <div style={styles.statNum}>{r.correct}</div>
            <div style={styles.statLabel}>correct answers</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statNum}>{user?.bestScore || r.score}</div>
            <div style={styles.statLabel}>your best</div>
          </div>
        </div>

        <button style={styles.primaryBtn} onClick={onAgain}>
          Race again →
        </button>
        <button style={{ ...styles.ghostBtn, ...styles.blockGhost }} onClick={onBoard}>
          See leaderboard
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------
function Board({ board, loading, me, onBack, onReload }) {
  return (
    <div style={styles.center}>
      <div style={{ ...styles.card, maxWidth: 620 }}>
        <div style={styles.boardHead}>
          <div>
            <p style={styles.eyebrow}>Shared board</p>
            <h1 style={styles.h1}>Top racers</h1>
          </div>
          <button style={styles.ghostBtn} onClick={onReload}>
            Refresh
          </button>
        </div>

        {loading ? (
          <p style={styles.sub}>Loading times…</p>
        ) : board.length === 0 ? (
          <p style={styles.sub}>No races logged yet. Be the first to post a score.</p>
        ) : (
          <div style={styles.boardList}>
            {board.map((row, i) => {
              const mine = row.username === me;
              return (
                <div
                  key={i}
                  style={{
                    ...styles.boardRow,
                    ...(mine ? styles.boardRowMe : {}),
                  }}
                >
                  <span style={styles.rank}>{i + 1}</span>
                  <span style={styles.rowName}>
                    {row.username}
                    {row.won ? " 🏁" : ""}
                    {mine ? " (you)" : ""}
                  </span>
                  <span style={styles.rowCorrect}>{row.correct} correct</span>
                  <span style={styles.rowScore}>{row.score}</span>
                </div>
              );
            })}
          </div>
        )}

        <button
          style={{ ...styles.ghostBtn, ...styles.blockGhost, marginTop: 18 }}
          onClick={onBack}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Keyframes + reduced motion
// ---------------------------------------------------------------------------
function StyleTag() {
  return (
    <style>{`
      @keyframes nrDash { from { background-position-x: 0; } to { background-position-x: -240px; } }
      @keyframes nrBob { 0%,100% { transform: translateY(-50%) translateY(0); } 50% { transform: translateY(-50%) translateY(-3px); } }
      @keyframes nrPop { 0% { transform: scale(.4); opacity: 0; } 40% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      .nr-dash { animation: nrDash .5s linear infinite; }
      .nr-car { animation: nrBob 1.1s ease-in-out infinite; }
      .nr-count { animation: nrPop .5s ease-out; }
      .nr-opt:hover { border-color:#35e6d0 !important; }
      button:focus-visible { outline: 3px solid #35e6d0; outline-offset: 2px; }
      @media (prefers-reduced-motion: reduce) {
        .nr-dash, .nr-car, .nr-count { animation: none !important; }
      }
    `}</style>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = {
  root: {
    minHeight: "100%",
    background: "radial-gradient(120% 100% at 50% 0%, #16203a 0%, #0a0e1a 60%)",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    color: "#eef2f8",
    padding: "18px",
    boxSizing: "border-box",
  },
  frame: { maxWidth: 900, margin: "0 auto" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 10,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 900,
    fontStyle: "italic",
    fontSize: 22,
    letterSpacing: "-0.5px",
    background: "none",
    border: "none",
    color: "#eef2f8",
  },
  logoMark: { color: "#35e6d0", fontStyle: "normal", fontSize: 18 },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  userChip: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "rgba(53,230,208,.08)",
    border: "1px solid rgba(53,230,208,.25)",
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
  },
  userDot: { width: 7, height: 7, borderRadius: 99, background: "#66c060" },

  center: { display: "flex", justifyContent: "center", paddingTop: 8 },
  card: {
    width: "100%",
    maxWidth: 440,
    background: "rgba(19,26,46,.75)",
    border: "1px solid rgba(120,140,180,.16)",
    borderRadius: 20,
    padding: "30px 30px 26px",
    boxShadow: "0 30px 70px -30px rgba(0,0,0,.7)",
    backdropFilter: "blur(6px)",
  },
  eyebrow: {
    color: "#66c060",
    fontSize: 12.5,
    fontWeight: 700,
    margin: "0 0 8px",
    letterSpacing: "0.3px",
  },
  h1: {
    fontSize: 27,
    lineHeight: 1.1,
    fontWeight: 800,
    margin: "0 0 10px",
    letterSpacing: "-0.6px",
  },
  sub: { color: "#8b93a7", fontSize: 14.5, margin: "0 0 20px", lineHeight: 1.5 },

  label: {
    display: "block",
    fontSize: 12.5,
    color: "#a7b0c4",
    margin: "12px 0 6px",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#0c1120",
    border: "1px solid rgba(120,140,180,.22)",
    borderRadius: 11,
    padding: "12px 14px",
    color: "#eef2f8",
    fontSize: 15,
    outline: "none",
  },
  error: {
    marginTop: 14,
    background: "rgba(255,84,112,.1)",
    border: "1px solid rgba(255,84,112,.35)",
    color: "#ffb3c1",
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 13.5,
  },
  warnNote: {
    marginTop: 16,
    fontSize: 12,
    color: "#7a8399",
    lineHeight: 1.5,
  },
  primaryBtn: {
    width: "100%",
    marginTop: 20,
    background: "linear-gradient(90deg, #66c060, #35e6d0)",
    color: "#04140f",
    fontWeight: 800,
    fontSize: 15.5,
    border: "none",
    borderRadius: 12,
    padding: "13px 16px",
    cursor: "pointer",
    letterSpacing: "0.2px",
  },
  ghostBtn: {
    background: "rgba(255,255,255,.04)",
    border: "1px solid rgba(120,140,180,.2)",
    color: "#dbe2ee",
    fontWeight: 600,
    fontSize: 13.5,
    borderRadius: 10,
    padding: "9px 14px",
    cursor: "pointer",
  },
  blockGhost: { width: "100%", marginTop: 10, padding: "12px 16px" },
  switchRow: { marginTop: 18, fontSize: 13.5, color: "#8b93a7", textAlign: "center" },

  googleBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: "#ffffff",
    color: "#1f1f1f",
    border: "1px solid #dadce0",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 14.5,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 4,
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "16px 0 4px",
  },
  dividerLine: { flex: 1, height: 1, background: "rgba(120,140,180,.2)" },
  dividerText: { fontSize: 12, color: "#7a8399" },
  googleTag: {
    fontSize: 10,
    fontWeight: 700,
    color: "#a7b0c4",
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(120,140,180,.25)",
    borderRadius: 6,
    padding: "1px 6px",
  },
  modalWrap: {
    position: "fixed",
    inset: 0,
    background: "rgba(4,7,14,.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    zIndex: 50,
    backdropFilter: "blur(3px)",
  },
  gModal: {
    width: "100%",
    maxWidth: 400,
    background: "#ffffff",
    color: "#202124",
    borderRadius: 16,
    padding: "26px 28px 22px",
    boxShadow: "0 30px 80px -20px rgba(0,0,0,.6)",
  },
  gModalHead: { marginBottom: 14 },
  gTitle: {
    fontSize: 20,
    fontWeight: 500,
    color: "#202124",
    margin: "0 0 2px",
  },
  gSub: { fontSize: 13.5, color: "#5f6368", margin: "0 0 12px" },
  gDemoNote: {
    marginTop: 14,
    fontSize: 11.5,
    color: "#80868b",
    lineHeight: 1.5,
    textAlign: "center",
  },
  gLabel: {
    display: "block",
    fontSize: 12.5,
    color: "#5f6368",
    margin: "12px 0 6px",
    fontWeight: 600,
  },
  gInput: {
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
    border: "1px solid #dadce0",
    borderRadius: 8,
    padding: "12px 14px",
    color: "#202124",
    fontSize: 15,
    outline: "none",
  },
  gError: {
    marginTop: 12,
    background: "#fce8e6",
    border: "1px solid #f5c2bd",
    color: "#c5221f",
    padding: "9px 12px",
    borderRadius: 8,
    fontSize: 13,
  },
  gCancel: {
    width: "100%",
    marginTop: 10,
    background: "#fff",
    border: "1px solid #dadce0",
    color: "#3c4043",
    fontWeight: 600,
    fontSize: 14,
    borderRadius: 10,
    padding: "11px 16px",
    cursor: "pointer",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#35e6d0",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13.5,
  },

  statRow: { display: "flex", gap: 14, margin: "6px 0 20px" },
  stat: {
    flex: 1,
    background: "rgba(10,16,30,.6)",
    border: "1px solid rgba(120,140,180,.14)",
    borderRadius: 14,
    padding: "14px 16px",
    textAlign: "center",
  },
  statNum: { fontSize: 26, fontWeight: 900, color: "#35e6d0", fontVariantNumeric: "tabular-nums" },
  statLabel: { fontSize: 11.5, color: "#8b93a7", marginTop: 2, letterSpacing: "0.3px" },

  rules: {
    background: "rgba(10,16,30,.5)",
    border: "1px solid rgba(120,140,180,.14)",
    borderRadius: 14,
    padding: "16px 18px",
    marginBottom: 6,
  },
  rulesTitle: { fontWeight: 700, fontSize: 14, margin: "0 0 8px", color: "#dbe2ee" },
  ol: { margin: 0, paddingLeft: 18, color: "#9aa3b7", fontSize: 13.5, lineHeight: 1.7 },

  // Race
  raceWrap: {},
  hud: {
    display: "flex",
    alignItems: "center",
    gap: 22,
    background: "rgba(10,16,30,.7)",
    border: "1px solid rgba(120,140,180,.16)",
    borderRadius: 14,
    padding: "10px 16px",
    marginBottom: 14,
  },
  hudItem: { display: "flex", flexDirection: "column" },
  hudLabel: {
    fontSize: 10.5,
    color: "#7a8399",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    letterSpacing: "0.5px",
  },
  hudValue: {
    fontSize: 17,
    fontWeight: 800,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontVariantNumeric: "tabular-nums",
  },
  quitBtn: {
    marginLeft: "auto",
    background: "rgba(255,84,112,.1)",
    border: "1px solid rgba(255,84,112,.3)",
    color: "#ff9aab",
    fontWeight: 600,
    fontSize: 12.5,
    borderRadius: 9,
    padding: "7px 12px",
    cursor: "pointer",
  },

  track: {
    position: "relative",
    height: 190,
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid rgba(120,140,180,.16)",
    marginBottom: 16,
  },
  sky: {
    position: "absolute",
    inset: 0,
    height: "34%",
    background: "linear-gradient(180deg, #241848 0%, #3a2a5e 60%, #4a3a2e 100%)",
  },
  road: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",
    background:
      "linear-gradient(180deg, #2a3145 0%, #1c2233 40%, #141a28 100%)",
  },
  dashTop: {
    position: "absolute",
    top: "14%",
    left: 0,
    right: 0,
    height: 3,
    backgroundImage:
      "repeating-linear-gradient(90deg, rgba(255,255,255,.5) 0 40px, transparent 40px 120px)",
    backgroundSize: "240px 3px",
    opacity: 0.5,
  },
  dashMid: {
    position: "absolute",
    top: "48%",
    left: 0,
    right: 0,
    height: 4,
    backgroundImage:
      "repeating-linear-gradient(90deg, #ffcf4a 0 50px, transparent 50px 120px)",
    backgroundSize: "240px 4px",
    opacity: 0.85,
  },
  dashBot: {
    position: "absolute",
    top: "84%",
    left: 0,
    right: 0,
    height: 3,
    backgroundImage:
      "repeating-linear-gradient(90deg, rgba(255,255,255,.5) 0 40px, transparent 40px 120px)",
    backgroundSize: "240px 3px",
    opacity: 0.5,
  },
  finish: {
    position: "absolute",
    right: "6%",
    top: 0,
    bottom: 0,
    width: 14,
    backgroundImage:
      "repeating-conic-gradient(#fff 0% 25%, #111 0% 50%)",
    backgroundSize: "14px 14px",
    opacity: 0.9,
    boxShadow: "0 0 18px rgba(255,255,255,.35)",
  },
  carLane: {
    position: "absolute",
    transform: "translateY(-50%)",
    transition: "left .5s cubic-bezier(.22,1,.36,1)",
    filter: "drop-shadow(0 6px 10px rgba(0,0,0,.5))",
  },
  countdown: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(6,9,18,.45)",
  },
  countNum: {
    fontSize: 54,
    fontWeight: 900,
    fontStyle: "italic",
    letterSpacing: "-1px",
    color: "#35e6d0",
    textShadow: "0 0 24px rgba(53,230,208,.6)",
  },

  qBox: {
    background: "rgba(19,26,46,.7)",
    border: "1px solid rgba(120,140,180,.16)",
    borderRadius: 16,
    padding: "20px 22px",
  },
  qConcept: {
    display: "inline-block",
    fontSize: 11.5,
    fontWeight: 700,
    color: "#66c060",
    background: "rgba(102,192,96,.1)",
    border: "1px solid rgba(102,192,96,.25)",
    padding: "3px 10px",
    borderRadius: 999,
    marginBottom: 12,
  },
  qText: { fontSize: 18, fontWeight: 700, lineHeight: 1.35, marginBottom: 16 },
  options: { display: "grid", gap: 10 },
  opt: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    textAlign: "left",
    background: "#0c1120",
    border: "1px solid rgba(120,140,180,.2)",
    borderRadius: 11,
    padding: "13px 15px",
    color: "#dbe2ee",
    fontSize: 14.5,
    cursor: "pointer",
  },
  optKey: {
    flexShrink: 0,
    width: 24,
    height: 24,
    borderRadius: 7,
    background: "rgba(120,140,180,.15)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 12.5,
    color: "#a7b0c4",
  },
  optCorrect: {
    background: "rgba(102,192,96,.14)",
    borderColor: "#66c060",
    color: "#d7f5d3",
  },
  optWrong: {
    background: "rgba(255,84,112,.12)",
    borderColor: "#ff5470",
    color: "#ffcdd5",
  },
  optDim: { opacity: 0.5 },
  feedback: {
    marginTop: 16,
    borderTop: "1px solid rgba(120,140,180,.16)",
    paddingTop: 14,
  },
  feedbackTag: { fontWeight: 800, fontSize: 14, marginBottom: 6 },
  why: { color: "#9aa3b7", fontSize: 13.5, lineHeight: 1.6, margin: "0 0 4px" },

  bigScore: {
    fontSize: 58,
    fontWeight: 900,
    fontStyle: "italic",
    color: "#35e6d0",
    letterSpacing: "-2px",
    lineHeight: 1,
    textShadow: "0 0 30px rgba(53,230,208,.4)",
    marginTop: 4,
  },

  boardHead: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  boardList: { display: "flex", flexDirection: "column", gap: 7 },
  boardRow: {
    display: "grid",
    gridTemplateColumns: "28px 1fr auto auto",
    alignItems: "center",
    gap: 12,
    background: "rgba(10,16,30,.5)",
    border: "1px solid rgba(120,140,180,.12)",
    borderRadius: 11,
    padding: "11px 14px",
  },
  boardRowMe: {
    background: "rgba(53,230,208,.08)",
    borderColor: "rgba(53,230,208,.35)",
  },
  rank: {
    fontWeight: 900,
    color: "#66c060",
    fontFamily: "ui-monospace, monospace",
    fontSize: 15,
  },
  rowName: { fontWeight: 700, fontSize: 14.5 },
  rowCorrect: { fontSize: 12, color: "#8b93a7" },
  rowScore: {
    fontWeight: 900,
    fontSize: 16,
    color: "#35e6d0",
    fontFamily: "ui-monospace, monospace",
    fontVariantNumeric: "tabular-nums",
  },
};
