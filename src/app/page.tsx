const BOT = process.env.NEXT_PUBLIC_BOT_USERNAME

export default function Home() {
  return (
    <main>
      <h1>Noctorium Stats for Telegram</h1>
      <p>
        What you listen to in Noctorium — your totals, top songs and artists, streaks and what is playing now — in a
        Telegram bot and its mini app. Sign in to Noctorium with Telegram first, at{" "}
        <a href="https://account.noctorium.xyz">account.noctorium.xyz</a>.
      </p>
      {BOT ? <p><a href={`https://t.me/${BOT}`}>Open @{BOT} in Telegram</a></p> : null}
    </main>
  )
}
