export type Position = { r: number; c: number };

export function canMoveDown(r: number, c: number, hWalls: (number | null)[][]) {
  if (r >= 8) return false;
  if (hWalls[r] && hWalls[r][c]) return false;
  if (c > 0 && hWalls[r] && hWalls[r][c - 1]) return false;
  return true;
}

export function canMoveUp(r: number, c: number, hWalls: (number | null)[][]) {
  if (r <= 0) return false;
  return canMoveDown(r - 1, c, hWalls);
}

export function canMoveRight(r: number, c: number, vWalls: (number | null)[][]) {
  if (c >= 8) return false;
  if (r < 8 && vWalls[r] && vWalls[r][c]) return false;
  if (r > 0 && vWalls[r - 1] && vWalls[r - 1][c]) return false;
  return true;
}

export function canMoveLeft(r: number, c: number, vWalls: (number | null)[][]) {
  if (c <= 0) return false;
  return canMoveRight(r, c - 1, vWalls);
}

export function getValidMoves(
  pos: Position,
  oppPos: Position,
  hWalls: (number | null)[][],
  vWalls: (number | null)[][]
): Position[] {
  const moves: Position[] = [];

  const addMove = (nr: number, nc: number) => {
    moves.push({ r: nr, c: nc });
  };

  // Up
  if (canMoveUp(pos.r, pos.c, hWalls)) {
    if (oppPos.r === pos.r - 1 && oppPos.c === pos.c) {
      if (canMoveUp(oppPos.r, oppPos.c, hWalls)) {
        addMove(oppPos.r - 1, oppPos.c);
      } else {
        if (canMoveLeft(oppPos.r, oppPos.c, vWalls)) addMove(oppPos.r, oppPos.c - 1);
        if (canMoveRight(oppPos.r, oppPos.c, vWalls)) addMove(oppPos.r, oppPos.c + 1);
      }
    } else {
      addMove(pos.r - 1, pos.c);
    }
  }

  // Down
  if (canMoveDown(pos.r, pos.c, hWalls)) {
    if (oppPos.r === pos.r + 1 && oppPos.c === pos.c) {
      if (canMoveDown(oppPos.r, oppPos.c, hWalls)) {
        addMove(oppPos.r + 1, oppPos.c);
      } else {
        if (canMoveLeft(oppPos.r, oppPos.c, vWalls)) addMove(oppPos.r, oppPos.c - 1);
        if (canMoveRight(oppPos.r, oppPos.c, vWalls)) addMove(oppPos.r, oppPos.c + 1);
      }
    } else {
      addMove(pos.r + 1, pos.c);
    }
  }

  // Left
  if (canMoveLeft(pos.r, pos.c, vWalls)) {
    if (oppPos.r === pos.r && oppPos.c === pos.c - 1) {
      if (canMoveLeft(oppPos.r, oppPos.c, vWalls)) {
        addMove(oppPos.r, oppPos.c - 1);
      } else {
        if (canMoveUp(oppPos.r, oppPos.c, hWalls)) addMove(oppPos.r - 1, oppPos.c);
        if (canMoveDown(oppPos.r, oppPos.c, hWalls)) addMove(oppPos.r + 1, oppPos.c);
      }
    } else {
      addMove(pos.r, pos.c - 1);
    }
  }

  // Right
  if (canMoveRight(pos.r, pos.c, vWalls)) {
    if (oppPos.r === pos.r && oppPos.c === pos.c + 1) {
      if (canMoveRight(oppPos.r, oppPos.c, vWalls)) {
        addMove(oppPos.r, oppPos.c + 1);
      } else {
        if (canMoveUp(oppPos.r, oppPos.c, hWalls)) addMove(oppPos.r - 1, oppPos.c);
        if (canMoveDown(oppPos.r, oppPos.c, hWalls)) addMove(oppPos.r + 1, oppPos.c);
      }
    } else {
      addMove(pos.r, pos.c + 1);
    }
  }

  return moves;
}

export function isReachable(
  start: Position,
  targetRow: number,
  hWalls: (number | null)[][],
  vWalls: (number | null)[][]
): boolean {
  const visited = Array(9)
    .fill(0)
    .map(() => Array(9).fill(false));
  const queue: Position[] = [start];
  visited[start.r][start.c] = true;

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    if (curr.r === targetRow) return true;

    if (canMoveUp(curr.r, curr.c, hWalls) && !visited[curr.r - 1][curr.c]) {
      visited[curr.r - 1][curr.c] = true;
      queue.push({ r: curr.r - 1, c: curr.c });
    }
    if (canMoveDown(curr.r, curr.c, hWalls) && !visited[curr.r + 1][curr.c]) {
      visited[curr.r + 1][curr.c] = true;
      queue.push({ r: curr.r + 1, c: curr.c });
    }
    if (canMoveLeft(curr.r, curr.c, vWalls) && !visited[curr.r][curr.c - 1]) {
      visited[curr.r][curr.c - 1] = true;
      queue.push({ r: curr.r, c: curr.c - 1 });
    }
    if (canMoveRight(curr.r, curr.c, vWalls) && !visited[curr.r][curr.c + 1]) {
      visited[curr.r][curr.c + 1] = true;
      queue.push({ r: curr.r, c: curr.c + 1 });
    }
  }
  return false;
}

export function getShortestPathLength(
  start: Position,
  targetRow: number,
  hWalls: (number | null)[][],
  vWalls: (number | null)[][]
): number {
  const visited = Array(9)
    .fill(0)
    .map(() => Array(9).fill(false));
  const queue: { pos: Position; dist: number }[] = [{ pos: start, dist: 0 }];
  visited[start.r][start.c] = true;

  let head = 0;
  while (head < queue.length) {
    const { pos: curr, dist } = queue[head++];
    if (curr.r === targetRow) return dist;

    if (canMoveUp(curr.r, curr.c, hWalls) && !visited[curr.r - 1][curr.c]) {
      visited[curr.r - 1][curr.c] = true;
      queue.push({ pos: { r: curr.r - 1, c: curr.c }, dist: dist + 1 });
    }
    if (canMoveDown(curr.r, curr.c, hWalls) && !visited[curr.r + 1][curr.c]) {
      visited[curr.r + 1][curr.c] = true;
      queue.push({ pos: { r: curr.r + 1, c: curr.c }, dist: dist + 1 });
    }
    if (canMoveLeft(curr.r, curr.c, vWalls) && !visited[curr.r][curr.c - 1]) {
      visited[curr.r][curr.c - 1] = true;
      queue.push({ pos: { r: curr.r, c: curr.c - 1 }, dist: dist + 1 });
    }
    if (canMoveRight(curr.r, curr.c, vWalls) && !visited[curr.r][curr.c + 1]) {
      visited[curr.r][curr.c + 1] = true;
      queue.push({ pos: { r: curr.r, c: curr.c + 1 }, dist: dist + 1 });
    }
  }
  return Infinity;
}

export function canPlaceWall(
  r: number,
  c: number,
  dir: 'H' | 'V',
  hWalls: (number | null)[][],
  vWalls: (number | null)[][],
  p1Pos: Position,
  p2Pos: Position
): boolean {
  // Check bounds
  if (r < 0 || r >= 8 || c < 0 || c >= 8) return false;

  // Check overlap
  if (dir === 'H') {
    if (hWalls[r][c]) return false;
    if (c > 0 && hWalls[r][c - 1]) return false;
    if (c < 7 && hWalls[r][c + 1]) return false;
    if (vWalls[r][c]) return false;
  } else {
    if (vWalls[r][c]) return false;
    if (r > 0 && vWalls[r - 1][c]) return false;
    if (r < 7 && vWalls[r + 1][c]) return false;
    if (hWalls[r][c]) return false;
  }

  // Clone walls and place temporarily
  const newHWalls = hWalls.map((row) => [...row]);
  const newVWalls = vWalls.map((row) => [...row]);
  if (dir === 'H') newHWalls[r][c] = 1;
  else newVWalls[r][c] = 1;

  // Check reachability for both players
  if (!isReachable(p1Pos, 8, newHWalls, newVWalls)) return false;
  if (!isReachable(p2Pos, 0, newHWalls, newVWalls)) return false;

  return true;
}
