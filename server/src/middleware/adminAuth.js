const { verifyToken } = require('../services/adminAuthService');

const getClientIp = req => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip;
};

const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ');
    const token = parts.length === 2 && /^Bearer$/i.test(parts[0]) ? parts[1] : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Admin token required' });
    }

    const { adminId, sessionId } = await verifyToken({ token, ip: getClientIp(req) });
    req.admin = { id: adminId, sessionId, token };
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: error.message || 'Admin authentication failed' });
  }
};

module.exports = adminAuth;
