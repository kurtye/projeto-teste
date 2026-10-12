const fs = require('fs');
let code = fs.readFileSync('/Users/user/Projetos/hll-community/hll/src/app/cloud-function-code.txt', 'utf8');

// Fix no-multiple-empty-lines
code = code.replace(/\n\n\n+/g, '\n\n');

// Fix line 159 max-len
code = code.replace('timePlayedByRole[currentUnit.role] = (timePlayedByRole[currentUnit.role] || 0) + duration;', 
  'timePlayedByRole[currentUnit.role] =\n              (timePlayedByRole[currentUnit.role] || 0) + duration;');

// Fix line 172 max-len
code = code.replace('const newMonthlyRef = db.collection("monthly_player_stats").doc(newMonthlyDocId);',
  'const newMonthlyRef = db.collection("monthly_player_stats")\n                .doc(newMonthlyDocId);');

// Fix object-curly-spacing & max-len for spread objects
code = code.replace('const mergedRoles = { ...(currentMonthly.timePlayedByRole || {}) };', 'const mergedRoles = {...(currentMonthly.timePlayedByRole || {})};');
code = code.replace('const mergedWeapons = { ...(currentMonthly.topWeapons || {}) };', 'const mergedWeapons = {...(currentMonthly.topWeapons || {})};');
code = code.replace('const mergedVictims = { ...(currentMonthly.topVictims || {}) };', 'const mergedVictims = {...(currentMonthly.topVictims || {})};');
code = code.replace('const mergedAlgozes = { ...(currentMonthly.topKilledBy || {}) };', 'const mergedAlgozes = {...(currentMonthly.topKilledBy || {})};');

// Fix loops max-len
code = code.replace('for (const [weapon, count] of Object.entries(playerStat.weapons || {})) {',
  'for (const [weapon, count] of Object.entries(\n                playerStat.weapons || {}\n              )) {');
code = code.replace('for (const [victim, count] of Object.entries(playerStat.most_killed || {})) {',
  'for (const [victim, count] of Object.entries(\n                playerStat.most_killed || {}\n              )) {');
code = code.replace('for (const [algoz, count] of Object.entries(playerStat.death_by || {})) {',
  'for (const [algoz, count] of Object.entries(\n                playerStat.death_by || {}\n              )) {');

// Fix Math.max max-len
code = code.replace('const newMaxStreak = Math.max(currentMonthly.maxKillsStreak || 0, playerStat.kills_streak || 0);',
  'const newMaxStreak = Math.max(\n                currentMonthly.maxKillsStreak || 0,\n                playerStat.kills_streak || 0\n              );');
code = code.replace('const newLongestLifeMensal = Math.max(currentMonthly.longestLifeSecs || 0, playerStat.longest_life_secs || 0);',
  'const newLongestLifeMensal = Math.max(\n                currentMonthly.longestLifeSecs || 0,\n                playerStat.longest_life_secs || 0\n              );');

// Fix transaction.set
code = code.replace('transaction.set(newMonthlyRef, monthlyUpdates, {merge: true});',
  'transaction.set(newMonthlyRef, monthlyUpdates, {merge: true});');

// Fix new monthly updates max-len on Vehicles and Sync check
code = code.replace('totalVehiclesDestroyed: increment(playerStat.vehicles_destroyed || 0),',
  'totalVehiclesDestroyed: increment(\n                  playerStat.vehicles_destroyed || 0\n                ),');
  
code = code.replace('logger.info(`[SYNC] Partida ID ${matchId} de ${server.name} descartada por seeding (Jogadores: ${totalPlayers}, Kills: ${totalKills}).`);',
  'logger.info(`[SYNC] Partida ID ${matchId} de ${server.name} ` +\n              `descartada por seeding (Jogadores: ${totalPlayers}, ` +\n              `Kills: ${totalKills}).`);');

fs.writeFileSync('/Users/user/Projetos/hll-community/hll/src/app/cloud-function-code.txt', code);
