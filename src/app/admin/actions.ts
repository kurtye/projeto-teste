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
    start_time: string; // "YYYY-MM-DD HH:mm:ss"
    end_time: string; // "YYYY-MM-DD HH:mm:ss"
    player_stats: PlayerStats[];
    // Adicione outros campos da partida que você precisar
  }
}

// Função para fazer uma pausa
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function importServerData(
  apiUrl: string,
  onProgress: (progress: number, message: string) => void
): Promise<{ success: boolean; matchesProcessed?: number; error?: string }> {
  try {
    console.log(`Iniciando importação para: ${apiUrl}`);
    onProgress(0, `Buscando total de partidas de ${apiUrl}...`);
    
    // 1. Obter o número total de partidas
    const totalMapsResponse = await fetch(`${apiUrl}/get_scoreboard_maps`);
    if (!totalMapsResponse.ok) {
        throw new Error(`Falha ao buscar o total de mapas: ${totalMapsResponse.statusText}`);
    }
    const totalMapsData: ScoreboardMapsResponse = await totalMapsResponse.json();
    const totalMatches = totalMapsData.result.total;
    console.log(`Total de partidas encontradas: ${totalMatches}`);
    onProgress(5, `Encontrado um total de ${totalMatches} partidas. Iniciando busca...`);


    let matchesProcessed = 0;
    const batchSize = 100; // Processar em lotes de 100 para não sobrecarregar o Firestore

    for (let i = 0; i < totalMatches; i++) {
      try {
        await delay(100); // Adiciona um pequeno delay para não sobrecarregar a API de origem

        const mapResponse = await fetch(`${apiUrl}/get_map_scoreboard?map_id=${i}`);
        if (!mapResponse.ok) {
          console.warn(`Falha ao buscar partida ID ${i}. Status: ${mapResponse.statusText}. Pulando.`);
          continue;
        }

        const mapData: MapScoreboardResponse = await mapResponse.json();
        const matchInfo = mapData.result;

        if (!matchInfo || !matchInfo.player_stats) {
            console.warn(`Dados da partida ID ${i} estão incompletos. Pulando.`);
            continue;
        }

        const batch = writeBatch(db);

        // 2. Salvar dados da partida
        const matchDocRef = doc(db, 'matches', matchInfo.id.toString());
        const matchDuration = new Date(matchInfo.end_time).getTime() - new Date(matchInfo.start_time).getTime();
        batch.set(matchDocRef, {
            id: matchInfo.id.toString(),
            startTime: matchInfo.start_time,
            durationSeconds: Math.round(matchDuration / 1000),
        });

        // 3. Salvar dados dos jogadores e estatísticas da partida
        for (const playerStat of matchInfo.player_stats) {
            const playerId = playerStat.steam_id_64;
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
        
        const progress = (i + 1) / totalMatches * 100;
        onProgress(progress, `Processando partida ${i + 1} de ${totalMatches}...`);

      } catch (innerError: any) {
        console.error(`Erro processando partida ID ${i}:`, innerError.message);
        // Continua para a próxima partida mesmo se uma falhar
      }
    }


    return { success: true, matchesProcessed };
  } catch (error: any) {
    console.error('Erro na importação de dados do servidor:', error);
    return { success: false, error: error.message };
  }
}
