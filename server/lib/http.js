// An error that should reach the browser as a specific status and message.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wraps a route so a thrown error becomes a JSON response instead of an unhandled rejection.
// `fallback(err)` builds the message for errors that are not HttpErrors.
const route = (fallback) => (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: fallback(err) });
  }
};

// Dashboard data routes: return the object, it is sent as JSON.
const wrap = (fn) => route((err) => err.message)(async (req, res) => res.json(await fn(req)));
// Sign-in routes: never show internal error text to a visitor.
const handle = route(() => 'Something went wrong. Please try again.');

module.exports = { HttpError, wrap, handle };
