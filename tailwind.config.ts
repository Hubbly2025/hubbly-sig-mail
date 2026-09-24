import type { Config } from "tailwindcss";

// Hubbly design tokens. Values live as CSS variables in app/globals.css.
const v = (name: string) => `var(--${name})`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        sidebar: v("sidebar"),
        line: v("border"),
        divider: v("divider"),
        head: v("table-head"),
        control: v("control-border"),
        ink: { DEFAULT: v("ink"), 2: v("ink-2") },
        muted: v("muted"),
        label: v("label"),
        active: v("active"),
        track: v("track"),
        accent: {
          DEFAULT: v("accent"),
          hover: v("accent-hover"),
          soft: v("accent-soft"),
          soft2: v("accent-soft-2"),
          ink: v("accent-ink"),
          line: v("accent-line"),
        },
        success: { DEFAULT: v("success"), bg: v("success-bg"), dot: v("success-dot") },
        warn: { DEFAULT: v("warn"), bg: v("warn-bg"), line: v("warn-border"), dot: v("warn-dot") },
        danger: { DEFAULT: v("danger"), bg: v("danger-bg") },
        chip: { DEFAULT: v("neutral-chip"), ink: v("neutral-chip-ink") },
        tag: v("tag"),
      },
      fontFamily: {
        sans: ["var(--font-ui)", "sans-serif"],
        mono: ["var(--font-code)", "monospace"],
      },
      fontSize: {
        meta: ["12.5px", { lineHeight: "1.45" }],
      },
      borderRadius: {
        card: "14px",
        control: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
