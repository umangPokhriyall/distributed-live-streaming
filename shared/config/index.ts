import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const config = {
  // Node environment
  env: process.env.NODE_ENV || 'development',
  
  // Demo mode
  demoMode: process.env.ENABLE_DEMO === 'true' || false, // Only enable when explicitly requested
  
  // Server ports
  ports: {
    api: parseInt(process.env.API_PORT || '3000', 10),
    orchestrator: parseInt(process.env.ORCHESTRATOR_PORT || '3001', 10),
    rtmp: parseInt(process.env.RTMP_PORT || '1935', 10),
    http: parseInt(process.env.HTTP_PORT || '8080', 10),
    deliveryHttp: parseInt(process.env.DELIVERY_HTTP_PORT || '8082', 10),
    webSocketPort: parseInt(process.env.WEBSOCKET_PORT || '8001', 10),
  },
  
  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  
  // Storage paths
  storagePaths: {
    segments: process.env.SEGMENTS_PATH || path.join(__dirname, '../../../storage/segments'),
    thumbnails: process.env.THUMBNAILS_PATH || path.join(__dirname, '../../../storage/thumbnails'),
    temp: process.env.TEMP_PATH || path.join(__dirname, '../../../storage/temp'),
  },
  
  // Stream settings
  streaming: {
    segmentDuration: parseInt(process.env.SEGMENT_DURATION || '4', 10), // in seconds
    maxBitrate: parseInt(process.env.MAX_BITRATE || '5000', 10), // in kbps
    defaultRenditions: [
      {
        name: '1080p',
        videoBitrate: 5000,
        audioBitrate: 192,
        width: 1920,
        height: 1080,
        fps: 30,
      },
      {
        name: '720p',
        videoBitrate: 2500,
        audioBitrate: 128,
        width: 1280,
        height: 720,
        fps: 30,
      },
      {
        name: '480p',
        videoBitrate: 1000,
        audioBitrate: 96,
        width: 854,
        height: 480,
        fps: 30,
      },
      {
        name: '360p',
        videoBitrate: 500,
        audioBitrate: 64,
        width: 640,
        height: 360,
        fps: 30,
      },
    ],
  },
  
  // Worker settings
  worker: {
    pollInterval: parseInt(process.env.WORKER_POLL_INTERVAL || '1000', 10), // in ms
    heartbeatInterval: parseInt(process.env.WORKER_HEARTBEAT_INTERVAL || '5000', 10), // in ms
    jobTimeout: parseInt(process.env.WORKER_JOB_TIMEOUT || '60000', 10), // in ms
  },
  
  // Jobs queue names
  queues: {
    transcoding: 'transcoding',
    notification: 'notification',
  },
};

export default config; 