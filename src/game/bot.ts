import { Position, getValidMoves, canPlaceWall, getShortestPathLength } from './logic';

export function getBotAction(
  botPos: Position,
  oppPos: Position,
  botWalls: number,
  hWalls: (number | null)[][],
  vWalls: (number | null)[][],
  botTargetRow: number,
  botPlayerId: 1 | 2,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): { type: 'move'; pos: Position } | { type: 'wall'; dir: 'H' | 'V'; r: number; c: number } | null {
  const validMoves = getValidMoves(botPos, oppPos, hWalls, vWalls);
  if (validMoves.length === 0) return null;

  const oppTargetRow = botTargetRow === 0 ? 8 : 0;
  
  if (difficulty === 'hard') {
    const currentBotDist = getShortestPathLength(botPos, botTargetRow, hWalls, vWalls);
    const currentOppDist = getShortestPathLength(oppPos, oppTargetRow, hWalls, vWalls);

    let bestAction: any = null;
    let bestAdvantage = -Infinity;
    
    // Evaluate all possible moves
    for (const move of validMoves) {
      const dist = getShortestPathLength(move, botTargetRow, hWalls, vWalls);
      const advantage = currentOppDist - dist;
      
      // Tie-breaker: minor randomness to prevent completely deterministic stalling
      const tieBreaker = Math.random() * 0.1; 
      
      if (advantage + tieBreaker > bestAdvantage) {
        bestAdvantage = advantage + tieBreaker;
        bestAction = { type: 'move', pos: move };
      }
    }

    // Evaluate wall placements - only search near opponent to save performance
    if (botWalls > 0 && currentOppDist <= currentBotDist + 3) {
      const rStart = Math.max(0, oppPos.r - 2);
      const rEnd = Math.min(8, oppPos.r + 3);
      const cStart = Math.max(0, oppPos.c - 2);
      const cEnd = Math.min(8, oppPos.c + 3);

      for (let r = rStart; r < rEnd; r++) {
         for (let c = cStart; c < cEnd; c++) {
           for (const dir of ['H', 'V'] as ('H'|'V')[]) {
             if (canPlaceWall(r, c, dir, hWalls, vWalls, botPlayerId === 1 ? botPos : oppPos, botPlayerId === 2 ? botPos : oppPos)) {
               const newH = hWalls.map(row => [...row]);
               const newV = vWalls.map(row => [...row]);
               if (dir === 'H') newH[r][c] = botPlayerId;
               else newV[r][c] = botPlayerId;

               const testBotDist = getShortestPathLength(botPos, botTargetRow, newH, newV);
               const testOppDist = getShortestPathLength(oppPos, oppTargetRow, newH, newV);

               const advantage = testOppDist - testBotDist;
               
               // To place a wall, it must tangibly improve our situation compared to just moving
               // and specifically it must delay them
               if (advantage > bestAdvantage && testOppDist > currentOppDist) {
                 // Weight wall placement: we favor walls that significantly increase opp dist
                 const wallScore = advantage + (testOppDist - currentOppDist) * 0.5;
                 if (wallScore > bestAdvantage + 0.3) {
                   bestAdvantage = wallScore;
                   bestAction = { type: 'wall', dir, r, c };
                 }
               }
             }
           }
         }
      }
    }
    
    if (bestAction) return bestAction;
  }

  // --- Medium and Easy modes fallback ---
  
  // Decide wall placement chance based on difficulty
  let wallChance = 0;
  if (difficulty === 'easy') wallChance = 0.05;
  else if (difficulty === 'medium') wallChance = 0.20;

  if (botWalls > 0 && Math.random() < wallChance) {
    const oppDist = getShortestPathLength(oppPos, oppTargetRow, hWalls, vWalls);
    const botDist = getShortestPathLength(botPos, botTargetRow, hWalls, vWalls);
    
    // Only place walls if they are ahead or tied
    if (botDist >= oppDist - 1) {
      const r = botPlayerId === 2 ? oppPos.r + 1 : oppPos.r - 1; 
      if (r >= 0 && r < 8) {
        const c = oppPos.c;
        const dirs: ('H' | 'V')[] = Math.random() > 0.5 ? ['H', 'V'] : ['V', 'H'];
        
        for (const dir of dirs) {
          for (const col of [c, Math.max(0, c - 1)]) {
            if (canPlaceWall(r, col, dir, hWalls, vWalls, botPlayerId === 1 ? botPos : oppPos, botPlayerId === 2 ? botPos : oppPos)) {
               return { type: 'wall', dir, r, c: col };
            }
          }
        }
      }
    }
  }

  // Find the best move towards target
  let bestMove = validMoves[0];
  let minDistance = Infinity;

  // Easy mode: occasional random moves
  if (difficulty === 'easy' && Math.random() < 0.3) {
    return { type: 'move', pos: validMoves[Math.floor(Math.random() * validMoves.length)] };
  }

  for (const move of validMoves) {
    let dist = getShortestPathLength(move, botTargetRow, hWalls, vWalls);
    
    if (difficulty === 'easy' && Math.random() < 0.2) {
      dist += Math.floor(Math.random() * 3);
    }
    
    const colDist = Math.abs(move.c - botPos.c);
    
    if (dist < minDistance || (dist === minDistance && Math.random() > 0.5 && colDist > 0)) {
       minDistance = dist;
       bestMove = move;
    }
  }

  return { type: 'move', pos: bestMove };
}
