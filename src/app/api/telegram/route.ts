import { bot, fromTelegram } from "@/lib/telegram"
import { ACCOUNT, accountOf, listening } from "@/lib/noctorium"
import { DEFAULT_RANGE, NOT_LINKED, WELCOME, rangeButtons, readButton, readCommand, statsText, textFor, nowText, topText } from "@/lib/messages"

export const runtime = "nodejs"

const APP = process.env.APP_URL ?? "https://tgstats.noctorium.xyz"
const openApp = { text: "📊 Open stats", web_app: { url: `${APP}/app` } }
const linkAccount = { text: "Link Noctorium", url: `${ACCOUNT}/dashboard` }

type From = { id: number }
type Update = {
  message?: { chat: { id: number; type: string }; from?: From; text?: string }
  callback_query?: { id: string; from: From; data?: string; message?: { chat: { id: number }; message_id: number } }
  inline_query?: { id: string; from: From }
}

/**
 * The bot's webhook. Every update is answered with 200 even when something fails (and logged), so Telegram does
 * not keep sending the same one again.
 */
export async function POST(request: Request) {
  if (!fromTelegram(request)) return new Response("Not Telegram.", { status: 401 })
  const update = (await request.json().catch(() => ({}))) as Update
  try {
    if (update.message) await onMessage(update.message)
    else if (update.callback_query) await onButton(update.callback_query)
    else if (update.inline_query) await onInline(update.inline_query)
  } catch (error) {
    console.error("Noctorium Stats bot:", error)
  }
  return new Response(null, { status: 200 })
}

async function onMessage(message: NonNullable<Update["message"]>) {
  const asked = readCommand(message.text)
  // In groups only its own commands get an answer; in its chat anything else gets the help.
  if (!asked && message.chat.type !== "private") return
  const chat_id = message.chat.id
  const user = message.from ? await accountOf(message.from.id) : null
  // Mini app buttons only work in a private chat.
  const appRow = message.chat.type === "private" ? [openApp] : []

  if (!asked || asked.command === "start") {
    const buttons = user ? [appRow] : [[linkAccount]]
    return bot("sendMessage", { chat_id, text: WELCOME + (user ? "" : `\n\n${NOT_LINKED}`), parse_mode: "HTML", reply_markup: { inline_keyboard: buttons.filter((r) => r.length) } })
  }
  if (!user) return bot("sendMessage", { chat_id, text: NOT_LINKED, reply_markup: { inline_keyboard: [[linkAccount]] } })
  const data = await listening(user, asked.range)
  return bot("sendMessage", { chat_id, text: textFor(asked.command, data), parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: rangeButtons(asked.command, asked.range) })
}

async function onButton(query: NonNullable<Update["callback_query"]>) {
  const asked = readButton(query.data)
  const user = await accountOf(query.from.id)
  if (!asked || !user || !query.message) {
    return bot("answerCallbackQuery", { callback_query_id: query.id, text: user ? "That button is too old." : NOT_LINKED.split(".")[0] + "." })
  }
  const data = await listening(user, asked.range)
  await bot("editMessageText", {
    chat_id: query.message.chat.id,
    message_id: query.message.message_id,
    text: textFor(asked.command, data),
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: rangeButtons(asked.command, asked.range),
  }).catch((error: Error) => {
    // Pressing the range already shown changes nothing, which Telegram reports as an error.
    if (!/not modified/i.test(error.message)) throw error
  })
  return bot("answerCallbackQuery", { callback_query_id: query.id })
}

/** @thebot in any chat: cards of the asker's own stats, which they choose to post. */
async function onInline(query: NonNullable<Update["inline_query"]>) {
  const user = await accountOf(query.from.id)
  if (!user) {
    return bot("answerInlineQuery", { inline_query_id: query.id, results: [], cache_time: 10, is_personal: true, button: { text: "Link your Noctorium account first", start_parameter: "link" } })
  }
  const data = await listening(user, DEFAULT_RANGE)
  const card = (id: string, title: string, description: string, text: string) => ({
    type: "article",
    id,
    title,
    description,
    input_message_content: { message_text: text, parse_mode: "HTML", link_preview_options: { is_disabled: true } },
  })
  const playing = data.nowPlaying
  const results = [
    ...(playing ? [card("now", "Now playing", `${playing.title}${playing.artist ? ` — ${playing.artist}` : ""}`, nowText(playing))] : []),
    card("top", "My top songs", "Last 30 days", topText(data.stats)),
    card("stats", "My stats", `${data.stats.streams} streams · ${Math.round(data.stats.hours)} hours, last 30 days`, statsText(data.stats)),
  ]
  return bot("answerInlineQuery", { inline_query_id: query.id, results, cache_time: 10, is_personal: true })
}
