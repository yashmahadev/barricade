import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, doc, setDoc, query, where, limit, getDocs } from 'firebase/firestore';

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
      setErrorMsg("Global & Ranked match is restricted to registered users only. Please sign in with Google to play ranked.");
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const matchQuery = query(
        collection(db, 'games'),
        where('status', '==', 'waiting_random'),
        limit(5)
      );

      const querySnapshot = await getDocs(matchQuery);
      
      if (!querySnapshot.empty) {
        const validMatch = querySnapshot.docs.find(d => d.data().hostId !== user.uid);
        
        if (validMatch) {
           setLoading(false);
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
      setErrorMsg(e.message || 'Error occurred starting random match matchmaking.');
    }
  };

  const createGame = async () => {
    if (!user) {
      setErrorMsg("Must be logged in.");
      return;
    }
    setErrorMsg('');
    setLoading(true);
    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Initial blank board config
    const emptyBoard = Array(8).fill(null).map(() => Array(8).fill(null));

    try {
      await setDoc(doc(db, 'games', gameId), {
        status: 'waiting',
        isRanked: false,
        hostId: user.uid,
        hostName: user.displayName || 'Player 1',
        guestId: null,
        guestName: null,
        timeLimit: 30, // Default for online
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
      setErrorMsg(e.message || 'Error occurred creating private match.');
    }
  };

  const joinGame = () => {
    if (!joinCode) return;
    setErrorMsg('');
    navigate(`/wait/${joinCode}`);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-2xl mb-8 space-y-6">
        <button onClick={() => navigate('/')} className="text-zinc-400 hover:text-white text-sm mb-4 inline-block">
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-center mb-6">Online Multiplayer</h2>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-xs p-3 rounded-xl text-center leading-relaxed">
            {errorMsg}
          </div>
        )}
        
        <div className="space-y-4">
          {user?.isAnonymous ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <span>⚠️ Registered Users Only</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Global & Ranked matches are restricted to full profiles. Please sign in with Google to play ranked matches and record trophies.
              </p>
              <button
                disabled
                className="w-full py-4 bg-zinc-800 text-zinc-500 font-bold text-lg rounded-xl cursor-not-allowed border border-zinc-800"
              >
                Find Random Match
              </button>
            </div>
          ) : (
            <button 
              onClick={findRandomMatch} 
              disabled={loading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Find Random Match'}
            </button>
          )}
          
          {/* <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink-0 mx-4 text-zinc-500 text-sm">Or play with friend</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          <button 
            onClick={createGame} 
            disabled={loading}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-lg rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Private Match'}
          </button>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink-0 mx-4 text-zinc-500 text-sm">Or join with code</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>
          
          <div className="flex gap-2">
            <input 
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-center text-xl tracking-[0.2em] font-mono text-zinc-200 outline-none focus:border-amber-500 transition-all uppercase"
            />
            <button 
              onClick={joinGame}
              disabled={joinCode.length < 3}
              className="px-6 bg-white text-zinc-900 font-bold rounded-xl disabled:opacity-50 hover:bg-zinc-200 transition-colors"
            >
              Join
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
}
