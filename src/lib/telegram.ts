import { createHmac, timingSafeEqual } from "node:crypto"

/** Telegram's Bot API, and the two ways Telegram proves a request is really from it. */

function token(): string {
  // Trimmed: a token pasted into Vercel easily brings a space or line break with it.
  const value = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!value) throw new Error("TELEGRAM_BOT_TOKEN is not set (the stats bot's token from @BotFather).")
  return value
}

/** One Bot API call. Throws with Telegram's own description when it says no. */
export async function bot(method: string, params: Record<string, unknown>, seconds = 15): Promise<unknown> {
  const reply = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(seconds * 1000),
  }).catch((error: Error) => {
    throw new Error(`Telegram ${method}: ${error.message}`)
  })
  const body = (await reply.json().catch(() => ({}))) as { ok?: boolean; result?: unknown; description?: string }
  if (!body.ok) throw new Error(`Telegram ${method}: ${body.description ?? reply.status}`)
  return body.result
}

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** The webhook's secret-token header, which setWebhook told Telegram to send. */
export function fromTelegram(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET is not set.")
  return same(request.headers.get("x-telegram-bot-api-secret-token") ?? "", secret)
}

const DAY_SECONDS = 24 * 60 * 60

/**
 * The Telegram user a mini app's initData names, if Telegram signed it with this bot's token and it is under a day
 * old (core.telegram.org/bots/webapps, "Validating data received via the Mini App"); otherwise null.
 */
export function miniAppUser(initData: string, botToken: string = token(), now = Date.now()): number | null {
  const params = new URLSearchParams(initData)
  const hash = params.get("hash")
  if (!hash) return null
  params.delete("hash")
  const check = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n")
  const key = createHmac("sha256", "WebAppData").update(botToken).digest()
  if (!same(createHmac("sha256", key).update(check).digest("hex"), hash)) return null
  const signedAt = Number(params.get("auth_date"))
  if (!Number.isFinite(signedAt) || now / 1000 - signedAt > DAY_SECONDS) return null
  try {
    const id = JSON.parse(params.get("user") ?? "null")?.id
    return Number.isSafeInteger(id) && id > 0 ? id : null
  } catch {
    return null
  }
}
