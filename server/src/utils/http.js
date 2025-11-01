const sendSuccess = (res, data = {}, status = 200) => {
  res.status(status).json({ success: true, data });
};

const sendError = (res, error, status = 400) => {
  res.status(status).json({ success: false, error: error.message || error });
};

module.exports = {
  sendSuccess,
  sendError
};
