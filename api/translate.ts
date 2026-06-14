import type { VercelRequest, VercelResponse } from "@vercel/node";
import { translatePoem, type TranslateFailure } from "./_lib/gemini";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = req.body as {
    poem?: string;
    source_lang?: string;
    target_lang?: string;
  } | undefined;

  const poem = body?.poem;
  const source_lang = body?.source_lang;
  const target_lang = body?.target_lang;

  if (!poem || !source_lang || !target_lang) {
    res.status(400).json({
      error: "poem, source_lang, and target_lang are required.",
    });
    return;
  }

  const result = await translatePoem({ poem, source_lang, target_lang });

  if ("error" in result && !("poet_image_url" in result)) {
    const failure = result as TranslateFailure;
    res.status(failure.status).json({ error: failure.error });
    return;
  }

  res.status(200).json(result);
}
