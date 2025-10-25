'use server';

import { db } from '@/firebase/server';
import { collection, writeBatch, doc } from 'firebase/firestore';

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
  console.log(`[LOG INICIAL] Função importServerData iniciada.`);
  console.log(`[LOG INICIAL] Recebido serverName: ${serverName}, apiUrl: ${apiUrl}`);
  
  try {
    const fetchOptions = {
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    // 1. Obter o número total de partidas e a lista de IDs
    const totalMapsUrl = `${apiUrl}/get_scoreboard_maps`;
    console.log(`Buscando total de mapas de: ${totalMapsUrl}`);
    const totalMapsResponse = await fetch(totalMapsUrl, fetchOptions);

    if (!totalMapsResponse.ok) {
        const errorText = await totalMapsResponse.text();
        console.error(`Falha ao buscar total de mapas. Status: ${totalMapsResponse.status}, Corpo: ${errorText}`);
        throw new Error(`Falha ao buscar o total de mapas: ${totalMapsResponse.statusText} - ${errorText}`);
    }

    const totalMapsData: ScoreboardMapsResponse = await totalMapsResponse.json();
    const totalMatches = totalMapsData.result.total;
    const matchIds = totalMapsData.result.maps.map(m => m.id);
    console.log(`Total de partidas encontradas: ${totalMatches}`);


    let matchesProcessed = 0;

    // Limita a 10 para teste inicial
    const loopLimit = Math.min(matchIds.length, 10);
    console.log(`Iniciando loop de importação para as primeiras ${loopLimit} partidas.`);

    for (let i = 0; i < loopLimit; i++) {
      const matchId = matchIds[i];
      try {
        await delay(200); // Adiciona um delay para não sobrecarregar a API
        
        const mapUrl = `${apiUrl}/get_map_scoreboard?map_id=${matchId}`;
        console.log(`Buscando dados da partida de: ${mapUrl}`);
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

        // 2. Salvar dados da partida na subcoleção do servidor
        const matchDocRef = doc(db, 'servers', serverName, 'matches', matchInfo.id.toString());
        batch.set(matchDocRef, matchInfo); // Salva o objeto inteiro da partida

        // 3. Salvar dados dos jogadores e estatísticas da partida
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
                // Adicione outros campos de stats se disponíveis
            });
        }
        
        await batch.commit();
        matchesProcessed++;
        
        console.log(`Processando partida ${i + 1} de ${loopLimit} (ID: ${matchId})...`);

      } catch (innerError: any) {
        console.error(`Erro processando partida ID ${matchId}:`, innerError.message);
        // Continua para a próxima partida mesmo se uma falhar
      }
    }


    return { success: true, matchesProcessed, totalFound: totalMatches };
  } catch (error: any) {
    console.error('Erro na importação de dados do servidor:', error);
    return { success: false, error: error.message };
  }
}
