import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { user, loading, userStats, loginGoogle, loginAnon, logout } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginAnon = async () => {
    try {
      setErrorMsg('');
      await loginAnon();
    } catch (e: any) {
      if (e.code === 'auth/admin-restricted-operation') {
        setErrorMsg('Anonymous login is currently disabled. Please enable it in your Firebase Console (Authentication > Sign-in method > Anonymous).');
      } else {
        setErrorMsg(e.message || 'An error occurred during sign in.');
      }
    }
  };

  const handleLoginGoogle = async () => {
    try {
      setErrorMsg('');
      await loginGoogle();
    } catch (e: any) {
      setErrorMsg(e.message || 'An error occurred during Google sign in.');
    }
  };

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

  const rank = getRank(userStats?.trophies || 0);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
      <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-amber-500 py-2">
        Barricade
      </h1>
      <p className="text-zinc-400 mb-12 text-center max-w-sm">
        A strategic 2-player board game where you must reach the opposite side before your opponent blocks you.
      </p>

      {loading ? (
        <div className="text-zinc-500">Loading auth...</div>
      ) : user ? (
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-2xl mb-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div>
              <p className="text-sm text-zinc-400">Signed in as</p>
              <p className="font-bold">{user.displayName || 'Guest'}</p>
              <div className="flex items-center gap-2 mt-1">
                 <span className={`text-xs font-bold uppercase tracking-wider ${rank.color}`}>{rank.name}</span>
                 <span className="text-xs text-zinc-500 font-medium bg-zinc-800 px-2 rounded-full">🏆 {userStats?.trophies || 0}</span>
              </div>
            </div>
            <button onClick={logout} className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors">
              Sign Out
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center mb-4">
            <div className="bg-zinc-950 rounded-lg p-2">
               <p className="text-xs text-zinc-500 font-bold uppercase">Games</p>
               <p className="font-bold text-lg">{userStats?.gamesPlayed || 0}</p>
            </div>
             <div className="bg-cyan-950/20 border border-cyan-900/30 rounded-lg p-2 text-cyan-400">
               <p className="text-xs font-bold uppercase opacity-80">Wins</p>
               <p className="font-bold text-lg">{userStats?.wins || 0}</p>
            </div>
            <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-2 text-amber-500">
               <p className="text-xs font-bold uppercase opacity-80">Losses</p>
               <p className="font-bold text-lg">{userStats?.losses || 0}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => navigate('/local')}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-lg rounded-xl transition-all"
            >
              Play Locally (Offline)
            </button>
            <button 
              onClick={() => navigate('/online')}
              className="w-full py-4 bg-white text-zinc-900 font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Play Online
            </button>
            <button 
              onClick={() => navigate('/leaderboard')}
              className="w-full py-3 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-800 text-amber-500 hover:text-amber-400 font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2"
            >
              🏆 Global Leaderboard
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-2xl mb-8 space-y-4">
          <p className="mb-4 text-center text-zinc-400">Sign in to save your stats and play online.</p>
          {errorMsg && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg text-center mb-4 leading-relaxed">
              {errorMsg}
            </div>
          )}
          <button 
            onClick={handleLoginGoogle}
            className="w-full py-4 bg-white text-zinc-900 font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Sign in with Google
          </button>
          <button 
             onClick={handleLoginAnon}
             className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all"
          >
            Play as Guest
          </button>
          <button 
             onClick={() => navigate('/local')}
             className="w-full py-3 bg-transparent text-zinc-500 hover:text-zinc-300 font-medium transition-all text-sm"
          >
            Play Offline Only
          </button>
        </div>
      )}
    </div>
  );
}
