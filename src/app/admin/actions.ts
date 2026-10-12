'use server';

import { db } from '@/firebase/server';
import { collection, writeBatch, doc, query, getDocs, where, getCountFromServer, orderBy, limit, setDoc, getDoc, serverTimestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { analyzeMatch } from '@/ai/flows/analyze-match-flow';

export interface ServerConfig {
  id: string; // The doc ID in Firestore
  name: string;
  apiUrl: string;
}

// ---------------------------------------------------------
// 1. GERENCIAMENTO DE SERVIDORES
// ---------------------------------------------------------
export async function getServersConfig(): Promise<ServerConfig[]> {
    try {
        const snap = await getDocs(collection(db, 'serversConfig'));
        if (snap.empty) {
            // Default servers fallback Se a coleção estiver vazia
            return [
               { id: 'HRB', name: 'HRB', apiUrl: 'https://hrb-stats.hlladmin.com/api' }
            ];
        }
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as ServerConfig));
    } catch (e) {
        console.error("Erro ao buscar configurações de servidores:", e);
        return [];
    }
}

export async function addServerConfig(name: string, apiUrl: string) {
    try {
        const docRef = doc(collection(db, 'serversConfig'));
        await setDoc(docRef, { name, apiUrl });
        return { success: true };
    } catch(e: any) { return { success: false, error: e.message }; }
}

export async function removeServerConfig(id: string) {
    try {
        await deleteDoc(doc(db, 'serversConfig', id));
        return { success: true };
    } catch(e: any) { return { success: false, error: e.message }; }
}

// ---------------------------------------------------------
// 2. SINCRONIZAÇÃO INTELIGENTE POR DATA
// ---------------------------------------------------------
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getServerSyncStatus(): Promise<Record<string, { processed: number; total: number }>> {
    const status: Record<string, { processed: number; total: number }> = {};
    const servers = await getServersConfig();
    
    for (const server of servers) {
        try {
            const syncStatusRef = doc(db, 'serverSyncStatus', server.name);
            const docSnap = await getDoc(syncStatusRef);
            let processed = 0;
            if (docSnap.exists()) {
                const data = docSnap.data();
                processed = data.processedIds ? data.processedIds.length : 0;
            }
            
            // Tenta pegar o total da API
            let total = 0;
            try {
                const res = await fetch(`${server.apiUrl}/get_scoreboard_maps?page=1&limit=1`, { headers: { 'Content-Type': 'application/json' }});
                if (res.ok) {
                    const data = await res.json();
                    total = data.result?.total || 0;
                }
            } catch(e) {}
            
            status[server.name] = { processed, total };
        } catch (error) {
            status[server.name] = { processed: 0, total: 0 };
        }
    }
    return status;
}

export async function importServerDataByDate(serverName: string, apiUrl: string, months = 3) {
    console.log(`[LOG] Sincronização Inteligente (últimos ${months} meses) iniciada para ${serverName}`);
    try {
        const syncStatusRef = doc(db, 'serverSyncStatus', serverName);
        const docSnap = await getDoc(syncStatusRef);
        let processedIds: number[] = [];
        if (docSnap.exists() && docSnap.data().processedIds) {
            processedIds = docSnap.data().processedIds;
        }

        const fetchOptions = { headers: { 'Content-Type': 'application/json' } };
        let currentPage = 1;
        let matchesProcessed = 0;
        let keepFetching = true;
        
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);
        console.log(`[LOG] Data limite: ${cutoffDate.toISOString()}`);

        while (keepFetching) {
            const url = `${apiUrl}/get_scoreboard_maps?page=${currentPage}&limit=50`;
            console.log(`[LOG] Buscando página ${currentPage}...`);
            const response = await fetch(url, fetchOptions);

            if (!response.ok) {
                console.error(`Falha ao buscar página ${currentPage}. Status: ${response.status}`);
                break;
            }

            const data = await response.json();
            const maps = data.result?.maps || [];
            
            if (maps.length === 0) {
                console.log("[LOG] Nenhuma partida retornada na página. Parando busca.");
                break;
            }

            let allOlder = true;

            for (const m of maps) {
                const matchId = m.id;
                const matchEndDate = new Date(m.end);
                
                if (matchEndDate >= cutoffDate) {
                    allOlder = false;
                    
                    const matchDurationMins = (matchEndDate.getTime() - new Date(m.start).getTime()) / 60000;
                    
                    if (!processedIds.includes(matchId)) {
                        if (matchDurationMins < 15) {
                            console.log(`[LOG] Partida ${matchId} ignorada por ser inválida/muito curta (${Math.round(matchDurationMins)} min).`);
                            continue;
                        }

                        try {
                            await delay(250);
                            const mapUrl = `${apiUrl}/get_map_scoreboard?map_id=${matchId}`;
                            const mapResponse = await fetch(mapUrl, fetchOptions);
                            if (mapResponse.ok) {
                                const mapData = await mapResponse.json();
                                const matchInfo = mapData.result;
                                if (matchInfo && matchInfo.player_stats) {
                                    
                                    const totalPlayers = matchInfo.player_stats.length;
                                    const totalKills = matchInfo.player_stats.reduce((acc: number, p: any) => acc + (p.kills || 0), 0);

                                    if (totalPlayers < 40 || totalKills < 50) {
                                        console.log(`[LOG] Partida ID ${matchId} de ${serverName} descartada por seeding (Jogadores: ${totalPlayers}, Kills: ${totalKills}).`);
                                        processedIds.push(matchId);
                                        continue;
                                    }

                                    // Function to clean __ fields
                                    const cleanFirestoreData = (data: any): any => {
                                        if (data === null || typeof data !== 'object') return data;
                                        if (Array.isArray(data)) return data.map(cleanFirestoreData);
                                        const cleaned: any = {};
                                        for (const [key, value] of Object.entries(data)) {
                                            if (key.startsWith('__') && key.endsWith('__')) continue;
                                            cleaned[key] = cleanFirestoreData(value);
                                        }
                                        return cleaned;
                                    };

                                    const cleanedMatchInfo = cleanFirestoreData(matchInfo);

                                    const matchDocRef = doc(db, 'rawMatchResults', matchInfo.id.toString());
                                    await setDoc(matchDocRef, { ...cleanedMatchInfo, numeric_id: matchInfo.id, server: serverName });
                                    
                                    processedIds.push(matchId);
                                    matchesProcessed++;
                                    console.log(`[LOG] Partida ${matchId} (Data: ${matchEndDate.toISOString()}) importada com sucesso.`);
                                } else {
                                    console.log(`[LOG] Partida ${matchId} ignorada por falta de jogadores válidos.`);
                                }
                            }
                        } catch (err: any) {
                            console.error(`[ERRO] Falha ao processar a partida ${matchId}:`, err.message);
                            // We don't push to processedIds so we can try again later
                        }
                    }
                }
            }

            if (allOlder) {
                console.log("[LOG] Todas as partidas da página são mais antigas que o limite. Parando busca.");
                keepFetching = false;
            } else {
                currentPage++;
                await delay(200);
            }
        }

        // Save updated processed IDs
        await setDoc(syncStatusRef, { 
            processedIds,
            serverName,
            lastChecked: serverTimestamp()
        }, { merge: true });

        console.log(`[LOG FINAL] Sincronização concluída para ${serverName}. Novas importadas: ${matchesProcessed}.`);
        return { success: true, matchesProcessed };
    } catch(e: any) {
        console.error('[ERRO GERAL]', e);
        return { success: false, error: e.message };
    }
}

// ---------------------------------------------------------
// 3. ESTATÍSTICAS GLOBAIS E PUBLICAÇÃO
// ---------------------------------------------------------
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
    }

    const globalStatsRef = doc(db, 'globalStats', 'summary');
    await setDoc(globalStatsRef, maxStats, { merge: true });

    return { success: true, maxStats };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function runMatchAnalysisAction(matchJson: string, factionFilter: 'all' | 'axis' | 'allies' = 'all'): Promise<{ success: boolean; report?: string; error?: string }> {
  try {
    const report = await analyzeMatch({ matchJson, factionFilter });
    return { success: true, report };
  } catch (error: any) {
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
    return { success: false, error: error.message || 'Falha ao publicar na Caserna.' };
  }
}
