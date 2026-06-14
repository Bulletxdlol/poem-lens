import { translatePoem, type TranslateFailure } from "./_lib/gemini";

export async function POST(request: Request) {
  let body: {
    poem?: string;
    source_lang?: string;
    target_lang?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { poem, source_lang, target_lang } = body;

  if (!poem || !source_lang || !target_lang) {
    return Response.json(
      { error: "poem, source_lang, and target_lang are required." },
      { status: 400 },
    );
  }

  const result = await translatePoem({ poem, source_lang, target_lang });

  if ("error" in result && !("poet_image_url" in result)) {
    const failure = result as TranslateFailure;
    return Response.json({ error: failure.error }, { status: failure.status });
  }

  return Response.json(result);
}
