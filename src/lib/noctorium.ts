import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

/** The Noctorium side: who a Telegram user is there, and their figures from the stats service. */

export const ACCOUNT = process.env.ACCOUNT_URL ?? "https://account.noctorium.xyz"
const STATS = process.env.STATS_URL ?? "https://stats.noctorium.xyz"

export type Range = "7d" | "30d" | "90d" | "365d" | "all"
export type Track = { title: string; artist: string; album?: string; url?: string; artworkUrl?: string }

/** The shape of Noctorium-Service's listeningStats (src/lib/stats.ts), as much of it as the bot shows. */
export type Stats = {
  range: Range
  streams: number
  uniqueTracks: number
  artists: number
  hours: number
  firstPlay: string | null
  topTracks: { title: string; artist: string; streams: number; minutes: number }[]
  topArtists: { artist: string; streams: number; minutes: number }[]
  timeline: { bucket: "day" | "month"; points: { start: string; streams: number; minutes: number }[] }
  hourly: { hour: number; streams: number; minutes: number }[]
  weekdays: { day: number; streams: number; minutes: number }[]
  recent: { title: string; artist: string; playedAt: string }[]
  streak: { current: number; longest: number }
}
export type Listening = { stats: Stats; nowPlaying: Track | null; name?: string | null; avatarUrl?: string | null }

let connection: NeonQueryFunction<false, false> | null = null
function db(): NeonQueryFunction<false, false> {
  if (connection) return connection
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set; use the same database as the account server.")
  return (connection = neon(url))
}

/** The Noctorium account this Telegram account signs in to, if any. */
export async function accountOf(telegramId: number): Promise<number | null> {
  const rows = (await db()`
    SELECT user_id FROM identities WHERE provider = 'telegram' AND provider_user_id = ${String(telegramId)} LIMIT 1
  `) as { user_id: string | number }[]
  return rows[0] ? Number(rows[0].user_id) : null
}

/** [user]'s stats over [range] and what they play now, from the stats service's server-to-server route. */
export async function listening(user: number, range: Range, offsetMinutes = 0, limit = 10): Promise<Listening> {
  const secret = process.env.RPC_SECRET
  if (!secret) throw new Error("RPC_SECRET is not set; use the same one as the stats service.")
  const query = new URLSearchParams({ user: String(user), range, tz: String(offsetMinutes), limit: String(limit) })
  const reply = await fetch(`${STATS}/api/internal/stats?${query}`, {
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!reply.ok) throw new Error(`Noctorium stats answered ${reply.status}`)
  return (await reply.json()) as Listening
}
