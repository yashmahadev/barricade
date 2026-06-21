import { useState, useEffect, useRef } from 'react';
import { canPlaceWall, getValidMoves, Position } from '../game/logic';
import { RotateCcw, Minus, BarChart2, X, Undo2, Home, Settings, History } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '../lib/audio';
import { getBotAction } from '../game/bot';
import { useNavigate } from 'react-router-dom';

type GameState = {
  p1Pos: Position;
  p2Pos: Position;
  p1Walls: number;
  p2Walls: number;
  hWalls: (number | null)[][];
  vWalls: (number | null)[][];
  turn: 1 | 2;
  history: string[];
};

export default function LocalGame() {
  const navigate = useNavigate();
  const [appState, setAppState] = useState<'menu' | 'game'>('menu');
  const [gameMode, setGameMode] = useState<'local' | 'bot'>('local');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('hard');
  const [timeLimit, setTimeLimit] = useState(30);
  const [initialWalls, setInitialWalls] = useState(10);
  const [p1Name, setP1Name] = useState('Player 1');
  const [p2Name, setP2Name] = useState('Player 2');

  const [turn, setTurn] = useState<1 | 2>(1);
  const [p1Pos, setP1Pos] = useState<Position>({ r: 0, c: 4 });
  const [p2Pos, setP2Pos] = useState<Position>({ r: 8, c: 4 });
  const [p1Walls, setP1Walls] = useState(10);
  const [p2Walls, setP2Walls] = useState(10);
  
  const [hWalls, setHWalls] = useState<(number | null)[][]>(Array(8).fill(null).map(() => Array(8).fill(null)));
  const [vWalls, setVWalls] = useState<(number | null)[][]>(Array(8).fill(null).map(() => Array(8).fill(null)));
  
  const [wallDirection, setWallDirection] = useState<'H' | 'V'>('H');
  const [hoverIntersect, setHoverIntersect] = useState<{r: number, c: number} | null>(null);
  const [selectedWall, setSelectedWall] = useState<{r: number, c: number} | null>(null);
  
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const historyEndRef = useRef<HTMLDivElement | null>(null);
  const [stats, setStats] = useState({ gamesPlayed: 0, p1Wins: 0, p2Wins: 0 });

  useEffect(() => {
    if (showHistory && historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history.length, showHistory]);
  const [timeLeft, setTimeLeft] = useState(30);

  const [undoStack, setUndoStack] = useState<GameState[]>([]);
  
  const currentStateRef = useRef<GameState>({ p1Pos, p2Pos, p1Walls, p2Walls, hWalls, vWalls, turn, history });
  
  useEffect(() => {
    currentStateRef.current = { p1Pos, p2Pos, p1Walls, p2Walls, hWalls, vWalls, turn, history };
  }, [p1Pos, p2Pos, p1Walls, p2Walls, hWalls, vWalls, turn, history]);

  const pushState = () => {
    const s = currentStateRef.current;
    setUndoStack(prev => [...prev, {
      p1Pos: s.p1Pos,
      p2Pos: s.p2Pos,
      p1Walls: s.p1Walls,
      p2Walls: s.p2Walls,
      hWalls: s.hWalls.map(row => [...row]),
      vWalls: s.vWalls.map(row => [...row]),
      turn: s.turn,
      history: [...s.history]
    }]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const lastState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    
    // If we are undoing from a won state, revert the statistics update
    if (winner !== null) {
      setStats(prev => {
        const nextStats = {
          gamesPlayed: Math.max(0, prev.gamesPlayed - 1),
          p1Wins: Math.max(0, prev.p1Wins - (winner === 1 ? 1 : 0)),
          p2Wins: Math.max(0, prev.p2Wins - (winner === 2 ? 1 : 0)),
        };
        localStorage.setItem('barricadeStats', JSON.stringify(nextStats));
        return nextStats;
      });
    }

    setP1Pos(lastState.p1Pos);
    setP2Pos(lastState.p2Pos);
    setP1Walls(lastState.p1Walls);
    setP2Walls(lastState.p2Walls);
    setHWalls(lastState.hWalls);
    setVWalls(lastState.vWalls);
    setTurn(lastState.turn);
    setHistory(lastState.history);
    setWinner(null);
    setTimeLeft(30);
  };

  useEffect(() => {
    const storedStats = localStorage.getItem('barricadeStats');
    if (storedStats) {
      try {
        setStats(JSON.parse(storedStats));
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }, []);

  const resetGame = () => {
    setTurn(1);
    setP1Pos({ r: 0, c: 4 });
    setP2Pos({ r: 8, c: 4 });
    setP1Walls(initialWalls);
    setP2Walls(initialWalls);
    setHWalls(Array(8).fill(null).map(() => Array(8).fill(null)));
    setVWalls(Array(8).fill(null).map(() => Array(8).fill(null)));
    setWinner(null);
    setWallDirection('H');
    setHistory([]);
    setTimeLeft(timeLimit);
    setUndoStack([]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setWallDirection(d => d === 'H' ? 'V' : 'H');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setSelectedWall(null);
  }, [turn]);

  useEffect(() => {
    if (winner) {
      setStats(prev => {
        const nextStats = {
          gamesPlayed: prev.gamesPlayed + 1,
          p1Wins: prev.p1Wins + (winner === 1 ? 1 : 0),
          p2Wins: prev.p2Wins + (winner === 2 ? 1 : 0),
        };
        localStorage.setItem('barricadeStats', JSON.stringify(nextStats));
        return nextStats;
      });
      const winnerName = winner === 1 ? p1Name : (gameMode === 'bot' && winner === 2 ? 'Computer' : p2Name);
      setHistory(h => [...h, `Game Over! ${winnerName} won.`]);
      playSound('win');

      const colors = winner === 1 ? ['#06b6d4', '#ffffff'] : ['#f59e0b', '#ffffff'];
      
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      
      frame();
    }
  }, [winner]);

  useEffect(() => {
    if (winner || timeLimit >= 999) return;
    setTimeLeft(timeLimit);
    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          pushState();
          const currentTurn = currentStateRef.current.turn;
          const turnName = currentTurn === 1 ? p1Name : (gameMode === 'bot' ? 'Computer' : p2Name);
          setHistory(h => [...h, `${turnName} ran out of time. Turn skipped.`]);
          playSound('error');
          setTurn(t => t === 1 ? 2 : 1);
          return timeLimit;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [turn, winner, timeLimit, appState]);

  // Bot Logic Effect
  useEffect(() => {
    if (appState === 'game' && gameMode === 'bot' && turn === 2 && !winner) {
      const timerId = setTimeout(() => {
        const action = getBotAction(p2Pos, p1Pos, p2Walls, hWalls, vWalls, 0, 2, difficulty);
        if (action) {
          if (action.type === 'move') {
            handleCellClick(action.pos.r, action.pos.c, true);
          } else if (action.type === 'wall') {
            handleWallClick(action.r, action.c, action.dir, true);
          }
        }
      }, 700);
      return () => clearTimeout(timerId);
    }
  }, [turn, appState, winner, gameMode, p2Pos, p1Pos, p2Walls, hWalls, vWalls, difficulty]);

  const currentPlayerPos = turn === 1 ? p1Pos : p2Pos;
  const currOpponentPos  = turn === 1 ? p2Pos : p1Pos;
  const currentPlayerWalls = turn === 1 ? p1Walls : p2Walls;

  const validMoves = winner ? [] : getValidMoves(currentPlayerPos, currOpponentPos, hWalls, vWalls);

  const handleCellClick = (r: number, c: number, isBot = false) => {
    if (winner) return;
    if (turn === 2 && gameMode === 'bot' && !isBot) return; // Prevent human from playing bot's turn
    
    const isValidMove = validMoves.some(m => m.r === r && m.c === c);
    if (!isValidMove) return;

    pushState();
    playSound('move');

    if (turn === 1) {
      setP1Pos({ r, c });
      setHistory(h => [...h, `${p1Name} moved to Row ${r + 1}, Col ${c + 1}`]);
      if (r === 8) setWinner(1);
      else setTurn(2);
    } else {
      setP2Pos({ r, c });
      const currentP2Name = gameMode === 'bot' ? 'Computer' : p2Name;
      setHistory(h => [...h, `${currentP2Name} moved to Row ${r + 1}, Col ${c + 1}`]);
      if (r === 0) setWinner(2);
      else setTurn(1);
    }
    setHoverIntersect(null);
  };

  const handleWallClick = (r: number, c: number, overrideDir?: 'H' | 'V', isBot = false) => {
    if (winner || currentPlayerWalls <= 0) return;
    if (turn === 2 && gameMode === 'bot' && !isBot) return;

    const dirToUse = overrideDir || wallDirection;

    if (canPlaceWall(r, c, dirToUse, hWalls, vWalls, p1Pos, p2Pos)) {
      pushState();
      playSound('wall');

      if (dirToUse === 'H') {
        const newH = hWalls.map(row => [...row]);
        newH[r][c] = turn;
        setHWalls(newH);
      } else {
        const newV = vWalls.map(row => [...row]);
        newV[r][c] = turn;
        setVWalls(newV);
      }
      
      if (turn === 1) {
         setP1Walls(w => w - 1);
         setHistory(h => [...h, `${p1Name} placed a ${dirToUse === 'H' ? 'Horizontal' : 'Vertical'} wall at Row ${r + 1}, Col ${c + 1}`]);
         setTurn(2);
      } else {
         setP2Walls(w => w - 1);
         const currentP2Name = gameMode === 'bot' ? 'Computer' : p2Name;
         setHistory(h => [...h, `${currentP2Name} placed a ${dirToUse === 'H' ? 'Horizontal' : 'Vertical'} wall at Row ${r + 1}, Col ${c + 1}`]);
         setTurn(1);
      }
      setHoverIntersect(null);
    }
  };

  const renderCells = () => {
    const elements = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const isP1 = p1Pos.r === r && p1Pos.c === c;
        const isP2 = p2Pos.r === r && p2Pos.c === c;
        const isValidMove = validMoves.some(m => m.r === r && m.c === c);
        const isActiveP1 = isP1 && turn === 1 && !winner;
        const isActiveP2 = isP2 && turn === 2 && !winner;

        elements.push(
          <div
            key={`cell-${r}-${c}`}
            onClick={() => handleCellClick(r, c)}
            className={`
              relative w-full h-full rounded-sm sm:rounded-md transition-all duration-300
              ${isP1 ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] z-10' : ''}
              ${isP2 ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] z-10' : ''}
              ${isActiveP1 ? 'ring-4 ring-white/30 ring-offset-2 ring-offset-[#09090b] shadow-[0_0_20px_rgba(6,182,212,0.8)] scale-110' : ''}
              ${isActiveP2 ? 'ring-4 ring-white/30 ring-offset-2 ring-offset-[#09090b] shadow-[0_0_20px_rgba(245,158,11,0.8)] scale-110' : ''}
              ${!isP1 && !isP2 ? 'bg-zinc-800' : ''}
              ${isValidMove && !isP1 && !isP2 ? `cursor-pointer ring-2 ring-inset ${turn === 1 ? 'hover:bg-cyan-950/40 ring-cyan-500/50' : 'hover:bg-amber-950/40 ring-amber-500/50'}` : ''}
            `}
            style={{
              gridRow: r * 2 + 1,
              gridColumn: c * 2 + 1,
            }}
          >
            {/* Dots for valid moves */}
            {isValidMove && !isP1 && !isP2 && (
              <div className={`absolute inset-0 m-auto w-1/4 h-1/4 rounded-full opacity-60 transition-colors duration-300 ${turn === 1 ? 'bg-cyan-400' : 'bg-amber-400'}`} />
            )}
          </div>
        );
      }
    }
    return elements;
  };

  const renderPlacedWalls = () => {
    const elements = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (hWalls[r][c]) {
          const wcolor = hWalls[r][c] === 1 ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]' : 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]';
          elements.push(
             <div
               key={`hwall-${r}-${c}`}
               className={`${wcolor} rounded-full z-10 w-full h-full`}
               style={{
                 gridRow: r * 2 + 2,
                 gridColumn: `${c * 2 + 1} / span 3`,
                 transform: 'scaleX(1.02)'
               }}
             />
          );
        }
        if (vWalls[r][c]) {
          const wcolor = vWalls[r][c] === 1 ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]' : 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]';
          elements.push(
             <div
               key={`vwall-${r}-${c}`}
               className={`${wcolor} rounded-full z-10 w-full h-full`}
               style={{
                 gridRow: `${r * 2 + 1} / span 3`,
                 gridColumn: c * 2 + 2,
                 transform: 'scaleY(1.02)'
               }}
             />
          );
        }
      }
    }
    return elements;
  };

  const renderIntersections = () => {
    const elements = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        // Render preview if hovered OR if persistently selected (mobile/tap)
        const isSelected = selectedWall?.r === r && selectedWall?.c === c;
        const isHovered = hoverIntersect?.r === r && hoverIntersect?.c === c;
        const isActivePreview = isHovered || isSelected;

        let previewClass = 'opacity-0';
        let previewStyle = {};
        
        let canPlace = false;

        if (isActivePreview && !winner && currentPlayerWalls > 0) {
          canPlace = canPlaceWall(r, c, wallDirection, hWalls, vWalls, p1Pos, p2Pos);
          const activeColor = turn === 1 ? 'bg-cyan-500/50' : 'bg-amber-500/50';
          const activeShadow = turn === 1 ? 'shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'shadow-[0_0_15px_rgba(245,158,11,0.4)]';
          
          // Selection gets a stronger highlighted border and pulsing animation to stand out on mobile
          const highlightClass = isSelected ? `opacity-90 animate-pulse border-2 ${turn === 1 ? 'border-cyan-400' : 'border-amber-400'}` : 'opacity-65';

          previewClass = canPlace 
            ? `${highlightClass} ${activeColor} ${activeShadow}` 
            : 'opacity-50 bg-red-500/50';
          
          if (wallDirection === 'H') {
            previewStyle = {
               gridRow: r * 2 + 2,
               gridColumn: `${c * 2 + 1} / span 3`,
               zIndex: 20
            };
          } else {
            previewStyle = {
               gridRow: `${r * 2 + 1} / span 3`,
               gridColumn: c * 2 + 2,
               zIndex: 20
            };
          }
        }

        elements.push(
          <div
            key={`intersect-${r}-${c}`}
            className="z-20 cursor-pointer"
            style={{
              gridRow: r * 2 + 2,
              gridColumn: c * 2 + 2,
              transform: 'scale(2.5)'
            }}
            onMouseEnter={() => setHoverIntersect({ r, c })}
            onMouseLeave={() => setHoverIntersect(null)}
            onClick={() => {
              if (winner || currentPlayerWalls <= 0) return;
              if (turn === 2 && gameMode === 'bot') return; // Cannot place wall for bot
              
              if (selectedWall?.r === r && selectedWall?.c === c) {
                handleWallClick(r, c);
              } else {
                setSelectedWall({ r, c });
              }
            }}
          />
        );

        if (isActivePreview && !winner && currentPlayerWalls > 0) {
          elements.push(
            <div
               key={`preview-${r}-${c}`}
               className={`rounded-sm pointer-events-none transition-opacity ${previewClass} w-full h-full`}
               style={previewStyle}
            />
          );
        }
      }
    }
    return elements;
  };

  if (appState === 'menu') {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md mb-4">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
          ← Back to Home
        </button>
      </div>
      <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-amber-500 py-2">
          Barricade
        </h1>
        <p className="text-zinc-400 mb-12 text-center max-w-sm">
          A strategic 2-player board game where you must reach the opposite side before your opponent blocks you.
        </p>

        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-2xl mb-8 space-y-6">
          <div className="flex gap-2 p-1 bg-zinc-950 rounded-xl">
            <button
              onClick={() => setGameMode('local')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${gameMode === 'local' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              2 Players Local
            </button>
            <button
              onClick={() => setGameMode('bot')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${gameMode === 'bot' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              vs Computer
            </button>
          </div>

          <div className="space-y-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-cyan-400">
              Player 1 Name
              <input 
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                className="w-full bg-zinc-950 border border-cyan-900/50 rounded-lg px-4 py-3 text-zinc-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-semibold"
                placeholder="Player 1"
              />
            </label>
            <label className={`flex flex-col gap-1.5 text-sm font-medium text-amber-500 transition-opacity ${gameMode === 'bot' ? 'opacity-50 pointer-events-none' : ''}`}>
              Player 2 Name
              <input 
                value={gameMode === 'bot' ? 'Computer' : p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                readOnly={gameMode === 'bot'}
                className="w-full bg-zinc-950 border border-amber-900/50 rounded-lg px-4 py-3 text-zinc-200 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-semibold"
                placeholder="Player 2"
              />
            </label>

            {gameMode === 'bot' && (
              <label className="flex flex-col gap-1.5 text-sm font-medium text-emerald-400">
                Bot Difficulty
                <select 
                  value={difficulty} 
                  onChange={(e: any) => setDifficulty(e.target.value)}
                  className="w-full bg-zinc-950 border border-emerald-900/50 rounded-lg px-4 py-3 text-zinc-200 outline-none focus:border-emerald-500 transition-all font-semibold appearance-none"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/80">
               <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-400">
                 Walls per Player
                 <select 
                   value={initialWalls} 
                   onChange={(e) => setInitialWalls(Number(e.target.value))}
                   className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-200 outline-none focus:border-zinc-500 transition-all font-semibold appearance-none"
                 >
                   <option value="5">5 Walls</option>
                   <option value="10">10 Walls</option>
                   <option value="15">15 Walls</option>
                 </select>
               </label>
               <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-400">
                 Turn Time Limit
                 <select 
                   value={timeLimit} 
                   onChange={(e) => setTimeLimit(Number(e.target.value))}
                   className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-200 outline-none focus:border-zinc-500 transition-all font-semibold appearance-none"
                 >
                   <option value="15">15 Seconds</option>
                   <option value="30">30 Seconds</option>
                   <option value="60">60 Seconds</option>
                   <option value="999">Unlimited</option>
                 </select>
               </label>
            </div>
          </div>
          <button 
            onClick={() => { resetGame(); setAppState('game'); }}
            className="w-full py-4 bg-white text-zinc-900 font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center py-10 font-sans">
      <div className="max-w-xl md:max-w-5xl w-full px-4 flex flex-col md:flex-row items-center justify-between mb-8 pb-4 border-b border-zinc-900">
        <h1 className="text-3xl font-bold tracking-tight mb-4 md:mb-0 flex items-center gap-2">
          <span>Barricade</span>
          <span className="text-[10px] bg-cyan-500/10 text-cyan-400 font-bold px-2 py-0.5 rounded-full ring-1 ring-cyan-500/20 uppercase tracking-widest leading-none">
            {gameMode === 'bot' ? 'vs Computer' : 'Local'}
          </span>
        </h1>
        <div className="flex gap-2 flex-wrap justify-center">
          <button 
            onClick={() => setShowHistory(prev => !prev)}
            className={`flex items-center gap-2 text-xs md:text-sm font-medium px-4 py-2 rounded-md ring-1 ring-white/10 transition-all shadow-md ${
              showHistory 
                ? 'bg-amber-500/25 text-amber-300 ring-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Moves ({history.length})</span>
          </button>
          <button 
            onClick={() => setAppState('menu')}
            className="flex items-center gap-2 text-xs md:text-sm font-medium px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md ring-1 ring-white/10 transition-colors text-zinc-300 shadow-md"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Menu</span>
          </button>
          <button 
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="flex items-center gap-2 text-xs md:text-sm font-medium px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md ring-1 ring-white/10 transition-colors text-zinc-300 shadow-md animate-pulse"
          >
            <Undo2 className="w-4 h-4" />
            <span className="hidden sm:inline">Undo</span>
          </button>
          <button 
            onClick={() => setShowStats(true)}
            className="flex items-center gap-2 text-xs md:text-sm font-medium px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md ring-1 ring-white/10 transition-colors text-zinc-300 shadow-md"
          >
            <BarChart2 className="w-4 h-4" />
            <span className="hidden sm:inline">Stats</span>
          </button>
          <button 
            onClick={resetGame}
            className="flex items-center gap-2 text-xs md:text-sm font-medium px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md ring-1 ring-white/10 transition-colors text-zinc-300 shadow-md"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Restart</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-5xl px-4 flex flex-col lg:flex-row gap-8 items-start justify-center">
        {/* Left column: Board, players, central turn indicator */}
        <div className="flex-1 max-w-xl mx-auto w-full flex flex-col items-center">
          
          <div className="w-full flex justify-between items-center mb-4 sm:mb-8 text-sm sm:text-base gap-4 relative">
            <div className={`flex flex-col items-start px-3 py-2 sm:px-5 sm:py-4 rounded-xl border-2 transition-all duration-300 ${turn === 1 ? 'border-cyan-500 bg-cyan-950/30 shadow-[0_0_25px_rgba(6,182,212,0.15)] scale-105' : 'border-transparent bg-zinc-900/50 opacity-50 scale-100'}`}>
              <span className="text-cyan-400 font-bold text-base sm:text-lg mb-0.5 sm:mb-1">{p1Name}</span>
              <span className="text-xs sm:text-sm font-medium text-cyan-200/60">{p1Walls} walls</span>
              {turn === 1 && !winner && timeLimit < 999 && (
                <span className="text-[10px] sm:text-xs font-bold text-cyan-300 mt-1 sm:mt-2 bg-cyan-950/50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">{timeLeft}s remaining</span>
              )}
            </div>

            {winner ? (
              <div className="text-center flex-1 flex flex-col items-center z-10">
                <span className={`text-xl sm:text-2xl font-black tracking-tight ${winner === 1 ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]'}`}>
                  {winner === 1 ? p1Name : (gameMode === 'bot' ? 'Computer' : p2Name)} Wins!
                </span>
              </div>
            ) : (
              /* Highly Polished Interactive Turn Indicator Component */
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-zinc-950/90 shadow-md ${
                  turn === 1 
                    ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]' 
                    : 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                }`}>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      turn === 1 ? 'bg-cyan-400' : 'bg-amber-400'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      turn === 1 ? 'bg-cyan-500' : 'bg-amber-500'
                    }`}></span>
                  </span>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-100">
                    {turn === 1 ? "P1 Turn" : (gameMode === 'bot' ? "Bot Turn" : "P2 Turn")}
                  </span>
                </div>
                {/* Active arrow animation flow */}
                <span className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${
                  turn === 1 ? 'text-cyan-400 animate-pulse' : 'text-amber-500 animate-pulse'
                }`}>
                  {turn === 1 ? '← Active' : 'Active →'}
                </span>
              </div>
            )}

            <div className={`flex flex-col items-end px-3 py-2 sm:px-5 sm:py-4 rounded-xl border-2 transition-all duration-300 ${turn === 2 ? 'border-amber-500 bg-amber-950/30' : 'border-transparent bg-zinc-900/50 opacity-50'}`}>
              <span className="text-amber-500 font-bold text-base sm:text-lg mb-0.5 sm:mb-1">{gameMode === 'bot' ? 'Computer' : p2Name}</span>
              <span className="text-xs sm:text-sm font-medium text-amber-200/60">{p2Walls} walls</span>
              {turn === 2 && !winner && timeLimit < 999 && (
                <span className="text-[10px] sm:text-xs font-bold text-amber-300 mt-1 sm:mt-2 bg-amber-950/50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">{timeLeft}s remaining</span>
              )}
            </div>
          </div>

      <div className="relative select-none p-2 sm:p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden w-full max-w-[95vw] sm:max-w-md md:max-w-lg aspect-square mx-auto mb-8">
        <div 
          className="grid relative w-full h-full rotate-180"
          style={{
            gridTemplateRows: "repeat(8, minmax(0, 1fr) min(2.5vw, 12px)) minmax(0, 1fr)",
            gridTemplateColumns: "repeat(8, minmax(0, 1fr) min(2.5vw, 12px)) minmax(0, 1fr)",
          }}
          onMouseLeave={() => setHoverIntersect(null)}
        >
          {/* Target Lines */}
          <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/20 -translate-y-2 rounded-full" />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500/20 translate-y-2 rounded-full" />
          
          {renderCells()}
          {renderPlacedWalls()}
          {renderIntersections()}
        </div>
      </div>
      
      {/* Active Player Wall Controls */}
      <div className={`mt-4 sm:mt-8 flex flex-col items-center gap-4 transition-all duration-300 w-full ${winner || currentPlayerWalls === 0 ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
        {!winner && currentPlayerWalls > 0 && (
          <div className="flex flex-col items-center gap-3 w-full max-w-md px-2">
            
            {/* Wall Orientation Selector Row */}
            <div className={`flex items-center gap-1.5 p-1 rounded-xl border transition-colors duration-300 ${
              turn === 1 
                ? 'bg-cyan-950/20 border-cyan-500/30' 
                : 'bg-amber-950/20 border-amber-500/30'
            }`}>
              <span className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 text-[10px]">Orientation:</span>
              <button 
                onClick={() => {
                  setWallDirection('H');
                }}
                className={`flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  wallDirection === 'H' 
                    ? (turn === 1 ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'bg-amber-500 text-white shadow-md shadow-amber-500/20') 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className={`w-3 h-1 rounded-sm ${wallDirection === 'H' ? 'bg-white' : 'bg-current'}`} />
                <span>Horizontal</span>
              </button>
              <button 
                onClick={() => {
                  setWallDirection('V');
                }}
                className={`flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  wallDirection === 'V' 
                    ? (turn === 1 ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'bg-amber-500 text-white shadow-md shadow-amber-500/20') 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className={`w-1 h-3 rounded-sm ${wallDirection === 'V' ? 'bg-white' : 'bg-current'}`} />
                <span>Vertical</span>
              </button>
            </div>

            {/* Mobile Touch draft helper panel */}
            {selectedWall ? (
              <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 shadow-xl flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Wall Draft Preview</span>
                  <span className={`text-xs font-bold leading-none ${turn === 1 ? 'text-cyan-400' : 'text-amber-400'}`}>
                    {wallDirection === 'H' ? 'Horizontal' : 'Vertical'} @ R{selectedWall.r + 1}, C{selectedWall.c + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedWall(null)}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700/80 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors border border-zinc-700/30 text-xs"
                    title="Cancel selection"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Check if it can actually be placed
                      if (canPlaceWall(selectedWall.r, selectedWall.c, wallDirection, hWalls, vWalls, p1Pos, p2Pos)) {
                        handleWallClick(selectedWall.r, selectedWall.c, wallDirection);
                      } else {
                        playSound('error');
                      }
                    }}
                    className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 shadow-md shadow-black/30 ${
                      canPlaceWall(selectedWall.r, selectedWall.c, wallDirection, hWalls, vWalls, p1Pos, p2Pos)
                        ? (turn === 1 ? 'bg-cyan-400 text-cyan-950 hover:bg-cyan-300' : 'bg-amber-400 text-amber-950 hover:bg-amber-300')
                        : 'bg-zinc-800 text-zinc-600 border border-zinc-700/50 cursor-not-allowed'
                    }`}
                  >
                    Confirm Wall
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-zinc-500 font-medium select-none text-center py-1 flex items-center gap-1.5 justify-center opacity-85">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse" />
                <span>Tap any grid row/column crossing on the board to draft, then confirm placement.</span>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-8 text-zinc-500 text-sm max-w-lg text-center px-4 leading-relaxed mb-6">
        <strong>Goal:</strong> Reach the opposite side of the board. 
        <br />
        <strong>Turn:</strong> Move your pawn OR place a wall. You cannot jump over walls, and you cannot completely trap a player.
      </p>

      {/* Target of left column close */}
      </div>

      {/* Right column: Move History sidebar */}
      {/* Drawer backdrop on mobile */}
      {showHistory && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setShowHistory(false)}
        />
      )}

      {/* Sidebar / slide-out drawer container */}
      <div className={`
        ${showHistory 
          ? 'fixed inset-y-0 right-0 z-50 w-[21rem] bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col transition-all duration-300 translate-x-0 scale-100 p-6 animate-fade-in'
          : 'hidden lg:flex lg:flex-col w-80 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl shadow-xl h-[620px] shrink-0 p-6'
        }
      `}>
        <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2 text-amber-500">
            <History className="w-5 h-5 animate-pulse" />
            <h2 className="text-lg font-bold tracking-tight text-white">Move History</h2>
          </div>
          <span className="text-xs font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-bold">
            {history?.length || 0} {history?.length === 1 ? 'move' : 'moves'}
          </span>
          {showHistory && (
            <button 
              onClick={() => setShowHistory(false)}
              className="lg:hidden text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-md transition-all border border-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Move list */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {(history?.length || 0) === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <p className="text-sm text-zinc-500">No actions made yet.</p>
              <p className="text-xs text-zinc-600 mt-1">Make a move on the board to start logging history!</p>
            </div>
          ) : (
            <div className="relative border-l border-zinc-800/80 ml-3 pl-4 space-y-3.5 py-2 font-medium">
              {history.map((log: string, idx: number) => {
                const isP1 = log.includes(p1Name);
                const isGameOver = log.toLowerCase().includes('wins') || log.toLowerCase().includes('won') || log.toLowerCase().includes('wins!');
                
                return (
                  <div key={idx} className="relative text-xs leading-relaxed group">
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ring-2 ring-zinc-950 transition-transform duration-300 group-hover:scale-125 ${
                      isGameOver 
                        ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.7)] animate-pulse' 
                        : isP1 
                          ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' 
                          : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                    }`} />
                    
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-zinc-500 font-mono text-[10px] shrink-0 font-bold">#{idx + 1}</span>
                      <p className={`flex-1 ${isGameOver ? 'text-purple-400 font-semibold tracking-wide' : 'text-zinc-300'}`}>
                        {log}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={historyEndRef} />
            </div>
          )}
        </div>
        <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 selection:bg-transparent">
          <span>Barricade Offline Log</span>
          <span className="animate-pulse flex items-center gap-1 font-semibold text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 inline-block animate-ping" />
            STANDALONE
          </span>
        </div>
      </div>
      
      {/* Target of outer rows close */}
      </div>

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-zinc-100">Game Statistics</h2>
              <button onClick={() => setShowStats(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
                <span className="text-zinc-400">Games Played</span>
                <span className="font-bold text-lg">{stats.gamesPlayed}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-cyan-950/20 border border-cyan-900/30 rounded-lg">
                <span className="text-cyan-400 font-medium">{p1Name} Wins</span>
                <span className="font-bold text-lg text-cyan-300">{stats.p1Wins}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-amber-950/20 border border-amber-900/30 rounded-lg">
                <span className="text-amber-500 font-medium">{p2Name} Wins</span>
                <span className="font-bold text-lg text-amber-400">{stats.p2Wins}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

