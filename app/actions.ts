"use server";

import { revalidatePath } from "next/cache";
import * as geminiService from "../services/geminiService";
import * as dbService from "../services/db";
import { ArtigoNoticia } from "../types";

/* =========================================================
   🔹 MODO COMPLETO (para compatibilidade retroativa)
   ========================================================= */
export async function generateAndSaveArticleAction(
  topic: string,
  language: string,
  focusKeywords: string
): Promise<ArtigoNoticia> {
  try {
    // 🧠 Etapa 1: IA Escritora
    const rawContent = await geminiService.writeNewsArticle(topic, language, focusKeywords);

    // 🎨 Etapa 2: IA Formatadora
    const formattedContent = await geminiService.formatArticleToHtml(rawContent);

    // 🔍 Etapa 3: IA de SEO
    const { keywords, metaDescription } = await geminiService.analyzeSeoAndExtractMetadata(rawContent, focusKeywords);

    // 💾 Etapa 4: Salvar tudo no banco
    const articleToSave: Omit<ArtigoNoticia, "id"> = {
      title: topic,
      rawContent,
      formattedContent,
      generationDate: new Date().toISOString(),
      published: false,
      keywords,
      metaDescription,
    };

    const savedArticle = await dbService.saveArticle(articleToSave);

    // 🔁 Revalida histórico no dashboard
    revalidatePath("/dashboard/history");

    return { ...savedArticle, published: true };
  } catch (error) {
    console.error("❌ Erro em generateAndSaveArticleAction:", error);
    throw new Error(`Falha ao gerar e salvar o artigo: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/* =========================================================
   🔹 MODO MODULAR (para pipeline dividido)
   ========================================================= */

/** 1️⃣ Gera o texto base e salva como rascunho */
export async function saveArticleDraft(data: {
  title: string;
  content: string;
  language: string;
  focusKeywords: string;
  status?: string;
}) {
  try {
    const articleToSave: Omit<ArtigoNoticia, "id"> = {
      title: data.title,
      rawContent: data.content,
      formattedContent: "",
      generationDate: new Date().toISOString(),
      published: false,
      keywords: [""],
      metaDescription: "",
    };

    const saved = await dbService.saveArticle(articleToSave);
    console.log(`✅ Rascunho salvo com ID: ${saved.id}`);
    revalidatePath("/dashboard/history");
    return saved;
  } catch (error) {
    console.error("❌ Erro ao salvar rascunho:", error);
    throw new Error("Falha ao salvar rascunho.");
  }
}

/** 2️⃣ Busca artigo pelo ID */
export async function getArticleById(id: string): Promise<ArtigoNoticia | null> {
  try {
    const article = await dbService.getArticleById(id);
    return article;
  } catch (error) {
    console.error("❌ Erro ao buscar artigo:", error);
    return null;
  }
}

/** 3️⃣ Atualiza HTML formatado */
export async function updateArticleHtml(id: string, formattedContent: string) {
  try {
    await dbService.updateArticle(id, { formattedContent });
    console.log(`🎨 HTML atualizado com sucesso para o artigo ${id}`);
    revalidatePath("/dashboard/history");
  } catch (error) {
    console.error("❌ Erro ao atualizar HTML:", error);
    throw new Error("Falha ao atualizar o HTML do artigo.");
  }
}

/** 4️⃣ Atualiza dados de SEO e marca como publicado */
export async function updateArticleSeo(
  id: string,
  data: { keywords: string[]; metaDescription: string; status?: string }
) {
  try {
    await dbService.updateArticle(id, {
      keywords: data.keywords,
      metaDescription: data.metaDescription,
      published: true,
      generationDate: new Date().toISOString(),
    });
    console.log(`🔍 SEO atualizado e artigo ${id} publicado com sucesso.`);
    revalidatePath("/dashboard/history");
  } catch (error) {
    console.error("❌ Erro ao atualizar SEO:", error);
    throw new Error("Falha ao atualizar SEO do artigo.");
  }
}

/* =========================================================
   🔹 LISTAGEM (inalterada)
   ========================================================= */
export async function getArticlesAction(): Promise<ArtigoNoticia[]> {
  try {
    await dbService.setupDatabase(); // garante tabela
    const articles = await dbService.getArticles();
    return articles;
  } catch (error) {
    console.error("❌ Erro em getArticlesAction:", error);
    return [];
  }
}
