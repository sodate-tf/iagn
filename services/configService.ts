import "server-only";
import { neon, neonConfig } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;

/* =========================================================
   🎛️ Interface do modelo de configurações (saída para o app)
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

  writer_instructions: string | null;
  formatter_instructions: string | null;
  seo_instructions: string | null;

  writer_files: string | null;
  formatter_files: string | null;
  seo_files: string | null;

  formatter_model?: string | null;
  seo_model?: string | null;

  created_at: string;
  updated_at: string;
}

/* =========================================================
   🧾 Row “cru” do banco (jsonb pode vir como objeto)
   ========================================================= */
type AiSettingsRow = Omit<
  AiSettings,
  "writer_files" | "formatter_files" | "seo_files"
> & {
  writer_files: unknown;
  formatter_files: unknown;
  seo_files: unknown;
};

/* =========================================================
   🔌 Lazy init do client (NÃO quebrar build)
   ========================================================= */
type NeonSql = ReturnType<typeof neon>;
let sqlClient: NeonSql | null = null;

function getSql(): NeonSql {
  if (sqlClient) return sqlClient;

  const url = process.env.POSTGRES_URL;
  if (!url || !url.trim()) {
    // ✅ Só falha quando usar DB, não no build
    throw new Error("❌ Variável de ambiente POSTGRES_URL não definida.");
  }

  sqlClient = neon(url);
  return sqlClient;
}

/* =========================================================
   🧩 Normaliza campos JSON armazenados no banco
   ========================================================= */
function normalizeJsonField(value: unknown): string {
  if (value == null) return "[]";

  if (typeof value === "string") {
    const v = value.trim();
    if (!v) return "[]";
    try {
      JSON.parse(v);
      return v;
    } catch {
      return JSON.stringify([v]);
    }
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[]";
  }
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/* =========================================================
   🔍 Buscar configurações atuais
   ========================================================= */
export async function getSettings(): Promise<AiSettings | null> {
  try {
    const sql = getSql();

    // ✅ Sem genérico no sql`` (compatível com typings do Neon)
    const raw = await sql`
      SELECT * FROM ai_settings
      ORDER BY created_at ASC
      LIMIT 1;
    `;

    const rows = ensureArray<AiSettingsRow>(raw);

    if (rows.length === 0) {
      console.warn("⚠️ Nenhuma configuração encontrada na tabela ai_settings.");
      return null;
    }

    const row = rows[0];

    return {
      ...row,
      writer_files: normalizeJsonField(row.writer_files),
      formatter_files: normalizeJsonField(row.formatter_files),
      seo_files: normalizeJsonField(row.seo_files),
    };
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
    const sql = getSql();

    const raw = await sql`SELECT id FROM ai_settings LIMIT 1;`;
    const rows = ensureArray<{ id: string }>(raw);

    if (rows.length === 0) {
      throw new Error("Nenhuma configuração encontrada para atualizar.");
    }

    const { id } = rows[0];

    // 🔹 Remove campos imutáveis
    const sanitizedData: Record<string, unknown> = { ...(data as any) };
    delete (sanitizedData as any).updated_at;
    delete (sanitizedData as any).created_at;
    delete (sanitizedData as any).id;

    const keys = Object.keys(sanitizedData);
    if (keys.length === 0) return;

    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
    const values = keys.map(k => sanitizedData[k]);

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
