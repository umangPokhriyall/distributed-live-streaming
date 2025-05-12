import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

interface Stream {
  id: string;
  title: string;
  description?: string;
  isLive: boolean;
  viewerCount: number;
}

const StreamList: React.FC = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/streams');
        setStreams(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching streams:', err);
        setError('Failed to load streams. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();

    // Poll for updates every 10 seconds
    const intervalId = setInterval(fetchStreams, 10000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading && streams.length === 0) {
    return <div className="loading">Loading streams...</div>;
  }

  if (error && streams.length === 0) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="stream-list">
      <h2>Live Streams</h2>
      {streams.length === 0 ? (
        <div className="no-streams">No live streams available at the moment.</div>
      ) : (
        <div className="streams-grid">
          {streams.map(stream => (
            <div key={stream.id} className={`stream-card ${stream.isLive ? 'live' : 'offline'}`}>
              <div className="stream-thumbnail">
                {stream.isLive && <span className="live-badge">LIVE</span>}
                <Link to={`/watch/${stream.id}`}>
                  <div className="thumbnail-placeholder">
                    {/* In a real app, you'd show an actual thumbnail here */}
                    <div className="play-button">▶</div>
                  </div>
                </Link>
              </div>
              <div className="stream-info">
                <h3>
                  <Link to={`/watch/${stream.id}`}>{stream.title}</Link>
                </h3>
                {stream.description && <p>{stream.description}</p>}
                <div className="stream-metadata">
                  {stream.isLive ? (
                    <span className="viewer-count">{stream.viewerCount} watching</span>
                  ) : (
                    <span className="offline-label">Offline</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StreamList; 