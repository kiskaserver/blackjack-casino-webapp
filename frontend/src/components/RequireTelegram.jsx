"use client"

import { useEffect, useMemo, useState } from "react"
import { useTelegram } from "../providers/TelegramProvider.jsx"

const CTA_DEFAULT_USERNAME = "BlackjackCasinoBot"

const resolveBotUsername = () =>
  import.meta.env.VITE_TELEGRAM_BOT_USERNAME?.replace(/^@/, "") || CTA_DEFAULT_USERNAME

const buildTelegramLink = () => {
  const explicitUrl = import.meta.env.VITE_TELEGRAM_BOT_URL
  if (explicitUrl) {
    return explicitUrl
  }
  const username = resolveBotUsername()
  const startParam = import.meta.env.VITE_TELEGRAM_START_PARAM?.trim()
  if (startParam) {
    return `https://t.me/${username}?startapp=${encodeURIComponent(startParam)}`
  }
  return `https://t.me/${username}`
}

export const RequireTelegram = ({ children }) => {
  const { initData, setInitData } = useTelegram()
  const [manualValue, setManualValue] = useState("")
  const [error, setError] = useState("")
  const [copyMessage, setCopyMessage] = useState("")
  const [rawTelegramInitData, setRawTelegramInitData] = useState(() => {
    if (typeof window === "undefined") {
      return ""
    }
    return window.Telegram?.WebApp?.initData || ""
  })

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const str = window.Telegram?.WebApp?.initData || ""
    setRawTelegramInitData(str)
  }, [initData])

  const botLink = useMemo(() => buildTelegramLink(), [])
  const botUsername = useMemo(() => resolveBotUsername(), [])
  const allowManualInit = import.meta.env.MODE !== "production"

  const deviceGuides = useMemo(
    () => [
      {
        title: "Telegram на телефоне",
        icon: "📱",
        steps: [
          "Откройте Telegram и нажмите на поиск",
          `Введите @${botUsername} или тапните по кнопке ниже`,
          "Нажмите «Открыть мини-приложение» и авторизуйтесь",
        ],
      },
      {
        title: "Telegram на компьютере",
        icon: "🖥️",
        steps: [
          "Запустите Telegram Desktop или Web.telegram.org",
          `Перейдите в чат с @${botUsername} и нажмите кнопку «Open»`,
          "Запуск возможен только внутри Telegram, браузер служит для ознакомления",
        ],
      },
    ],
    [botUsername],
  )

  const faqItems = useMemo(
    () => [
      {
        title: "Почему вижу эту страницу?",
        text: "Мини-приложение работает только внутри Telegram WebApp. Мы автоматически определяем, что вы зашли из браузера, и подсказываем, как открыть правильный вход.",
      },
      {
        title: "Что будет после перехода?",
        text: "Вы попадёте в чат с ботом Blackjack Casino, где доступно два режима: демо и реальный. Балансы синхронизированы с вашим Telegram-аккаунтом.",
      },
      {
        title: "Безопасно ли это?",
        text: "Все платежи проходят через защищённые провайдеры (Cryptomus, Telegram Stars). Мы используем антифрод и KYC-проверки для безопасности игроков.",
      },
      {
        title: "Можно ли играть с ПК?",
        text: "Да. Достаточно открыть Telegram Desktop и запустить мини-приложение по кнопке вверху чата. Сам браузер использовать нельзя, потому что WebApp требует Telegram окружение.",
      },
    ],
    [],
  )

  if (initData) {
    return children
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!manualValue.trim()) {
      setError("Вставьте строку initData из Telegram Web App")
      return
    }
    setError("")
    setInitData(manualValue.trim())
  }

  const handleOpenTelegram = () => {
    if (typeof window !== "undefined") {
      window.open(botLink, "_blank", "noopener,noreferrer")
    }
  }

  const handleCopyLink = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyMessage("Скопируйте ссылку вручную: " + botLink)
      return
    }
    try {
      await navigator.clipboard.writeText(botLink)
      setCopyMessage("Ссылка скопирована 👌")
      setTimeout(() => setCopyMessage(""), 2500)
    } catch (copyError) {
      console.error("Не удалось скопировать ссылку в буфер обмена", copyError)
      setCopyMessage("Не удалось скопировать автоматически, используйте правый клик")
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 10% 20%, rgba(0, 198, 255, 0.14), transparent 55%), radial-gradient(circle at 70% 20%, rgba(99, 102, 241, 0.18), transparent 60%), radial-gradient(circle at 40% 75%, rgba(14, 116, 144, 0.18), transparent 62%)",
        }}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/90">
              Blackjack Casino
            </span>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
              Blackjack Mini App внутри Telegram
            </h1>
            <p className="max-w-xl text-lg text-slate-300">
              Если вы видите эту страницу в браузере, значит приложение запущено вне Telegram. Перейдите по кнопке ниже или найдите бота
              {" "}
              <span className="text-cyan-300 font-semibold">@{botUsername}</span>, чтобы открыть официальный WebApp и продолжить игру.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className="primary w-full sm:w-auto"
                onClick={handleOpenTelegram}
              >
                🚀 Открыть в Telegram
              </button>
              <a
                href={botLink}
                target="_blank"
                rel="noopener noreferrer"
                className="secondary w-full justify-center sm:w-auto"
              >
                💬 Открыть диалог с ботом
              </a>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {["🎯 Честный RTP и проверяемые раунды", "⚡ Пополнения и выводы за минуты", "📊 Живые таблицы лидеров", "🔐 Полная безопасность и KYC"].map((feature) => (
                <li key={feature} className="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
                  <span aria-hidden className="text-lg leading-none">✨</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-12 rounded-full bg-cyan-500/20 blur-3xl" aria-hidden />
            <div className="relative w-full max-w-md rounded-3xl border border-cyan-400/30 bg-slate-950/80 p-6 shadow-[0_25px_60px_rgba(15,23,42,0.6)]">
              <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
                <span>Blackjack Mini App</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  ● Онлайн
                </span>
              </div>
              <div className="rounded-2xl border border-cyan-400/20 bg-slate-900/80 p-4">
                <p className="text-lg font-semibold text-white">«Дилер показывает 6 — шансы на вашей стороне»</p>
                <p className="mt-2 text-sm text-slate-300">
                  Поднимайте ставки, активируйте демо режим или переходите на реальные средства. Все раунды зашифрованы и проверяемы.
                </p>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm">
                  <span className="text-slate-300">Средний RTP</span>
                  <span className="text-emerald-400 font-semibold">99.3%</span>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm">
                  <span className="text-slate-300">Выплат за 24 часа</span>
                  <span className="text-cyan-300 font-semibold">427</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-3xl border border-cyan-500/10 bg-slate-950/70 p-6 sm:grid-cols-2">
          {deviceGuides.map(({ title, icon, steps }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
              <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                <span className="text-xl">{icon}</span>
                <span>{title}</span>
              </div>
              <ol className="mt-4 space-y-3 text-sm text-slate-200">
                {steps.map((step, index) => (
                  <li key={`${title}-${index}`} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-bold text-cyan-200">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>

        <section className="grid gap-6 rounded-3xl border border-white/5 bg-slate-900/70 p-6 sm:grid-cols-3">
          {[
            { title: "Прозрачность", description: "Каждый раунд имеет уникальный seed и детальную историю ставок." },
            { title: "Платежи", description: "Cryptomus, Telegram Stars и ручные выплаты c подтверждением KYC." },
            { title: "Поддержка", description: "Живой саппорт прямо в чате, автоуведомления и антифрод-мониторинг." },
          ].map(({ title, description }) => (
            <div key={title} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm text-slate-300">{description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-cyan-500/15 bg-slate-950/80 p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold text-white">🎲 Демо и реальный баланс</h2>
              <p className="mt-2 text-slate-300">
                При запуске внутри Telegram вы увидите два кошелька: демо для бесплатной практики и реальный для игры на средства. Статистика,
                достижения и история ставок синхронизируются с вашим аккаунтом и доступны в панели «Статистика».
              </p>
              <p className="mt-2 text-sm text-slate-400">
                С браузера эти данные скрыты — чтобы защитить аккаунт. Поэтому важно открыть мини-приложение по безопасной ссылке из Telegram.
              </p>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <button type="button" className="primary w-full" onClick={handleOpenTelegram}>
                🚀 Открыть @{botUsername} в Telegram
              </button>
              <button type="button" className="secondary w-full justify-center" onClick={handleCopyLink}>
                🔗 Скопировать ссылку
              </button>
              {copyMessage && <span className="text-center text-xs text-cyan-200">{copyMessage}</span>}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">FAQ</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Почему мы перенаправляем из браузера</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {faqItems.map(({ title, text }) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-slate-300">{text}</p>
              </article>
            ))}
          </div>
        </section>

        {allowManualInit && (
          <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
            <h2 className="text-lg font-semibold text-white">🔧 Режим отладки</h2>
            <p className="mt-1 text-sm text-slate-400">
              Вы находитесь в режиме разработки. Можно вручную вставить initData, чтобы протестировать WebApp без Telegram.
            </p>

            <details className="mt-4 group">
              <summary className="cursor-pointer font-semibold text-slate-200 transition-colors hover:text-white">
                ℹ️ Переменная Telegram.WebApp.initData
              </summary>
              <div className="mt-3 rounded-lg bg-slate-900/70 p-3">
                <p className="text-xs font-mono text-slate-400 mb-2">window.Telegram.WebApp.initData:</p>
                <pre className="text-xs bg-slate-950/80 p-3 rounded overflow-x-auto text-slate-300 wrap-break-word whitespace-pre-wrap">
                  {rawTelegramInitData || "(пусто)"}
                </pre>
              </div>
            </details>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">initData</label>
                <textarea
                  value={manualValue}
                  onChange={(event) => setManualValue(event.target.value)}
                  rows={5}
                  placeholder="query_id=...&user=..."
                  className="w-full"
                />
              </div>
              {error && <div className="alert error">{error}</div>}
              <div className="flex justify-end">
                <button type="submit" className="secondary">
                  ✓ Использовать initData
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}
