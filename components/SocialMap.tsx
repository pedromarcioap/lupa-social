import React, { useMemo } from 'react';
import { FamilyData } from '../types';
import { calculateVulnerabilityIndex } from '../utils/analysisUtils';

interface SocialMapProps {
  families: FamilyData[];
}

const SocialMap: React.FC<SocialMapProps> = ({ families }) => {
  const bairroStats = useMemo(() => {
    const stats: Record<string, number> = {};
    families.forEach(f => {
      const b = f.bairro || 'Não Informado';
      stats[b] = (stats[b] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [families]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="bg-white p-6 md:p-10 rounded-2xl border border-u_brown_light/10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-10">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-u_brown_dark tracking-tight uppercase">Georreferenciamento</h2>
            <p className="text-u_brown_mid text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Densidade territorial e adensamento vulnerável</p>
          </div>
          <div className="bg-u_yellow text-u_brown_dark px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border-b-2 border-u_brown_dark/20 shadow-md self-start md:self-auto">
            {families.length} Famílias Mapeadas
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <h3 className="text-[10px] font-black text-u_brown_light uppercase tracking-widest flex items-center gap-2">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
               Territórios Cadastrados
            </h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {bairroStats.map(([nome, count]) => (
                <div key={nome} className="p-3.5 bg-u_bg rounded-xl border border-transparent flex justify-between items-center group hover:border-u_yellow transition-all cursor-default">
                  <span className="text-[10px] font-black text-u_brown_dark uppercase truncate">{nome}</span>
                  <span className="bg-u_brown_dark text-u_yellow px-2 py-1 rounded text-[10px] font-black shadow-sm">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
             <div className="relative bg-u_bg rounded-3xl border border-u_brown_light/5 min-h-[500px] max-h-[650px] overflow-hidden shadow-inner">
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#2C2928 1.5px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                
                <div className="absolute inset-0 flex items-start justify-start p-6 md:p-8 overflow-auto custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full h-fit pb-16">
                    {families.map((f) => {
                      const risk = calculateVulnerabilityIndex(f);
                      const displayId = f.id.includes('-') ? f.id.split('-')[1] : f.id;
                      return (
                        <div key={f.id} className="bg-white p-5 rounded-2xl border border-u_brown_light/10 shadow-sm hover:shadow-xl hover:border-u_yellow transition-all cursor-default group/pin relative overflow-hidden">
                          {/* Alerta de Risco Visual */}
                          <div className={`absolute top-0 right-0 w-16 h-16 opacity-5 pointer-events-none ${risk > 70 ? 'text-red-600' : 'text-u_yellow'}`}>
                             <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                          </div>

                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 truncate">
                              <div className={`w-2.5 h-2.5 rounded-full ${risk > 70 ? 'bg-red-500' : risk > 40 ? 'bg-orange-400' : 'bg-green-500'} shadow-sm shrink-0`}></div>
                              <span className="text-[9px] font-black text-u_brown_light uppercase tracking-widest truncate">{f.bairro}</span>
                            </div>
                            {f.parecer && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[7px] font-black uppercase">
                                Parecer BD
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-black text-u_brown_dark uppercase mb-1 line-clamp-1">{f.nomeRepresentante}</h4>
                          
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-base font-black text-u_brown_dark tracking-tighter">{f.titularIdade} anos</span>
                            <span className="text-[8px] font-bold text-u_brown_light uppercase opacity-60">
                              {f.upmm.anos && f.upmm.anos[0] ? `Cadastrado em ${f.upmm.anos[0]}` : 'Cadastrado'}
                            </span>
                          </div>

                          <div className="space-y-1.5 mb-4">
                            <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-tight">
                               <span className="text-u_brown_light">Risco Social</span>
                               <span className={risk > 70 ? 'text-red-600' : 'text-u_brown_dark'}>{risk}% de vulnerabilidade</span>
                            </div>
                            <div className="w-full h-1 bg-u_bg rounded-full overflow-hidden">
                               <div 
                                 className={`h-full transition-all duration-700 ${risk > 70 ? 'bg-red-500' : 'bg-u_yellow'}`} 
                                 style={{ width: `${risk}%` }}
                               ></div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-u_bg flex items-center justify-between">
                            <span className="text-[8px] font-black text-u_brown_light uppercase opacity-40">ID: {displayId}</span>
                            <div className="flex gap-1">
                               {f.saude.pcd && <span className="w-4 h-4 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-[7px] font-black">PCD</span>}
                               {f.saude.gestantes && <span className="w-4 h-4 rounded bg-pink-100 text-pink-600 flex items-center justify-center text-[7px] font-black">GES</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4 sm:right-auto bg-u_brown_dark text-u_bg p-4 rounded-2xl border border-white/5 shadow-2xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest flex flex-wrap gap-4 z-10 backdrop-blur-md bg-opacity-95">
                   <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div> Estável</div>
                   <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]"></div> Prioritário</div>
                   <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div> Emergência</div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialMap;
