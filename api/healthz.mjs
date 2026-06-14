function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export default function handler(_req, res) {
  sendJson(res, 200, { status: "ok" });
}
