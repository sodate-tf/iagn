import { NextRequest, NextResponse } from "next/server";
import { analyzeSeoAndExtractMetadata } from "@/services/geminiService";
import { getArticleById, updateArticleSeo } from "@/app/actions";

export const runtime = "nodejs";
export const maxDuration = 120;

function slugify(text: string): string {
  return text
    .normalize("NFD") // separa acentos das letras (ex: "ã" → "a" + "~")
    .replace(/[\u0300-\u036f]/g, "") // remove todos os sinais diacríticos (acentos)
    .replace(/[^a-zA-Z0-9\s-]/g, "") // remove qualquer caractere especial que não seja letra, número, espaço ou hífen
    .trim() // remove espaços nas extremidades
    .replace(/\s+/g, "-") // substitui espaços por hífens
    .replace(/-+/g, "-") // evita múltiplos hífens consecutivos
    .toLowerCase(); // converte tudo para minúsculas
}


export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    console.log(`🔍 [SEO] Iniciando análise e publicação do artigo ID: ${id}`);

    // 1️⃣ Busca o artigo no banco
    const article = await getArticleById(id);
    if (!article) {
      return NextResponse.json({ error: "Artigo não encontrado" }, { status: 404 });
    }

    console.log(`🧾 Artigo encontrado: ${article.title}`);

    // 2️⃣ Gera SEO com IA (usando Gemini)
    const seoData = await analyzeSeoAndExtractMetadata(
      article.rawContent,
      article.keywords?.join(", ") || ""
    );

    const keywords = seoData.keywords || [];
    const metaDescription = seoData.metaDescription || "";

    console.log(`✨ SEO extraído: ${keywords.length} palavras-chave`);

    // 3️⃣ Atualiza o artigo localmente com SEO + published = true
    await updateArticleSeo(id, {
      keywords,
      metaDescription,
    });

    console.log(`💾 SEO atualizado e artigo ${id} marcado como publicado.`);

    // 4️⃣ Publica remotamente no site principal
    const remotePayload = {
      title: article.title || "Artigo sem título",
      slug: typeof article.title === "string"
        ? slugify(article.title)
        : "artigo-sem-titulo",
      content:
        typeof article.formattedContent === "string"
          ? article.formattedContent
          : article.rawContent || "",
      categoryId: "ba7adc02-de35-4405-b3f3-7391947d6281",
      categoryName: "Santos",
      keywords: Array.isArray(keywords) ? keywords.join(", ") : "",
      metaDescription,
      publishDate: new Date().toISOString(),
      isActive: true,
    };

    // 🚀 Evita erro de toString e mostra o JSON completo
    console.log("🧾 Payload pronto para envio remoto:");
    console.log(JSON.stringify(remotePayload, null, 2));

    console.log("🌐 Enviando artigo para o site remoto...");
    const remoteRes = await fetch(process.env.REMOTE_POST_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.REMOTE_POST_API_KEY!,
      },
      body: JSON.stringify(remotePayload),
    });

    if (!remoteRes.ok) {
      const errText = await remoteRes.text();
      console.error("❌ Falha ao publicar remotamente:", errText);
      return NextResponse.json(
        { error: `Falha ao publicar remotamente: ${errText}` },
        { status: 500 }
      );
    }

    console.log("✅ Artigo publicado com sucesso!");
    return NextResponse.json({
      success: true,
      id,
      message: "Artigo otimizado e publicado com sucesso.",
    });
  } catch (error: any) {
    console.error("❌ [seo-and-publish] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
