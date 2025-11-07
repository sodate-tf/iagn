import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import { getSettings } from "@/services/configService";

/* =============================================================
 * 🔑 Inicialização das APIs
 * ============================================================= */
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ [GeminiService] Variável de ambiente GEMINI_API_KEY não configurada!");
} else {
  console.log("✅ [GeminiService] GEMINI_API_KEY detectada com sucesso.");
}

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ [OpenAIService] Variável de ambiente OPENAI_API_KEY não configurada!");
} else {
  console.log("✅ [OpenAIService] OPENAI_API_KEY detectada com sucesso.");
}

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY as string });

/* =============================================================
 * ⚙️  Carrega configurações dinâmicas do banco
 * ============================================================= */
async function loadAgentSettings() {
  const settings = await getSettings();
  if (!settings) throw new Error("Configurações de IA não encontradas no banco.");
  return settings;
}

/* =============================================================
 * 🧠 1. Criação do artigo jornalístico (GPT-4o-mini)
 * ============================================================= */
export const writeNewsArticle = async (
  topic: string,
  language: string,
  focusKeywords: string
): Promise<string> => {
  console.log("🧠 [writeNewsArticle] Gerando artigo com OpenAI (GPT-4o-mini)…");

  const settings = await loadAgentSettings();

  const prompt =
    settings.writer_instructions +
    `
Tema: "${topic}"  
Idioma: ${language}  
Palavras-chave foco: ${focusKeywords}

` + ``;

  console.log(`[writeNewsArticle] Tema: ${topic}`);
  console.log(`[writeNewsArticle] Idioma: ${language}`);
  console.log(`[writeNewsArticle] Palavras-chave: ${focusKeywords}`);
  console.log(`[writeNewsArticle] Instruções utilizadas:`, settings.writer_instructions);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // 🔹 modelo fixo para este agente
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
    });

    const text = response.choices[0]?.message?.content || "";
    console.log("✅ [writeNewsArticle] Artigo gerado com sucesso.");
    return text.trim();
  } catch (error) {
    console.error("❌ [writeNewsArticle] Erro:", error);
    throw new Error("Falha ao gerar o artigo de notícia pela OpenAI.");
  }
};

/* =============================================================
 * 🎨 2. Conversão para HTML semântico — Gemini
 * ============================================================= */
export const formatArticleToHtml = async (articleText: string): Promise<string> => {
  console.log("🎨 [formatArticleToHtml] Iniciando formatação com Gemini…");

  const settings = await loadAgentSettings();
  const prompt =
    settings.formatter_instructions +
    `

Texto para formatar:
${articleText}

` + ``;

  console.log("[formatArticleToHtml] Instruções utilizadas:", settings.formatter_instructions);

  try {
    const response = await gemini.models.generateContent({
      model: settings.formatter_model || "gemini-1.0-pro",
      contents: [{ parts: [{ text: prompt }] }],
    });

    let htmlContent = response.text || "";
    if (htmlContent.startsWith("```html")) htmlContent = htmlContent.slice(7);
    if (htmlContent.endsWith("```")) htmlContent = htmlContent.slice(0, -3);

    console.log("✅ [formatArticleToHtml] HTML gerado com sucesso. Tamanho:", htmlContent.length);
    return htmlContent.trim();
  } catch (error) {
    console.error("❌ [formatArticleToHtml] Erro ao gerar HTML:", error);
    throw new Error("Falha ao formatar o artigo para HTML.");
  }
};

/* =============================================================
 * 🔍 3. Extração de metadados SEO — Gemini
 * ============================================================= */
export const analyzeSeoAndExtractMetadata = async (
  articleText: string,
  focusKeywords: string
): Promise<{ keywords: string[]; metaDescription: string }> => {
  console.log("🔍 [analyzeSeoAndExtractMetadata] Iniciando análise SEO com Gemini…");

  const settings = await loadAgentSettings();
  const prompt = settings.seo_instructions;

  console.log("[analyzeSeoAndExtractMetadata] Instruções utilizadas:", settings.seo_instructions);

  try {
    const response = await gemini.models.generateContent({
      model: settings.seo_model || "gemini-1.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            metaDescription: { type: Type.STRING },
          },
        },
      },
    });

    const result = JSON.parse(response.text);
    console.log("✅ [analyzeSeoAndExtractMetadata] SEO extraído:", result);
    return {
      keywords: result.keywords || [],
      metaDescription: result.metaDescription || "",
    };
  } catch (error) {
    console.error("❌ [analyzeSeoAndExtractMetadata] Erro SEO:", error);
    return { keywords: [], metaDescription: "Não foi possível gerar a meta descrição." };
  }
};
