
"use client";

import React, { useState, useEffect } from 'react';
import { NomeAgente } from '../types';
import { Bot, Calendar, UploadCloud, FileText, Upload, Languages, KeyRound, Search } from 'lucide-react';
// FIX: Removed unused useSettings import as settings are now passed via props.
// import { useSettings } from '../context/SettingsContext';

interface AgentConfig {
  instructions: string;
  files: File[];
}

const defaultWriterInstructions = `Você é um jornalista de IA especializado em criar artigos de notícias claros, concisos e imparciais. Sua tarefa é pegar um tópico e expandi-lo em um artigo completo.
- Crie um título informativo e que chame a atenção.
- Escreva uma introdução que resuma os pontos principais.
- Desenvolva o corpo do artigo com informações detalhadas, organizadas em parágrafos lógicos.
- Conclua o artigo com um breve resumo ou uma perspectiva futura.
- Mantenha um tom neutro e profissional.`;

const defaultFormatterInstructions = `Você é um especialista em HTML e CSS que recebe um texto de artigo bruto e o formata em um HTML bem estruturado usando Tailwind CSS para um portal de notícias com tema escuro.
- O output deve ser apenas código HTML.
- Use tags semânticas como <article>, <h1>, <h2>, <p>, etc.
- O container principal deve ter a classe "prose prose-invert max-w-none" para um estilo padrão agradável.
- Garanta que o HTML seja limpo, legível e moderno.`;

const defaultSeoInstructions = `Você é um especialista em SEO. Sua tarefa é analisar um artigo de notícia e extrair metadados para otimização em mecanismos de busca.
- Gere uma lista de 5 a 10 palavras-chave altamente relevantes.
- Escreva uma meta descrição concisa e atraente (máximo 160 caracteres).
- Considere as palavras-chave de foco do blog como uma referência para suas sugestões.`;


const blogPublisherBodyTemplate = `{
  "title": "{{title}}",
  "content": "{{content_html}}",
  "author": "AI News Bot",
  "status": "publish"
}`;

const AgentConfigCard: React.FC<{ title: NomeAgente; model: string; config: AgentConfig; setConfig: (config: AgentConfig) => void; icon: React.ReactNode }> = ({ title, model, config, setConfig, icon }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setConfig({ ...config, files: [...config.files, ...Array.from(event.target.files)] });
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="text-xl font-semibold text-white">{title}</h3>
      </div>
      <p className="text-sm text-gray-500 font-mono bg-gray-900 px-2 py-1 rounded w-fit my-2">{model}</p>
      
      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Instruções do Agente (Prompt do Sistema)</label>
          <textarea
            value={config.instructions}
            onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
            rows={8}
            className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-200 sm:text-sm focus:ring-primary focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Arquivos de Conhecimento</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <Upload size={40} className="mx-auto text-gray-500"/>
              <div className="flex text-sm text-gray-400">
                <label htmlFor={`file-upload-${title}`} className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-primary hover:text-primary-hover focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-primary">
                  <span>Carregar arquivos</span>
                  <input id={`file-upload-${title}`} name={`file-upload-${title}`} type="file" className="sr-only" multiple onChange={handleFileChange} />
                </label>
                <p className="pl-1">ou arraste e solte</p>
              </div>
              <p className="text-xs text-gray-500">Documentos, planilhas, etc.</p>
            </div>
          </div>
          {config.files.length > 0 && (
            <div className="mt-3 space-y-2">
              <h4 className="text-sm font-medium text-gray-300">Arquivos carregados:</h4>
              <ul className="pl-5 list-disc space-y-1">
                {config.files.map((file, index) => (
                  <li key={index} className="text-sm text-gray-400 flex items-center gap-2">
                    <FileText size={14}/> {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// FIX: Add props interface for SettingsScreen component to handle state from parent.
interface SettingsScreenProps {
  currentLanguage: string;
  currentFocusKeywords: string;
  onSave: (settings: { language: string; focusKeywords: string }) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ currentLanguage, currentFocusKeywords, onSave }) => {
  const [calendarId, setCalendarId] = useState('primary');
  const [publisherApi, setPublisherApi] = useState('https://meublog.com/api/v1/posts');
  const [publisherBody, setPublisherBody] = useState(blogPublisherBodyTemplate);
  
  const [language, setLanguage] = useState(currentLanguage);
  const [focusKeywords, setFocusKeywords] = useState(currentFocusKeywords);

  useEffect(() => {
    setLanguage(currentLanguage);
    setFocusKeywords(currentFocusKeywords);
  }, [currentLanguage, currentFocusKeywords]);

  const [writerConfig, setWriterConfig] = useState<AgentConfig>({ instructions: defaultWriterInstructions, files: [] });
  const [formatterConfig, setFormatterConfig] = useState<AgentConfig>({ instructions: defaultFormatterInstructions, files: [] });
  const [seoConfig, setSeoConfig] = useState<AgentConfig>({ instructions: defaultSeoInstructions, files: [] });

  const handleSaveChanges = () => {
    onSave({ language, focusKeywords });
    
    console.log("Saving settings:", {
        language,
        focusKeywords,
        calendarId,
        publisher: { api: publisherApi, body: publisherBody },
        writer: writerConfig,
        formatter: formatterConfig,
        seo: seoConfig
    });
    alert("Configurações salvas! (Simulado)");
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white">Configurações</h1>
        <p className="mt-2 text-gray-400">
          Personalize as integrações e o comportamento dos agentes de IA para o seu fluxo de trabalho.
        </p>
      </div>

      <div className="space-y-8">
        {/* --- Configurações de Integração --- */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
            <h2 className="text-xl font-semibold text-white mb-6">Configurações de Integração</h2>
            <div className="space-y-6">
                {/* Idioma de Geração */}
                <div>
                    <label htmlFor="language-select" className="flex items-center gap-2 text-lg font-medium text-gray-300 mb-2"><Languages size={20}/> Idioma de Geração</label>
                    <select
                        id="language-select"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-200 sm:text-sm focus:ring-primary focus:border-primary"
                    >
                        <option>Português do Brasil</option>
                        <option>English</option>
                        <option>Español</option>
                    </select>
                </div>
                {/* Focus Keywords */}
                <div>
                    <label htmlFor="focus-keywords" className="flex items-center gap-2 text-lg font-medium text-gray-300 mb-2"><KeyRound size={20}/> Palavras-chave de Foco do Blog</label>
                    <textarea
                        id="focus-keywords"
                        value={focusKeywords}
                        onChange={(e) => setFocusKeywords(e.target.value)}
                        rows={3}
                        placeholder="Ex: tecnologia, IA, inovação, futuro"
                        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-200 sm:text-sm focus:ring-primary focus:border-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separe as palavras-chave por vírgula. Elas servirão de guia para os agentes de IA.</p>
                </div>
                {/* Google Calendar */}
                <div>
                    <label htmlFor="calendar-id" className="flex items-center gap-2 text-lg font-medium text-gray-300 mb-2"><Calendar size={20}/> Google Calendar</label>
                    <input
                        type="text"
                        id="calendar-id"
                        value={calendarId}
                        onChange={(e) => setCalendarId(e.target.value)}
                        placeholder="ID do Calendário (ex: primary)"
                        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-200 sm:text-sm focus:ring-primary focus:border-primary"
                    />
                </div>
                {/* Blog Publisher */}
                <div>
                    <label htmlFor="publisher-api" className="flex items-center gap-2 text-lg font-medium text-gray-300 mb-2"><UploadCloud size={20}/> Publicador de Blog</label>
                    <input
                        type="text"
                        id="publisher-api"
                        value={publisherApi}
                        onChange={(e) => setPublisherApi(e.target.value)}
                        placeholder="Endpoint da API do Blog"
                        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-200 sm:text-sm focus:ring-primary focus:border-primary"
                    />
                    <label htmlFor="publisher-body" className="block text-sm font-medium text-gray-400 mt-4 mb-1">Modelo do Corpo da Requisição (JSON)</label>
                    <textarea
                        id="publisher-body"
                        value={publisherBody}
                        onChange={(e) => setPublisherBody(e.target.value)}
                        rows={6}
                        className="font-mono block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-200 sm:text-sm focus:ring-primary focus:border-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">{'Use placeholders como `{{title}}` e `{{content_html}}`.'}</p>
                </div>
            </div>
        </div>

        {/* --- Configurações dos Agentes --- */}
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Configuração dos Agentes de IA</h2>
            <AgentConfigCard title={NomeAgente.ESCRITOR} model="gemini-2.5-pro" config={writerConfig} setConfig={setWriterConfig} icon={<Bot size={24} className="text-primary"/>}/>
            <AgentConfigCard title={NomeAgente.FORMATADOR} model="gemini-2.5-flash" config={formatterConfig} setConfig={setFormatterConfig} icon={<Bot size={24} className="text-primary"/>}/>
            <AgentConfigCard title={NomeAgente.SEO} model="gemini-2.5-flash" config={seoConfig} setConfig={setSeoConfig} icon={<Search size={24} className="text-primary"/>}/>
        </div>
        
        <div className="pt-4 flex justify-end">
            <button
                type="button"
                onClick={handleSaveChanges}
                className="px-6 py-2 font-semibold text-white bg-primary rounded-lg shadow-md hover:bg-primary-hover transition-colors duration-200"
            >
                Salvar Alterações
            </button>
        </div>
      </div>
    </div>
  );
};