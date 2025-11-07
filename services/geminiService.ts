import OpenAI from "openai";
import { getSettings } from "@/services/configService";

/* =============================================================
 * 🔑 Inicialização da API OpenAI
 * ============================================================= */
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ [OpenAIService] Variável de ambiente OPENAI_API_KEY não configurada!");
} else {
  console.log("✅ [OpenAIService] OPENAI_API_KEY detectada com sucesso.");
}

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
    `\n\nTema: "${topic}"\nIdioma: ${language}\nPalavras-chave foco: ${focusKeywords}`;

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
 * 🎨 2. Conversão para HTML semântico — OpenAI (modelo leve)
 * ============================================================= */
export const formatArticleToHtml = async (articleText: string): Promise<string> => {
  console.log("🎨 [formatArticleToHtml] Iniciando formatação com OpenAI (modelo leve)…");

  const settings = await loadAgentSettings();
  const prompt =
    settings.formatter_instructions +
    `\n\nConverta o texto abaixo em HTML semântico responsivo, mantendo o conteúdo e estrutura católica do Blog Tio Ben.\n\n${articleText}`;

  try {
    // modelo leve para tarefas de formatação e parsing
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // 🧩 modelo mais leve e barato da OpenAI
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    let htmlContent = response.choices[0]?.message?.content || "";
    htmlContent = htmlContent.replace(/^```html\s*/i, "").replace(/```$/i, "").trim();

    console.log("✅ [formatArticleToHtml] HTML gerado com sucesso. Tamanho:", htmlContent.length);
    return htmlContent;
  } catch (error) {
    console.error("❌ [formatArticleToHtml] Erro ao gerar HTML:", error);
    throw new Error("Falha ao formatar o artigo para HTML.");
  }
};

/* =============================================================
 * 🔍 3. Extração de metadados SEO — OpenAI (modelo leve)
 * ============================================================= */
export const analyzeSeoAndExtractMetadata = async (
  articleText: string,
  focusKeywords: string
): Promise<{ keywords: string[]; metaDescription: string }> => {
  console.log("🔍 [analyzeSeoAndExtractMetadata] Iniciando análise SEO com OpenAI…");

  const settings = await loadAgentSettings();
  const prompt = `
${settings.seo_instructions}

Gere uma lista de até 5 palavras-chave relevantes e uma meta descrição otimizada (máx. 160 caracteres)
para o seguinte texto, levando em conta as palavras-chave foco: ${focusKeywords}.

Texto:
${articleText}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // 🔹 modelo simples e eficiente
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const rawText = response.choices[0]?.message?.content || "";

    // tenta capturar dados estruturados
    const jsonStart = rawText.indexOf("{");
    const jsonEnd = rawText.lastIndexOf("}") + 1;
    let parsed: { keywords: string[]; metaDescription: string } = {
      keywords: [],
      metaDescription: "",
    };

    try {
      if (jsonStart !== -1 && jsonEnd !== -1) {
        parsed = JSON.parse(rawText.slice(jsonStart, jsonEnd));
      } else {
        // fallback se vier texto solto
        const keywordsMatch = rawText.match(/Palavras-chave: (.*)/i);
        const metaMatch = rawText.match(/Meta descrição: (.*)/i);
        parsed = {
          keywords: keywordsMatch ? keywordsMatch[1].split(",").map(k => k.trim()) : [],
          metaDescription: metaMatch ? metaMatch[1].trim() : rawText.slice(0, 160),
        };
      }
    } catch {
      parsed.metaDescription = rawText.slice(0, 160);
    }

    console.log("✅ [analyzeSeoAndExtractMetadata] SEO extraído:", parsed);
    return parsed;
  } catch (error) {
    console.error("❌ [analyzeSeoAndExtractMetadata] Erro SEO:", error);
    return { keywords: [], metaDescription: "Não foi possível gerar a meta descrição." };
  }
};
