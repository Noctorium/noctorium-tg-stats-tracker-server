import Script from "next/script"

/** The mini app's pages load Telegram's script first: it gives the page initData and the theme colours. */
export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      {children}
    </>
  )
}
