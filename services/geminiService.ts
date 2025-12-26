import "server-only";
import OpenAI from "openai";
import { getSettings } from "@/services/configService";

/* =========================
   OpenAI lazy init
   ========================= */
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;

  const key = process.env.OPENAI_API_KEY;
  if (!key || !key.trim()) {
    throw new Error("OPENAI_API_KEY não configurada.");
  }

  openaiClient = new OpenAI({ apiKey: key });
  return openaiClient;
}

/* =========================
   Settings cache
   ========================= */
type AgentSettings = {
  writer_instructions: string;
  formatter_instructions: string;
  seo_instructions: string;
};

let settingsCache: AgentSettings | null = null;
let settingsCacheAt = 0;
const SETTINGS_TTL_MS = 60_000;

async function loadAgentSettings(): Promise<AgentSettings> {
  const now = Date.now();
  if (settingsCache && now - settingsCacheAt < SETTINGS_TTL_MS) return settingsCache;

  let settings: { writer_instructions?: string | null; formatter_instructions?: string | null; seo_instructions?: string | null } | null = null;

  try {
    settings = await getSettings(); // AiSettings | null
  } catch (err) {
    // ✅ não derrubar build/runtime por falha do DB
    console.warn("[loadAgentSettings] getSettings falhou; usando fallback.", err);
    settings = null;
  }

  settingsCache = {
    writer_instructions: settings?.writer_instructions ?? "",
    formatter_instructions: settings?.formatter_instructions ?? "",
    seo_instructions: settings?.seo_instructions ?? "",
  };

  settingsCacheAt = now;
  return settingsCache;
}


/* =========================
   Writers
   ========================= */
export async function writeSaintArticle(args: {
  topic: string;
  language: string;
  focusKeywords: string;
  date?: string;
  sourceText?: string;
  liturgySource?: string;
  model?: string;
  maxCompletionTokens?: number;
  temperature?: number;
}): Promise<string> {
  const settings = await loadAgentSettings();
  const openai = getOpenAI();

  const model = args.model ?? process.env.OPENAI_MODEL_WRITER ?? "gpt-4o-mini";
  const max_completion_tokens = args.maxCompletionTokens ?? 2600;
  const temperature = args.temperature ?? 0.75;

  const userPayload = [
    `SANTO_DO_DIA: "${args.topic}"`,
    `IDIOMA: ${args.language}`,
    `PALAVRAS_CHAVE_FOCO: ${args.focusKeywords}`,
    args.date ? `DATA: ${args.date}` : `DATA: (não fornecida)`,
    args.liturgySource?.trim()
      ? `\nLITURGIA_FONTE:\n${args.liturgySource.trim()}`
      : `\nLITURGIA_FONTE: (não fornecida)`,
    args.sourceText?.trim()
      ? `\nTEXTO_FONTE_SANTO:\n${args.sourceText.trim()}`
      : `\nTEXTO_FONTE_SANTO: (não fornecido)\nIMPORTANTE: sem texto-fonte, evite afirmar fatos históricos específicos.`,
  ].join("\n");

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: settings.writer_instructions },
      { role: "user", content: userPayload },
    ],
    temperature,
    max_completion_tokens,
  });

  return (response.choices[0]?.message?.content || "").trim();
}

export async function writeThemeArticle(args: {
  topic: string;
  language: string;
  focusKeywords: string;
  instructions: string;
  model?: string;
  maxCompletionTokens?: number;
  temperature?: number;
}): Promise<string> {
  const openai = getOpenAI();

  const model =
    args.model ??
    process.env.OPENAI_MODEL_WRITER_THEME ??
    process.env.OPENAI_MODEL_WRITER ??
    "gpt-4o-mini";

  const max_completion_tokens = args.maxCompletionTokens ?? 2800;
  const temperature = args.temperature ?? 0.8;

  const userPayload = [
    `TEMA: "${args.topic}"`,
    `IDIOMA: ${args.language}`,
    `PALAVRAS_CHAVE_FOCO: ${args.focusKeywords}`,
  ].join("\n");

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: args.instructions },
      { role: "user", content: userPayload },
    ],
    temperature,
    max_completion_tokens,
  });

  return (response.choices[0]?.message?.content || "").trim();
}

/**
 * ✅ Mantém compatibilidade com rotas antigas
 * (writer antigo)
 */
export async function writeNewsArticle(
  topic: string,
  language: string,
  focusKeywords: string,
  opts?: {
    sourceText?: string;
    liturgySource?: string;
    model?: string;
    maxCompletionTokens?: number;
    temperature?: number;
    date?: string;
  }
): Promise<string> {
  return writeSaintArticle({
    topic,
    language,
    focusKeywords,
    date: opts?.date,
    sourceText: opts?.sourceText,
    liturgySource: opts?.liturgySource,
    model: opts?.model,
    maxCompletionTokens: opts?.maxCompletionTokens,
    temperature: opts?.temperature,
  });
}

/* =========================
   Formatter
   ========================= */
export async function formatArticleToHtml(
  articleText: string,
  opts?: { model?: string; maxCompletionTokens?: number; temperature?: number }
): Promise<string> {
  const settings = await loadAgentSettings();
  const openai = getOpenAI();

  const model = opts?.model ?? process.env.OPENAI_MODEL_FORMATTER ?? "gpt-4.1-nano";
  const max_completion_tokens = opts?.maxCompletionTokens ?? 2200;
  const temperature = opts?.temperature ?? 0.15;

  const prompt =
    `${settings.formatter_instructions}\n\n` +
    `Converta o texto abaixo em HTML semântico responsivo.\n` +
    `Retorne APENAS o HTML (sem markdown, sem \`\`\`).\n\n` +
    articleText;

  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_completion_tokens,
  });

  return (response.choices[0]?.message?.content || "")
    .replace(/^```html\s*/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

/* =========================
   SEO metadata
   ========================= */
export async function analyzeSeoAndExtractMetadata(
  articleText: string,
  focusKeywords: string,
  opts?: { model?: string; maxCompletionTokens?: number; temperature?: number }
): Promise<{ keywords: string[]; metaDescription: string }> {
  const settings = await loadAgentSettings();
  const openai = getOpenAI();

  const model = opts?.model ?? process.env.OPENAI_MODEL_SEO ?? "gpt-4.1-nano";
  const max_completion_tokens = opts?.maxCompletionTokens ?? 260;
  const temperature = opts?.temperature ?? 0.2;

  const userPrompt =
    `${settings.seo_instructions}\n\n` +
    `Considere as palavras-chave foco: ${focusKeywords}\n\n` +
    `TEXTO:\n${articleText}`;


  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: userPrompt }],
    temperature,
    max_completion_tokens,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "seo_metadata",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            keywords: { type: "array", items: { type: "string" }, minItems: 6, maxItems: 12 },
            metaDescription: { type: "string", maxLength: 160 },
          },
          required: ["keywords", "metaDescription"],
        },
      },
    },
  });

  const raw = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw) as { keywords: string[]; metaDescription: string };

  return {
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    metaDescription: typeof parsed.metaDescription === "string" ? parsed.metaDescription : "",
  };
}
