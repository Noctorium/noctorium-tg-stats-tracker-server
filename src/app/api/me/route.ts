import { accountOf, listening } from "@/lib/noctorium"
import { readRange } from "@/lib/messages"
import { miniAppUser } from "@/lib/telegram"

export const runtime = "nodejs"

/** The mini app's figures: it sends Telegram's signed initData, and gets the stats of the user it names. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { initData?: unknown; range?: unknown; tz?: unknown }
  const telegramId = typeof body.initData === "string" ? miniAppUser(body.initData) : null
  if (!telegramId) return Response.json({ error: "Open this from the Noctorium Stats bot in Telegram." }, { status: 401 })
  const user = await accountOf(telegramId)
  if (!user) return Response.json({ error: "not-linked" }, { status: 404 })
  const tz = typeof body.tz === "number" && Number.isFinite(body.tz) ? Math.round(body.tz) : 0
  const range = readRange(typeof body.range === "string" ? body.range : undefined)
  return Response.json(await listening(user, range, tz, 20))
}
