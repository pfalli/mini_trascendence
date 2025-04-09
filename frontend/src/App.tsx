import { Routes, Route, Link } from 'react-router-dom';
import Game from "./Game";

function App() {
  return (
    <div>
      <nav style={{ marginBottom: '1rem' }}>
        <Link to="/">Home</Link> |{' '}
        <Link to="/game">Game</Link> |{' '}
        <Link to="/chat">Chat</Link> |{' '}
        <Link to="/profile">Profile</Link>
      </nav>
      

      <Routes>
        <Route path="/" element={<h2>🏠 Home</h2>} />
        <Route path="/game" element={<Game />} />
        <Route path="/chat" element={<h2>💬 Chat</h2>} />
        <Route path="/profile" element={<h2>🙍‍♂️ Profile</h2>} />
      </Routes>
    </div>
  );
}

export default App;
