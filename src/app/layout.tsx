import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "Noctorium Stats for Telegram",
  description: "What you listen to in Noctorium, in Telegram: a bot and a mini app.",
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 }

// Telegram's own colours inside the mini app (it sets the --tg-theme-* variables); Noctorium's dark ones elsewhere.
const css = `
:root {
  --bg: var(--tg-theme-bg-color, #0b0a10); --card: var(--tg-theme-secondary-bg-color, #17151f);
  --text: var(--tg-theme-text-color, #f2eeff); --muted: var(--tg-theme-hint-color, #a39db5);
  --accent: var(--tg-theme-button-color, #b47cff); --on-accent: var(--tg-theme-button-text-color, #0b0a10);
  --link: var(--tg-theme-link-color, #b47cff);
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.5 Inter, system-ui, -apple-system, sans-serif; }
main { max-width: 560px; margin: 0 auto; padding: 16px; }
h1 { font-size: 22px; margin: 4px 0 12px; letter-spacing: -0.01em; }
h2 { font-size: 15px; margin: 20px 0 8px; }
p, .muted { color: var(--muted); }
a { color: var(--link); }
.tabs { display: flex; gap: 6px; overflow-x: auto; }
.tabs button { flex: 1; padding: 8px 0; border: 0; border-radius: 10px; background: var(--card); color: var(--text); font: inherit; cursor: pointer; }
.tabs button[aria-pressed="true"] { background: var(--accent); color: var(--on-accent); font-weight: 600; }
.tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 12px; }
.tile { background: var(--card); border-radius: 12px; padding: 10px 12px; }
.tile b { display: block; font-size: 20px; }
.tile span { color: var(--muted); font-size: 13px; }
.card { background: var(--card); border-radius: 12px; padding: 12px; }
.bars { display: flex; align-items: flex-end; gap: 2px; height: 96px; }
.bars div { flex: 1; background: var(--accent); border-radius: 3px 3px 0 0; min-height: 1px; }
.axis { display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; margin-top: 4px; }
ol { margin: 0; padding-left: 22px; }
li { padding: 3px 0; }
li small { color: var(--muted); }
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <style>{css}</style>
        {children}
      </body>
    </html>
  )
}
