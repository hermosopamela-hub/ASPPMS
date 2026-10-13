// Settings that come from the environment, read in one place.
module.exports = {
  PROD: process.env.NODE_ENV === 'production',
  PORT: process.env.PORT || 8080, // Cloud Run provides PORT
};
