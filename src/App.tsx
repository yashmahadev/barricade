import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import Home from './pages/Home';
import LocalGame from './pages/LocalGame';
import CreateJoin from './pages/CreateJoin';
import WaitRoom from './pages/WaitRoom';
import OnlineGame from './pages/OnlineGame';
import Leaderboard from './pages/Leaderboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/local" element={<LocalGame />} />
          <Route path="/online" element={<CreateJoin />} />
          <Route path="/wait/:gameId" element={<WaitRoom />} />
          <Route path="/game/:gameId" element={<OnlineGame />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
