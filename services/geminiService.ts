import "server-only";
import OpenAI from "openai";
import { getSettings } from "@/services/configService";
import { marked } from "marked";

/* =========================
   OpenAI lazy init
   ========================= */
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;

  const key = process.env.OPENAI_API_KEY;
  if (!key || !key.trim()) {
    throw new Error("OPENAI_API_KEY não configurada.");
  }

  openaiClient = new OpenAI({ apiKey: key });
  return openaiClient;
}

/* =========================
   Settings cache
   ========================= */
type AgentSettings = {
  writer_instructions: string;
  formatter_instructions: string;
  seo_instructions: string;
};

let settingsCache: AgentSettings | null = null;
let settingsCacheAt = 0;
const SETTINGS_TTL_MS = 60_000;

async function loadAgentSettings(): Promise<AgentSettings> {
  const now = Date.now();
  if (settingsCache && now - settingsCacheAt < SETTINGS_TTL_MS) return settingsCache;

  let settings:
    | {
        writer_instructions?: string | null;
        formatter_instructions?: string | null;
        seo_instructions?: string | null;
      }
    | null = null;

  try {
    settings = await getSettings(); // AiSettings | null
  } catch (err) {
    console.warn("[loadAgentSettings] getSettings falhou; usando fallback.", err);
    settings = null;
  }

  settingsCache = {
    writer_instructions: settings?.writer_instructions ?? "",
    formatter_instructions: settings?.formatter_instructions ?? "",
    seo_instructions: settings?.seo_instructions ?? "",
  };

  settingsCacheAt = now;
  return settingsCache;
}

/* =========================
   Helpers (blocks + markdown)
   ========================= */

/** Extrai e remove um bloco [TAG]...[/TAG] (case-insensitive). */

/** Extrai e remove um bloco [TAG]...[/TAG] (case-insensitive). */
function extractBlock(text: string, tag: string): { value: string; cleaned: string } {
  const re = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, "i");
  const match = text.match(re);
  if (!match) return { value: "", cleaned: text };
  const value = (match[1] ?? "").trim();
  const cleaned = text.replace(match[0], "").trim();
  return { value, cleaned };
}

/** Extrai múltiplos blocos especiais do markdown e remove do corpo principal. */
function extractSpecialBlocks(md: string): {
  mdClean: string;
  liturgia: string;
  terco: string;
} {
  let cleaned = md;

  // Aceita [liturgia] e [LITURGIA], etc.
  const lit = extractBlock(cleaned, "liturgia");
  cleaned = lit.cleaned;

  const ter = extractBlock(cleaned, "terco");
  cleaned = ter.cleaned;

  return {
    mdClean: cleaned.trim(),
    liturgia: lit.value,
    terco: ter.value,
  };
}

/**
 * Remove o parágrafo usado como excerpt do markdown.
 * - remove o 1º parágrafo "real" após o H1 (ignorando linhas vazias)
 * - funciona mesmo que o parágrafo tenha múltiplas linhas
 */
function stripExcerptParagraph(md: string): string {
  const lines = md.split("\n");

  // localiza H1
  let i = 0;
  for (; i < lines.length; i++) {
    if (/^#\s+/.test(lines[i])) {
      i++;
      break;
    }
  }
  if (i >= lines.length) return md.trim();

  // pula linhas vazias logo após H1
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return md.trim();

  // remove até a primeira linha vazia após começar o parágrafo
  let started = false;
  const out: string[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // só começa a remover depois do H1
    if (idx < i) {
      out.push(line);
      continue;
    }

    if (!started) {
      // primeira linha do parágrafo
      if (line.trim() !== "") {
        started = true;
        continue; // remove esta linha
      }
      // se ainda for vazio, remove (não adiciona)
      continue;
    } else {
      // já estamos removendo o parágrafo: quando encontrar vazio, encerra remoção
      if (line.trim() === "") {
        // mantém esta linha vazia (boa separação) e a partir daqui volta a copiar tudo
        out.push(line);
        // copia o restante integralmente
        for (let j = idx + 1; j < lines.length; j++) out.push(lines[j]);
        break;
      }
      // ainda dentro do parágrafo: remove
      continue;
    }
  }

  return out.join("\n").trim();
}

/** Renderiza um bloco especial (liturgia/terço) com visual consistente. */
function renderSpecialBlock(params: {
  title: string;
  markdown: string;
  variant: "liturgia" | "terco";
}): string {
  const { title, markdown, variant } = params;
  if (!markdown?.trim()) return "";

  // Você pode ajustar paleta/tipografia aqui
  const palette =
    variant === "liturgia"
      ? {
          wrap: "border-amber-200 bg-amber-50",
          title: "text-amber-900",
          prose: "prose-amber",
        }
      : {
          wrap: "border-sky-200 bg-sky-50",
          title: "text-sky-900",
          prose: "prose-sky",
        };

  // Parse markdown interno
  const html = String(marked.parse(markdown.trim()));

  return `
<section class="my-8 rounded-2xl border ${palette.wrap} p-5 sm:p-6 shadow-sm">
  <h3 class="text-lg sm:text-xl font-extrabold ${palette.title} mb-3">${title}</h3>
  <div class="prose max-w-none ${palette.prose}">
    ${html}
  </div>
</section>
  `.trim();
}



/** Extrai H1 (# ...) e o primeiro parágrafo após o H1 (excerpt). */
function extractTitleAndExcerpt(md: string): { title: string; excerpt: string } {
  const lines = md.split("\n");
  let title = "";
  let i = 0;

  for (; i < lines.length; i++) {
    const m = lines[i].match(/^#\s+(.+)\s*$/);
    if (m) {
      title = m[1].trim();
      i++;
      break;
    }
  }

  // excerpt: primeiro parágrafo após H1
  const buff: string[] = [];
  for (; i < lines.length; i++) {
    const line = lines[i];

    if (/^#{1,6}\s+/.test(line)) break;
    if (line.trim() === "") {
      if (buff.length) break;
      continue;
    }
    buff.push(line.trim());
  }

  const excerpt = buff.join(" ").replace(/\s+/g, " ").trim();
  return { title, excerpt };
}

/** Conta H2 (## ...) e cria lista de TOC (id sec-x) */
function buildToc(md: string): { toc: { id: string; title: string }[] } {
  const lines = md.split("\n");
  let sec = 0;
  const toc: { id: string; title: string }[] = [];

  for (const line of lines) {
    const m = line.match(/^##\s+(.+)\s*$/);
    if (m) {
      sec++;
      toc.push({ id: `sec-${sec}`, title: m[1].trim() });
    }
  }

  return { toc };
}

function addOrAppendClass(attrs: string, classToAdd: string): string {
  const hasClass = /\bclass\s*=\s*"/i.test(attrs);
  if (!hasClass) {
    return `${attrs} class="${classToAdd}"`;
  }
  return attrs.replace(/\bclass\s*=\s*"([^"]*)"/i, (_m, cls) => {
    const next = `${cls} ${classToAdd}`.replace(/\s+/g, " ").trim();
    return `class="${next}"`;
  });
}

function ensureAttr(attrs: string, attrName: string, attrValue: string): string {
  const re = new RegExp(`\\b${attrName}\\s*=\\s*"`, "i");
  if (re.test(attrs)) return attrs;
  return `${attrs} ${attrName}="${attrValue}"`;
}

/**
 * Aplica ids sec-x nos <h2> do HTML gerado pelo marked.
 * Também adiciona scroll offset via class "scroll-mt-28" (Tailwind) para header fixo.
 */
function applySectionIdsToHtml(html: string, toc: { id: string; title: string }[]): string {
  let idx = 0;

  return html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_full, rawAttrs: string, inner: string) => {
    idx++;
    const id = toc[idx - 1]?.id ?? `sec-${idx}`;
    let attrs = (rawAttrs || "").trim();

    // garante id
    attrs = ensureAttr(attrs, "id", id);

    // garante classes mínimas (se já houver, apenas acrescenta scroll-mt-28)
    const baseH2 = "text-2xl font-bold text-gray-900 mb-3";
    attrs = addOrAppendClass(attrs, "scroll-mt-28");
    attrs = addOrAppendClass(attrs, baseH2);

    // normaliza espaços antes de fechar a tag
    const attrsNormalized = attrs ? " " + attrs.replace(/\s+/g, " ").trim() : "";
    return `<h2${attrsNormalized}>${inner}</h2>`;
  });
}

/** Renderiza TOC condicional (quando houver muitos H2). */
function renderToc(toc: { id: string; title: string }[], minH2 = 4): string {
  if (toc.length < minH2) return "";

  const items = toc
    .map(
      (t) =>
        `<li class="mb-2"><a class="text-indigo-700 hover:underline" href="#${t.id}">${t.title}</a></li>`
    )
    .join("");

  return `
<nav class="my-6 p-4 rounded-xl border border-indigo-100 bg-indigo-50">
  <p class="font-bold text-indigo-700 mb-3">Neste texto, você vai percorrer:</p>
  <ul class="list-disc list-inside text-gray-800">
    ${items}
  </ul>
</nav>
  `.trim();
}

/** Safe JSON parse */
function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function normalizeKeywordsFromFocus(focus: string): string[] {
  const parts = (focus || "")
    .split(/[,;\n|]+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];

  for (const p of parts) {
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

function clampMeta(s: string, max = 160): string {
  const one = (s || "").replace(/\s+/g, " ").trim();
  if (one.length <= max) return one;

  const cut = one.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim();
}

/* =========================
   Writers (IA permanece aqui)
   ========================= */
export async function writeSaintArticle(args: {
  topic: string;
  language: string;
  focusKeywords: string;
  date?: string;
  sourceText?: string;
  liturgySource?: string;
  model?: string;
  maxCompletionTokens?: number;
  temperature?: number;
}): Promise<string> {
  const settings = await loadAgentSettings();
  const openai = getOpenAI();

  const model = args.model ?? process.env.OPENAI_MODEL_WRITER ?? "gpt-4o-mini";
  const max_completion_tokens = args.maxCompletionTokens ?? 2600;
  const temperature = args.temperature ?? 0.75;

  const userPayload = [
    `SANTO_DO_DIA: "${args.topic}"`,
    `IDIOMA: ${args.language}`,
    `PALAVRAS_CHAVE_FOCO: ${args.focusKeywords}`,
    args.date ? `DATA: ${args.date}` : `DATA: (não fornecida)`,
    args.liturgySource?.trim()
      ? `\nLITURGIA_FONTE:\n${args.liturgySource.trim()}`
      : `\nLITURGIA_FONTE: (não fornecida)`,
    args.sourceText?.trim()
      ? `\nTEXTO_FONTE_SANTO:\n${args.sourceText.trim()}`
      : `\nTEXTO_FONTE_SANTO: (não fornecido)\nIMPORTANTE: sem texto-fonte, evite afirmar fatos históricos específicos.`,
  ].join("\n");

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: settings.writer_instructions },
      { role: "user", content: userPayload },
    ],
    temperature,
    max_completion_tokens,
  });

  return (response.choices[0]?.message?.content || "").trim();
}

export async function writeThemeArticle(args: {
  topic: string;
  language: string;
  focusKeywords: string;
  instructions: string;
  model?: string;
  maxCompletionTokens?: number;
  temperature?: number;
}): Promise<string> {
  const openai = getOpenAI();

  const model =
    args.model ??
    process.env.OPENAI_MODEL_WRITER_THEME ??
    process.env.OPENAI_MODEL_WRITER ??
    "gpt-4o-mini";

  const max_completion_tokens = args.maxCompletionTokens ?? 2800;
  const temperature = args.temperature ?? 0.8;

  const userPayload = [`TEMA: "${args.topic}"`, `IDIOMA: ${args.language}`, `PALAVRAS_CHAVE_FOCO: ${args.focusKeywords}`].join(
    "\n"
  );

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: args.instructions },
      { role: "user", content: userPayload },
    ],
    temperature,
    max_completion_tokens,
  });

  return (response.choices[0]?.message?.content || "").trim();
}

/**
 * ✅ Mantém compatibilidade com rotas antigas (writer antigo)
 */
export async function writeNewsArticle(
  topic: string,
  language: string,
  focusKeywords: string,
  opts?: {
    sourceText?: string;
    liturgySource?: string;
    model?: string;
    maxCompletionTokens?: number;
    temperature?: number;
    date?: string;
  }
): Promise<string> {
  return writeSaintArticle({
    topic,
    language,
    focusKeywords,
    date: opts?.date,
    sourceText: opts?.sourceText,
    liturgySource: opts?.liturgySource,
    model: opts?.model,
    maxCompletionTokens: opts?.maxCompletionTokens,
    temperature: opts?.temperature,
  });
}

/* =========================
   Formatter (SEM IA) — SEO/Robusto (final)
   - ignora [SEO]
   - extrai [liturgia] e [terco] (não duplica no corpo)
   - extrai título (H1) + excerpt (1º parágrafo após H1)
   - garante 1 único H1 NA PÁGINA
   - remove QUALQUER "# " restante do corpo
   - evita duplicação do excerpt
   - TOC condicional baseado em H2
   - ids sec-1..n em H2
   - Liturgia + Terço em GRID
   - datePublished = data atual do sistema
   ========================= */

function escapeHtml(s: string) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeNewlines(s: string) {
  return (s || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function stripFirstH1(md: string) {
  const src = normalizeNewlines(md);
  const lines = src.split("\n");
  const idx = lines.findIndex((l) => /^#\s+/.test(l));
  if (idx === -1) return src.trim();
  lines.splice(idx, 1);
  return lines.join("\n").trim();
}

function stripAllH1(md: string) {
  return normalizeNewlines(md)
    .replace(/^#\s+.*$/gm, "")
    .trim();
}

function stripExcerptFromBody(mdBodyAfterH1: string, excerpt: string) {
  const body = normalizeNewlines(mdBodyAfterH1).trimStart();
  const ex = normalizeNewlines(excerpt || "").trim();
  if (!ex) return body.trim();

  if (body.startsWith(ex)) {
    return body.slice(ex.length).trimStart().replace(/^\n+/, "").trim();
  }

  const firstParaMatch = body.match(/^([\s\S]*?)(\n{2,}|$)/);
  const firstPara = (firstParaMatch?.[1] || "").trim();
  if (firstPara && firstPara === ex) {
    return body.slice((firstParaMatch?.[0] || "").length).trimStart().trim();
  }

  return body.trim();
}

function renderSpecialBlocksGrid(liturgiaHtml: string, tercoHtml: string) {
  return `
<section class="mt-10" aria-label="Liturgia e Terço">
  <div class="grid gap-4 md:grid-cols-2">
    ${liturgiaHtml}
    ${tercoHtml}
  </div>
</section>
  `.trim();
}

export async function formatArticleToHtml(
  articleText: string
): Promise<string> {
  const input = normalizeNewlines(articleText || "").trim();

  // DATA ATUAL DO SISTEMA (SEO)
  const publishedDate = new Date();
  const publishedISO = publishedDate.toISOString().split("T")[0];

  // 1) remove bloco [SEO]
  const { cleaned: mdNoSeo } = extractBlock(input, "SEO");

  // 2) extrai liturgia e terço
  const { mdClean, liturgia, terco } = extractSpecialBlocks(mdNoSeo);

  // 3) título + excerpt
  const { title, excerpt } = extractTitleAndExcerpt(mdClean);

  // 4) corpo limpo
  const mdAfterFirstH1 = stripFirstH1(mdClean);
  const mdNoExcerpt = stripExcerptFromBody(mdAfterFirstH1, excerpt);
  const mdBody = stripAllH1(mdNoExcerpt);

  // 5) TOC
  const { toc } = buildToc(mdBody);
  const tocHtml = renderToc(toc, 4);

  // 6) Markdown → HTML
  marked.setOptions({ gfm: true, breaks: false });
  const rawBodyHtml = String(marked.parse(mdBody));
  const bodyHtml = applySectionIdsToHtml(rawBodyHtml, toc);

  // 7) Header seguro
  const safeTitle = escapeHtml(title || "Tio Ben");
  const safeExcerpt = escapeHtml(
    excerpt ||
      "Hoje, caminhemos juntos pela fé: uma leitura que ilumina, consola e nos aproxima de Deus na vida concreta."
  );

  const liturgiaHtml = renderSpecialBlock({
    title: "Liturgia do dia",
    markdown: (liturgia || "").trim(),
    variant: "liturgia",
  });

  const tercoHtml = renderSpecialBlock({
    title: "Terço do dia",
    markdown: (terco || "").trim(),
    variant: "terco",
  });

  const specialsGridHtml = renderSpecialBlocksGrid(liturgiaHtml, tercoHtml);

  return `
<article
  class="post-santo mx-auto w-full max-w-screen-xl px-2 sm:px-4 lg:px-10 py-4 lg:py-8 bg-white font-sans text-gray-800 leading-relaxed min-h-screen"
  itemscope
  itemtype="https://schema.org/Article"
>
  <header class="mb-10 border-b border-indigo-200 pb-4">
    <p class="text-sm text-gray-500 mb-1">
      <time datetime="${publishedISO}" itemprop="datePublished">
        ${publishedISO}
      </time>
    </p>

    <p class="text-sm text-gray-500 mb-2" itemprop="author" itemscope itemtype="https://schema.org/Person">
      <span itemprop="name">Tio Ben</span>
    </p>

    <h1 class="text-3xl sm:text-4xl font-extrabold text-indigo-700 mb-2 leading-tight" itemprop="headline">
      ${safeTitle}
    </h1>

    <p class="introducao text-lg text-gray-600 italic" itemprop="description">
      ${safeExcerpt}
    </p>
  </header>

  ${tocHtml}

  <div class="my-8 flex justify-center">
    <ins class="adsbygoogle"
      style="display:block;"
      data-ad-client="ca-pub-8819996017476509"
      data-ad-slot="3041346283"
      data-ad-format="fluid"
      data-full-width-responsive="true">
    </ins>
  </div>

  <div itemprop="articleBody" class="prose max-w-none">
    ${bodyHtml}
  </div>

  ${specialsGridHtml}
</article>
  `.trim();
}


/* =========================
   SEO metadata (SEM IA)
   - lê APENAS [SEO]...[/SEO]
   - ignora o resto
   ========================= */
export async function analyzeSeoAndExtractMetadata(
  articleText: string,
  focusKeywords: string,
  _opts?: { model?: string; maxCompletionTokens?: number; temperature?: number } // compat
): Promise<{ keywords: string[]; metaDescription: string }> {
  const { value: seoBlock, cleaned: mdNoSeoBlock } = extractBlock(articleText, "SEO");

  // 1) Se veio bloco [SEO], parseia e valida
  if (seoBlock) {
    const parsed = safeJsonParse<{ keywords?: unknown; metaDescription?: unknown }>(seoBlock);

    const keywords =
      parsed?.keywords && Array.isArray(parsed.keywords)
        ? parsed.keywords.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 12)
        : [];

    const metaDescription = typeof parsed?.metaDescription === "string" ? clampMeta(parsed.metaDescription, 160) : "";

    if (keywords.length >= 6 && metaDescription) {
      return { keywords, metaDescription };
    }
  }

  // 2) Fallback: deriva de focusKeywords + excerpt
  const { excerpt } = extractTitleAndExcerpt(mdNoSeoBlock);

  const baseKeywords = normalizeKeywordsFromFocus(focusKeywords);
  const keywords = baseKeywords.slice(0, 8);

  return {
    keywords: (keywords.length >= 6 ? keywords : [...keywords, "liturgia diária", "oração católica"]).slice(0, 8),
    metaDescription: clampMeta(
      excerpt || "Reflexão católica do dia, com fé e esperança para viver o Evangelho na vida real.",
      160
    ),
  };
}
