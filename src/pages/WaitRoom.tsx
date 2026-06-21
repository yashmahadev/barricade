import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';

export default function WaitRoom() {
  const { gameId } = useParams<{gameId: string}>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gameData, setGameData] = useState<any>(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!gameData || gameData.status !== 'waiting_random' || gameData.hostId !== user?.uid) return;
    
    const timer = setTimeout(async () => {
      // If 30 seconds pass without an opponent, convert to bot match
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

    return () => clearTimeout(timer);
  }, [gameData?.status, gameData?.hostId, gameId, user?.uid]);

  useEffect(() => {
    if (!gameId || !user) return;
    
    const unsub = onSnapshot(doc(db, 'games', gameId), async (snap) => {
      if (!snap.exists()) {
        setError('Room has been closed or was not found.');
        return;
      }
      const data = snap.data();
      setGameData(data);

      if (data.status === 'in_progress') {
        navigate(`/game/${gameId}`);
      } else if ((data.status === 'waiting' || data.status === 'waiting_random') && data.hostId !== user.uid) {
        // Guard checking for anonymous player trying to enter ranked
        if (data.status === 'waiting_random' && user.isAnonymous) {
          setError('Global & Ranked matches are restricted to registered users only. Please sign in with Google.');
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
      setError('Failed to connect to the game server.');
    });

    return () => unsub();
  }, [gameId, user, navigate]);

  const handleCancelRoom = async () => {
    if (!gameId) return;
    setCancelling(true);
    try {
      await deleteDoc(doc(db, 'games', gameId));
      navigate('/online');
    } catch (err: any) {
      console.error("Error cancelling room: ", err);
      navigate('/online');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-400 mb-4 font-medium">{error}</p>
        <button onClick={() => navigate('/online')} className="bg-zinc-800 hover:bg-zinc-700 px-6 py-2.5 rounded-lg border border-zinc-700/60 transition-colors font-semibold shadow-md">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans text-center">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl">
        {gameData?.status !== 'waiting_random' && (
          <>
            <h2 className="text-xl font-bold text-zinc-400 mb-6">Room Code</h2>
            <div className="bg-zinc-950 border border-zinc-800 py-6 px-4 rounded-xl mb-8">
              <span className="text-5xl tracking-[0.2em] font-mono font-black text-cyan-400 select-all">
                {gameId}
              </span>
            </div>
          </>
        )}
        
        {gameData?.hostId === user?.uid ? (
          <div className="flex flex-col items-center">
            <div className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-300 font-medium">Waiting for opponent to join...</p>
            {gameData?.status === 'waiting' && <p className="text-xs text-zinc-500 mt-2">Share this code with your friend.</p>}
            {gameData?.status === 'waiting_random' && <p className="text-xs text-zinc-550 mt-2">Looking for players worldwide...</p>}
            
            <button
              onClick={handleCancelRoom}
              disabled={cancelling}
              className="mt-8 w-full py-3 bg-red-950/25 text-red-400 font-bold text-sm rounded-xl border border-red-900/30 hover:bg-red-900/20 hover:text-red-300 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-md"
            >
              {cancelling ? 'Closing Room...' : 'Cancel & Close Room'}
            </button>
          </div>
        ) : (
          <div>
            <div className="inline-block w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-400 font-medium text-sm">Validating session and joining room...</p>
          </div>
        )}
      </div>
    </div>
  );
}
