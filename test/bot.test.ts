import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { test } from "node:test"
import { miniAppUser } from "../src/lib/telegram.ts"
import { readButton, readCommand, rangeButtons, statsText, topText, nowText } from "../src/lib/messages.ts"
import type { Stats } from "../src/lib/noctorium.ts"

const TOKEN = "123456:test-token"

/** initData as Telegram signs it (core.telegram.org/bots/webapps). */
function signed(fields: Record<string, string>, token = TOKEN): string {
  const check = Object.entries(fields).map(([k, v]) => `${k}=${v}`).sort().join("\n")
  const key = createHmac("sha256", "WebAppData").update(token).digest()
  const hash = createHmac("sha256", key).update(check).digest("hex")
  return new URLSearchParams({ ...fields, hash }).toString()
}

test("the mini app trusts only initData Telegram signed for this bot, under a day old", () => {
  const now = 1_800_000_000_000
  const fields = { auth_date: String(now / 1000 - 60), query_id: "AAE", user: JSON.stringify({ id: 4242, first_name: "Yabo" }) }
  assert.equal(miniAppUser(signed(fields), TOKEN, now), 4242)
  assert.equal(miniAppUser(signed(fields, "999:another-bot"), TOKEN, now), null, "another bot's signature passed")
  const changed = new URLSearchParams(signed(fields))
  changed.set("user", JSON.stringify({ id: 1, first_name: "Someone else" }))
  assert.equal(miniAppUser(changed.toString(), TOKEN, now), null, "a changed user passed")
  assert.equal(miniAppUser(signed({ ...fields, auth_date: String(now / 1000 - 2 * 86400) }), TOKEN, now), null, "old initData passed")
  assert.equal(miniAppUser("", TOKEN, now), null)
})

test("commands and their ranges are read in the ways people type them", () => {
  assert.deepEqual(readCommand("/stats"), { command: "stats", range: "30d" })
  assert.deepEqual(readCommand("/top@NoctoriumStatsBot 7d"), { command: "top", range: "7d" })
  assert.deepEqual(readCommand("/stats year"), { command: "stats", range: "365d" })
  assert.deepEqual(readCommand("/stats All"), { command: "stats", range: "all" })
  assert.deepEqual(readCommand("/help"), { command: "start", range: "30d" })
  assert.equal(readCommand("/unknown"), null)
  assert.equal(readCommand("hello"), null)
  assert.deepEqual(readButton("top:90d"), { command: "top", range: "90d" })
  assert.equal(readButton("top:5y"), null)
  assert.equal(readButton("delete:7d"), null)
  assert.equal(rangeButtons("now", "7d"), undefined)
  assert.equal(rangeButtons("stats", "7d")?.inline_keyboard[0].length, 5)
})

const stats: Stats = {
  range: "7d",
  streams: 1234,
  uniqueTracks: 300,
  artists: 80,
  hours: 61.26,
  firstPlay: "2026-01-01",
  topTracks: [{ title: "Song <1>", artist: "A & B", streams: 40, minutes: 120 }],
  topArtists: [{ artist: "A & B", streams: 90, minutes: 300 }],
  timeline: { bucket: "day", points: [] },
  hourly: [],
  weekdays: [],
  recent: [],
  streak: { current: 5, longest: 12 },
}

test("messages show the figures, with song names escaped for Telegram HTML", () => {
  const text = statsText(stats)
  assert.match(text, /7 days/)
  assert.match(text, /1,234 streams · 61\.3 hours/)
  assert.match(text, /5-day streak \(longest 12\)/)
  assert.match(text, /Song &lt;1&gt;<\/b> — A &amp; B/)
  assert.match(topText(stats), /1\. <b>Song &lt;1&gt;<\/b> — A &amp; B · 40×/)
  assert.match(statsText({ ...stats, streams: 0 }), /Nothing played/)
  assert.match(nowText(null), /Nothing is playing/)
  assert.match(nowText({ title: "X", artist: "Y", album: "Z" }), /<b>X<\/b> — Y\n💿 Z/)
})
