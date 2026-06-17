
'use server';

import { db } from '@/firebase/server';
import { collection, writeBatch, doc, query, getDocs, where, getCountFromServer, orderBy, limit, setDoc, getDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { analyzeMatch } from '@/ai/flows/analyze-match-flow';

interface ScoreboardMapsResponse {
  result: {
    total: number;
    page_size: number;
    maps: { id: number }[];
  };
}

interface MatchDetails {
    id: number;
    numeric_id: number;
    creation_time: string;
    start: string;
    end: string;
    server_number: number;
    map_name: string;
    player_stats: PlayerStats[];
    [key: string]: any;
}

interface MapScoreboardResponse {
  result: MatchDetails;
}


interface PlayerStats {
    player_id: string;
    name: string;
    kills: number;
    deaths: number;
}

const serversConfig = [
  { id: '3LPZ', name: '3LPZ', apiUrl: 'https://3lpz-stats.hlladmin.com/api' },
  { id: 'HRB', name: 'HRB', apiUrl: 'https://hrb-stats.hlladmin.com/api' },
  { id: 'RZN', name: 'RZN', apiUrl: 'https://rzn-stats.crcon.cc/api' },
  { id: 'GOAT', name: 'GOAT', apiUrl: 'https://goat-stats.hlladmin.com/api' },
  { id: 'OCL', name: 'OCL', apiUrl: 'https://ocabala-stats.hlladmin.com/api' },
  { id: 'SAP', name: 'SAP', apiUrl: 'https://sap-stats.hlladmin.com/api' },
  { id: 'SOH', name: 'SOH', apiUrl: 'https://sohhllbr-stats.hlladmin.com/api' },
  { id: 'SMK', name: 'SMK', apiUrl: 'http://stats.smk-hll.com/api' },
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAllMatchIds(apiUrl: string, fetchOptions: RequestInit): Promise<number[]> {
    let allIds: number[] = [];
    let currentPage = 1;
    let totalPages = 1;

    console.log('[LOG] Iniciando busca de todos os IDs de partida...');

    try {
        do {
            const url = `${apiUrl}/get_scoreboard_maps?page=${currentPage}&limit=100`;
            const response = await fetch(url, fetchOptions);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Falha ao buscar a página ${currentPage} de mapas. Status: ${response.status}, Corpo: ${errorText}`);
                throw new Error(`Falha ao buscar a lista de mapas na página ${currentPage}: ${response.statusText}`);
            }

            const data: ScoreboardMapsResponse = await response.json();
            
            if (currentPage === 1) {
                const totalMatches = data.result.total;
                const pageSize = data.result.page_size;
                totalPages = Math.ceil(totalMatches / pageSize);
                console.log(`[LOG] Total de partidas encontrado: ${totalMatches}. Total de páginas a buscar: ${totalPages}.`);
            }

            const pageIds = data.result.maps.map(m => m.id);
            allIds = allIds.concat(pageIds);
            
            currentPage++;
            if(currentPage <= totalPages) await delay(200); 

        } while (currentPage <= totalPages);

        console.log(`[LOG] Busca de IDs concluída. Total de IDs encontrados: ${allIds.length}`);
        return allIds;
    } catch (error) {
        console.error("Erro ao buscar todos os IDs de partida:", error);
        throw error;
    }
}

async function getLastImportedMatchIdForServer(serverName: string): Promise<number> {
    console.log(`[LOG] Buscando último ID de partida processado para ${serverName} a partir do novo sistema.`);
    const syncStatusRef = doc(db, 'serverSyncStatus', serverName);
    try {
        const docSnap = await getDoc(syncStatusRef);

        if (docSnap.exists()) {
            const lastId = docSnap.data().lastProcessedId || 0;
            console.log(`[LOG] Último ID encontrado para ${serverName}: ${lastId}`);
            return lastId;
        } else {
            console.log(`[LOG] Nenhum status de sincronização encontrado para ${serverName}. Retornando 0.`);
            return 0;
        }
    } catch (error) {
        console.error(`Erro ao buscar status de sincronização para ${serverName}:`, error);
        // Fallback to 0 in case of error
        return 0;
    }
}


export async function getServerSyncStatus(): Promise<Record<string, { processed: number; total: number }>> {
    console.log(`[LOG] Buscando status de sincronização para todos os servidores.`);
    const status: Record<string, { processed: number; total: number }> = {};
    const fetchOptions = { headers: { 'Content-Type': 'application/json' } };

    for (const server of serversConfig) {
        try {
            const allMatchIds = await fetchAllMatchIds(server.apiUrl, fetchOptions);
            const total = allMatchIds.length > 0 ? Math.max(...allMatchIds) : 0;
            
            const processed = await getLastImportedMatchIdForServer(server.name);

            status[server.name] = { processed, total };
            console.log(`[LOG] Status para ${server.name}: ${processed}/${total}`);

        } catch (error) {
            console.error(`Erro ao obter status para ${server.name}:`, error);
            status[server.name] = { processed: 0, total: 0 };
        }
    }
    console.log('[LOG] Status de sincronização por servidor:', status);
    return status;
}

export async function getPlayerCount(): Promise<number> {
    try {
        const aggregatesRef = collection(db, 'playerAggregates');
        const querySnapshot = await getCountFromServer(aggregatesRef);
        return querySnapshot.data().count;
    } catch (error) {
        console.error("Error getting player count:", error);
        return 0;
    }
}


export async function importServerData(
  serverName: string,
  apiUrl: string
): Promise<{ success: boolean; matchesProcessed?: number; totalFound?: number; error?: string }> {
  console.log(`[LOG INICIAL] Função importServerData iniciada para o servidor: ${serverName}`);
  
  try {
    const fetchOptions = {
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    const lastImportedId = await getLastImportedMatchIdForServer(serverName);
    console.log(`[LOG] Último ID de partida processado para '${serverName}': ${lastImportedId}`);

    const allMatchIds = await fetchAllMatchIds(apiUrl, fetchOptions);
    const totalMatchesApi = allMatchIds.length;
    
    const matchIdsToImport = allMatchIds.filter(id => id > lastImportedId).sort((a, b) => a - b);
    console.log(`[LOG] Total de partidas na API: ${totalMatchesApi}. Novas partidas a importar: ${matchIdsToImport.length}`);

    if (matchIdsToImport.length === 0) {
      console.log("[LOG] Nenhuma partida nova para importar.");
      return { success: true, matchesProcessed: 0, totalFound: totalMatchesApi };
    }

    let matchesProcessed = 0;
    let highestSuccessfullyProcessedId = lastImportedId;
    const loopLimit = matchIdsToImport.length;
    console.log(`[LOG] Iniciando loop de importação para ${loopLimit} partidas.`);

    for (let i = 0; i < loopLimit; i++) {
      const matchId = matchIdsToImport[i];
      try {
        await delay(200); 
        
        const mapUrl = `${apiUrl}/get_map_scoreboard?map_id=${matchId}`;
        console.log(`[LOG] Processando partida ${i + 1} de ${loopLimit} (ID: ${matchId}).`);

        const mapResponse = await fetch(mapUrl, fetchOptions);

        if (!mapResponse.ok) {
          const errorText = await mapResponse.text();
          console.warn(`Falha ao buscar partida ID ${matchId}. Status: ${mapResponse.status}. Corpo: ${errorText}. Pulando.`);
          continue;
        }

        const mapData: MapScoreboardResponse = await mapResponse.json();
        const matchInfo = mapData.result;

        if (!matchInfo || !matchInfo.player_stats) {
            console.warn(`Dados da partida ID ${matchId} estão incompletos ou nulos. Pulando.`);
            continue;
        }

        const matchDocRef = doc(db, 'rawMatchResults', matchInfo.id.toString());
        await setDoc(matchDocRef, { ...matchInfo, numeric_id: matchInfo.id, server: serverName });

        matchesProcessed++;
        highestSuccessfullyProcessedId = matchId;

      } catch (innerError: any) {
        console.error(`Erro processando partida ID ${matchId}:`, innerError.message);
      }
    }

    if (highestSuccessfullyProcessedId > lastImportedId) {
        const syncStatusRef = doc(db, 'serverSyncStatus', serverName);
        await setDoc(syncStatusRef, { 
            lastProcessedId: highestSuccessfullyProcessedId,
            serverName: serverName,
            lastChecked: serverTimestamp()
        }, { merge: true });
        console.log(`[LOG] Status de sincronização para ${serverName} atualizado para a partida ID: ${highestSuccessfullyProcessedId}`);
    }

    console.log(`[LOG FINAL] Importação concluída. ${matchesProcessed} partidas processadas.`);
    return { success: true, matchesProcessed, totalFound: totalMatchesApi };
  } catch (error: any) {
    console.error('[ERRO GERAL] Erro na importação de dados do servidor:', error);
    return { success: false, error: error.message };
  }
}

export async function importSpecificMatches(
  serverName: string,
  apiUrl: string,
  matchIdsString: string
): Promise<{ success: boolean; matchesProcessed?: number; totalToProcess?: number; error?: string }> {
  console.log(`[LOG INICIAL] Importação manual iniciada para o servidor: ${serverName}`);

  if (!serverName || !apiUrl || !matchIdsString) {
    return { success: false, error: "Servidor, URL da API e IDs das partidas são obrigatórios." };
  }

  // Parse a string de IDs (separados por vírgula, espaço ou nova linha) para um array de números
  const matchIdsToImport = matchIdsString
    .split(/[\s,]+/)
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id) && id > 0);

  if (matchIdsToImport.length === 0) {
    return { success: false, error: "Nenhum ID de partida válido encontrado." };
  }

  console.log(`[LOG] Total de partidas para importar manualmente: ${matchIdsToImport.length}`);
  
  try {
    const fetchOptions = { headers: { 'Content-Type': 'application/json' } };
    let matchesProcessed = 0;

    for (const matchId of matchIdsToImport) {
      try {
        await delay(250); // Delay para não sobrecarregar a API
        
        const mapUrl = `${apiUrl}/get_map_scoreboard?map_id=${matchId}`;
        console.log(`[LOG MANUAL] Processando partida ID: ${matchId}`);
        
        const mapResponse = await fetch(mapUrl, fetchOptions);

        if (!mapResponse.ok) {
          const errorText = await mapResponse.text();
          console.warn(`[LOG MANUAL] Falha ao buscar partida ID ${matchId}. Status: ${mapResponse.status}. Corpo: ${errorText}. Pulando.`);
          continue;
        }

        const mapData: MapScoreboardResponse = await mapResponse.json();
        const matchInfo = mapData.result;

        if (!matchInfo || !matchInfo.player_stats) {
            console.warn(`[LOG MANUAL] Dados da partida ID ${matchId} estão incompletos. Pulando.`);
            continue;
        }

        const batch = writeBatch(db);
        const matchDocRef = doc(db, 'rawMatchResults', matchInfo.id.toString());
        batch.set(matchDocRef, { ...matchInfo, numeric_id: matchInfo.id, server: serverName });

        await batch.commit();
        matchesProcessed++;
      } catch (innerError: any) {
        console.error(`[LOG MANUAL] Erro processando partida ID ${matchId}:`, innerError.message);
      }
    }

    console.log(`[LOG FINAL] Importação manual concluída. ${matchesProcessed} de ${matchIdsToImport.length} partidas processadas.`);
    return { success: true, matchesProcessed, totalToProcess: matchIdsToImport.length };

  } catch (error: any) {
    console.error('[ERRO GERAL] Erro na importação manual:', error);
    return { success: false, error: error.message };
  }
}

export async function importMatchRange(
  serverName: string,
  apiUrl: string,
  startId: number,
  endId: number
): Promise<{ success: boolean; matchesProcessed?: number; totalToProcess?: number; error?: string }> {
  console.log(`[LOG INICIAL] Importação por intervalo iniciada para o servidor: ${serverName}, de ${startId} a ${endId}`);

  if (!serverName || !apiUrl || !startId || !endId || startId <= 0 || endId < startId) {
    return { success: false, error: "Parâmetros inválidos. Verifique servidor, IDs e intervalo." };
  }

  const matchIdsToImport = Array.from({ length: endId - startId + 1 }, (_, i) => startId + i);
  const totalToProcess = matchIdsToImport.length;
  console.log(`[LOG] Total de partidas para importar no intervalo: ${totalToProcess}`);
  
  try {
    const fetchOptions = { headers: { 'Content-Type': 'application/json' } };
    let matchesProcessed = 0;
    const lastImportedId = await getLastImportedMatchIdForServer(serverName);
    let highestSuccessfullyProcessedId = lastImportedId;

    for (const matchId of matchIdsToImport) {
      try {
        await delay(250); // Delay to avoid overwhelming the API
        
        const mapUrl = `${apiUrl}/get_map_scoreboard?map_id=${matchId}`;
        console.log(`[LOG INTERVALO] Processando partida ID: ${matchId}`);
        
        const mapResponse = await fetch(mapUrl, fetchOptions);

        if (!mapResponse.ok) {
          const errorText = await mapResponse.text();
          console.warn(`[LOG INTERVALO] Falha ao buscar partida ID ${matchId}. Status: ${mapResponse.status}. Corpo: ${errorText}. Pulando.`);
          continue;
        }

        const mapData: MapScoreboardResponse = await mapResponse.json();
        const matchInfo = mapData.result;

        if (!matchInfo || !matchInfo.player_stats) {
            console.warn(`[LOG INTERVALO] Dados da partida ID ${matchId} estão incompletos. Pulando.`);
            continue;
        }

        const matchDocRef = doc(db, 'rawMatchResults', matchInfo.id.toString());
        await setDoc(matchDocRef, { ...matchInfo, numeric_id: matchInfo.id, server: serverName });

        matchesProcessed++;
        highestSuccessfullyProcessedId = Math.max(highestSuccessfullyProcessedId, matchId);
      } catch (innerError: any) {
        console.error(`[LOG INTERVALO] Erro processando partida ID ${matchId}:`, innerError.message);
      }
    }

    if (highestSuccessfullyProcessedId > lastImportedId) {
        const syncStatusRef = doc(db, 'serverSyncStatus', serverName);
        await setDoc(syncStatusRef, { 
            lastProcessedId: highestSuccessfullyProcessedId,
            serverName: serverName,
            lastChecked: serverTimestamp()
        }, { merge: true });
        console.log(`[LOG INTERVALO] Status de sincronização para ${serverName} atualizado para a partida ID: ${highestSuccessfullyProcessedId}`);
    }

    console.log(`[LOG FINAL] Importação por intervalo concluída. ${matchesProcessed} de ${totalToProcess} partidas processadas.`);
    return { success: true, matchesProcessed, totalToProcess };

  } catch (error: any) {
    console.error('[ERRO GERAL] Erro na importação por intervalo:', error);
    return { success: false, error: error.message };
  }
}

export async function importHistoricalMatchRange(
  serverName: string,
  apiUrl: string,
  startId: number,
  endId: number
): Promise<{ success: boolean; matchesProcessed?: number; totalToProcess?: number; error?: string }> {
  console.log(`[LOG INICIAL] Importação HISTÓRICA por intervalo iniciada para o servidor: ${serverName}, de ${startId} a ${endId}`);

  if (!serverName || !apiUrl || !startId || !endId || startId <= 0 || endId < startId) {
    return { success: false, error: "Parâmetros inválidos. Verifique servidor, IDs e intervalo." };
  }

  const matchIdsToImport = Array.from({ length: endId - startId + 1 }, (_, i) => startId + i);
  const totalToProcess = matchIdsToImport.length;
  console.log(`[LOG] Total de partidas para importar no intervalo histórico: ${totalToProcess}`);
  
  try {
    const fetchOptions = { headers: { 'Content-Type': 'application/json' } };
    let matchesProcessed = 0;
    const lastImportedId = await getLastImportedMatchIdForServer(serverName);
    let highestSuccessfullyProcessedId = lastImportedId;

    for (const matchId of matchIdsToImport) {
      try {
        await delay(250); // Delay para não sobrecarregar a API
        
        const mapUrl = `${apiUrl}/get_map_scoreboard?map_id=${matchId}`;
        console.log(`[LOG HISTÓRICO] Processando partida ID: ${matchId}`);
        
        const mapResponse = await fetch(mapUrl, fetchOptions);

        if (!mapResponse.ok) {
          const errorText = await mapResponse.text();
          console.warn(`[LOG HISTÓRICO] Falha ao buscar partida ID ${matchId}. Status: ${mapResponse.status}. Corpo: ${errorText}. Pulando.`);
          continue;
        }

        const mapData: MapScoreboardResponse = await mapResponse.json();
        const matchInfo = mapData.result;

        if (!matchInfo || !matchInfo.player_stats) {
            console.warn(`[LOG HISTÓRICO] Dados da partida ID ${matchId} estão incompletos. Pulando.`);
            continue;
        }

        const matchDocRef = doc(db, 'rawMatchResults', matchInfo.id.toString());
        await setDoc(matchDocRef, { ...matchInfo, numeric_id: matchInfo.id, server: serverName, historical: true });

        matchesProcessed++;
        highestSuccessfullyProcessedId = Math.max(highestSuccessfullyProcessedId, matchId);
      } catch (innerError: any) {
        console.error(`[LOG HISTÓRICO] Erro processando partida ID ${matchId}:`, innerError.message);
      }
    }
    
    if (highestSuccessfullyProcessedId > lastImportedId) {
        const syncStatusRef = doc(db, 'serverSyncStatus', serverName);
        await setDoc(syncStatusRef, { 
            lastProcessedId: highestSuccessfullyProcessedId,
            serverName: serverName,
            lastChecked: serverTimestamp()
        }, { merge: true });
        console.log(`[LOG HISTÓRICO] Status de sincronização para ${serverName} atualizado para a partida ID: ${highestSuccessfullyProcessedId}`);
    }


    console.log(`[LOG FINAL] Importação histórica por intervalo concluída. ${matchesProcessed} de ${totalToProcess} partidas processadas.`);
    return { success: true, matchesProcessed, totalToProcess };

  } catch (error: any) {
    console.error('[ERRO GERAL] Erro na importação histórica por intervalo:', error);
    return { success: false, error: error.message };
  }
}

export async function updateGlobalStats(): Promise<{ success: boolean; error?: string; maxStats?: any }> {
  console.log('[LOG] Iniciando a atualização das estatísticas globais...');
  try {
    const statsToQuery: (keyof import('@/lib/types').PlayerAggregates)[] = [
      'totalKills',
      'totalCombat',
      'totalOffense',
      'totalDefense',
      'totalSupport',
    ];

    let maxStats: any = {};

    for (const stat of statsToQuery) {
      console.log(`[LOG] Buscando valor máximo para: ${stat}`);
      const q = query(
        collection(db, 'playerAggregates'),
        orderBy(stat, 'desc'),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const topPlayer = querySnapshot.docs[0].data();
        maxStats[`max${stat.charAt(0).toUpperCase() + stat.slice(1)}`] = topPlayer[stat] || 0;
      } else {
        maxStats[`max${stat.charAt(0).toUpperCase() + stat.slice(1)}`] = 0;
      }
      console.log(`[LOG] Valor máximo para ${stat}: ${maxStats[`max${stat.charAt(0).toUpperCase() + stat.slice(1)}`]}`);
    }

    const globalStatsRef = doc(db, 'globalStats', 'summary');
    await setDoc(globalStatsRef, maxStats, { merge: true });

    console.log('[LOG] Estatísticas globais atualizadas com sucesso:', maxStats);
    return { success: true, maxStats };

  } catch (error: any) {
    console.error('[ERRO GERAL] Falha ao atualizar estatísticas globais:', error);
    return { success: false, error: error.message };
  }
}

export async function runMatchAnalysisAction(matchJson: string, factionFilter: 'all' | 'axis' | 'allies' = 'all'): Promise<{ success: boolean; report?: string; error?: string }> {
  try {
    const report = await analyzeMatch({ matchJson, factionFilter });
    return { success: true, report };
  } catch (error: any) {
    console.error('Error in match analysis action:', error);
    return { success: false, error: error.message || 'Falha ao analisar a partida.' };
  }
}

export async function publishToCasernaAction(title: string, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date();
    const slug = title.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-' + now.getTime();

    const description = content.substring(0, 160).replace(/[#*]/g, '') + '...';
    
    const articleData = {
      title,
      slug,
      description,
      content,
      date: now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
      tags: ['Relatório de Partida', 'IA'],
      createdAt: now.toISOString(),
    };

    await addDoc(collection(db, 'articles'), articleData);
    return { success: true };
  } catch (error: any) {
    console.error('Error publishing to Caserna:', error);
    return { success: false, error: error.message || 'Falha ao publicar na Caserna.' };
  }
}
