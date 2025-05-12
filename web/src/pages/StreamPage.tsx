import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

interface StreamFormData {
  title: string;
  description: string;
}

const StreamPage: React.FC = () => {
  const [streamData, setStreamData] = useState<StreamFormData>({
    title: '',
    description: ''
  });
  const [streamKey, setStreamKey] = useState<string>('');
  const [streamId, setStreamId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [deviceLoaded, setDeviceLoaded] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStreamData({
      ...streamData,
      [name]: value
    });
  };

  const startCamera = async () => {
    try {
      const constraints = {
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setDeviceLoaded(true);
      setError(null);
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Failed to access camera and microphone. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setDeviceLoaded(false);
    }
  };

  useEffect(() => {
    // Clean up on component unmount
    return () => {
      stopCamera();
    };
  }, []);

  const createStream = async () => {
    try {
      if (!streamData.title) {
        setError('Please enter a stream title');
        return;
      }

      const response = await axios.post('http://localhost:3000/streams', {
        title: streamData.title,
        description: streamData.description,
        userId: 'user-' + Math.random().toString(36).substring(2, 9) // Mock user ID for demo
      });

      setStreamId(response.data.id);
      setStreamKey(response.data.streamKey);
      setError(null);
    } catch (err) {
      console.error('Error creating stream:', err);
      setError('Failed to create stream. Please try again.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <div className="stream-page">
      <h1>Stream Setup</h1>
      
      {!streamKey ? (
        <div className="stream-setup">
          <div className="form-group">
            <label htmlFor="title">Stream Title*</label>
            <input 
              type="text" 
              id="title" 
              name="title" 
              value={streamData.title} 
              onChange={handleInputChange} 
              placeholder="Enter a title for your stream"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea 
              id="description" 
              name="description" 
              value={streamData.description} 
              onChange={handleInputChange} 
              placeholder="Describe your stream (optional)"
              rows={4}
            />
          </div>
          
          <button className="primary-button" onClick={createStream}>
            Create Stream
          </button>
        </div>
      ) : (
        <div className="stream-controls">
          <div className="stream-key-container">
            <h2>Your Stream Key</h2>
            <div className="stream-key">
              <code>{streamKey}</code>
              <button 
                className="copy-button" 
                onClick={() => copyToClipboard(streamKey)}
              >
                Copy
              </button>
            </div>
            
            <div className="rtmp-url">
              <h3>RTMP URL</h3>
              <code>rtmp://localhost:1935/live/{streamKey}</code>
              <button 
                className="copy-button" 
                onClick={() => copyToClipboard(`rtmp://localhost:1935/live/${streamKey}`)}
              >
                Copy
              </button>
            </div>
            
            <div className="stream-info">
              <p>Use these details in your streaming software (OBS, Streamlabs, etc.)</p>
            </div>
          </div>
          
          <div className="camera-preview">
            <h2>Camera Preview</h2>
            <div className="video-container">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
              />
            </div>
            
            {!deviceLoaded ? (
              <button className="primary-button" onClick={startCamera}>
                Start Camera
              </button>
            ) : (
              <button className="secondary-button" onClick={stopCamera}>
                Stop Camera
              </button>
            )}
          </div>
          
          <div className="stream-actions">
            <p>Ready to stream? Use an RTMP streaming software like OBS Studio with the URL and key above.</p>
            <button 
              className="primary-button" 
              onClick={() => navigate(`/watch/${streamId}`)}
            >
              Go to Stream Page
            </button>
          </div>
          
          <div className="browser-streaming-note">
            <h3>Note on Browser Streaming</h3>
            <p>
              Direct RTMP streaming from a browser requires additional libraries. For the best experience,
              use dedicated streaming software like OBS Studio, which offers more features and better performance.
            </p>
            <p>
              For browser-based streaming, you can use WebRTC solutions which require additional backend 
              configuration beyond the scope of this project.
            </p>
          </div>
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
      
      <div className="back-nav">
        <Link to="/" className="back-link">Back to streams</Link>
      </div>
    </div>
  );
};

export default StreamPage; 