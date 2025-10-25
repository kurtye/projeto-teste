'use server';

import { db } from '@/firebase/server';
import { collection, writeBatch, doc } from 'firebase/firestore';

interface ScoreboardMapsResponse {
  result: {
    total: number;
  };
}

interface PlayerStats {
    steam_id_64: string;
    name: string;
    kills: number;
    deaths: number;
    // Adicione outros campos que você precisar
}

interface MapScoreboardResponse {
  result: {
    id: number;
    start: string; // "YYYY-MM-DD HH:mm:ss"
    end: string; // "YYYY-MM-DD HH:mm:ss"
    player_stats: PlayerStats[];
    // Adicione outros campos da partida que você precisar
  }
}

// Função para fazer uma pausa
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function importServerData(
  apiUrl: string
): Promise<{ success: boolean; matchesProcessed?: number; totalFound?: number; error?: string }> {
  console.log(`[LOG INICIAL] Função importServerData iniciada.`);
  console.log(`[LOG INICIAL] Recebido apiUrl: ${apiUrl}`);
  
  try {
    const fetchOptions = {
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    // 1. Obter o número total de partidas
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
    console.log(`Total de partidas encontradas: ${totalMatches}`);


    let matchesProcessed = 0;

    // Limita a 10 para teste inicial
    const loopLimit = Math.min(totalMatches, 10);
    console.log(`Iniciando loop de importação para as primeiras ${loopLimit} partidas.`);

    // Ajustado para começar de 1, como solicitado
    for (let i = 1; i <= loopLimit; i++) {
      try {
        await delay(200); // Adiciona um delay para não sobrecarregar a API
        
        const mapUrl = `${apiUrl}/get_map_scoreboard?map_id=${i}`;
        console.log(`Buscando dados da partida de: ${mapUrl}`);
        const mapResponse = await fetch(mapUrl, fetchOptions);

        if (!mapResponse.ok) {
          const errorText = await mapResponse.text();
          console.warn(`Falha ao buscar partida ID ${i}. Status: ${mapResponse.status}. Corpo: ${errorText}. Pulando.`);
          continue;
        }

        const mapData: MapScoreboardResponse = await mapResponse.json();
        const matchInfo = mapData.result;

        if (!matchInfo || !matchInfo.player_stats) {
            console.warn(`Dados da partida ID ${i} estão incompletos ou nulos. Pulando.`);
            continue;
        }

        const batch = writeBatch(db);

        // 2. Salvar dados da partida
        const matchDocRef = doc(db, 'matches', matchInfo.id.toString());
        const matchDuration = new Date(matchInfo.end).getTime() - new Date(matchInfo.start).getTime();
        batch.set(matchDocRef, {
            id: matchInfo.id.toString(),
            startTime: matchInfo.start,
            durationSeconds: Math.round(matchDuration / 1000),
        });

        // 3. Salvar dados dos jogadores e estatísticas da partida
        for (const playerStat of matchInfo.player_stats) {
            const playerId = playerStat.steam_id_64;
            // Pular jogadores sem steamId
            if (!playerId) continue;

            const playerDocRef = doc(db, 'players', playerId);
            const playerMatchStatsDocRef = doc(collection(db, 'player_match_stats'));

            // Salva/Atualiza dados do jogador
            batch.set(playerDocRef, {
                id: playerId,
                playerName: playerStat.name,
                steamId: playerId,
            }, { merge: true });

            // Salva estatísticas da partida
            batch.set(playerMatchStatsDocRef, {
                id: playerMatchStatsDocRef.id,
                playerId: playerId,
                matchId: matchInfo.id.toString(),
                kills: playerStat.kills,
                deaths: playerStat.deaths,
                kdRatio: playerStat.deaths > 0 ? playerStat.kills / playerStat.deaths : playerStat.kills,
                score: 0, // O score não está disponível, então definimos como 0
            });
        }
        
        await batch.commit();
        matchesProcessed++;
        
        console.log(`Processando partida ${i} de ${loopLimit}...`);

      } catch (innerError: any) {
        console.error(`Erro processando partida ID ${i}:`, innerError.message);
        // Continua para a próxima partida mesmo se uma falhar
      }
    }


    return { success: true, matchesProcessed, totalFound: totalMatches };
  } catch (error: any) {
    console.error('Erro na importação de dados do servidor:', error);
    return { success: false, error: error.message };
  }
}
