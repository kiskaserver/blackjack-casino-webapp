const { URL, domainToASCII } = require('url');
const { log } = require('./logger');

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const normalize = value => {
  if (!value) {
    return '';
  }
  const trimmed = String(value).trim().toLowerCase().replace(/\.$/, '');
  try {
    const ascii = domainToASCII(trimmed);
    if (ascii) {
      return ascii;
    }
  } catch (_error) {
    // domainToASCII throws on malformed input; fall back to trimmed value
  }
  return trimmed;
};

const hostMatches = (host, pattern) => {
  if (!host || !pattern) {
    return false;
  }
  const normalizedHost = normalize(host);
  const normalizedPattern = normalize(pattern);
  if (!normalizedHost || !normalizedPattern) {
    return false;
  }
  if (normalizedPattern.startsWith('*.')) {
    const suffix = normalizedPattern.slice(2);
    return normalizedHost === suffix || normalizedHost.endsWith(`.${suffix}`);
  }
  return normalizedHost === normalizedPattern;
};

const isHostAllowed = (host, allowedHosts = []) => {
  if (!allowedHosts || allowedHosts.length === 0) {
    return false;
  }
  return allowedHosts.some(pattern => hostMatches(host, pattern));
};

const isUrlAllowed = (value, { allowedHosts = [], allowLocalhostFallback = false } = {}) => {
  if (!value) {
    return false;
  }
  try {
    const parsed = new URL(String(value).trim());
    const protocol = parsed.protocol.toLowerCase();
    const host = normalize(parsed.hostname);
    const isHttps = protocol === 'https:';
    const isLocalHttp = protocol === 'http:' && LOCAL_HOSTS.has(host);

    if (!isHttps && !isLocalHttp) {
      log.warn('Rejected verification URL due to unsupported protocol', { url: value, protocol });
      return false;
    }

    if (allowedHosts.length > 0) {
      const allowed = isHostAllowed(host, allowedHosts);
      if (!allowed) {
        log.warn('Rejected verification URL due to disallowed host', { url: value, host, allowedHosts });
      }
      return allowed;
    }

    if (allowLocalhostFallback) {
      const allowed = LOCAL_HOSTS.has(host);
      if (!allowed) {
        log.warn('Rejected verification URL due to missing localhost fallback', { url: value, host });
      }
      return allowed;
    }

    log.warn('Rejected verification URL due to empty allowlist', { url: value, host });
    return false;
  } catch (_error) {
    log.warn('Rejected verification URL due to parse error', { url: value });
    return false;
  }
};

module.exports = {
  isHostAllowed,
  isUrlAllowed,
  LOCAL_HOSTS
};
