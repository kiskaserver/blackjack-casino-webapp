import { useCallback, useEffect, useMemo, useState } from "react"
import ReactQuill from "react-quill"
import "react-quill/dist/quill.snow.css"
import { useAdmin } from "../../providers/AdminProvider.jsx"

const statusOptions = [
  { value: "active", label: "Активные" },
  { value: "suspended", label: "Замороженные" },
  { value: "limited", label: "Ограниченные" },
  { value: "verified", label: "VIP" },
  { value: "banned", label: "Заблокированные" },
]

const verificationOptions = [
  { value: "unverified", label: "Без верификации" },
  { value: "pending", label: "Ожидает" },
  { value: "verified", label: "Подтверждена" },
  { value: "rejected", label: "Отклонена" },
  { value: "review", label: "На пересмотре" },
]

const quillModules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
}

const defaultFormState = {
  name: "",
  description: "",
  inactivityHours: 72,
  repeatCooldownHours: 72,
  batchSize: 200,
  targetScope: "all",
  targetStatuses: [],
  targetVerificationStatuses: [],
  targetTrusted: "any",
  targetTelegramIds: "",
  messageHtml: "<p>Привет, {username}! Мы скучаем по вам в казино 🔔</p>",
  enabled: true,
}

const formatHours = (hours) => {
  if (!hours || hours < 24) {
    return `${hours} ч.`
  }
  const days = (hours / 24).toFixed(hours % 24 === 0 ? 0 : 1)
  return `${days} дн.`
}

const formatTimestamp = (value) => {
  if (!value) {
    return "—"
  }
  try {
    return new Date(value).toLocaleString("ru-RU")
  } catch (_err) {
    return String(value)
  }
}

const AdminAutoMessagesPage = () => {
  const { api } = useAdmin()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState([])
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState("create")
  const [currentId, setCurrentId] = useState(null)
  const [form, setForm] = useState(defaultFormState)

  const showNotice = useCallback((text) => {
    setNotice(text)
    window.setTimeout(() => setNotice(""), 3000)
  }, [])

  const resetForm = useCallback(() => {
    setForm(defaultFormState)
    setCurrentId(null)
    setEditorMode("create")
  }, [])

  const hydrateForm = useCallback((template) => {
    setForm({
      name: template.name || "",
      description: template.description || "",
      inactivityHours: template.inactivity_threshold_hours ?? 72,
      repeatCooldownHours: template.repeat_cooldown_hours ?? 72,
      batchSize: template.batch_size ?? 200,
      targetScope: template.target_scope || "all",
      targetStatuses: Array.isArray(template.target_filters?.statuses) ? template.target_filters.statuses : [],
      targetVerificationStatuses: Array.isArray(template.target_filters?.verification_statuses)
        ? template.target_filters.verification_statuses
        : [],
      targetTrusted:
        typeof template.target_filters?.trusted === "boolean"
          ? template.target_filters.trusted
            ? "trusted"
            : "untrusted"
          : "any",
      targetTelegramIds: Array.isArray(template.target_player_telegram_ids)
        ? template.target_player_telegram_ids.join(", ")
        : "",
      messageHtml: template.message_html || "",
      enabled: Boolean(template.enabled),
    })
  }, [])

  const loadTemplates = useCallback(async () => {
    if (!api) {
      return
    }
    setLoading(true)
    setError("")
    try {
      const data = await api.listAutoMessages()
      setTemplates(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || "Не удалось загрузить шаблоны")
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const openCreate = () => {
    resetForm()
    setEditorMode("create")
    setEditorOpen(true)
  }

  const openEdit = (template) => {
    hydrateForm(template)
    setCurrentId(template.id)
    setEditorMode("edit")
    setEditorOpen(true)
  }

  const handleDelete = async (template) => {
    if (!api) {
      return
    }
    const confirm = window.confirm(`Удалить шаблон «${template.name}»?`)
    if (!confirm) {
      return
    }
    setSaving(true)
    setError("")
    try {
      await api.deleteAutoMessage(template.id)
      showNotice("Шаблон удалён")
      await loadTemplates()
    } catch (err) {
      setError(err.message || "Не удалось удалить шаблон")
    } finally {
      setSaving(false)
    }
  }

  const handleTrigger = async (template) => {
    if (!api) {
      return
    }
    setSaving(true)
    setError("")
    try {
      const result = await api.triggerAutoMessage(template.id)
      showNotice(`В очередь отправлено: ${result?.queued ?? 0}`)
      await loadTemplates()
    } catch (err) {
      setError(err.message || "Не удалось запустить шаблон")
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (template) => {
    if (!api) {
      return
    }
    const telegramId = window.prompt("Введите Telegram ID игрока для тестовой отправки")
    if (!telegramId) {
      return
    }
    setSaving(true)
    setError("")
    try {
      await api.testAutoMessage(template.id, { telegramId })
      showNotice("Тестовое сообщение отправлено")
    } catch (err) {
      setError(err.message || "Не удалось выполнить тестовую отправку")
    } finally {
      setSaving(false)
    }
  }

  const buildPayload = () => {
  const inactivityHours = Math.max(1, Number(form.inactivityHours || 0))
    const repeatCooldownHours = Math.max(0, Number(form.repeatCooldownHours || 0))
    const batchSize = Math.max(1, Number(form.batchSize || 0))

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      messageHtml: form.messageHtml,
      inactivityThresholdHours: inactivityHours,
      repeatCooldownHours,
      batchSize,
      targetScope: form.targetScope,
      enabled: Boolean(form.enabled),
    }

    if (form.targetScope === "filters") {
      payload.targetFilters = {
        statuses: form.targetStatuses,
        verification_statuses: form.targetVerificationStatuses,
      }
      if (form.targetTrusted === "trusted") {
        payload.targetFilters.trusted = true
      } else if (form.targetTrusted === "untrusted") {
        payload.targetFilters.trusted = false
      }
    } else if (form.targetScope === "list") {
      payload.targetTelegramIds = form.targetTelegramIds
        .split(/[,\s]+/)
        .map((value) => value.trim())
        .filter(Boolean)
    }

    return payload
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!api) {
      return
    }
    setSaving(true)
    setError("")
    try {
      const payload = buildPayload()
      if (!payload.name) {
        throw new Error("Укажите название шаблона")
      }
      if (!payload.messageHtml || !payload.messageHtml.trim()) {
        throw new Error("Текст сообщения пустой")
      }

      if (editorMode === "create") {
        await api.createAutoMessage(payload)
        showNotice("Шаблон создан")
      } else if (currentId) {
        await api.updateAutoMessage(currentId, payload)
        showNotice("Шаблон обновлён")
      }

      await loadTemplates()
      setEditorOpen(false)
      resetForm()
    } catch (err) {
      setError(err.message || "Не удалось сохранить шаблон")
    } finally {
      setSaving(false)
    }
  }

  const rows = useMemo(() => templates, [templates])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🎯 Авто-сообщения</h1>
          <p className="text-sm text-slate-400">Настраивайте ремаркетинг по неактивным игрокам прямо из админки</p>
        </div>
        <button className="primary" onClick={openCreate} disabled={saving}>
          ➕ Новый шаблон
        </button>
      </header>

      {notice && <div className="alert success">{notice}</div>}
      {error && <div className="alert error">{error}</div>}

      <section className="card">
        {loading ? (
          <p className="text-slate-400">Загрузка шаблонов…</p>
        ) : rows.length === 0 ? (
          <p className="text-slate-400">Пока шаблонов нет. Создайте первый, чтобы возвращать игроков.</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Активность</th>
                  <th>Повтор</th>
                  <th>Аудитория</th>
                  <th>Состояние</th>
                  <th>Последний запуск</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((template) => (
                  <tr key={template.id}>
                    <td>
                      <div className="flex flex-col">
                        <strong>{template.name}</strong>
                        {template.description && <span className="text-xs text-slate-400">{template.description}</span>}
                      </div>
                    </td>
                    <td>{formatHours(template.inactivity_threshold_hours)}</td>
                    <td>{formatHours(template.repeat_cooldown_hours)}</td>
                    <td>
                      {template.target_scope === "all" && (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-slate-800/60 text-xs text-slate-100">
                          Все
                        </span>
                      )}
                      {template.target_scope === "filters" && (
                        <div className="flex flex-col text-xs text-slate-300">
                          {template.target_filters?.statuses?.length ? (
                            <span>Статусы: {template.target_filters.statuses.join(", ")}</span>
                          ) : (
                            <span>Все статусы</span>
                          )}
                          {template.target_filters?.verification_statuses?.length ? (
                            <span>Верификация: {template.target_filters.verification_statuses.join(", ")}</span>
                          ) : (
                            <span>Все статусы KYC</span>
                          )}
                          {typeof template.target_filters?.trusted === "boolean" && (
                            <span>{template.target_filters.trusted ? "Только доверенные" : "Только новые"}</span>
                          )}
                        </div>
                      )}
                      {template.target_scope === "list" && (
                        <span className="text-xs text-slate-300">
                          {template.target_player_telegram_ids?.length || 0} получателей
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                          template.enabled
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-800/60 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {template.enabled ? "Включено" : "Выключено"}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col text-xs text-slate-300">
                        <span>{formatTimestamp(template.last_run_at)}</span>
                        <span className="opacity-70">
                          Запущено: {template.last_run_queued || 0} · {template.last_run_status || "—"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button className="secondary" onClick={() => openEdit(template)} disabled={saving}>
                          ✏️ Править
                        </button>
                        <button className="secondary" onClick={() => handleTrigger(template)} disabled={saving}>
                          ▶️ Запуск
                        </button>
                        <button className="secondary" onClick={() => handleTest(template)} disabled={saving}>
                          🧪 Тест
                        </button>
                        <button className="danger" onClick={() => handleDelete(template)} disabled={saving}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-2">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                {editorMode === "create" ? "Новый авто-месседж" : "Редактирование шаблона"}
              </h2>
              <button
                type="button"
                className="text-slate-400 hover:text-white transition-colors"
                onClick={() => setEditorOpen(false)}
                disabled={saving}
                aria-label="Закрыть"
              >
                ✖
              </button>
            </header>
            <form className="px-6 py-4 space-y-4 max-h-[80vh] overflow-y-auto" onSubmit={handleSubmit}>
              <div className="grid gap-3">
                <label className="grid gap-1">
                  <span>Название</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                    disabled={saving}
                  />
                </label>
                <label className="grid gap-1">
                  <span>Описание</span>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    disabled={saving}
                  />
                </label>
                <label className="grid gap-1">
                  <span>Игрок не заходил (часы)</span>
                  <input
                    type="number"
                    min="1"
                    value={form.inactivityHours}
                    onChange={(event) => setForm((prev) => ({ ...prev, inactivityHours: event.target.value }))}
                    disabled={saving}
                  />
                </label>
                <label className="grid gap-1">
                  <span>Пауза между отправками (часы)</span>
                  <input
                    type="number"
                    min="0"
                    value={form.repeatCooldownHours}
                    onChange={(event) => setForm((prev) => ({ ...prev, repeatCooldownHours: event.target.value }))}
                    disabled={saving}
                  />
                </label>
                <label className="grid gap-1">
                  <span>Максимум за проход</span>
                  <input
                    type="number"
                    min="1"
                    value={form.batchSize}
                    onChange={(event) => setForm((prev) => ({ ...prev, batchSize: event.target.value }))}
                    disabled={saving}
                  />
                </label>
                <label className="grid gap-1">
                  <span>Аудитория</span>
                  <select
                    value={form.targetScope}
                    onChange={(event) => setForm((prev) => ({ ...prev, targetScope: event.target.value }))}
                    disabled={saving}
                  >
                    <option value="all">Все игроки</option>
                    <option value="filters">По фильтрам</option>
                    <option value="list">Определённые Telegram ID</option>
                  </select>
                </label>

                {form.targetScope === "filters" && (
                  <div className="grid gap-2 border border-slate-700 rounded-lg p-3">
                    <div className="grid gap-1">
                      <span className="text-sm text-slate-300">Статусы</span>
                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map((option) => (
                          <label key={option.value} className="inline-flex items-center gap-1 text-sm text-slate-200">
                            <input
                              type="checkbox"
                              checked={form.targetStatuses.includes(option.value)}
                              onChange={(event) => {
                                setForm((prev) => {
                                  const next = new Set(prev.targetStatuses)
                                  if (event.target.checked) {
                                    next.add(option.value)
                                  } else {
                                    next.delete(option.value)
                                  }
                                  return { ...prev, targetStatuses: Array.from(next) }
                                })
                              }}
                              disabled={saving}
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-sm text-slate-300">Статус KYC</span>
                      <div className="flex flex-wrap gap-2">
                        {verificationOptions.map((option) => (
                          <label key={option.value} className="inline-flex items-center gap-1 text-sm text-slate-200">
                            <input
                              type="checkbox"
                              checked={form.targetVerificationStatuses.includes(option.value)}
                              onChange={(event) => {
                                setForm((prev) => {
                                  const next = new Set(prev.targetVerificationStatuses)
                                  if (event.target.checked) {
                                    next.add(option.value)
                                  } else {
                                    next.delete(option.value)
                                  }
                                  return { ...prev, targetVerificationStatuses: Array.from(next) }
                                })
                              }}
                              disabled={saving}
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-sm text-slate-300">Доверенные игроки</span>
                      <div className="flex gap-3 text-sm text-slate-200">
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="radio"
                            name="targetTrusted"
                            value="any"
                            checked={form.targetTrusted === "any"}
                            onChange={(event) => setForm((prev) => ({ ...prev, targetTrusted: event.target.value }))}
                            disabled={saving}
                          />
                          Все
                        </label>
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="radio"
                            name="targetTrusted"
                            value="trusted"
                            checked={form.targetTrusted === "trusted"}
                            onChange={(event) => setForm((prev) => ({ ...prev, targetTrusted: event.target.value }))}
                            disabled={saving}
                          />
                          Только доверенные
                        </label>
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="radio"
                            name="targetTrusted"
                            value="untrusted"
                            checked={form.targetTrusted === "untrusted"}
                            onChange={(event) => setForm((prev) => ({ ...prev, targetTrusted: event.target.value }))}
                            disabled={saving}
                          />
                          Только новые
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {form.targetScope === "list" && (
                  <label className="grid gap-1">
                    <span>Telegram ID (через запятую или перенос строки)</span>
                    <textarea
                      rows={3}
                      value={form.targetTelegramIds}
                      onChange={(event) => setForm((prev) => ({ ...prev, targetTelegramIds: event.target.value }))}
                      disabled={saving}
                    />
                  </label>
                )}

                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
                    disabled={saving}
                  />
                  <span>Шаблон активен</span>
                </label>

                <div className="grid gap-2">
                  <span className="text-sm text-slate-300">Сообщение</span>
                  <ReactQuill
                    theme="snow"
                    value={form.messageHtml}
                    onChange={(value) => setForm((prev) => ({ ...prev, messageHtml: value }))}
                    modules={quillModules}
                    readOnly={saving}
                    className="bg-slate-900/40"
                  />
                  <small className="text-xs text-slate-400">
                    Доступные плейсхолдеры: {"{"}username{"}"}, {"{"}first_name{"}"}, {"{"}last_name{"}"}, {"{"}balance{"}"}, {"{"}demo_balance{"}"}
                  </small>
                </div>
              </div>

              <footer className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setEditorOpen(false)}
                  disabled={saving}
                >
                  Отмена
                </button>
                <button type="submit" className="primary" disabled={saving}>
                  {editorMode === "create" ? "Создать" : "Сохранить"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminAutoMessagesPage
