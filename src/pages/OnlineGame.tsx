import { useState, useEffect, useRef } from 'react';
import { canPlaceWall, getValidMoves, Position } from '../game/logic';
import { RotateCcw, Minus, X, Home, History, Volume2, VolumeX, Music } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound, startBGM, toggleMusic } from '../lib/audio';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getBotAction } from '../game/bot';
import { getSavedTheme, GameTheme } from '../lib/theme';

const getTimestampMillis = (timestamp: any): number => {
  if (!timestamp) return 0;
  if (typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  if (timestamp.seconds) {
    return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
  }
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  try {
    return new Date(timestamp).getTime();
  } catch (e) {
    return 0;
  }
};

export default function OnlineGame() {
  const { gameId } = useParams<{gameId: string}>();
  const navigate = useNavigate();
  const { user, userStats } = useAuth();
  const [gameData, setGameData] = useState<any>(null);
  
  const [wallDirection, setWallDirection] = useState<'H' | 'V'>('H');
  const [hoverIntersect, setHoverIntersect] = useState<{r: number, c: number} | null>(null);
  const [selectedWall, setSelectedWall] = useState<{r: number, c: number} | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const historyEndRef = useRef<HTMLDivElement | null>(null);

  // Custom theme and audio toggles
  const [theme, setTheme] = useState<GameTheme>(getSavedTheme());
  const [musicMuted, setMusicMuted] = useState(localStorage.getItem('barricadeMusicMuted') === 'true');
  const [sfxMuted, setSfxMuted] = useState(localStorage.getItem('barricadeSfxMuted') === 'true');

  useEffect(() => {
    startBGM();
  }, []);

  // Derive all data with safe fallbacks
  const myPlayerNumber = (gameData && user) ? (gameData.hostId === user.uid ? 1 : 2) : 1;
  const isMyTurn = gameData && user ? (gameData.turn === myPlayerNumber) : false;
  
  const p1Name = gameData?.hostName || 'Player 1';
  const p2Name = gameData?.guestName || 'Player 2';
  const p1Pos = gameData?.p1Pos || { r: 0, c: 4 };
  const p2Pos = gameData?.p2Pos || { r: 8, c: 4 };
  const hWalls = gameData?.hWalls || [];
  const vWalls = gameData?.vWalls || [];
  const p1Walls = gameData?.p1Walls ?? 10;
  const p2Walls = gameData?.p2Walls ?? 10;
  const turn = gameData?.turn || 1;
  const winner = gameData?.winner || null;
  const history = gameData?.history || [];

  const updateGlobalStats = async (isWin: boolean) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const newPlayed = (userStats?.gamesPlayed || 0) + 1;
    const newWins = (userStats?.wins || 0) + (isWin ? 1 : 0);
    const newLosses = (userStats?.losses || 0) + (!isWin ? 1 : 0);
    
    const isRanked = gameData?.isRanked === true;
    const trophyChange = isWin ? 30 : -10;
    const updatedTrophies = isRanked ? Math.max(0, (userStats?.trophies || 0) + trophyChange) : (userStats?.trophies || 0);
    
    await updateDoc(userRef, {
      gamesPlayed: newPlayed,
      wins: newWins,
      losses: newLosses,
      trophies: updatedTrophies
    });
  };

  useEffect(() => {
    if (!gameId || !user) return;
    const unsub = onSnapshot(doc(db, 'games', gameId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.hWalls === 'string') {
          try {
            data.hWalls = JSON.parse(data.hWalls);
          } catch(e) {}
        }
        if (typeof data.vWalls === 'string') {
          try {
            data.vWalls = JSON.parse(data.vWalls);
          } catch(e) {}
        }
        setGameData(data);
      }
    }, (err) => {
      console.error("Firestore onSnapshot error in OnlineGame: ", err);
    });
    return () => unsub();
  }, [gameId, user]);

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
    if (showHistory && historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history.length, showHistory]);

  // Bot Turn Trigger inside Online match (if opponent was converted to a bot)
  useEffect(() => {
    if (!gameData || !user || winner) return;

    const isBotMatch = gameData.guestId === 'bot_online';
    const amIHost = gameData.hostId === user.uid;
    const isBotTurn = turn === 2;

    if (isBotMatch && amIHost && isBotTurn) {
      const timer = setTimeout(async () => {
        let difficulty = 'medium';
        const trophies = userStats?.trophies || 0;
        if (trophies < 300) difficulty = 'easy';
        else if (trophies > 1200) difficulty = 'hard';

        const action = getBotAction(
          p2Pos, p1Pos, p2Walls, hWalls, vWalls, 0, 2, difficulty as "easy" | "medium" | "hard"
        );

        if (action) {
          const updates: any = { lastMoveTime: new Date() };

          if (action.type === 'move') {
            playSound('move');
            const newPos = action.pos;
            let newWinner = null;
            if (newPos.r === 0) newWinner = 2;

            updates.turn = newWinner ? 2 : 1;
            updates.p2Pos = newPos;
            updates.history = [...history, `${p2Name} shifted to R${newPos.r + 1}, C${newPos.c + 1}`];
            
            if (newWinner) {
              updates.winner = 2;
              updates.status = 'finished';
              playSound('win');
              await updateGlobalStats(false);
            }
          } else if (action.type === 'wall') {
            playSound('wall');
            const newH = hWalls.map((row: any) => [...row]);
            const newV = vWalls.map((row: any) => [...row]);
            if (action.dir === 'H') newH[action.r][action.c] = 2;
            else newV[action.r][action.c] = 2;

            updates.hWalls = JSON.stringify(newH);
            updates.vWalls = JSON.stringify(newV);
            updates.p2Walls = p2Walls - 1;
            updates.turn = 1;
            updates.history = [...history, `${p2Name} locked ${action.dir === 'H' ? 'Horizontal' : 'Vertical'} Firewall at R${action.r + 1}, C${action.c + 1}`];
          }

          await updateDoc(doc(db, 'games', gameId as string), updates);
        }
      }, 700 + Math.random() * 800);

      return () => clearTimeout(timer);
    }
  }, [turn, winner, gameData, user, userStats]);

  // confetti trigger on game win
  useEffect(() => {
    if (winner) {
      const colors = winner === 1 ? [theme.p1.shadowColor, '#ffffff'] : [theme.p2.shadowColor, '#ffffff'];
      confetti({ particleCount: 80, spread: 60, colors });
    }
  }, [winner]);

  if (!gameData || !user) return <div className="min-h-screen cyber-grid-bg text-white flex items-center justify-center font-mono text-xs uppercase tracking-wider">Syncing node...</div>;

  const currentPlayerPos = turn === 1 ? p1Pos : p2Pos;
  const currOpponentPos  = turn === 1 ? p2Pos : p1Pos;
  const currentPlayerWalls = turn === 1 ? p1Walls : p2Walls;

  const validMoves = winner ? [] : getValidMoves(currentPlayerPos, currOpponentPos, hWalls, vWalls);

  const handleCellClick = async (r: number, c: number) => {
    if (winner || !isMyTurn) return;
    
    const isValidMove = validMoves.some((m: Position) => m.r === r && m.c === c);
    if (!isValidMove) return;

    playSound('move');
    const newPos = { r, c };
    let newWinner = null;
    let nextTurn = turn === 1 ? 2 : 1;
    let logMsg = "";

    if (turn === 1) {
      logMsg = `${p1Name} shifted to R${r + 1}, C${c + 1}`;
      if (r === 8) newWinner = 1;
    } else {
      logMsg = `${p2Name} shifted to R${r + 1}, C${c + 1}`;
      if (r === 0) newWinner = 2;
    }

    const updates: any = {
      turn: newWinner ? turn : nextTurn,
      history: [...history, logMsg],
      lastMoveTime: new Date()
    };
    if (turn === 1) updates.p1Pos = newPos;
    else updates.p2Pos = newPos;
    
    if (newWinner) {
      updates.winner = newWinner;
      updates.status = 'finished';
      playSound('win');
      if (myPlayerNumber === newWinner) {
         await updateGlobalStats(true);
      } else {
         await updateGlobalStats(false);
      }
    }

    await updateDoc(doc(db, 'games', gameId as string), updates);
    setHoverIntersect(null);
  };

  const handleWallClick = async (r: number, c: number) => {
    if (winner || !isMyTurn || currentPlayerWalls <= 0) return;

    if (canPlaceWall(r, c, wallDirection, hWalls, vWalls, p1Pos, p2Pos)) {
      playSound('wall');

      const newH = hWalls.map((row: any) => [...row]);
      const newV = vWalls.map((row: any) => [...row]);

      if (wallDirection === 'H') {
        newH[r][c] = turn;
      } else {
        newV[r][c] = turn;
      }
      
      let logMsg = "";
      const updates: any = {
        hWalls: JSON.stringify(newH),
        vWalls: JSON.stringify(newV),
        turn: turn === 1 ? 2 : 1,
        lastMoveTime: new Date()
      };

      if (turn === 1) {
        logMsg = `${p1Name} locked Horizontal Firewall at R${r + 1}, C${c + 1}`;
        updates.p1Walls = p1Walls - 1;
      } else {
        logMsg = `${p2Name} locked Horizontal Firewall at R${r + 1}, C${c + 1}`;
        updates.p2Walls = p2Walls - 1;
      }
      
      updates.history = [...history, logMsg];
      await updateDoc(doc(db, 'games', gameId as string), updates);
      setSelectedWall(null);
      setHoverIntersect(null);
    } else {
      playSound('error');
    }
  };

  const sendEmote = async (emoji: string) => {
    await updateDoc(doc(db, 'games', gameId as string), {
      lastEmote: {
        senderId: user.uid,
        emoji,
        timestamp: new Date()
      }
    });
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

  // CORRECT RENDERING IMPLEMENTATION MATCHING LocalGame.tsx
  const renderGridCells = () => {
    const elements = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const isP1 = p1Pos.r === r && p1Pos.c === c;
        const isP2 = p2Pos.r === r && p2Pos.c === c;
        const isValid = !winner && isMyTurn && validMoves.some((m: Position) => m.r === r && m.c === c);
        const isActiveP1 = isP1 && turn === 1 && !winner;
        const isActiveP2 = isP2 && turn === 2 && !winner;
        
        elements.push(
          <div
            key={`cell-${r}-${c}`}
            className={`w-full h-full rounded-md border border-zinc-900/10 transition-all duration-300 relative ${
               isP1 ? `${theme.p1.color} ${theme.p1.glow} z-10 border-white/20` :
               isP2 ? `${theme.p2.color} ${theme.p2.glow} z-10 border-white/20` :
               isValid ? `cursor-pointer ring-2 ring-inset ${turn === 1 ? theme.validP1 : theme.validP2}` :
               theme.cellBg
             } ${isActiveP1 ? 'ring-4 ring-white/30 ring-offset-2 ring-offset-[#09090b]' : ''}
               ${isActiveP2 ? 'ring-4 ring-white/30 ring-offset-2 ring-offset-[#09090b]' : ''}
             `}
            style={{ gridRow: r * 2 + 1, gridColumn: c * 2 + 1 }}
            onClick={() => handleCellClick(r, c)}
          >
            {isValid && !isP1 && !isP2 && (
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
        const hOwner = hWalls[r] && hWalls[r][c];
        if (hOwner) {
          const ownerTheme = hOwner === 1 ? theme.p1 : theme.p2;
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
        
        const vOwner = vWalls[r] && vWalls[r][c];
        if (vOwner) {
          const ownerTheme = vOwner === 1 ? theme.p1 : theme.p2;
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
        const isActivePreview = isHovered || (isMyTurn && isSelected);

        let previewClass = 'opacity-0';
        let previewStyle = {};
        let canPlace = false;

        if (isActivePreview && !winner && isMyTurn && currentPlayerWalls > 0) {
          canPlace = canPlaceWall(r, c, wallDirection, hWalls, vWalls, p1Pos, p2Pos);
          const highlightClass = isSelected ? `opacity-90 animate-pulse border-2 ${turn === 1 ? theme.p1.border : theme.p2.border}` : 'opacity-65';
          previewClass = canPlace ? `${highlightClass} ${activeColor} ${activeShadow}/50` : 'opacity-50 bg-red-500/50';
          
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
            style={{ gridRow: r * 2 + 2, gridColumn: c * 2 + 2, transform: 'scale(2.5)' }}
            onMouseEnter={() => setHoverIntersect({ r, c })}
            onMouseLeave={() => setHoverIntersect(null)}
            onClick={() => {
              if (winner || !isMyTurn || currentPlayerWalls <= 0) return;
              
              if (selectedWall?.r === r && selectedWall?.c === c) {
                handleWallClick(r, c);
              } else {
                setSelectedWall({ r, c });
              }
            }}
          />
        );

        if (isActivePreview && !winner && isMyTurn && currentPlayerWalls > 0) {
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

  return (
    <div className="min-h-screen cyber-grid-bg text-zinc-100 flex flex-col items-center py-4 md:py-6 font-sans relative overflow-x-hidden selection:bg-cyan-500/30">
      <div className="absolute inset-0 scanline pointer-events-none opacity-20" />
      
      {/* Top Header Panel */}
      <div className="max-w-xl md:max-w-5xl w-full px-4 flex flex-col sm:flex-row items-center justify-between mb-4 pb-3 border-b border-zinc-850 z-10 gap-3">
        <h1 className="text-xl font-mono font-black tracking-tight mb-2 sm:mb-0 flex items-center gap-1.5 uppercase">
          <span>BARRICADE MULTI</span>
          {gameData?.isRanked ? (
            <span className="text-[9px] bg-zinc-950 border border-amber-500/30 text-amber-500 font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Ranked</span>
          ) : (
            <span className="text-[9px] bg-zinc-950 border border-zinc-850 text-cyan-400 font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Unranked</span>
          )}
        </h1>
        
        <div className="flex gap-2 items-center flex-wrap">
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
            onClick={() => { playSound('error'); navigate('/'); }}
            className="flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-lg transition-colors text-zinc-400 shadow-md"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">LEAVE</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-5xl px-4 flex flex-col lg:flex-row gap-6 items-start justify-center z-10">
        
        {/* Left column: Board, players, central turn indicator */}
        <div className="flex-1 max-w-xl mx-auto w-full flex flex-col items-center">
          
          <div className="w-full flex justify-between items-center mb-6 text-xs gap-3 relative">
            <div className={`flex flex-col items-start px-4 py-3.5 rounded-xl border transition-all duration-300 ${
              turn === 1 
                ? `${theme.p1.bg} ${theme.p1.border} ${theme.p1.glow} scale-102` 
                : 'border-transparent bg-zinc-900/50 opacity-40 scale-98'
            }`}>
              <span className={`font-mono font-black text-sm mb-0.5 ${theme.p1.text}`}>{p1Name} {myPlayerNumber === 1 && '(You)'}</span>
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">{p1Walls} firewalls</span>
            </div>

            {winner ? (
              <div className="text-center flex-1 flex flex-col items-center z-10 font-mono text-xs">
                <span className={`font-black tracking-wider uppercase animate-bounce ${winner === 1 ? theme.p1.text : theme.p2.text}`}>
                  {winner === 1 ? p1Name : p2Name} WINS!
                </span>
                {gameData?.isRanked && (
                  <>
                    {myPlayerNumber === winner ? (
                      <span className="text-emerald-400 font-bold text-[10px] mt-1.5">🏆 +30 Trophies</span>
                    ) : (
                      <span className="text-red-400 font-bold text-[10px] mt-1.5">🔻 -10 Trophies</span>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center font-mono">
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
                    {isMyTurn ? "Your Action" : "Waiting Peer"}
                  </span>
                </div>
                <span className={`text-[8px] font-bold tracking-widest uppercase mt-1.5 ${
                  turn === 1 ? theme.p1.text : theme.p2.text
                }`}>
                  {turn === 1 ? '← Active Channel' : 'Active Channel →'}
                </span>
              </div>
            )}

            <div className={`flex flex-col items-end px-4 py-3.5 rounded-xl border transition-all duration-300 ${
              turn === 2 
                ? `${theme.p2.bg} ${theme.p2.border} ${theme.p2.glow} scale-102` 
                : 'border-transparent bg-zinc-900/50 opacity-40 scale-98'
            }`}>
              <span className={`font-mono font-black text-sm mb-0.5 ${theme.p2.text}`}>{p2Name} {myPlayerNumber === 2 && '(You)'}</span>
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">{p2Walls} firewalls</span>
            </div>
          </div>

          <div className="w-full max-w-xl flex flex-col items-center">
            {!winner && (
              <div className="mb-4 text-zinc-500 text-xs font-mono w-full">
                {isMyTurn ? (
                  <div className="flex flex-col items-center gap-3 w-full">
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
                        <div className="w-3 h-0.5 bg-current rounded-sm" />
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
                        <div className="w-0.5 h-3 bg-current rounded-sm" />
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
                            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 rounded-lg text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-[10px] font-mono"
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
                                : 'bg-zinc-900 text-zinc-655 border border-zinc-850 cursor-not-allowed'
                            }`}
                          >
                            CONFIRM SECURE
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[9px] text-zinc-500 font-mono font-medium text-center py-1 flex items-center gap-1.5 justify-center opacity-85 select-none w-full">
                        <span className="h-1 w-1 rounded-full bg-zinc-600 animate-pulse" />
                        <span>Tap any coordinate intersection on the grid to deploy a firewall.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center w-full text-zinc-500 text-xs py-2 uppercase tracking-wider animate-pulse">
                    Waiting for {turn === 1 ? p1Name : p2Name}'s mainframe sequence...
                  </div>
                )}
              </div>
            )}

            {/* Emotes Row */}
            <div className="flex gap-2.5 justify-center mb-6 z-10 relative">
              {['👏', '🤔', '😭', '🔥'].map(emoji => (
                <button 
                  key={emoji} 
                  onClick={() => { playSound('move'); sendEmote(emoji); }}
                  className="w-10 h-10 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 rounded-xl flex items-center justify-center text-xl transition-transform hover:scale-108 active:scale-90 cursor-pointer shadow-md"
                >
                  {emoji}
                </button>
              ))}
              {gameData.lastEmote && (Date.now() - getTimestampMillis(gameData.lastEmote.timestamp) < 5000) && (
                <div className="flex items-center ml-4 bg-zinc-950 border border-zinc-850 px-3.5 py-1.5 rounded-xl shadow-lg animate-bounce z-20">
                  <span className="text-2xl">{gameData.lastEmote.emoji}</span>
                  <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase ml-2 tracking-wider">
                    {gameData.lastEmote.senderId === user.uid ? 'You' : 'Opponent'}
                  </span>
                </div>
              )}
            </div>

            {/* Responsive Grid Game Board Container */}
            <div className="relative select-none p-2 sm:p-4 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden w-full max-w-[95vw] sm:max-w-md md:max-w-lg aspect-square mx-auto mb-6 max-h-[60vh] sm:max-h-[65vh]">
              <div 
                className={`grid relative w-full h-full transition-transform duration-500 ${myPlayerNumber === 1 ? 'rotate-180' : ''}`}
                style={{
                  gridTemplateRows: "repeat(8, minmax(0, 1fr) min(2.5vw, 12px)) minmax(0, 1fr)",
                  gridTemplateColumns: "repeat(8, minmax(0, 1fr) min(2.5vw, 12px)) minmax(0, 1fr)",
                }}
                onMouseLeave={() => setHoverIntersect(null)}
              >
                {/* Target Lines */}
                <div className={`absolute top-0 left-0 w-full h-0.5 opacity-30 -translate-y-2 rounded-full ${theme.p1.color}`} />
                <div className={`absolute bottom-0 left-0 w-full h-0.5 opacity-30 translate-y-2 rounded-full ${theme.p2.color}`} />
                
                {renderGridCells()}
                {renderPlacedWalls()}
                {renderIntersections()}
              </div>
            </div>
          </div>
          
        </div>

        {/* Right column: Move History sidebar */}
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

          {/* Move list */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            {(history?.length || 0) === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <p className="text-xs font-mono text-zinc-500">Simulation log empty.</p>
                <p className="text-[10px] text-zinc-655 mt-1">Make a core move or firewall lock to print records.</p>
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
            <span>ONLINE INTERFACE LOG</span>
            <span className="animate-pulse flex items-center gap-1 font-semibold text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
              LIVE LINK
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
