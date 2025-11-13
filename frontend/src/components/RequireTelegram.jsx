"use client"

import { useEffect, useMemo, useState } from "react"
import { useTelegram } from "../providers/TelegramProvider.jsx"
import "../styles/require-telegram.css"

const CTA_DEFAULT_USERNAME = "BlackjackCasinoBot"

const resolveBotUsername = () =>
  import.meta.env.VITE_TELEGRAM_BOT_USERNAME?.replace(/^@/, "") || CTA_DEFAULT_USERNAME

const buildTelegramLink = () => {
  const explicitUrl = import.meta.env.VITE_TELEGRAM_BOT_URL
  if (explicitUrl) {
    return explicitUrl
  }
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

export const RequireTelegram = ({ children }) => {
  const { initData, user, setInitData } = useTelegram()

  const [botLink] = useState(buildTelegramLink)
  const [botUsername] = useState(resolveBotUsername)
  const [copyMessage, setCopyMessage] = useState("")
  const [allowManualInit, setAllowManualInit] = useState(false)
  const [manualValue, setManualValue] = useState("")
  const [error, setError] = useState("")
  const [rawTelegramInitData, setRawTelegramInitData] = useState("")

  const telegramId = user?.id
  const telegramUsername = user?.username
  const hasInitData = Boolean(initData && initData.trim())

  const playerLabel = useMemo(() => {
    if (telegramUsername) {
      return `@${telegramUsername}`
    }
    if (telegramId) {
      return `ID ${telegramId}`
    }
    return "Гость"
  }, [telegramId, telegramUsername])

  useEffect(() => {
    setAllowManualInit(import.meta.env.DEV)
  }, [])

  useEffect(() => {
    if (hasInitData) {
      setRawTelegramInitData(initData.trim())
      return
    }
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
      setRawTelegramInitData(window.Telegram.WebApp.initData)
    }
  }, [hasInitData, initData])

  if (hasInitData) {
    return children ?? null
  }

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
    } catch (errorCopy) {
      console.error("Copy failed", errorCopy)
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
    <section className="require-telegram">
      <div className="require-telegram__glow" aria-hidden />
      <div className="require-telegram__container">
        <header className="require-telegram__hero">
          <div className="require-telegram__hero-text">
            <span className="rt-chip">Blackjack Casino · Mini App</span>
            <h1 className="rt-title">
              Откройте игру прямо в <span>Telegram</span>
            </h1>
            <p className="rt-subtitle">
              Мы обнаружили запуск в браузере. Для полноценного доступа к балансам, историям и уведомлениям откройте официального бота
              <span className="rt-link"> @{botUsername}</span> в Telegram.
            </p>

            <div className="require-telegram__profile">
              <div>
                <p className="require-telegram__profile-label">Вы вошли как</p>
                <p className="require-telegram__profile-value">{playerLabel}</p>
              </div>
              <span className="require-telegram__badge">Telegram WebApp</span>
            </div>

            <div className="require-telegram__cta">
              <button type="button" className="rt-button rt-button--primary" onClick={handleOpenTelegram}>
                🚀 Открыть в Telegram
              </button>
              <button type="button" className="rt-button rt-button--ghost" onClick={handleCopyLink}>
                <span>🔗 Скопировать ссылку</span>
                <span className="rt-button__hint">t.me/{botUsername}</span>
              </button>
            </div>

            {copyMessage && (
              <p className={`require-telegram__copy ${copyMessage.startsWith("✅") ? "is-success" : "is-error"}`}>{copyMessage}</p>
            )}
          </div>

          <div className="require-telegram__hero-panel">
            <p className="require-telegram__panel-title">Что откроется внутри бота</p>
            <ul className="require-telegram__list">
              <li>Два кошелька: демо для тестов и реальный для выплат</li>
              <li>Live-история раундов, статистика и антифрод-алерты</li>
              <li>Пуш-уведомления от Stars и Cryptomus прямо в чат</li>
            </ul>
            <div className="require-telegram__stat-grid">
              <article className="require-telegram__stat">
                <p className="require-telegram__stat-label">Средний RTP</p>
                <p className="require-telegram__stat-value">99.3%</p>
              </article>
              <article className="require-telegram__stat">
                <p className="require-telegram__stat-label">Выплат за 24ч</p>
                <p className="require-telegram__stat-value">427</p>
              </article>
              <article className="require-telegram__stat">
                <p className="require-telegram__stat-label">Синхронизация</p>
                <p className="require-telegram__stat-value">Real‑time</p>
              </article>
            </div>
          </div>
        </header>

        <section className="require-telegram__features" aria-label="Преимущества Telegram">
          <h2 className="rt-section-title">Почему мы пускаем только через Telegram</h2>
          <div className="require-telegram__card-grid">
            {experienceHighlights.map((highlight) => (
              <article key={highlight.title} className="require-telegram__feature-card">
                <div className="require-telegram__feature-icon">{highlight.icon}</div>
                <h3>{highlight.title}</h3>
                <p>{highlight.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="require-telegram__guides" aria-label="Инструкции по устройствам">
          <div className="require-telegram__guides-header">
            <h2 className="rt-section-title">Как открыть мини-приложение</h2>
            <p>
              Следуйте подсказкам для своего устройства. На всех платформах запуск занимает меньше минуты – ссылку можно скопировать или открыть
              напрямую.
            </p>
          </div>
          <div className="require-telegram__guides-grid">
            {deviceGuides.map((guide) => (
              <article key={guide.title} className="require-telegram__guide-card">
                <div className="require-telegram__guide-heading">
                  <span>{guide.icon}</span>
                  <h3>{guide.title}</h3>
                </div>
                <ol>
                  {guide.steps.map((step, index) => (
                    <li key={`${guide.title}-${index}`}>
                      <span className="require-telegram__step-index">{index + 1}</span>
                      <p>{step}</p>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>

        <section className="require-telegram__access">
          <div className="require-telegram__access-card">
            <div>
              <h2>Доступ к деньгам и истории только в Telegram</h2>
              <p>
                Браузерная версия урезана специально, чтобы защитить токены и initData. Mini App внутри Telegram синхронизирует балансы, выдаёт
                статистику и уведомления без задержек.
              </p>
            </div>
            <ul className="require-telegram__list require-telegram__list--compact">
              <li>Демо и real кошельки в одном профиле</li>
              <li>Live-поддержка и пуши от Stars/Cryptomus</li>
              <li>Антифрод и автоудержания в реальном времени</li>
            </ul>
            <div className="require-telegram__cta require-telegram__cta--inline">
              <button type="button" className="rt-button rt-button--primary" onClick={handleOpenTelegram}>
                🚀 Запустить @{botUsername}
              </button>
              <a className="rt-button rt-button--outline" href={botLink} target="_blank" rel="noopener noreferrer">
                💬 Перейти в чат
              </a>
            </div>
            <p className="require-telegram__note">Ссылка активируется автоматически, если Telegram установлен на устройстве.</p>
          </div>
        </section>

        <section className="require-telegram__faq" aria-label="FAQ">
          <div className="require-telegram__guides-header">
            <p className="rt-eyebrow">FAQ</p>
            <h2 className="rt-section-title">Частые вопросы</h2>
          </div>
          <div className="require-telegram__accordion-grid">
            {faqItems.map((faq) => (
              <details key={faq.question} className="require-telegram__accordion">
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {allowManualInit && (
          <section className="require-telegram__debug">
            <div className="require-telegram__guides-header">
              <h2 className="rt-section-title">🔧 Режим отладки</h2>
              <p>Режим доступен только в dev-сборке. Можно подставить initData вручную, чтобы смоделировать запуск WebApp.</p>
            </div>

            <details className="require-telegram__accordion require-telegram__accordion--inline">
              <summary>Текущее значение window.Telegram.WebApp.initData</summary>
              <pre>{rawTelegramInitData || "(пусто — запустите страницу внутри Telegram)"}</pre>
            </details>

            <form onSubmit={handleSubmit} className="require-telegram__form">
              <label htmlFor="initData">Вставьте initData (query_id=...&user=...)</label>
              <textarea
                id="initData"
                value={manualValue}
                rows={4}
                placeholder="query_id=AA...&user=%7B%22id%22%3A..."
                onChange={(event) => setManualValue(event.target.value)}
              />
              {error && <p className="require-telegram__error">{error}</p>}
              <div className="require-telegram__form-actions">
                <button type="submit" className="rt-button rt-button--primary">
                  ✓ Применить initData
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </section>
  )
}

export default RequireTelegram