import { GoogleGenerativeAI } from "@google/generative-ai";
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

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
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

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
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
 * 🎨 2. Conversão para HTML semântico — Gemini (novo SDK)
 * ============================================================= */
export const formatArticleToHtml = async (articleText: string): Promise<string> => {
  console.log("🎨 [formatArticleToHtml] Iniciando formatação com Gemini 1.5 Flash…");

  const settings = await loadAgentSettings();
  const prompt =
    settings.formatter_instructions +
    `

Texto para formatar:
${articleText}

` + ``;

  try {
    const model = gemini.getGenerativeModel({ model: settings.formatter_model || "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    let htmlContent = result.response.text() || "";

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
 * 🔍 3. Extração de metadados SEO — Gemini (novo SDK)
 * ============================================================= */
export const analyzeSeoAndExtractMetadata = async (
  articleText: string,
  focusKeywords: string
): Promise<{ keywords: string[]; metaDescription: string }> => {
  console.log("🔍 [analyzeSeoAndExtractMetadata] Iniciando análise SEO com Gemini…");

  const settings = await loadAgentSettings();
  const prompt = settings.seo_instructions + `\n\nTexto:\n${articleText}\nPalavras-chave foco: ${focusKeywords}`;

  try {
    const model = gemini.getGenerativeModel({ model: settings.seo_model || "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    // tenta extrair JSON de dentro do texto
    const jsonStart = rawText.indexOf("{");
    const jsonEnd = rawText.lastIndexOf("}") + 1;
    const parsed =
      jsonStart !== -1 && jsonEnd !== -1
        ? JSON.parse(rawText.slice(jsonStart, jsonEnd))
        : { keywords: [], metaDescription: "" };

    console.log("✅ [analyzeSeoAndExtractMetadata] SEO extraído:", parsed);
    return {
      keywords: parsed.keywords || [],
      metaDescription: parsed.metaDescription || "",
    };
  } catch (error) {
    console.error("❌ [analyzeSeoAndExtractMetadata] Erro SEO:", error);
    return { keywords: [], metaDescription: "Não foi possível gerar a meta descrição." };
  }
};
