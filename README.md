# Noctorium Stats for Telegram

What you listen to in Noctorium, in Telegram, at **tgstats.noctorium.xyz**:

- **Chat:** `/stats`, `/top`, `/recent` and `/now`, with buttons for 7 days, 30 days, 90 days, a year or all time
  (`/top 7d`, `/stats year` work too).
- **Mini app:** the full stats page with charts, from the bot's *Stats* button.
- **Inline:** type the bot's @name in any chat to post your top songs, your totals or what is playing now.

It knows you by the Telegram account you sign in to Noctorium with (account.noctorium.xyz). The mini app trusts
only Telegram's signed `initData`. Figures come from the stats service's server-to-server route
(`/api/internal/stats` in Noctorium-Service), so they match stats.noctorium.xyz.

## Running it

Vercel project `noctorium-tg-stats`. Environment:

| Variable | What |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | The stats bot's token from @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Any long random string; Telegram sends it back with every update |
| `DATABASE_URL` | The Noctorium database (Neon), shared with the account server |
| `RPC_SECRET` | The same as the stats service's |

After a deploy, `curl -X POST https://tgstats.noctorium.xyz/api/setup` points the bot at the webhook and sets its
commands and menu button. Turn on inline mode with `/setinline` in @BotFather.

`npm test` checks the initData signature, the commands and the messages.
