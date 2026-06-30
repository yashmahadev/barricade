# 🌐 Barricade: Cyber Grid

[![React](https://img.shields.io/badge/React-19.0-cyan?logo=react&logoColor=cyan)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-blue?logo=tailwindcss)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-v6.0-purple?logo=vite)](https://vite.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-v12.0-orange?logo=firebase)](https://firebase.google.com/)

An ultra-premium, dark-themed cyberpunk tactical board game based on the rules of **Quoridor**. Players race to breach the opponent's boundary line while locking down coordinate sectors with dynamic firewall barricades. 

Featuring custom visual themes, procedural background audio synthesized live in the browser, local LAN lobbies, global rated matchmaking, and a persistent hacker leaderboard.

---

## 🚀 Key Features

*   **Cyberpunk Visual Interface**: Fully customized dark theme utilizing glowing scanlines, neon overlays, grid animations, and modern typography (`Orbitron` & `Inter`).
*   **Theme Customizer**: Four selectable protocol skins that dynamically alter player colors, glowing effects, and game pieces:
    *   *Neon Protocol* (Cyan core vs Amber signal)
    *   *Overdrive Node* (Magenta pulse vs Electric lime gate)
    *   *Retro Synth* (Outrun hot pink vs Digital violet wave)
    *   *Matrix Hack* (Emerald terminal vs Red proxy threat)
*   **Procedural Synth Pad Loop**: Infinite background atmospheric music generated dynamically at runtime using the browser's native **Web Audio API** (requires no audio file downloads and minimal CPU overhead), along with synthesized retro game SFX alerts.
*   **Multiplayer Capabilities**:
    *   **Local LAN / Proxy**: Play locally against a friend or challenge the **Core AI** bot across Easy, Medium, and Hard difficulty presets. Features local match histories and unlimited moves undo state preservation.
    *   **Online Global Breaching**: Match up against players worldwide in real-time ranked matchmaking with trophy points, or set up private peer-to-peer rooms via direct Gate-ID invites.
    *   **Auto-Bot Failover**: Matchmaking lobbies automatically route to active bot cores if a partner is not discovered within 30 seconds.
*   **Global Hacker Leaderboard**: Synchronizes online ranked statistics with Firestore, ranking hackers by active trophies with dynamic progression tier levels.

---

## 🛰️ Technical Stack

*   **Frontend**: React 19, TypeScript, Vite
*   **Styling**: Tailwind CSS v4, Vanilla CSS variables
*   **Audio Synthesis**: Web Audio API (Procedural Oscillator pads)
*   **Backend & Sync**: Firebase Auth, Cloud Firestore (Real-time syncing & Security Rules)
*   **Visual FX**: Canvas-Confetti, custom CSS keyframe animations

---

## 🛠️ Installation & Setup

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/barricade-cyber-grid.git
cd barricade-cyber-grid
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to create a local environment file:
```bash
cp .env.example .env.local
```
Configure your personal Firebase config parameters inside `.env.local`. If left blank, the application will default to a pre-configured sandbox database core.

### 3. Firebase Console Configuration
If deploying your own instance:
1.  Create a project on [Firebase Console](https://console.firebase.google.com/).
2.  Enable **Anonymous Authentication** and **Google Sign-In** inside *Authentication > Sign-in method*.
3.  Create a **Cloud Firestore** database.
4.  Deploy rules in [firestore.rules](firestore.rules) to protect document namespaces.
5.  Create a `/users` collection and a `/games` collection.

---

## 🎮 How to Play (Tactical Protocols)

1.  **Objective**: Shift your system core (pawn) from your start boundary line to the opposite boundary line. The first core to breach the final row wins.
2.  **Move (Pawn Shift)**: Move your core 1 coordinate node vertically or horizontally.
3.  **Firewall Barricade (Wall)**: Place a 2-unit long firewall block in the grid lanes to redirect the opponent. Firewall units are stocked and limited.
4.  **Security Core Overlap**: If cores face each other directly, you can leap over the opponent's core.
5.  **Pathing Rule**: Firewalls block routes but **MUST NOT** trap a player completely. At least one valid path to the goal must remain open for both players at all times.

---

## 💻 NPM Operations

*   `npm run dev` - Launch local dev environment on `localhost:3000`
*   `npm run build` - Compile optimized production bundle in `/dist`
*   `npm run preview` - Preview the built local production bundle
*   `npm run lint` - Perform static TypeScript compilation checking
