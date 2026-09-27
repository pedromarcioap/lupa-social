import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import { FamilyData } from '../types';
import { generatePsychosocialReport } from '../services/geminiService';
import { calculateVulnerabilityIndex, getRiskColor, getRiskLabel } from '../utils/analysisUtils';
import { marked } from 'marked';

interface IndividualAnalysisProps {
  families: FamilyData[];
  onSaveParecer: (familyId: string, texto: string, autor?: string, tipo?: 'ia_gerado' | 'manual' | 'revisado') => Promise<void>;
  onUpdateNotes: (familyId: string, notes: string) => Promise<void>;
}

const IndividualAnalysis: React.FC<IndividualAnalysisProps> = ({ 
  families, 
  onSaveParecer,
  onUpdateNotes
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'todos' | 'com_parecer' | 'sem_parecer'>('todos');
  
  const sortedFamilies = useMemo(() => {
    return [...families]
      .filter((f) => {
        const matchesSearch = f.nomeRepresentante.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.cpf.includes(searchTerm) ||
          f.bairro.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        if (filterMode === 'com_parecer') return !!f.parecer;
        if (filterMode === 'sem_parecer') return !f.parecer;
        return true;
      })
      .sort((a, b) => a.nomeRepresentante.localeCompare(b.nomeRepresentante));
  }, [families, searchTerm, filterMode]);

  const [selectedId, setSelectedId] = useState<string>(sortedFamilies[0]?.id || families[0]?.id || '');
  
  // Garantir seleção válida quando a lista muda
  useEffect(() => {
    if (!families.some(f => f.id === selectedId) && families.length > 0) {
      setSelectedId(families[0].id);
    }
  }, [families, selectedId]);

  const family = families.find((f) => f.id === selectedId);

  // Estados locais para edição e UI
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Sincronizar dados do parecer e anotações quando a família selecionada muda
  useEffect(() => {
    if (family) {
      setIsEditing(false);
      setEditedReport(family.parecer || '');
      setNotesInput(family.anotacoesTecnicas || '');
    }
  }, [selectedId, family?.parecer, family?.anotacoesTecnicas]);

  if (!family) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-u_brown_light/10 text-center shadow-sm">
        <p className="text-xs font-black text-u_brown_mid uppercase tracking-widest">Nenhuma família encontrada com os filtros selecionados.</p>
        <button 
          onClick={() => { setSearchTerm(''); setFilterMode('todos'); }}
          className="mt-4 px-4 py-2 bg-u_brown_dark text-u_yellow rounded-lg text-[10px] font-black uppercase tracking-widest"
        >
          Limpar Filtros
        </button>
      </div>
    );
  }

  const risk = calculateVulnerabilityIndex(family);
  const rendaTitular = family.rendaMensal || 0;
  const rendaMembros = family.membros.reduce((acc, m) => acc + (m.renda || 0), 0);
  const rendaBolsa = family.rendaBolsaFamilia || 0;
  const totalEntradas = rendaTitular + rendaMembros + rendaBolsa;
  
  const despesasValues = Object.values(family.despesas) as number[];
  const somaDespesasBase = despesasValues.reduce((acc, val) => acc + (val || 0), 0);
  const gastosMedicamentos = family.saude.gastosMedicamentos || 0;
  const totalSaidas = somaDespesasBase + gastosMedicamentos;
  const saldoSocial = totalEntradas - totalSaidas;

  const cashFlowData = [
    {
      category: 'Entradas',
      'Renda Própria': rendaTitular + rendaMembros,
      'Benefícios (Bolsa Família)': rendaBolsa,
    },
    {
      category: 'Saídas',
      'Despesas Básicas': somaDespesasBase,
      'Gastos com Saúde': gastosMedicamentos,
    }
  ];

  // Disparar geração de parecer via IA e salvar de forma atômica no banco de dados
  const handleGenerateReport = async () => {
    setLoading(true);
    setSaveSuccessMsg(null);
    try {
      const generated = await generatePsychosocialReport(family);
      await onSaveParecer(family.id, generated, 'Gemini 3.0 Flash', 'ia_gerado');
      setSaveSuccessMsg('Parecer gerado pela IA e salvo no banco de dados!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar e salvar o parecer no banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  // Salvar alterações manuais feitas pelo assistente social no parecer
  const handleSaveManualEdit = async () => {
    if (!editedReport.trim()) return;
    setLoading(true);
    try {
      await onSaveParecer(family.id, editedReport, 'Assistente Social / UPMM', 'revisado');
      setIsEditing(false);
      setSaveSuccessMsg('Parecer revisado e salvo no banco de dados!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar as alterações do parecer.');
    } finally {
      setLoading(false);
    }
  };

  // Salvar anotações de campo da equipe
  const handleSaveNotes = async () => {
    try {
      await onUpdateNotes(family.id, notesInput);
      setSaveSuccessMsg('Anotações técnicas salvas com sucesso!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar anotações.');
    }
  };

  // Copiar parecer para a área de transferência
  const handleCopyReport = () => {
    if (family.parecer) {
      navigator.clipboard.writeText(family.parecer);
      setSaveSuccessMsg('Texto do parecer copiado para a área de transferência!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  // Exportar parecer como arquivo markdown
  const handleDownloadReport = () => {
    if (!family.parecer) return;
    const header = `# PARECER PSICOSSOCIAL - UPMM\n**Titular:** ${family.nomeRepresentante}\n**CPF:** ${family.cpf}\n**Bairro:** ${family.bairro}\n**Data de Emissão:** ${family.parecerGeradoEm ? new Date(family.parecerGeradoEm).toLocaleDateString('pt-BR') : '-'}\n**Autor:** ${family.parecerAutor || 'UPMM'}\n\n---\n\n`;
    const fullText = header + family.parecer;
    const blob = new Blob([fullText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parecer_${family.nomeRepresentante.replace(/\s+/g, '_').toLowerCase()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* MENSAGEM DE SUCESSO / FEEDBACK PERSISTÊNCIA */}
      {saveSuccessMsg && (
        <div className="bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-bold animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <span>{saveSuccessMsg}</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-emerald-200 font-black">Banco de Dados Atualizado</span>
        </div>
      )}

      {/* PAINEL DE SELEÇÃO E FILTROS */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-u_brown_light/10 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-[10px] font-black text-u_brown_light uppercase tracking-widest block mb-2">
              Família / Pessoa em Análise ({families.length} cadastradas)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Filtrar por nome, CPF ou bairro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 p-2.5 bg-u_bg border-none rounded-lg text-xs font-bold text-u_brown_dark placeholder-u_brown_light focus:ring-2 focus:ring-u_yellow"
              />
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as any)}
                className="p-2.5 bg-u_bg border-none rounded-lg text-xs font-black text-u_brown_dark focus:ring-2 focus:ring-u_yellow cursor-pointer"
              >
                <option value="todos">Todas as Famílias</option>
                <option value="com_parecer">Com Parecer Emitido</option>
                <option value="sem_parecer">Pendente de Parecer</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-u_bg">
            <div className="text-right shrink-0">
              <span className="text-[10px] font-black text-u_brown_light uppercase tracking-widest">Índice de Vulnerabilidade</span>
              <div className={`text-sm md:text-base font-black ${getRiskColor(risk).split(' ')[0]}`}>{getRiskLabel(risk)}</div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-u_brown_dark text-u_yellow flex flex-col items-center justify-center shadow-xl border-b-4 border-u_brown_mid shrink-0">
              <span className="text-[9px] font-black uppercase tracking-tighter opacity-60">Score</span>
              <span className="text-xl font-black leading-none">{risk}</span>
            </div>
          </div>
        </div>

        {/* Dropdown seletor direto */}
        <div>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full p-3.5 bg-u_bg border-none rounded-xl text-u_brown_dark font-black text-sm focus:ring-2 focus:ring-u_yellow transition-all cursor-pointer truncate"
          >
            {sortedFamilies.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nomeRepresentante} - {f.bairro} (CPF: {f.cpf || 'N/I'}) {f.parecer ? '✓ [Parecer Salvo]' : '○ [Sem Parecer]'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA: PARECER PERSISTENTE & BALANÇO */}
        <div className="lg:col-span-8 space-y-6">
          {/* BLOCO DO PARECER PSICOSSOCIAL PERSISTIDO */}
          <div className="bg-u_brown_dark rounded-2xl overflow-hidden shadow-2xl border border-white/5">
            {/* Header do Parecer */}
            <div className="p-4 md:p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center bg-u_brown_dark/70 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 shrink-0 rounded-full bg-u_yellow/20 text-u_yellow flex items-center justify-center shadow-inner">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-black text-base md:text-lg tracking-tight">Parecer Psicossocial Oficial</h3>
                    {family.parecer && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider">
                        Persistido no BD
                      </span>
                    )}
                  </div>
                  <p className="text-u_brown_light text-[9px] uppercase font-bold tracking-widest">
                    {family.parecerGeradoEm 
                      ? `Salvo em ${new Date(family.parecerGeradoEm).toLocaleString('pt-BR')} • Autor: ${family.parecerAutor || 'Sistema'}`
                      : 'Nenhum parecer emitido ainda para este cadastro.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {family.parecer && !isEditing && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                      title="Editar e revisar parecer manualmente"
                    >
                      Editar Texto
                    </button>
                    <button
                      onClick={handleCopyReport}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                      title="Copiar texto"
                    >
                      Copiar
                    </button>
                    <button
                      onClick={handleDownloadReport}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                      title="Baixar Markdown"
                    >
                      Exportar .md
                    </button>
                  </>
                )}

                <button
                  onClick={handleGenerateReport}
                  disabled={loading}
                  className="bg-u_yellow hover:bg-white text-u_brown_dark px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all transform active:scale-95 disabled:opacity-50 shadow-md"
                >
                  {loading ? 'Processando e Gravando...' : family.parecer ? 'Regerar via Gemini' : 'Gerar Parecer IA'}
                </button>
              </div>
            </div>

            {/* Conteúdo do Parecer ou Formulário de Edição */}
            <div className="p-6 md:p-8 bg-black/15 min-h-[320px]">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-u_yellow uppercase tracking-widest">
                      Modo de Edição Técnica (Markdown Suportado)
                    </span>
                    <button
                      onClick={() => { setIsEditing(false); setEditedReport(family.parecer || ''); }}
                      className="text-xs text-u_brown_light hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                  <textarea
                    rows={12}
                    value={editedReport}
                    onChange={(e) => setEditedReport(e.target.value)}
                    className="w-full p-4 bg-u_brown_dark/80 text-white border border-white/20 rounded-xl text-xs font-mono leading-relaxed focus:ring-2 focus:ring-u_yellow outline-none"
                    placeholder="Escreva ou ajuste as recomendações e parecer psicossocial..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg text-xs font-black uppercase"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveManualEdit}
                      disabled={loading}
                      className="px-6 py-2 bg-u_yellow text-u_brown_dark rounded-lg text-xs font-black uppercase hover:bg-white transition-colors"
                    >
                      {loading ? 'Salvando...' : 'Salvar Alterações no BD'}
                    </button>
                  </div>
                </div>
              ) : family.parecer ? (
                <div 
                  className="prose prose-sm md:prose-invert max-w-none animate-fadeIn prose-headings:text-u_yellow" 
                  dangerouslySetInnerHTML={{ __html: marked.parse(family.parecer) }} 
                />
              ) : (
                <div className="h-56 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-u_yellow">
                    <svg className="w-6 h-6 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-white/60">
                    Nenhum parecer persistido para esta família
                  </p>
                  <p className="text-[10px] text-u_brown_light max-w-md">
                    Clique em "Gerar Parecer IA" para processar as vulnerabilidades cadastrais com o Gemini e armazenar o relatório técnico de forma permanente.
                  </p>
                </div>
              )}
            </div>

            {/* Histórico de Versões do Parecer */}
            {family.pareceresHistorico && family.pareceresHistorico.length > 0 && (
              <div className="px-6 py-3 bg-black/30 border-t border-white/5 flex items-center justify-between">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-[10px] font-black uppercase tracking-widest text-u_yellow hover:underline flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {showHistory ? 'Ocultar Histórico' : `Histórico de Emissões (${family.pareceresHistorico.length} registros)`}
                </button>
                <span className="text-[9px] text-u_brown_light uppercase">Persistência Ativa</span>
              </div>
            )}

            {showHistory && family.pareceresHistorico && (
              <div className="p-6 bg-black/40 border-t border-white/5 space-y-3">
                <h4 className="text-[10px] font-black text-u_yellow uppercase tracking-widest">Registros Anteriores no Banco de Dados</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  {family.pareceresHistorico.map((h, i) => (
                    <div key={h.id || i} className="p-3 bg-white/5 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-black text-white text-[11px] block">
                          Versão {h.versao || (family.pareceresHistorico!.length - i)} - {h.tipo === 'ia_gerado' ? 'Gerado por IA' : 'Revisão Técnica'}
                        </span>
                        <span className="text-[9px] text-u_brown_light">
                          {new Date(h.criadoEm).toLocaleString('pt-BR')} • {h.autor}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Deseja carregar esta versão do parecer?')) {
                            onSaveParecer(family.id, h.texto, h.autor, h.tipo);
                          }
                        }}
                        className="px-2.5 py-1 bg-white/10 hover:bg-u_yellow hover:text-u_brown_dark rounded text-[9px] font-black uppercase transition-colors text-white"
                      >
                        Restaurar Versão
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ANOTAÇÕES TÉCNICAS E DE CAMPO PERSISTENTES */}
          <div className="bg-white rounded-2xl border border-u_brown_light/10 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-black text-u_brown_dark uppercase tracking-widest">
                  Observações de Campo & Encaminhamentos
                </h3>
                <p className="text-[9px] font-bold text-u_brown_light uppercase">
                  Anotações da equipe técnica salvas no perfil da família
                </p>
              </div>
              <button
                onClick={handleSaveNotes}
                className="px-4 py-2 bg-u_brown_dark hover:bg-u_yellow hover:text-u_brown_dark text-u_yellow rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm"
              >
                Salvar Anotações
              </button>
            </div>
            <textarea
              rows={3}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Digite aqui anotações de visitas domiciliares, concessão de benefícios, encaminhamentos ao CRAS, demandas de saúde..."
              className="w-full p-3 bg-u_bg border-none rounded-xl text-xs font-bold text-u_brown_dark placeholder-u_brown_light focus:ring-2 focus:ring-u_yellow outline-none"
            />
          </div>

          {/* FLUXO DE CAIXA DETALHADO */}
          <div className="bg-white rounded-xl border border-u_brown_light/10 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-u_bg border-b border-u_brown_light/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="text-[10px] font-black text-u_brown_dark uppercase tracking-widest">Balanço Financeiro Mensal</h3>
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm ${saldoSocial >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                Saldo Estimado: R$ {saldoSocial.toLocaleString('pt-BR')}
              </div>
            </div>
             
            <div className="p-6 flex flex-col lg:flex-row gap-8">
              {/* Gráfico Comparativo */}
              <div className="flex-1 min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: '900', fill: '#2C2928' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: '#8C8481' }}
                      tickFormatter={(val) => `R$ ${val}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontSize: '11px' }}
                      formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', paddingBottom: '20px' }}
                    />
                    <Bar dataKey="Renda Própria" stackId="stack" fill="#2C2928" barSize={50} />
                    <Bar dataKey="Benefícios (Bolsa Família)" stackId="stack" fill="#FFC107" radius={[6, 6, 0, 0]} barSize={50} />
                    <Bar dataKey="Despesas Básicas" stackId="stack2" fill="#8C8481" barSize={50} />
                    <Bar dataKey="Gastos com Saúde" stackId="stack2" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Lista de Gastos e Entradas */}
              <div className="w-full lg:w-72 space-y-4">
                <div className="p-4 bg-u_bg/50 rounded-xl border border-u_bg">
                  <span className="text-[9px] font-black text-u_brown_mid uppercase tracking-widest block mb-2">Composição de Entradas</span>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-u_brown_dark">Trabalho/Renda:</span>
                      <span className="font-black">R$ {(rendaTitular + rendaMembros).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-amber-600">Bolsa Família:</span>
                      <span className="font-black">R$ {rendaBolsa.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-u_bg/50 rounded-xl border border-u_bg">
                  <span className="text-[9px] font-black text-u_brown_mid uppercase tracking-widest block mb-2">Composição de Saídas</span>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-u_brown_dark">Custos Fixos:</span>
                      <span className="font-black">R$ {somaDespesasBase.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-red-600">Saúde/Medic.:</span>
                      <span className="font-black">R$ {gastosMedicamentos.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                {saldoSocial < 0 && (
                  <div className="p-4 bg-red-600 text-white rounded-xl shadow-lg animate-pulse">
                    <span className="text-[10px] font-black uppercase tracking-widest block mb-1">Aviso de Déficit</span>
                    <p className="text-[9px] font-bold opacity-90 leading-tight">
                      As despesas superam a renda total em R$ {Math.abs(saldoSocial).toLocaleString('pt-BR')}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: CONTEXTO, VULNERABILIDADE & COMPOSIÇÃO */}
        <div className="lg:col-span-4 space-y-6">
          {/* IDENTIFICAÇÃO DO TITULAR */}
          <div className="bg-white p-6 rounded-2xl border border-u_brown_light/10 shadow-sm space-y-3">
            <h3 className="text-[10px] font-black text-u_brown_dark uppercase tracking-widest">Identificação Cadastral</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-u_brown_light font-bold">Titular:</span>
                <span className="font-black text-u_brown_dark text-right truncate ml-2">{family.nomeRepresentante}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-u_brown_light font-bold">CPF:</span>
                <span className="font-black text-u_brown_dark">{family.cpf || 'Não Informado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-u_brown_light font-bold">Idade Titular:</span>
                <span className="font-black text-u_brown_dark">{family.titularIdade} anos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-u_brown_light font-bold">Escolaridade:</span>
                <span className="font-black text-u_brown_dark">{family.escolaridade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-u_brown_light font-bold">Bairro:</span>
                <span className="font-black text-u_brown_dark">{family.bairro}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-u_brown_light font-bold">Endereço:</span>
                <span className="font-black text-u_brown_dark text-right truncate ml-2">{family.endereco}</span>
              </div>
            </div>
          </div>

          {/* COMPOSIÇÃO FAMILIAR */}
          <div className="bg-white p-6 rounded-2xl border border-u_brown_light/10 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-u_brown_dark uppercase tracking-widest">
                Composição Familiar ({family.membros.length + 1} pessoas)
              </h3>
            </div>
            <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
              <div className="p-2.5 bg-u_bg/60 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <span className="font-black text-u_brown_dark block">{family.nomeRepresentante}</span>
                  <span className="text-[9px] text-u_brown_light font-bold">Titular ({family.titularIdade} anos)</span>
                </div>
                <span className="font-black text-[10px] text-u_brown_dark">R$ {family.rendaMensal.toLocaleString('pt-BR')}</span>
              </div>

              {family.membros.map((m, idx) => (
                <div key={idx} className="p-2.5 bg-u_bg/40 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-black text-u_brown_dark block">{m.nome}</span>
                    <span className="text-[9px] text-u_brown_light font-bold">{m.parentesco} ({m.idade} anos) - {m.ocupacao}</span>
                  </div>
                  <span className="font-black text-[10px] text-u_brown_dark">R$ {m.renda.toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PAINEL DE PROGRAMAS SOCIAIS (COLUNA BO) */}
          <div className="bg-u_yellow p-6 rounded-2xl border border-u_brown_dark/10 shadow-sm relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-u_brown_dark text-u_yellow rounded-xl flex items-center justify-center shadow-lg shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-10V4m-5 10v.01M12 12V4" />
                </svg>
              </div>
              <div>
                <h4 className="text-[11px] font-black text-u_brown_dark uppercase tracking-widest leading-none">Status de Benefícios</h4>
                <p className="text-[9px] font-bold text-u_brown_dark/60 uppercase mt-1">Dados da Coluna BO</p>
              </div>
            </div>

            <div className="bg-white/40 p-4 rounded-xl border border-u_brown_dark/5">
              <p className="text-xs font-black text-u_brown_dark leading-relaxed italic">
                {family.programasSociaisObs || 'Nenhum programa social ou benefício foi detalhado no cadastro original.'}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${family.recebeBolsaFamilia ? 'bg-u_brown_dark text-u_yellow' : 'bg-u_brown_dark/10 text-u_brown_dark/40'}`}>
                Bolsa Família
              </span>
              <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${family.rendaBolsaFamilia > 800 ? 'bg-u_brown_dark text-u_yellow' : 'bg-u_brown_dark/10 text-u_brown_dark/40'}`}>
                Ticket Médio Alto
              </span>
            </div>
          </div>

          {/* PROTEÇÃO BIOPSICOSSOCIAL */}
          <div className="bg-white p-6 rounded-xl border border-u_brown_light/10 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black text-u_brown_dark uppercase tracking-widest">Indicadores de Saúde</h3>
            <div className="flex flex-col gap-3">
              <Indicator label="PCD no Núcleo" active={family.saude.pcd} detail={family.saude.tipoDeficiencia} />
              <Indicator label="Gestante Ativa" active={family.saude.gestantes} />
              <div className="p-3 bg-u_bg/30 rounded-xl border border-u_bg">
                <span className="text-[9px] font-black text-u_brown_light uppercase block mb-1">Condições Crônicas</span>
                <p className="text-[10px] font-bold text-u_brown_dark leading-tight italic">
                  {family.saude.doencasCronicas.join(', ') || 'Sem registros de patologias crônicas.'}
                </p>
              </div>
            </div>
          </div>

          {/* VÍNCULO UPMM */}
          <div className="bg-white p-6 rounded-xl border border-u_brown_light/10 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black text-u_brown_dark uppercase tracking-widest">Histórico UPMM</h3>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-u_brown_mid uppercase tracking-widest">Status:</span>
              <span className="text-[10px] font-black text-u_brown_dark bg-u_bg px-2 py-1 rounded uppercase tracking-tighter">
                {family.upmm.jaAtendida === 'Sim' ? 'Familiarizado' : 'Novo'}
              </span>
            </div>
            <div className="bg-u_bg/50 p-4 rounded-xl border border-u_bg">
              <span className="text-[20px] font-black text-u_brown_dark block leading-none">{family.upmm.vezes}</span>
              <span className="text-[8px] font-black text-u_brown_mid uppercase tracking-widest">Atendimentos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Indicator = ({ label, active, detail }: { label: string; active: boolean; detail?: string }) => (
  <div className="flex justify-between items-center p-3 rounded-xl bg-u_bg/50 border border-u_bg">
    <div className="flex flex-col">
      <span className="text-[9px] font-black text-u_brown_mid uppercase tracking-tight">{label}</span>
      {active && detail && <span className="text-[8px] font-bold text-u_brown_light truncate">{detail}</span>}
    </div>
    <div className={`w-3 h-3 rounded-full ${active ? 'bg-u_yellow shadow-[0_0_8px_rgba(255,193,7,0.4)]' : 'bg-u_brown_light/20'}`}></div>
  </div>
);

export default IndividualAnalysis;
