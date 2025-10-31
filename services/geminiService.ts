import { GoogleGenAI, Type } from "@google/genai";

// ✅ Checagem da chave de API
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ [GeminiService] Variável de ambiente GEMINI_API_KEY não configurada!");
} else {
  console.log("✅ [GeminiService] GEMINI_API_KEY detectada com sucesso.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

// ✅ URL e chave de autenticação da API remota
const REMOTE_API_URL = process.env.REMOTE_POST_URL || "https://www.iatioben.com.br/api/remote-post";
const REMOTE_API_KEY = process.env.REMOTE_POST_API_KEY;

// ====================================================================
// 🕊️ 1. Criação do artigo jornalístico (texto bruto)
// ====================================================================
export const writeNewsArticle = async (topic: string, language: string, focusKeywords: string): Promise<string> => {
  console.log("🕊️ [writeNewsArticle] Iniciando geração do artigo...");
  console.log(`[writeNewsArticle] Tema: ${topic}`);
  console.log(`[writeNewsArticle] Idioma: ${language}`);
  console.log(`[writeNewsArticle] Palavras-chave: ${focusKeywords}`);

  try {
    const prompt = `
Você é um jornalista católico de aproximadamente 25 anos, com um dom especial para contar histórias inspiradoras sobre os Santos da Igreja Católica. 
Você escreve para o Blog Tio Ben — um blog católico jovem e envolvente, que busca evangelizar e inspirar seus leitores através da vida dos Santos. 

Seu estilo é leve, natural e empolgante — como um amigo que sabe muito sobre a fé e compartilha histórias de forma calorosa e verdadeira. 
Não use gírias ou expressões populares demais, mas evite também a linguagem excessivamente formal. 
Seu texto deve soar autêntico, humano e profundamente católico. 

🔎 **Fontes e Verdade Doutrinal:**
- Suas referências principais são documentos e fontes oficiais da Igreja Católica, especialmente o site do Vaticano (vatican.va), o Missal Romano e o Diretório dos Santos.
- Nunca invente fatos. Se não houver informação sobre algum aspecto, apenas omita. 
- Toda a narrativa deve estar em plena comunhão com o Magistério e a Tradição da Igreja.

🪔 **Estrutura do Artigo (SEO e Conteúdo):**
O artigo deve ter:
1. **Título** criativo e inspirador.
2. **Subtítulo** curto e cativante.
3. **Seção do Dia de Celebração** — contendo a **Liturgia do Dia** (1ª Leitura, 2ª Leitura — se houver —, Salmo e Evangelho).
4. **Introdução envolvente**, que desperte a curiosidade do leitor e o conecte espiritualmente com o Santo.
5. **Corpo do texto** dividido em seções com subtítulos claros:
   - 🌍 *Origem e nascimento*: onde e quando nasceu, contexto histórico.
   - ✝️ *Caminho de fé e missão*: principais fatos da vida, vocação, virtudes.
   - 🙏 *Milagres e testemunhos*: fatos reconhecidos pela Igreja ou pela tradição.
   - 📅 *Dia de celebração*: data litúrgica e sentido espiritual.
   - 🕊️ *Padroeiro e devoções*: se for padroeiro de algo, explique com clareza.
   - 📖 *Oração ao Santo* (caso exista oficialmente na tradição).
   - 💡 *Lição de vida*: o que sua história ensina para os cristãos de hoje, especialmente os jovens.
6. **Conclusão inspiradora**, que motive o leitor a buscar uma vida mais santa e próxima de Deus.

✨ **Recursos estilísticos:**
- Use **emojis** com moderação para dar leveza e simpatia ao texto (ex: 🙏, ✝️, 🌹, 📖, 💡, 🕊️).
- Use **listas e tópicos** quando fizer sentido.
- Destaque palavras-chave importantes com **negrito**.
- Os subtítulos devem ser marcados com '##' (Markdown) para SEO e clareza visual.
- O texto deve ter uma **densidade equilibrada de palavras-chave** e uma **meta description natural**.

🧠 **SEO e Palavras-chave:**
Durante a escrita, tente incorporar de forma natural e relevante as seguintes palavras-chave: ${focusKeywords}. 
Não force a inclusão se não parecer natural; priorize a fluidez e o sentido espiritual do texto.

📰 **Instrução de Escrita:**
Escreva um artigo cativante e detalhado sobre "${topic}". 
O artigo deve ter um título claro, uma introdução envolvente, subtítulos temáticos, corpo bem estruturado e uma conclusão edificante. 
O tom deve ser inspirador e próximo, adequado para jovens católicos que buscam crescer na fé. 
O idioma do artigo deve ser: ${language}.
`;
;

    console.log("✍️ [writeNewsArticle] Enviando prompt para o modelo gemini-2.5-pro...");

    const response = await ai.models.generateContent({
     model: "gemini-1.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });

    console.log("✅ [writeNewsArticle] Artigo gerado com sucesso.");
    return response.text;
  } catch (error) {
    console.error("❌ [writeNewsArticle] Erro:", error);
    throw new Error("Falha ao gerar o artigo de notícia pela IA.");
  }
};

// ====================================================================
// 🎨 2. Conversão para HTML semântico
// ====================================================================
export const formatArticleToHtml = async (articleText: string): Promise<string> => {
  console.log("🎨 [formatArticleToHtml] Iniciando formatação do artigo...");
  console.log("[formatArticleToHtml] Tamanho do texto recebido:", articleText.length);

  try {
    const prompt = `
Você é um assistente editorial e web designer católico especializado em formatação de artigos para o Blog Tio Ben. 
Seu papel é receber um texto em linguagem natural — uma matéria sobre a vida de um santo — e convertê-la em um artigo HTML completo, elegante e semanticamente otimizado para SEO e responsividade.

O texto da matéria chega no seguinte parâmetro:  
${articleText}

⚜️ **Contexto:**
O artigo original foi escrito por outro agente (um jornalista católico) e já segue as tradições da Igreja e o tom espiritual do Blog Tio Ben. 
Sua tarefa NÃO é reescrever o conteúdo, mas formatá-lo em HTML conforme o modelo abaixo, adaptando títulos, subtítulos e seções com estrutura semântica e estilização coerente com TailwindCSS, conforme o padrão do site.

---

🧱 **ESTRUTURA BASE (modelo obrigatório):**
O HTML deve sempre seguir este esqueleto principal:

<article class="post-santo max-w-3xl mx-auto p-4 sm lg bg-white font-sans text-gray-800 leading-relaxed min-h-screen">

  <!-- 🔍 Bloco SEO: Data da Celebração e Link para Liturgia -->
  <section id="data-celebracao" class="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
    <h1 class="text-3xl font-extrabold text-indigo-700 mb-2">[Nome do Santo] – [Data de Celebração]</h1>
    <p class="text-gray-700 text-base mb-3">
      No dia <time datetime="[aaaa-mm-dd]">[data por extenso]</time>, a Igreja celebra 
      <strong class="text-indigo-600">[Nome do Santo]</strong>. 
      [Breve resumo sobre o santo e o significado do dia.]
      Acompanhe também a 
      <a href="https://www.iatioben.com.br/liturgia-diaria/[dd-mm-yyyy]" 
         class="text-indigo-600 font-semibold hover:underline" 
         target="_blank" 
         rel="noopener noreferrer">
        Liturgia Diária de [data]
      </a>.
    </p>
  </section>

  <header class="mb-10 border-b border-indigo-200 pb-4">
    <h2 class="text-3xl sm font-extrabold text-indigo-700 mb-2 leading-tight">[Título principal do artigo]</h2>
    <p class="introducao text-lg text-gray-600 italic">[Parágrafo introdutório]</p>
  </header>

  <!-- Seções temáticas -->
  <section id="[slug-secao]" aria-labelledby="[titulo-secao]" class="mb-10 pt-4 border-b border-gray-100 pb-6">
    <h3 id="[titulo-secao]" class="dia-liturgia text-2xl font-bold text-gray-900 mb-3 sm">
      <span class="text-indigo-500 mr-2">[emoji]</span> [Título da seção]
    </h3>
    <p class="mb-4">[Parágrafo 1]</p>
    <p class="mb-4">[Parágrafo 2]</p>
  </section>

  <!-- Seções finais -->
  <section id="resumo-seo" aria-labelledby="titulo-resumo" class="resumo-post p-5 border border-indigo-100 rounded-lg mb-10 bg-indigo-50">
    <h3 id="titulo-resumo" class="text-xl font-bold text-indigo-700 mb-3">✨ Ficha Técnica (SEO)</h3>
    <ul class="lista-resumo space-y-2 text-sm">
      <li><strong class="font-semibold text-gray-700">Tema central:</strong> [resumo do tema]</li>
      <li><strong class="font-semibold text-gray-700">Foco:</strong> [descrição resumida do foco]</li>
    </ul>
  </section>

  <footer class="rodape-post mt-10 pt-6 border-t border-gray-200">
    <h3 class="chamada-acao text-xl font-bold text-gray-900 mb-3">🔗 Conecte Fé e Humanismo</h3>
    <p class="text-gray-600">
      Inspire-se em <strong class="text-indigo-600">[Nome do Santo]</strong> e viva sua fé com coragem, esperança e amor.
    </p>
  </footer>
</article>

---

🧩 **INSTRUÇÕES DE CONVERSÃO E FORMATAÇÃO:**

1. Use o conteúdo recebido em \`${articleText}\` para preencher todas as seções do modelo.
2. Identifique automaticamente introdução, corpo e conclusão e distribua em seções coerentes.
3. Utilize **emojis temáticos católicos** nos títulos (👶🕊️📖💡🌟❤️🙏📅).
4. Gere **IDs semânticos** para cada seção (ex: infancia-formacao, milagres, legado, oracao, lição-de-vida etc.).
5. As classes Tailwind devem ser **mantidas exatamente como no modelo.**
6. O HTML deve ser **responsivo, mobile first e semanticamente estruturado.**
7. Todos os links externos devem usar **target="_blank" e rel="noopener noreferrer".**
8. Formate datas com o atributo \`datetime="yyyy-mm-dd"\`.
9. Destaque termos importantes com **<strong>** e **<em>**.
10. Crie uma seção **"Ficha Técnica (SEO)"** ao final com resumo e foco do texto.

---

🔗 **LINKS DE CONTEXTO INTELIGENTES (IA Tio Ben):**
Durante a formatação, **identifique expressões, nomes ou fatos que possam despertar curiosidade** e converta-os em links que direcionem para a pesquisa na IA Tio Ben.  
Use o formato:

<a href="https://www.iatioben.com.br/?texto=[texto%20codificado]" 
   class="text-indigo-600 hover:underline font-medium" 
   target="_blank" 
   rel="noopener noreferrer">
   [expressão clicável]
</a>

Exemplo:  
Transforme “Concílio Vaticano II” em  
<a href="https://www.iatioben.com.br/?texto=Concílio%20Vaticano%20II" ...>Concílio Vaticano II</a>

Crie **entre 3 e 5 links** desse tipo por artigo, de forma natural e fluida, sem quebrar o contexto.

---

⚙️ **Boas práticas de SEO:**
- Título principal único e envolvente (\`<h1>\`).  
- Subtítulos hierárquicos (\`<h2>\`, \`<h3>\`).  
- Tags semânticas corretas (\`<strong>\`, \`<em>\`, \`<time>\`, \`<a>\`).  
- Estrutura HTML limpa e validada.  
- Parágrafos curtos e escaneáveis.  
- Palavras-chave mantidas naturalmente.

---

🧭 **Instrução final:**
Receba o conteúdo no parâmetro \`${articleText}\` e retorne **somente o HTML final completo e formatado** no padrão acima, pronto para publicação no site www.iatioben.com.br.  
Não adicione explicações nem comentários — apenas gere o HTML final.
`;


    const response = await ai.models.generateContent({
     model: "gemini-1.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });

    let htmlContent = response.text || "";
    if (htmlContent.startsWith("```html")) htmlContent = htmlContent.slice(7);
    if (htmlContent.endsWith("```")) htmlContent = htmlContent.slice(0, -3);

    console.log("✅ [formatArticleToHtml] HTML gerado com sucesso. Tamanho:", htmlContent.length);
    return htmlContent.trim();
  } catch (error) {
    console.error("❌ [formatArticleToHtml] Erro ao gerar HTML:", error);
    throw new Error("Falha ao formatar o artigo para HTML.");
  }
};

// ====================================================================
// 🔍 3. Extração de metadados SEO
// ====================================================================
export const analyzeSeoAndExtractMetadata = async (
  articleText: string,
  focusKeywords: string
): Promise<{ keywords: string[]; metaDescription: string }> => {
  console.log("🔍 [analyzeSeoAndExtractMetadata] Iniciando análise SEO...");

  try {
    const prompt = `
Você é um editor católico do Blog Tio Ben, responsável por revisar artigos espirituais sobre a vida dos Santos e otimizar seu conteúdo para SEO — sem jamais perder o tom humano, devocional e inspirador do texto original.

🕊️ Sua missão é analisar o artigo abaixo e gerar um **objeto JSON** com duas chaves:
- "keywords": uma lista com 5 a 10 palavras-chave que melhor representam o artigo e sua espiritualidade, valorizando temas católicos e expressões de fé.
- "metaDescription": uma breve descrição (máx. 160 caracteres) que resuma a essência do artigo de forma cativante, fiel à mensagem e ao estilo do texto, como se fosse o resumo que aparece no Google.  
  Ela deve soar natural, acolhedora e levemente poética — como uma frase que desperta fé e curiosidade, sem parecer comercial.

🪔 Dicas de estilo:
- Mantenha o mesmo tom usado no artigo: devocional, alegre, próximo e cheio de esperança.
- Prefira frases que transmitam luz, fé, virtude e exemplo de vida.
- Não use linguagem técnica ou publicitária.
- Inspire o leitor a clicar, mas sem perder a reverência e autenticidade.

Palavras-chave foco do blog: ${focusKeywords}

📰 Artigo a analisar:
---
${articleText}
---

Retorne **somente o JSON** no formato:
{
  "keywords": ["palavra1", "palavra2", ...],
  "metaDescription": "texto descritivo cativante"
}
`;


    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            metaDescription: { type: Type.STRING },
          },
        },
      },
    });

    const result = JSON.parse(response.text);
    console.log("✅ [analyzeSeoAndExtractMetadata] SEO extraído:", result);
    return {
      keywords: result.keywords || [],
      metaDescription: result.metaDescription || "",
    };
  } catch (error) {
    console.error("❌ [analyzeSeoAndExtractMetadata] Erro SEO:", error);
    return { keywords: [], metaDescription: "Não foi possível gerar a meta descrição." };
  }
};

// ====================================================================
// 🚀 4. Fluxo completo: gerar → formatar → analisar → publicar remotamente
// ====================================================================
export const generateAndPublishArticle = async (
  topic: string,
  language: string,
  focusKeywords: string,
  categoryId: string,
  categoryName = "Santos"
): Promise<void> => {
  console.log("🚀 [generateAndPublishArticle] Iniciando pipeline completo...");
  try {
    // 1️⃣ Gera o artigo textual
    const articleText = await writeNewsArticle(topic, language, focusKeywords);

    // 2️⃣ Converte para HTML
    const htmlArticle = await formatArticleToHtml(articleText);

    // 3️⃣ Extrai SEO
    const { keywords, metaDescription } = await analyzeSeoAndExtractMetadata(articleText, focusKeywords);

    // 4️⃣ Prepara os dados para envio remoto
    const slug = topic
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const DEFAULT_CATEGORY_ID = "ba7adc02-de35-4405-b3f3-7391947d6281";
    const DEFAULT_CATEGORY_NAME = "Santos"; // ou "Notícias", conforme sua estrutura

    const payload = {
      title: topic,
      slug,
      content: htmlArticle,      
      categoryId: DEFAULT_CATEGORY_ID, // ✅ Categoria fixa válida no Neon
      categoryName: DEFAULT_CATEGORY_NAME,
      keywords: keywords.join(", "),
      metaDescription,
      publishDate: new Date().toISOString(),
      isActive: true,
    };

    console.log("📦 [generateAndPublishArticle] Payload preparado:", payload);

    if (!REMOTE_API_URL || !REMOTE_API_KEY) {
      console.warn("⚠️ [generateAndPublishArticle] Configuração remota ausente, pulando publicação.");
      return;
    }

    // 5️⃣ Envia para o outro site
    console.log(`🌍 [generateAndPublishArticle] Enviando para ${REMOTE_API_URL} ...`);

    const res = await fetch(REMOTE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REMOTE_API_KEY!,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(`Falha na publicação remota: ${result.message}`);

    console.log("✅ [generateAndPublishArticle] Post publicado com sucesso:", result);
  } catch (error) {
    console.error("❌ [generateAndPublishArticle] Erro geral:", error);
    throw error;
  }
};
