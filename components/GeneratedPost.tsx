
import React from 'react';
import { ArtigoNoticia } from '../types';
import { BadgeCheck } from 'lucide-react';

interface GeneratedPostProps {
  article: ArtigoNoticia;
}

const GeneratedPost: React.FC<GeneratedPostProps> = ({ article }) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Pré-visualização do Post Gerado</h2>
        {article.published && (
            <div className="mt-2 sm:mt-0 flex items-center gap-2 text-sm font-semibold bg-secondary/20 text-secondary px-3 py-1.5 rounded-full">
                <BadgeCheck size={18} />
                <span>Publicado com Sucesso</span>
            </div>
        )}
      </div>

      <div className="space-y-6">
        <h1 className="text-3xl lg:text-4xl font-extrabold text-white">{article.title}</h1>

        {/* SEO Metadata */}
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

        {article.formattedContent && (
          <div
            className="text-gray-300"
            dangerouslySetInnerHTML={{ __html: article.formattedContent }}
          />
        )}
      </div>
    </div>
  );
};

export default GeneratedPost;