export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export const parseJson = async response => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
};

export const handleResponse = async response => {
  const payload = await parseJson(response);
  if (!response.ok || payload?.success === false) {
    const message = payload?.error || response.statusText || 'Request failed';
    throw new ApiError(message, response.status, payload);
  }
  return payload?.data ?? payload;
};
