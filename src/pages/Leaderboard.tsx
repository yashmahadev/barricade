import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

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
          return {
            uid: data.uid,
            name: data.name || 'Anonymous',
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

  const getRank = (trophies: number) => {
    if (trophies < 100) return { name: 'Bronze I', color: 'text-orange-400' };
    if (trophies < 200) return { name: 'Bronze II', color: 'text-orange-400' };
    if (trophies < 300) return { name: 'Bronze III', color: 'text-orange-400' };
    if (trophies < 500) return { name: 'Silver I', color: 'text-zinc-300' };
    if (trophies < 800) return { name: 'Silver II', color: 'text-zinc-300' };
    if (trophies < 1200) return { name: 'Silver III', color: 'text-zinc-300' };
    if (trophies < 2000) return { name: 'Gold I', color: 'text-yellow-400' };
    if (trophies < 3000) return { name: 'Gold II', color: 'text-yellow-400' };
    return { name: 'Grandmaster', color: 'text-purple-400 animate-pulse' };
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center p-6 font-sans">
      <div className="w-full max-w-3xl flex justify-between items-center mb-8">
        <button onClick={() => navigate('/')} className="text-zinc-400 hover:text-white mb-4 inline-block px-4 py-2 bg-zinc-900 rounded-lg">
          ← Back
        </button>
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
          Global Leaderboard
        </h1>
        <div className="w-20"></div> {/* Spacer for centering */}
      </div>

      <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading top players...</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-zinc-950/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-5">Player</div>
              <div className="col-span-2 text-center">Trophies</div>
              <div className="col-span-4 text-right">Win/Loss</div>
            </div>
            
            {players.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No players found.</div>
            ) : (
              players.map((player, idx) => {
                const rank = getRank(player.trophies);
                const winRate = player.gamesPlayed > 0 
                  ? Math.round((player.wins / player.gamesPlayed) * 100) 
                  : 0;

                return (
                  <div key={player.uid} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-800/50 transition-colors">
                    <div className="col-span-1 text-center font-black text-lg text-zinc-500">
                      {idx + 1}
                    </div>
                    <div className="col-span-5 flex flex-col">
                      <span className="font-bold text-zinc-200 truncate">{player.name}</span>
                      <span className={`text-xs font-bold uppercase tracking-wider ${rank.color}`}>
                        {rank.name}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="font-bold text-amber-500">🏆 {player.trophies}</span>
                    </div>
                    <div className="col-span-4 flex justify-end items-center gap-3">
                      <div className="text-right flex flex-col">
                        <span className="text-sm font-medium">
                          <span className="text-cyan-400">{player.wins}W</span>
                          <span className="text-zinc-600 mx-1">-</span>
                          <span className="text-red-400">{player.losses}L</span>
                        </span>
                        <span className="text-xs text-zinc-500">{winRate}% WR</span>
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
