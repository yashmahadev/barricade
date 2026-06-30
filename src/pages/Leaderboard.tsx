import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { playSound } from '../lib/audio';
import { Trophy, ArrowLeft, Shield, Terminal, Target } from 'lucide-react';

interface UserData {
  uid: string;
  name: string;
  trophies: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
}

export default function Leaderboard() {
  const [players, setPlayers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          orderBy('trophies', 'desc'),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const fetchedPlayers = snapshot.docs.map(doc => {
          const data = doc.data();
          // CRITICAL FIX: Retrieve data.displayName since that's what's saved in AuthContext.tsx
          return {
            uid: data.uid,
            name: data.displayName || data.name || 'Anonymous User',
            trophies: data.trophies || 0,
            gamesPlayed: data.gamesPlayed || 0,
            wins: data.wins || 0,
            losses: data.losses || 0,
          } as UserData;
        });
        setPlayers(fetchedPlayers);
      } catch (e) {
        console.error("Error fetching leaderboard: ", e);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankInfo = (trophies: number) => {
    if (trophies < 100) return { name: 'Bronze III', color: 'text-amber-700/80 border-amber-700/30 bg-amber-950/10' };
    if (trophies < 200) return { name: 'Bronze II', color: 'text-amber-700 border-amber-700/40 bg-amber-950/10' };
    if (trophies < 300) return { name: 'Bronze I', color: 'text-amber-600 border-amber-600/40 bg-amber-950/10' };
    if (trophies < 500) return { name: 'Silver III', color: 'text-slate-400 border-slate-400/30 bg-slate-900/10' };
    if (trophies < 800) return { name: 'Silver II', color: 'text-slate-300 border-slate-300/45 bg-slate-900/10' };
    if (trophies < 1200) return { name: 'Silver I', color: 'text-slate-100 border-slate-100/50 bg-slate-900/10' };
    if (trophies < 2000) return { name: 'Gold III', color: 'text-yellow-600 border-yellow-600/40 bg-yellow-950/10' };
    if (trophies < 3000) return { name: 'Gold II', color: 'text-yellow-500 border-yellow-500/50 bg-yellow-950/10' };
    if (trophies < 4000) return { name: 'Gold I', color: 'text-yellow-400 border-yellow-400/60 bg-yellow-950/10' };
    return { name: 'Grandmaster', color: 'text-purple-400 border-purple-500/50 bg-purple-950/10 animate-pulse font-black' };
  };

  return (
    <div className="min-h-screen cyber-grid-bg text-zinc-100 flex flex-col items-center p-4 md:p-6 font-sans relative overflow-x-hidden selection:bg-cyan-500/30">
      <div className="absolute inset-0 scanline pointer-events-none opacity-20" />
      <div className="cyber-scanner" />

      {/* Header Row */}
      <div className="w-full max-w-3xl flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 z-10 pt-4">
        <button 
          onClick={() => { playSound('error'); navigate('/'); }} 
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-all bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-4 py-2.5 rounded-xl font-mono text-xs cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN LOBBY</span>
        </button>

        <h1 className="text-3xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-600 drop-shadow-[0_0_12px_rgba(245,158,11,0.3)] flex items-center gap-2">
          <Trophy className="w-7 h-7 text-amber-500" />
          <span>CYBERNETIC RATINGS</span>
        </h1>

        <div className="w-24 hidden sm:block"></div> {/* Centering balancing spacer */}
      </div>

      {/* Leaderboard Table Container */}
      <div className="w-full max-w-3xl glass-panel-glow border-zinc-800 rounded-2xl overflow-hidden shadow-2xl z-10 mb-12">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center font-mono text-xs">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="uppercase tracking-widest">Querying mainframes...</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80 font-sans">
            
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 px-6 py-4.5 bg-zinc-950/60 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-850">
              <div className="col-span-1.5 text-center">No.</div>
              <div className="col-span-6 flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>Alias Operator</span>
              </div>
              <div className="col-span-2 text-center flex items-center justify-center gap-1">
                <Target className="w-3.5 h-3.5 text-amber-500" />
                <span>Rating</span>
              </div>
              <div className="col-span-2.5 text-right flex items-center justify-end gap-1">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Win Rate</span>
              </div>
            </div>
            
            {players.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 font-mono text-xs uppercase tracking-wider">
                No active records discovered.
              </div>
            ) : (
              players.map((player, idx) => {
                const rankInfo = getRankInfo(player.trophies);
                const winRate = player.gamesPlayed > 0 
                  ? Math.round((player.wins / player.gamesPlayed) * 100) 
                  : 0;

                // Glowing highlight for Top 3
                const isTop3 = idx < 3;
                const podiumColors = [
                  'text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]', // Gold
                  'text-zinc-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.5)]',  // Silver
                  'text-amber-600 drop-shadow-[0_0_8px_rgba(180,83,9,0.5)]'    // Bronze
                ];
                const bgColors = isTop3 
                  ? ['bg-yellow-950/5 border-yellow-900/10', 'bg-zinc-900/5 border-zinc-700/10', 'bg-amber-950/5 border-amber-900/10'][idx]
                  : 'hover:bg-zinc-900/40';

                return (
                  <div 
                    key={player.uid} 
                    className={`grid grid-cols-12 gap-3 px-6 py-4 items-center transition-colors border-l-2 ${
                      isTop3 
                        ? ['border-yellow-500', 'border-zinc-400', 'border-amber-700'][idx] 
                        : 'border-transparent'
                    } ${bgColors}`}
                  >
                    {/* Rank Number */}
                    <div className="col-span-1.5 font-mono text-sm font-black flex items-center justify-center">
                      {isTop3 ? (
                        <span className={`text-xl ${podiumColors[idx]}`}>
                          {['🥇', '🥈', '🥉'][idx]}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">#{idx + 1}</span>
                      )}
                    </div>

                    {/* Username & Rank Name */}
                    <div className="col-span-6 flex flex-col min-w-0 pr-2">
                      <span className={`font-bold truncate text-sm ${isTop3 ? 'text-zinc-100 text-[15px]' : 'text-zinc-300'}`}>
                        {player.name}
                      </span>
                      <span className="inline-flex self-start mt-0.5">
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border rounded-md leading-none ${rankInfo.color}`}>
                          {rankInfo.name}
                        </span>
                      </span>
                    </div>

                    {/* Trophy Count */}
                    <div className="col-span-2 text-center font-mono font-bold">
                      <span className={isTop3 ? podiumColors[idx] : 'text-amber-500'}>
                        🏆 {player.trophies}
                      </span>
                    </div>

                    {/* Stats details (Wins / Losses / WR) */}
                    <div className="col-span-2.5 flex justify-end items-center gap-3">
                      <div className="text-right flex flex-col font-mono text-[11px] leading-tight">
                        <span className="font-semibold text-zinc-300">
                          <span className="text-cyan-400">{player.wins}W</span>
                          <span className="text-zinc-700 mx-1">/</span>
                          <span className="text-red-400">{player.losses}L</span>
                        </span>
                        <span className="text-[10px] text-zinc-500 mt-0.5">
                          {winRate}% WR
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
