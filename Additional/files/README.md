# Vindicta HUD Component Library

Drop-in React + Tailwind CSS + Framer Motion components for the Vindicta
OSINT/link-analysis UI. Only external runtime dependency beyond `react`,
`framer-motion`, and `tailwindcss` is `lucide-react` (used by `AuthScreen`).

## Install

```bash
npm install framer-motion lucide-react
```

## Wire up Tailwind

In `tailwind.config.js`:

```js
const vindictaTheme = require('./vindicta.theme.js');

module.exports = {
  content: [/* your paths */],
  theme: {
    extend: {
      ...vindictaTheme,
    },
  },
  plugins: [],
};
```

Load JetBrains Mono (e.g. via `@fontsource/jetbrains-mono` or a Google Fonts
`<link>`); the config's `fontFamily.mono` already points at it with sane
fallbacks.

## File map

```
components/
  ScrambleText.jsx    text decryption / cipher-reveal effect
  ScrollReveal.jsx     scroll-in wrapper (blur + Y + scale), with ScrollRevealList helper
  ScanField.jsx        input with neon focus state + live fingerprint hash
  AuthScreen.jsx       full login/register form (laser sweep + staggered fields)
  GlitchButton.jsx     primary CTA (HUD corners + glitch slice on hover)
  ScanningIris.jsx     iris/diaphragm loader for async lookups
  TerminalLog.jsx      auto-scrolling pseudo-data log
  ShutterCard.jsx      results panel, vertical shutter clip-path reveal
vindicta.theme.js      tailwind.config.js theme.extend object
```

## Quick example — phone analysis scan screen

```jsx
import { useState } from "react";
import ScanningIris from "./components/ScanningIris";
import TerminalLog from "./components/TerminalLog";
import ShutterCard from "./components/ShutterCard";
import ScrambleText from "./components/ScrambleText";

export default function PhoneScan() {
  const [done, setDone] = useState(false);

  return (
    <div className="flex flex-col items-center gap-8 bg-graphite-950 p-10">
      {!done ? (
        <>
          <ScanningIris label="ANALYZING TARGET" />
          <TerminalLog active />
          <button onClick={() => setDone(true)} className="text-xs text-zinc-500">
            (demo) finish scan
          </button>
        </>
      ) : (
        <ShutterCard title="DOSSIER: +1 (555) 014-2291" badge="CONFIDENCE 92%">
          <ScrambleText text="CARRIER: VERIZON WIRELESS" trigger="mount" className="text-sm text-zinc-200" />
        </ShutterCard>
      )}
    </div>
  );
}
```

## Quick example — auth screen

```jsx
import { useState } from "react";
import AuthScreen from "./components/AuthScreen";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-950">
      <AuthScreen mode={mode} onModeChange={setMode} onSubmit={console.log} />
    </div>
  );
}
```

## Notes

- All components are client components (`"use client"` directive) — fine for
  plain Vite/CRA React too, the directive is a no-op outside Next.js.
- `ScanningIris`'s outer ring rotation runs as a CSS animation (`irisSpin` /
  `irisSpinReverse` from `vindicta.theme.js`) so it stays smooth independent of
  React re-renders; only the pupil contraction is driven by Framer Motion.
- `ScanField`'s live hash is a cosmetic, non-cryptographic churn function —
  it exists purely to sell the "fingerprinting in progress" read, not as a
  real fingerprint.
