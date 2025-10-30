import { analyzeSeoAndExtractMetadata, formatArticleToHtml, writeNewsArticle } from "@/services/geminiService";
import { NextRequest, NextResponse } from "next/server";


/**
 * 🔒 Chave de autenticação (mesma usada no Apps Script)
 */
const API_KEY = process.env.REMOTE_POST_API_KEY!;
const REMOTE_API_URL = process.env.REMOTE_POST_URL;

// Categoria fixa válida no banco Neon
const DEFAULT_CATEGORY_ID = "ba7adc02-de35-4405-b3f3-7391947d6281";
const DEFAULT_CATEGORY_NAME = "Santos";

export async function POST(req: NextRequest) {
  console.log("🚀 [generate-and-publish] Chamada recebida");

  try {
    // 🔐 Valida a API key
    const authHeader = req.headers.get("x-api-key");
    if (authHeader !== API_KEY) {
      console.warn("🚫 [generate-and-publish] Acesso não autorizado");
      return NextResponse.json({ success: false, message: "Acesso não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { topic, language = "pt-BR", focusKeywords = "" } = body;

    if (!topic) {
      console.warn("⚠️ [generate-and-publish] Campo 'topic' ausente no body");
      return NextResponse.json({ success: false, message: "O campo 'topic' é obrigatório." }, { status: 400 });
    }

    console.log("🧩 [generate-and-publish] Iniciando pipeline para:", topic);

    // 1️⃣ Gera o artigo textual
    const articleText = await writeNewsArticle(topic, language, focusKeywords);
    console.log("📝 [generate-and-publish] Artigo gerado com sucesso. Tamanho:", articleText.length);

    // 2️⃣ Formata em HTML
    const htmlArticle = await formatArticleToHtml(articleText);
    console.log("🎨 [generate-and-publish] HTML formatado com sucesso. Tamanho:", htmlArticle.length);

    // 3️⃣ Extrai SEO
    const { keywords, metaDescription } = await analyzeSeoAndExtractMetadata(articleText, focusKeywords);
    console.log("🔍 [generate-and-publish] SEO extraído com sucesso.");

    // 4️⃣ Cria slug seguro
    const slug = topic
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // 5️⃣ Monta o payload para o site de destino
    const payload = {
      title: topic,
      slug,
      content: htmlArticle,
      categoryId: DEFAULT_CATEGORY_ID,
      categoryName: DEFAULT_CATEGORY_NAME,
      keywords: keywords.join(", "),
      metaDescription,
      publishDate: new Date().toISOString(),
      isActive: true,
    };

    console.log("📦 [generate-and-publish] Payload preparado:", payload);

    // 6️⃣ Envia o post para o site de destino
    console.log(`🌍 [generate-and-publish] Enviando para ${REMOTE_API_URL} ...`);

    const res = await fetch(REMOTE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("❌ [generate-and-publish] Falha ao publicar remotamente:", result);
      return NextResponse.json({ success: false, message: "Erro ao publicar remotamente", details: result }, { status: 500 });
    }

    console.log("✅ [generate-and-publish] Publicado com sucesso no site remoto.");
    return NextResponse.json({
      success: true,
      message: "Post gerado e publicado com sucesso!",
      payload,
      remoteResponse: result,
    });

  } catch (error) {
    console.error("❌ [generate-and-publish] Erro geral:", error);
    return NextResponse.json({ success: false, message: "Erro interno ao gerar ou publicar post.", error: (error as Error).message }, { status: 500 });
  }
}
