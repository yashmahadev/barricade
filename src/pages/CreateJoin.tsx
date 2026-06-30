import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, doc, setDoc, query, where, limit, getDocs } from 'firebase/firestore';
import { playSound } from '../lib/audio';
import { ArrowLeft, Swords, UserPlus, Key, Info, HelpCircle } from 'lucide-react';

export default function CreateJoin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const findRandomMatch = async () => {
    if (!user) {
      setErrorMsg("Must be logged in.");
      return;
    }
    if (user.isAnonymous) {
      playSound('error');
      setErrorMsg("Global & Ranked matchmaking is restricted to registered profiles. Please sign in with Google to play.");
      return;
    }
    setErrorMsg('');
    setLoading(true);
    playSound('move');

    try {
      const matchQuery = query(
        collection(db, 'games'),
        where('status', '==', 'waiting_random'),
        limit(5)
      );

      const querySnapshot = await getDocs(matchQuery);
      
      if (!querySnapshot.empty) {
        // Find a match hosted by someone else
        const validMatch = querySnapshot.docs.find(d => d.data().hostId !== user.uid);
        
        if (validMatch) {
           setLoading(false);
           playSound('wall');
           navigate(`/wait/${validMatch.id}`);
           return;
        }
      }
      
      const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const emptyBoard = Array(8).fill(null).map(() => Array(8).fill(null));

      await setDoc(doc(db, 'games', gameId), {
        status: 'waiting_random',
        isRanked: true,
        hostId: user.uid,
        hostName: user.displayName || 'Player 1',
        guestId: null,
        guestName: null,
        timeLimit: 30,
        initialWalls: 10,
        createdAt: new Date(),
        p1Pos: { r: 0, c: 4 },
        p2Pos: { r: 8, c: 4 },
        p1Walls: 10,
        p2Walls: 10,
        hWalls: JSON.stringify(emptyBoard),
        vWalls: JSON.stringify(emptyBoard),
        turn: 1,
        winner: null,
        history: [],
        lastMoveTime: new Date()
      });
      
      setLoading(false);
      navigate(`/wait/${gameId}`);
    } catch (e: any) {
      setLoading(false);
      playSound('error');
      setErrorMsg(e.message || 'Error occurred starting matchmaking.');
    }
  };

  const createGame = async () => {
    if (!user) {
      setErrorMsg("Must be logged in.");
      return;
    }
    setErrorMsg('');
    setLoading(true);
    playSound('move');
    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const emptyBoard = Array(8).fill(null).map(() => Array(8).fill(null));

    try {
      await setDoc(doc(db, 'games', gameId), {
        status: 'waiting',
        isRanked: false,
        hostId: user.uid,
        hostName: user.displayName || 'Player 1',
        guestId: null,
        guestName: null,
        timeLimit: 30,
        initialWalls: 10,
        createdAt: new Date(),
        p1Pos: { r: 0, c: 4 },
        p2Pos: { r: 8, c: 4 },
        p1Walls: 10,
        p2Walls: 10,
        hWalls: JSON.stringify(emptyBoard),
        vWalls: JSON.stringify(emptyBoard),
        turn: 1,
        winner: null,
        history: [],
        lastMoveTime: new Date()
      });
      setLoading(false);
      navigate(`/wait/${gameId}`);
    } catch (e: any) {
      setLoading(false);
      playSound('error');
      setErrorMsg(e.message || 'Error occurred creating private match.');
    }
  };

  const joinGame = () => {
    if (!joinCode) return;
    setErrorMsg('');
    playSound('wall');
    navigate(`/wait/${joinCode}`);
  };

  return (
    <div className="min-h-screen cyber-grid-bg text-zinc-100 flex flex-col items-center justify-center p-4 md:p-6 font-sans relative overflow-x-hidden selection:bg-cyan-500/30">
      <div className="absolute inset-0 scanline pointer-events-none opacity-20" />
      <div className="cyber-scanner" />

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-2xl z-10 relative overflow-hidden">
        {/* Decorative corner lights */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-500/60" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-500/60" />
        
        <button 
          onClick={() => { playSound('error'); navigate('/'); }} 
          className="flex items-center gap-1 text-zinc-500 hover:text-white text-xs font-mono font-bold mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>[TERMINATE]</span>
        </button>

        <h2 className="text-2xl font-mono font-black tracking-tight text-zinc-100 mb-2 uppercase flex items-center gap-2">
          <Swords className="w-6 h-6 text-cyan-400" />
          <span>NET MULTIPLAYER</span>
        </h2>
        <p className="text-zinc-500 text-xs font-mono tracking-wide uppercase mb-6">
          Accessing central matchmaking servers
        </p>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-xs p-3.5 rounded-xl text-center mb-6 leading-relaxed">
            {errorMsg}
          </div>
        )}
        
        <div className="space-y-6">
          
          {/* Matchmaking Section */}
          <div className="space-y-3">
            <h3 className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
              <span>01. Public Rated Breach</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            </h3>
            
            {user?.isAnonymous ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                  <span>⚠️ Anonymous Restricted</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Ranked match rates and global trophies are saved to certified profiles only. Authenticate with Google on the home page to play.
                </p>
                <button
                  disabled
                  className="w-full py-3.5 bg-zinc-800 text-zinc-500 font-mono text-sm font-bold rounded-xl cursor-not-allowed border border-zinc-850"
                >
                  RANDOM QUEUE SECURED
                </button>
              </div>
            ) : (
              <button 
                onClick={findRandomMatch} 
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:scale-[1.01] active:scale-[0.99] text-zinc-950 font-mono font-black text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'HACKING MATCHMAKING MAIN...' : 'QUEUE RANDOM MATCH'}
              </button>
            )}
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-zinc-800/80"></div>
            <span className="flex-shrink-0 mx-4 text-zinc-600 font-mono text-[9px] uppercase tracking-widest">Or create private link</span>
            <div className="flex-grow border-t border-zinc-800/80"></div>
          </div>

          {/* Create Private Match Section */}
          <div className="space-y-3">
            <h3 className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">
              02. Initiate LAN Proxy
            </h3>
            <button 
              onClick={createGame} 
              disabled={loading}
              className="w-full py-4 bg-zinc-950 hover:bg-zinc-900 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 font-mono font-bold text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.05)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 group"
            >
              <UserPlus className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>{loading ? 'ALLOCATING NODE...' : 'CREATE PRIVATE ROOM'}</span>
            </button>
          </div>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-zinc-800/80"></div>
            <span className="flex-shrink-0 mx-4 text-zinc-600 font-mono text-[9px] uppercase tracking-widest">Or join with code</span>
            <div className="flex-grow border-t border-zinc-800/80"></div>
          </div>
          
          {/* Join Private Match Section */}
          <div className="space-y-3">
            <h3 className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">
              03. Inject Key Address
            </h3>
            <div className="flex gap-2.5">
              <div className="flex-1 relative">
                <input 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="GATE-ID"
                  maxLength={6}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-center text-lg tracking-[0.25em] font-mono text-zinc-200 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all uppercase placeholder:text-zinc-700 font-bold"
                />
                <Key className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 pointer-events-none" />
              </div>
              <button 
                onClick={joinGame}
                disabled={joinCode.length < 4}
                className="px-6 bg-amber-500 text-zinc-950 font-mono font-black rounded-xl disabled:opacity-30 disabled:pointer-events-none hover:bg-amber-400 active:scale-95 transition-all text-sm cursor-pointer"
              >
                CONNECT
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
