// formatter.ts (arquivo completo corrigido)
// - Design System centralizado
// - Aplica classes por TAG no HTML do marked
// - H2/H3/H4 editorial
// - Blocos especiais (Liturgia / Terço) com espaçamento mobile-safe
// - TOC condicional (>= 4 H2)
// - IDs sec-x nos H2
// - [SEO] removido do HTML (remove TODOS), usado só para meta tags
// - Correções mobile: quebra de URL longa, overflow-x-hidden, toc mais resiliente
// - Pós-processamento: converte URL crua em link com âncora amigável
// - Textos variáveis (15 opções) para link e (opcional) título do card
//
// Observação: este arquivo mantém seus writers com IA (writeSaintArticle/writeThemeArticle).

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
    settings = await getSettings();
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

/** Extrai e remove um bloco [TAG]...[/TAG] (case-insensitive). Remove apenas o primeiro. */
function extractBlock(text: string, tag: string): { value: string; cleaned: string } {
  const re = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, "i");
  const match = text.match(re);
  if (!match) return { value: "", cleaned: text };
  const value = (match[1] ?? "").trim();
  const cleaned = text.replace(match[0], "").trim();
  return { value, cleaned };
}

/** Remove TODOS os blocos [TAG]...[/TAG] (case-insensitive) e retorna o primeiro value (se existir). */
function extractAllBlocks(text: string, tag: string): { firstValue: string; cleaned: string } {
  const re = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, "gi");
  let firstValue = "";
  let cleaned = text;

  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (!firstValue) firstValue = (m[1] ?? "").trim();
  }

  cleaned = cleaned.replace(re, "").trim();
  return { firstValue, cleaned };
}

/** Extrai múltiplos blocos especiais do markdown e remove do corpo principal. */
function extractSpecialBlocks(md: string): {
  mdClean: string;
  liturgia: string;
  terco: string;
} {
  let cleaned = md;

  const lit = extractAllBlocks(cleaned, "liturgia");
  cleaned = lit.cleaned;

  const ter = extractAllBlocks(cleaned, "terco");
  cleaned = ter.cleaned;

  return {
    mdClean: cleaned.trim(),
    liturgia: lit.firstValue,
    terco: ter.firstValue,
  };
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

/* =========================
   Safe JSON parse / keywords
   ========================= */
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
   Random text variants (15 cada)
   ========================= */

function pickRandom<T>(arr: T[], fallback: T): T {
  if (!arr?.length) return fallback;
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx] ?? fallback;
}

const LITURGIA_LINK_TEXTS = [
  "Ver a liturgia de hoje",
  "Ler a liturgia do dia",
  "Acompanhar a liturgia de hoje",
  "Ir para a Liturgia Diária",
  "Abrir a liturgia do dia",
  "Conferir a liturgia de hoje",
  "Ler as leituras de hoje",
  "Ver leituras e salmos de hoje",
  "Liturgia de hoje: abrir agora",
  "Ler a Palavra de hoje",
  "Consultar a liturgia do dia",
  "Veja a liturgia de hoje",
  "Acesse a liturgia diária",
  "Ver a liturgia e as leituras",
  "Liturgia do dia: ver agora",
];

const TERCO_LINK_TEXTS = [
  "Rezar o terço do dia",
  "Rezar o santo terço hoje",
  "Ir para o terço de hoje",
  "Meditar os mistérios no terço",
  "Reze o terço agora",
  "Acompanhar o terço do dia",
  "Terço de hoje: começar",
  "Iniciar o terço do dia",
  "Rezando juntos: terço",
  "Rezar o terço com calma",
  "Terço do dia: rezar agora",
  "Acessar o Santo Terço",
  "Rezar e meditar no terço",
  "Abrir o terço do dia",
  "Rezar o terço hoje",
];

const GENERIC_LINK_TEXTS = [
  "Abrir link",
  "Acessar agora",
  "Ver mais",
  "Ir para a página",
  "Continuar",
  "Saiba mais",
  "Abrir conteúdo",
  "Ver detalhes",
  "Ler agora",
  "Acessar conteúdo",
  "Abrir página",
  "Conferir",
  "Veja aqui",
  "Clique para abrir",
  "Ir agora",
];

const LITURGIA_CARD_TITLES = [
  "Liturgia do dia",
  "Liturgia de hoje",
  "Leituras da missa de hoje",
  "A Palavra de hoje",
  "Liturgia diária (hoje)",
  "Liturgia: hoje",
  "Leituras e salmos de hoje",
  "Liturgia e leituras",
  "Liturgia para hoje",
  "Liturgia do dia (missa)",
  "Liturgia: leituras do dia",
  "Liturgia do dia e reflexões",
  "Liturgia de hoje (rápido)",
  "Liturgia diária",
  "Liturgia de hoje (missa)",
];

const TERCO_CARD_TITLES = [
  "Terço do dia",
  "Terço de hoje",
  "Santo terço: hoje",
  "Reze o terço hoje",
  "Terço para hoje",
  "Terço e mistérios",
  "Momento do terço",
  "Terço: meditação de hoje",
  "Terço do dia (mistérios)",
  "Terço de hoje (começar)",
  "Terço: rezar agora",
  "Terço diário",
  "Terço de hoje (guiado)",
  "Santo terço",
  "Terço do dia (orar)",
];

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

  const userPayload = [
    `TEMA: "${args.topic}"`,
    `IDIOMA: ${args.language}`,
    `PALAVRAS_CHAVE_FOCO: ${args.focusKeywords}`,
  ].join("\n");

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

/** ✅ Compatibilidade com rotas antigas */
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

/* =========================
   Design System (Tailwind)
   ========================= */

type DsVariant = "default" | "amber" | "sky";

type DesignSystem = {
  article: string;
  header: {
    wrap: string;
    metaLine: string;
    authorLine: string;
    h1: string;
    excerpt: string;
  };
  typography: {
    h2: string;
    h3: string;
    h4: string;
    p: string;
    ul: string;
    ol: string;
    li: string;
    a: string;
    strong: string;
    blockquote: string;
    hr: string;
    img: string;
    codeInline: string;
    pre: string;
    tableWrap: string;
    table: string;
    thead: string;
    th: string;
    tbody: string;
    td: string;
  };
  toc: {
    wrap: string;
    title: string;
    list: string;
    link: string;
  };
  special: Record<
    DsVariant,
    {
      wrap: string;
      title: string;
    }
  >;
  longRead: {
    articleBody: string;
  };
};

const DS: DesignSystem = {
  article:
    "post-santo mx-auto w-full max-w-3xl px-3 sm:px-4 lg:max-w-5xl lg:px-6 py-6 bg-white font-sans text-gray-800 leading-relaxed min-h-screen overflow-x-hidden",

  header: {
    wrap: "mb-10 border-b border-gray-200 pb-6",
    metaLine: "text-sm text-gray-500",
    authorLine: "mt-1 text-sm text-gray-500",
    h1: "mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 leading-snug",
    excerpt: "mt-3 text-lg text-gray-700 leading-[1.9] break-words",
  },

  typography: {
    h2: "mt-14 mb-6 pl-4 text-xl sm:text-2xl font-bold text-gray-800 border-l-4 border-amber-300 leading-snug scroll-mt-28",
    h3: "mt-10 mb-4 text-lg sm:text-xl font-semibold text-gray-900 leading-snug scroll-mt-24",
    h4: "mt-8 mb-3 text-base sm:text-lg font-semibold text-gray-900 leading-snug scroll-mt-24",

    p: "my-5 text-[17px] leading-[1.95] text-gray-700 break-words",
    ul: "my-5 pl-6 list-disc space-y-2 text-[17px] leading-[1.95] text-gray-700 break-words",
    ol: "my-5 pl-6 list-decimal space-y-2 text-[17px] leading-[1.95] text-gray-700 break-words",
    li: "text-[17px] leading-[1.95] text-gray-700 break-words",

    a: "font-semibold text-amber-800 underline decoration-amber-300 hover:decoration-amber-600 break-words underline-offset-2",
    strong: "text-gray-900 font-semibold",

    blockquote:
      "my-7 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-gray-700 [&>p]:my-3 break-words",

    hr: "my-10 border-gray-200",
    img: "my-8 rounded-2xl shadow-sm border border-gray-200 max-w-full h-auto",

    codeInline:
      "px-1.5 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[0.95em] text-gray-900 break-words",

    pre: "my-7 overflow-x-auto rounded-2xl border border-gray-200 bg-gray-950 p-5 text-gray-100 text-sm leading-relaxed",

    tableWrap: "my-8 overflow-x-auto rounded-2xl border border-gray-200",
    table: "w-full border-collapse text-left text-sm",
    thead: "bg-gray-50",
    th: "px-4 py-3 font-semibold text-gray-900 border-b border-gray-200 whitespace-nowrap",
    tbody: "divide-y divide-gray-200",
    td: "px-4 py-3 text-gray-700 align-top break-words",
  },

  toc: {
    wrap: "my-8 rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm overflow-hidden",
    title: "text-sm font-semibold text-amber-900 tracking-wide",
    list: "mt-4 grid gap-2 sm:grid-cols-2",
    link:
      "inline-flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-amber-100 bg-white/70 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 transition whitespace-normal break-words",
  },

  special: {
    default: { wrap: "border-gray-200 bg-white", title: "text-gray-900" },
    amber: { wrap: "border-amber-200 bg-[#fffaf1]", title: "text-amber-900" },
    sky: { wrap: "border-sky-200 bg-sky-50", title: "text-sky-900" },
  },

  longRead: {
    articleBody: "max-w-none overflow-hidden",
  },
};

/* =========================
   Class appliers
   ========================= */

function normalizeAttrs(attrs: string): string {
  const a = (attrs || "").trim().replace(/\s+/g, " ").trim();
  return a ? " " + a : "";
}

function addOrAppendClass(attrs: string, classToAdd: string): string {
  const hasClass = /\bclass\s*=\s*"/i.test(attrs);
  if (!hasClass) return `${attrs} class="${classToAdd}"`;
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

/** Aplica ids sec-x nos <h2> do HTML e garante classes do DS. */
function applySectionIdsToHtml(html: string, toc: { id: string; title: string }[]): string {
  let idx = 0;

  return html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_full, rawAttrs: string, inner: string) => {
    idx++;
    const id = toc[idx - 1]?.id ?? `sec-${idx}`;
    let attrs = (rawAttrs || "").trim();

    attrs = ensureAttr(attrs, "id", id);
    attrs = addOrAppendClass(attrs, DS.typography.h2);

    return `<h2${normalizeAttrs(attrs)}>${inner}</h2>`;
  });
}

/**
 * Aplica classes por TAG no HTML gerado.
 * Ajuste: NÃO aplicar codeInline em <code> dentro de <pre>.
 */
function applyTagClasses(html: string): string {
  let out = html;

  out = out.replace(/<h3([^>]*)>/gi, (_m, attrs) => `<h3${normalizeAttrs(addOrAppendClass(attrs, DS.typography.h3))}>`);
  out = out.replace(/<h4([^>]*)>/gi, (_m, attrs) => `<h4${normalizeAttrs(addOrAppendClass(attrs, DS.typography.h4))}>`);

  out = out.replace(/<p([^>]*)>/gi, (_m, attrs) => `<p${normalizeAttrs(addOrAppendClass(attrs, DS.typography.p))}>`);

  out = out.replace(/<ul([^>]*)>/gi, (_m, attrs) => `<ul${normalizeAttrs(addOrAppendClass(attrs, DS.typography.ul))}>`);
  out = out.replace(/<ol([^>]*)>/gi, (_m, attrs) => `<ol${normalizeAttrs(addOrAppendClass(attrs, DS.typography.ol))}>`);
  out = out.replace(/<li([^>]*)>/gi, (_m, attrs) => `<li${normalizeAttrs(addOrAppendClass(attrs, DS.typography.li))}>`);

  out = out.replace(/<a([^>]*)>/gi, (_m, attrs) => `<a${normalizeAttrs(addOrAppendClass(attrs, DS.typography.a))}>`);
  out = out.replace(/<strong([^>]*)>/gi, (_m, attrs) => `<strong${normalizeAttrs(addOrAppendClass(attrs, DS.typography.strong))}>`);

  out = out.replace(
    /<blockquote([^>]*)>/gi,
    (_m, attrs) => `<blockquote${normalizeAttrs(addOrAppendClass(attrs, DS.typography.blockquote))}>`
  );
  out = out.replace(/<hr([^>]*)\/?>/gi, (_m, attrs) => `<hr${normalizeAttrs(addOrAppendClass(attrs, DS.typography.hr))} />`);
  out = out.replace(/<img([^>]*)\/?>/gi, (_m, attrs) => `<img${normalizeAttrs(addOrAppendClass(attrs, DS.typography.img))} />`);

  out = out.replace(/<pre([^>]*)>/gi, (_m, attrs) => `<pre${normalizeAttrs(addOrAppendClass(attrs, DS.typography.pre))}>`);

  // Protege <pre><code...> para não aplicar codeInline nele
  const token = "__CODEBLOCK__";
  out = out.replace(/<pre([^>]*)>\s*<code([^>]*)>/gi, (_m, preAttrs, codeAttrs) => {
    return `<pre${normalizeAttrs(preAttrs)}>${token}<code${normalizeAttrs(codeAttrs)}>`;
  });

  // codeInline apenas fora de pre
  out = out.replace(/<code([^>]*)>/gi, (_m, attrs) => `<code${normalizeAttrs(addOrAppendClass(attrs, DS.typography.codeInline))}>`);

  // desfaz token
  out = out.replace(new RegExp(token, "g"), "");

  // tables
  out = out.replace(/<table([^>]*)>/gi, (_m, attrs) => {
    const tableOpen = `<table${normalizeAttrs(addOrAppendClass(attrs, DS.typography.table))}>`;
    return `<div class="${DS.typography.tableWrap}">${tableOpen}`;
  });
  out = out.replace(/<\/table>/gi, "</table></div>");
  out = out.replace(/<thead([^>]*)>/gi, (_m, attrs) => `<thead${normalizeAttrs(addOrAppendClass(attrs, DS.typography.thead))}>`);
  out = out.replace(/<th([^>]*)>/gi, (_m, attrs) => `<th${normalizeAttrs(addOrAppendClass(attrs, DS.typography.th))}>`);
  out = out.replace(/<tbody([^>]*)>/gi, (_m, attrs) => `<tbody${normalizeAttrs(addOrAppendClass(attrs, DS.typography.tbody))}>`);
  out = out.replace(/<td([^>]*)>/gi, (_m, attrs) => `<td${normalizeAttrs(addOrAppendClass(attrs, DS.typography.td))}>`);

  return out;
}

/* =========================
   Link post-processing (URLs cruas -> [texto](url))
   ========================= */

function isLikelyAlreadyMarkdownLink(full: string, urlStartIndex: number) {
  // Heurística simples: se imediatamente antes do URL tiver "](" é provável que já seja [texto](url)
  const lookBehind = full.slice(Math.max(0, urlStartIndex - 2), urlStartIndex);
  return lookBehind === "](";
}

/**
 * Converte URLs "cruas" em markdown links com âncoras amigáveis (variáveis).
 * - Preserva links já em markdown.
 * - Evita engolir pontuação final: ), . , ; : !
 * - Primeira URL usa "primaryText" (randomizado); demais usam genericText (randomizado).
 */
function linkifyBareUrls(md: string, opts: { primaryText: string; genericText: string }) {
  const src = (md || "").trim();
  if (!src) return "";

  const urlRe = /(https?:\/\/[^\s)<]+)([).,;:!?]*)/g;
  let seen = 0;

  return src.replace(urlRe, (match, url, trailing, offset) => {
    if (isLikelyAlreadyMarkdownLink(src, offset)) return match;

    seen++;
    const text = seen === 1 ? opts.primaryText : opts.genericText;
    return `[${text}](${url})${trailing || ""}`;
  });
}

/* =========================
   TOC
   ========================= */
function renderToc(toc: { id: string; title: string }[], minH2 = 4): string {
  if (toc.length < minH2) return "";

  const items = toc
    .map(
      (t) => `
<li>
  <a class="${DS.toc.link}" href="#${t.id}">
    <span class="min-w-0 flex-1 break-words">${escapeHtml(t.title)}</span>
    <span aria-hidden="true" class="shrink-0">→</span>
  </a>
</li>`.trim()
    )
    .join("");

  return `
<nav class="${DS.toc.wrap}">
  <h4 class="${DS.toc.title}">Neste artigo</h4>
  <ul class="${DS.toc.list}">
    ${items}
  </ul>
</nav>
  `.trim();
}

/* =========================
   Blocos especiais (Liturgia/Terço)
   ========================= */
function renderSpecialBlock(params: { title: string; markdown: string; variant: DsVariant }): string {
  const { title, markdown, variant } = params;
  if (!markdown?.trim()) return "";

  const pal = DS.special[variant] ?? DS.special.default;

  // Textos variáveis (15 opções)
  const primaryText =
    variant === "amber"
      ? pickRandom(LITURGIA_LINK_TEXTS, "Ver a liturgia de hoje")
      : variant === "sky"
      ? pickRandom(TERCO_LINK_TEXTS, "Rezar o terço do dia")
      : pickRandom(GENERIC_LINK_TEXTS, "Abrir link");

  const genericText = pickRandom(GENERIC_LINK_TEXTS, "Abrir link");

  // 1) Converte URLs cruas -> [âncora](url)
  const mdPrettified = linkifyBareUrls(markdown.trim(), { primaryText, genericText });

  // 2) Renderiza markdown -> HTML e aplica classes
  const innerHtmlRaw = String(marked.parse(mdPrettified));
  const innerHtml = applyTagClasses(innerHtmlRaw);

  return `
<section class="my-5 rounded-xl border ${pal.wrap} p-5 sm:p-6 shadow-sm overflow-hidden">
  <h3 class="${DS.typography.h3} ${pal.title} !mt-0">${escapeHtml(title)}</h3>

  <div class="${DS.longRead.articleBody} break-words">
    ${innerHtml}
  </div>
</section>
  `.trim();
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

/* =========================
   Formatter principal
   ========================= */
export async function formatArticleToHtml(articleText: string): Promise<string> {
  const input = normalizeNewlines(articleText || "").trim();

  // DATA ATUAL DO SISTEMA (SEO)
  const publishedDate = new Date();
  const publishedISO = publishedDate.toISOString().split("T")[0];

  // 1) remove TODOS os blocos [SEO] do HTML final
  const seoRemoved = extractAllBlocks(input, "SEO");
  const mdNoSeo = seoRemoved.cleaned;

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

  // 7) ids + classes DS
  const withIds = applySectionIdsToHtml(rawBodyHtml, toc);
  const bodyHtml = applyTagClasses(withIds);

  // 8) Header seguro
  const safeTitle = escapeHtml(title || "Tio Ben");
  const safeExcerpt = escapeHtml(
    excerpt ||
      "Hoje, caminhemos juntos pela fé: uma leitura que ilumina, consola e nos aproxima de Deus na vida concreta."
  );

  // 9) Especiais (com títulos variáveis também)
  const liturgiaTitle = pickRandom(LITURGIA_CARD_TITLES, "Liturgia do dia");
  const tercoTitle = pickRandom(TERCO_CARD_TITLES, "Terço do dia");

  const liturgiaHtml = renderSpecialBlock({
    title: liturgiaTitle,
    markdown: (liturgia || "").trim(),
    variant: "amber",
  });

  const tercoHtml = renderSpecialBlock({
    title: tercoTitle,
    markdown: (terco || "").trim(),
    variant: "sky",
  });

  const specialsGridHtml = renderSpecialBlocksGrid(liturgiaHtml, tercoHtml);

  return `
<article class="${DS.article}" itemscope itemtype="https://schema.org/Article">
  <header class="${DS.header.wrap}">
    <p class="${DS.header.metaLine}">
      <time datetime="${publishedISO}" itemprop="datePublished">${publishedISO}</time>
    </p>

    <p class="${DS.header.authorLine}" itemprop="author" itemscope itemtype="https://schema.org/Person">
      <span itemprop="name">Tio Ben</span>
    </p>

    <h1 class="${DS.header.h1}" itemprop="headline">${safeTitle}</h1>

    <p class="${DS.header.excerpt}" itemprop="description">${safeExcerpt}</p>
  </header>

  ${tocHtml}

  <div class="my-8 flex justify-center overflow-hidden">
    <ins class="adsbygoogle"
      style="display:block;"
      data-ad-client="ca-pub-8819996017476509"
      data-ad-slot="3041346283"
      data-ad-format="fluid"
      data-full-width-responsive="true">
    </ins>
  </div>

  <div itemprop="articleBody" class="${DS.longRead.articleBody}">
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
  _opts?: { model?: string; maxCompletionTokens?: number; temperature?: number }
): Promise<{ keywords: string[]; metaDescription: string }> {
  const { firstValue: seoBlock, cleaned: mdNoSeoBlock } = extractAllBlocks(articleText, "SEO");

  // 1) Se veio bloco [SEO], parseia e valida
  if (seoBlock) {
    const parsed = safeJsonParse<{ keywords?: unknown; metaDescription?: unknown }>(seoBlock);

    const keywords =
      parsed?.keywords && Array.isArray(parsed.keywords)
        ? parsed.keywords.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 12)
        : [];

    const metaDescription =
      typeof parsed?.metaDescription === "string" ? clampMeta(parsed.metaDescription, 160) : "";

    if (keywords.length >= 6 && metaDescription) {
      return { keywords, metaDescription };
    }
  }

  // 2) Fallback: deriva de focusKeywords + excerpt (texto sem SEO)
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
