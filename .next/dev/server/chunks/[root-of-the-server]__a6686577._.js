module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/app/api/settings/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getSettings",
    ()=>getSettings,
    "setupSettingsTable",
    ()=>setupSettingsTable,
    "updateSettings",
    ()=>updateSettings
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@neondatabase/serverless/index.mjs [app-route] (ecmascript)");
;
__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["neonConfig"].fetchConnectionCache = true;
if (!process.env.POSTGRES_URL) {
    throw new Error("Variável de ambiente POSTGRES_URL não definida.");
}
const sql = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["neon"])(process.env.POSTGRES_URL);
async function setupSettingsTable() {
    try {
        await sql`
      CREATE TABLE IF NOT EXISTS ai_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_name TEXT NOT NULL DEFAULT 'Agente Tio Ben',
        ai_model TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
        calendar_id TEXT,
        focus_keywords TEXT,
        remote_post_url TEXT,
        remote_post_api_key TEXT,
        json_format_template TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
        // Se não houver registros, cria um padrão
        const result = await sql`SELECT COUNT(*) AS count FROM ai_settings;`;
        const count = Number(result[0].count);
        if (count === 0) {
            await sql`
        INSERT INTO ai_settings (
          agent_name, ai_model, calendar_id, focus_keywords,
          remote_post_url, remote_post_api_key, json_format_template
        ) VALUES (
          'Agente Tio Ben',
          'gemini-1.5-flash',
          'primary_calendar',
          'liturgia diária, santos, fé católica, espiritualidade',
          'https://www.iatioben.com.br/api/remote-post',
          'CHAVE_API_AQUI',
          '{"title":"...", "slug":"...", "content":"...", "metaDescription":"..."}'
        );
      `;
            console.log("✅ Configuração padrão criada na tabela ai_settings.");
        } else {
            console.log("✅ Tabela ai_settings já possui configuração existente.");
        }
    } catch (error) {
        console.error("❌ Erro ao criar/verificar tabela ai_settings:", error);
        throw new Error("Falha ao configurar a tabela de configurações da IA.");
    }
}
async function getSettings() {
    try {
        const result = await sql`SELECT * FROM ai_settings ORDER BY created_at ASC LIMIT 1;`;
        if (!result || result.length === 0) return null;
        const row = result[0];
        console.log("⚙️ Configurações carregadas:", row.agent_name);
        return row;
    } catch (error) {
        console.error("❌ Erro ao buscar configurações:", error);
        throw new Error("Falha ao buscar configurações da IA.");
    }
}
async function updateSettings(data) {
    try {
        const result = await sql`SELECT id FROM ai_settings ORDER BY created_at ASC LIMIT 1;`;
        if (!result || result.length === 0) throw new Error("Nenhuma configuração encontrada.");
        const { id } = result[0];
        const fields = Object.keys(data);
        if (fields.length === 0) return;
        const setClause = fields.map((key, i)=>`${key} = $${i + 1}`).join(", ");
        const values = Object.values(data);
        const query = `
      UPDATE ai_settings
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${fields.length + 1};
    `;
        await sql(query, [
            ...values,
            id
        ]);
        console.log(`✅ Configurações atualizadas: ${fields.join(", ")}`);
    } catch (error) {
        console.error("❌ Erro ao atualizar configurações:", error);
        throw new Error("Falha ao atualizar as configurações da IA.");
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__a6686577._.js.map