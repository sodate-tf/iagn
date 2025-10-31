import { neon } from "@neondatabase/serverless";
import { ArtigoNoticia } from "../types";

if (!process.env.POSTGRES_URL) {
  throw new Error("Variável de ambiente POSTGRES_URL não definida.");
}

const sql = neon(process.env.POSTGRES_URL);

/* =========================================================
   🔹 Função auxiliar para mapear os campos do banco
   ========================================================= */
const mapRowToArticle = (row: any): ArtigoNoticia => ({
  id: String(row.id),
  generationDate: row.generation_date,
  title: row.title,
  rawContent: row.raw_content,
  formattedContent: row.formatted_content,
  published: row.published,
  keywords: Array.isArray(row.keywords)
    ? row.keywords
    : typeof row.keywords === "string"
    ? row.keywords.split(",").map((k: string) => k.trim())
    : [],
  metaDescription: row.meta_description || "",
});

/* =========================================================
   🏗️ Criação da tabela, se não existir
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
    console.log("✅ Tabela 'articles' verificada ou criada com sucesso.");
  } catch (error) {
    console.error("❌ Falha na configuração do banco de dados:", error);
    throw new Error("Falha ao configurar a tabela do banco de dados.");
  }
}

/* =========================================================
   💾 Inserir novo artigo (completo ou rascunho)
   ========================================================= */
export async function saveArticle(article: Omit<ArtigoNoticia, "id">): Promise<ArtigoNoticia> {
  try {
    const {
      generationDate,
      title,
      rawContent,
      formattedContent,
      published,
      keywords,
      metaDescription,
    } = article;

    const result = await sql`
      INSERT INTO articles (
        generation_date, title, raw_content, formatted_content, published, keywords, meta_description
      )
      VALUES (
        ${generationDate},
        ${title},
        ${rawContent},
        ${formattedContent || ""},
        ${published ?? false},
        ${Array.isArray(keywords) ? keywords : [keywords]},
        ${metaDescription || ""}
      )
      RETURNING *;
    `;

    if (result.length === 0)
      throw new Error("Falha ao salvar o artigo, nenhum resultado retornado.");

    console.log(`💾 Artigo salvo com sucesso (ID: ${result[0].id})`);
    return mapRowToArticle(result[0]);
  } catch (error) {
    console.error("❌ Erro ao salvar artigo:", error);
    throw new Error("Falha ao salvar o artigo.");
  }
}


/**
 * Salva um rascunho inicial do artigo (antes da formatação e SEO)
 */
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
    return { id: result[0].id.toString() };
  } catch (error) {
    console.error("❌ Erro ao salvar rascunho:", error);
    throw new Error("Falha ao salvar o rascunho do artigo.");
  }
}

/* =========================================================
   🔍 Buscar artigo por ID
   ========================================================= */
/**
 * Busca um artigo pelo ID.
 */
export async function getArticleById(id: string | number) {
  try {
    const result = await sql`
      SELECT * FROM articles WHERE id = ${id} LIMIT 1;
    `;
    const rows = Array.isArray(result) ? result : result ? [result] : [];
    if (rows.length === 0) return null;
   console.log("## retorno do select")
   console.log(rows)
    return {
      id: String(rows[0].id),
      generationDate: rows[0].generation_date,
      title: rows[0].title,
      rawContent: rows[0].raw_content,
      formattedContent: rows[0].formatted_content,
      published: rows[0].published,
      keywords: rows[0].keywords || [],
      metaDescription: rows[0].meta_description || '',
    };
  } catch (error) {
    console.error("❌ Erro ao buscar artigo:", error);
    throw new Error("Falha ao buscar o artigo por ID.");
  }
}


/* =========================================================
   ✏️ Atualizar artigo (HTML, SEO, status etc.)
   ========================================================= */
export async function updateArticle(id: string, data: Partial<ArtigoNoticia>): Promise<void> {
  try {
    const keys = Object.keys(data);
    if (keys.length === 0) return;

    // Monta os pares campo = valor de forma segura
    const setClauses = keys.map((key, i) => {
      const dbField = key.replace(/([A-Z])/g, "_$1").toLowerCase(); // camelCase → snake_case
      return `${dbField} = $${i + 1}`;
    });

    const values = Object.values(data);
    const query = `
      UPDATE articles
      SET ${setClauses.join(", ")}
      WHERE id = $${keys.length + 1}
      RETURNING *;
    `;

    // Executa query dinâmica de forma compatível
    await sql(query as any, ...values, id);
    console.log(`📝 Artigo ${id} atualizado (${keys.join(", ")})`);
  } catch (error) {
    console.error("❌ Erro ao atualizar artigo:", error);
    throw new Error("Falha ao atualizar o artigo.");
  }
}

/**
 * Atualiza o campo formatted_content de um artigo específico
 */
/**
 * Atualiza o campo formatted_content de um artigo específico no banco.
 */
export async function updateArticleHtml(id: string | number, html: string) {
  try {
    // Executa o update no Neon
    const result = await sql`
      UPDATE articles
      SET formatted_content = ${html}
      WHERE id = ${id}
      RETURNING id, title, formatted_content;
    `;

    // 🔍 Normaliza o retorno (o Neon pode devolver objeto único, não array)
    const rows = Array.isArray(result) ? result : result ? [result] : [];

    if (rows.length === 0) {
      throw new Error(`Nenhum artigo retornado após o update (ID ${id}).`);
    }

    console.log(`✅ HTML atualizado com sucesso para o artigo ID ${id}.`);
    return rows[0];
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
    const rows = await sql`SELECT * FROM articles ORDER BY generation_date DESC;`;
    return rows.map(mapRowToArticle);
  } catch (error) {
    console.error("❌ Erro ao buscar artigos:", error);
    throw new Error("Falha ao buscar os artigos.");
  }
}

/* =========================================================
   🗑️ (Opcional) Deletar artigo
   ========================================================= */
export async function deleteArticle(id: string): Promise<void> {
  try {
    await sql`DELETE FROM articles WHERE id = ${id};`;
    console.log(`🗑️ Artigo ${id} removido.`);
  } catch (error) {
    console.error("❌ Erro ao excluir artigo:", error);
    throw new Error("Falha ao excluir o artigo.");
  }
}
