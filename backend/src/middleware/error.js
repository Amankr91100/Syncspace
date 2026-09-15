export const notFound = (req, res) => res.status(404).json({ message: `No route for ${req.originalUrl}` });

export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
  if (err.code === 11000) {
    return res.status(409).json({ message: 'That value is already taken' });
  }
  if (process.env.NODE_ENV !== 'production') console.error(err);
  res.status(status).json({ message: err.message || 'Something went wrong' });
};
