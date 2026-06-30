import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { playSound } from '../lib/audio';
import { ArrowLeft, Copy, Check, Radio, Ban } from 'lucide-react';

export default function WaitRoom() {
  const { gameId } = useParams<{gameId: string}>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gameData, setGameData] = useState<any>(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [matchTimer, setMatchTimer] = useState(30);

  // Bot Auto-match fallback countdown effect
  useEffect(() => {
    if (!gameData || gameData.status !== 'waiting_random' || gameData.hostId !== user?.uid) return;
    
    // Local countdown timer
    const countdown = setInterval(() => {
      setMatchTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const timer = setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'games', gameId as string), {
          guestId: 'bot_online',
          guestName: 'Computer',
          status: 'in_progress',
          lastMoveTime: new Date()
        });
      } catch (err) {
        console.error("Error setting up bot match: ", err);
      }
    }, 30000);

    return () => {
      clearInterval(countdown);
      clearTimeout(timer);
    };
  }, [gameData?.status, gameData?.hostId, gameId, user?.uid]);

  // Firestore Room Synchronization
  useEffect(() => {
    if (!gameId || !user) return;
    
    const unsub = onSnapshot(doc(db, 'games', gameId), async (snap) => {
      if (!snap.exists()) {
        setError('Connection interrupted. The room was closed by the host or not found.');
        return;
      }
      const data = snap.data();
      setGameData(data);

      if (data.status === 'in_progress') {
        playSound('wall');
        navigate(`/game/${gameId}`);
      } else if ((data.status === 'waiting' || data.status === 'waiting_random') && data.hostId !== user.uid) {
        // Guard checking for anonymous player trying to enter ranked
        if (data.status === 'waiting_random' && user.isAnonymous) {
          setError('Ranked and rated grid matches are restricted to verified accounts. Please authenticate with Google.');
          return;
        }

        // I am the guest joining!
        await updateDoc(doc(db, 'games', gameId), {
          guestId: user.uid,
          guestName: user.displayName || 'Player 2',
          status: 'in_progress',
          lastMoveTime: new Date()
        });
      }
    }, (err) => {
      console.error(err);
      setError('Failed to connect to the database nodes.');
    });

    return () => unsub();
  }, [gameId, user, navigate]);

  const handleCancelRoom = async () => {
    if (!gameId) return;
    setCancelling(true);
    playSound('error');
    try {
      await deleteDoc(doc(db, 'games', gameId));
      navigate('/online');
    } catch (err: any) {
      console.error("Error cancelling room: ", err);
      navigate('/online');
    }
  };

  const handleCopyCode = () => {
    if (!gameId) return;
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    playSound('move');
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="min-h-screen cyber-grid-bg text-zinc-100 flex flex-col items-center justify-center p-6 text-center select-none relative">
        <div className="absolute inset-0 scanline pointer-events-none opacity-20" />
        <div className="glass-panel border-red-500/30 p-8 rounded-2xl max-w-sm w-full shadow-2xl relative">
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-500/50" />
          <p className="text-red-400 font-mono text-sm leading-relaxed mb-6">{error}</p>
          <button 
            onClick={() => navigate('/online')} 
            className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 py-3 rounded-xl font-mono text-xs text-zinc-300 font-semibold cursor-pointer"
          >
            RETURN MATCHMAKING
          </button>
        </div>
      </div>
    );
  }

  const isHost = gameData?.hostId === user?.uid;
  const isRandom = gameData?.status === 'waiting_random';

  return (
    <div className="min-h-screen cyber-grid-bg text-zinc-100 flex flex-col items-center justify-center p-4 md:p-6 font-sans text-center relative select-none">
      <div className="absolute inset-0 scanline pointer-events-none opacity-20" />
      <div className="cyber-scanner" />

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden z-10">
        {/* Glowing top-bars */}
        <div className={`absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r ${isRandom ? 'from-emerald-500 to-cyan-500' : 'from-cyan-500 to-amber-500'} animate-pulse`} />

        {/* Private room share layout */}
        {!isRandom && gameId && (
          <div className="mb-8">
            <h2 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-3">
              LAN Private Node Address
            </h2>
            <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl flex items-center justify-between gap-4">
              <span className="text-4xl tracking-[0.2em] font-mono font-black text-cyan-400 select-all pl-3">
                {gameId}
              </span>
              <button 
                onClick={handleCopyCode}
                className={`p-3 rounded-lg border transition-all ${
                  copied 
                    ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-400' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
                title="Copy Address Key"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copied && <span className="text-[9px] font-mono text-emerald-400 mt-2 block animate-fade-in">COPIED ADDRESS TO CLIPBOARD</span>}
          </div>
        )}
        
        {isHost ? (
          <div className="flex flex-col items-center">
            
            {/* Spinning Radar Loop */}
            <div className="relative w-28 h-28 mb-6 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full border border-dashed ${isRandom ? 'border-emerald-500/20 animate-spin-slow' : 'border-cyan-500/20'}`} />
              <div className={`absolute w-20 h-20 rounded-full border border-double ${isRandom ? 'border-emerald-500/30 animate-pulse' : 'border-cyan-500/30 animate-pulse'}`} />
              <Radio className={`w-8 h-8 ${isRandom ? 'text-emerald-400 animate-pulse' : 'text-cyan-400'}`} />
            </div>

            <p className="text-zinc-300 font-mono text-sm tracking-wider uppercase">
              {isRandom ? 'Broadcasting Ping Signal...' : 'Channel Open'}
            </p>
            
            {isRandom && (
              <div className="mt-2.5 space-y-1">
                <p className="text-xs text-zinc-500">Scanning global networks for peer cores...</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-950 border border-zinc-850 rounded-full text-xs font-mono font-bold text-amber-500 mt-2">
                  <span>BOT AUTOPLAY SECURES IN: {matchTimer}s</span>
                </div>
              </div>
            )}

            {!isRandom && (
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                Awaiting connection from target client. Share the LAN address code to establish handshake link.
              </p>
            )}
            
            <button
              onClick={handleCancelRoom}
              disabled={cancelling}
              className="mt-8 w-full py-3.5 bg-red-950/20 text-red-400 font-mono text-xs font-bold rounded-xl border border-red-900/30 hover:bg-red-900/20 hover:text-red-300 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Ban className="w-4 h-4" />
              <span>{cancelling ? 'DISCONNECTING CHANNEL...' : 'TERMINATE PORT'}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-300 font-mono text-xs tracking-widest uppercase">Completing handshake sequence...</p>
          </div>
        )}
      </div>
    </div>
  );
}
