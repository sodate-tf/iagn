"use client";

import React, { useState } from 'react';
import { ArtigoNoticia } from '../types';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';

interface HistoryItemProps {
  article: ArtigoNoticia;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ article }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-4 flex justify-between items-center hover:bg-gray-700/50 focus:outline-none"
        aria-expanded={isExpanded}
      >
        <div>
          <h3 className="font-semibold text-white">{article.title}</h3>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
            <Calendar size={14} />
            Gerado em: {new Date(article.generationDate).toLocaleString('pt-BR')}
          </p>
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {isExpanded && (
        <div className="p-6 border-t border-gray-700 space-y-6">
           <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-lg text-white">Metadados de SEO</h3>
              <div>
                  <h4 className="font-medium text-gray-300">Meta Description</h4>
                  <p className="text-sm text-gray-400 italic mt-1">{article.metaDescription}</p>
              </div>
              <div>
                  <h4 className="font-medium text-gray-300">Palavras-chave</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                      {article.keywords?.map((keyword, index) => (
                          <span key={index} className="bg-primary/20 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                              {keyword}
                          </span>
                      ))}
                  </div>
              </div>
          </div>
          <div
            className="text-gray-300 prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: article.formattedContent }}
          />
        </div>
      )}
    </div>
  );
};

interface HistoryScreenProps {
  initialArticles?: ArtigoNoticia[];
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ initialArticles }) => {
  const [articles] = useState(initialArticles);
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Histórico de Notícias</h1>
        <p className="mt-2 text-gray-400">
          Veja todos os artigos gerados anteriormente.
        </p>
      </div>
      {articles.length > 0 ? (
        <div className="space-y-4">
          {articles.map(article => (
            <HistoryItem key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-white">Nenhum artigo gerado ainda</h2>
          <p className="text-gray-400 mt-2">Vá para o painel e inicie a geração para ver seu histórico aqui.</p>
        </div>
      )}
    </div>
  );
};

export default HistoryScreen;