import { useState, useEffect, useRef } from 'react';
import { canPlaceWall, getValidMoves, Position } from '../game/logic';
import { 
  RotateCcw, Minus, BarChart2, X, Undo2, Home, 
  Settings, History, HelpCircle, Volume2, VolumeX, Music, HelpCircle as GuideIcon 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound, startBGM, toggleMusic } from '../lib/audio';
import { getBotAction } from '../game/bot';
import { useNavigate } from 'react-router-dom';
import { getSavedTheme, GameTheme } from '../lib/theme';

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

  // Customizer Settings
  const [theme, setTheme] = useState<GameTheme>(getSavedTheme());
  const [musicMuted, setMusicMuted] = useState(localStorage.getItem('barricadeMusicMuted') === 'true');
  const [sfxMuted, setSfxMuted] = useState(localStorage.getItem('barricadeSfxMuted') === 'true');

  useEffect(() => {
    startBGM();
  }, []);

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
    playSound('error');
    const lastState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    
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
    setTimeLeft(timeLimit);
  };

  useEffect(() => {
    const storedStats = localStorage.getItem('barricadeStats');
    if (storedStats) {
      try {
        setStats(JSON.parse(storedStats));
      } catch (e) {}
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
      setHistory(h => [...h, `Game Over! ${winnerName} breaches target zone.`]);
      playSound('win');

      const colors = winner === 1 ? [theme.p1.shadowColor, '#ffffff'] : [theme.p2.shadowColor, '#ffffff'];
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

  // Turn Timeout Logic
  useEffect(() => {
    if (winner || timeLimit >= 999 || appState === 'menu') return;
    setTimeLeft(timeLimit);
    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          pushState();
          const currentTurn = currentStateRef.current.turn;
          const turnName = currentTurn === 1 ? p1Name : (gameMode === 'bot' ? 'Computer' : p2Name);
          setHistory(h => [...h, `${turnName} buffer limit exceeded. Turn skipped.`]);
          playSound('error');
          setTurn(t => t === 1 ? 2 : 1);
          return timeLimit;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [turn, winner, timeLimit, appState]);

  // Bot Turn Trigger
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
    if (turn === 2 && gameMode === 'bot' && !isBot) return;
    
    const isValidMove = validMoves.some(m => m.r === r && m.c === c);
    if (!isValidMove) return;

    pushState();
    playSound('move');

    if (turn === 1) {
      setP1Pos({ r, c });
      setHistory(h => [...h, `${p1Name} shifted to R${r + 1}, C${c + 1}`]);
      if (r === 8) setWinner(1);
      else setTurn(2);
    } else {
      setP2Pos({ r, c });
      const currentP2Name = gameMode === 'bot' ? 'Computer' : p2Name;
      setHistory(h => [...h, `${currentP2Name} shifted to R${r + 1}, C${c + 1}`]);
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
         setHistory(h => [...h, `${p1Name} locked Horizontal Firewall at R${r + 1}, C${c + 1}`]);
         setTurn(2);
      } else {
         setP2Walls(w => w - 1);
         const currentP2Name = gameMode === 'bot' ? 'Computer' : p2Name;
         setHistory(h => [...h, `${currentP2Name} locked ${dirToUse === 'H' ? 'Horizontal' : 'Vertical'} Firewall at R${r + 1}, C${c + 1}`]);
         setTurn(1);
      }
      setHoverIntersect(null);
    }
  };

  const handleToggleMusic = () => {
    const nextMuted = !musicMuted;
    setMusicMuted(nextMuted);
    toggleMusic(nextMuted);
  };

  const handleToggleSfx = () => {
    const nextMuted = !sfxMuted;
    setSfxMuted(nextMuted);
    localStorage.setItem('barricadeSfxMuted', String(nextMuted));
    if (!nextMuted) playSound('move');
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
              relative w-full h-full rounded-md transition-all duration-300 border border-zinc-900/10
              ${isP1 ? `${theme.p1.color} ${theme.p1.glow} z-10 border-white/20` : ''}
              ${isP2 ? `${theme.p2.color} ${theme.p2.glow} z-10 border-white/20` : ''}
              ${isActiveP1 ? `ring-4 ring-white/30 ring-offset-2 ring-offset-[#09090b] scale-105 z-20` : ''}
              ${isActiveP2 ? `ring-4 ring-white/30 ring-offset-2 ring-offset-[#09090b] scale-105 z-20` : ''}
              ${!isP1 && !isP2 ? theme.cellBg : ''}
              ${isValidMove && !isP1 && !isP2 ? `cursor-pointer ring-2 ring-inset ${turn === 1 ? theme.validP1 : theme.validP2}` : ''}
            `}
            style={{
              gridRow: r * 2 + 1,
              gridColumn: c * 2 + 1,
            }}
          >
            {isValidMove && !isP1 && !isP2 && (
              <div className={`absolute inset-0 m-auto w-1/4 h-1/4 rounded-full opacity-60 transition-colors duration-300 ${turn === 1 ? theme.p1.color : theme.p2.color}`} />
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
          const ownerTheme = hWalls[r][c] === 1 ? theme.p1 : theme.p2;
          elements.push(
             <div
               key={`hwall-${r}-${c}`}
               className={`${ownerTheme.color} ${ownerTheme.glow} rounded-full z-10 w-full h-full`}
               style={{
                 gridRow: r * 2 + 2,
                 gridColumn: `${c * 2 + 1} / span 3`,
                 transform: 'scaleX(1.02)'
               }}
             />
          );
        }
        if (vWalls[r][c]) {
          const ownerTheme = vWalls[r][c] === 1 ? theme.p1 : theme.p2;
          elements.push(
             <div
               key={`vwall-${r}-${c}`}
               className={`${ownerTheme.color} ${ownerTheme.glow} rounded-full z-10 w-full h-full`}
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
    const activeColor = turn === 1 ? theme.p1.color : theme.p2.color;
    const activeShadow = turn === 1 ? theme.p1.glow : theme.p2.glow;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isSelected = selectedWall?.r === r && selectedWall?.c === c;
        const isHovered = hoverIntersect?.r === r && hoverIntersect?.c === c;
        const isActivePreview = isHovered || isSelected;

        let previewClass = 'opacity-0';
        let previewStyle = {};
        let canPlace = false;

        if (isActivePreview && !winner && currentPlayerWalls > 0) {
          canPlace = canPlaceWall(r, c, wallDirection, hWalls, vWalls, p1Pos, p2Pos);
          const highlightClass = isSelected ? `opacity-90 animate-pulse border-2 ${turn === 1 ? theme.p1.border : theme.p2.border}` : 'opacity-65';
          previewClass = canPlace 
            ? `${highlightClass} ${activeColor} ${activeShadow}/50` 
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
              if (turn === 2 && gameMode === 'bot') return;
              
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
      <div className="min-h-screen cyber-grid-bg text-zinc-100 flex flex-col items-center justify-center p-4 md:p-6 font-sans relative overflow-x-hidden selection:bg-cyan-500/30">
        <div className="absolute inset-0 scanline pointer-events-none opacity-20" />
        <div className="cyber-scanner" />

        <div className="w-full max-w-md mb-4 flex justify-between items-center z-10">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-1 text-zinc-500 hover:text-white transition-colors text-xs font-mono font-bold"
          >
            ← Back to Lobby
          </button>
        </div>

        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-2xl relative z-10">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-500/60" />
          
          <h2 className="text-3xl font-mono font-black text-center mb-1 uppercase tracking-tight">
            LOCAL STAGE
          </h2>
          <p className="text-zinc-500 text-[10px] text-center font-mono uppercase tracking-widest mb-8">
            Deploy local proxy simulation
          </p>

          <div className="flex gap-2 p-1 bg-zinc-950 rounded-xl mb-6 border border-zinc-850">
            <button
              onClick={() => setGameMode('local')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-mono font-bold transition-all ${gameMode === 'local' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              2 Players (LAN)
            </button>
            <button
              onClick={() => setGameMode('bot')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-mono font-bold transition-all ${gameMode === 'bot' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              vs Core AI
            </button>
          </div>

          <div className="space-y-4">
            <label className={`flex flex-col gap-1.5 text-xs font-mono font-bold ${theme.p1.text}`}>
              Player 1 Handle
              <input 
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/25 transition-all font-semibold font-sans text-sm"
              />
            </label>
            <label className={`flex flex-col gap-1.5 text-xs font-mono font-bold ${theme.p2.text} transition-opacity ${gameMode === 'bot' ? 'opacity-40 pointer-events-none' : ''}`}>
              Player 2 Handle
              <input 
                value={gameMode === 'bot' ? 'Computer' : p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                readOnly={gameMode === 'bot'}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/25 transition-all font-semibold font-sans text-sm"
              />
            </label>

            {gameMode === 'bot' && (
              <label className="flex flex-col gap-1.5 text-xs font-mono font-bold text-emerald-400">
                Core AI Strength
                <select 
                  value={difficulty} 
                  onChange={(e: any) => setDifficulty(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-emerald-500 transition-all font-sans text-sm appearance-none font-semibold"
                >
                  <option value="easy">Level 1 (Easy)</option>
                  <option value="medium">Level 2 (Medium)</option>
                  <option value="hard">Level 3 (Hard)</option>
                </select>
              </label>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/80">
               <label className="flex flex-col gap-1.5 text-xs font-mono font-bold text-zinc-500">
                 Firewall Stock
                 <select 
                   value={initialWalls} 
                   onChange={(e) => setInitialWalls(Number(e.target.value))}
                   className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-200 outline-none focus:border-zinc-550 transition-all font-sans text-xs font-semibold appearance-none"
                 >
                   <option value="5">5 Blocks</option>
                   <option value="10">10 Blocks</option>
                   <option value="15">15 Blocks</option>
                 </select>
               </label>
               <label className="flex flex-col gap-1.5 text-xs font-mono font-bold text-zinc-500">
                 Turn Buffer Limit
                 <select 
                   value={timeLimit} 
                   onChange={(e) => setTimeLimit(Number(e.target.value))}
                   className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-200 outline-none focus:border-zinc-550 transition-all font-sans text-xs font-semibold appearance-none"
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
            onClick={() => { playSound('wall'); resetGame(); setAppState('game'); }}
            className="w-full py-4 mt-8 bg-gradient-to-r from-cyan-500 to-amber-500 text-zinc-950 font-mono font-black text-base rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            LAUNCH PROTOCOL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cyber-grid-bg text-zinc-100 flex flex-col items-center py-4 md:py-6 font-sans relative overflow-x-hidden selection:bg-cyan-500/30">
      <div className="absolute inset-0 scanline pointer-events-none opacity-20" />
      
      {/* Top Header Panel */}
      <div className="max-w-xl md:max-w-5xl w-full px-4 flex flex-col sm:flex-row items-center justify-between mb-4 pb-3 border-b border-zinc-850 z-10 gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-mono font-black uppercase tracking-tight flex items-center gap-1.5">
            <span>BARRICADE</span>
            <span className="text-[9px] bg-zinc-950 border border-zinc-850 text-cyan-400 font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {gameMode === 'bot' ? 'Core AI Simulation' : 'LAN Proxy'}
            </span>
          </h1>
        </div>
        
        {/* Header Audio toggles & Menu Controls */}
        <div className="flex gap-2 flex-wrap items-center">
          <button 
            onClick={handleToggleMusic}
            className={`p-2 rounded-lg border transition-all ${
              !musicMuted 
                ? 'bg-cyan-950/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
            title="Toggle BGM"
          >
            <Music className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleToggleSfx}
            className={`p-2 rounded-lg border transition-all ${
              !sfxMuted 
                ? 'bg-amber-950/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
            title="Toggle SFX"
          >
            {sfxMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <div className="h-6 w-px bg-zinc-800 mx-1 hidden sm:block" />

          <button 
            onClick={() => { playSound('move'); setShowHistory(prev => !prev); }}
            className={`flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-2 rounded-lg border transition-all shadow-md ${
              showHistory 
                ? 'bg-amber-950/20 text-amber-400 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                : 'bg-zinc-900 border-zinc-850 hover:bg-zinc-850 text-zinc-400'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>LOGS ({history.length})</span>
          </button>
          
          <button 
            onClick={() => { playSound('error'); setAppState('menu'); }}
            className="flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-lg transition-colors text-zinc-400"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">MENU</span>
          </button>
          
          <button 
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-2 bg-zinc-900 hover:bg-zinc-850 disabled:opacity-40 disabled:pointer-events-none border border-zinc-850 rounded-lg transition-colors text-zinc-400"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">UNDO</span>
          </button>
          
          <button 
            onClick={() => { playSound('move'); setShowStats(true); }}
            className="flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-lg transition-colors text-zinc-400"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">STATS</span>
          </button>
          
          <button 
            onClick={() => { playSound('error'); resetGame(); }}
            className="flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-lg transition-colors text-zinc-400"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RELOAD</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-5xl px-4 flex flex-col lg:flex-row gap-6 items-start justify-center z-10">
        
        {/* Left Column: Board and Player Info cards */}
        <div className="flex-1 max-w-xl mx-auto w-full flex flex-col items-center">
          
          {/* Active players indicator panel */}
          <div className="w-full flex justify-between items-center mb-6 text-xs gap-3 relative">
            
            {/* Player 1 Card */}
            <div className={`flex flex-col items-start px-4 py-3.5 rounded-xl border transition-all duration-300 ${
              turn === 1 
                ? `${theme.p1.bg} ${theme.p1.border} ${theme.p1.glow} scale-102` 
                : 'border-transparent bg-zinc-900/50 opacity-40 scale-98'
            }`}>
              <span className={`font-mono font-black text-sm mb-0.5 ${theme.p1.text}`}>{p1Name}</span>
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">{p1Walls} firewalls</span>
              {turn === 1 && !winner && timeLimit < 999 && (
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md mt-2 bg-zinc-950 ${theme.p1.text}`}>{timeLeft}s remaining</span>
              )}
            </div>

            {/* Middle Winner or Turn Indicator */}
            {winner ? (
              <div className="text-center flex-1 flex flex-col items-center z-10">
                <span className={`text-md font-mono font-black tracking-wider uppercase animate-bounce ${winner === 1 ? theme.p1.text : theme.p2.text}`}>
                  {winner === 1 ? p1Name : (gameMode === 'bot' ? 'Computer' : p2Name)} WINS!
                </span>
                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Goal Breached</span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-zinc-950/90 shadow-md ${
                  turn === 1 ? theme.p1.border : theme.p2.border
                }`}>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      turn === 1 ? theme.p1.color : theme.p2.color
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      turn === 1 ? theme.p1.color : theme.p2.color
                    }`}></span>
                  </span>
                  <span className="text-[9px] font-mono font-black uppercase tracking-wider text-zinc-300">
                    {turn === 1 ? "Node 1 Active" : "Node 2 Active"}
                  </span>
                </div>
                <span className={`text-[8px] font-mono font-bold tracking-widest uppercase mt-1.5 ${
                  turn === 1 ? theme.p1.text : theme.p2.text
                }`}>
                  {turn === 1 ? '← Active Channel' : 'Active Channel →'}
                </span>
              </div>
            )}

            {/* Player 2 Card */}
            <div className={`flex flex-col items-end px-4 py-3.5 rounded-xl border transition-all duration-300 ${
              turn === 2 
                ? `${theme.p2.bg} ${theme.p2.border} ${theme.p2.glow} scale-102` 
                : 'border-transparent bg-zinc-900/50 opacity-40 scale-98'
            }`}>
              <span className={`font-mono font-black text-sm mb-0.5 ${theme.p2.text}`}>{gameMode === 'bot' ? 'Computer' : p2Name}</span>
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">{p2Walls} firewalls</span>
              {turn === 2 && !winner && timeLimit < 999 && (
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md mt-2 bg-zinc-950 ${theme.p2.text}`}>{timeLeft}s remaining</span>
              )}
            </div>

          </div>

          {/* Grid Game Board Container (with limited heights for mobile screens) */}
          <div className="relative select-none p-2 sm:p-4 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden w-full max-w-[95vw] sm:max-w-md md:max-w-lg aspect-square mx-auto mb-6 max-h-[60vh] sm:max-h-[65vh]">
            <div 
              className="grid relative w-full h-full rotate-180"
              style={{
                gridTemplateRows: "repeat(8, minmax(0, 1fr) min(2.5vw, 12px)) minmax(0, 1fr)",
                gridTemplateColumns: "repeat(8, minmax(0, 1fr) min(2.5vw, 12px)) minmax(0, 1fr)",
              }}
              onMouseLeave={() => setHoverIntersect(null)}
            >
              {/* Target Boundaries */}
              <div className={`absolute top-0 left-0 w-full h-0.5 opacity-30 -translate-y-2 rounded-full ${theme.p1.color}`} />
              <div className={`absolute bottom-0 left-0 w-full h-0.5 opacity-30 translate-y-2 rounded-full ${theme.p2.color}`} />
              
              {renderCells()}
              {renderPlacedWalls()}
              {renderIntersections()}
            </div>
          </div>
          
          {/* Wall Direction Control Interface */}
          <div className={`mt-2 flex flex-col items-center gap-3 transition-all duration-300 w-full ${winner || currentPlayerWalls === 0 ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
            {!winner && currentPlayerWalls > 0 && (
              <div className="flex flex-col items-center gap-2.5 w-full max-w-md px-2">
                
                {/* Selector */}
                <div className={`flex items-center gap-1.5 p-1 rounded-xl border transition-colors duration-300 ${
                  turn === 1 ? 'bg-cyan-950/20 border-cyan-500/30' : 'bg-amber-950/20 border-amber-500/30'
                }`}>
                  <span className="px-3.5 text-[8px] font-mono font-bold uppercase tracking-wider text-zinc-500">FIREWALL ANGLE:</span>
                  <button 
                    onClick={() => { playSound('move'); setWallDirection('H'); }}
                    className={`flex items-center justify-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      wallDirection === 'H' 
                        ? (turn === 1 ? 'bg-cyan-500 text-zinc-950 shadow-md' : 'bg-amber-500 text-zinc-950 shadow-md') 
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="w-3 h-0.5 rounded-sm bg-current" />
                    <span>HORIZ</span>
                  </button>
                  <button 
                    onClick={() => { playSound('move'); setWallDirection('V'); }}
                    className={`flex items-center justify-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      wallDirection === 'V' 
                        ? (turn === 1 ? 'bg-cyan-500 text-zinc-950 shadow-md' : 'bg-amber-500 text-zinc-950 shadow-md') 
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="w-0.5 h-3 rounded-sm bg-current" />
                    <span>VERT</span>
                  </button>
                </div>

                {/* Mobile Draft Preview Panel */}
                {selectedWall ? (
                  <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-xl flex items-center justify-between gap-3 animate-fade-in">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-[8px] text-zinc-500 font-mono font-bold uppercase tracking-wider">Wall Draft Mode</span>
                      <span className={`text-xs font-mono font-bold leading-none ${turn === 1 ? theme.p1.text : theme.p2.text}`}>
                        {wallDirection === 'H' ? 'Horizontal' : 'Vertical'} @ R{selectedWall.r + 1}, C{selectedWall.c + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { playSound('error'); setSelectedWall(null); }}
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-800 text-[10px] font-mono"
                      >
                        CANCEL
                      </button>
                      <button
                        onClick={() => {
                          if (canPlaceWall(selectedWall.r, selectedWall.c, wallDirection, hWalls, vWalls, p1Pos, p2Pos)) {
                            handleWallClick(selectedWall.r, selectedWall.c);
                          } else {
                            playSound('error');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg font-mono font-bold text-[10px] transition-all cursor-pointer active:scale-95 shadow-md ${
                          canPlaceWall(selectedWall.r, selectedWall.c, wallDirection, hWalls, vWalls, p1Pos, p2Pos)
                            ? (turn === 1 ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950' : 'bg-amber-500 hover:bg-amber-400 text-zinc-950')
                            : 'bg-zinc-900 text-zinc-650 border border-zinc-850 cursor-not-allowed'
                        }`}
                      >
                        CONFIRM SECURE
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[9px] text-zinc-500 font-mono font-medium text-center py-1 flex items-center gap-1.5 justify-center opacity-85 select-none">
                    <span className="h-1 w-1 rounded-full bg-zinc-600 animate-pulse" />
                    <span>Tap any coordinate intersection on the grid to deploy a firewall barricade.</span>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Move history logs sidebar */}
        {showHistory && (
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setShowHistory(false)}
          />
        )}

        <div className={`
          ${showHistory 
            ? 'fixed inset-y-0 right-0 z-50 w-[21rem] bg-zinc-950 border-l border-zinc-850 shadow-2xl flex flex-col transition-all duration-300 translate-x-0 scale-100 p-6'
            : 'hidden lg:flex lg:flex-col w-80 bg-zinc-900/10 border border-zinc-850/80 rounded-2xl shadow-xl h-[580px] shrink-0 p-6'
          }
        `}>
          <div className="flex items-center justify-between mb-4 border-b border-zinc-850 pb-3">
            <div className="flex items-center gap-2 text-amber-500">
              <History className="w-4 h-4 animate-pulse" />
              <h2 className="text-sm font-mono font-bold tracking-tight text-white uppercase">History Output</h2>
            </div>
            <span className="text-[10px] font-mono bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded text-zinc-400 font-bold">
              {history?.length || 0} {history?.length === 1 ? 'record' : 'records'}
            </span>
            {showHistory && (
              <button 
                onClick={() => setShowHistory(false)}
                className="lg:hidden text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-md transition-all border border-zinc-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Logs lists */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            {(history?.length || 0) === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <p className="text-xs font-mono text-zinc-500">Simulation log empty.</p>
                <p className="text-[10px] text-zinc-650 mt-1">Make a core move or firewall lock to print records.</p>
              </div>
            ) : (
              <div className="relative border-l border-zinc-850 ml-3 pl-4 space-y-3.5 py-2 font-mono text-[11px]">
                {history.map((log: string, idx: number) => {
                  const isP1 = log.includes(p1Name);
                  const isGameOver = log.toLowerCase().includes('breaches') || log.toLowerCase().includes('wins') || log.toLowerCase().includes('won');
                  
                  return (
                    <div key={idx} className="relative leading-relaxed group">
                      <div className={`absolute -left-[21px] top-1 w-2 h-2 rounded-full ring-2 ring-zinc-950 transition-transform duration-300 group-hover:scale-125 ${
                        isGameOver 
                          ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.7)] animate-pulse' 
                          : isP1 
                            ? theme.p1.color 
                            : theme.p2.color
                      }`} />
                      
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-zinc-600 text-[9px] shrink-0 font-bold">#{idx + 1}</span>
                        <p className={`flex-1 ${isGameOver ? 'text-purple-400 font-bold' : 'text-zinc-400'}`}>
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
          <div className="mt-4 pt-3 border-t border-zinc-850 flex items-center justify-between text-[9px] font-mono text-zinc-600 selection:bg-transparent">
            <span>OFFLINE INTERFACE LOG</span>
            <span className="flex items-center gap-1 font-semibold text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 inline-block" />
              SECURE DOCK
            </span>
          </div>
        </div>

      </div>

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-500/50" />
            
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-zinc-850">
              <h2 className="text-sm font-mono font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-1">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                <span>Simulation Stats</span>
              </h2>
              <button 
                onClick={() => { playSound('error'); setShowStats(false); }} 
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3.5 text-xs font-mono">
              <div className="flex justify-between items-center p-3 bg-zinc-950 border border-zinc-900 rounded-lg">
                <span className="text-zinc-500">ROUNDS RUN</span>
                <span className="font-bold text-zinc-300">{stats.gamesPlayed}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-cyan-950/15 border border-cyan-900/30 rounded-lg">
                <span className="text-cyan-400 font-medium">{p1Name} BREACHES</span>
                <span className="font-bold text-cyan-400">{stats.p1Wins}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-amber-950/15 border border-amber-900/30 rounded-lg">
                <span className="text-amber-500 font-medium">{p2Name} BREACHES</span>
                <span className="font-bold text-amber-500">{stats.p2Wins}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
