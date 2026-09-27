import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FamilyData } from '../types';

interface DashboardProps {
  families: FamilyData[];
  onNavigateToAnalysis?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ families, onNavigateToAnalysis }) => {
  const stats = useMemo(() => {
    let totalPessoas = 0;
    let totalRendaGeral = 0;
    let extremaPobreza = 0; 
    let totalBolsaFamilia = 0;
    let totalPareceresEmitidos = 0;
    
    families.forEach(f => {
      const numMembros = f.membros.length + 1;
      const rendaFamiliar = (f.rendaMensal || 0) + (f.rendaBolsaFamilia || 0);
      const perCapita = rendaFamiliar / numMembros;
      
      totalPessoas += numMembros;
      totalRendaGeral += rendaFamiliar;
      totalBolsaFamilia += (f.rendaBolsaFamilia || 0);
      if (perCapita < 218) extremaPobreza++;
      if (f.parecer && f.parecer.trim().length > 0) totalPareceresEmitidos++;
    });

    return {
      mediaPerCapita: totalPessoas > 0 ? totalRendaGeral / totalPessoas : 0,
      percentExtremaPobreza: families.length > 0 ? (extremaPobreza / families.length) * 100 : 0,
      totalPessoas,
      totalBolsaFamilia,
      totalPareceresEmitidos,
      percentPareceres: families.length > 0 ? Math.round((totalPareceresEmitidos / families.length) * 100) : 0
    };
  }, [families]);

  const socialProgramStats = useMemo(() => {
    const categories = {
      'Bolsa Família': 0,
      'Outros Auxílios': 0,
      'Sem Benefício': 0,
    };

    families.forEach(f => {
      const obs = (f.programasSociaisObs || '').toLowerCase();
      if (f.recebeBolsaFamilia || obs.includes('bolsa') || obs.includes('pbf')) {
        categories['Bolsa Família']++;
      } else if (obs && !obs.includes('não') && !obs.includes('nenhum')) {
        categories['Outros Auxílios']++;
      } else {
        categories['Sem Benefício']++;
      }
    });

    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [families]);

  const educationStats = useMemo(() => {
    const counts: Record<string, number> = {};
    families.forEach(f => {
      const esc = f.escolaridade || 'Não Informado';
      counts[esc] = (counts[esc] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [families]);

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn pb-12">
      {/* BANNER DE STATUS DO BANCO DE DADOS & PARECERES */}
      <div className="bg-gradient-to-r from-u_brown_dark to-[#3e3a39] text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-u_yellow text-u_brown_dark flex items-center justify-center font-black shadow-lg shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-base font-black uppercase tracking-tight text-u_yellow">
                Base Relacional & Pareceres Persistidos
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[8px] font-black uppercase tracking-widest border border-emerald-500/30">
                BD Sincronizado
              </span>
            </div>
            <p className="text-xs text-u_brown_light mt-0.5">
              {stats.totalPareceresEmitidos} de {families.length} famílias já possuem parecer psicossocial emitido e armazenado no banco ({stats.percentPareceres}% de cobertura diagnóstica).
            </p>
          </div>
        </div>

        {onNavigateToAnalysis && (
          <button
            onClick={onNavigateToAnalysis}
            className="px-5 py-2.5 bg-u_yellow hover:bg-white text-u_brown_dark font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shrink-0 self-stretch md:self-auto text-center"
          >
            Acessar Pareceres
          </button>
        )}
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi 
          label="Total de Famílias" 
          value={families.length} 
          subValue={`${stats.totalPessoas} pessoas cadastradas`}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>} 
        />
        <Kpi 
          label="Pareceres Concluídos" 
          value={`${stats.totalPareceresEmitidos}`} 
          subValue={`${stats.percentPareceres}% da base diagnosticada`}
          color="text-emerald-600"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>} 
        />
        <Kpi 
          label="Repasse Médio Social" 
          value={`R$ ${Math.round(stats.totalBolsaFamilia / (families.length || 1))}`} 
          subValue="Transferência Direta (BO)"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} 
        />
        <Kpi 
          label="Público Prioritário" 
          value={families.filter(f => f.saude.pcd || f.saude.gestantes).length} 
          subValue="Gestantes e PCDs"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Cobertura Social */}
        <div className="bg-white p-5 md:p-8 rounded-2xl border border-u_brown_light/10 shadow-sm overflow-hidden">
          <h3 className="text-[10px] font-black text-u_brown_light uppercase tracking-widest mb-6 md:mb-8 flex items-center gap-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Cobertura de Assistência (Coluna BO)
          </h3>
          <div className="h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={socialProgramStats} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F1F1" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '900', fill: '#2C2928' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#8C8481' }} />
                <Tooltip cursor={{ fill: '#F9F7F2' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                <Bar dataKey="value" fill="#FFC107" radius={[4, 4, 0, 0]} barSize={40}>
                  {socialProgramStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Sem Benefício' ? '#2C2928' : '#FFC107'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Escolaridade */}
        <div className="bg-white p-5 md:p-8 rounded-2xl border border-u_brown_light/10 shadow-sm overflow-hidden">
          <h3 className="text-[10px] font-black text-u_brown_light uppercase tracking-widest mb-6 md:mb-8 flex items-center gap-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            Nível de Escolaridade (Macro)
          </h3>
          <div className="h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={educationStats} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F1F1F1" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: '900', fill: '#2C2928' }} width={90} />
                <Tooltip cursor={{ fill: '#F9F7F2' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                <Bar dataKey="value" fill="#2C2928" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const Kpi = ({ label, value, subValue, icon, color = "text-u_brown_dark" }: any) => (
  <div className="bg-white p-4 md:p-6 rounded-2xl border border-u_brown_light/10 shadow-sm flex items-center justify-between hover:border-u_yellow transition-colors cursor-default group">
    <div className="flex-1 min-w-0">
      <p className="text-[8px] md:text-[9px] font-black text-u_brown_light uppercase tracking-widest mb-1 group-hover:text-u_brown_dark transition-colors truncate">{label}</p>
      <p className={`text-2xl md:text-3xl font-black ${color} tracking-tighter drop-shadow-sm truncate`}>{value}</p>
      <p className="text-[7px] md:text-[8px] font-bold text-u_brown_light uppercase tracking-tighter mt-1 truncate">{subValue}</p>
    </div>
    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-u_bg flex items-center justify-center text-u_brown_light group-hover:bg-u_yellow group-hover:text-u_brown_dark transition-all shadow-inner ml-3 shrink-0">
      {icon}
    </div>
  </div>
);

export default Dashboard;
