
import Papa from 'papaparse';
import { FamilyData, FamilyMember } from '../types';
import { calculateBolsaFamilia2026 } from './analysisUtils';

const findKey = (row: any, search: string, forceExpense: boolean = false): string => {
  const keys = Object.keys(row);
  const normalize = (s: string) => s.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  
  const normalizedSearch = normalize(search);

  const exactMatch = keys.find(k => normalize(k) === normalizedSearch);
  if (exactMatch) return exactMatch;

  if (normalizedSearch === "nome" || normalizedSearch === "nomerepresentante") {
    const nameAliases = ["nome", "representante", "titular", "responsavel", "entrevistado"];
    const foundAlias = keys.find(k => {
      const nk = normalize(k);
      return nameAliases.some(alias => nk === alias || (nk.includes(alias) && !/\d/.test(nk)));
    });
    if (foundAlias) return foundAlias;
  }

  if (normalizedSearch === "governamental" || normalizedSearch === "beneficio") {
    const govKey = keys.find(k => {
      const nk = normalize(k);
      return nk.includes("governamental") || nk.includes("recebe algum beneficio") || nk.includes("participa de algum programa");
    });
    if (govKey) return govKey;
  }
  
  if (forceExpense) {
    const bracketed = `[${search.toLowerCase()}]`;
    const bracketMatch = keys.find(k => k.toLowerCase().includes(bracketed));
    if (bracketMatch) return bracketMatch;

    const expensePrefix = normalize("Descrição das despesas");
    const expenseMatch = keys.find(k => {
      const nk = normalize(k);
      return nk.includes(expensePrefix) && nk.includes(normalizedSearch);
    });
    if (expenseMatch) return expenseMatch;
  }

  const inclusiveMatch = keys.find(k => {
    const nk = normalize(k);
    if (!nk.includes(normalizedSearch)) return false;
    
    const searchHasNumber = /\d+/.test(normalizedSearch);
    const keyHasNumber = /\d+/.test(nk);
    
    if (!searchHasNumber && keyHasNumber) {
      return nk.includes("1");
    }
    return true;
  });

  return inclusiveMatch || search;
};

const parseExpenseValue = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  
  const s = String(val).toLowerCase().trim();
  if (!s || /nenhum|n\/a|nao|zero|ausente|vazio/i.test(s)) return 0;
  
  const digitsOnly = s.replace(/[^0-9]/g, "");
  if (digitsOnly.length >= 10 && !s.includes(",") && !s.includes(".")) return 0;

  const cleaned = s
    .replace(/r\$\s?/g, "") 
    .replace(/\./g, "")      
    .replace(",", ".")       
    .replace(/[^0-9.]/g, "") 
    .trim();
    
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  if (num > 50000 && !s.includes("r$")) return 0;

  if (s.includes("100") && s.includes("300")) return 200;
  if (s.includes("300") && s.includes("500")) return 400;
  if (s.includes("500") && s.includes("800")) return 650;
  if (s.includes("800") && s.includes("1100")) return 950;
  if (s.includes("1100") && s.includes("2000")) return 1550;
  if (s.includes("2000") && s.includes("acima")) return 2500;

  return num;
};

export const calculateAge = (birthDateValue: any): number => {
  if (!birthDateValue) return 0;
  let birthDate: Date;
  if (birthDateValue instanceof Date) {
    birthDate = birthDateValue;
  } else {
    const s = String(birthDateValue).trim();
    if (!s) return 0;
    const brMatch = s.match(/^(\d{1,2})[/|-](\d{1,2})[/|-](\d{2,4})$/);
    if (brMatch) {
      let day = parseInt(brMatch[1]);
      let month = parseInt(brMatch[2]) - 1;
      let year = parseInt(brMatch[3]);
      if (year < 100) year += year > 25 ? 1900 : 2000;
      birthDate = new Date(year, month, day);
    } else {
      birthDate = new Date(s);
    }
  }
  if (isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(0, age);
};

export const parseFamiliesCSV = (file: File): Promise<FamilyData[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy', 
      complete: (results) => {
        try {
          const filteredData = results.data.filter((row: any) => {
            const keys = Object.keys(row);
            if (keys.length === 0) return false;
            const p1Key = findKey(row, "Nome Pessoa 1");
            const nKey = findKey(row, "Nome");
            const nameVal = String(row[p1Key] || row[nKey] || "").trim();
            const cpfVal = String(row[findKey(row, "CPF")] || "").trim();
            return nameVal.length > 0 || cpfVal.length > 0;
          });

          const families: FamilyData[] = filteredData.map((row: any, index: number) => {
            const nomeTitularKey = findKey(row, "Nome Pessoa 1");
            let nomeTitular = String(row[nomeTitularKey] || row[findKey(row, "Nome")] || "").trim();
            if (!nomeTitular) nomeTitular = `Família Linha ${index + 1}`;
            
            const birthKey = findKey(row, "Data de nascimento");
            const titularIdadeValue = calculateAge(row[birthKey]);
            
            const membros: FamilyMember[] = [];
            for (let i = 2; i <= 30; i++) { // Sem limite prático de membros
              const nomeKey = findKey(row, `Nome Pessoa ${i}`);
              const nome = row[nomeKey];
              if (nome && String(nome).trim().length > 0 && !/nenhum|nao informado|null|nao/i.test(String(nome))) {
                const bKey = findKey(row, `Data de nascimento Pessoa ${i}`);
                const pKey = findKey(row, `Parentesco/vinculo Pessoa ${i}`);
                const oKey = findKey(row, `Ocupação Pessoa ${i}`);
                const rKey = findKey(row, `Renda Bruta Pessoa ${i}`);
                
                const mBirth = row[bKey] || '';
                membros.push({
                  nome: String(nome).trim(),
                  nascimento: mBirth,
                  idade: calculateAge(mBirth),
                  parentesco: String(row[pKey] || 'Membro').trim(),
                  ocupacao: String(row[oKey] || 'N/I').trim(),
                  renda: parseExpenseValue(row[rKey])
                });
              }
            }

            const despesas = {
              aluguel: parseExpenseValue(row[findKey(row, "Aluguel", true)]),
              agua: parseExpenseValue(row[findKey(row, "Agua", true)]),
              energia: parseExpenseValue(row[findKey(row, "Energia", true)]),
              telefone: parseExpenseValue(row[findKey(row, "Telefone", true)]), 
              internet: parseExpenseValue(row[findKey(row, "Internet", true)]),
              alimentacao: parseExpenseValue(row[findKey(row, "Alimentacao", true)]),
              educacao: parseExpenseValue(row[findKey(row, "Educacao", true)]),
              transporte: parseExpenseValue(row[findKey(row, "Transporte", true)]),
              financiamentoVeiculo: parseExpenseValue(row[findKey(row, "Financiamento de veiculo", true)]),
              farmacia: parseExpenseValue(row[findKey(row, "Farmacia", true)]),
              emprestimos: parseExpenseValue(row[findKey(row, "Emprestimos", true)]),
              seguroVeiculo: parseExpenseValue(row[findKey(row, "Seguro de veiculo", true)]),
              streaming: parseExpenseValue(row[findKey(row, "streaming", true)]),
              faculdade: parseExpenseValue(row[findKey(row, "faculdade", true)])
            };

            const saude = {
              gestantes: /sim/i.test(String(row[findKey(row, "Existe gestante")])),
              pcd: /sim/i.test(String(row[findKey(row, "deficiencia")])),
              tipoDeficiencia: String(row[findKey(row, "Qual tipo de deficiência")] || '').trim(),
              doencasCronicas: row[findKey(row, "doenca cronica")] ? [String(row[findKey(row, "doenca cronica")]).trim()] : [],
              gastosMedicamentos: parseExpenseValue(row[findKey(row, "medicamentos", true)]),
            };

            const beneficiarioKey = findKey(row, "governamental");
            const programasObsRaw = String(row[beneficiarioKey] || "").trim();
            const recebeBolsa = /sim|governamental|beneficio|bolsa/i.test(programasObsRaw);

            const familyDraftForBolsa: any = {
              recebeBolsaFamilia: recebeBolsa,
              membros,
              titularIdade: titularIdadeValue,
              saude
            };

            return {
              id: `fam-${index}-${Math.random().toString(36).substr(2, 5)}`,
              nomeRepresentante: nomeTitular,
              cpf: String(row[findKey(row, "CPF")] || 'N/I').trim(),
              rendaMensal: parseExpenseValue(row[findKey(row, "Renda Bruta Pessoa 1")]),
              rendaBolsaFamilia: calculateBolsaFamilia2026(familyDraftForBolsa),
              recebeBolsaFamilia: recebeBolsa,
              programasSociaisObs: programasObsRaw,
              escolaridade: String(row[findKey(row, "Escolaridade")] || 'N/I').trim(),
              endereco: String(row[findKey(row, "Endereço")] || 'N/I').trim(),
              bairro: String(row[findKey(row, "Bairro")] || 'N/I').trim(),
              corRaca: String(row[findKey(row, "Cor/raca")] || 'N/I').trim(),
              membros,
              membrosExtrasObs: String(row[findKey(row, "registrar abaixo")] || '').trim(),
              despesas,
              saude,
              upmm: {
                jaAtendida: /sim/i.test(String(row[findKey(row, "atendida pela UPMM")])) ? 'Sim' : 'Não',
                vezes: String(row[findKey(row, "Quantas vezes")]).replace(/[^0-9]/g, "") || "0",
                acoes: String(row[findKey(row, "Quais ações/atividades")] || 'Nenhuma').trim(),
                anos: (String(row[findKey(row, "anos a família")] || '')).split(/[;,]/).map((s:string) => s.trim()).filter((s:string) => s.length === 4),
              },
              condicaoMoradia: String(row[findKey(row, "condição de moradia")] || 'N/I').trim(),
              principalNecessidade: String(row[findKey(row, "principal necessidade")] || 'N/I').trim(),
              interesseAtividades: String(row[findKey(row, "interesse em participar")] || 'N/I').trim(),
              observacoes: String(row[findKey(row, "OBSERVAÇÕES")] || '').trim(),
              coords: [0, 0],
              titularIdade: titularIdadeValue
            };
          });
          resolve(families);
        } catch (error) { reject(error); }
      },
      error: (error) => reject(error)
    });
  });
};

export const downloadCSVTemplate = () => {
  const headers = [
    "Nome Pessoa 1", "CPF", "Data de nascimento", "Escolaridade", "Endereço", "Bairro", "Cor/raca", 
    "Renda Bruta Pessoa 1", 
    "Descrição das despesas [Aluguel ou Financiamento]", 
    "Descrição das despesas [Agua]", 
    "Descrição das despesas [Energia]", 
    "Descrição das despesas [Telefone]", 
    "Descrição das despesas [Internet]", 
    "Descrição das despesas [Alimentacao]", 
    "Descrição das despesas [Educacao]", 
    "Descrição das despesas [Transporte]", 
    "Descrição das despesas [Financiamento de veiculo]", 
    "Descrição das despesas [Farmacia (medicamentos)]", 
    "Descrição das despesas [Emprestimos]", 
    "Descrição das despesas [Seguro de veiculo]", 
    "Descrição das despesas [Assinaturas de streaming]", 
    "Descrição das despesas [Parcela de faculdade]",
    "Existe gestante", "deficiencia", "Qual tipo de deficiencia", "doenca cronica", "valor mensal gasto com medicamentos",
    "A família participa de algum programa governamental ou recebe algum benefício?", "atendida pela UPMM", "Quantas vezes", "Quais ações/atividades", "anos a família",
    "condição de moradia", "principal necessidade", "interesse em participar", "OBSERVAÇÕES",
    "Nome Pessoa 2", "Data de nascimento Pessoa 2", "Parentesco/vinculo Pessoa 2", "Ocupação Pessoa 2", "Renda Bruta Pessoa 2",
    "Nome Pessoa 3", "Data de nascimento Pessoa 3", "Parentesco/vinculo Pessoa 3", "Ocupação Pessoa 3", "Renda Bruta Pessoa 3"
  ];
  const csvContent = "\ufeff" + headers.join(",") + "\n";
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "modelo_lupa_social_upmm.csv";
  link.click();
  URL.revokeObjectURL(url);
};
