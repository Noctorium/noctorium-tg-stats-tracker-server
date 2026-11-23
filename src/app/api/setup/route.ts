import { bot } from "@/lib/telegram"

export const runtime = "nodejs"

const APP = process.env.APP_URL ?? "https://tgstats.noctorium.xyz"

/**
 * Tells Telegram about this deployment: its webhook, commands and the menu button that opens the mini app. Run once
 * after a deploy (POST). It takes no input and only ever points the bot at this server with its own secret, so it
 * is harmless for anyone to call; the token and secret stay on the server, where Vercel keeps them unreadable.
 */
export async function POST() {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) return Response.json({ error: "TELEGRAM_WEBHOOK_SECRET is not set." }, { status: 500 })
  const me = (await bot("getMe", {})) as { username: string; supports_inline_queries?: boolean }
  await bot("setWebhook", { url: `${APP}/api/telegram`, secret_token: secret, allowed_updates: ["message", "callback_query", "inline_query"] })
  await bot("setMyCommands", {
    commands: [
      { command: "stats", description: "Your totals and streak" },
      { command: "top", description: "Your top songs and artists" },
      { command: "recent", description: "What you played last" },
      { command: "now", description: "What is playing now" },
      { command: "help", description: "What this bot does" },
    ],
  })
  await bot("setChatMenuButton", { menu_button: { type: "web_app", text: "Stats", web_app: { url: `${APP}/app` } } })
  await bot("setMyDescription", {
    description: "Your Noctorium listening stats in Telegram: totals, top songs and artists, streaks and what is playing now. Sign in to Noctorium with Telegram first.",
  })
  return Response.json({ bot: me.username, inline: Boolean(me.supports_inline_queries) })
}
