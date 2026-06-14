module.exports = function handler(_req, res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ hasServerKey: Boolean(process.env.GEMINI_API_KEY) }));
};
