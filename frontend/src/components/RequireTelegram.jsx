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
	return `https://t.me/${username}`
}

const deviceGuides = [
	{
		title: "Telegram Desktop",
		icon: "💻",
		steps: [
			"Откройте официальный клиент Telegram Desktop",
			"Вставьте t.me ссылку в строку поиска",
			"Нажмите «Открыть Mini App» и подтвердите запуск",
		],
	},
	{
		title: "Telegram iOS / Android",
		icon: "📱",
		steps: [
			"Тапните по кнопке «Открыть в Telegram»",
			"Переключитесь в Telegram, если приложение не открылось автоматически",
			"Подтвердите запуск мини-приложения внутри чата",
		],
	},
]

const experienceHighlights = [
	{
		icon: "⚡",
		title: "WebApp моментально",
		text: "Внутри Telegram WebApp все балансы и раунды синхронизируются мгновенно.",
	},
	{
		icon: "🛡️",
		title: "Антифрод",
		text: "Защита аккаунта и токенов, поэтому в браузере доступ ограничен.",
	},
	{
		icon: "📊",
		title: "Статистика",
		text: "История, выплаты и пуши доступны только внутри официального бота.",
	},
	{
		icon: "🎧",
		title: "Поддержка",
		text: "Уведомления от Stars и Cryptomus приходят прямо в чат с ботом.",
	},
]

const faqItems = [
	{
		title: "Почему нельзя играть в браузере?",
		text: "WebApp защищает токены через Telegram.initData — без него нельзя безопасно идентифицировать игрока.",
	},
	{
		title: "Нужно ли устанавливать что-то ещё?",
		text: "Нет, достаточно официального Telegram клиента на iOS, Android или Desktop.",
	},
	{
		title: "Работает ли демо баланс?",
		text: "Да, после запуска внутри бота доступны и демо, и реальный кошельки.",
	},
	{
		title: "Можно ли обойтись без Telegram?",
		text: "Только в режиме разработчика через initData. Для игроков нужен Telegram WebApp.",
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
		if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
			setRawTelegramInitData(window.Telegram.WebApp.initData)
		}
	}, [])

	const handleOpenTelegram = () => {
		window.open(botLink, "_blank")
	}

	const handleCopyLink = async () => {
		if (!navigator?.clipboard) {
			setCopyMessage(`Скопируйте вручную: ${botLink}`)
			return
		}
		try {
			await navigator.clipboard.writeText(botLink)
			setCopyMessage("Ссылка скопирована 👌")
			setTimeout(() => setCopyMessage(""), 2500)
		} catch (copyError) {
			console.error("Не удалось скопировать ссылку", copyError)
			setCopyMessage("Не вышло автоматически, кликните правой кнопкой")
		}
	}

	const handleSubmit = (event) => {
		event.preventDefault()
		if (!manualValue.trim()) {
			setError("Вставьте строку initData из Telegram WebApp")
			return
		}
		setError("")
		setInitData(manualValue.trim())
	}

	return (
		<div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
			<div
				className="pointer-events-none absolute inset-0 opacity-80"
				style={{
					background:
						"radial-gradient(circle at 10% 20%, rgba(8, 145, 178, 0.28), transparent 55%), radial-gradient(circle at 70% 20%, rgba(14, 116, 144, 0.25), transparent 60%), radial-gradient(circle at 40% 75%, rgba(56, 189, 248, 0.23), transparent 62%)",
				}}
			/>

			<main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
				<section className="grid gap-10 rounded-[2.5rem] border border-white/5 bg-slate-950/70 p-8 shadow-[0_35px_120px_rgba(8,25,45,0.55)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
					<div className="flex flex-col gap-6">
						<div className="inline-flex w-fit items-center gap-3 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.4em] text-cyan-100">
							Blackjack Casino
							<span className="text-xs font-normal text-cyan-200/80">Mini App</span>
						</div>
						<div className="space-y-3">
							<h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
								Откройте Blackjack прямо в Telegram
							</h1>
							<p className="text-lg text-slate-300">
								Мы распознали запуск в обычном браузере. Мини-приложение работает только внутри Telegram, поэтому подсказываем, как открыть бота
								{" "}
								<span className="text-cyan-300 font-semibold">@{botUsername}</span>.
							</p>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<button type="button" className="primary w-full sm:w-auto" onClick={handleOpenTelegram}>
								🚀 Открыть в Telegram
							</button>
							<button type="button" className="secondary w-full justify-center sm:w-auto" onClick={handleCopyLink}>
								🔗 Скопировать ссылку
							</button>
							<a
								href={botLink}
								target="_blank"
								rel="noopener noreferrer"
								className="underline-offset-4 text-center text-sm font-semibold text-cyan-300 hover:underline"
							>
								💬 Написать @{botUsername}
							</a>
						</div>

						{copyMessage && <p className="text-sm text-cyan-200">{copyMessage}</p>}

						<div className="grid gap-4 sm:grid-cols-2">
							{experienceHighlights.map(({ icon, title, text }) => (
								<div key={title} className="rounded-2xl border border-white/5 bg-white/5 p-4">
									<div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
										<span>{icon}</span>
										<span>{title}</span>
									</div>
									<p className="mt-2 text-sm text-slate-200">{text}</p>
								</div>
							))}
						</div>
					</div>

					<div className="relative">
						<div className="absolute inset-0 rounded-3xl bg-linear-to-br from-cyan-500/20 via-slate-900/40 to-indigo-500/20 blur-3xl" aria-hidden />
						<div className="relative flex h-full flex-col justify-between gap-6 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-[0_25px_60px_rgba(8,18,50,0.55)]">
							<div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm">
								<div>
									<p className="text-xs uppercase tracking-[0.28em] text-slate-400">Режим доступа</p>
									<p className="text-base font-semibold text-white">Telegram WebApp</p>
								</div>
								<span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
									● Проверено
								</span>
							</div>

							  <div className="rounded-2xl border border-white/10 bg-linear-to-br from-slate-900/90 via-slate-950/70 to-slate-900/60 p-5">
								<p className="text-xl font-semibold text-white">«Telegram ID = доступ ко всем функциям»</p>
								<p className="mt-3 text-sm text-slate-300">
									Внутри бота откроется полноценное казино с демо/реальными балансами, статистикой и антифрод-защитой. Никаких отдельных логинов.
								</p>
								<div className="mt-4 grid gap-3 sm:grid-cols-2">
									<div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3">
										<p className="text-xs uppercase tracking-[0.3em] text-slate-500">Средний RTP</p>
										<p className="text-lg font-semibold text-emerald-400">99.3%</p>
									</div>
									<div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3">
										<p className="text-xs uppercase tracking-[0.3em] text-slate-500">Выплат за 24ч</p>
										<p className="text-lg font-semibold text-cyan-300">427</p>
									</div>
								</div>
							</div>

							<div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
								<p>После запуска внутри Telegram вы сможете:</p>
								<ul className="mt-2 list-disc space-y-1 pl-5 text-slate-200">
									<li>Играть в демо и real режимах с мгновенной синхронизацией</li>
									<li>Открывать статистику, выплаты, историю</li>
									<li>Получать пуши и автоуведомления от бота</li>
								</ul>
							</div>
						</div>
					</div>
				</section>

				<section className="grid gap-6 rounded-4xl border border-cyan-400/15 bg-slate-950/70 p-6 sm:grid-cols-2">
					{deviceGuides.map(({ title, icon, steps }) => (
						<div key={title} className="rounded-2xl border border-white/10 bg-slate-900/65 p-5">
							<div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
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

				<section className="rounded-4xl border border-white/10 bg-slate-950/70 p-6">
					<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
						<div className="max-w-2xl space-y-3">
							<h2 className="text-2xl font-semibold text-white">🎲 Демо и реальный баланс</h2>
							<p className="text-slate-300">
								В Telegram вас ждут два кошелька, live-статистика и общий профиль. Демо помогает протестировать механику, а real счёт подключен к Cryptomus и Stars.
							</p>
							<p className="text-sm text-slate-400">
								В браузере эти данные скрыты специально, чтобы защитить аккаунт от подделок и утечки токенов.
							</p>
						</div>
						<div className="grid w-full max-w-sm gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
							<button type="button" className="primary w-full" onClick={handleOpenTelegram}>
								🚀 Открыть @{botUsername}
							</button>
							<a
								href={botLink}
								target="_blank"
								rel="noopener noreferrer"
								className="secondary flex w-full items-center justify-center gap-2 text-center"
							>
								💬 Перейти в чат
							</a>
							<p className="text-center text-xs text-slate-400">Ссылка работает только внутри Telegram-клиента</p>
						</div>
					</div>
				</section>

				<section className="rounded-4xl border border-white/10 bg-slate-950/80 p-6 space-y-6">
					<div>
						<p className="text-xs uppercase tracking-[0.35em] text-cyan-200">FAQ</p>
						<h2 className="mt-2 text-2xl font-semibold text-white">Ответы на частые вопросы</h2>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
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
								<p className="mb-2 font-mono text-xs text-slate-400">window.Telegram.WebApp.initData:</p>
								<pre className="wrap-break-word whitespace-pre-wrap rounded bg-slate-950/80 p-3 text-xs text-slate-300">
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

export default RequireTelegram
