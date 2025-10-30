import { NextRequest, NextResponse } from "next/server";
import { writeNewsArticle } from "@/services/geminiService";


export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { topic, language, focusKeywords } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Campo 'topic' é obrigatório." }, { status: 400 });
    }

    console.log(`🧠 Gerando rascunho do artigo: ${topic}`);

    // Etapa 1 – gerar texto principal
    const articleText = await writeNewsArticle(topic, language, focusKeywords);

    // Etapa 2 – salvar no banco (retorna ID)
    const newArticle = await saveArticleDraft({
      title: topic,
      content: articleText,
      language,
      focusKeywords,
      status: "draft",
    });

    console.log(`✅ Rascunho salvo com ID: ${newArticle.id}`);

    return NextResponse.json({
      success: true,
      id: newArticle.id,
      message: "Artigo gerado e salvo como rascunho.",
    });
  } catch (error: any) {
    console.error("❌ [generate-article] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
