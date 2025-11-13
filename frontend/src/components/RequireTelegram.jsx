"use client"

import { useEffect, useMemo, useState } from "react"
import { useTelegram } from "../providers/TelegramProvider.jsx"

const CTA_DEFAULT_USERNAME = "BlackjackCasinoBot"

const resolveBotUsername = () =>
  import.meta.env.VITE_TELEGRAM_BOT_USERNAME?.replace(/^@/, "") || CTA_DEFAULT_USERNAME

const buildTelegramLink = () => {
  const explicitUrl = import.meta.env.VITE_TELEGRAM_BOT_URL
  if (explicitUrl) return explicitUrl
  return `https://t.me/${resolveBotUsername()}`
}

const deviceGuides = [
  {
    title: "Telegram Desktop",
    icon: "💻",
    steps: [
      "Откройте официальный клиент Telegram Desktop",
      "Вставьте ссылку t.me в строку поиска или адресную строку",
      "Нажмите «Открыть Mini App» и подтвердите запуск",
    ],
  },
  {
    title: "Telegram iOS / Android",
    icon: "📱",
    steps: [
      "Нажмите кнопку «Открыть в Telegram» ниже",
      "Если приложение не открылось — переключитесь в Telegram вручную",
      "Подтвердите запуск мини-приложения в чате с ботом",
    ],
  },
]

const experienceHighlights = [
  {
    icon: "⚡",
    title: "Мгновенная синхронизация",
    text: "Балансы, раунды и статусы обновляются в реальном времени.",
  },
  {
    icon: "🛡️",
    title: "Антифрод-защита",
    text: "Безопасность аккаунта обеспечивается через Telegram initData.",
  },
  {
    icon: "📊",
    title: "Полная статистика",
    text: "История ставок, выплаты, рейтинги — только внутри бота.",
  },
  {
    icon: "🔔",
    title: "Умные уведомления",
    text: "Пуши от Stars и Cryptomus приходят напрямую в чат.",
  },
]

const faqItems = [
  {
    question: "Почему нельзя играть в браузере?",
    answer:
      "Для идентификации пользователя и защиты от фрода требуется initData от Telegram WebApp. Без него запуск невозможен по соображениям безопасности.",
  },
  {
    question: "Нужно ли устанавливать что-то дополнительно?",
    answer:
      "Нет. Достаточно официального клиента Telegram — на iOS, Android или Desktop. Мини-приложение не требует загрузки.",
  },
  {
    question: "Работает ли демо-режим?",
    answer:
      "Да. После запуска в Telegram сразу доступны оба кошелька: демо (для тестов) и реальный (с пополнением через Stars и Cryptomus).",
  },
  {
    question: "Можно ли обойтись без Telegram?",
    answer:
      "Только в режиме разработчика — через ручной ввод initData. Для игроков обязательна авторизация через Telegram WebApp.",
  },
]

export const RequireTelegram = () => {
  const { initDataUnsafe, setInitData } = useTelegram()

  const [botLink] = useState(buildTelegramLink)
  const [botUsername] = useState(resolveBotUsername)
  const [copyMessage, setCopyMessage] = useState("")
  const [allowManualInit, setAllowManualInit] = useState(false)
  const [manualValue, setManualValue] = useState("")
  const [error, setError] = useState("")
  const [rawTelegramInitData, setRawTelegramInitData] = useState("")

  const telegramUser = initDataUnsafe?.user
  const telegramId = telegramUser?.id
  const telegramUsername = telegramUser?.username

  const playerLabel = useMemo(() => {
    if (telegramUsername) return `@${telegramUsername}`
    if (telegramId) return `ID ${telegramId}`
    return "Гость"
  }, [telegramId, telegramUsername])

  useEffect(() => {
    setAllowManualInit(import.meta.env.DEV)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
      setRawTelegramInitData(window.Telegram.WebApp.initData)
    }
  }, [])

  const handleOpenTelegram = () => {
    window.open(botLink, "_blank", "noopener,noreferrer")
  }

  const handleCopyLink = async () => {
    if (!navigator?.clipboard) {
      setCopyMessage(`Скопируйте вручную: ${botLink}`)
      return
    }
    try {
      await navigator.clipboard.writeText(botLink)
      setCopyMessage("✅ Ссылка скопирована!")
      setTimeout(() => setCopyMessage(""), 3000)
    } catch (err) {
      console.error("Copy failed", err)
      setCopyMessage("❌ Не удалось скопировать. Попробуйте вручную.")
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const value = manualValue.trim()
    if (!value) {
      setError("Вставьте корректную строку initData из Telegram WebApp")
      return
    }
    setError("")
    setInitData(value)
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Hero */}
        <section className="mb-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-1.5 text-sm font-medium text-cyan-300">
              <span>🚀 Blackjack Casino</span>
              <span className="text-xs text-cyan-400">Mini App</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Откройте игру <span className="text-cyan-400">прямо в Telegram</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
              Мини-приложение доступно только внутри Telegram. Мы распознали запуск в обычном браузере.
              <br />
              Перейдите в Telegram и откройте бота:{" "}
              <span className="font-mono font-semibold text-cyan-300">@{botUsername}</span>.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleOpenTelegram}
              className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-emerald-500 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:from-cyan-400 hover:to-emerald-400 hover:shadow-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              🚀 Открыть в Telegram
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="group flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-6 py-4 text-lg font-medium text-slate-200 transition hover:bg-slate-700/80 hover:text-white"
            >
              <span>🔗 Скопировать ссылку</span>
              <span className="text-xs font-normal text-slate-400 group-hover:text-slate-300">t.me/{botUsername}</span>
            </button>
          </div>

          {copyMessage && (
            <p
              className={`mt-3 text-center text-sm font-medium ${
                copyMessage.startsWith("✅") ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {copyMessage}
            </p>
          )}
        </section>

        {/* Why Telegram? Highlights */}
        <section className="mb-16">
          <h2 className="mb-6 text-center text-2xl font-bold text-white sm:text-3xl">Почему только в Telegram?</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {experienceHighlights.map((item, i) => (
              <div
                key={i}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-cyan-500/30 hover:bg-slate-800/50"
              >
                <div className="mb-3 flex items-center gap-2 text-xl">
                  <span className="text-cyan-400">{item.icon}</span>
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                </div>
                <p className="text-sm text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Device Guides */}
        <section className="mb-16">
          <h2 className="mb-6 text-center text-2xl font-bold text-white">Как открыть?</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {deviceGuides.map((guide, i) => (
              <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl">{guide.icon}</span>
                  <h3 className="text-xl font-semibold text-white">{guide.title}</h3>
                </div>
                <ol className="space-y-3">
                  {guide.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-bold text-cyan-300">
                        {idx + 1}
                      </span>
                      <span className="text-slate-200">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* Stats & CTA block */}
        <section className="mb-16 rounded-3xl border border-slate-800 bg-linear-to-br from-slate-900/70 to-slate-950 p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">🎲 Демо и реальный баланс</h2>
              <p className="mt-3 text-slate-300">
                После запуска в Telegram вы получите:
              </p>
              <ul className="mt-4 space-y-2 text-slate-200">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-cyan-400">✓</span>
                  <span>Два кошелька: демо и реальный</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-cyan-400">✓</span>
                  <span>Live-статистика и история ставок</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-cyan-400">✓</span>
                  <span>Уведомления о выплатах и бонусах</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-cyan-400">✓</span>
                  <span>Доступ к Stars и Cryptomus</span>
                </li>
              </ul>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-emerald-400">Средний RTP</p>
                  <p className="mt-1 text-xl font-bold text-emerald-300">99.3%</p>
                </div>
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-cyan-400">Выплат за 24ч</p>
                  <p className="mt-1 text-xl font-bold text-cyan-300">427</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleOpenTelegram}
                  className="w-full rounded-xl bg-linear-to-r from-cyan-600 to-emerald-600 px-6 py-4 font-bold text-white shadow-lg transition hover:opacity-90"
                >
                  🚀 Начать играть в @{botUsername}
                </button>
                <a
                  href={botLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-xl border border-slate-700 bg-slate-800/60 px-6 py-4 text-center font-medium text-slate-200 transition hover:bg-slate-700/80"
                >
                  💬 Перейти в чат с ботом
                </a>
                <p className="text-center text-xs text-slate-500">
                  Ссылка работает только внутри официального Telegram-клиента
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="mb-16">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">FAQ</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Часто задаваемые вопросы</h2>
          </div>
          <div className="space-y-4">
            {faqItems.map((faq, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 transition hover:border-cyan-500/30"
              >
                <summary className="cursor-pointer list-none p-5 font-semibold text-slate-100 outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-500">
                  <span>{faq.question}</span>
                  <span className="float-right transition-transform group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <div className="border-t border-slate-800 bg-slate-900/40 p-5 pt-4 text-slate-300">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Debug Mode */}
        {allowManualInit && (
          <section className="rounded-2xl border border-amber-900/30 bg-amber-900/10 p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-amber-300">
              <span>🔧 Режим отладки (DEV)</span>
            </h3>
            <p className="mt-1 text-sm text-amber-200/80">
              Только для разработчиков. Можно имитировать initData из Telegram.
            </p>

            <details className="mt-4 group">
              <summary className="cursor-pointer list-none py-2 font-medium text-slate-200 transition hover:text-white">
                ℹ️ Текущее значение <code className="ml-1 font-mono text-sm text-cyan-300">window.Telegram.WebApp.initData</code>
              </summary>
              <div className="mt-3 overflow-x-auto rounded-lg bg-slate-900/70 p-4">
                <pre className="whitespace-pre-wrap wrap-break-word text-xs text-slate-300">
                  {rawTelegramInitData || "(пусто — проверьте запуск через Telegram)"}
                </pre>
              </div>
            </details>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="initData" className="mb-2 block text-sm font-medium text-slate-200">
                  Вставьте initData (query_id=...&user=...)
                </label>
                <textarea
                  id="initData"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3 font-mono text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="query_id=AA...&user=%7B%22id%22%3A..."
                />
              </div>
              {error && <p className="text-sm text-rose-400">{error}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  ✓ Применить initData
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      {/* Optional: subtle decorative background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 opacity-30"
        style={{
          background:
            "radial-gradient(circle at 10% 20%, rgba(8, 145, 178, 0.15), transparent 40%), radial-gradient(circle at 80% 30%, rgba(14, 116, 144, 0.12), transparent 50%), radial-gradient(circle at 50% 80%, rgba(56, 189, 248, 0.08), transparent 45%)",
        }}
      />
    </div>
  )
}

export default RequireTelegram