// app/api/seo-and-publish/route.ts
import { NextRequest, NextResponse } from "next/server";
import { analyzeSeoAndExtractMetadata } from "@/services/geminiService";
import { getArticleById, updateArticleSeo } from "@/app/actions";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Converte texto em slug URL-safe.
 */
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

/**
 * Faz log seguro (evita "Logging output too large").
 * - Nunca imprime payload completo em produção
 * - Nunca imprime HTML inteiro (Cloudflare challenge etc.)
 */
function safePreview(input: unknown, max = 900): string {
  const s =
    typeof input === "string"
      ? input
      : (() => {
          try {
            return JSON.stringify(input);
          } catch {
            return String(input);
          }
        })();

  return s.length > max ? `${s.slice(0, max)}... (truncated)` : s;
}

function isCloudflareChallenge(html: string): boolean {
  const h = html.toLowerCase();
  return (
    h.includes("just a moment") ||
    h.includes("_cf_chl_opt") ||
    h.includes("cf_chl") ||
    h.includes("enable javascript and cookies")
  );
}

type RemotePayload = {
  title: string;
  slug: string;
  content: string;
  categoryId: string;
  categoryName: string;
  keywords: string;
  metaDescription: string;
  publishDate: string;
  isActive: boolean;
};

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    // 0) Entrada
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
    }

    const id = body?.id;
    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    console.log(`[SEO] Iniciando análise e publicação. id=${id}`);

    // 1) Busca artigo
    const article = await getArticleById(id);
    if (!article) {
      return NextResponse.json({ error: "Artigo não encontrado" }, { status: 404 });
    }

    const title = typeof article.title === "string" && article.title.trim()
      ? article.title.trim()
      : "Artigo sem título";

    console.log(`[SEO] Artigo encontrado. title=${safePreview(title, 200)}`);

    // 2) Gera SEO com IA
    const seoData = await analyzeSeoAndExtractMetadata(
      article.rawContent || "",
      article.keywords?.join(", ") || ""
    );

    const keywordsArr = Array.isArray(seoData?.keywords) ? seoData.keywords : [];
    const metaDescription =
      typeof seoData?.metaDescription === "string" ? seoData.metaDescription : "";

    console.log(`[SEO] SEO extraído. keywords=${keywordsArr.length}`);

    // 3) Atualiza local
    await updateArticleSeo(id, {
      keywords: keywordsArr,
      metaDescription,
    });

    console.log(`[SEO] SEO atualizado localmente. id=${id}`);

    // 4) Monta payload remoto
    const slug = slugify(title) || "artigo-sem-titulo";

    const content =
      typeof article.formattedContent === "string" && article.formattedContent.trim()
        ? article.formattedContent
        : typeof article.rawContent === "string"
          ? article.rawContent
          : "";

    const remotePayload: RemotePayload = {
      title,
      slug,
      content,
      categoryId: "ba7adc02-de35-4405-b3f3-7391947d6281",
      categoryName: "Santos",
      keywords: keywordsArr.join(", "),
      metaDescription,
      publishDate: new Date().toISOString(),
      isActive: true,
    };

    // ⚠️ Evite logar conteúdo inteiro (pode ser enorme).
    console.log("[SEO] Payload remoto (preview):", safePreview({
      title: remotePayload.title,
      slug: remotePayload.slug,
      categoryId: remotePayload.categoryId,
      categoryName: remotePayload.categoryName,
      keywordsCount: keywordsArr.length,
      metaDescriptionLen: remotePayload.metaDescription?.length || 0,
      contentLen: remotePayload.content?.length || 0,
    }));

    // 5) Envio remoto
    const remoteUrl = process.env.REMOTE_POST_URL;
    const apiKey = process.env.REMOTE_POST_API_KEY;

    if (!remoteUrl) {
      return NextResponse.json(
        { error: "REMOTE_POST_URL não configurada" },
        { status: 500 }
      );
    }
    if (!apiKey) {
      return NextResponse.json(
        { error: "REMOTE_POST_API_KEY não configurada" },
        { status: 500 }
      );
    }

    console.log(`[SEO] Publicando remotamente em: ${remoteUrl}`);

    const remoteRes = await fetch(remoteUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // ✅ mantém o header que você já usa
        "x-api-key": apiKey,
        // ✅ ajuda a padronizar e diagnosticar
        "User-Agent": "IA-TioBen-SEO-Publisher/1.0",
        Accept: "application/json, text/plain, */*",
      },
      body: JSON.stringify(remotePayload),
      // Node runtime: evita cache intermediário
      cache: "no-store",
    });

    const contentType = remoteRes.headers.get("content-type") || "";

    // Leia texto uma vez (serve para JSON e HTML)
    const responseText = await remoteRes.text();
    const responsePreview = safePreview(responseText, 1200);

    if (!remoteRes.ok) {
      const cf = contentType.includes("text/html") && isCloudflareChallenge(responseText);

      console.error("[SEO] Falha ao publicar remotamente:", {
        status: remoteRes.status,
        contentType,
        cloudflareChallenge: cf,
        preview: responsePreview,
      });

      return NextResponse.json(
        {
          error: cf
            ? "Bloqueado pelo Cloudflare (Managed Challenge). Crie bypass por header (x-api-key) ou use subdomínio DNS-only para a API."
            : `Falha ao publicar remotamente (status ${remoteRes.status}). Preview: ${responsePreview}`,
        },
        { status: 500 }
      );
    }

    // Se a resposta for JSON, parseia; senão, só retorna preview
    let remoteData: any = null;
    if (contentType.includes("application/json")) {
      try {
        remoteData = JSON.parse(responseText);
      } catch {
        remoteData = { raw: responsePreview };
      }
    } else {
      remoteData = { raw: responsePreview };
    }

    const elapsedMs = Date.now() - startedAt;
    console.log(`[SEO] Publicado com sucesso. id=${id}. elapsedMs=${elapsedMs}`);

    return NextResponse.json({
      success: true,
      id,
      message: "Artigo otimizado e publicado com sucesso.",
      remote: remoteData,
      elapsedMs,
    });
  } catch (error: any) {
    console.error("❌ [seo-and-publish] Erro:", {
      message: error?.message,
      name: error?.name,
      stackPreview: safePreview(error?.stack, 1500),
    });

    return NextResponse.json(
      { error: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}
