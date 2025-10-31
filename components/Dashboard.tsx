"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  NomeAgente,
  StatusAgente,
  type Agente,
  type EventoCalendario,
  type ArtigoNoticia,
} from "../types";
import { generateAndSaveArticleAction } from "../app/actions";
import AgentCard from "./AgentCard";
import GeneratedPost from "./GeneratedPost";
import { PlayCircle } from "lucide-react";

const initialAgents: Agente[] = [
  {
    name: NomeAgente.CALENDARIO,
    description: "Busca o tópico da notícia de hoje no calendário.",
    status: StatusAgente.PENDENTE,
  },
  {
    name: NomeAgente.ESCRITOR,
    description: "Escreve o artigo de notícia com base no tópico.",
    status: StatusAgente.PENDENTE,
    model: "gemini-2.5-pro",
  },
  {
    name: NomeAgente.FORMATADOR,
    description: "Formata o artigo em HTML estilizado.",
    status: StatusAgente.PENDENTE,
    model: "gemini-2.5-flash",
  },
  {
    name: NomeAgente.SEO,
    description: "Analisa o SEO e extrai metadados.",
    status: StatusAgente.PENDENTE,
    model: "gemini-2.5-flash",
  },
  {
    name: NomeAgente.PUBLICADOR,
    description: "Salva o artigo final no banco de dados.",
    status: StatusAgente.PENDENTE,
  },
];

interface DashboardProps {
  language?: string;
  focusKeywords?: string;
  onArticleGenerated?: (article: ArtigoNoticia) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  language = "Português",
  focusKeywords = "",
  onArticleGenerated,
}) => {
  const [agents, setAgents] = useState<Agente[]>(initialAgents);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<EventoCalendario | null>(
    null
  );
  const [article, setArticle] = useState<ArtigoNoticia | null>(null);

  const updateAgentStatus = useCallback(
    (agentName: NomeAgente, status: StatusAgente) => {
      console.log(`[Dashboard] 🧩 Atualizando status do agente ${agentName} → ${status}`);
      setAgents((prev) =>
        prev.map((agent) =>
          agent.name === agentName ? { ...agent, status } : agent
        )
      );
    },
    []
  );

  const resetState = useCallback(() => {
    console.log("[Dashboard] 🔄 Resetando estado inicial do pipeline...");
    setAgents(initialAgents);
    setIsProcessing(false);
    setCurrentEvent(null);
    setArticle(null);
  }, []);

  const handleStartGeneration = useCallback(async () => {
    console.group("🚀 [Dashboard] Iniciando pipeline de geração de notícia");
    resetState();
    setIsProcessing(true);

    try {
      // 1️⃣ Buscar evento de hoje no calendário
      console.log("[Dashboard] 🗓️ Iniciando sincronização com Google Calendar...");
      updateAgentStatus(NomeAgente.CALENDARIO, StatusAgente.EXECUTANDO);

      const res = await fetch("/api/calendar/today");
      const data = await res.json();
      console.log("[Dashboard] 📅 Resposta do endpoint /api/calendar/today:", data);

      const event = data?.events?.[0];
      if (!event) throw new Error("Nenhum evento encontrado para hoje.");

      const startDateRaw =
        event.start?.dateTime ||
        event.start?.date ||
        event.start ||
        event.startTime ||
        event.start_date;

      let formattedDate = "";
      try {
        formattedDate = new Date(startDateRaw).toISOString().split("T")[0];
      } catch {
        console.warn("[Dashboard] ⚠️ Data inválida recebida do evento:", startDateRaw);
        formattedDate = new Date().toISOString().split("T")[0];
      }

      const evento: EventoCalendario = {
        summary: event.title || "Evento sem título",
        date: formattedDate,
      };

      console.log("[Dashboard] ✅ Evento identificado:", evento);
      setCurrentEvent(evento);
      updateAgentStatus(NomeAgente.CALENDARIO, StatusAgente.CONCLUIDO);

      // 2️⃣ Escritor - gerar artigo principal
      console.log("[Dashboard] ✍️ Iniciando geração do artigo...");
      updateAgentStatus(NomeAgente.ESCRITOR, StatusAgente.EXECUTANDO);

      const finalArticle = await generateAndSaveArticleAction(
        evento.summary,
        language,
        focusKeywords
      );

      console.log("[Dashboard] ✅ Artigo gerado com sucesso:", finalArticle);

      updateAgentStatus(NomeAgente.ESCRITOR, StatusAgente.CONCLUIDO);

      // 3️⃣ Formatador - formata em HTML
      console.log("[Dashboard] 🎨 Formatando artigo em HTML...");
      updateAgentStatus(NomeAgente.FORMATADOR, StatusAgente.EXECUTANDO);
      await new Promise((resolve) => setTimeout(resolve, 100)); // delay apenas para efeito visual
      updateAgentStatus(NomeAgente.FORMATADOR, StatusAgente.CONCLUIDO);

      // 4️⃣ SEO - análise e metadados
      console.log("[Dashboard] 🔍 Iniciando análise SEO...");
      updateAgentStatus(NomeAgente.SEO, StatusAgente.EXECUTANDO);
      await new Promise((resolve) => setTimeout(resolve, 100));
      updateAgentStatus(NomeAgente.SEO, StatusAgente.CONCLUIDO);

      // 5️⃣ Publicador - salvar resultado
      console.log("[Dashboard] 💾 Publicando artigo...");
      updateAgentStatus(NomeAgente.PUBLICADOR, StatusAgente.CONCLUIDO);

      setArticle(finalArticle);

      if (onArticleGenerated) {
        console.log("[Dashboard] 📤 Chamando callback onArticleGenerated...");
        onArticleGenerated(finalArticle);
      }

      console.log("[Dashboard] 🎉 Pipeline finalizado com sucesso!");
    } catch (error) {
      console.error("[Dashboard] ❌ Erro durante o processo de geração:", error);

      const runningAgent = agents.find((a) => a.status === StatusAgente.EXECUTANDO);
      if (runningAgent) {
        console.log(`[Dashboard] ⚠️ Definindo agente com erro: ${runningAgent.name}`);
        updateAgentStatus(runningAgent.name, StatusAgente.ERRO);
      } else {
        console.warn("[Dashboard] ⚠️ Nenhum agente em execução detectado no momento do erro.");
        updateAgentStatus(NomeAgente.ESCRITOR, StatusAgente.ERRO);
      }
    } finally {
      setIsProcessing(false);
      console.groupEnd();
    }
  }, [resetState, updateAgentStatus, language, focusKeywords, onArticleGenerated, agents]);

  const isPipelineFinished = useMemo(
    () => agents.every((a) => a.status === StatusAgente.CONCLUIDO),
    [agents]
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Painel de Geração de Notícias
        </h1>
        <p className="mt-2 text-gray-400">
          Automatize seu pipeline diário de criação de notícias.
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Pipeline de Automação Diária
          </h2>
          <p className="text-gray-400 mt-1">
            {currentEvent
              ? `Tópico de Hoje: "${currentEvent.summary}"`
              : "Clique em iniciar para começar o processo."}
          </p>
        </div>
        <button
          onClick={handleStartGeneration}
          disabled={isProcessing}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-primary rounded-lg shadow-md hover:bg-primary-hover disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <PlayCircle size={20} />
          <span>
            {isProcessing ? "Processando..." : "Iniciar Geração Diária"}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {agents.map((agent) => (
          <AgentCard key={agent.name} agent={agent} />
        ))}
      </div>

      {article && (
        <>
          <h2 className="text-2xl font-bold text-white mt-10">
            Artigo Gerado
          </h2>
          <GeneratedPost article={article} />
        </>
      )}

      {isPipelineFinished && (
        <p className="text-center text-green-400 font-semibold">
          ✅ Todos os agentes concluíram o processo com sucesso!
        </p>
      )}
    </div>
  );
};

export default Dashboard;
