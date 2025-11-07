import { neon, neonConfig } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;

if (!process.env.POSTGRES_URL) {
  throw new Error("❌ Variável de ambiente POSTGRES_URL não definida.");
}

const sql = neon(process.env.POSTGRES_URL);

/* =========================================================
   🎛️ Interface do modelo de configurações
   ========================================================= */
export interface AiSettings {
  id: string;
  agent_name: string;
  ai_model: string;
  calendar_id: string | null;
  focus_keywords: string | null;
  remote_post_url: string | null;
  remote_post_api_key: string | null;
  json_format_template: string | null;

  // 🧠 Instruções específicas de cada agente
  writer_instructions: string | null;
  formatter_instructions: string | null;
  seo_instructions: string | null;

  // 🗂️ Arquivos de conhecimento (armazenados como JSON)
  writer_files: string | null;
  formatter_files: string | null;
  seo_files: string | null;

  formatter_model?: string;
  seo_model?: string;

  created_at: string;
  updated_at: string;
}



/* =========================================================
   🔍 Buscar configurações atuais
   ========================================================= */
export async function getSettings(): Promise<AiSettings | null> {
  try {
    const result = await sql`
      SELECT * FROM ai_settings
      ORDER BY created_at ASC
      LIMIT 1;
    `;

    if (!result || result.length === 0) {
      console.warn("⚠️ Nenhuma configuração encontrada na tabela ai_settings.");
      return null;
    }

    const row = result[0];
    return {
      ...row,
      writer_files: row.writer_files ? JSON.stringify(row.writer_files) : "[]",
      formatter_files: row.formatter_files ? JSON.stringify(row.formatter_files) : "[]",
      seo_files: row.seo_files ? JSON.stringify(row.seo_files) : "[]",
    } as AiSettings;
  } catch (error) {
    console.error("❌ Erro ao buscar configurações:", error);
    throw new Error("Falha ao buscar configurações da IA.");
  }
}

/* =========================================================
   ✏️ Atualizar configurações
   ========================================================= */
export async function updateSettings(data: Partial<AiSettings>): Promise<void> {
  try {
    const result = await sql`SELECT id FROM ai_settings LIMIT 1;`;
    if (!result || result.length === 0)
      throw new Error("Nenhuma configuração encontrada para atualizar.");

    const { id } = result[0];

    // 🔹 Remove campos imutáveis
    const sanitizedData = { ...data };
    delete (sanitizedData as any).updated_at;
    delete (sanitizedData as any).created_at;
    delete (sanitizedData as any).id;

    const keys = Object.keys(sanitizedData);
    if (keys.length === 0) return;

    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
    const values = Object.values(sanitizedData);

    const query = `
      UPDATE ai_settings
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${keys.length + 1};
    `;

    await sql(query, [...values, id]);
    console.log(`🧠 Configurações atualizadas: ${keys.join(", ")}`);
  } catch (error) {
    console.error("❌ Erro ao atualizar configurações:", error);
    throw new Error("Falha ao atualizar as configurações.");
  }
}
