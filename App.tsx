import React, { useState, useEffect, useCallback } from 'react';
import { ViewMode, FamilyData } from './types';
import Dashboard from './components/Dashboard';
import IndividualAnalysis from './components/IndividualAnalysis';
import ImportCSV from './components/ImportCSV';
import SocialMap from './components/SocialMap';
import { storageService } from './services/storageService';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [families, setFamilies] = useState<FamilyData[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoadingDB, setIsLoadingDB] = useState(true);

  // Carregar dados persistentes do banco de dados (IndexedDB/LocalStorage)
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const loaded = await storageService.getFamilies();
        if (mounted) {
          setFamilies(loaded);
          setIsLoadingDB(false);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do banco de dados:', err);
        if (mounted) setIsLoadingDB(false);
      }
    };

    loadData();

    // Inscrição em alterações da base
    const unsubscribe = storageService.subscribe((updatedFamilies) => {
      if (mounted) {
        setFamilies(updatedFamilies);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Salvar parecer gerado ou editado no banco de dados
  const handleSaveParecer = useCallback(async (
    familyId: string, 
    texto: string, 
    autor: string = 'Gemini 3.0 Flash',
    tipo: 'ia_gerado' | 'manual' | 'revisado' = 'ia_gerado'
  ) => {
    try {
      const updated = await storageService.saveParecer(familyId, texto, autor, tipo);
      setFamilies(prev => prev.map(f => f.id === familyId ? updated : f));
    } catch (err) {
      console.error('Erro ao salvar parecer no banco de dados:', err);
      throw err;
    }
  }, []);

  // Salvar anotações técnicas
  const handleUpdateNotes = useCallback(async (familyId: string, notes: string) => {
    try {
      const updated = await storageService.updateTechnicalNotes(familyId, notes);
      setFamilies(prev => prev.map(f => f.id === familyId ? updated : f));
    } catch (err) {
      console.error('Erro ao salvar anotações no banco de dados:', err);
      throw err;
    }
  }, []);

  // Importar novo lote de famílias (CSV) e persistir no banco de dados
  const handleImport = useCallback(async (newFamilies: FamilyData[]) => {
    try {
      const saved = await storageService.saveFamilies(newFamilies);
      setFamilies(saved);
      setView(ViewMode.DASHBOARD);
    } catch (err) {
      console.error('Erro ao persistir importação no banco:', err);
      alert('Erro ao gravar os dados importados no banco de dados.');
    }
  }, []);

  // Restaurar dados originais de demonstração
  const handleResetDB = useCallback(async () => {
    if (confirm('Deseja restaurar o banco de dados para os registros iniciais de demonstração?')) {
      const resetData = await storageService.resetDatabase();
      setFamilies(resetData);
    }
  }, []);

  const closeSidebar = () => setIsSidebarOpen(false);

  const renderContent = () => {
    if (isLoadingDB) {
      return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="w-12 h-12 border-4 border-u_yellow border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-black text-u_brown_dark uppercase tracking-widest">
            Sincronizando Banco de Dados Persistente...
          </p>
        </div>
      );
    }

    switch (view) {
      case ViewMode.DASHBOARD: 
        return <Dashboard families={families} onNavigateToAnalysis={() => setView(ViewMode.ANALISE_IA)} />;
      case ViewMode.ANALISE_IA: 
        return (
          <IndividualAnalysis 
            families={families} 
            onSaveParecer={handleSaveParecer}
            onUpdateNotes={handleUpdateNotes}
          />
        );
      case ViewMode.MAPA: 
        return <SocialMap families={families} />;
      case ViewMode.IMPORT: 
        return <ImportCSV onImport={handleImport} />;
      default: 
        return <Dashboard families={families} onNavigateToAnalysis={() => setView(ViewMode.ANALISE_IA)} />;
    }
  };

  const pareceresSalvosCount = families.filter(f => f.parecer && f.parecer.trim().length > 0).length;

  return (
    <div className="flex min-h-screen bg-u_bg text-u_brown_dark overflow-hidden relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-u_brown_dark text-white flex flex-col shadow-2xl z-40 transition-transform duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-u_yellow rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-u_brown_dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <span className="font-black text-lg tracking-tighter uppercase">Lupa<span className="text-u_yellow">Social</span></span>
          </div>
          <button className="lg:hidden text-white/50" onClick={closeSidebar}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
             </svg>
          </button>
        </div>

        {/* Database Quick Stats */}
        <div className="mx-4 mb-4 p-3 bg-white/5 rounded-xl border border-white/5">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-u_brown_light mb-1">
            <span>Base de Dados</span>
            <span className="text-emerald-400">Persistente</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-black text-white">{families.length} Famílias</span>
            <span className="text-[10px] font-bold text-u_yellow">{pareceresSalvosCount} com Parecer</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>} 
            label="Visão Geral" 
            active={view === ViewMode.DASHBOARD} 
            onClick={() => { setView(ViewMode.DASHBOARD); closeSidebar(); }} 
          />
          <SidebarItem 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>} 
            label="Pareceres & IA" 
            badge={pareceresSalvosCount > 0 ? `${pareceresSalvosCount}` : undefined}
            active={view === ViewMode.ANALISE_IA} 
            onClick={() => { setView(ViewMode.ANALISE_IA); closeSidebar(); }} 
          />
          <SidebarItem 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} 
            label="Mapa Social" 
            active={view === ViewMode.MAPA} 
            onClick={() => { setView(ViewMode.MAPA); closeSidebar(); }} 
          />
          <SidebarItem 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>} 
            label="Importar Dados" 
            active={view === ViewMode.IMPORT} 
            onClick={() => { setView(ViewMode.IMPORT); closeSidebar(); }} 
          />
        </nav>

        {/* Database Management & Reset */}
        <div className="p-4 border-t border-white/5 space-y-2">
          <button
            onClick={handleResetDB}
            className="w-full text-left px-3 py-2 rounded-lg text-[9px] font-bold text-u_brown_light hover:text-white hover:bg-white/5 uppercase tracking-wider transition-colors"
          >
            ↺ Restaurar Dados Demo
          </button>
          <div className="text-[10px] text-u_brown_light font-bold uppercase tracking-widest px-3 pt-2">
            UPMM - Gestão 2026
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="h-16 bg-white border-b border-u_brown_light/10 flex items-center justify-between px-4 md:px-8 z-10 shrink-0">
          <div className="flex items-center gap-4">
             <button 
               className="p-2 -ml-2 text-u_brown_mid lg:hidden"
               onClick={() => setIsSidebarOpen(true)}
             >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"/>
                </svg>
             </button>
             <h2 className="text-xs md:text-sm font-black text-u_brown_mid uppercase tracking-widest truncate">
              {view === ViewMode.DASHBOARD ? 'Inteligência Coletiva' : 
               view === ViewMode.ANALISE_IA ? 'Pareceres Psicossociais & Risco' : 
               view === ViewMode.MAPA ? 'Mapa Social Territorial' : 'Importação de Dados'}
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
             <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               BD Conectado
             </div>
             <div className="hidden sm:block bg-u_yellow/10 text-u_yellow px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-u_yellow/20">
               Gemini AI Ativa
             </div>
             <div className="w-8 h-8 rounded-full bg-u_brown_dark flex items-center justify-center text-u_yellow font-bold text-xs shadow-sm">
               UP
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

const SidebarItem = ({ icon, label, badge, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${active ? 'bg-u_yellow text-u_brown_dark font-black' : 'text-u_brown_light hover:bg-white/5 hover:text-white'}`}>
    <div className="flex items-center truncate">
      <span className="mr-3 shrink-0">{icon}</span>
      <span className="text-sm truncate">{label}</span>
    </div>
    {badge && (
      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${active ? 'bg-u_brown_dark text-u_yellow' : 'bg-u_yellow/20 text-u_yellow'}`}>
        {badge}
      </span>
    )}
  </button>
);

export default App;
