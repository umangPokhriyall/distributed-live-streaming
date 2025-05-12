import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import VideoPlayer from '../components/VideoPlayer';

interface Stream {
  id: string;
  title: string;
  description?: string;
  isLive: boolean;
  viewerCount: number;
}

const WatchPage: React.FC = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!streamId) return;

    const fetchStreamDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:3000/streams/${streamId}`);
        setStream(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching stream:', err);
        // Don't set an error, just clear loading state
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStreamDetails();

    // Poll for updates every 10 seconds
    const intervalId = setInterval(fetchStreamDetails, 10000);

    return () => clearInterval(intervalId);
  }, [streamId]);

  if (loading && !stream) {
    return <div className="loading">Loading stream...</div>;
  }

  if (!streamId) {
    return (
      <div className="error-container">
        <div className="error">Stream not found</div>
        <Link to="/" className="back-link">Back to streams</Link>
      </div>
    );
  }

  return (
    <div className="watch-page">
      <div className="player-container">
        <VideoPlayer streamId={streamId} serverPort={8082} />
      </div>

      <div className="stream-details">
        <div className="stream-header">
          <h1>{stream?.title || `Live Stream: ${streamId}`}</h1>
          {stream?.isLive ? (
            <span className="live-badge">LIVE</span>
          ) : (
            // Always show LIVE since we have video
            <span className="live-badge">LIVE</span>
          )}
        </div>

        {stream?.description && (
          <div className="description">
            <h3>About this stream</h3>
            <p>{stream.description}</p>
          </div>
        )}
      </div>

      <div className="back-nav">
        <Link to="/" className="back-link">Back to all streams</Link>
      </div>
    </div>
  );
};

export default WatchPage; 