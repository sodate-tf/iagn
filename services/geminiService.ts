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
    | { writer_instructions?: string | null; formatter_instructions?: string | null; seo_instructions?: string | null }
    | null = null;

  try {
    settings = await getSettings(); // AiSettings | null
  } catch (err) {
    // ✅ não derrubar build/runtime por falha do DB
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
function extractBlock(text: string, tag: string): { value: string; cleaned: string } {
  const re = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, "i");
  const match = text.match(re);
  if (!match) return { value: "", cleaned: text };
  const value = (match[1] ?? "").trim();
  const cleaned = text.replace(match[0], "").trim();
  return { value, cleaned };
}

/** Extrai H1 (# ...) e o primeiro parágrafo após o H1 (excerpt). */
function extractTitleAndExcerpt(md: string): { title: string; excerpt: string } {
  const lines = md.split("\n");
  let title = "";
  let i = 0;

  // acha o primeiro H1
  for (; i < lines.length; i++) {
    const m = lines[i].match(/^#\s+(.+)\s*$/);
    if (m) {
      title = m[1].trim();
      i++;
      break;
    }
  }

  // excerpt: primeiro parágrafo após H1
  let buff: string[] = [];
  for (; i < lines.length; i++) {
    const line = lines[i];

    if (/^#{1,6}\s+/.test(line)) break; // outro heading => para
    if (line.trim() === "") {
      if (buff.length) break; // fim do parágrafo
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

/**
 * Aplica ids sec-x nos <h2> gerados pelo marked.
 * Também aplica scroll offset via class "scroll-mt-28" (Tailwind) para header fixo.
 */
function applySectionIdsToHtml(html: string, toc: { id: string; title: string }[]): string {
  let idx = 0;

  return html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g, (full, attrs = "", inner) => {
    idx++;
    const id = toc[idx - 1]?.id ?? `sec-${idx}`;

    // Se já existe id, mantém como está
    if (/\sid=/.test(String(attrs))) return full;

    // Se já tem class, adiciona scroll-mt-28
    if (/\sclass=/.test(String(attrs))) {
      let updated = full;

      updated = updated.replace(/<h2(\s[^>]*)?>/, (open) => {
        // adiciona scroll-mt-28 dentro da class existente
        const withScroll = open.replace(/class="([^"]*)"/, (_m, cls) => {
          const next = `${cls} scroll-mt-28`.replace(/\s+/g, " ").trim();
          return `class="${next}"`;
        });

        // injeta id se ainda não tiver
        if (/\sid=/.test(withScroll)) return withScroll;
        return withScroll.replace("<h2", `<h2 id="${id}"`);
      });

      return updated;
    }

    // Sem class: cria com padrão
    return `<h2 id="${id}" class="text-2xl font-bold text-gray-900 mb-3 scroll-mt-28"${attrs}>${inner}</h2>`;
  });
}

/** Renderiza TOC condicional (quando houver "muitos H2"). */
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
    args.liturgySource?.trim() ? `\nLITURGIA_FONTE:\n${args.liturgySource.trim()}` : `\nLITURGIA_FONTE: (não fornecida)`,
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
    args.model ?? process.env.OPENAI_MODEL_WRITER_THEME ?? process.env.OPENAI_MODEL_WRITER ?? "gpt-4o-mini";

  const max_completion_tokens = args.maxCompletionTokens ?? 2800;
  const temperature = args.temperature ?? 0.8;

  const userPayload = [`TEMA: "${args.topic}"`, `IDIOMA: ${args.language}`, `PALAVRAS_CHAVE_FOCO: ${args.focusKeywords}`].join("\n");

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
   Formatter (SEM IA)
   - ignora [SEO]
   - gera excerpt inteligente
   - gera ids sec-1..n em H2
   - cria TOC condicional
   ========================= */
export async function formatArticleToHtml(
  articleText: string,
  _opts?: { model?: string; maxCompletionTokens?: number; temperature?: number } // mantido para compatibilidade
): Promise<string> {
  // 1) remove bloco [SEO]
  const { cleaned: mdNoSeo } = extractBlock(articleText, "SEO");

  // 2) extrai título + excerpt
  const { title, excerpt } = extractTitleAndExcerpt(mdNoSeo);

  // 3) TOC baseado em H2
  const { toc } = buildToc(mdNoSeo);
  const tocHtml = renderToc(toc, 4);

  // 4) Markdown -> HTML
  marked.setOptions({ gfm: true, breaks: false });

  const rawBody = String(marked.parse(mdNoSeo));

  // 5) aplica ids sec-x nos h2 + scroll offset
  const bodyHtml = applySectionIdsToHtml(rawBody, toc);

  // 6) Monta artigo final (padrão do Tio Ben)
  const safeTitle = title || "Santo do Dia";
  const safeExcerpt =
    excerpt ||
    "Hoje, caminhemos juntos pela fé: uma leitura que ilumina, consola e nos aproxima de Deus na vida concreta.";

  return `
<article
  class="post-santo
         mx-auto
         w-full
         max-w-screen-xl
         px-2 sm:px-4 lg:px-10
         py-4 lg:py-8
         bg-white
         font-sans text-gray-800 leading-relaxed
         min-h-screen"
  itemscope
  itemtype="https://schema.org/Article"
>
  <header class="mb-10 border-b border-indigo-200 pb-4">
    <h2 class="text-3xl sm font-extrabold text-indigo-700 mb-2 leading-tight" itemprop="headline">${safeTitle}</h2>
    <p class="introducao text-lg text-gray-600 italic" itemprop="description">${safeExcerpt}</p>
  </header>

  ${tocHtml}

  <div class="my-8 flex justify-center">
    <ins class="adsbygoogle" style="display:block;" data-ad-client="ca-pub-8819996017476509" data-ad-slot="3041346283" data-ad-format="fluid" data-full-width-responsive="true"></ins>
  </div>

  <div itemprop="articleBody" class="prose max-w-none">
    ${bodyHtml}
  </div>
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
  _opts?: { model?: string; maxCompletionTokens?: number; temperature?: number } // mantido para compatibilidade
): Promise<{ keywords: string[]; metaDescription: string }> {
  const { value: seoBlock, cleaned: mdNoSeoBlock } = extractBlock(articleText, "SEO");

  // 1) Se veio bloco [SEO], parseia e valida
  if (seoBlock) {
    const parsed = safeJsonParse<{ keywords?: unknown; metaDescription?: unknown }>(seoBlock);

    const keywords =
      parsed?.keywords && Array.isArray(parsed.keywords)
        ? parsed.keywords.map(String).filter(Boolean).slice(0, 12)
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
    keywords: keywords.length >= 6 ? keywords : [...keywords, "liturgia diária", "oração católica"].slice(0, 8),
    metaDescription: clampMeta(excerpt || "Reflexão católica do dia, com fé e esperança para viver o Evangelho na vida real.", 160),
  };
}
