"use server";

import { revalidatePath } from 'next/cache';
import * as geminiService from '../services/geminiService';
import * as dbService from '../services/db';
import { ArtigoNoticia } from '../types';

export async function generateAndSaveArticleAction(topic: string, language: string, focusKeywords: string): Promise<ArtigoNoticia> {
  try {
    // 2. IA Escritora de Notícias
    const rawContent = await geminiService.writeNewsArticle(topic, language, focusKeywords);

    // 3. IA Formatadora de HTML
    const formattedContent = await geminiService.formatArticleToHtml(rawContent);

    // 4. IA Analista de SEO
    const { keywords, metaDescription } = await geminiService.analyzeSeoAndExtractMetadata(rawContent, focusKeywords);
    
    const articleToSave: Omit<ArtigoNoticia, 'id'> = {
      title: topic,
      rawContent,
      formattedContent,
      generationDate: new Date().toISOString(),
      published: false,
      keywords,
      metaDescription,
    };

    // 5. Salvar no Banco de Dados
    const savedArticle = await dbService.saveArticle(articleToSave);

    // Revalida o cache da página de histórico para que o novo artigo apareça
    revalidatePath('/dashboard/history');

    return {
      ...savedArticle,
      published: true
    };
  } catch (error) {
    console.error("Erro na Server Action generateAndSaveArticleAction:", error);
    // Lança o erro para que o componente cliente possa tratá-lo
    throw new Error(`Falha ao gerar e salvar o artigo: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getArticlesAction(): Promise<ArtigoNoticia[]> {
    try {
        await dbService.setupDatabase(); // Garante que a tabela exista
        const articles = await dbService.getArticles();
        return articles;
    } catch (error) {
        console.error("Erro na Server Action getArticlesAction:", error);
        return [];
    }
}