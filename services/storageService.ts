import { FamilyData, ParecerRecord } from '../types';
import { mockFamilies } from '../data/sampleData';

const DB_NAME = 'LupaSocial_DB';
const DB_VERSION = 1;
const STORE_NAME = 'families';
const LOCAL_STORAGE_KEY = 'lupa_social_families_v1';

// Gerenciamento de IndexedDB com fallback para LocalStorage
class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private listeners: Array<(families: FamilyData[]) => void> = [];

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.initIndexedDB();
    }
  }

  private initIndexedDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('nomeRepresentante', 'nomeRepresentante', { unique: false });
            store.createIndex('cpf', 'cpf', { unique: false });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (error) => {
          console.warn('Erro ao abrir IndexedDB, fallback para localStorage:', error);
          reject(error);
        };
      } catch (err) {
        console.warn('IndexedDB indisponível, usando localStorage:', err);
        reject(err);
      }
    });

    return this.dbPromise;
  }

  // Obter todas as famílias persistidas
  async getFamilies(): Promise<FamilyData[]> {
    try {
      const db = await this.initIndexedDB();
      const families = await new Promise<FamilyData[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      if (families && families.length > 0) {
        return families;
      }
    } catch (e) {
      console.warn('Consulta IndexedDB falhou, checando localStorage:', e);
    }

    // Fallback localStorage
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: FamilyData[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Erro ao ler localStorage:', e);
    }

    // Se a base estiver vazia, inicializar com os dados de demonstração
    await this.saveFamilies(mockFamilies);
    return mockFamilies;
  }

  // Obter família por ID
  async getFamilyById(id: string): Promise<FamilyData | null> {
    const families = await this.getFamilies();
    return families.find(f => f.id === id) || null;
  }

  // Salvar uma família única
  async saveFamily(family: FamilyData): Promise<FamilyData> {
    const updatedFamily = {
      ...family,
      atualizadoEm: new Date().toISOString()
    };

    const families = await this.getFamilies();
    const index = families.findIndex(f => f.id === updatedFamily.id);
    
    if (index >= 0) {
      families[index] = updatedFamily;
    } else {
      families.push(updatedFamily);
    }

    await this.persistAll(families);
    this.notifyListeners(families);
    return updatedFamily;
  }

  // Salvar lote de famílias (ex: importação de CSV)
  async saveFamilies(families: FamilyData[]): Promise<FamilyData[]> {
    const timestamped = families.map(f => ({
      ...f,
      atualizadoEm: f.atualizadoEm || new Date().toISOString()
    }));

    await this.persistAll(timestamped);
    this.notifyListeners(timestamped);
    return timestamped;
  }

  // Salvar ou atualizar parecer psicossocial com histórico
  async saveParecer(
    familyId: string, 
    texto: string, 
    autor: string = 'Gemini 3.0 Flash', 
    tipo: 'ia_gerado' | 'manual' | 'revisado' = 'ia_gerado'
  ): Promise<FamilyData> {
    const families = await this.getFamilies();
    const index = families.findIndex(f => f.id === familyId);

    if (index === -1) {
      throw new Error(`Família com id ${familyId} não encontrada no banco de dados.`);
    }

    const family = families[index];
    const agora = new Date().toISOString();
    const historicoAtual = family.pareceresHistorico || [];
    const novaVersao = historicoAtual.length + 1;

    const novoRegistro: ParecerRecord = {
      id: `par-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      familiaId: familyId,
      texto,
      tipo,
      criadoEm: agora,
      autor,
      versao: novaVersao
    };

    const updatedFamily: FamilyData = {
      ...family,
      parecer: texto,
      parecerGeradoEm: agora,
      parecerAutor: autor,
      parecerStatus: tipo === 'manual' || tipo === 'revisado' ? 'revisado' : 'gerado',
      pareceresHistorico: [novoRegistro, ...historicoAtual],
      atualizadoEm: agora
    };

    families[index] = updatedFamily;
    await this.persistAll(families);
    this.notifyListeners(families);

    return updatedFamily;
  }

  // Atualizar anotações técnicas do assistente social
  async updateTechnicalNotes(familyId: string, anotacoes: string): Promise<FamilyData> {
    const families = await this.getFamilies();
    const index = families.findIndex(f => f.id === familyId);

    if (index === -1) {
      throw new Error(`Família com id ${familyId} não encontrada.`);
    }

    const updatedFamily: FamilyData = {
      ...families[index],
      anotacoesTecnicas: anotacoes,
      atualizadoEm: new Date().toISOString()
    };

    families[index] = updatedFamily;
    await this.persistAll(families);
    this.notifyListeners(families);

    return updatedFamily;
  }

  // Deletar parecer histórico específico
  async deleteParecer(familyId: string, parecerId: string): Promise<FamilyData> {
    const families = await this.getFamilies();
    const index = families.findIndex(f => f.id === familyId);

    if (index === -1) {
      throw new Error(`Família com id ${familyId} não encontrada.`);
    }

    const family = families[index];
    const historico = (family.pareceresHistorico || []).filter(p => p.id !== parecerId);
    const parecerMaisRecente = historico[0];

    const updatedFamily: FamilyData = {
      ...family,
      parecer: parecerMaisRecente ? parecerMaisRecente.texto : '',
      parecerGeradoEm: parecerMaisRecente ? parecerMaisRecente.criadoEm : undefined,
      parecerAutor: parecerMaisRecente ? parecerMaisRecente.autor : undefined,
      parecerStatus: parecerMaisRecente ? (pareMaisRecenteStatus(parecerMaisRecente.tipo)) : 'pendente',
      pareceresHistorico: historico,
      atualizadoEm: new Date().toISOString()
    };

    families[index] = updatedFamily;
    await this.persistAll(families);
    this.notifyListeners(families);

    return updatedFamily;
  }

  // Restaurar dados iniciais
  async resetDatabase(): Promise<FamilyData[]> {
    await this.persistAll(mockFamilies);
    this.notifyListeners(mockFamilies);
    return mockFamilies;
  }

  // Exportar banco de dados completo em formato JSON
  async exportDatabase(): Promise<string> {
    const families = await this.getFamilies();
    return JSON.stringify(families, null, 2);
  }

  // Importar banco de dados JSON
  async importDatabase(jsonString: string): Promise<FamilyData[]> {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      throw new Error('Formato de dados inválido para importação.');
    }
    await this.persistAll(parsed);
    this.notifyListeners(parsed);
    return parsed;
  }

  // Inscrição para atualizações reativas de estado
  subscribe(callback: (families: FamilyData[]) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(families: FamilyData[]) {
    this.listeners.forEach(cb => cb(families));
  }

  // Gravação síncrona/atômica em IndexedDB e localStorage
  private async persistAll(families: FamilyData[]): Promise<void> {
    // 1. Gravar em LocalStorage como garantia imediata
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(families));
    } catch (e) {
      console.warn('Erro ao salvar em localStorage:', e);
    }

    // 2. Gravar em IndexedDB
    try {
      const db = await this.initIndexedDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        // Limpar e reinserir todos os registros atualizados
        store.clear();
        for (const item of families) {
          store.put(item);
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('Persistência no IndexedDB falhou:', e);
    }
  }
}

function pareMaisRecenteStatus(tipo: 'ia_gerado' | 'manual' | 'revisado'): 'gerado' | 'revisado' {
  return tipo === 'ia_gerado' ? 'gerado' : 'revisado';
}

export const storageService = new StorageService();
