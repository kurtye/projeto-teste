'use server';

import { db } from '@/firebase/server';
import { collection, writeBatch, doc, query, orderBy, limit, getDocs, where, collectionGroup } from 'firebase/firestore';

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
  { id: '3LPZ', name: '3LPZ' },
  { id: 'HRB', name: 'HRB' },
  { id: 'RZN', name: 'RZN' },
  { id: 'GOAT', name: 'GOAT' },
  { id: 'OCL', name: 'OCL' },
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
            console.log(`[LOG] Buscando página ${currentPage} de IDs de: ${url}`);
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
            console.log(`[LOG] ${pageIds.length} IDs adicionados. Total de IDs acumulados: ${allIds.length}`);
            
            currentPage++;
            await delay(200); 

        } while (currentPage <= totalPages);

        console.log(`[LOG] Busca de IDs concluída. Total de IDs encontrados: ${allIds.length}`);
        return allIds;
    } catch (error) {
        console.error("Erro ao buscar todos os IDs de partida:", error);
        throw error;
    }
}

export async function getLastImportedMatchId(serverName: string): Promise<number> {
    console.log(`[LOG] Buscando último ID de partida para o servidor '${serverName}'.`);
    try {
        const aggregatesRef = collection(db, 'playerAggregates');
        // Ordena de forma descendente pelo campo do servidor específico dentro do mapa `processedServers`
        const q = query(aggregatesRef, orderBy(`processedServers.${serverName}`, 'desc'), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const docData = querySnapshot.docs[0].data();
            const lastId = docData.processedServers[serverName] || 0;
            console.log(`[LOG] Último ID de partida processado encontrado para ${serverName}: ${lastId}`);
            return lastId;
        }
    } catch (error) {
        console.error(`Erro ao buscar último ID para ${serverName} (pode ser a primeira vez, isso é normal):`, error);
    }
    
    console.log(`[LOG] Nenhuma partida processada encontrada para '${serverName}'. A importação começará do início.`);
    return 0;
}


export async function getServerImportStatus(): Promise<Record<string, number>> {
    console.log(`[LOG] Buscando status de importação para todos os servidores.`);
    const status: Record<string, number> = {};

    for (const server of serversConfig) {
       status[server.name] = await getLastImportedMatchId(server.name);
    }
    console.log('[LOG] Status de importação por servidor:', status);
    return status;
}

export async function getPlayerCount(): Promise<number> {
    try {
        const aggregatesRef = collection(db, 'playerAggregates');
        const querySnapshot = await getDocs(aggregatesRef);
        return querySnapshot.size;
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
    
    const lastImportedId = await getLastImportedMatchId(serverName);
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
    const loopLimit = Math.min(matchIdsToImport.length, 500);
    console.log(`[LOG] Iniciando loop de importação para as próximas ${loopLimit} partidas (do ID ${matchIdsToImport[0]} ao ID ${matchIdsToImport[loopLimit - 1]}).`);

    for (let i = 0; i < loopLimit; i++) {
      const matchId = matchIdsToImport[i];
      try {
        await delay(200); 
        
        const mapUrl = `${apiUrl}/get_map_scoreboard?map_id=${matchId}`;
        console.log(`[LOG] Processando partida ${i + 1} de ${loopLimit} (ID: ${matchId}). URL: ${mapUrl}`);

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
