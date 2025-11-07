"use client";

import React, { useState, useEffect } from "react";
import { NomeAgente } from "../types";
import {
  Bot,
  Calendar,
  UploadCloud,
  FileText,
  Upload,
  Languages,
  KeyRound,
  Search,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface AgentConfig {
  instructions: string;
  files: File[];
}

interface AiSettings {
  id: string;
  agent_name: string;
  ai_model: string;
  calendar_id: string;
  focus_keywords: string;
  remote_post_url: string;
  remote_post_api_key: string;
  json_format_template: string;
  writer_instructions: string;
  formatter_instructions: string;
  seo_instructions: string;
}

const defaultWriterInstructions = `Você é um jornalista de IA especializado em criar artigos claros e inspiradores sobre fé e espiritualidade.`;
const defaultFormatterInstructions = `Você é um especialista em HTML que transforma artigos em HTML semântico e bonito, usando classes TailwindCSS.`;
const defaultSeoInstructions = `Você é um especialista em SEO e otimização de conteúdo. Gere palavras-chave e meta descriptions relevantes.`;

const AgentConfigCard: React.FC<{
  title: NomeAgente;
  model: string;
  config: AgentConfig;
  setConfig: (config: AgentConfig) => void;
  icon: React.ReactNode;
}> = ({ title, model, config, setConfig, icon }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setConfig({
        ...config,
        files: [...config.files, ...Array.from(e.target.files)],
      });
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h3 className="text-xl font-semibold text-white">{title}</h3>
      </div>
      <p className="text-sm text-gray-500 font-mono bg-gray-900 px-2 py-1 rounded w-fit mb-4">
        {model}
      </p>
      <textarea
        value={config.instructions}
        onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
        rows={8}
        className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-200 sm:text-sm focus:ring-primary focus:border-primary"
      />
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Arquivos de Conhecimento
        </label>
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-md py-6">
          <Upload size={40} className="text-gray-500" />
          <label
            htmlFor={`file-upload-${title}`}
            className="cursor-pointer text-primary hover:underline mt-2"
          >
            Carregar arquivos
          </label>
          <input
            id={`file-upload-${title}`}
            type="file"
            className="hidden"
            multiple
            onChange={handleFileChange}
          />
        </div>
        {config.files.length > 0 && (
          <ul className="mt-2 text-gray-400 text-sm space-y-1">
            {config.files.map((file, i) => (
              <li key={i} className="flex items-center gap-2">
                <FileText size={14} /> {file.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
interface SettingsScreenProps {
  currentLanguage?: string;
  currentFocusKeywords?: string;
  onSave?: (newSettings: { language: string; focusKeywords: string }) => void;
}


export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currentLanguage,
  currentFocusKeywords,
  onSave,
}) => {

  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [writerConfig, setWriterConfig] = useState<AgentConfig>({
    instructions: defaultWriterInstructions,
    files: [],
  });
  const [formatterConfig, setFormatterConfig] = useState<AgentConfig>({
    instructions: defaultFormatterInstructions,
    files: [],
  });
  const [seoConfig, setSeoConfig] = useState<AgentConfig>({
    instructions: defaultSeoInstructions,
    files: [],
  });

  // 🔹 Carregar configs do banco
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Erro ao carregar configurações");
        const data = await res.json();
        setSettings(data);

        // 🧠 Atualiza os campos de texto dos agentes com os valores do banco
        setWriterConfig({
          instructions: data.writer_instructions || defaultWriterInstructions,
          files: [],
        });
        setFormatterConfig({
          instructions:
            data.formatter_instructions || defaultFormatterInstructions,
          files: [],
        });
        setSeoConfig({
          instructions: data.seo_instructions || defaultSeoInstructions,
          files: [],
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // 🔹 Salvar alterações
  const handleSaveChanges = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);

    try {
      const payload = {
        ai_model: settings.ai_model || "gpt-3.5-turbo",
        calendar_id: settings.calendar_id,
        focus_keywords: settings.focus_keywords,
        remote_post_url: settings.remote_post_url,
        remote_post_api_key: settings.remote_post_api_key,
        json_format_template: settings.json_format_template,

        writer_instructions: writerConfig.instructions,
        writer_files: JSON.stringify(
          writerConfig.files.map((f) => ({ name: f.name, size: f.size }))
        ),

        formatter_instructions: formatterConfig.instructions,
        formatter_files: JSON.stringify(
          formatterConfig.files.map((f) => ({ name: f.name, size: f.size }))
        ),

        seo_instructions: seoConfig.instructions,
        seo_files: JSON.stringify(
          seoConfig.files.map((f) => ({ name: f.name, size: f.size }))
        ),
      };

      console.log("🧠 Salvando configurações...", payload);

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar configurações no servidor");

      setSaved(true);
      console.log("✅ Configurações salvas com sucesso!");
    } catch (err) {
      console.error("❌ Falha ao salvar configurações:", err);
      alert("Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10 text-gray-300">
        <Loader2 className="animate-spin mr-2" /> Carregando configurações...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-10 text-red-400">
        Nenhuma configuração encontrada no banco.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white">
          ⚙️ Configurações do Agente
        </h1>
        <p className="mt-2 text-gray-400">
          Personalize integrações e comportamento dos agentes de IA.
        </p>
      </div>

      {/* Configurações principais */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 space-y-6">
        <h2 className="text-xl font-semibold text-white mb-6">
          Configurações de Integração
        </h2>

        <div>
          <label className="flex items-center gap-2 text-lg font-medium text-gray-300 mb-2">
            <Languages size={20} /> Idioma / Modelo de IA
          </label>
          <input
            type="text"
            value={settings.ai_model}
            onChange={(e) =>
              setSettings({ ...settings, ai_model: e.target.value })
            }
            className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-gray-200 focus:ring-primary focus:border-primary"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-lg font-medium text-gray-300 mb-2">
            <KeyRound size={20} /> Palavras-chave de Foco
          </label>
          <textarea
            value={settings.focus_keywords || ""}
            onChange={(e) =>
              setSettings({ ...settings, focus_keywords: e.target.value })
            }
            rows={3}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-gray-200"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-lg font-medium text-gray-300 mb-2">
            <Calendar size={20} /> ID do Calendário
          </label>
          <input
            type="text"
            value={settings.calendar_id || ""}
            onChange={(e) =>
              setSettings({ ...settings, calendar_id: e.target.value })
            }
            className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-gray-200"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-lg font-medium text-gray-300 mb-2">
            <UploadCloud size={20} /> URL da API Remote Post
          </label>
          <input
            type="text"
            value={settings.remote_post_url || ""}
            onChange={(e) =>
              setSettings({ ...settings, remote_post_url: e.target.value })
            }
            className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-gray-200"
          />
          <label className="block text-sm text-gray-400 mt-4 mb-1">
            Corpo do JSON
          </label>
          <textarea
            value={settings.json_format_template || ""}
            onChange={(e) =>
              setSettings({
                ...settings,
                json_format_template: e.target.value,
              })
            }
            rows={6}
            className="font-mono w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-gray-200"
          />
        </div>
      </div>

      {/* Seção dos Agentes */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">
          Configuração dos Agentes
        </h2>

        <AgentConfigCard
          title={NomeAgente.ESCRITOR}
          model={settings.ai_model}
          config={writerConfig}
          setConfig={setWriterConfig}
          icon={<Bot size={24} className="text-primary" />}
        />
        <AgentConfigCard
          title={NomeAgente.FORMATADOR}
          model={settings.ai_model}
          config={formatterConfig}
          setConfig={setFormatterConfig}
          icon={<Bot size={24} className="text-primary" />}
        />
        <AgentConfigCard
          title={NomeAgente.SEO}
          model={settings.ai_model}
          config={seoConfig}
          setConfig={setSeoConfig}
          icon={<Search size={24} className="text-primary" />}
        />
      </div>

      <div className="pt-4 flex justify-end">
        <button
          onClick={handleSaveChanges}
          disabled={saving}
          className={`px-6 py-2 font-semibold text-white rounded-lg shadow-md transition-colors ${
            saving
              ? "bg-gray-600 cursor-wait"
              : "bg-primary hover:bg-primary-hover"
          }`}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin" /> Salvando...
            </span>
          ) : saved ? (
            <span className="flex items-center gap-2 text-green-400">
              <CheckCircle2 /> Salvo!
            </span>
          ) : (
            "Salvar Alterações"
          )}
        </button>
      </div>
    </div>
  );
};
