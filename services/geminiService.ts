import { GoogleGenAI, Type } from "@google/genai";
import { getSettings } from "@/services/configService";

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ [GeminiService] Variável de ambiente GEMINI_API_KEY não configurada!");
} else {
  console.log("✅ [GeminiService] GEMINI_API_KEY detectada com sucesso.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

// ====================================================================
// 📝 Função para obter configurações dinâmicas do banco
// ====================================================================
async function loadAgentSettings() {
  const settings = await getSettings();
  if (!settings) {
    throw new Error("Configurações de IA não encontradas no banco.");
  }
  return settings;
}

// ====================================================================
// 🕊️ 1. Criação do artigo jornalístico (texto bruto)
// ====================================================================
export const writeNewsArticle = async (topic: string, language: string, focusKeywords: string): Promise<string> => {
  console.log("🕊️ [writeNewsArticle] Iniciando geração do artigo…");

  const settings = await loadAgentSettings();
  const prompt = settings.writer_instructions + `
Tema: "${topic}"  
Idioma: ${language}  
Palavras-chave foco: ${focusKeywords}

` + /* o restante da montagem de prompt usando as instruções do banco */ ``;

  console.log(`[writeNewsArticle] Tema: ${topic}`);
  console.log(`[writeNewsArticle] Idioma: ${language}`);
  console.log(`[writeNewsArticle] Palavras-chave: ${focusKeywords}`);
  console.log(`[writeNewsArticle] Instruções utilizadas:`, settings.writer_instructions);

  try {
    const response = await ai.models.generateContent({
      model: settings.ai_model,
      contents: [{ parts: [{ text: prompt }] }],
    });
    console.log("✅ [writeNewsArticle] Artigo gerado com sucesso.");
    return response.text;
  } catch (error) {
    console.error("❌ [writeNewsArticle] Erro:", error);
    throw new Error("Falha ao gerar o artigo de notícia pela IA.");
  }
};

// ====================================================================
// 🎨 2. Conversão para HTML semântico
// ====================================================================
export const formatArticleToHtml = async (articleText: string): Promise<string> => {
  console.log("🎨 [formatArticleToHtml] Iniciando formatação do artigo…");

  const settings = await loadAgentSettings();
  const prompt = settings.formatter_instructions + `

Texto para formatar:
${articleText}

` + /* restante da montagem do prompt */ ``;

  console.log("[formatArticleToHtml] Instruções utilizadas:", settings.formatter_instructions);

  try {
    const response = await ai.models.generateContent({
      model: settings.ai_model,
      contents: [{ parts: [{ text: prompt }] }],
    });
    let htmlContent = response.text || "";
    // limpar possíveis wrappers
    if (htmlContent.startsWith("```html")) htmlContent = htmlContent.slice(7);
    if (htmlContent.endsWith("```")) htmlContent = htmlContent.slice(0, -3);

    console.log("✅ [formatArticleToHtml] HTML gerado com sucesso. Tamanho:", htmlContent.length);
    return htmlContent.trim();
  } catch (error) {
    console.error("❌ [formatArticleToHtml] Erro ao gerar HTML:", error);
    throw new Error("Falha ao formatar o artigo para HTML.");
  }
};

// ====================================================================
// 🔍 3. Extração de metadados SEO
// ====================================================================
export const analyzeSeoAndExtractMetadata = async (
  articleText: string,
  focusKeywords: string
): Promise<{ keywords: string[]; metaDescription: string }> => {
  console.log("🔍 [analyzeSeoAndExtractMetadata] Iniciando análise SEO…");

  const settings = await loadAgentSettings();
  const prompt = settings.seo_instructions + `

Artigo:
${articleText}

Palavras-chave foco: ${focusKeywords}

Retorne um JSON com:
{
  "keywords": [...],
  "metaDescription": "..."
}
`;

  console.log("[analyzeSeoAndExtractMetadata] Instruções utilizadas:", settings.seo_instructions);

  try {
    const response = await ai.models.generateContent({
      model: settings.ai_model,
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
