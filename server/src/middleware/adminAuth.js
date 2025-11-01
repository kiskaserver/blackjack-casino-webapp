const crypto = require('crypto');
const config = require('../config/env');

const timingSafeEqual = (a, b) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

const adminAuth = (req, res, next) => {
  const adminId = req.headers['x-admin-id'];
  const adminSecret = req.headers['x-admin-secret'];

  if (!adminId || !adminSecret) {
    return res.status(401).json({ success: false, error: 'Missing admin credentials' });
  }

  const hasId = config.adminTelegramIds.includes(String(adminId));
  const secretOk = timingSafeEqual(adminSecret, config.adminPanelSecret);

  if (!hasId || !secretOk) {
    return res.status(403).json({ success: false, error: 'Admin access denied' });
  }

  next();
};

module.exports = adminAuth;
