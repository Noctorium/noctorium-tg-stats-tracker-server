import type { Listening, Range, Stats, Track } from "./noctorium.ts"

/** What the bot says, as Telegram HTML, and the commands and buttons it understands. Pure, so it is tested. */

export type Command = "stats" | "top" | "recent" | "now"
export const COMMANDS: Command[] = ["stats", "top", "recent", "now"]
export const RANGES: Range[] = ["7d", "30d", "90d", "365d", "all"]
const RANGE_NAMES: Record<Range, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days", "365d": "Year", all: "All time" }
// Short, so five fit on one row on a phone.
const BUTTON_NAMES: Record<Range, string> = { "7d": "7d", "30d": "30d", "90d": "90d", "365d": "1y", all: "All" }
const RANGE_WORDS: Record<string, Range> = { year: "365d", "1y": "365d", "365": "365d", alltime: "all", "7": "7d", "30": "30d", "90": "90d" }

export const DEFAULT_RANGE: Range = "30d"

export function readRange(word: string | undefined): Range {
  const w = (word ?? "").toLowerCase().replace(/[\s_-]/g, "")
  return RANGES.includes(w as Range) ? (w as Range) : RANGE_WORDS[w] ?? DEFAULT_RANGE
}

/** "/stats 7d", "/top@SomeBot year", "/start" … → what was asked, or null for anything else. */
export function readCommand(text: string | undefined): { command: Command | "start"; range: Range } | null {
  const match = /^\/([a-z]+)(?:@\w+)?(?:\s+(\S+))?/i.exec((text ?? "").trim())
  if (!match) return null
  const name = match[1].toLowerCase()
  const command = name === "help" ? "start" : name
  if (command !== "start" && !COMMANDS.includes(command as Command)) return null
  return { command: command as Command | "start", range: readRange(match[2]) }
}

/** A range button's data, "top:7d", read back. */
export function readButton(data: string | undefined): { command: Command; range: Range } | null {
  const [command, range] = (data ?? "").split(":")
  return COMMANDS.includes(command as Command) && RANGES.includes(range as Range) ? { command: command as Command, range: range as Range } : null
}

export const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const n = (x: number) => x.toLocaleString("en-US")
const song = (t: { title: string; artist: string }) => `<b>${escape(t.title)}</b>${t.artist ? ` — ${escape(t.artist)}` : ""}`

export function statsText(s: Stats): string {
  if (!s.streams) return `<b>Your stats · ${RANGE_NAMES[s.range]}</b>\n\nNothing played in this time yet.`
  return [
    `<b>Your stats · ${RANGE_NAMES[s.range]}</b>`,
    "",
    `🎧 ${n(s.streams)} streams · ${n(Math.round(s.hours * 10) / 10)} hours`,
    `🎵 ${n(s.uniqueTracks)} songs · 🎤 ${n(s.artists)} artists`,
    `🔥 ${n(s.streak.current)}-day streak (longest ${n(s.streak.longest)})`,
    ...(s.topTracks[0] ? ["", `Top song: ${song(s.topTracks[0])}`] : []),
    ...(s.topArtists[0] ? [`Top artist: <b>${escape(s.topArtists[0].artist)}</b>`] : []),
  ].join("\n")
}

export function topText(s: Stats): string {
  if (!s.streams) return `<b>Your top · ${RANGE_NAMES[s.range]}</b>\n\nNothing played in this time yet.`
  return [
    `<b>Top songs · ${RANGE_NAMES[s.range]}</b>`,
    ...s.topTracks.slice(0, 10).map((t, i) => `${i + 1}. ${song(t)} · ${n(t.streams)}×`),
    "",
    `<b>Top artists</b>`,
    ...s.topArtists.slice(0, 10).map((a, i) => `${i + 1}. <b>${escape(a.artist)}</b> · ${n(a.streams)}×`),
  ].join("\n")
}

export function recentText(s: Stats): string {
  if (!s.recent.length) return "<b>Recently played</b>\n\nNothing yet."
  return ["<b>Recently played</b>", ...s.recent.slice(0, 10).map((t) => `• ${song(t)}`)].join("\n")
}

export function nowText(track: Track | null): string {
  if (!track) return "Nothing is playing in Noctorium right now."
  return [`<b>Now playing</b>`, `🎶 ${song(track)}`, ...(track.album ? [`💿 ${escape(track.album)}`] : [])].join("\n")
}

export function textFor(command: Command, listening: Listening): string {
  if (command === "now") return nowText(listening.nowPlaying)
  if (command === "top") return topText(listening.stats)
  if (command === "recent") return recentText(listening.stats)
  return statsText(listening.stats)
}

/** The range buttons under a message, the current one marked. /now and /recent have no range. */
export function rangeButtons(command: Command, current: Range) {
  if (command === "now" || command === "recent") return undefined
  return {
    inline_keyboard: [RANGES.map((r) => ({ text: r === current ? `• ${BUTTON_NAMES[r]} •` : BUTTON_NAMES[r], callback_data: `${command}:${r}` }))],
  }
}

export const WELCOME = [
  "<b>Noctorium Stats</b>",
  "",
  "What you listen to in Noctorium, here in Telegram:",
  "/stats — your totals and streak",
  "/top — your top songs and artists",
  "/recent — what you played last",
  "/now — what is playing now",
  "",
  "Add a range, like <code>/top 7d</code> or <code>/stats year</code>, or use the buttons. Open the app for charts, and type my @name in any chat to share your stats there.",
].join("\n")

export const NOT_LINKED =
  "This Telegram account is not linked to a Noctorium account yet. Sign in with Telegram on your Noctorium account page (or add Telegram to the account you have), then ask again."
