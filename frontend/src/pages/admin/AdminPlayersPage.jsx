"use client"

import { useEffect, useState } from "react"
import { useAdmin } from "../../providers/AdminProvider.jsx"

const statusOptions = [
  { value: "active", label: "Активен" },
  { value: "suspended", label: "Заморожен" },
  { value: "limited", label: "Ограничен" },
  { value: "verified", label: "Верифицирован" },
  { value: "banned", label: "Заблокирован" },
]

const AdminPlayersPage = () => {
  const { api } = useAdmin()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [toast, setToast] = useState("")
  const [adjustForm, setAdjustForm] = useState({ amount: "", walletType: "real", reason: "" })
  const [balanceForm, setBalanceForm] = useState({ balance: "" })
  const [demoResetTarget, setDemoResetTarget] = useState("")
  const [demoSettingsForm, setDemoSettingsForm] = useState({ enabled: true, initialBalance: "", topupThreshold: "" })
  const [statusForm, setStatusForm] = useState("active")

  const showToast = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(""), 4000)
  }

  const loadPlayers = async () => {
    if (!api) {
      return
    }
    setLoading(true)
    setError("")
    try {
      const list = await api.listPlayers({ limit: 50 })
      setPlayers(list || [])
    } catch (err) {
      setError(err.message || "Не удалось загрузить игроков")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlayers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async (event) => {
    event.preventDefault()
    if (!api) {
      return
    }
    const query = search.trim()
    if (!query) {
      await loadPlayers()
      return
    }
    setLoading(true)
    setError("")
    try {
      const result = await api.searchPlayers({ q: query, limit: 50 })
      setPlayers(result || [])
    } catch (err) {
      setError(err.message || "Ошибка поиска")
    } finally {
      setLoading(false)
    }
  }

  const loadDetail = async (telegramId) => {
    if (!api || !telegramId) {
      return
    }
    setSelected(telegramId)
    setDetail(null)
    setDetailLoading(true)
    setError("")
    try {
      const info = await api.getPlayerByTelegramId(telegramId)
      setDetail(info)
      setStatusForm(info?.player?.status || "active")
      setDemoSettingsForm({
        enabled:
          info?.playerSettings?.demo_enabled ?? info?.playerSettings?.demoEnabled ?? info?.player?.demo_enabled ?? true,
        initialBalance: info?.playerSettings?.demo_initial_balance ?? info?.playerSettings?.demoInitialBalance ?? "",
        topupThreshold: info?.playerSettings?.demo_topup_threshold ?? info?.playerSettings?.demoTopupThreshold ?? "",
      })
    } catch (err) {
      setError(err.message || "Не удалось загрузить данные игрока")
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshSelected = async () => {
    if (selected) {
      await loadDetail(selected)
    }
  }

  const handleAdjustSubmit = async (event) => {
    event.preventDefault()
    if (!api || !selected) {
      return
    }
    try {
      setError("")
      const numericAmount = Number(adjustForm.amount)
      if (!Number.isFinite(numericAmount) || numericAmount === 0) {
        throw new Error("Введите ненулевую сумму")
      }
      await api.adjustBalance(selected, {
        amount: numericAmount,
        walletType: adjustForm.walletType,
        reason: adjustForm.reason || undefined,
      })
      showToast("Баланс скорректирован")
      setAdjustForm({ amount: "", walletType: adjustForm.walletType, reason: "" })
      await refreshSelected()
    } catch (err) {
      setError(err.message || "Не удалось скорректировать баланс")
    }
  }

  const handleSetBalance = async (event) => {
    event.preventDefault()
    if (!api || !selected) {
      return
    }
    try {
      setError("")
      const target = Number(balanceForm.balance)
      if (!Number.isFinite(target) || target < 0) {
        throw new Error("Баланс должен быть неотрицательным числом")
      }
      await api.setBalance(selected, { balance: target })
      showToast("Баланс установлен")
      setBalanceForm({ balance: "" })
      await refreshSelected()
    } catch (err) {
      setError(err.message || "Не удалось обновить баланс")
    }
  }

  const handleUpdateStatus = async (event) => {
    event.preventDefault()
    if (!api || !selected) {
      return
    }
    try {
      setError("")
      await api.updateStatus(selected, { status: statusForm })
      showToast("Статус обновлён")
      await refreshSelected()
    } catch (err) {
      setError(err.message || "Не удалось обновить статус")
    }
  }

  const handleResetDemo = async (event) => {
    event.preventDefault()
    if (!api || !selected) {
      return
    }
    try {
      setError("")
      const payload = demoResetTarget ? Number(demoResetTarget) : undefined
      await api.resetDemoBalance(selected, { targetBalance: payload })
      showToast("Демо баланс обновлён")
      setDemoResetTarget("")
      await refreshSelected()
    } catch (err) {
      setError(err.message || "Не удалось обновить демо баланс")
    }
  }

  const handleSaveDemoSettings = async (event) => {
    event.preventDefault()
    if (!api || !selected) {
      return
    }
    try {
      setError("")
      await api.saveDemoSettings(selected, {
        enabled: Boolean(demoSettingsForm.enabled),
        initialBalance: demoSettingsForm.initialBalance === "" ? undefined : Number(demoSettingsForm.initialBalance),
        topupThreshold: demoSettingsForm.topupThreshold === "" ? undefined : Number(demoSettingsForm.topupThreshold),
      })
      showToast("Настройки демо сохранены")
      await refreshSelected()
    } catch (err) {
      setError(err.message || "Не удалось сохранить настройки демо")
    }
  }

  const handleClearDemoSettings = async () => {
    if (!api || !selected) {
      return
    }
    try {
      setError("")
      await api.clearDemoSettings(selected)
      showToast("Индивидуальные настройки демо удалены")
      await refreshSelected()
    } catch (err) {
      setError(err.message || "Не удалось удалить настройки")
    }
  }

  const stats = detail?.stats
  const riskEvents = detail?.riskEvents || []

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <section className="card">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-200 mb-2">Поиск по Telegram ID / username</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="12345 или @nickname"
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <button className="primary" type="submit" disabled={loading}>
              🔍 Найти
            </button>
            <button className="secondary" type="button" onClick={loadPlayers} disabled={loading}>
              ↻ Сбросить
            </button>
          </div>
        </form>
        {error && <div className="alert error mt-3">{error}</div>}
        {toast && <div className="alert success mt-3">{toast}</div>}
      </section>

      {/* Main Content: Players List + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Players List */}
        <section className="lg:col-span-1 card max-h-[600px] overflow-y-auto">
          <h2 className="text-lg font-bold text-white mb-4">
            👥 Игроки <span className="text-cyan-400">({players.length})</span>
          </h2>
          {loading && <p className="text-slate-400">⏳ Загрузка…</p>}
          {!loading && players.length === 0 && <p className="text-slate-500">Нет игроков.</p>}
          <ul className="space-y-2">
            {players.map((player) => (
              <li key={player.telegram_id || player.id}>
                <button
                  onClick={() => loadDetail(player.telegram_id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 ${
                    selected === player.telegram_id
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300"
                      : "hover:bg-slate-800/50 text-slate-300 hover:text-white"
                  }`}
                >
                  <strong className="block text-sm">{player.telegram_id}</strong>
                  <div className="text-xs text-slate-500 mt-1">
                    @{player.username || "—"} • {Number(player.balance || 0).toFixed(2)} 💎 •{" "}
                    <span
                      className={
                        player.status === "active"
                          ? "text-green-400"
                          : player.status === "banned"
                            ? "text-red-400"
                            : "text-yellow-400"
                      }
                    >
                      {player.status}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Details Panel */}
        <section className="lg:col-span-2 card max-h-[600px] overflow-y-auto">
          {!selected && (
            <p className="text-center text-slate-400 py-12">ℹ️ Выберите игрока для просмотра подробностей</p>
          )}
          {detailLoading && <p className="text-center text-slate-400 py-12">⏳ Загрузка данных…</p>}
          {detail && !detailLoading && (
            <div className="space-y-4">
              {/* Player Header */}
              <div>
                <h2 className="text-xl font-bold text-white">{detail.player.telegram_id}</h2>
                <p className="text-sm text-slate-400 mt-1">
                  @{detail.player.username || "—"} • статус{" "}
                  <span className="text-cyan-300">{detail.player.status}</span> • верификация{" "}
                  <span className="text-cyan-300">{detail.player.verification_status || "не верифицирован"}</span>
                </p>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="bg-slate-800/50 px-3 py-2 rounded-lg">
                    <div className="text-xs text-slate-400">Баланс</div>
                    <div className="text-lg font-bold text-cyan-400">
                      {Number(detail.player.balance || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 px-3 py-2 rounded-lg">
                    <div className="text-xs text-slate-400">Демо</div>
                    <div className="text-lg font-bold text-yellow-400">
                      {Number(detail.player.demo_balance || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 px-3 py-2 rounded-lg">
                    <div className="text-xs text-slate-400">Создан</div>
                    <div className="text-xs font-mono text-slate-300">
                      {detail.player.created_at ? new Date(detail.player.created_at).toLocaleDateString() : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              {stats && (
                <div className="bg-slate-800/30 rounded-lg p-3 space-y-3">
                  <h3 className="font-bold text-cyan-300">📊 Статистика</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-400 mb-2">💎 Реальные</div>
                      <ul className="space-y-1 text-xs text-slate-300">
                        <li>
                          Игр: <span className="text-cyan-400">{stats.totalGames}</span>
                        </li>
                        <li>
                          Побед: <span className="text-green-400">{stats.wins}</span>
                        </li>
                        <li>
                          Поражений: <span className="text-red-400">{stats.losses}</span>
                        </li>
                        <li>
                          Блэкджеков: <span className="text-yellow-400">{stats.blackjacks}</span>
                        </li>
                        <li>
                          Net:{" "}
                          <span className={Number(stats.netProfit || 0) >= 0 ? "text-green-400" : "text-red-400"}>
                            {Number(stats.netProfit || 0).toFixed(2)}
                          </span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-400 mb-2">🎮 Демо</div>
                      <ul className="space-y-1 text-xs text-slate-300">
                        <li>
                          Игр: <span className="text-cyan-400">{stats.wallets?.demo?.totalGames || 0}</span>
                        </li>
                        <li>
                          Побед: <span className="text-green-400">{stats.wallets?.demo?.wins || 0}</span>
                        </li>
                        <li>
                          Поражений: <span className="text-red-400">{stats.wallets?.demo?.losses || 0}</span>
                        </li>
                        <li>
                          Блэкджеков: <span className="text-yellow-400">{stats.wallets?.demo?.blackjacks || 0}</span>
                        </li>
                        <li>
                          Net:{" "}
                          <span
                            className={
                              Number(stats.wallets?.demo?.netProfit || 0) >= 0 ? "text-green-400" : "text-red-400"
                            }
                          >
                            {Number(stats.wallets?.demo?.netProfit || 0).toFixed(2)}
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Forms - Adjust Balance */}
              <form className="bg-slate-800/30 rounded-lg p-3 space-y-3" onSubmit={handleAdjustSubmit}>
                <h3 className="font-bold text-cyan-300">💰 Корректировка баланса</h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={adjustForm.amount}
                    onChange={(event) => setAdjustForm((prev) => ({ ...prev, amount: event.target.value }))}
                    placeholder="Сумма"
                    required
                    className="flex-1"
                  />
                  <select
                    value={adjustForm.walletType}
                    onChange={(event) => setAdjustForm((prev) => ({ ...prev, walletType: event.target.value }))}
                    className="flex-1"
                  >
                    <option value="real">Реальный</option>
                    <option value="demo">Демо</option>
                  </select>
                </div>
                <input
                  value={adjustForm.reason}
                  onChange={(event) => setAdjustForm((prev) => ({ ...prev, reason: event.target.value }))}
                  placeholder="Причина (лог)"
                  className="w-full"
                />
                <button className="primary w-full" type="submit">
                  ✓ Корректировать баланс
                </button>
              </form>

              {/* Set Balance */}
              <form className="bg-slate-800/30 rounded-lg p-3 space-y-3" onSubmit={handleSetBalance}>
                <h3 className="font-bold text-cyan-300">🎯 Установить баланс</h3>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={balanceForm.balance}
                  onChange={(event) => setBalanceForm({ balance: event.target.value })}
                  placeholder="Новый баланс"
                  required
                  className="w-full"
                />
                <button className="primary w-full" type="submit">
                  ✓ Обновить баланс
                </button>
              </form>

              {/* Update Status */}
              <form className="bg-slate-800/30 rounded-lg p-3 space-y-3" onSubmit={handleUpdateStatus}>
                <h3 className="font-bold text-cyan-300">🏷️ Статус</h3>
                <select value={statusForm} onChange={(event) => setStatusForm(event.target.value)} className="w-full">
                  {statusOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button className="primary w-full" type="submit">
                  ✓ Обновить статус
                </button>
              </form>

              {/* Reset Demo */}
              <form className="bg-slate-800/30 rounded-lg p-3 space-y-3" onSubmit={handleResetDemo}>
                <h3 className="font-bold text-cyan-300">🔄 Сброс демо</h3>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={demoResetTarget}
                  onChange={(event) => setDemoResetTarget(event.target.value)}
                  placeholder="Целевой баланс (опционально)"
                  className="w-full"
                />
                <button className="primary w-full" type="submit">
                  ✓ Сбросить демо баланс
                </button>
              </form>

              {/* Demo Settings */}
              <form className="bg-slate-800/30 rounded-lg p-3 space-y-3" onSubmit={handleSaveDemoSettings}>
                <h3 className="font-bold text-cyan-300">⚙️ Настройки демо</h3>
                <select
                  value={String(demoSettingsForm.enabled)}
                  onChange={(event) =>
                    setDemoSettingsForm((prev) => ({ ...prev, enabled: event.target.value === "true" }))
                  }
                  className="w-full"
                >
                  <option value="true">Включено</option>
                  <option value="false">Отключено</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={demoSettingsForm.initialBalance}
                  onChange={(event) => setDemoSettingsForm((prev) => ({ ...prev, initialBalance: event.target.value }))}
                  placeholder="Стартовый баланс"
                  className="w-full"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={demoSettingsForm.topupThreshold}
                  onChange={(event) => setDemoSettingsForm((prev) => ({ ...prev, topupThreshold: event.target.value }))}
                  placeholder="Порог автопополнения"
                  className="w-full"
                />
                <div className="flex gap-2">
                  <button type="button" className="secondary flex-1" onClick={handleClearDemoSettings}>
                    Удалить кастомизацию
                  </button>
                  <button className="primary flex-1" type="submit">
                    ✓ Сохранить
                  </button>
                </div>
              </form>

              {/* Risk Events */}
              <div className="bg-slate-800/30 rounded-lg p-3">
                <h3 className="font-bold text-cyan-300 mb-3">⚠️ Риск-события ({riskEvents.length})</h3>
                <div className="table-container">
                  <table className="table text-sm">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Тип</th>
                        <th>Серьёзность</th>
                        <th>Создано</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskEvents.length === 0 && (
                        <tr>
                          <td colSpan={4} className="table-cell-empty">
                            Активных событий нет
                          </td>
                        </tr>
                      )}
                      {riskEvents.map((event) => (
                        <tr key={event.id}>
                          <td className="font-mono text-cyan-400 text-xs">{event.id}</td>
                          <td className="text-xs">{event.event_type || event.type}</td>
                          <td>
                            <span
                              className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                                event.severity === "high"
                                  ? "bg-red-500/15 text-red-300"
                                  : event.severity === "medium"
                                    ? "bg-yellow-500/15 text-yellow-300"
                                    : "bg-blue-500/15 text-blue-300"
                              }`}
                            >
                              {event.severity}
                            </span>
                          </td>
                          <td className="text-xs text-slate-500">
                            {event.created_at ? new Date(event.created_at).toLocaleString("ru-RU") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default AdminPlayersPage
