
import { FamilyData } from '../types';

export const calculateBolsaFamilia2026 = (family: any): number => {
  if (!family.recebeBolsaFamilia) return 0;
  let total = 600; 
  const criancas06 = family.membros.filter((m: any) => m.idade >= 0 && m.idade <= 6).length;
  const titularIdade = family.titularIdade || 0;
  const titular06 = (titularIdade > 0 && titularIdade <= 6) ? 1 : 0;
  total += (criancas06 + titular06) * 150;
  const jovens718 = family.membros.filter((m: any) => m.idade >= 7 && m.idade <= 18).length;
  const titular718 = (titularIdade >= 7 && titularIdade <= 18) ? 1 : 0;
  total += (jovens718 + titular718) * 50;
  if (family.saude.gestantes) total += 50;
  const bebes = family.membros.filter((m: any) => m.idade === 0).length;
  total += bebes * 50;
  return total;
};

export const calculateVulnerabilityIndex = (family: FamilyData): number => {
  let score = 0;
  const despesasValues = Object.values(family.despesas) as number[];
  const totalDespesas = despesasValues.reduce((acc, val) => acc + (val || 0), 0) + (family.saude.gastosMedicamentos || 0);
  const rendaTotal = (family.rendaMensal || 0) + (family.rendaBolsaFamilia || 0);
  
  // 1. Ratio de Sustentabilidade (Peso 45%)
  if (rendaTotal <= 0) {
    score += 45;
  } else {
    const ratio = totalDespesas / rendaTotal;
    if (ratio > 1.2) score += 45; // Déficit severo
    else if (ratio > 1) score += 35; // Déficit moderado
    else if (ratio > 0.7) score += 20; // Orçamento apertado
  }

  // 2. Saúde e Proteção (Peso 25%)
  if (family.saude.pcd) score += 10;
  if (family.saude.gestantes) score += 8;
  if (family.saude.gastosMedicamentos > 150) score += 7;

  // 3. Adensamento e Pobreza (Peso 30%)
  const numPessoas = family.membros.length + 1;
  const perCapita = rendaTotal / numPessoas;
  if (perCapita < 218) score += 30;
  else if (perCapita < 667) score += 15;

  return Math.min(Math.round(score), 100);
};

export const getRiskColor = (score: number): string => {
  if (score >= 75) return 'text-red-600 bg-red-50 border-red-200';
  if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
  return 'text-green-600 bg-green-50 border-green-200';
};

export const getRiskLabel = (score: number): string => {
  if (score >= 75) return 'Crítico / Emergencial';
  if (score >= 40) return 'Atenção / Médio Risco';
  return 'Estável / Baixo Risco';
};
