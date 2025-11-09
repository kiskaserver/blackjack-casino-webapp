const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const config = require('../config/env');
const { log } = require('../utils/logger');
const playerRepository = require('../repositories/playerRepository');
const playerMessageRepository = require('../repositories/playerMessageRepository');
const { notificationQueue } = require('../jobs/notificationQueue');
const { JOBS } = require('../jobs/constants');

const TELEGRAM_MAX_LENGTH = 4096;
const ALLOWED_PLAYER_STATUSES = ['active', 'suspended', 'limited', 'verified', 'banned'];
const ALLOWED_TARGET_SCOPES = ['all', 'filters', 'list'];

const normalizeNumber = (value, { min = 0, max = null, fallback = 0 } = {}) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error('Ожидается числовое значение');
  }
  if (num < min) {
    throw new Error(`Значение должно быть не меньше ${min}`);
  }
  if (max !== null && num > max) {
    throw new Error(`Значение должно быть не больше ${max}`);
  }
  return Math.floor(num);
};

const sanitizeTemplateHtml = html => sanitizeHtml(html || '', {
  allowedTags: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'span',
    'code',
    'pre',
    'a',
    'ul',
    'ol',
    'li'
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    span: ['class'],
    code: ['class'],
    '*': []
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' })
  },
  parser: {
    lowerCaseTags: true
  }
});

const TELEGRAM_ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'code', 'pre', 'a', 'tg-spoiler'];

const sanitizeForTelegram = html => {
  const sanitized = sanitizeHtml(html || '', {
    allowedTags: [...TELEGRAM_ALLOWED_TAGS, 'br', 'p'],
    allowedAttributes: {
      a: ['href']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      p: () => ({ tagName: 'p', attribs: {} })
    },
    parser: {
      lowerCaseTags: true
    }
  });

  const withoutParagraphs = sanitized
    .replace(/\r/g, '')
    .replace(/<\/?p[^>]*>/gi, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n');

  const compressedNewlines = withoutParagraphs
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return compressedNewlines;
};

const buildPlainText = html => sanitizeHtml(html || '', {
  allowedTags: [],
  allowedAttributes: {}
}).replace(/\s+$/g, '').replace(/\n{3,}/g, '\n\n');

const placeholderMap = player => ({
  username: player.username || '',
  first_name: player.first_name || '',
  last_name: player.last_name || '',
  balance: Number(player.balance || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 }),
  demo_balance: Number(player.demo_balance || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 }),
  telegram_id: player.telegram_id || '',
  last_seen_at: player.last_seen_at ? new Date(player.last_seen_at).toLocaleString('ru-RU') : '',
  last_game_at: player.last_game_at ? new Date(player.last_game_at).toLocaleString('ru-RU') : ''
});

const applyPlaceholders = (templateString, player) => {
  if (!templateString) {
    return '';
  }
  const data = placeholderMap(player);
  return templateString.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => {
    const normalizedKey = String(key || '').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(data, normalizedKey)) {
      return data[normalizedKey];
    }
    return '';
  });
};

const renderTemplateForPlayer = (template, player) => {
  const withPlaceholders = applyPlaceholders(template.message_html, player);
  const telegramReady = sanitizeForTelegram(withPlaceholders);
  const plain = buildPlainText(telegramReady);
  return {
    html: telegramReady,
    text: plain
  };
};

const validateTemplatePayload = rawPayload => {
  if (!rawPayload || typeof rawPayload !== 'object') {
    throw new Error('Некорректное тело запроса');
  }

  const name = String(rawPayload.name || '').trim();
  if (!name) {
    throw new Error('Укажите название сообщения');
  }

  const messageHtml = sanitizeTemplateHtml(rawPayload.messageHtml || rawPayload.message_html || '');
  const messagePlain = buildPlainText(messageHtml);
  const plainPreview = messagePlain.trim();
  if (!plainPreview) {
    throw new Error('Текст сообщения не может быть пустым');
  }

  const inactivityThresholdHours = normalizeNumber(
    rawPayload.inactivityThresholdHours ?? rawPayload.inactivity_threshold_hours,
    { min: 1, max: 24 * 90, fallback: 24 }
  );

  const repeatCooldownHours = normalizeNumber(
    rawPayload.repeatCooldownHours ?? rawPayload.repeat_cooldown_hours,
    { min: 0, max: 24 * 365, fallback: 72 }
  );

  const batchSize = normalizeNumber(rawPayload.batchSize ?? rawPayload.batch_size ?? 200, {
    min: 1,
    max: 2000,
    fallback: 200
  });

  const targetScope = String(rawPayload.targetScope ?? rawPayload.target_scope ?? 'all').toLowerCase();
  if (!ALLOWED_TARGET_SCOPES.includes(targetScope)) {
    throw new Error('Некорректный тип аудитории');
  }

  let targetFilters = {};
  let targetPlayerTelegramIds = [];

  if (targetScope === 'filters') {
    const rawFilters = rawPayload.targetFilters ?? rawPayload.target_filters ?? {};
    const statuses = Array.isArray(rawFilters.statuses)
      ? rawFilters.statuses.filter(status => ALLOWED_PLAYER_STATUSES.includes(String(status)))
      : [];

    const verificationStatuses = Array.isArray(rawFilters.verification_statuses)
      ? rawFilters.verification_statuses.filter(value => typeof value === 'string' && value.trim().length)
      : [];

    let trusted;
    if (typeof rawFilters.trusted === 'boolean') {
      trusted = rawFilters.trusted;
    } else if (String(rawFilters.trusted).toLowerCase() === 'true') {
      trusted = true;
    } else if (String(rawFilters.trusted).toLowerCase() === 'false') {
      trusted = false;
    }

    targetFilters = {
      statuses,
      verification_statuses: verificationStatuses,
      ...(typeof trusted === 'boolean' ? { trusted } : {})
    };
  } else if (targetScope === 'list') {
    const rawList = rawPayload.targetTelegramIds
      ?? rawPayload.target_player_telegram_ids
      ?? rawPayload.telegramIds
      ?? '';

    if (Array.isArray(rawList)) {
      targetPlayerTelegramIds = rawList.map(value => String(value).trim()).filter(Boolean);
    } else if (typeof rawList === 'string') {
      targetPlayerTelegramIds = rawList
        .split(/[,\s]+/)
        .map(value => value.trim())
        .filter(Boolean);
    }

    if (!targetPlayerTelegramIds.length) {
      throw new Error('Укажите хотя бы один Telegram ID для рассылки');
    }
  }

  const enabledRaw = rawPayload.enabled;
  const enabled = typeof enabledRaw === 'boolean'
    ? enabledRaw
    : String(enabledRaw ?? 'true').toLowerCase() !== 'false';

  return {
    name,
    description: String(rawPayload.description || '').trim(),
    trigger_type: 'inactivity',
    inactivity_threshold_hours: inactivityThresholdHours,
    repeat_cooldown_hours: repeatCooldownHours,
    batch_size: batchSize,
    target_scope: targetScope,
    target_filters: targetFilters,
    target_player_telegram_ids: targetPlayerTelegramIds,
    message_html: messageHtml,
  message_plain: messagePlain,
    allow_html: true,
    enabled,
    metadata: rawPayload.metadata && typeof rawPayload.metadata === 'object' ? rawPayload.metadata : {}
  };
};

const ensureBotToken = () => {
  if (!config.telegramStars?.botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан');
  }
};

const sendTelegramMessage = async ({ chatId, html, text }) => {
  ensureBotToken();
  const payload = {
    chat_id: chatId,
    text: html && html.length <= TELEGRAM_MAX_LENGTH ? html : (text || html || ''),
    parse_mode: html && html.length <= TELEGRAM_MAX_LENGTH ? 'HTML' : undefined,
    disable_web_page_preview: true
  };

  if (!payload.text || !payload.text.trim()) {
    throw new Error('Пустое сообщение после обработки');
  }

  if (payload.text.length > TELEGRAM_MAX_LENGTH) {
    payload.text = `${payload.text.slice(0, TELEGRAM_MAX_LENGTH - 3)}...`;
    payload.parse_mode = undefined;
  }

  const url = `https://api.telegram.org/bot${config.telegramStars.botToken}/sendMessage`;
  const { data } = await axios.post(url, payload, { timeout: 10_000 });
  return data;
};

const listTemplates = () => playerMessageRepository.listTemplates();

const createTemplate = async ({ payload, adminId }) => {
  const normalized = validateTemplatePayload(payload);
  return playerMessageRepository.createTemplate({ ...normalized, created_by: adminId || null, updated_by: adminId || null });
};

const updateTemplate = async ({ id, payload, adminId }) => {
  const existing = await playerMessageRepository.getTemplateById(id);
  if (!existing) {
    throw new Error('Шаблон не найден');
  }

  const merged = {
    name: payload.name ?? existing.name,
    description: payload.description ?? existing.description,
    messageHtml: payload.messageHtml ?? payload.message_html ?? existing.message_html,
    inactivityThresholdHours: payload.inactivityThresholdHours ?? payload.inactivity_threshold_hours ?? existing.inactivity_threshold_hours,
    repeatCooldownHours: payload.repeatCooldownHours ?? payload.repeat_cooldown_hours ?? existing.repeat_cooldown_hours,
    batchSize: payload.batchSize ?? payload.batch_size ?? existing.batch_size,
    targetScope: payload.targetScope ?? payload.target_scope ?? existing.target_scope,
    targetFilters: payload.targetFilters ?? payload.target_filters ?? existing.target_filters,
    targetTelegramIds:
      payload.targetTelegramIds
      ?? payload.target_player_telegram_ids
      ?? existing.target_player_telegram_ids,
    enabled: payload.enabled ?? existing.enabled,
    metadata: payload.metadata ?? existing.metadata
  };

  const normalized = validateTemplatePayload({
    ...merged,
    target_filters: merged.targetFilters,
    target_player_telegram_ids: merged.targetTelegramIds
  });

  return playerMessageRepository.updateTemplate(id, { ...normalized, updated_by: adminId || null });
};

const deleteTemplate = id => playerMessageRepository.deleteTemplate(id);

const enqueueDeliveriesForTemplate = async template => {
  if (!template.enabled) {
    return { queued: 0, skipped: true, reason: 'disabled' };
  }
  if (template.trigger_type !== 'inactivity') {
    await playerMessageRepository.markTemplateError({ templateId: template.id, error: 'unsupported trigger type' });
    return { queued: 0, skipped: true, reason: 'unsupported' };
  }

  try {
    const players = await playerMessageRepository.findEligiblePlayersForInactivityTemplate({
      templateId: template.id,
      inactivityHours: Number(template.inactivity_threshold_hours || 0),
      repeatCooldownHours: Number(template.repeat_cooldown_hours || 0),
      targetScope: template.target_scope,
      targetFilters: template.target_filters || {},
      telegramIds: template.target_player_telegram_ids || [],
      limit: Number(template.batch_size || 200)
    });

    if (!players.length) {
      await playerMessageRepository.updateTemplateRunStats({ templateId: template.id, queued: 0, status: 'idle', error: null });
      return { queued: 0, skipped: false, reason: 'no-players' };
    }

    await Promise.all(
      players.map(player =>
        notificationQueue.add(
          JOBS.NOTIFICATION_DELIVERY,
          { templateId: template.id, playerId: player.id },
          {
            removeOnComplete: true,
            removeOnFail: 50,
            attempts: 3,
            backoff: { type: 'exponential', delay: 60_000 }
          }
        )
      )
    );

    await playerMessageRepository.updateTemplateRunStats({ templateId: template.id, queued: players.length, status: 'queued', error: null });
    return { queued: players.length, skipped: false };
  } catch (error) {
    log.error('Failed to enqueue auto messages', { templateId: template.id, error: error.message });
    await playerMessageRepository.markTemplateError({ templateId: template.id, error: error.message });
    return { queued: 0, skipped: true, reason: 'error', error: error.message };
  }
};

const enqueueDueMessages = async () => {
  const templates = await playerMessageRepository.listEnabledTemplates();
  for (const template of templates) {
    await enqueueDeliveriesForTemplate(template);
  }
};

const triggerTemplate = async id => {
  const template = await playerMessageRepository.getTemplateById(id);
  if (!template) {
    throw new Error('Шаблон не найден');
  }
  const result = await enqueueDeliveriesForTemplate(template);
  return { template, result };
};

const deliverMessage = async ({ templateId, playerId, overrideChatId = null, testMode = false }) => {
  const template = await playerMessageRepository.getTemplateById(templateId);
  if (!template) {
    throw new Error('Шаблон сообщения не найден');
  }

  const player = await playerRepository.getPlayerById(playerId);
  if (!player || !player.telegram_id) {
    return { skipped: true, reason: 'missing-player' };
  }

  if (!testMode && template.trigger_type === 'inactivity') {
    const inactivityHours = Number(template.inactivity_threshold_hours || 0);
    if (inactivityHours > 0 && player.last_seen_at) {
      const lastSeenMs = new Date(player.last_seen_at).getTime();
      if (!Number.isNaN(lastSeenMs)) {
        const diffHours = (Date.now() - lastSeenMs) / (1000 * 60 * 60);
        if (diffHours < inactivityHours) {
          return { skipped: true, reason: 'recent-activity' };
        }
      }
    }
  }

  const { html, text } = renderTemplateForPlayer(template, player);
  try {
    const response = await sendTelegramMessage({ chatId: overrideChatId || player.telegram_id, html, text });
    if (!testMode) {
      await playerMessageRepository.recordDelivery({
        template_id: templateId,
        player_id: playerId,
        telegram_chat_id: overrideChatId || player.telegram_id,
        status: 'sent',
        metadata: { telegramResponse: response?.result ? { message_id: response.result.message_id } : {} },
        rendered_html: html,
        rendered_text: text
      });
    }
    return { sent: true, response };
  } catch (error) {
    const errorMessage = error.response?.data?.description || error.message || 'Failed to send message';
    log.warn('Auto message delivery failed', {
      templateId,
      playerId,
      error: errorMessage
    });
    if (!testMode) {
      await playerMessageRepository.recordDelivery({
        template_id: templateId,
        player_id: playerId,
        telegram_chat_id: overrideChatId || player.telegram_id,
        status: 'failed',
        error_message: errorMessage,
        metadata: { telegramStatus: error.response?.status || null },
        rendered_html: html,
        rendered_text: text
      });
    }
    return { sent: false, error: errorMessage };
  }
};

const sendTestMessage = async ({ templateId, telegramId }) => {
  const template = await playerMessageRepository.getTemplateById(templateId);
  if (!template) {
    throw new Error('Шаблон сообщения не найден');
  }

  const targetTelegramId = String(telegramId || '').trim();
  if (!targetTelegramId) {
    throw new Error('Укажите Telegram ID для теста');
  }

  const player = await playerRepository.findPlayerByTelegramId(targetTelegramId);
  if (!player) {
    throw new Error('Игрок с указанным Telegram ID не найден');
  }

  return deliverMessage({ templateId, playerId: player.id, overrideChatId: targetTelegramId, testMode: true });
};

module.exports = {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  enqueueDueMessages,
  triggerTemplate,
  deliverMessage,
  sendTestMessage
};
