
import { GoogleGenAI } from "@google/genai";
import { FamilyData } from "../types";

const SYSTEM_INSTRUCTION = `Você é um analista psicossocial de alta precisão especializado no contexto brasileiro (UPMM). Sua missão é analisar dados de famílias em situação de vulnerabilidade extrema ou moderada.
Ao receber os dados de uma família, você deve fornecer obrigatoriamente:

1. Diagnóstico Rápido: Identifique o gargalo principal (ex: Déficit calórico, custo de moradia abusivo, endividamento consignado, falta de rede de apoio).
2. Perfil Psicológico de Contexto: Avalie o nível de estresse ambiental baseado no adensamento familiar (pessoas vs cômodos/renda) e peso das despesas essenciais.
3. Plano de Ação Estratégico: Sugira 3 passos imediatos (ex: Encaminhamento para CRAS/CREAS, auxílio saúde, curso profissionalizante específico para o perfil).

Informação de Referência (Bolsa Família 2026): Base R$600 + BPI R$150 (0-6 anos) + BVF R$50 (7-18 anos/gestantes) + BVN R$50 (nutrizes).

Responda em Markdown profissional, direto e empático.`;

export const generatePsychosocialReport = async (family: FamilyData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const despesasEntries = Object.entries(family.despesas) as [string, number][];
  const totalDespesas = despesasEntries.reduce((a, [_, b]) => a + (b || 0), 0);
  const rendaTotal = family.rendaMensal + family.rendaBolsaFamilia;

  // Detalhamento de gastos para o prompt
  const gastosString = despesasEntries
    .filter(([_, v]) => v > 0)
    .map(([k, v]) => `- ${k}: R$ ${v.toLocaleString('pt-BR')}`)
    .join('\n');

  const prompt = `Analise a seguinte unidade familiar para parecer psicossocial (Contexto Institucional UPMM):

DADOS FINANCEIROS:
Representante: ${family.nomeRepresentante}
Renda Mensal Própria: R$ ${family.rendaMensal.toLocaleString('pt-BR')}
Benefício Bolsa Família (Simulado 2026): R$ ${family.rendaBolsaFamilia.toLocaleString('pt-BR')}
RENDA TOTAL DISPONÍVEL: R$ ${rendaTotal.toLocaleString('pt-BR')}

DETALHAMENTO DE DESPESAS DECLARADAS:
${gastosString || "Nenhuma despesa detalhada informada."}
TOTAL DE DESPESAS: R$ ${totalDespesas.toLocaleString('pt-BR')}
RESULTADO LÍQUIDO (Saldo): R$ ${(rendaTotal - totalDespesas).toLocaleString('pt-BR')}

COMPOSIÇÃO E VULNERABILIDADES:
Membros no Núcleo: ${family.membros.length + 1} pessoas
Idades dos Membros: ${family.membros.map(m => `${m.nome} (${m.idade} anos)`).join(', ') || 'Apenas titular'}
Condições de Saúde: ${family.saude.pcd ? 'PCD ativa (' + family.saude.tipoDeficiencia + ')' : 'Sem deficiências relatadas'}
Gestantes no local: ${family.saude.gestantes ? 'Sim' : 'Não'}
Doenças Crônicas: ${family.saude.doencasCronicas.join(', ') || 'Nenhuma'}
Gastos com Medicamentos: R$ ${family.saude.gastosMedicamentos.toLocaleString('pt-BR')}

HISTÓRICO E NECESSIDADES:
Principal Necessidade: ${family.principalNecessidade}
Observações Gerais: ${family.observacoes}
Histórico UPMM: Já atendida ${family.upmm.vezes} vezes (${family.upmm.anos.join(', ')})`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.5, // Menor temperatura para diagnósticos mais técnicos
      },
    });

    return response.text || "Erro: O modelo não retornou dados.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Ocorreu um erro ao processar a análise inteligente. Por favor, valide sua conexão e tente novamente.";
  }
};
