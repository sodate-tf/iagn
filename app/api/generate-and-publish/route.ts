import { NextRequest, NextResponse } from "next/server";
import { generateAndSaveArticleAction } from "@/app/actions";
import { analyzeSeoAndExtractMetadata, formatArticleToHtml, writeNewsArticle } from "@/services/geminiService";


export const runtime = "nodejs";
export const maxDuration = 120;


export async function POST(req: NextRequest) {
  try {
    // 🔐 Verifica a chave da API
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.REMOTE_POST_API_KEY) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { topic, language, focusKeywords } = body;

    if (!topic) {
      return NextResponse.json({ error: "Campo 'topic' é obrigatório." }, { status: 400 });
    }

    console.log(`🚀 Iniciando geração automática para: ${topic}`);

    // 🧠 Etapa 1: Geração do texto
    const articleText = await writeNewsArticle(topic, language, focusKeywords);

    // 🪄 Etapa 2: Formatação HTML
    const htmlArticle = await formatArticleToHtml(articleText);

    // 🔍 Etapa 3: SEO
    const seoData = await analyzeSeoAndExtractMetadata(articleText, focusKeywords);
    const { keywords, metaDescription } = seoData;

    // 💾 Etapa 4: Salva localmente no banco
    const article = await generateAndSaveArticleAction(topic, language, focusKeywords);

    // 📤 Etapa 5: Publica remotamente no outro site
    const remoteRes = await fetch("https://www.iatioben.com.br/api/remote-post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.REMOTE_POST_API_KEY!,
      },
      body: JSON.stringify({
        title: topic,
        slug: topic.toLowerCase().replace(/[^\w]+/g, "-"),
        content: htmlArticle,
        categoryId: "ba7adc02-de35-4405-b3f3-7391947d6281", // categoria fixa "Santos"
        categoryName: "Santos",
        keywords: keywords.join(", "),
        metaDescription,
        publishDate: new Date().toISOString(),
        isActive: true,
      }),
    });

    if (!remoteRes.ok) {
      const errText = await remoteRes.text();
      console.error("❌ Falha ao publicar no site destino:", errText);
      return NextResponse.json({ error: "Falha ao publicar no site destino.", detail: errText }, { status: 500 });
    }

    console.log("✅ Artigo publicado com sucesso em ambos os sites.");

    return NextResponse.json({
      success: true,
      message: "Artigo gerado e publicado com sucesso!",
      topic,
    });
  } catch (error: any) {
    console.error("❌ Erro na API /generate-and-publish:", error);
    return NextResponse.json({ error: error.message || "Erro desconhecido." }, { status: 500 });
  }
}
