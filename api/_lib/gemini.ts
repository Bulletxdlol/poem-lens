import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function extractGoogleRetryDelay(err: unknown): number | null {
  try {
    const msg = err instanceof Error ? err.message : String(err);
    const json = JSON.parse(msg) as {
      error?: {
        details?: { "@type"?: string; retryDelay?: string }[];
      };
    };
    const retryInfo = json?.error?.details?.find(
      (d) => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo",
    );
    if (retryInfo?.retryDelay) {
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

async function callGeminiWithRetry(
  ai: GoogleGenAI,
  model: string,
  contents: string,
): Promise<GenerateContentResponse> {
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 2_000;
  const proactiveDelay = process.env.VERCEL ? 0 : 2_000;

  await sleep(proactiveDelay);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await ai.models.generateContent({ model, contents });
    } catch (err: unknown) {
      const isLast = attempt === MAX_RETRIES;

      if (!isQuotaError(err) || isLast) throw err;

      const hintSeconds = extractGoogleRetryDelay(err);
      const backoffMs = hintSeconds
        ? hintSeconds * 1000
        : BASE_DELAY_MS * Math.pow(2, attempt);
      const jitter = backoffMs * 0.1 * (Math.random() * 2 - 1);
      const waitMs = Math.round(backoffMs + jitter);

      await sleep(waitMs);
    }
  }

  throw new Error("callGeminiWithRetry: exceeded max retries");
}

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
    const data = (await res.json()) as { thumbnail?: { source?: string } };
    return data?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

export type TranslateInput = {
  poem: string;
  source_lang: string;
  target_lang: string;
};

export type TranslateSuccess = Record<string, unknown> & {
  poet_image_url: string | null;
};

export type TranslateFailure = {
  status: number;
  error: string;
};

export async function translatePoem(
  input: TranslateInput,
): Promise<TranslateSuccess | TranslateFailure> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      status: 500,
      error: "GEMINI_API_KEY is not configured.",
    };
  }

  const { poem, source_lang, target_lang } = input;
  const sameLanguage =
    source_lang.trim().toLowerCase() === target_lang.trim().toLowerCase();

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
    const response = await callGeminiWithRetry(ai, "gemini-2.5-flash", prompt);

    const raw = response.text ?? "";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      return {
        status: 502,
        error: "The AI returned an unexpected response. Please try again.",
      };
    }

    const poetName =
      typeof parsed.poet_name === "string" ? parsed.poet_name : "";
    const poetImageUrl = await fetchPoetImage(poetName);
    return { ...parsed, poet_image_url: poetImageUrl };
  } catch (err: unknown) {
    if (isQuotaError(err)) {
      const hint = extractGoogleRetryDelay(err);
      const waitMsg = hint
        ? ` Try again in ${hint}s.`
        : " Please wait a moment and try again.";
      return {
        status: 429,
        error: `Free-tier rate limit reached.${waitMsg}`,
      };
    }

    return {
      status: 502,
      error: "Failed to contact Gemini API. Please try again.",
    };
  }
}
