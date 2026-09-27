import { FamilyData } from '../types';

export const mockFamilies: FamilyData[] = [
  {
    id: '1',
    nomeRepresentante: 'Maria Silva Oliveira',
    cpf: '123.456.789-00',
    rendaMensal: 1200,
    rendaBolsaFamilia: 850,
    recebeBolsaFamilia: true,
    programasSociaisObs: 'Bolsa Família e Auxílio Gás',
    escolaridade: 'Fundamental Incompleto',
    endereco: 'Rua das Flores, 123',
    bairro: 'Vila Esperança',
    corRaca: 'Parda',
    membros: [
      { nome: 'João Silva', nascimento: '10/05/2015', parentesco: 'Filho', ocupacao: 'Estudante', renda: 0, idade: 9 },
      { nome: 'Ana Silva', nascimento: '15/08/2011', parentesco: 'Filha', ocupacao: 'Estudante', renda: 0, idade: 13 },
      { nome: 'Pedro Silva', nascimento: '22/01/2020', parentesco: 'Filho', ocupacao: 'Criança', renda: 0, idade: 4 }
    ],
    membrosExtrasObs: '',
    despesas: { 
      agua: 80, 
      energia: 150, 
      aluguel: 600, 
      telefone: 40, 
      internet: 80, 
      alimentacao: 400, 
      educacao: 0,
      transporte: 50,
      financiamentoVeiculo: 0,
      farmacia: 50, 
      emprestimos: 0,
      seguroVeiculo: 0,
      streaming: 0,
      faculdade: 0
    },
    saude: { 
      gestantes: false, 
      pcd: true, 
      tipoDeficiencia: 'Física', 
      doencasCronicas: ['Hipertensão'], 
      gastosMedicamentos: 50 
    },
    upmm: {
      jaAtendida: 'Sim',
      vezes: '1',
      acoes: 'Atendimento emergencial em Jan/2024 para cesta básica.',
      anos: ['2024']
    },
    condicaoMoradia: 'Alugada (Área de Risco)',
    principalNecessidade: 'Cesta básica e auxílio aluguel',
    interesseAtividades: 'Cursos de panificação e confeitaria',
    observacoes: 'Família morando em área de alagamento constante.',
    coords: [-23.5505, -46.6333],
    titularIdade: 35,
    parecer: `### Diagnóstico Rápido
- Vulnerabilidade crítica em razão de habitação em área de risco de alagamento e presença de dependente PCD.
- Déficit orçamentário decorrente do custo de aluguel (R$ 600,00) consumindo 50% da renda do trabalho.

### Perfil Psicológico de Contexto
- Sobrecarga materna elevada: Maria sustenta 3 dependentes menores com quadro crônico de hipertensão e membro PCD no núcleo.
- Estresse ambiental severo por insegurança habitacional contínua.

### Plano de Ação Estratégico
1. Encaminhamento imediato ao CRAS para inclusão no Aluguel Social e BPC/LOAS para o dependente PCD.
2. Inclusão prioritária na oficina de Panificação e Empreendedorismo da UPMM.
3. Fornecimento emergencial continuado de cesta básica e suporte farmacêutico municipal.`,
    parecerGeradoEm: '2026-03-15T14:30:00.000Z',
    parecerAutor: 'Gemini 3.0 Flash',
    parecerStatus: 'gerado',
    pareceresHistorico: [
      {
        id: 'par-init-1',
        familiaId: '1',
        texto: `### Diagnóstico Rápido
- Vulnerabilidade crítica em razão de habitação em área de risco de alagamento e presença de dependente PCD.
- Déficit orçamentário decorrente do custo de aluguel (R$ 600,00) consumindo 50% da renda do trabalho.

### Perfil Psicológico de Contexto
- Sobrecarga materna elevada: Maria sustenta 3 dependentes menores com quadro crônico de hipertensão e membro PCD no núcleo.
- Estresse ambiental severo por insegurança habitacional contínua.

### Plano de Ação Estratégico
1. Encaminhamento imediato ao CRAS para inclusão no Aluguel Social e BPC/LOAS para o dependente PCD.
2. Inclusão prioritária na oficina de Panificação e Empreendedorismo da UPMM.
3. Fornecimento emergencial continuado de cesta básica e suporte farmacêutico municipal.`,
        tipo: 'ia_gerado',
        criadoEm: '2026-03-15T14:30:00.000Z',
        autor: 'Gemini 3.0 Flash',
        versao: 1
      }
    ],
    anotacoesTecnicas: 'Visita domiciliar realizada em 10/03/2026. Casa em alvenaria simples perto da calha fluvial.'
  },
  {
    id: '2',
    nomeRepresentante: 'José Ferreira Santos',
    cpf: '987.654.321-11',
    rendaMensal: 800,
    rendaBolsaFamilia: 650,
    recebeBolsaFamilia: true,
    programasSociaisObs: 'Bolsa Família',
    escolaridade: 'Analfabeto',
    endereco: 'Av. Brasil, 4500',
    bairro: 'Jardim Alvorada',
    corRaca: 'Preta',
    membros: [
      { nome: 'Luciana Santos', nascimento: '05/03/2001', parentesco: 'Esposa', ocupacao: 'Dona de casa', renda: 0, idade: 23 }
    ],
    membrosExtrasObs: '',
    despesas: { 
      agua: 50, 
      energia: 90, 
      aluguel: 400, 
      telefone: 30, 
      internet: 0, 
      alimentacao: 300, 
      educacao: 0,
      transporte: 20,
      financiamentoVeiculo: 0,
      farmacia: 0, 
      emprestimos: 0,
      seguroVeiculo: 0,
      streaming: 0,
      faculdade: 0
    },
    saude: { 
      gestantes: true, 
      pcd: false, 
      tipoDeficiencia: '', 
      doencasCronicas: [], 
      gastosMedicamentos: 0 
    },
    upmm: {
      jaAtendida: 'Não',
      vezes: '0',
      acoes: 'Sem atendimentos prévios.',
      anos: []
    },
    condicaoMoradia: 'Alugada',
    principalNecessidade: 'Acompanhamento pré-natal',
    interesseAtividades: 'Grupos de apoio a gestantes',
    observacoes: 'Gestante sem rede de apoio familiar próxima.',
    coords: [-23.5555, -46.6400],
    titularIdade: 22,
    parecerStatus: 'pendente',
    pareceresHistorico: []
  },
  {
    id: '3',
    nomeRepresentante: 'Carla Mendes de Souza',
    cpf: '456.789.123-22',
    rendaMensal: 3500,
    rendaBolsaFamilia: 0,
    recebeBolsaFamilia: false,
    programasSociaisObs: 'Nenhum',
    escolaridade: 'Médio Completo',
    endereco: 'Rua XV de Novembro, 10',
    bairro: 'Centro',
    corRaca: 'Branca',
    membros: [
      { nome: 'Beatriz Mendes', nascimento: '12/11/2018', parentesco: 'Filha', ocupacao: 'Estudante', renda: 0, idade: 6 }
    ],
    membrosExtrasObs: '',
    despesas: { 
      agua: 120, 
      energia: 250, 
      aluguel: 1200, 
      telefone: 100, 
      internet: 150, 
      alimentacao: 800, 
      educacao: 300,
      transporte: 150,
      financiamentoVeiculo: 0,
      farmacia: 100, 
      emprestimos: 0,
      seguroVeiculo: 0,
      streaming: 50,
      faculdade: 0
    },
    saude: { 
      gestantes: false, 
      pcd: false, 
      tipoDeficiencia: '', 
      doencasCronicas: [], 
      gastosMedicamentos: 0 
    },
    upmm: {
      jaAtendida: 'Sim',
      vezes: '1',
      acoes: 'Consulta pontual sobre auxílio creche.',
      anos: ['2023']
    },
    condicaoMoradia: 'Própria',
    principalNecessidade: 'Vaga em creche municipal',
    interesseAtividades: 'Cursos de informática e empreendedorismo',
    observacoes: 'Mãe solo buscando recolocação no mercado de trabalho.',
    coords: [-23.5480, -46.6360],
    titularIdade: 28,
    parecerStatus: 'pendente',
    pareceresHistorico: []
  }
];
