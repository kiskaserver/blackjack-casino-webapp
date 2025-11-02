const crypto = require('crypto');
const config = require('../config/env');

const toBuffer = payload => {
  if (Buffer.isBuffer(payload)) {
    return payload;
  }
  if (typeof payload === 'string') {
    return Buffer.from(payload, 'utf8');
  }
  return Buffer.from(JSON.stringify(payload));
};

const encodePayload = payload => toBuffer(payload).toString('base64');

const signPayload = payload => crypto
  .createHash('md5')
  .update(encodePayload(payload) + config.cryptomus.apiKey)
  .digest('hex');

const buildHeaders = payload => ({
  merchant: config.cryptomus.merchantId,
  sign: signPayload(payload)
});

module.exports = {
  toBuffer,
  encodePayload,
  signPayload,
  buildHeaders
};
