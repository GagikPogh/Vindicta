/**
 * tailwind.config.js — theme.extend for Vindicta HUD components
 * -----------------------------------------------------------------------------
 * Merge this into your existing tailwind.config.js. Covers every custom
 * animation referenced by ScanField, GlitchButton, ScanningIris, AuthScreen,
 * ShutterCard, and TerminalLog.
 *
 * Usage:
 *   const vindictaTheme = require('./vindicta.theme.js');
 *   module.exports = {
 *     theme: { extend: { ...vindictaTheme } },
 *     ...
 *   };
 */

module.exports = {
  colors: {
    graphite: {
      950: "#0D0D11",
      900: "#1A1A24",
    },
    vindicta: {
      red: "#FF0033",
      "red-dim": "#3a0008",
    },
  },

  fontFamily: {
    mono: [
      "JetBrains Mono",
      "ui-monospace",
      "SFMono-Regular",
      "Menlo",
      "monospace",
    ],
  },

  keyframes: {
    // GlitchButton — base gradient sliding back and forth, slow ambient pulse
    glitchPulse: {
      "0%, 100%": { backgroundPosition: "0% 50%", filter: "brightness(1)" },
      "50%": { backgroundPosition: "100% 50%", filter: "brightness(1.25)" },
    },

    // GlitchButton — two offset label slices that flash/jitter on hover
    glitchSliceA: {
      "0%, 100%": { transform: "translate(0, 0)", opacity: "0" },
      "20%": { transform: "translate(-2px, -1px)", opacity: "0.8" },
      "40%": { transform: "translate(2px, 1px)", opacity: "0" },
      "60%": { transform: "translate(-1px, 0)", opacity: "0.6" },
      "80%": { transform: "translate(1px, 1px)", opacity: "0" },
    },
    glitchSliceB: {
      "0%, 100%": { transform: "translate(0, 0)", opacity: "0" },
      "25%": { transform: "translate(2px, 1px)", opacity: "0.7" },
      "50%": { transform: "translate(-2px, -1px)", opacity: "0" },
      "75%": { transform: "translate(1px, -1px)", opacity: "0.5" },
    },

    // ScanningIris — outer ring spin (clockwise) and inner ring counter-spin
    irisSpin: {
      "0%": { transform: "rotate(0deg)" },
      "100%": { transform: "rotate(360deg)" },
    },
    irisSpinReverse: {
      "0%": { transform: "rotate(360deg)" },
      "100%": { transform: "rotate(0deg)" },
    },

    // AuthScreen / ScanField — laser scanline sweep top-to-bottom
    laserSweep: {
      "0%": { top: "0%", opacity: "0.9" },
      "100%": { top: "100%", opacity: "0" },
    },

    // generic HUD ambient flicker, available for scanline/noise overlays
    scanlineFlicker: {
      "0%, 100%": { opacity: "0.06" },
      "50%": { opacity: "0.12" },
    },

    // shutter-style clip-path open, available if you want it as a pure CSS
    // alternative to the Framer Motion version used in ShutterCard
    shutterOpen: {
      "0%": { clipPath: "inset(50% 0 50% 0)", opacity: "0" },
      "100%": { clipPath: "inset(0% 0 0% 0)", opacity: "1" },
    },

    // soft pulsing glow, usable on borders/badges elsewhere in the app
    neonPulse: {
      "0%, 100%": {
        boxShadow: "0 0 0px rgba(255,0,51,0.0)",
      },
      "50%": {
        boxShadow: "0 0 18px 2px rgba(255,0,51,0.55)",
      },
    },
  },

  animation: {
    glitchPulse: "glitchPulse 3.2s ease-in-out infinite",
    glitchSliceA: "glitchSliceA 0.6s steps(6) infinite",
    glitchSliceB: "glitchSliceB 0.7s steps(5) infinite",
    irisSpin: "irisSpin 3.5s linear infinite",
    irisSpinReverse: "irisSpinReverse 5s linear infinite",
    laserSweep: "laserSweep 0.9s cubic-bezier(0.65,0,0.35,1) forwards",
    scanlineFlicker: "scanlineFlicker 4s ease-in-out infinite",
    shutterOpen: "shutterOpen 0.55s cubic-bezier(0.83,0,0.17,1) forwards",
    neonPulse: "neonPulse 2.4s ease-in-out infinite",
  },
};
