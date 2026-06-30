import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { GAME_THEMES, getSavedTheme, saveTheme, GameTheme } from '../lib/theme';
import { playSound, startBGM, stopBGM, toggleMusic } from '../lib/audio';
import { 
  Volume2, VolumeX, Music, HelpCircle, Trophy, 
  Settings, LogOut, ChevronRight, Gamepad2, Users, Info, Sparkles
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { user, loading, userStats, loginGoogle, loginAnon, logout } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');
  
  // Theme and Sound Settings States
  const [activeTheme, setActiveTheme] = useState<GameTheme>(getSavedTheme());
  const [musicMuted, setMusicMuted] = useState(localStorage.getItem('barricadeMusicMuted') === 'true');
  const [sfxMuted, setSfxMuted] = useState(localStorage.getItem('barricadeSfxMuted') === 'true');
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize and run audio on interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      startBGM();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    
    // Attempt auto-start if already interacted
    startBGM();

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const handleLoginAnon = async () => {
    try {
      playSound('move');
      setErrorMsg('');
      await loginAnon();
    } catch (e: any) {
      playSound('error');
      if (e.code === 'auth/admin-restricted-operation') {
        setErrorMsg('Guest access disabled in Firebase Console. Please register with Google.');
      } else {
        setErrorMsg(e.message || 'An error occurred during Guest sign-in.');
      }
    }
  };

  const handleLoginGoogle = async () => {
    try {
      playSound('move');
      setErrorMsg('');
      await loginGoogle();
    } catch (e: any) {
      playSound('error');
      setErrorMsg(e.message || 'An error occurred during Google sign-in.');
    }
  };

  const handleLogout = async () => {
    playSound('error');
    await logout();
  };

  const handleThemeChange = (themeId: string) => {
    playSound('move');
    saveTheme(themeId);
    setActiveTheme(GAME_THEMES[themeId]);
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
    if (!nextMuted) {
      playSound('move');
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
    <div className="min-h-screen cyber-grid-bg text-zinc-100 flex flex-col items-center justify-center p-4 md:p-6 font-sans overflow-x-hidden relative selection:bg-cyan-500/30">
      {/* Scanline and Laser Animation Overlays */}
      <div className="absolute inset-0 scanline pointer-events-none opacity-20" />
      <div className="cyber-scanner" />

      {/* Floating Header Audio Settings */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-30">
        <button 
          onClick={handleToggleMusic}
          className={`p-3 rounded-lg border transition-all ${
            !musicMuted 
              ? 'bg-cyan-950/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
              : 'bg-zinc-900 border-zinc-800 text-zinc-500'
          }`}
          title="Toggle Procedural Music"
        >
          <Music className="w-5 h-5" />
        </button>
        <button 
          onClick={handleToggleSfx}
          className={`p-3 rounded-lg border transition-all ${
            !sfxMuted 
              ? 'bg-amber-950/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
              : 'bg-zinc-900 border-zinc-800 text-zinc-500'
          }`}
          title="Toggle SFX Blips"
        >
          {sfxMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <button 
          onClick={() => { playSound('move'); setShowSettings(!showSettings); }}
          className={`p-3 rounded-lg border transition-all ${
            showSettings 
              ? 'bg-zinc-800 border-zinc-700 text-white' 
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Main Terminal Frame */}
      <div className="w-full max-w-xl flex flex-col items-center z-10">
        
        {/* Glowing Logo Section */}
        <div className="text-center mb-10 select-none">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/20 text-cyan-400 text-[10px] font-bold tracking-widest uppercase mb-4 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cyber Strategy Protocol</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-mono font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-zinc-100 to-amber-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)] select-none">
            BARRICADE
          </h1>
          <p className="text-zinc-500 font-medium text-xs mt-2 uppercase tracking-[0.3em]">
            Cyber Grid Intruder Clash
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="w-full bg-red-950/40 border border-red-500/50 text-red-200 text-xs p-3.5 rounded-xl text-center mb-6 leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Dynamic Card Area */}
        {loading ? (
          <div className="w-full glass-panel-glow p-8 rounded-2xl text-center flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase">Decryption in progress...</p>
          </div>
        ) : user ? (
          <div className="w-full space-y-6">
            
            {/* User Profile Card */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-zinc-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-cyan-500/10 border-l border-b border-cyan-500/20 px-2 py-0.5 rounded-bl-lg text-[9px] font-mono text-cyan-400 uppercase tracking-widest">
                Node Connected
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-2xl shadow-inner">
                  👤
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Hacker Alias</p>
                  <p className="font-bold text-zinc-200">{user.displayName || 'Guest'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${rank.color}`}>{rank.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono bg-zinc-950 px-2.5 py-0.5 border border-zinc-800 rounded-full">🏆 {userStats?.trophies || 0}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleLogout} 
                className="flex items-center gap-1 text-xs px-3 py-2 bg-red-950/20 border border-red-900/30 hover:bg-red-900/20 text-red-400 rounded-lg transition-colors font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-950/50 border border-zinc-900 rounded-xl p-3 text-center">
                <p className="text-[9px] text-zinc-500 font-mono uppercase font-bold tracking-wider mb-1">Grid Syncs</p>
                <p className="font-mono font-black text-xl text-zinc-300">{userStats?.gamesPlayed || 0}</p>
              </div>
              <div className="bg-cyan-950/10 border border-cyan-950/40 rounded-xl p-3 text-center">
                <p className="text-[9px] text-cyan-500 font-mono uppercase font-bold tracking-wider mb-1">Breaches (Wins)</p>
                <p className="font-mono font-black text-xl text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.3)]">{userStats?.wins || 0}</p>
              </div>
              <div className="bg-amber-950/10 border border-amber-950/40 rounded-xl p-3 text-center">
                <p className="text-[9px] text-amber-500 font-mono uppercase font-bold tracking-wider mb-1">Intercepted</p>
                <p className="font-mono font-black text-xl text-amber-500">{userStats?.losses || 0}</p>
              </div>
            </div>

            {/* Interactive Settings Drawer */}
            {showSettings && (
              <div className="glass-panel p-5 rounded-2xl border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)] space-y-4 animate-fade-in">
                <h3 className="text-sm font-mono font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Settings className="w-4 h-4 animate-spin-slow" />
                  <span>Protocol Customization</span>
                </h3>
                
                {/* Theme Selector */}
                <div className="space-y-2">
                  <p className="text-[10px] text-zinc-500 font-mono uppercase font-bold tracking-wider">Interface Visual Skin</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(GAME_THEMES).map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleThemeChange(t.id)}
                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                          activeTheme.id === t.id 
                            ? 'bg-zinc-800/80 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.15)] text-white' 
                            : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-300'
                        }`}
                      >
                        <span className="text-xs font-bold font-mono">{t.name}</span>
                        <div className="flex gap-1.5 mt-1.5">
                          <span className={`w-3.5 h-3.5 rounded-full border border-white/20 ${t.p1.color}`} />
                          <span className={`w-3.5 h-3.5 rounded-full border border-white/20 ${t.p2.color}`} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation options */}
            <div className="space-y-3">
              <button 
                onClick={() => { playSound('move'); navigate('/local'); }}
                className="w-full py-4 glass-panel border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60 text-zinc-200 font-mono text-base font-bold rounded-xl transition-all flex items-center justify-between px-6 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Gamepad2 className="w-5 h-5 text-cyan-400 group-hover:animate-pulse" />
                  <span>PLAY LOCAL PROXY (OFFLINE)</span>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => { playSound('move'); navigate('/online'); }}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-emerald-600 text-zinc-950 font-mono text-base font-black rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(6,182,212,0.3)] flex items-center justify-between px-6 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-zinc-950" />
                  <span>BREACH NETWORKS (ONLINE MATCH)</span>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-950 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => { playSound('move'); navigate('/leaderboard'); }}
                  className="py-3.5 bg-zinc-950/50 hover:bg-zinc-900/50 border border-zinc-900 hover:border-zinc-800 text-amber-500 font-mono text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-amber-500 group-hover:animate-bounce" />
                  <span>GLOBAL RATINGS</span>
                </button>
                
                <button 
                  onClick={() => { playSound('move'); setShowRules(true); }}
                  className="py-3.5 bg-zinc-950/50 hover:bg-zinc-900/50 border border-zinc-900 hover:border-zinc-800 text-zinc-300 font-mono text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-zinc-400 group-hover:rotate-12 transition-transform" />
                  <span>TACTICAL GUIDE</span>
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* Login Dialog */
          <div className="w-full glass-panel-glow border-zinc-800 p-6 md:p-8 rounded-2xl shadow-2xl space-y-6">
            <p className="text-center text-zinc-400 font-sans text-sm leading-relaxed">
              Login to synchronize security nodes, save credentials, and participate in global ranked ratings.
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={handleLoginGoogle}
                className="w-full py-4 bg-white text-zinc-950 font-mono text-base font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <span>🔑</span>
                <span>AUTHENTICATE WITH GOOGLE</span>
              </button>
              <button 
                onClick={handleLoginAnon}
                className="w-full py-3.5 bg-zinc-800/80 hover:bg-zinc-700 text-white font-mono text-sm font-semibold rounded-xl border border-zinc-700/50 transition-all cursor-pointer"
              >
                PLAY AS PROXY (GUEST)
              </button>
              <button 
                onClick={() => { playSound('move'); navigate('/local'); }}
                className="w-full py-3 bg-transparent text-zinc-500 hover:text-zinc-300 font-mono text-xs font-semibold transition-all text-center cursor-pointer"
              >
                LAUNCH STANDALONE OFFLINE LOBBY
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rules overlay Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel-glow border-cyan-500/40 rounded-2xl p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative scrollbar-thin">
            
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-zinc-800">
              <h2 className="text-xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-500 flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-400" />
                <span>GRID STRATEGY PROTOCOLS</span>
              </h2>
              <button 
                onClick={() => { playSound('error'); setShowRules(false); }}
                className="text-zinc-500 hover:text-white transition-colors p-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono font-bold"
              >
                [CLOSE]
              </button>
            </div>

            <div className="space-y-6 text-sm text-zinc-300 leading-relaxed font-sans">
              <div className="p-3.5 bg-cyan-950/20 border border-cyan-900/30 rounded-xl">
                <p className="font-mono text-xs font-bold text-cyan-400 uppercase mb-1">System Objective</p>
                <p className="text-zinc-300 text-xs">
                  Transmit your network core (pawn) from your boundary line to the opposite boundary line. 
                  The first core to breach the final row of the grid wins the round.
                </p>
              </div>

              <div className="space-y-4">
                <p className="font-mono text-xs font-bold text-amber-500 uppercase tracking-widest">Active Operations (Per Turn)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg">
                    <span className="font-bold text-zinc-100 block mb-1">1. Shift Core (Move)</span>
                    Advance 1 step vertically or horizontally into an unoccupied adjacent node.
                  </div>
                  <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg">
                    <span className="font-bold text-zinc-100 block mb-1">2. Erect Firewall (Wall)</span>
                    Place a 2-unit firewall block between node lanes to intercept and reroute enemy movement.
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                <p className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-widest">Special Routing Rules</p>
                <ul className="list-disc pl-4 space-y-2.5 text-xs text-zinc-400">
                  <li>
                    <strong className="text-zinc-200">System Overlap (Pawn Jump):</strong> If you face the opponent directly on adjacent nodes, you can leap over their core to land behind them.
                  </li>
                  <li>
                    <strong className="text-zinc-200">Boundary Block (Walls):</strong> If a firewall blocks a straight jump, you can jump diagonally to either side of the opponent.
                  </li>
                  <li>
                    <strong className="text-zinc-200">Node Reachability Constraint:</strong> Firewalls block coordinate paths but <span className="text-red-400 font-bold">MUST NOT</span> lock a core in completely. You cannot block all possible paths to the goal; at least one route must remain accessible to the destination row for both systems at all times.
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8">
              <button 
                onClick={() => { playSound('move'); setShowRules(false); }}
                className="w-full py-3.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-cyan-400 font-mono text-xs font-bold rounded-xl transition-all"
              >
                PROCEED TO MISSION GRID
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
