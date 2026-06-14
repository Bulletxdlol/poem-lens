module.exports = function handler(_req, res) {
  res.status(200).json({ hasServerKey: Boolean(process.env.GEMINI_API_KEY) });
};
