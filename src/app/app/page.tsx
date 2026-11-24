"use client"

import { useEffect, useState } from "react"
import type { Listening, Range } from "@/lib/noctorium"

type WebApp = { initData: string; ready(): void; expand(): void; openLink(url: string): void }
const webApp = () => (globalThis as { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp

const RANGES: [Range, string][] = [["7d", "7d"], ["30d", "30d"], ["90d", "90d"], ["365d", "1y"], ["all", "All"]]
// ISO weekdays, as the stats service counts them: 1 is Monday, 7 is Sunday.
const WEEKDAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const n = (x: number) => x.toLocaleString()

/** The mini app: the stats page, for whoever opened it from the bot. */
export default function MiniApp() {
  const [range, setRange] = useState<Range>("30d")
  const [data, setData] = useState<Listening | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    const app = webApp()
    app?.ready()
    app?.expand()
  }, [])

  useEffect(() => {
    const initData = webApp()?.initData
    if (!initData) return setProblem("Open this from the Noctorium Stats bot in Telegram.")
    let current = true
    setProblem(null)
    fetch("/api/me", {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Minutes east of UTC, so days and hours are on the listener's own clock.
      body: JSON.stringify({ initData, range, tz: -new Date().getTimezoneOffset() }),
    })
      .then(async (reply) => {
        const body = await reply.json()
        if (!current) return
        if (reply.ok) setData(body)
        else setProblem(body.error === "not-linked" ? "not-linked" : body.error ?? "Something went wrong.")
      })
      .catch(() => current && setProblem("Could not reach Noctorium. Try again in a moment."))
    return () => {
      current = false
    }
  }, [range])

  if (problem === "not-linked") {
    return (
      <main>
        <h1>Noctorium Stats</h1>
        <p>This Telegram account is not linked to a Noctorium account yet. Sign in with Telegram on your account page, or add Telegram to the account you have, then open this again.</p>
        <p><a href="https://account.noctorium.xyz/dashboard" onClick={(e) => { const app = webApp(); if (app) { e.preventDefault(); app.openLink("https://account.noctorium.xyz/dashboard") } }}>Open account.noctorium.xyz</a></p>
      </main>
    )
  }

  const s = data?.stats
  return (
    <main>
      <h1 className="who">
        {data?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="avatar" src={data.avatarUrl} width={36} height={36} alt="" />
        ) : data?.name ? (
          <span className="avatar" aria-hidden>{(data.name.trim()[0] ?? "?").toUpperCase()}</span>
        ) : null}
        {data?.name ?? "Noctorium Stats"}
      </h1>
      <div className="tabs" role="group" aria-label="Time range">
        {RANGES.map(([value, label]) => (
          <button key={value} aria-pressed={value === range} onClick={() => setRange(value)}>{label}</button>
        ))}
      </div>
      {problem ? <p>{problem}</p> : !s ? <p>Loading…</p> : (
        <>
          {data.nowPlaying ? (
            <div className="card" style={{ marginTop: 12 }}>
              <span className="muted">Now playing</span>
              <div><b>{data.nowPlaying.title}</b>{data.nowPlaying.artist ? ` — ${data.nowPlaying.artist}` : ""}</div>
            </div>
          ) : null}
          <div className="tiles">
            <Tile value={n(s.streams)} label="streams" />
            <Tile value={n(Math.round(s.hours * 10) / 10)} label="hours" />
            <Tile value={n(s.uniqueTracks)} label="songs" />
            <Tile value={n(s.artists)} label="artists" />
            <Tile value={`${s.streak.current} days`} label="streak now" />
            <Tile value={`${s.streak.longest} days`} label="longest streak" />
          </div>
          {s.streams ? (
            <>
              <h2>Over time</h2>
              <Bars values={s.timeline.points.map((p) => p.minutes)} labels={[s.timeline.points[0]?.start ?? "", s.timeline.points.at(-1)?.start ?? ""]} name="Minutes per period" />
              <h2>By hour</h2>
              <Bars values={s.hourly.map((h) => h.minutes)} labels={["0:00", "12:00", "23:00"]} name="Minutes by hour of day" />
              <h2>By weekday</h2>
              <Bars values={s.weekdays.map((d) => d.minutes)} labels={s.weekdays.map((d) => WEEKDAYS[d.day] ?? "")} name="Minutes by weekday" />
              <h2>Top songs</h2>
              <div className="card"><ol>{s.topTracks.map((t, i) => <li key={i}><b>{t.title}</b> <small>{t.artist} · {n(t.streams)}×</small></li>)}</ol></div>
              <h2>Top artists</h2>
              <div className="card"><ol>{s.topArtists.map((a, i) => <li key={i}><b>{a.artist}</b> <small>{n(a.streams)}×</small></li>)}</ol></div>
              <h2>Recently played</h2>
              <div className="card"><ol>{s.recent.map((t, i) => <li key={i}><b>{t.title}</b> <small>{t.artist}</small></li>)}</ol></div>
            </>
          ) : <p>Nothing played in this time yet.</p>}
        </>
      )}
    </main>
  )
}

function Tile({ value, label }: { value: string; label: string }) {
  return <div className="tile"><b>{value}</b><span>{label}</span></div>
}

function Bars({ values, labels, name }: { values: number[]; labels: string[]; name: string }) {
  const top = Math.max(1, ...values)
  return (
    <div className="card" role="img" aria-label={name}>
      <div className="bars">{values.map((v, i) => <div key={i} style={{ height: `${(v / top) * 100}%` }} title={`${Math.round(v)} min`} />)}</div>
      <div className="axis">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>
    </div>
  )
}
