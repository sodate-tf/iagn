export enum NomeAgente {
  CALENDARIO = 'Sincronização com Google Calendar',
  ESCRITOR = 'IA Escritora de Notícias',
  FORMATADOR = 'IA Formatadora de HTML',
  SEO = 'IA Analista de SEO',
  PUBLICADOR = 'Publicador de Blog',
}

export enum StatusAgente {
  PENDENTE = 'Pendente',
  EXECUTANDO = 'Executando',
  CONCLUIDO = 'Concluído',
  ERRO = 'Erro',
}

export interface Agente {
  name: NomeAgente;
  description: string;
  status: StatusAgente;
  model?: string;
}

export interface EventoCalendario {
  summary: string;
  date: string;
}

export interface ArtigoNoticia {
  id?: string;
  generationDate: string;
  title: string;
  rawContent: string;
  formattedContent: string;
  published: boolean;
  keywords: string[];
  metaDescription: string;
}