module.exports = [
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[externals]/process [external] (process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("process", () => require("process"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/querystring [external] (querystring, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("querystring", () => require("querystring"));

module.exports = mod;
}),
"[externals]/buffer [external] (buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("buffer", () => require("buffer"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/net [external] (net, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("net", () => require("net"));

module.exports = mod;
}),
"[externals]/tls [external] (tls, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tls", () => require("tls"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/fs/promises [external] (fs/promises, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs/promises", () => require("fs/promises"));

module.exports = mod;
}),
"[project]/services/configService.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getSettings",
    ()=>getSettings,
    "updateSettings",
    ()=>updateSettings
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@neondatabase/serverless/index.mjs [app-rsc] (ecmascript)");
;
__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["neonConfig"].fetchConnectionCache = true;
if (!process.env.POSTGRES_URL) {
    throw new Error("❌ Variável de ambiente POSTGRES_URL não definida.");
}
const sql = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["neon"])(process.env.POSTGRES_URL);
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
"[project]/services/geminiService.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "analyzeSeoAndExtractMetadata",
    ()=>analyzeSeoAndExtractMetadata,
    "formatArticleToHtml",
    ()=>formatArticleToHtml,
    "writeNewsArticle",
    ()=>writeNewsArticle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$genai$2f$dist$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@google/genai/dist/node/index.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$configService$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/configService.ts [app-rsc] (ecmascript)");
;
;
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ [GeminiService] Variável de ambiente GEMINI_API_KEY não configurada!");
} else {
    console.log("✅ [GeminiService] GEMINI_API_KEY detectada com sucesso.");
}
const ai = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$genai$2f$dist$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["GoogleGenAI"]({
    apiKey: process.env.GEMINI_API_KEY
});
// ====================================================================
// 📝 Função para obter configurações dinâmicas do banco
// ====================================================================
async function loadAgentSettings() {
    const settings = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$configService$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getSettings"])();
    if (!settings) {
        throw new Error("Configurações de IA não encontradas no banco.");
    }
    return settings;
}
const writeNewsArticle = async (topic, language, focusKeywords)=>{
    console.log("🕊️ [writeNewsArticle] Iniciando geração do artigo…");
    const settings = await loadAgentSettings();
    const prompt = settings.writer_instructions + `
Tema: "${topic}"  
Idioma: ${language}  
Palavras-chave foco: ${focusKeywords}

` + /* o restante da montagem de prompt usando as instruções do banco */ ``;
    console.log(`[writeNewsArticle] Tema: ${topic}`);
    console.log(`[writeNewsArticle] Idioma: ${language}`);
    console.log(`[writeNewsArticle] Palavras-chave: ${focusKeywords}`);
    console.log(`[writeNewsArticle] Instruções utilizadas:`, settings.writer_instructions);
    try {
        const response = await ai.models.generateContent({
            model: settings.ai_model,
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ]
        });
        console.log("✅ [writeNewsArticle] Artigo gerado com sucesso.");
        return response.text;
    } catch (error) {
        console.error("❌ [writeNewsArticle] Erro:", error);
        throw new Error("Falha ao gerar o artigo de notícia pela IA.");
    }
};
const formatArticleToHtml = async (articleText)=>{
    console.log("🎨 [formatArticleToHtml] Iniciando formatação do artigo…");
    const settings = await loadAgentSettings();
    const prompt = settings.formatter_instructions + `

Texto para formatar:
${articleText}

` + /* restante da montagem do prompt */ ``;
    console.log("[formatArticleToHtml] Instruções utilizadas:", settings.formatter_instructions);
    try {
        const response = await ai.models.generateContent({
            model: settings.ai_model,
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ]
        });
        let htmlContent = response.text || "";
        // limpar possíveis wrappers
        if (htmlContent.startsWith("```html")) htmlContent = htmlContent.slice(7);
        if (htmlContent.endsWith("```")) htmlContent = htmlContent.slice(0, -3);
        console.log("✅ [formatArticleToHtml] HTML gerado com sucesso. Tamanho:", htmlContent.length);
        return htmlContent.trim();
    } catch (error) {
        console.error("❌ [formatArticleToHtml] Erro ao gerar HTML:", error);
        throw new Error("Falha ao formatar o artigo para HTML.");
    }
};
const analyzeSeoAndExtractMetadata = async (articleText, focusKeywords)=>{
    console.log("🔍 [analyzeSeoAndExtractMetadata] Iniciando análise SEO…");
    const settings = await loadAgentSettings();
    const prompt = settings.seo_instructions;
    console.log("[analyzeSeoAndExtractMetadata] Instruções utilizadas:", settings.seo_instructions);
    try {
        const response = await ai.models.generateContent({
            model: settings.ai_model,
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$genai$2f$dist$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Type"].OBJECT,
                    properties: {
                        keywords: {
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$genai$2f$dist$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Type"].ARRAY,
                            items: {
                                type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$genai$2f$dist$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Type"].STRING
                            }
                        },
                        metaDescription: {
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$genai$2f$dist$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Type"].STRING
                        }
                    }
                }
            }
        });
        const result = JSON.parse(response.text);
        console.log("✅ [analyzeSeoAndExtractMetadata] SEO extraído:", result);
        return {
            keywords: result.keywords || [],
            metaDescription: result.metaDescription || ""
        };
    } catch (error) {
        console.error("❌ [analyzeSeoAndExtractMetadata] Erro SEO:", error);
        return {
            keywords: [],
            metaDescription: "Não foi possível gerar a meta descrição."
        };
    }
};
}),
"[project]/services/db.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "deleteArticle",
    ()=>deleteArticle,
    "getArticleById",
    ()=>getArticleById,
    "getArticles",
    ()=>getArticles,
    "saveArticle",
    ()=>saveArticle,
    "saveArticleDraft",
    ()=>saveArticleDraft,
    "setupDatabase",
    ()=>setupDatabase,
    "updateArticle",
    ()=>updateArticle,
    "updateArticleHtml",
    ()=>updateArticleHtml
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@neondatabase/serverless/index.mjs [app-rsc] (ecmascript)");
;
// 🔧 Melhora performance e cache de conexão no ambiente serverless
__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["neonConfig"].fetchConnectionCache = true;
if (!process.env.POSTGRES_URL) {
    throw new Error("Variável de ambiente POSTGRES_URL não definida.");
}
const sql = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["neon"])(process.env.POSTGRES_URL);
/* =========================================================
   🔹 Função auxiliar para mapear o resultado
   ========================================================= */ const mapRowToArticle = (row)=>({
        id: String(row.id),
        generationDate: row.generation_date,
        title: row.title,
        rawContent: row.raw_content,
        formattedContent: row.formatted_content || "",
        published: row.published,
        keywords: Array.isArray(row.keywords) ? row.keywords : typeof row.keywords === "string" ? row.keywords.split(",").map((k)=>k.trim()) : [],
        metaDescription: row.meta_description || ""
    });
async function setupDatabase() {
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
async function saveArticle(article) {
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
        ${Array.isArray(article.keywords) ? article.keywords : [
            article.keywords
        ]},
        ${article.metaDescription || ""}
      )
      RETURNING *;
    `;
        const row = Array.isArray(result) ? result[0] : result;
        console.log(`💾 Artigo salvo com sucesso (ID: ${row.id})`);
        return mapRowToArticle(row);
    } catch (error) {
        console.error("❌ Erro ao salvar artigo:", error);
        throw new Error("Falha ao salvar o artigo.");
    }
}
async function saveArticleDraft(data) {
    try {
        const result = await sql`
      INSERT INTO articles (generation_date, title, raw_content, formatted_content, published)
      VALUES (NOW(), ${data.title}, ${data.content}, '', false)
      RETURNING id;
    `;
        const row = Array.isArray(result) ? result[0] : result;
        console.log(`📝 Rascunho salvo com ID: ${row.id}`);
        return {
            id: String(row.id)
        };
    } catch (error) {
        console.error("❌ Erro ao salvar rascunho:", error);
        throw new Error("Falha ao salvar o rascunho do artigo.");
    }
}
async function getArticleById(id) {
    try {
        const result = await sql`SELECT * FROM articles WHERE id = ${id} LIMIT 1;`;
        const row = Array.isArray(result) ? result[0] : result;
        if (!row) return null;
        console.log("## retorno do select");
        console.log(row);
        return mapRowToArticle(row);
    } catch (error) {
        console.error("❌ Erro ao buscar artigo:", error);
        throw new Error("Falha ao buscar o artigo por ID.");
    }
}
async function updateArticle(id, data) {
    try {
        const keys = Object.keys(data);
        if (keys.length === 0) return;
        // Monta os campos dinamicamente
        const setClause = keys.map((key, i)=>`${key.replace(/([A-Z])/g, "_$1").toLowerCase()} = $${i + 1}`).join(", ");
        const values = Object.values(data);
        const query = `
      UPDATE articles
      SET ${setClause}
      WHERE id = $${keys.length + 1};
    `;
        await sql(query, [
            ...values,
            id
        ]);
        console.log(`📝 Artigo ${id} atualizado (${keys.join(", ")})`);
    } catch (error) {
        console.error("❌ Erro ao atualizar artigo:", error);
        throw new Error("Falha ao atualizar o artigo.");
    }
}
async function updateArticleHtml(id, html) {
    try {
        const result = await sql`
      UPDATE articles
      SET formatted_content = ${html}
      WHERE id = ${id}
      RETURNING id, title, formatted_content;
    `;
        // Normaliza para garantir compatibilidade
        const row = Array.isArray(result) ? result[0] : result;
        if (!row) throw new Error(`Nenhum artigo retornado após o update (ID ${id}).`);
        console.log(`✅ HTML atualizado com sucesso para o artigo ID ${id}.`);
        return {
            id: String(row.id),
            title: row.title,
            formattedContent: row.formatted_content
        };
    } catch (error) {
        console.error("❌ Erro ao atualizar o artigo:", error);
        throw new Error("Falha ao atualizar o artigo.");
    }
}
async function getArticles() {
    try {
        const result = await sql`SELECT * FROM articles ORDER BY generation_date DESC;`;
        const rows = Array.isArray(result) ? result : result ? [
            result
        ] : [];
        return rows.map(mapRowToArticle);
    } catch (error) {
        console.error("❌ Erro ao buscar artigos:", error);
        throw new Error("Falha ao buscar os artigos.");
    }
}
async function deleteArticle(id) {
    try {
        await sql`DELETE FROM articles WHERE id = ${id};`;
        console.log(`🗑️ Artigo ${id} removido com sucesso.`);
    } catch (error) {
        console.error("❌ Erro ao excluir artigo:", error);
        throw new Error("Falha ao excluir o artigo.");
    }
}
}),
"[project]/app/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"00121f9c30c5223351207fd8b448259ca46c676c50":"getArticlesAction","4065f19faf7bbc25815038078f10bd47ce8c1abd88":"getArticleById","40c4575579969cd92d83bc64b28417ebbd4f960f0a":"saveArticleDraft","6025309eb2de47a434cd34ea2d537829f0ac6f38bc":"updateArticleSeo","60f4ff25181c612e151be3c0f9e44c8afbc69ef86b":"updateArticleHtml","706f4b7a5ed7f1fae5ee8764b8d255b14b6a91c300":"generateAndSaveArticleAction"},"",""] */ __turbopack_context__.s([
    "generateAndSaveArticleAction",
    ()=>generateAndSaveArticleAction,
    "getArticleById",
    ()=>getArticleById,
    "getArticlesAction",
    ()=>getArticlesAction,
    "saveArticleDraft",
    ()=>saveArticleDraft,
    "updateArticleHtml",
    ()=>updateArticleHtml,
    "updateArticleSeo",
    ()=>updateArticleSeo
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$geminiService$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/geminiService.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/db.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
async function generateAndSaveArticleAction(topic, language, focusKeywords) {
    try {
        // 🧠 Etapa 1: IA Escritora
        const rawContent = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$geminiService$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["writeNewsArticle"](topic, language, focusKeywords);
        // 🎨 Etapa 2: IA Formatadora
        const formattedContent = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$geminiService$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatArticleToHtml"](rawContent);
        // 🔍 Etapa 3: IA de SEO
        const { keywords, metaDescription } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$geminiService$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["analyzeSeoAndExtractMetadata"](rawContent, focusKeywords);
        // 💾 Etapa 4: Salvar tudo no banco
        const articleToSave = {
            title: topic,
            rawContent,
            formattedContent,
            generationDate: new Date().toISOString(),
            published: false,
            keywords,
            metaDescription
        };
        const savedArticle = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["saveArticle"](articleToSave);
        // 🔁 Revalida histórico no dashboard
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard/history");
        return {
            ...savedArticle,
            published: true
        };
    } catch (error) {
        console.error("❌ Erro em generateAndSaveArticleAction:", error);
        throw new Error(`Falha ao gerar e salvar o artigo: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function saveArticleDraft(data) {
    try {
        const articleToSave = {
            title: data.title,
            rawContent: data.content,
            formattedContent: "",
            generationDate: new Date().toISOString(),
            published: false,
            keywords: [
                ""
            ],
            metaDescription: ""
        };
        const saved = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["saveArticle"](articleToSave);
        console.log(`✅ Rascunho salvo com ID: ${saved.id}`);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard/history");
        return saved;
    } catch (error) {
        console.error("❌ Erro ao salvar rascunho:", error);
        throw new Error("Falha ao salvar rascunho.");
    }
}
async function getArticleById(id) {
    try {
        const article = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getArticleById"](id);
        return article;
    } catch (error) {
        console.error("❌ Erro ao buscar artigo:", error);
        return null;
    }
}
async function updateArticleHtml(id, formattedContent) {
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updateArticle"](id, {
            formattedContent
        });
        console.log(`🎨 HTML atualizado com sucesso para o artigo ${id}`);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard/history");
    } catch (error) {
        console.error("❌ Erro ao atualizar HTML:", error);
        throw new Error("Falha ao atualizar o HTML do artigo.");
    }
}
async function updateArticleSeo(id, data) {
    try {
        // 🧠 Garante que keywords sempre será um array de strings
        let keywords;
        if (Array.isArray(data.keywords)) {
            keywords = data.keywords;
        } else if (typeof data.keywords === "string") {
            keywords = data.keywords.split(",").map((k)=>k.trim());
        } else {
            keywords = [];
        }
        const metaDescription = data.metaDescription || "";
        await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updateArticle"](id, {
            keywords,
            metaDescription,
            published: true,
            generationDate: new Date().toISOString()
        });
        console.log(`🔍 SEO atualizado e artigo ${id} publicado com sucesso.`);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard/history");
    } catch (error) {
        console.error("❌ Erro ao atualizar SEO:", error);
        throw new Error(error?.message || "Falha ao atualizar os dados de SEO do artigo.");
    }
}
async function getArticlesAction() {
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setupDatabase"](); // garante tabela
        const articles = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getArticles"]();
        return articles;
    } catch (error) {
        console.error("❌ Erro em getArticlesAction:", error);
        return [];
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    generateAndSaveArticleAction,
    saveArticleDraft,
    getArticleById,
    updateArticleHtml,
    updateArticleSeo,
    getArticlesAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(generateAndSaveArticleAction, "706f4b7a5ed7f1fae5ee8764b8d255b14b6a91c300", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(saveArticleDraft, "40c4575579969cd92d83bc64b28417ebbd4f960f0a", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getArticleById, "4065f19faf7bbc25815038078f10bd47ce8c1abd88", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateArticleHtml, "60f4ff25181c612e151be3c0f9e44c8afbc69ef86b", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateArticleSeo, "6025309eb2de47a434cd34ea2d537829f0ac6f38bc", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getArticlesAction, "00121f9c30c5223351207fd8b448259ca46c676c50", null);
}),
"[project]/.next-internal/server/app/dashboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions.ts [app-rsc] (ecmascript)");
;
;
}),
"[project]/.next-internal/server/app/dashboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "00121f9c30c5223351207fd8b448259ca46c676c50",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getArticlesAction"],
    "706f4b7a5ed7f1fae5ee8764b8d255b14b6a91c300",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["generateAndSaveArticleAction"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$dashboard$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/dashboard/page/actions.js { ACTIONS_MODULE0 => "[project]/app/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__b0f93b3f._.js.map