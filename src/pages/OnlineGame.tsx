import { useState, useEffect, useRef } from 'react';
import { canPlaceWall, getValidMoves, Position } from '../game/logic';
import { RotateCcw, Minus, X, Home, History } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '../lib/audio';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getBotAction } from '../game/bot';

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

  // Derive all data with safe fallbacks so hooks can be declared unconditionally
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
          } catch(e) {
            console.error("Error parsing hWalls: ", e);
          }
        }
        if (typeof data.vWalls === 'string') {
          try {
            data.vWalls = JSON.parse(data.vWalls);
          } catch(e) {
            console.error("Error parsing vWalls: ", e);
          }
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
            updates.history = [...history, `${p2Name} moved to Row ${newPos.r + 1}, Col ${newPos.c + 1}`];
            
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
            updates.history = [...history, `${p2Name} placed a ${action.dir === 'H' ? 'Horizontal' : 'Vertical'} wall at Row ${action.r + 1}, Col ${action.c + 1}`];
          }

          await updateDoc(doc(db, 'games', gameId as string), updates);
        }
      }, 700 + Math.random() * 800);

      return () => clearTimeout(timer);
    }
  }, [turn, winner, gameData, user, userStats]);

  // Underneath all hooks, we can safely invoke the Loading / auth early returns!
  if (!gameData || !user) return <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">Loading...</div>;

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
      logMsg = `${p1Name} moved to Row ${r + 1}, Col ${c + 1}`;
      if (r === 8) newWinner = 1;
    } else {
      logMsg = `${p2Name} moved to Row ${r + 1}, Col ${c + 1}`;
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
      // Update global user stats if game finishes
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
        logMsg = `${p1Name} placed a ${wallDirection === 'H' ? 'Horizontal' : 'Vertical'} wall at Row ${r + 1}, Col ${c + 1}`;
        updates.p1Walls = p1Walls - 1;
      } else {
        logMsg = `${p2Name} placed a ${wallDirection === 'H' ? 'Horizontal' : 'Vertical'} wall at Row ${r + 1}, Col ${c + 1}`;
        updates.p2Walls = p2Walls - 1;
      }
      
      updates.history = [...history, logMsg];
      await updateDoc(doc(db, 'games', gameId as string), updates);
      setHoverIntersect(null);
    } else {
      playSound('error');
    }
  };

  const sendEmote = async (emoji: string) => {
    // We could store it in a subcollection or just an ephemeral field
    await updateDoc(doc(db, 'games', gameId as string), {
      lastEmote: {
        senderId: user.uid,
        emoji,
        timestamp: new Date()
      }
    });
  };

  // Rendering the board
  const renderGrid = () => {
    const elements = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const isP1 = p1Pos.r === r && p1Pos.c === c;
        const isP2 = p2Pos.r === r && p2Pos.c === c;
        const isValid = !winner && isMyTurn && validMoves.some((m: Position) => m.r === r && m.c === c);
        
        elements.push(
          <div
            key={`cell-${r}-${c}`}
            className={`w-full h-full rounded-md md:rounded-lg border-[2px] transition-all duration-300 relative ${
               isP1 ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-90' :
               isP2 ? 'bg-amber-500 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.8)] scale-90' :
               isValid ? 'border-zinc-700/80 bg-zinc-800/30 cursor-pointer hover:bg-zinc-700/60 hover:border-zinc-500 hover:scale-[0.98]' :
               'border-zinc-800/50 bg-zinc-900/40'
             }`}
            style={{ gridRow: r * 2 + 1, gridColumn: c * 2 + 1 }}
            onClick={() => handleCellClick(r, c)}
          />
        );

        if (c < 8) {
          const wallOwner = hWalls[r] && hWalls[r][c];
          let wallClass = 'bg-transparent';
          if (wallOwner === 1) wallClass = 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)] z-10';
          if (wallOwner === 2) wallClass = 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)] z-10';
          
          elements.push(
            <div
              key={`hwall-${r}-${c}`}
              className={`transition-all duration-300 rounded-full ${wallClass}`}
              style={{ gridRow: r * 2 + 1, gridColumn: c * 2 + 2 }}
            />
          );
        }

        if (r < 8) {
          const wallOwner = vWalls[r] && vWalls[r][c];
          let wallClass = 'bg-transparent';
          if (wallOwner === 1) wallClass = 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)] z-10';
          if (wallOwner === 2) wallClass = 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)] z-10';
          
          elements.push(
            <div
              key={`vwall-${r}-${c}`}
              className={`transition-all duration-300 rounded-full ${wallClass}`}
              style={{ gridRow: r * 2 + 2, gridColumn: c * 2 + 1 }}
            />
          );
        }

        if (r < 8 && c < 8) {
          const isSelected = selectedWall?.r === r && selectedWall?.c === c;
          const isHovered = hoverIntersect?.r === r && hoverIntersect?.c === c;
          const isActivePreview = isHovered || (isMyTurn && isSelected);
          let previewClass = '';
          let previewStyle = {};

          if (isActivePreview && !winner && isMyTurn && currentPlayerWalls > 0) {
            const tempH = hWalls.map((row: any) => [...row]);
            const tempV = vWalls.map((row: any) => [...row]);
            const placeable = canPlaceWall(r, c, wallDirection, tempH, tempV, p1Pos, p2Pos);
            
            const activeColor = turn === 1 ? 'bg-cyan-500/50' : 'bg-amber-500/50';
            const activeShadow = turn === 1 ? 'shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'shadow-[0_0_15px_rgba(245,158,11,0.4)]';
            const highlightClass = isSelected ? `opacity-90 animate-pulse border-2 ${turn === 1 ? 'border-cyan-400' : 'border-amber-400'}` : 'opacity-65';

            previewClass = placeable ? `${highlightClass} ${activeColor} ${activeShadow}` : 'opacity-50 bg-red-500/50';
            previewStyle = wallDirection === 'H' 
              ? { gridRow: r * 2 + 2, gridColumn: `${c * 2 + 1} / span 3` }
              : { gridColumn: c * 2 + 2, gridRow: `${r * 2 + 1} / span 3` };
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
    }
    return elements;
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center py-10 font-sans">
      <div className="max-w-xl md:max-w-5xl w-full px-4 flex flex-col md:flex-row items-center justify-between mb-8 pb-4 border-b border-zinc-900">
        <h1 className="text-3xl font-bold tracking-tight mb-4 md:mb-0 flex items-center gap-2">
          <span>Barricade Online</span>
          {gameData?.isRanked && <span className="text-[10px] bg-amber-500/10 text-amber-500 font-bold px-2 py-0.5 rounded-full ring-1 ring-amber-500/20 uppercase tracking-widest leading-none">Ranked</span>}
        </h1>
        <div className="flex gap-2">
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
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs md:text-sm font-medium px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md ring-1 ring-white/10 transition-colors text-zinc-300 shadow-md"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-5xl px-4 flex flex-col lg:flex-row gap-8 items-start justify-center">
        {/* Left column: Board, players, central turn indicator */}
        <div className="flex-1 max-w-xl mx-auto w-full flex flex-col items-center">
          
          <div className="w-full flex justify-between items-center mb-4 sm:mb-8 text-sm sm:text-base gap-4 relative">
            <div className={`flex flex-col items-start px-3 py-2 sm:px-5 sm:py-4 rounded-xl border-2 transition-all duration-300 ${turn === 1 ? 'border-cyan-500 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-105' : 'border-transparent bg-zinc-900/50 opacity-50 scale-100'}`}>
              <span className="text-cyan-400 font-bold text-base sm:text-lg">{p1Name} {myPlayerNumber === 1 && '(You)'}</span>
              <span className="text-xs sm:text-sm font-medium text-cyan-200/60">{p1Walls} walls</span>
            </div>

            {winner ? (
              <div className="text-center flex-1 flex flex-col items-center z-10">
                <span className={`text-xl sm:text-2xl font-black tracking-tight ${winner === 1 ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]'}`}>
                  {winner === 1 ? p1Name : p2Name} Wins!
                </span>
                {gameData?.isRanked && (
                  <>
                    {myPlayerNumber === winner ? (
                      <span className="text-emerald-400 font-bold animate-bounce text-sm mt-1">🏆 +30 Trophies</span>
                    ) : (
                      <span className="text-red-400 font-bold text-sm mt-1">🔻 -10 Trophies</span>
                    )}
                  </>
                )}
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
                    {isMyTurn ? "Your Turn" : "Their Turn"}
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

            <div className={`flex flex-col items-end px-3 py-2 sm:px-5 sm:py-4 rounded-xl border-2 transition-all duration-300 ${turn === 2 ? 'border-amber-500 bg-amber-950/30' : 'border-transparent bg-zinc-900/50 opacity-60'}`}>
              <span className="text-amber-500 font-bold text-base sm:text-lg">{p2Name} {myPlayerNumber === 2 && '(You)'}</span>
              <span className="text-xs sm:text-sm font-medium text-amber-200/60">{p2Walls} walls</span>
            </div>
          </div>

      <div className="w-full max-w-xl px-4 flex flex-col items-center">
        {!winner && (
          <div className="mb-4 sm:mb-6 text-zinc-400 text-xs sm:text-sm font-medium flex flex-col items-center justify-between w-full gap-4">
            {isMyTurn ? (
              <div className="flex flex-col items-center gap-3 w-full">
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
                          if (canPlaceWall(selectedWall.r, selectedWall.c, wallDirection, hWalls, vWalls, p1Pos, p2Pos)) {
                            handleWallClick(selectedWall.r, selectedWall.c);
                          } else {
                            playSound('error');
                          }
                        }}
                        className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 shadow-md shadow-black/30 ${
                          canPlaceWall(selectedWall.r, selectedWall.c, wallDirection, hWalls, vWalls, p1Pos, p2Pos)
                            ? (turn === 1 ? 'bg-cyan-400 hover:bg-cyan-300 text-cyan-950' : 'bg-amber-400 hover:bg-amber-300 text-amber-950')
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
                    <span>Tap any grid crossing on the board to draft/preview, then confirm.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center w-full text-zinc-500 text-xs sm:text-sm py-2">
                Waiting for {turn === 1 ? p1Name : p2Name}'s action...
              </div>
            )}
          </div>
        )}

        {/* Emotes Row */}
        <div className="flex gap-2 mb-4">
          {['👏', '🤔', '😭', '🔥'].map(emoji => (
            <button 
              key={emoji} 
              onClick={() => sendEmote(emoji)}
              className="w-10 h-10 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 rounded-full flex items-center justify-center text-xl transition-transform hover:scale-110 active:scale-90"
            >
              {emoji}
            </button>
          ))}
          {gameData.lastEmote && (Date.now() - getTimestampMillis(gameData.lastEmote.timestamp) < 5000) && (
            <div className="flex items-center ml-4 animate-bounce">
              <span className="text-2xl">{gameData.lastEmote.emoji}</span>
              <span className="text-xs text-zinc-500 ml-2">{gameData.lastEmote.senderId === user.uid ? 'You' : 'Opponent'}</span>
            </div>
          )}
        </div>

        <div className="relative select-none p-2 sm:p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden w-full max-w-[95vw] sm:max-w-md md:max-w-lg aspect-square mx-auto mb-8">
          <div 
            className={`grid relative w-full h-full transition-transform duration-500 ${myPlayerNumber === 1 ? 'rotate-180' : ''}`}
            style={{
              gridTemplateRows: "repeat(8, minmax(0, 1fr) min(2.5vw, 12px)) minmax(0, 1fr)",
              gridTemplateColumns: "repeat(8, minmax(0, 1fr) min(2.5vw, 12px)) minmax(0, 1fr)",
            }}
            onMouseLeave={() => setHoverIntersect(null)}
          >
            {/* Target Lines */}
            <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/20 -translate-y-2 rounded-full" />
            <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500/20 translate-y-2 rounded-full" />
            
            {renderGrid()}
          </div>
        </div>
      </div>
      
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
            <div className="relative border-l border-zinc-800/80 ml-3 pl-4 space-y-3.5 py-2">
              {history.map((log: string, idx: number) => {
                const isP1 = log.includes(p1Name);
                const isGameOver = log.toLowerCase().includes('over') || log.toLowerCase().includes('wins') || log.toLowerCase().includes('won');
                
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
          <span>Barricade Strategy Log</span>
          <span className="animate-pulse flex items-center gap-1 font-semibold text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
            LIVE
          </span>
        </div>
      </div>
    </div>
   </div>
  );
}
