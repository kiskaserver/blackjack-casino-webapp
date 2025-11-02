const axios = require('axios');
const config = require('../config/env');
const { buildHeaders } = require('../utils/cryptomus');

const normalizeResponse = (data, context) => {
  if (!data) {
    throw new Error(`${context} empty response`);
  }

  if (data.state === 'error' || data.error || data.code) {
    const message = data.message
      || data.error?.message
      || data.error?.description
      || data.code
      || 'Unknown Cryptomus error';
    throw new Error(`${context} failed: ${message}`);
  }

  return data.result || data;
};

const createPayout = async payload => {
  const headers = buildHeaders(payload);
  const { data } = await axios.post(config.cryptomus.payoutUrl, payload, { headers });
  return normalizeResponse(data, 'Payout request');
};

const fetchPayoutStatus = async ({ uuid, orderId }) => {
  if (!config.cryptomus.payoutStatusUrl) {
    return null;
  }

  const payload = uuid ? { uuid } : { order_id: orderId };
  const headers = buildHeaders(payload);
  const { data } = await axios.post(config.cryptomus.payoutStatusUrl, payload, { headers });
  return normalizeResponse(data, 'Payout status');
};

module.exports = {
  createPayout,
  fetchPayoutStatus
};
