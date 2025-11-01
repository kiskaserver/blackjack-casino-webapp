const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');
const { getRedisClient } = require('../config/redis');
const { log } = require('../utils/logger');

const SESSION_PREFIX = 'admin:session:';
const ISSUER = 'blackjack-admin';

const timingSafeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

const validateCredentials = ({ adminId, secret }) => {
  if (!adminId || !secret) {
    return false;
  }
  const allowedIds = config.adminTelegramIds || [];
  const hasId = allowedIds.includes(String(adminId));
  if (!hasId) {
    return false;
  }
  return timingSafeEqual(secret, config.adminPanelSecret);
};

const createSession = async ({ adminId, ip }) => {
  const client = getRedisClient();
  if (!client) {
    throw new Error('Redis недоступен');
  }
  const ttl = Math.max(60, Number(config.security?.adminSessionTtlSeconds || 3600));
  const jti = uuidv4();
  const token = jwt.sign(
    { sub: String(adminId), jti, scope: 'admin' },
    config.jwtSecret,
    { expiresIn: ttl, issuer: ISSUER }
  );
  const key = `${SESSION_PREFIX}${jti}`;
  const payload = {
    adminId: String(adminId),
    ip: ip || null,
    createdAt: new Date().toISOString()
  };
  await client.set(key, JSON.stringify(payload), 'EX', ttl);
  return { token, expiresIn: ttl, jti };
};

const verifyToken = async ({ token, ip }) => {
  if (!token) {
    throw new Error('Missing admin token');
  }
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { issuer: ISSUER });
  } catch (error) {
    throw new Error('Invalid admin token');
  }

  const client = getRedisClient();
  if (!client) {
    throw new Error('Redis недоступен');
  }

  const key = `${SESSION_PREFIX}${payload.jti}`;
  const sessionRaw = await client.get(key);
  if (!sessionRaw) {
    throw new Error('Admin session expired');
  }

  let session;
  try {
    session = JSON.parse(sessionRaw);
  } catch (error) {
    log.warn('Admin session parse failed', { jti: payload.jti, error: error.message });
    throw new Error('Admin session damaged');
  }

  if (session.ip && ip && session.ip !== ip) {
    throw new Error('Admin session IP mismatch');
  }

  return {
    adminId: session.adminId || payload.sub,
    sessionId: payload.jti
  };
};

const revokeSession = async sessionId => {
  if (!sessionId) {
    return;
  }
  const client = getRedisClient();
  if (!client) {
    return;
  }
  const key = `${SESSION_PREFIX}${sessionId}`;
  await client.del(key);
};

module.exports = {
  validateCredentials,
  createSession,
  verifyToken,
  revokeSession
};
