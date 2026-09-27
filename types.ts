export interface FamilyMember {
  nome: string;
  nascimento: string;
  parentesco: string;
  ocupacao: string;
  renda: number;
  idade: number;
}

export interface ParecerRecord {
  id: string;
  familiaId: string;
  texto: string;
  tipo: 'ia_gerado' | 'manual' | 'revisado';
  criadoEm: string;
  autor: string;
  versao: number;
  resumoDiagnostico?: string;
}

export interface FamilyData {
  id: string;
  nomeRepresentante: string;
  cpf: string;
  rendaMensal: number;
  rendaBolsaFamilia: number;
  recebeBolsaFamilia: boolean;
  programasSociaisObs: string; // Informação bruta da coluna BO
  escolaridade: string;
  endereco: string;
  bairro: string;
  corRaca: string;
  membros: FamilyMember[];
  membrosExtrasObs: string;
  despesas: {
    aluguel: number;
    agua: number;
    energia: number;
    telefone: number;
    internet: number;
    alimentacao: number;
    educacao: number;
    transporte: number;
    financiamentoVeiculo: number;
    farmacia: number;
    emprestimos: number;
    seguroVeiculo: number;
    streaming: number;
    faculdade: number;
  };
  saude: {
    gestantes: boolean;
    pcd: boolean;
    tipoDeficiencia: string;
    doencasCronicas: string[];
    gastosMedicamentos: number;
  };
  upmm: {
    jaAtendida: string;
    vezes: string;
    acoes: string;
    anos: string[]; 
  };
  condicaoMoradia: string;
  principalNecessidade: string;
  interesseAtividades: string;
  observacoes: string;
  coords: [number, number];
  titularIdade: number;
  
  // Campos de persistência do parecer psicossocial
  parecer?: string;
  parecerGeradoEm?: string;
  parecerAutor?: string;
  parecerStatus?: 'pendente' | 'gerado' | 'revisado' | 'arquivado';
  pareceresHistorico?: ParecerRecord[];
  anotacoesTecnicas?: string;
  atualizadoEm?: string;
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  MAPA = 'MAPA',
  ANALISE_IA = 'ANALISE_IA',
  IMPORT = 'IMPORT'
}
