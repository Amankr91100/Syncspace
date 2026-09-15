export const required = (body, fields) => {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) {
    const err = new Error(`Missing required ${missing.length > 1 ? 'fields' : 'field'}: ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }
};

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
