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
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/services/configService.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getSettings",
    ()=>getSettings,
    "updateSettings",
    ()=>updateSettings
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@neondatabase/serverless/index.mjs [app-route] (ecmascript)");
;
__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["neonConfig"].fetchConnectionCache = true;
if (!process.env.POSTGRES_URL) {
    throw new Error("❌ Variável de ambiente POSTGRES_URL não definida.");
}
const sql = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["neon"])(process.env.POSTGRES_URL);
async function getSettings() {
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
            seo_files: row.seo_files ? JSON.stringify(row.seo_files) : "[]"
        };
    } catch (error) {
        console.error("❌ Erro ao buscar configurações:", error);
        throw new Error("Falha ao buscar configurações da IA.");
    }
}
async function updateSettings(data) {
    try {
        const result = await sql`SELECT id FROM ai_settings LIMIT 1;`;
        if (!result || result.length === 0) throw new Error("Nenhuma configuração encontrada para atualizar.");
        const { id } = result[0];
        // 🔹 Remove campos imutáveis
        const sanitizedData = {
            ...data
        };
        delete sanitizedData.updated_at;
        delete sanitizedData.created_at;
        delete sanitizedData.id;
        const keys = Object.keys(sanitizedData);
        if (keys.length === 0) return;
        const setClause = keys.map((key, i)=>`${key} = $${i + 1}`).join(", ");
        const values = Object.values(sanitizedData);
        const query = `
      UPDATE ai_settings
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${keys.length + 1};
    `;
        await sql(query, [
            ...values,
            id
        ]);
        console.log(`🧠 Configurações atualizadas: ${keys.join(", ")}`);
    } catch (error) {
        console.error("❌ Erro ao atualizar configurações:", error);
        throw new Error("Falha ao atualizar as configurações.");
    }
}
}),
"[project]/app/api/settings/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "PUT",
    ()=>PUT
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$configService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/configService.ts [app-route] (ecmascript)");
;
;
/* =========================================================
   🧩 Verifica conexão antes de processar
   ========================================================= */ function ensureDatabaseConnection() {
    if (!process.env.POSTGRES_URL) {
        console.error("❌ ERRO: Variável POSTGRES_URL não definida.");
        throw new Error("Banco de dados não configurado. Defina POSTGRES_URL no arquivo .env.local");
    }
}
async function GET() {
    try {
        ensureDatabaseConnection();
        const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$configService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSettings"])();
        if (!data) {
            console.warn("⚠️ Nenhuma configuração encontrada na tabela ai_settings.");
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Nenhuma configuração encontrada"
            }, {
                status: 404
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(data);
    } catch (error) {
        console.error("❌ [API:GET /settings] Erro:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error.message || "Falha ao buscar configurações"
        }, {
            status: 500
        });
    }
}
async function PUT(req) {
    try {
        ensureDatabaseConnection();
        const body = await req.json();
        if (!body || Object.keys(body).length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Corpo da requisição vazio ou inválido."
            }, {
                status: 400
            });
        }
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$configService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["updateSettings"])(body);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            message: "Configurações atualizadas com sucesso."
        });
    } catch (error) {
        console.error("❌ [API:PUT /settings] Erro:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error.message || "Falha ao atualizar configurações"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__99ec9a5d._.js.map