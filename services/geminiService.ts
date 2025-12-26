import "server-only";
import OpenAI from "openai";
import { getSettings } from "@/services/configService";

/* =============================================================
 * 🔑 Inicialização Lazy da API OpenAI (build-safe)
 * ============================================================= */

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;

  const key = process.env.OPENAI_API_KEY;
  if (!key || !key.trim()) {
    // ✅ Não instancie OpenAI sem chave (evita quebrar build)
    throw new Error(
      "Missing credentials. Defina OPENAI_API_KEY nas Environment Variables do Vercel."
    );
  }

  openaiClient = new OpenAI({ apiKey: key });
  return openaiClient;
}

/* =============================================================
 * ⚙️  Cache de configurações do banco (TTL)
 * ============================================================= */
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

  const settings = (await getSettings()) as AgentSettings | null;
  if (!settings) throw new Error("Configurações de IA não encontradas no banco.");

  // Blindagem: garante string (evita undefined quebrar prompts)
  settingsCache = {
    writer_instructions: settings.writer_instructions ?? "",
    formatter_instructions: settings.formatter_instructions ?? "",
    seo_instructions: settings.seo_instructions ?? "",
  };

  settingsCacheAt = now;
  return settingsCache;
}

/* =============================================================
 * 🧠 Writers (Santo do Dia e Tema)
 * ============================================================= */

export async function writeSaintArticle(args: {
  topic: string;
  language: string;
  focusKeywords: string;
  date?: string; // YYYY-MM-DD
  sourceText?: string;
  liturgySource?: string;
  model?: string;
  maxCompletionTokens?: number;
  temperature?: number;
}): Promise<string> {
  const {
    topic,
    language,
    focusKeywords,
    date,
    sourceText,
    liturgySource,
    model,
    maxCompletionTokens,
    temperature,
  } = args;

  console.log("🧠 [writeSaintArticle] Gerando artigo (Santo do Dia) com OpenAI…");

  const settings = await loadAgentSettings();

  const finalModel = model ?? process.env.OPENAI_MODEL_WRITER ?? "gpt-4o-mini";
  const max_completion_tokens = maxCompletionTokens ?? 2600;
  const temp = temperature ?? 0.75;

  const st = sourceText?.trim();
  const ls = liturgySource?.trim();

  const userPayload = [
    `SANTO_DO_DIA: "${topic}"`,
    `IDIOMA: ${language}`,
    `PALAVRAS_CHAVE_FOCO: ${focusKeywords}`,
    date ? `DATA: ${date}` : `DATA: (não fornecida)`,
    ls ? `\nLITURGIA_FONTE:\n${ls}` : `\nLITURGIA_FONTE: (não fornecida)`,
    st
      ? `\nTEXTO_FONTE_SANTO:\n${st}`
      : `\nTEXTO_FONTE_SANTO: (não fornecido)\nIMPORTANTE: sem texto-fonte, evite afirmar fatos históricos específicos.`,
  ].join("\n");

  try {
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: finalModel,
      messages: [
        { role: "system", content: settings.writer_instructions },
        { role: "user", content: userPayload },
      ],
      temperature: temp,
      max_completion_tokens,
    });

    const text = response.choices[0]?.message?.content || "";
    console.log("✅ [writeSaintArticle] Artigo gerado com sucesso.");
    return text.trim();
  } catch (error) {
    console.error("❌ [writeSaintArticle] Erro:", error);
    throw new Error("Falha ao gerar o artigo (Santo do Dia) pela OpenAI.");
  }
}

export async function writeThemeArticle(args: {
  topic: string;
  language: string;
  focusKeywords: string;
  instructions: string; // prompt fixo do agente TEMÁTICO (vem do route)
  model?: string;
  maxCompletionTokens?: number;
  temperature?: number;
}): Promise<string> {
  const {
    topic,
    language,
    focusKeywords,
    instructions,
    model,
    maxCompletionTokens,
    temperature,
  } = args;

  console.log("🧠 [writeThemeArticle] Gerando artigo (Tema) com OpenAI…");

  const finalModel =
    model ??
    process.env.OPENAI_MODEL_WRITER_THEME ??
    process.env.OPENAI_MODEL_WRITER ??
    "gpt-4o-mini";

  const max_completion_tokens = maxCompletionTokens ?? 2800;
  const temp = temperature ?? 0.8;

  const userPayload = [
    `TEMA: "${topic}"`,
    `IDIOMA: ${language}`,
    `PALAVRAS_CHAVE_FOCO: ${focusKeywords}`,
  ].join("\n");

  try {
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: finalModel,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: userPayload },
      ],
      temperature: temp,
      max_completion_tokens,
    });

    const text = response.choices[0]?.message?.content || "";
    console.log("✅ [writeThemeArticle] Artigo gerado com sucesso.");
    return text.trim();
  } catch (error) {
    console.error("❌ [writeThemeArticle] Erro:", error);
    throw new Error("Falha ao gerar o artigo temático pela OpenAI.");
  }
}

/* =============================================================
 * 🧠 Compatibilidade: writer antigo (mantém assinatura)
 * ============================================================= */
export const writeNewsArticle = async (
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
): Promise<string> => {
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
};

/* =============================================================
 * 🎨 2) Conversão para HTML semântico
 * ============================================================= */
export const formatArticleToHtml = async (
  articleText: string,
  opts?: {
    model?: string;
    maxCompletionTokens?: number;
    temperature?: number;
  }
): Promise<string> => {
  console.log("🎨 [formatArticleToHtml] Iniciando formatação para HTML…");

  const settings = await loadAgentSettings();
  const model = opts?.model ?? process.env.OPENAI_MODEL_FORMATTER ?? "gpt-4.1-nano";
  const max_completion_tokens = opts?.maxCompletionTokens ?? 2200;
  const temperature = opts?.temperature ?? 0.15;

  const prompt =
    `${settings.formatter_instructions}\n\n` +
    `Converta o texto abaixo em HTML semântico responsivo.\n` +
    `Retorne APENAS o HTML (sem markdown, sem \`\`\`).\n\n` +
    articleText;

  try {
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_completion_tokens,
    });

    let htmlContent = response.choices[0]?.message?.content || "";
    htmlContent = htmlContent
      .replace(/^```html\s*/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    console.log("✅ [formatArticleToHtml] HTML gerado com sucesso. Tamanho:", htmlContent.length);
    return htmlContent;
  } catch (error) {
    console.error("❌ [formatArticleToHtml] Erro ao gerar HTML:", error);
    throw new Error("Falha ao formatar o artigo para HTML.");
  }
};

/* =============================================================
 * 🔍 3) Extração de metadados SEO (JSON garantido via schema)
 * ============================================================= */
export const analyzeSeoAndExtractMetadata = async (
  articleText: string,
  focusKeywords: string,
  opts?: {
    model?: string;
    maxCompletionTokens?: number;
    temperature?: number;
  }
): Promise<{ keywords: string[]; metaDescription: string }> => {
  console.log("🔍 [analyzeSeoAndExtractMetadata] Iniciando análise SEO…");

  const settings = await loadAgentSettings();
  const model = opts?.model ?? process.env.OPENAI_MODEL_SEO ?? "gpt-4.1-nano";
  const max_completion_tokens = opts?.maxCompletionTokens ?? 220;
  const temperature = opts?.temperature ?? 0.2;

  const userPrompt =
    `${settings.seo_instructions}\n\n` +
    `Extraia metadados SEO do texto.\n` +
    `- Gere até 5 keywords relevantes.\n` +
    `- Gere uma meta description otimizada com no máximo 160 caracteres.\n` +
    `- Considere as palavras-chave foco: ${focusKeywords}\n\n` +
    `TEXTO:\n${articleText}`;

  try {
    const openai = getOpenAI();

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
              keywords: { type: "array", items: { type: "string" }, maxItems: 5 },
              metaDescription: { type: "string", maxLength: 160 },
            },
            required: ["keywords", "metaDescription"],
          },
        },
      },
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as { keywords: string[]; metaDescription: string };

    console.log("✅ [analyzeSeoAndExtractMetadata] SEO extraído:", parsed);
    return {
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      metaDescription: typeof parsed.metaDescription === "string" ? parsed.metaDescription : "",
    };
  } catch (error) {
    console.error("❌ [analyzeSeoAndExtractMetadata] Erro SEO:", error);
    return { keywords: [], metaDescription: "Não foi possível gerar a meta descrição." };
  }
};
