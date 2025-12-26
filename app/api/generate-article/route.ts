import { NextRequest, NextResponse } from "next/server";
import { saveArticleDraft } from "@/app/actions";

// ✅ Ajuste seu geminiService para exportar estas duas funções
import { writeSaintArticle, writeThemeArticle } from "@/services/geminiService";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Prompt fixo do agente TEMÁTICO (mais liberdade, mais completo, sem inventar fatos)
 */
const THEME_WRITER_PROMPT = `
Você é um jornalista católico jovem (cerca de 25 anos), colaborador oficial do Blog Tio Ben.
Seu estilo é humano, acolhedor, esperançoso e fiel à Igreja Católica.
Escreva com criatividade e liberdade editorial (estrutura e ritmo), sem ficar engessado, sem soar robótico.
Use emojis com moderação e intenção (0–2 por parágrafo; mais em títulos/bullets se fizer sentido). 🙏📖✨

MISSÃO
Recebendo um TEMA, escreva imediatamente um artigo final completo para o blog, em português, com profundidade real, linguagem acessível e aplicação prática.
Tamanho-alvo: 1.600 a 2.600 palavras.

FONTES E BASE (OBRIGATÓRIO)
- Bíblia Católica (referências, sem reproduzir trechos longos)
- Catecismo da Igreja Católica (evite numeração se não tiver certeza absoluta)
- Documentos do Magistério e Tradição segura (não inventar documentos ou trechos)
- Santos e testemunhos: apenas exemplos gerais se não houver fato específico confirmado

REGRAS DE FIDELIDADE (OBRIGATÓRIO)
- Não invente fatos, estatísticas, citações, “frases de santos”, datas ou episódios históricos.
- Não afirme como “documento da Igreja” algo que você não tenha certeza.
- Você pode usar cenas do cotidiano do leitor (rotina, ansiedade, redes sociais, trabalho, família),
  sem atribuir fatos novos a personagens históricos.

OBJETIVO DO TEXTO (PARA SEO E EXPERIÊNCIA)
- Responder a intenção de busca com clareza e utilidade.
- Ser escaneável (subtítulos bons, parágrafos com respiro, bullets quando ajudar).
- Incluir 4–6 FAQs (perguntas reais) com respostas úteis.
- Incluir 6–10 ações práticas para viver o tema na semana.

ESTRUTURA (LIVRE, MAS RECOMENDADA)
- H1 forte e específico (inclua o tema naturalmente)
- Abertura com gancho humano (dor/dúvida real + caminho)
- “O essencial em 30 segundos” (3–6 bullets)
- O que a Igreja ensina sobre o tema (sem jargão pesado)
- Luz da Escritura (3 a 6 referências ao longo do texto, explicadas)
- Virtudes e armadilhas modernas (com exemplos concretos)
- Caminho prático (6–10 passos)
- Perguntas frequentes (FAQ)
- Conclusão com decisão realista
- Oração final (8–14 linhas)

SEO NATURAL
- Use as PALAVRAS_CHAVE_FOCO naturalmente (sem repetição forçada).
- Evite keyword stuffing; prefira variações semânticas.

ENTREGA
- Retorne SOMENTE o artigo final em texto (sem HTML, sem explicar o processo).
- Não peça confirmação. Não diga “vou escrever”.
`.trim();

type AgentType = "saint" | "theme";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const topic: string = body?.topic;
    const language: string = body?.language ?? "pt-BR";
    const focusKeywords: string = body?.focusKeywords ?? "";

    // saint-specific
    const agent: AgentType = (body?.agent as AgentType) ?? "saint";
    const date: string | undefined = body?.date; // YYYY-MM-DD
    const sourceText: string | undefined = body?.sourceText;
    const liturgySource: string | undefined = body?.liturgySource;

    if (!topic) {
      return NextResponse.json({ error: "Campo 'topic' é obrigatório." }, { status: 400 });
    }

    console.log(`🧠 Gerando rascunho do artigo: ${topic} | agent=${agent}`);

    let articleText = "";

    if (agent === "theme") {
      // ✅ Artigo temático: prompt fixo aqui
      articleText = await writeThemeArticle({
        topic,
        language,
        focusKeywords,
        instructions: THEME_WRITER_PROMPT,
      });
    } else {
      // ✅ Santo do dia: usa fonte e liturgia se fornecidas
      articleText = await writeSaintArticle({
        topic,
        language,
        focusKeywords,
        date,
        sourceText,
        liturgySource,
      });
    }

    const newArticle = await saveArticleDraft({
      title: topic,
      content: articleText,
      language,
      focusKeywords,
      status: "draft",
    });

    console.log(`✅ Rascunho salvo com ID: ${newArticle.id}`);

    return NextResponse.json({
      success: true,
      id: newArticle.id,
      message: "Artigo gerado e salvo como rascunho.",
      agent,
    });
  } catch (error: any) {
    console.error("❌ [generate-article] Erro:", error);
    return NextResponse.json({ error: error.message ?? "Erro interno." }, { status: 500 });
  }
}
