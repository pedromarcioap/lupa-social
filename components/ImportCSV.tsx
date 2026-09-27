
import React, { useRef, useState } from 'react';
import { parseFamiliesCSV, downloadCSVTemplate } from '../utils/csvParser';
import { FamilyData } from '../types';

interface ImportCSVProps {
  onImport: (families: FamilyData[]) => void;
}

const ImportCSV: React.FC<ImportCSVProps> = ({ onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const processFile = async (file: File) => {
    setLoading(true);
    try {
      const data = await parseFamiliesCSV(file);
      onImport(data);
    } catch (error) {
      alert("Erro ao processar o arquivo CSV. Verifique a formatação das colunas.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 px-2 md:px-0">
      <div className="bg-white p-6 md:p-10 rounded-2xl border border-u_brown_light/10 shadow-sm">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-8 md:mb-10">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-u_brown_dark tracking-tight uppercase">Ingestão de Dados</h2>
            <p className="text-u_brown_mid text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Sincronização de base cadastral UPMM</p>
          </div>
          <button 
            onClick={downloadCSVTemplate}
            className="text-u_yellow hover:text-u_brown_dark text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors self-start md:self-end"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Baixar Template CSV
          </button>
        </div>

        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={async (e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) await processFile(f); }}
          className={`
            border-2 border-dashed rounded-2xl md:rounded-3xl p-8 md:p-16 flex flex-col items-center justify-center transition-all cursor-pointer
            ${isDragging ? 'border-u_yellow bg-u_yellow/5' : 'border-u_bg hover:border-u_yellow hover:bg-u_bg/50'}
            ${loading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
          
          {loading ? (
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-u_yellow border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-u_brown_dark font-black text-[10px] md:text-xs uppercase tracking-widest">Processando Inteligência...</p>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 md:w-20 md:h-20 bg-u_brown_dark text-u_yellow rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-xl transform transition-transform group-hover:rotate-6">
                <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 2v-6m0 10v4a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2m3 3l3-3m0 0l3 3m-3-3v8"/></svg>
              </div>
              <p className="text-xs md:text-sm font-black text-u_brown_dark uppercase tracking-widest mb-2 text-center">Selecione ou arraste o arquivo CSV</p>
              <p className="text-[9px] md:text-[10px] text-u_brown_light font-bold">Base cadastral completa 39 famílias</p>
            </>
          )}
        </div>

        <div className="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <Feature icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>} title="Normalização" desc="Limpeza de CPFs e tratamento de valores monetários automático." />
          <Feature icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>} title="Vulnerabilidade" desc="Cálculo imediato do Índice de Risco Social por núcleo familiar." />
          <Feature icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>} title="IA Pronta" desc="Dados preparados para o processamento do Parecer Gemini." />
        </div>
      </div>
    </div>
  );
};

const Feature = ({ icon, title, desc }: any) => (
  <div className="flex gap-4">
    <div className="w-10 h-10 shrink-0 bg-u_bg text-u_brown_dark rounded-xl flex items-center justify-center shadow-inner">{icon}</div>
    <div>
      <h4 className="font-black text-u_brown_dark text-[11px] md:text-xs uppercase tracking-widest">{title}</h4>
      <p className="text-[9px] md:text-[10px] text-u_brown_mid font-bold mt-1 leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default ImportCSV;
