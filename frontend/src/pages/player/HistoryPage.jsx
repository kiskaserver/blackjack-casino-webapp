"use client"

import { useEffect, useMemo, useState } from "react"
import { createPlayerApi } from "../../api/playerApi.js"
import { useTelegram } from "../../providers/TelegramProvider.jsx"

const MAX_ROUNDS = 50
const MAX_TRANSACTIONS = 100
const PAGE_SIZE_OPTIONS = [10, 25, 50]
const WALLET_KEYS = ["real", "demo"]

const ensureWalletStats = (raw) => ({
	totalGames: Number(raw?.totalGames ?? 0),
	wins: Number(raw?.wins ?? 0),
	losses: Number(raw?.losses ?? 0),
	pushes: Number(raw?.pushes ?? 0),
	blackjacks: Number(raw?.blackjacks ?? 0),
	netProfit: Number(raw?.netProfit ?? 0),
})

const formatCurrency = (value) => {
	const numeric = Number(value ?? 0)
	if (!Number.isFinite(numeric)) {
		return "0.00"
	}
	return Math.abs(numeric).toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})
}

const formatSignedCurrency = (value) => {
	const numeric = Number(value ?? 0)
	if (!Number.isFinite(numeric) || numeric === 0) {
		return formatCurrency(0)
	}
	const formatted = formatCurrency(numeric)
	if (numeric > 0) {
		return `+${formatted}`
	}
	return `-${formatted}`
}

const formatDateTime = (value) => {
	if (!value) {
		return "—"
	}
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return "—"
	}
	return date.toLocaleString("ru-RU", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

const walletBadgeMeta = (wallet) => {
	if (wallet === "real") {
		return { tone: "success", label: "Реальный", icon: "💎" }
	}
	if (wallet === "demo") {
		return { tone: "info", label: "Демо", icon: "🎮" }
	}
	return { tone: "info", label: "Игровой", icon: "👛" }
}

const roundResultMeta = (result, status) => {
	const normalizedResult = (result || "").toLowerCase()
	const normalizedStatus = (status || "").toLowerCase()
	if (normalizedResult === "win") {
		return { tone: "success", label: "Победа", icon: "🏆" }
	}
	if (normalizedResult === "blackjack") {
		return { tone: "success", label: "Блэкджек", icon: "🃏" }
	}
	if (normalizedResult === "push") {
		return { tone: "info", label: "Ничья", icon: "🤝" }
	}
	if (normalizedResult === "lose" || normalizedResult === "bust") {
		return { tone: "danger", label: "Поражение", icon: "📉" }
	}
	if (normalizedStatus === "pending") {
		return { tone: "warning", label: "В процессе", icon: "⏳" }
	}
	if (normalizedStatus === "finished") {
		return { tone: "info", label: "Завершено", icon: "✅" }
	}
	return { tone: "info", label: "Неизвестно", icon: "❔" }
}

const REASON_LABELS = {
	demo_reset: "Сброс демо баланса",
	bet_wager: "Ставка",
	bet_double: "Удвоение ставки",
	round_win: "Выплата за победу",
	round_blackjack: "Выплата за блэкджек",
	round_push: "Возврат ставки",
	round_payout: "Выплата раунда",
	withdraw_cryptomus: "Вывод в Cryptomus",
	withdraw_telegram_stars: "Вывод Telegram Stars",
	withdraw_refund: "Возврат вывода",
	deposit_cryptomus: "Депозит через Cryptomus",
	deposit_telegram_stars: "Депозит Telegram Stars",
	admin_demo_reset: "Админ: сброс демо",
	admin_set_balance_increase: "Админ: пополнение",
	admin_set_balance_decrease: "Админ: списание",
	bonus_credit: "Бонусное начисление",
}

const formatReason = (rawReason) => {
	if (!rawReason) {
		return "Прочее"
	}
	const normalized = rawReason.toLowerCase()
	if (REASON_LABELS[normalized]) {
		return REASON_LABELS[normalized]
	}
	const trimmed = normalized.replace(/(_credit|_debit)$/u, "")
	if (REASON_LABELS[trimmed]) {
		return REASON_LABELS[trimmed]
	}
	const spaced = trimmed.replace(/[_-]+/g, " ").trim()
	if (!spaced) {
		return "Прочее"
	}
	return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const PaginationControls = ({
	page,
	total,
	pageSize,
	onPageChange,
	onPageSizeChange,
	pageSizeOptions = PAGE_SIZE_OPTIONS,
}) => {
	const totalPages = Math.max(1, Math.ceil(Math.max(total, 0) / Math.max(pageSize, 1)))
	const hasRows = total > 0
	const safePage = hasRows ? Math.min(Math.max(page, 1), totalPages) : 1

	return (
		<div className="table-pagination">
			<span className="pagination-info">{hasRows ? `Стр. ${safePage} из ${totalPages}` : "Нет записей"}</span>
			<button
				type="button"
				className="pagination-button"
				onClick={() => onPageChange(1)}
				disabled={!hasRows || safePage === 1}
				aria-label="В начало"
			>
				⏮
			</button>
			<button
				type="button"
				className="pagination-button"
				onClick={() => onPageChange(safePage - 1)}
				disabled={!hasRows || safePage === 1}
				aria-label="Назад"
			>
				◀
			</button>
			<button
				type="button"
				className="pagination-button"
				onClick={() => onPageChange(safePage + 1)}
				disabled={!hasRows || safePage >= totalPages}
				aria-label="Вперёд"
			>
				▶
			</button>
			<button
				type="button"
				className="pagination-button"
				onClick={() => onPageChange(totalPages)}
				disabled={!hasRows || safePage >= totalPages}
				aria-label="В конец"
			>
				⏭
			</button>
			<select
				className="pagination-select"
				value={pageSize}
				onChange={(event) => onPageSizeChange(Number(event.target.value))}
				aria-label="Размер страницы"
			>
				{pageSizeOptions.map((option) => (
					<option key={option} value={option}>
						{option}/стр
					</option>
				))}
			</select>
		</div>
	)
}

const HistoryPage = () => {
	const { initData } = useTelegram()
	const api = useMemo(() => (initData ? createPlayerApi(() => initData) : null), [initData])
	const [history, setHistory] = useState({ stats: null, rounds: [], transactions: [] })
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")
	const [refreshIndex, setRefreshIndex] = useState(0)
	const [roundPage, setRoundPage] = useState(1)
	const [roundPageSize, setRoundPageSize] = useState(PAGE_SIZE_OPTIONS[0])
	const [transactionPage, setTransactionPage] = useState(1)
	const [transactionPageSize, setTransactionPageSize] = useState(PAGE_SIZE_OPTIONS[0])

	useEffect(() => {
		if (!api) {
			return
		}

		let cancelled = false

		const loadHistory = async () => {
			setLoading(true)
			setError("")
			try {
				const payload = await api.getHistory({ rounds: MAX_ROUNDS, transactions: MAX_TRANSACTIONS })
				if (cancelled) {
					return
				}
				setHistory({
					stats: payload?.stats ?? null,
					rounds: Array.isArray(payload?.rounds) ? payload.rounds : [],
					transactions: Array.isArray(payload?.transactions) ? payload.transactions : [],
				})
				setRoundPage(1)
				setTransactionPage(1)
			} catch (err) {
				if (!cancelled) {
					const message = err?.message || "Не удалось загрузить историю"
					setError(message)
					setHistory({ stats: null, rounds: [], transactions: [] })
				}
			} finally {
				if (!cancelled) {
					setLoading(false)
				}
			}
		}

		loadHistory()

		return () => {
			cancelled = true
		}
	}, [api, refreshIndex])

	useEffect(() => {
		if (!api) {
			setLoading(false)
		}
	}, [api])

	const rounds = Array.isArray(history.rounds) ? history.rounds : []
	const transactions = Array.isArray(history.transactions) ? history.transactions : []

	const walletStats = useMemo(
		() => ({
			real: ensureWalletStats(history.stats?.wallets?.real),
			demo: ensureWalletStats(history.stats?.wallets?.demo),
		}),
		[history.stats?.wallets?.real, history.stats?.wallets?.demo]
	)

	const totalRounds = rounds.length
	const totalTransactions = transactions.length

	useEffect(() => {
		const totalPages = Math.max(1, Math.ceil(Math.max(totalRounds, 0) / Math.max(roundPageSize, 1)))
		setRoundPage((current) => Math.min(Math.max(current, 1), totalPages))
	}, [totalRounds, roundPageSize])

	useEffect(() => {
		const totalPages = Math.max(1, Math.ceil(Math.max(totalTransactions, 0) / Math.max(transactionPageSize, 1)))
		setTransactionPage((current) => Math.min(Math.max(current, 1), totalPages))
	}, [totalTransactions, transactionPageSize])

	const paginatedRounds = useMemo(() => {
		const start = (roundPage - 1) * roundPageSize
		return rounds.slice(start, start + roundPageSize)
	}, [roundPage, roundPageSize, rounds])

	const paginatedTransactions = useMemo(() => {
		const start = (transactionPage - 1) * transactionPageSize
		return transactions.slice(start, start + transactionPageSize)
	}, [transactionPage, transactionPageSize, transactions])

	const handleRefresh = () => {
		if (!api || loading) {
			return
		}
		setRefreshIndex((value) => value + 1)
	}

	const handleRoundPageChange = (nextPage) => {
		const totalPages = Math.max(1, Math.ceil(Math.max(totalRounds, 0) / Math.max(roundPageSize, 1)))
		setRoundPage(Math.min(Math.max(nextPage, 1), totalPages))
	}

	const handleTransactionPageChange = (nextPage) => {
		const totalPages = Math.max(1, Math.ceil(Math.max(totalTransactions, 0) / Math.max(transactionPageSize, 1)))
		setTransactionPage(Math.min(Math.max(nextPage, 1), totalPages))
	}

	const handleRoundPageSizeChange = (size) => {
		setRoundPageSize(size)
		setRoundPage(1)
	}

	const handleTransactionPageSizeChange = (size) => {
		setTransactionPageSize(size)
		setTransactionPage(1)
	}

	if (!initData) {
		return <div className="py-8 text-center text-slate-400">🔐 Авторизуйтесь через Telegram, чтобы увидеть историю.</div>
	}

	return (
		<div className="history-container">
			<section className="page-section">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div className="flex flex-col gap-1">
						<h1 className="page-section-title">📜 История активностей</h1>
						<p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
							До {MAX_ROUNDS} последних раундов и {MAX_TRANSACTIONS} операций
						</p>
					</div>
					<button type="button" className="secondary" onClick={handleRefresh} disabled={!api || loading}>
						{loading ? "⏳ Обновление…" : "🔄 Обновить"}
					</button>
				</div>

				{error && (
					<div className="message error">
						<span aria-hidden="true">⚠️</span> {error}
					</div>
				)}

				<div className="grid gap-3 md:grid-cols-2">
					{WALLET_KEYS.map((wallet) => {
						const stats = walletStats[wallet]
						const net = Number(stats.netProfit)
						const netClass = net > 0 ? "positive" : net < 0 ? "negative" : ""
						const winRate = stats.totalGames > 0 ? ((stats.wins / stats.totalGames) * 100).toFixed(1) : "0.0"
						return (
							<div key={wallet} className="stat-card">
								<h3 className="stat-title">
									{wallet === "real" ? "💎 Реальные игры" : "🎮 Демо игры"}
								</h3>
								<div className="stat-row">
									<span>Всего игр</span>
									<span className="stat-value text-cyan-400">{stats.totalGames}</span>
								</div>
								<div className="stat-row">
									<span>Победы</span>
									<span className="stat-value positive">{stats.wins}</span>
								</div>
								<div className="stat-row">
									<span>Поражения</span>
									<span className="stat-value negative">{stats.losses}</span>
								</div>
								<div className="stat-row">
									<span>Ничьи</span>
									<span className="stat-value">{stats.pushes}</span>
								</div>
								<div className="stat-row">
									<span>Блэкджек</span>
									<span className="stat-value">{stats.blackjacks}</span>
								</div>
								<div className="stat-row">
									<span>Win Rate</span>
									<span className="stat-value">{winRate}%</span>
								</div>
								<div className="stat-row stat-divider">
									<span>Net P&amp;L</span>
									<span className={`stat-value ${netClass}`}>{formatSignedCurrency(net)}</span>
								</div>
							</div>
						)
					})}
				</div>
			</section>

			<section className="page-section">
				<div className="table-controls">
					<h2 className="table-heading">🃏 Игровые раунды</h2>
					<div className="table-controls-group">
						<span className="table-count">Всего: {totalRounds}</span>
						<PaginationControls
							page={roundPage}
							total={totalRounds}
							pageSize={roundPageSize}
							onPageChange={handleRoundPageChange}
							onPageSizeChange={handleRoundPageSizeChange}
						/>
					</div>
				</div>
				<div className="table-wrapper">
					<table>
						<thead>
							<tr>
								<th>Дата</th>
								<th>Кошелёк</th>
								<th className="table-cell-right">Ставка</th>
								<th className="table-cell-right">Итоговая ставка</th>
								<th>Результат</th>
								<th className="table-cell-right">P&amp;L</th>
							</tr>
						</thead>
						<tbody>
							{paginatedRounds.length === 0 && (
								<tr>
									<td colSpan={6} className="py-6 text-center text-slate-400">
										{loading ? "⏳ Загружаем раунды…" : "Раунды ещё не сыграны"}
									</td>
								</tr>
							)}
							{paginatedRounds.map((round) => {
								const meta = roundResultMeta(round.result, round.status)
								const walletMeta = walletBadgeMeta(round.wallet_type)
								const pnl = Number(round.win_amount ?? 0) - Number(round.final_bet ?? round.base_bet ?? 0)
								const pnlClass = pnl > 0 ? "table-cell-positive" : pnl < 0 ? "table-cell-negative" : ""
								const displayDate = round.settled_at || round.created_at
								return (
									<tr key={round.round_id}>
										<td>{formatDateTime(displayDate)}</td>
										<td>
											<span className={`status-badge ${walletMeta.tone}`}>
												{walletMeta.icon} {walletMeta.label}
											</span>
										</td>
										<td className="table-cell-right">{formatCurrency(round.base_bet)}</td>
										<td className="table-cell-right">{formatCurrency(round.final_bet)}</td>
										<td>
											<span className={`status-badge ${meta.tone}`}>
												{meta.icon} {meta.label}
											</span>
										</td>
										<td className={`table-cell-right ${pnlClass}`}>{formatSignedCurrency(pnl)}</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			</section>

			<section className="page-section">
				<div className="table-controls">
					<h2 className="table-heading">💸 Транзакции</h2>
					<div className="table-controls-group">
						<span className="table-count">Всего: {totalTransactions}</span>
						<PaginationControls
							page={transactionPage}
							total={totalTransactions}
							pageSize={transactionPageSize}
							onPageChange={handleTransactionPageChange}
							onPageSizeChange={handleTransactionPageSizeChange}
						/>
					</div>
				</div>
				<div className="table-wrapper">
					<table>
						<thead>
							<tr>
								<th>Дата</th>
								<th>Кошелёк</th>
								<th className="table-cell-right">Сумма</th>
								<th>Назначение</th>
							</tr>
						</thead>
						<tbody>
							{paginatedTransactions.length === 0 && (
								<tr>
									<td colSpan={4} className="py-6 text-center text-slate-400">
										{loading ? "⏳ Загружаем операции…" : "Транзакции отсутствуют"}
									</td>
								</tr>
							)}
							{paginatedTransactions.map((transaction) => {
								const amount = Number(transaction.amount ?? 0)
								const walletMeta = walletBadgeMeta(transaction.wallet_type)
								const amountClass = amount > 0 ? "table-cell-positive" : amount < 0 ? "table-cell-negative" : ""
								return (
									<tr key={transaction.id}>
										<td>{formatDateTime(transaction.created_at)}</td>
										<td>
											<span className={`status-badge ${walletMeta.tone}`}>
												{walletMeta.icon} {walletMeta.label}
											</span>
										</td>
										<td className={`table-cell-right ${amountClass}`}>{formatSignedCurrency(amount)}</td>
										<td>{formatReason(transaction.reason)}</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	)
}

export default HistoryPage
