import { neon } from '@neondatabase/serverless';
import { ArtigoNoticia } from '../types';

if (!process.env.POSTGRES_URL) {
  throw new Error("Variável de ambiente POSTGRES_URL não definida.");
}

const sql = neon(process.env.POSTGRES_URL);

// Mapeia a linha do banco de dados (snake_case) para o objeto ArtigoNoticia (camelCase)
const mapRowToArticle = (row: any): ArtigoNoticia => ({
  id: String(row.id),
  generationDate: row.generation_date,
  title: row.title,
  rawContent: row.raw_content,
  formattedContent: row.formatted_content,
  published: row.published,
  keywords: row.keywords || [],
  metaDescription: row.meta_description || '',
});

/**
 * Cria a tabela 'articles' no banco de dados se ela não existir.
 */
export async function setupDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        generation_date TIMESTAMPTZ NOT NULL,
        title TEXT NOT NULL,
        raw_content TEXT NOT NULL,
        formatted_content TEXT NOT NULL,
        published BOOLEAN NOT NULL DEFAULT false,
        keywords TEXT[],
        meta_description TEXT
      );
    `;
    console.log("Configuração do banco de dados bem-sucedida: tabela 'articles' verificada.");
  } catch (error) {
    console.error("Falha na configuração do banco de dados:", error);
    throw new Error("Falha ao configurar a tabela do banco de dados.");
  }
}

/**
 * Salva um novo artigo no banco de dados.
 * @param {ArtigoNoticia} article O artigo a ser salvo.
 * @returns {Promise<ArtigoNoticia>} O artigo salvo com o ID gerado pelo banco de dados.
 */
export async function saveArticle(article: ArtigoNoticia): Promise<ArtigoNoticia> {
  try {
    const { generationDate, title, rawContent, formattedContent, keywords, metaDescription } = article;
    const result = await sql`
      INSERT INTO articles (generation_date, title, raw_content, formatted_content, published, keywords, meta_description)
      VALUES (${generationDate}, ${title}, ${rawContent}, ${formattedContent}, true, ${keywords}, ${metaDescription})
      RETURNING *;
    `;
    if (result.length === 0) {
        throw new Error("Falha ao salvar o artigo, nenhum resultado retornado do banco de dados.");
    }
    return mapRowToArticle(result[0]);
  } catch (error) {
    console.error("Erro ao salvar o artigo no banco de dados:", error);
    throw new Error("Falha ao salvar o artigo.");
  }
}

/**
 * Busca todos os artigos do banco de dados, ordenados por data de geração.
 * @returns {Promise<ArtigoNoticia[]>} Uma lista de todos os artigos salvos.
 */
export async function getArticles(): Promise<ArtigoNoticia[]> {
  try {
    const rows = await sql`
      SELECT * FROM articles ORDER BY generation_date DESC;
    `;
    return rows.map(mapRowToArticle);
  } catch (error) {
    console.error("Erro ao buscar artigos do banco de dados:", error);
    throw new Error("Falha ao buscar os artigos.");
  }
}