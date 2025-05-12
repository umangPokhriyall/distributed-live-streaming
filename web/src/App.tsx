import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StreamList from './components/StreamList';
import WatchPage from './pages/WatchPage';
import StreamPage from './pages/StreamPage';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <div className="logo">
            <a href="/">DistStream</a>
          </div>
          <nav className="main-nav">
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/stream">Start Streaming</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </nav>
        </header>

        <main className="app-content">
          <Routes>
            <Route path="/" element={<StreamList />} />
            <Route path="/watch/:streamId" element={<WatchPage />} />
            <Route path="/stream" element={<StreamPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>&copy; {new Date().getFullYear()} DistStream - Distributed Live Streaming Platform</p>
        </footer>
      </div>
    </Router>
  );
};

// Simple About page
const AboutPage: React.FC = () => (
  <div className="about-page">
    <h1>About DistStream</h1>
    <p>
      DistStream is a distributed live streaming platform that decentralizes video processing workloads,
      allowing anyone with even a low-end GPU to participate in the network.
    </p>
    <h2>Key Features</h2>
    <ul>
      <li>Distributed video processing across multiple nodes</li>
      <li>Low hardware requirements for participation</li>
      <li>Resilient architecture with no single point of failure</li>
      <li>Adaptive bitrate streaming for viewers</li>
      <li>Seamless viewing experience on any device</li>
    </ul>
  </div>
);

// 404 Not Found page
const NotFoundPage: React.FC = () => (
  <div className="not-found">
    <h1>404 - Page Not Found</h1>
    <p>The page you are looking for does not exist.</p>
    <a href="/" className="back-link">Go to Home</a>
  </div>
);

export default App; 