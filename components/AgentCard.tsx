
import React from 'react';
import { Agente, StatusAgente, NomeAgente } from '../types';
import { CheckCircle, Zap, XCircle, Loader, Calendar, Bot, UploadCloud, Search } from 'lucide-react';

interface AgentCardProps {
  agent: Agente;
}

const statusConfig = {
  [StatusAgente.PENDENTE]: { icon: <Zap size={24} className="text-gray-400" />, color: 'border-gray-700', text: 'text-gray-400' },
  [StatusAgente.EXECUTANDO]: { icon: <Loader size={24} className="text-primary animate-spin" />, color: 'border-primary', text: 'text-primary' },
  [StatusAgente.CONCLUIDO]: { icon: <CheckCircle size={24} className="text-secondary" />, color: 'border-secondary', text: 'text-secondary' },
  [StatusAgente.ERRO]: { icon: <XCircle size={24} className="text-danger" />, color: 'border-danger', text: 'text-danger' },
};

const agentIcons: { [key in NomeAgente]: React.ReactNode } = {
  [NomeAgente.CALENDARIO]: <Calendar size={32} />,
  [NomeAgente.ESCRITOR]: <Bot size={32} />,
  [NomeAgente.FORMATADOR]: <Bot size={32} />,
  [NomeAgente.SEO]: <Search size={32} />,
  [NomeAgente.PUBLICADOR]: <UploadCloud size={32} />,
};

const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const { icon, color, text } = statusConfig[agent.status];

  return (
    <div className={`bg-gray-800 rounded-lg p-5 border-l-4 transition-all duration-300 ${color} shadow-lg flex flex-col justify-between h-full`}>
      <div>
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-full bg-gray-700/50 text-gray-200`}>
            {agentIcons[agent.name]}
          </div>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-white mt-4">{agent.name}</h3>
        <p className="text-sm text-gray-400 mt-1">{agent.description}</p>
      </div>
      <div className="mt-4 flex flex-col justify-end">
        {agent.model && <p className="text-xs text-gray-500 font-mono bg-gray-900 px-2 py-1 rounded w-fit">{agent.model}</p>}
        <p className={`text-sm font-semibold mt-2 ${text}`}>{agent.status}</p>
      </div>
    </div>
  );
};

export default AgentCard;