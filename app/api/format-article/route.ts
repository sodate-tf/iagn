import { NextRequest, NextResponse } from "next/server";
import { formatArticleToHtml } from "@/services/geminiService";
import { getArticleById, updateArticleHtml } from "@/app/actions"; // buscar e atualizar

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    console.log(`🎨 Formatando artigo ID: ${id}`);

    const article = await getArticleById(id);
    if (!article) return NextResponse.json({ error: "Artigo não encontrado" }, { status: 404 });

    console.log(`📝 Conteúdo bruto recebido (${article.rawContent?.length} chars)`);

    // Corrigido: deve formatar o texto cru, não o HTML
    const html = await formatArticleToHtml(article.rawContent);

    await updateArticleHtml(id, html);

    console.log("✅ HTML formatado e salvo com sucesso.");
    return NextResponse.json({ success: true, id, message: "Artigo formatado com sucesso." });
  } catch (error: any) {
    console.error("❌ [format-article] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
