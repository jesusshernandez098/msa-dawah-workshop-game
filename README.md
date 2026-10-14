# MSA Dawah Workshop Game

A live multiplayer workshop game inspired by *Cards Against Humanity* and *Kahoot*, designed for Muslim Student Association (MSA) dawah training workshops. Participants role-play Muslims responding to common questions from non-Muslims about Islam in a fun, collaborative, and educational format.

**Sponsored by [Clear Islam](https://clearislam.net).**

---

## How It Works

Each round has two phases:

1. **Opening (Humorous / Luck-based)** — Every team receives three random answer cards and picks one to respond to a question. Teams then vote for their favourite answer. Opening votes do **not** count toward final rankings.
2. **Follow-up (Thoughtful / Collaborative)** — Using the winning opening card as context, teams collaborate to write a serious, respectful Islamic response (6-minute timer). Teams vote again. **Only follow-up votes count toward the final leaderboard.**

There are **7 rounds** in a fixed order. A facilitator controls the game from a host screen projected for the class.

---

## Technology Stack

| Tool | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| Firebase Auth (Anonymous) | User identity without accounts |
| Firebase Realtime Database | Live multiplayer sync |
| `react-router-dom` (HashRouter) | GitHub Pages–compatible routing |
| `qrcode.react` | Team join QR code |
| `lucide-react` | Icons |
| Vitest | Unit tests |

---

## Local Development

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/msa-dawah-workshop-game.git
cd msa-dawah-workshop-game

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173/msa-dawah-workshop-game/](http://localhost:5173/msa-dawah-workshop-game/) in your browser.

### Testing in Multiple Browser Windows

To simulate multiple teams locally:

1. Open the host screen in one browser window: `http://localhost:5173/msa-dawah-workshop-game/#/host`
2. Create a new game and copy the game code.
3. Open several **Private/Incognito** windows (each becomes a separate anonymous user) and navigate to: `http://localhost:5173/msa-dawah-workshop-game/#/play?game=XXXXXX`

Each incognito window simulates a different team device.

---

## Available Scripts

```bash
npm run dev       # Start local dev server with HMR
npm run build     # TypeScript check + Vite production build → dist/
npm run lint      # Run oxlint (0 errors required)
npm test          # Run Vitest unit tests
```

---

## Firebase Configuration

The Firebase web configuration in `src/lib/firebase.ts` is intentionally **client-side only** and safe to include in public source code. It identifies your Firebase project to the Firebase SDK — security is enforced entirely by **Firebase Security Rules** and **authenticated UIDs**, not by keeping this config secret.

> [!CAUTION]
> **Never add a Firebase service-account private key, Admin SDK credentials, or any server-side secret to this repository.** The `.gitignore` does not currently exclude `.env` files — do not create one containing private keys.

### Anonymous Authentication

Firebase Anonymous Authentication is already enabled in the Firebase Console. Every browser tab receives a unique anonymous UID automatically when the app loads. No login screen is required.

- The host UID becomes `hostUid` in the session record.
- Each team UID becomes the team's record key.
- All security rules validate these UIDs server-side.

---

## Firebase Database Security Rules

The rules in [`database.rules.json`](./database.rules.json) enforce:

- Every read/write requires an authenticated (anonymous) user.
- Only the session's `hostUid` can change game phases, timers, deals, and results.
- A team can only write to its own team record (keyed by `auth.uid`).
- Teams cannot vote for themselves (`candidateUid !== auth.uid`).
- Team names are validated: 1–20 characters (trimmed).
- Written responses are validated: 1–1,000 characters.
- The host may remove any team or delete the session.

### Applying the Rules (Manual Step Required)

The rules must be deployed manually from the Firebase Console. **The app will not work correctly until you do this.**

**Option A — Firebase Console (Recommended for beginners):**

1. Go to the [Firebase Console](https://console.firebase.google.com/) → your project → **Realtime Database** → **Rules** tab.
2. Open [`database.rules.json`](./database.rules.json) in a text editor.
3. Copy the entire contents and paste them into the Rules editor, replacing any existing content.
4. Click **Publish**.

**Option B — Firebase CLI:**

```bash
# Install Firebase CLI if needed
npm install -g firebase-tools

# Log in
firebase login

# Deploy only the database rules
firebase deploy --only database --project msa-dawah-workshop-game
```

> [!WARNING]
> Until the rules are deployed, the database defaults to **locked mode** (all reads and writes denied), so the app will appear to hang when joining or hosting a game.

---

## Routing

`HashRouter` is used for GitHub Pages compatibility. All routes use the `#` prefix:

| Route | Screen |
|---|---|
| `#/` | Welcome screen (Join / Host) |
| `#/host` | Facilitator control panel |
| `#/play?game=XXXXXX` | Team mobile screen |

---

## GitHub Pages Deployment

A GitHub Actions workflow is included at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It will:

1. Trigger on every push to `main`.
2. Install dependencies and run `npm run build`.
3. Deploy the `dist/` folder to the `gh-pages` branch.

**Before deploying:**

1. Go to your GitHub repository → **Settings** → **Pages**.
2. Set **Source** to `Deploy from a branch` → branch `gh-pages`, folder `/ (root)`.
3. Push a commit to `main` to trigger the first deployment.

The production URL will be: `https://YOUR_USERNAME.github.io/msa-dawah-workshop-game/`

> [!NOTE]
> Remember to deploy your Firebase Database Rules **before** the workshop. The GitHub Pages deployment does not deploy Firebase rules.

---

## Database Structure

```
sessions/
  {gameCode}/
    hostUid: string
    createdAt: number
    lobbyLocked: boolean
    game/
      currentRound: number (0–6)
      currentPhase: string
      submissionsOpen: boolean
      votingOpen: boolean
      timerStatus: 'running' | 'paused' | 'stopped'
      timerRemainingSeconds: number
      phaseEndsAt: number | null
      phaseStartedAt: number | null
    teams/
      {teamUid}/
        id: string
        name: string
        joinedAt: number
        isReady: boolean
        connected: boolean
    deals/
      {roundIndex}/
        {teamUid}: Card[]
    openingSubmissions/
      {roundIndex}/
        {teamUid}: { teamUid, teamName, cardId, cardText, submittedAt }
    openingVotes/
      {roundIndex}/
        {voterUid}: { voterUid, candidateUid, votedAt }
    openingResults/
      {roundIndex}: { winnerUid, winningCardText, winnerName, voteCounts }
    followupSubmissions/
      {roundIndex}/
        {teamUid}: { teamUid, teamName, text, submittedAt, updatedAt }
    followupVotes/
      {roundIndex}/
        {voterUid}: { voterUid, candidateUid, votedAt }
    followupResults/
      {roundIndex}: { rankedEntries[] }
```

---

## Assets

| File | Description |
|---|---|
| `public/assets/msa-logo.png` | MSA logo — displayed on welcome and host screens |
| `public/assets/clear-islam-logo.webp` | Clear Islam logo — displayed on white/cream panel, aspect ratio preserved |

Do not rename, move, or replace these files.

---

## Notes for Facilitators

- You need **at least two teams** to start a game.
- All teams must mark themselves "ready" before **Start Game** becomes active.
- Opening votes are shown for fun but **do not affect final standings**.
- The 6-minute follow-up timer can be paused from the host screen.
- Discussion prompts (visible only to the host) appear after each round to guide debrief.
- You can remove a team from the lobby if needed.
- After all 7 rounds, a final leaderboard is displayed.
