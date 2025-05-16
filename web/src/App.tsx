import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StreamList from './components/StreamList';
import WatchPage from './pages/WatchPage';
import StreamPage from './pages/StreamPage';
import { Navbar } from './components/ui/navbar';
import { ThemeToggle } from './components/ui/theme-toggle';
import './App.css';
import HomePage from './pages/HomePage';
import StreamerDashboard from './pages/StreamerDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import SolanaWalletProvider from './components/wallet/SolanaWalletProvider';

const App: React.FC = () => {
  return (
    <SolanaWalletProvider>
      <Router>
        <div className="min-h-screen bg-background font-sans antialiased">
          <Navbar />
          
          <main className="container mx-auto py-6">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/watch/:streamId" element={<WatchPage />} />
              <Route path="/stream" element={<StreamPage />} />
              <Route path="/streamer" element={<StreamerDashboard />} />
              <Route path="/worker" element={<WorkerDashboard />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          <footer className="app-footer">
            <div className="container mx-auto flex items-center justify-between">
              <p>&copy; {new Date().getFullYear()} DistStream - Distributed Live Streaming Platform</p>
              <ThemeToggle />
            </div>
          </footer>
        </div>
      </Router>
    </SolanaWalletProvider>
  );
};

// Simple About page
const AboutPage: React.FC = () => (
  <div className="about-page">
    <h1 className="text-3xl font-bold tracking-tight mb-6">About DistStream</h1>
    <div className="prose prose-sm md:prose-base dark:prose-invert">
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
  </div>
);

// 404 Not Found page
const NotFoundPage: React.FC = () => (
  <div className="not-found">
    <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
    <p className="text-muted-foreground my-4">The page you are looking for does not exist.</p>
    <a href="/" className="back-link">Go to Home</a>
  </div>
);

export default App; 