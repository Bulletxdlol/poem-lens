export async function GET() {
  return Response.json({ hasServerKey: Boolean(process.env.GEMINI_API_KEY) });
}
