const sendSuccess = (res, data = {}, status = 200) => {
  res.status(status).json({ success: true, data });
};

const buildErrorMessage = (error, fallback) => {
  if (!error) {
    return fallback;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error.publicMessage) {
    return error.publicMessage;
  }
  if (error.message) {
    return error.message;
  }
  return fallback;
};

const sendError = (res, error, status = 400, options = {}) => {
  const safeStatus = Number.isInteger(status) ? status : 400;
  const defaultMessage = safeStatus >= 500 ? 'Internal server error' : 'Request failed';
  const publicMessage = options.publicMessage || buildErrorMessage(error, defaultMessage);
  const payload = {
    success: false,
    error: safeStatus >= 500 ? defaultMessage : publicMessage
  };
  res.status(safeStatus).json(payload);
};

module.exports = {
  sendSuccess,
  sendError
};
