// Tells Telegram about the deployed bot, once: its webhook, its commands and the menu button that opens the mini app.
// Run with TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET set (`vercel env pull`, or by hand). Prints no secrets.
const token = process.env.TELEGRAM_BOT_TOKEN
const secret = process.env.TELEGRAM_WEBHOOK_SECRET
const app = process.env.APP_URL ?? "https://tgstats.noctorium.xyz"
if (!token || !secret) throw new Error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET first.")

async function call(method, params) {
  const reply = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  })
  const body = await reply.json()
  if (!body.ok) throw new Error(`${method}: ${body.description}`)
  console.log(`setup: ${method} ok`)
  return body.result
}

const me = await call("getMe", {})
await call("setWebhook", {
  url: `${app}/api/telegram`,
  secret_token: secret,
  allowed_updates: ["message", "callback_query", "inline_query"],
  drop_pending_updates: true,
})
await call("setMyCommands", {
  commands: [
    { command: "stats", description: "Your totals and streak" },
    { command: "top", description: "Your top songs and artists" },
    { command: "recent", description: "What you played last" },
    { command: "now", description: "What is playing now" },
    { command: "help", description: "What this bot does" },
  ],
})
await call("setChatMenuButton", { menu_button: { type: "web_app", text: "Stats", web_app: { url: `${app}/app` } } })
await call("setMyDescription", { description: "Your Noctorium listening stats in Telegram: totals, top songs and artists, streaks and what is playing now. Sign in to Noctorium with Telegram first." })
console.log(`setup: done for @${me.username}${me.supports_inline_queries ? "" : " (inline sharing is still off: /setinline in @BotFather)"}`)
