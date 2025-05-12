import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import '@videojs/http-streaming';

interface VideoPlayerProps {
  streamId: string;
  autoplay?: boolean;
  controls?: boolean;
  fluid?: boolean;
  width?: number;
  height?: number;
  serverPort?: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streamId,
  autoplay = true,
  controls = true,
  fluid = true,
  width = 640,
  height = 360,
  serverPort = 8082 // Default to the delivery port
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const MAX_RETRIES = 3;

  const getStreamUrl = (id: string) => {
    // Use the origin (protocol + hostname + port) to ensure the protocol is included
    const origin = window.location.protocol === 'https:' 
      ? `https://${window.location.hostname}` 
      : `http://${window.location.hostname}`;
    
    return `${origin}:${serverPort}/streams/${id}/playlist.m3u8`;
  };

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      // The Video.js player needs to be initialized once the element is available
      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-big-play-centered');
      
      if (videoRef.current) {
        videoRef.current.appendChild(videoElement);
      }

      const streamUrl = getStreamUrl(streamId);
      console.log('[VideoPlayer] Initializing with source:', streamUrl);

      // Initialize Video.js player
      playerRef.current = videojs(videoElement, {
        autoplay,
        controls,
        fluid,
        width,
        height,
        sources: [{
          src: streamUrl,
          type: 'application/x-mpegURL'
        }],
        html5: {
          hls: {
            overrideNative: true,
            // Add configuration for better performance
            enableLowInitialPlaylist: true,
            limitRenditionByPlayerDimensions: true,
            useBandwidthFromLocalStorage: true,
            allowSeeksWithinUnsafeLiveWindow: true,  // Enable seeking in live streams
            backBufferLength: 60  // Maintain 60 seconds of backward buffer
          }
        },
        liveui: true, // Enable live UI components
        liveTracker: {
          trackingThreshold: 0,
          liveTolerance: 30,
          seekableEnd: 'duration' // Allow seeking to beginning of stream
        }
      });

      // Handle errors
      playerRef.current.on('error', () => {
        const error = playerRef.current.error();
        console.error('[VideoPlayer] Error:', error);
        setPlayerError(`Error code: ${error.code}, message: ${error.message}`);
        
        // Implement retry logic for certain errors
        if (retryCount < MAX_RETRIES && (error.code === 2 || error.code === 4)) { // Network or source error
          setRetryCount(prev => prev + 1);
          console.log(`[VideoPlayer] Retrying playback (${retryCount + 1}/${MAX_RETRIES})...`);
          
          // Delay retry to allow potential issues to resolve
          setTimeout(() => {
            if (playerRef.current) {
              playerRef.current.src({
                src: getStreamUrl(streamId),
                type: 'application/x-mpegURL'
              });
              playerRef.current.load();
            }
          }, 2000);
        }
      });

      // Add success log
      playerRef.current.on('loadedmetadata', () => {
        console.log('[VideoPlayer] Stream loaded successfully:', streamId);
        setPlayerError(null);
        setRetryCount(0); // Reset retry count on success
      });
    } else {
      // If player already exists, update the source
      const streamUrl = getStreamUrl(streamId);
      console.log('[VideoPlayer] Updating source for stream:', streamId);
      console.log('[VideoPlayer] New source:', streamUrl);
      
      // Reset retry count for new stream
      setRetryCount(0);
      
      playerRef.current.src([{
        src: streamUrl,
        type: 'application/x-mpegURL'
      }]);
    }

    // Cleanup function
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [streamId, autoplay, controls, fluid, width, height, serverPort, retryCount]);

  return (
    <div>
      <div data-vjs-player>
        <div ref={videoRef} className="video-container" />
      </div>
      {playerError && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          {playerError}
          {retryCount > 0 && retryCount <= MAX_RETRIES && (
            <div>Retrying playback ({retryCount}/{MAX_RETRIES})...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoPlayer; 