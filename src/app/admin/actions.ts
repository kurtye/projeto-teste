'use server';

import { db } from '@/firebase/server';
import { collection, writeBatch, doc, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface ScoreboardMapsResponse {
  result: {
    total: number;
    maps: { id: number }[];
  };
}

// Interface para o objeto de partida retornado pela API
interface MatchDetails {
    id: number;
    creation_time: string;
    start: string;
    end: string;
    server_number: number;
    map_name: string;
    player_stats: PlayerStats[];
    // Incluímos todos os outros campos que podem vir no objeto
    [key: string]: any;
}

interface MapScoreboardResponse {
  result: MatchDetails;
}


interface PlayerStats {
    steam_id_64: string;
    name: string;
    kills: number;
    deaths: number;
    // Adicione outros campos que você precisar
}

// Função para fazer uma pausa
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    
    // 1. Obter o último ID de partida salvo para este servidor
    const matchesRef = collection(db, 'servers', serverName, 'matches');
    const q = query(matchesRef, orderBy('numeric_id', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    
    let lastImportedId = 0;
    if (!querySnapshot.empty) {
      lastImportedId = querySnapshot.docs[0].data().numeric_id;
    }
    console.log(`Último ID de partida importado para ${serverName}: ${lastImportedId}`);


    // 2. Obter a lista completa de IDs de partidas da API
    const totalMapsUrl = `${apiUrl}/get_scoreboard_maps`;
    console.log(`Buscando lista de partidas de: ${totalMapsUrl}`);
    const totalMapsResponse = await fetch(totalMapsUrl, fetchOptions);

    if (!totalMapsResponse.ok) {
        const errorText = await totalMapsResponse.text();
        console.error(`Falha ao buscar lista de mapas. Status: ${totalMapsResponse.status}, Corpo: ${errorText}`);
        throw new Error(`Falha ao buscar a lista de mapas: ${totalMapsResponse.statusText} - ${errorText}`);
    }

    const totalMapsData: ScoreboardMapsResponse = await totalMapsResponse.json();
    const allMatchIds = totalMapsData.result.maps.map(m => m.id);
    const totalMatchesApi = totalMapsData.result.total;
    
    // 3. Filtrar para obter apenas os IDs de partidas que ainda não foram importados
    const matchIdsToImport = allMatchIds.filter(id => id > lastImportedId);
    console.log(`Total de partidas na API: ${totalMatchesApi}. Novas partidas a importar: ${matchIdsToImport.length}`);

    if (matchIdsToImport.length === 0) {
      return { success: true, matchesProcessed: 0, totalFound: totalMatchesApi };
    }

    let matchesProcessed = 0;

    // Limita a 500 por execução
    const loopLimit = Math.min(matchIdsToImport.length, 500);
    console.log(`Iniciando loop de importação para as próximas ${loopLimit} partidas.`);

    for (let i = 0; i < loopLimit; i++) {
      const matchId = matchIdsToImport[i];
      try {
        await delay(200); // Adiciona um delay para não sobrecarregar a API
        
        const mapUrl = `${apiUrl}/get_map_scoreboard?map_id=${matchId}`;
        
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

        // 4. Salvar dados da partida na subcoleção do servidor
        const matchDocRef = doc(db, 'servers', serverName, 'matches', matchInfo.id.toString());
        // Adicionamos o `numeric_id` para facilitar a ordenação
        batch.set(matchDocRef, { ...matchInfo, numeric_id: matchInfo.id });

        // 5. Salvar dados dos jogadores e estatísticas da partida
        for (const playerStat of matchInfo.player_stats) {
            const playerId = playerStat.steam_id_64;
            // Pular jogadores sem steamId
            if (!playerId) continue;

            const playerDocRef = doc(db, 'players', playerId);
            const playerMatchStatsDocRef = doc(collection(db, 'player_match_stats'));

            // Salva/Atualiza dados do jogador (coleção global)
            batch.set(playerDocRef, {
                id: playerId,
                playerName: playerStat.name,
                steamId: playerId,
            }, { merge: true });

            // Salva estatísticas da partida (coleção global para facilitar queries)
            batch.set(playerMatchStatsDocRef, {
                id: playerMatchStatsDocRef.id,
                playerId: playerId,
                matchId: matchInfo.id.toString(),
                server: serverName, // Adiciona o nome do servidor para referência
                kills: playerStat.kills,
                deaths: playerStat.deaths,
                kdRatio: playerStat.deaths > 0 ? playerStat.kills / playerStat.deaths : playerStat.kills,
            });
        }
        
        await batch.commit();
        matchesProcessed++;
        
        console.log(`Processando partida ${i + 1} de ${loopLimit} (ID: ${matchId})...`);

      } catch (innerError: any) {
        console.error(`Erro processando partida ID ${matchId}:`, innerError.message);
      }
    }


    return { success: true, matchesProcessed, totalFound: totalMatchesApi };
  } catch (error: any) {
    console.error('Erro na importação de dados do servidor:', error);
    return { success: false, error: error.message };
  }
}
