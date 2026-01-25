
'use server';

import { db } from '@/firebase/server';
import { collection, writeBatch, doc, query, getDocs, where, getCountFromServer, orderBy, limit, setDoc } from 'firebase/firestore';

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
  { id: 'FEFE', name: 'FEFE', apiUrl: 'https://fefestats.hellletloose.com.br/api' },
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
    const aggregatesRef = collection(db, 'playerAggregates');
    const q = query(aggregatesRef, where(`processedServers.${serverName}`, '>', 0));
    const querySnapshot = await getDocs(q);

    let maxId = 0;
    querySnapshot.forEach(doc => {
        const serverId = doc.data().processedServers[serverName];
        if (serverId > maxId) {
            maxId = serverId;
        }
    });

    console.log(`[LOG] Último ID de partida processado encontrado para ${serverName}: ${maxId}`);
    return maxId;
}


export async function getServerSyncStatus(): Promise<Record<string, { processed: number; total: number }>> {
    console.log(`[LOG] Buscando status de sincronização para todos os servidores.`);
    const status: Record<string, { processed: number; total: number }> = {};
    const fetchOptions = { headers: { 'Content-Type': 'application/json' } };

    for (const server of serversConfig) {
        try {
            const allMatchIds = await fetchAllMatchIds(server.apiUrl, fetchOptions);
            const total = allMatchIds.length;
            
            const q = query(collection(db, 'rawMatchResults'), where('server', '==', server.name));
            const processedSnapshot = await getCountFromServer(q);
            const processed = total - processedSnapshot.data().count; 

            status[server.name] = { processed: Math.max(0, processed), total };
            console.log(`[LOG] Status para ${server.name}: ${status[server.name].processed}/${status[server.name].total}`);

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

        const batch = writeBatch(db);
        const matchDocRef = doc(db, 'rawMatchResults', matchInfo.id.toString());
        batch.set(matchDocRef, { ...matchInfo, numeric_id: matchInfo.id, server: serverName });

        await batch.commit();
        matchesProcessed++;

      } catch (innerError: any) {
        console.error(`Erro processando partida ID ${matchId}:`, innerError.message);
      }
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

        const batch = writeBatch(db);
        const matchDocRef = doc(db, 'rawMatchResults', matchInfo.id.toString());
        batch.set(matchDocRef, { ...matchInfo, numeric_id: matchInfo.id, server: serverName });

        await batch.commit();
        matchesProcessed++;
      } catch (innerError: any) {
        console.error(`[LOG INTERVALO] Erro processando partida ID ${matchId}:`, innerError.message);
      }
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

        const batch = writeBatch(db);
        const matchDocRef = doc(db, 'rawMatchResults', matchInfo.id.toString());
        batch.set(matchDocRef, { ...matchInfo, numeric_id: matchInfo.id, server: serverName, historical: true });

        await batch.commit();
        matchesProcessed++;
      } catch (innerError: any) {
        console.error(`[LOG HISTÓRICO] Erro processando partida ID ${matchId}:`, innerError.message);
      }
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

    

    
