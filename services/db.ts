import { neon, neonConfig } from "@neondatabase/serverless";
import { ArtigoNoticia } from "../types";

// 🔧 Melhora performance e cache de conexão no ambiente serverless
neonConfig.fetchConnectionCache = true;

if (!process.env.POSTGRES_URL) {
  throw new Error("Variável de ambiente POSTGRES_URL não definida.");
}

const sql = neon(process.env.POSTGRES_URL);

/* =========================================================
   🔹 Função auxiliar para mapear o resultado
   ========================================================= */
const mapRowToArticle = (row: any): ArtigoNoticia => ({
  id: String(row.id),
  generationDate: row.generation_date,
  title: row.title,
  rawContent: row.raw_content,
  formattedContent: row.formatted_content || "",
  published: row.published,
  keywords: Array.isArray(row.keywords)
    ? row.keywords
    : typeof row.keywords === "string"
    ? row.keywords.split(",").map((k: string) => k.trim())
    : [],
  metaDescription: row.meta_description || "",
});

/* =========================================================
   🏗️ Criação da tabela
   ========================================================= */
export async function setupDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        generation_date TIMESTAMPTZ NOT NULL,
        title TEXT NOT NULL,
        raw_content TEXT NOT NULL,
        formatted_content TEXT,
        published BOOLEAN NOT NULL DEFAULT false,
        keywords TEXT[],
        meta_description TEXT
      );
    `;
    console.log("✅ Tabela 'articles' verificada/criada com sucesso.");
  } catch (error) {
    console.error("❌ Falha na configuração do banco de dados:", error);
    throw new Error("Falha ao configurar a tabela do banco de dados.");
  }
}

/* =========================================================
   💾 Inserir artigo completo
   ========================================================= */
export async function saveArticle(article: Omit<ArtigoNoticia, "id">): Promise<ArtigoNoticia> {
  try {
    const result = await sql`
      INSERT INTO articles (
        generation_date, title, raw_content, formatted_content, published, keywords, meta_description
      )
      VALUES (
        ${article.generationDate},
        ${article.title},
        ${article.rawContent},
        ${article.formattedContent || ""},
        ${article.published ?? false},
        ${Array.isArray(article.keywords) ? article.keywords : [article.keywords]},
        ${article.metaDescription || ""}
      )
      RETURNING *;
    `;

    const row = Array.isArray(result) ? result[0] : (result as any);
    console.log(`💾 Artigo salvo com sucesso (ID: ${row.id})`);
    return mapRowToArticle(row);
  } catch (error) {
    console.error("❌ Erro ao salvar artigo:", error);
    throw new Error("Falha ao salvar o artigo.");
  }
}

/* =========================================================
   ✏️ Salvar rascunho inicial (pré-formatação)
   ========================================================= */
export async function saveArticleDraft(data: {
  title: string;
  content: string;
  language: string;
}): Promise<{ id: string }> {
  try {
    const result = await sql`
      INSERT INTO articles (generation_date, title, raw_content, formatted_content, published)
      VALUES (NOW(), ${data.title}, ${data.content}, '', false)
      RETURNING id;
    `;

    const row = Array.isArray(result) ? result[0] : (result as any);
    console.log(`📝 Rascunho salvo com ID: ${row.id}`);
    return { id: String(row.id) };
  } catch (error) {
    console.error("❌ Erro ao salvar rascunho:", error);
    throw new Error("Falha ao salvar o rascunho do artigo.");
  }
}

/* =========================================================
   🔍 Buscar artigo por ID
   ========================================================= */
export async function getArticleById(id: string | number) {
  try {
    const result = await sql`SELECT * FROM articles WHERE id = ${id} LIMIT 1;`;
    const row = Array.isArray(result) ? result[0] : (result as any);
    if (!row) return null;

    console.log("## retorno do select");
    console.log(row);
    return mapRowToArticle(row);
  } catch (error) {
    console.error("❌ Erro ao buscar artigo:", error);
    throw new Error("Falha ao buscar o artigo por ID.");
  }
}

/* =========================================================
   🪄 Atualizar artigo genérico
   ========================================================= */
export async function updateArticle(id: string, data: Partial<ArtigoNoticia>): Promise<void> {
  try {
    const keys = Object.keys(data);
    if (keys.length === 0) return;

    // Monta os campos dinamicamente
    const setClause = keys
      .map((key, i) => `${key.replace(/([A-Z])/g, "_$1").toLowerCase()} = $${i + 1}`)
      .join(", ");
    const values = Object.values(data);

    const query = `
      UPDATE articles
      SET ${setClause}
      WHERE id = $${keys.length + 1};
    `;

    await sql(query, [...values, id]);
    console.log(`📝 Artigo ${id} atualizado (${keys.join(", ")})`);
  } catch (error) {
    console.error("❌ Erro ao atualizar artigo:", error);
    throw new Error("Falha ao atualizar o artigo.");
  }
}

/* =========================================================
   🧱 Atualizar apenas o HTML
   ========================================================= */
export async function updateArticleHtml(id: string | number, html: string) {
  try {
    const result = await sql`
      UPDATE articles
      SET formatted_content = ${html}
      WHERE id = ${id}
      RETURNING id, title, formatted_content;
    `;

    // Normaliza para garantir compatibilidade
    const row = Array.isArray(result) ? result[0] : (result as any);
    if (!row) throw new Error(`Nenhum artigo retornado após o update (ID ${id}).`);

    console.log(`✅ HTML atualizado com sucesso para o artigo ID ${id}.`);
    return {
      id: String(row.id),
      title: row.title,
      formattedContent: row.formatted_content,
    };
  } catch (error) {
    console.error("❌ Erro ao atualizar o artigo:", error);
    throw new Error("Falha ao atualizar o artigo.");
  }
}

/* =========================================================
   📋 Buscar todos os artigos
   ========================================================= */
export async function getArticles(): Promise<ArtigoNoticia[]> {
  try {
    const result = await sql`SELECT * FROM articles ORDER BY generation_date DESC;`;
    const rows = Array.isArray(result) ? result : (result ? [result] : []);
    return rows.map(mapRowToArticle);
  } catch (error) {
    console.error("❌ Erro ao buscar artigos:", error);
    throw new Error("Falha ao buscar os artigos.");
  }
}

/* =========================================================
   🗑️ Excluir artigo
   ========================================================= */
export async function deleteArticle(id: string): Promise<void> {
  try {
    await sql`DELETE FROM articles WHERE id = ${id};`;
    console.log(`🗑️ Artigo ${id} removido com sucesso.`);
  } catch (error) {
    console.error("❌ Erro ao excluir artigo:", error);
    throw new Error("Falha ao excluir o artigo.");
  }
}
