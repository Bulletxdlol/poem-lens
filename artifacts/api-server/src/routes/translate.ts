import { Router } from "express";
import rateLimit from "express-rate-limit";
import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";

const router = Router();

// ── Per-IP rate limiter: max 3 translation requests per minute ─────────────
const translationLimiter = rateLimit({
  windowMs: 60_000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — you can translate up to 3 poems per minute. Please wait and try again." },
});

// ── Helpers ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** Pull the retryDelay value (in seconds) out of Google's error JSON, if present. */
function extractGoogleRetryDelay(err: unknown): number | null {
  try {
    const msg = err instanceof Error ? err.message : String(err);
    const json = JSON.parse(msg) as {
      error?: {
        details?: { "@type"?: string; retryDelay?: string }[];
      };
    };
    const retryInfo = json?.error?.details?.find(
      d => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo",
    );
    if (retryInfo?.retryDelay) {
      // retryDelay looks like "38s" or "38.642s"
      return Math.ceil(parseFloat(retryInfo.retryDelay));
    }
  } catch {
    // ignore parse failures
  }
  return null;
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota")
  );
}

/**
 * Call Gemini with exponential back-off on 429 errors.
 *
 * Retry schedule (if Google doesn't supply a retryDelay):
 *   attempt 1 → wait 2 s
 *   attempt 2 → wait 4 s
 *   attempt 3 → wait 8 s  (then give up)
 *
 * If Google's response includes a retryDelay hint we honour that instead.
 */
async function callGeminiWithRetry(
  ai: GoogleGenAI,
  model: string,
  contents: string,
  logger: { error: (obj: unknown, msg: string) => void },
): Promise<GenerateContentResponse> {
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 2_000;

  // Proactive 2 s delay before every call to safely clear free-tier RPM limits
  await sleep(2_000);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await ai.models.generateContent({ model, contents });
    } catch (err: unknown) {
      const isLast = attempt === MAX_RETRIES;

      if (!isQuotaError(err) || isLast) throw err;

      // How long to wait before retrying
      const hintSeconds = extractGoogleRetryDelay(err);
      const backoffMs = hintSeconds
        ? hintSeconds * 1000
        : BASE_DELAY_MS * Math.pow(2, attempt);

      // Add ±10 % jitter so concurrent requests don't all retry at once
      const jitter = backoffMs * 0.1 * (Math.random() * 2 - 1);
      const waitMs = Math.round(backoffMs + jitter);

      logger.error(
        { attempt, waitMs, err },
        `Gemini 429 — retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`,
      );

      await sleep(waitMs);
    }
  }

  // TypeScript: unreachable, but satisfies the return type
  throw new Error("callGeminiWithRetry: exceeded max retries");
}

// ── Wikipedia poet image ───────────────────────────────────────────────────
async function fetchPoetImage(poetName: string): Promise<string | null> {
  if (!poetName || poetName.toLowerCase() === "unknown") return null;
  try {
    const slug = encodeURIComponent(poetName.replace(/ /g, "_"));
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
      {
        headers: { "User-Agent": "PoemLens/1.0 (educational app)" },
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json() as { thumbnail?: { source?: string } };
    return data?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────

router.get("/status", (_req, res) => {
  res.json({ hasServerKey: Boolean(process.env["GEMINI_API_KEY"]) });
});

router.post("/translate", translationLimiter, async (req, res) => {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY is not configured. Add it in Replit Secrets." });
    return;
  }

  const { poem, source_lang, target_lang } = req.body as {
    poem?: string;
    source_lang?: string;
    target_lang?: string;
  };

  if (!poem || !source_lang || !target_lang) {
    res.status(400).json({ error: "poem, source_lang, and target_lang are required." });
    return;
  }

  const sameLanguage = source_lang.trim().toLowerCase() === target_lang.trim().toLowerCase();

  const translationInstruction = sameLanguage
    ? `Since the source and target languages are the same, set "translated_poem" to an empty string.`
    : `Translate the poem from ${source_lang} to ${target_lang}. The translation must:
- Preserve the emotional weight, tone, and imagery of the original.
- Maintain a natural rhythm and, where possible, a rhyme scheme fitting the target language.
- Favour poetic diction over literal word-for-word translation.`;

  const prompt = `You are a master poet, literary scholar, and translator with deep expertise in world literature, linguistics, and cultural history.

Your task is to analyse the following poem written in ${source_lang}.

${translationInstruction}

Also identify the poet. If the poem is from a known author, provide their full name, a concise biography (2-3 sentences on who they were, their era, nationality, and lasting significance), and the historical/cultural era they belonged to. If the poem is anonymous or the poet cannot be reliably identified, set poet_name to "Unknown" and poet_bio to a brief note on the poem's tradition or origin.

Poem:
"""
${poem}
"""

Respond with ONLY a valid JSON object — no markdown, no code fences, no commentary. The object must exactly match this structure:

{
  "original_poem": "<exact text of the poem as provided>",
  "source_language": "<detected or given source language>",
  "target_language": "<target language>",
  "translated_poem": "<the poetic translation, or empty string if same language>",
  "explanation": "<a rich, engaging paragraph (5-8 sentences) covering: the central theme and emotional journey of the poem, key imagery and symbols, any notable literary or poetic devices (metaphor, alliteration, volta, etc.), and what makes this poem endure>",
  "cultural_notes": [
    "<a cultural or historical context note specific to this poem>",
    "<a note on a key linguistic, stylistic, or translation challenge>",
    "<a note on the poem's legacy, influence, or reception>"
  ],
  "poet_name": "<full name of the poet, or 'Unknown'>",
  "poet_bio": "<2-3 sentences on the poet's life, era, nationality, and why they matter>",
  "poet_era": "<descriptive label, e.g. '19th-century English Romantic poet'>"
}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await callGeminiWithRetry(ai, "gemini-2.5-flash", prompt, req.log);

    const raw = response.text ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      req.log.error({ raw }, "Failed to parse Gemini JSON response");
      res.status(502).json({ error: "The AI returned an unexpected response. Please try again." });
      return;
    }

    const poetName = typeof parsed.poet_name === "string" ? parsed.poet_name : "";
    const poetImageUrl = await fetchPoetImage(poetName);
    res.json({ ...parsed, poet_image_url: poetImageUrl });
  } catch (err: unknown) {
    req.log.error({ err }, "Gemini API call failed after retries");
    if (isQuotaError(err)) {
      const hint = extractGoogleRetryDelay(err);
      const waitMsg = hint ? ` Try again in ${hint}s.` : " Please wait a moment and try again.";
      res.status(429).json({
        error: `Free-tier rate limit reached.${waitMsg}`,
      });
    } else {
      res.status(502).json({ error: "Failed to contact Gemini API. Please try again." });
    }
  }
});

export default router;
