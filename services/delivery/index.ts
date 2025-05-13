import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import IORedis from 'ioredis';
import config from '../../shared/config';

// Initialize Redis client
const redisClient = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password
});

// Create Express app
const app = express();
app.use(cors());

// Serve stream segments directory statically
app.use('/segments', express.static(config.storagePaths.segments));

// API to get stream info
app.get('/api/streams', async (req, res) => {
  // In a real application, this would come from a database
  // For demo purposes, we're just scanning the segments directory
  const segmentsDir = config.storagePaths.segments;
  
  try {
    // Get all directories in the segments directory (each represents a stream)
    const streamIds = fs.readdirSync(segmentsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    // For each stream, build an info object
    const streams = streamIds.map(streamId => {
      // Check if stream has segments (is it live?)
      const streamDir = path.join(segmentsDir, streamId);
      const hasSegments = fs.readdirSync(streamDir).length > 0;
      
      // Get available renditions
      const renditions = fs.readdirSync(streamDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      return {
        id: streamId,
        isLive: hasSegments,
        renditions
      };
    });
    
    res.json(streams);
  } catch (error) {
    console.error('[Delivery] Error getting streams:', error);
    res.status(500).json({ error: 'Failed to get streams' });
  }
});

// API to get stream segments for a specific rendition
app.get('/api/streams/:streamId/segments/:rendition', (req, res) => {
  const { streamId, rendition } = req.params;
  const renditionDir = path.join(config.storagePaths.segments, streamId, rendition);
  
  try {
    // Check if rendition directory exists
    if (!fs.existsSync(renditionDir)) {
      return res.status(404).json({ error: 'Rendition not found' });
    }
    
    // Get all .ts files in the rendition directory
    const segments = fs.readdirSync(renditionDir)
      .filter(file => file.endsWith('.ts'))
      .map(file => parseInt(file.replace('.ts', ''), 10))
      .sort((a, b) => a - b); // Sort segments by number
    
    res.json(segments);
  } catch (error) {
    console.error('[Delivery] Error getting segments:', error);
    res.status(500).json({ error: 'Failed to get segments' });
  }
});

// Generate and serve HLS playlist (.m3u8) files dynamically
app.get('/streams/:streamId/playlist.m3u8', (req, res) => {
  const { streamId } = req.params;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`[Delivery] Client ${clientIp} requesting master playlist for stream: ${streamId}`);
  
  const streamDir = path.join(config.storagePaths.segments, streamId);
  
  try {
    // Check if stream directory exists
    if (!fs.existsSync(streamDir)) {
      console.error(`[Delivery] Stream directory not found: ${streamDir}`);
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    // Get available renditions
    const renditions = fs.readdirSync(streamDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    if (renditions.length === 0) {
      console.error(`[Delivery] No renditions available for stream: ${streamId}`);
      return res.status(404).json({ error: 'No renditions available' });
    }
    console.log(`[Delivery] Available renditions for ${streamId}:`, renditions);
    
    // Generate master playlist
    let masterPlaylist = '#EXTM3U\n';
    masterPlaylist += '#EXT-X-VERSION:3\n';
    masterPlaylist += '#EXT-X-INDEPENDENT-SEGMENTS\n';
    
    // Add each rendition
    for (const rendition of renditions) {
      const renditionInfo = config.streaming.defaultRenditions.find(r => r.name === rendition);
      
      if (renditionInfo) {
        masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${renditionInfo.videoBitrate * 1000},RESOLUTION=${renditionInfo.width}x${renditionInfo.height},FRAME-RATE=${renditionInfo.fps},CODECS="avc1.4d001f,mp4a.40.2"\n`;
        masterPlaylist += `${rendition}/playlist.m3u8\n`;
      }
    }
    
    console.log(`[Delivery] Serving master playlist for ${streamId} with ${renditions.length} renditions`);
    res.type('application/vnd.apple.mpegurl');
    res.send(masterPlaylist);
  } catch (error) {
    console.error(`[Delivery] Error generating master playlist for ${streamId}:`, error);
    res.status(500).json({ error: 'Failed to generate playlist' });
  }
});

// Generate and serve HLS rendition playlists
app.get('/streams/:streamId/:rendition/playlist.m3u8', (req, res) => {
  const { streamId, rendition } = req.params;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`[Delivery] Client ${clientIp} requesting ${rendition} playlist for stream: ${streamId}`);
  
  const renditionDir = path.join(config.storagePaths.segments, streamId, rendition);
  
  try {
    // Check if rendition directory exists
    if (!fs.existsSync(renditionDir)) {
      console.error(`[Delivery] Rendition directory not found: ${renditionDir}`);
      return res.status(404).json({ error: 'Rendition not found' });
    }
    
    // Get all .ts files in the rendition directory
    const segments = fs.readdirSync(renditionDir)
      .filter(file => file.endsWith('.ts'))
      .map(file => parseInt(file.replace('.ts', ''), 10))
      .sort((a, b) => a - b); // Sort segments by number
    
    if (segments.length === 0) {
      console.error(`[Delivery] No segments available for stream ${streamId}, rendition ${rendition}`);
      return res.status(404).json({ error: 'No segments available' });
    }
    
    console.log(`[Delivery] Found ${segments.length} segments for ${streamId}/${rendition}. Sequence starts at ${segments[0]}`);
    
    // Check for gaps in segments
    const minSegment = segments[0];
    const maxSegment = segments[segments.length - 1];
    const expectedCount = maxSegment - minSegment + 1;
    
    if (segments.length !== expectedCount) {
      console.warn(`[Delivery] Missing segments detected for ${streamId}/${rendition}. Found ${segments.length}, expected ${expectedCount}`);
      
      // Log the missing segment numbers
      const missingSegments = [];
      for (let i = minSegment; i <= maxSegment; i++) {
        if (!segments.includes(i)) {
          missingSegments.push(i);
        }
      }
      
      if (missingSegments.length > 0) {
        console.warn(`[Delivery] Missing segment numbers: ${missingSegments.join(', ')}`);
      }
    }
    
    // Generate rendition playlist
    let playlist = '#EXTM3U\n';
    playlist += '#EXT-X-VERSION:3\n';
    playlist += `#EXT-X-TARGETDURATION:${config.streaming.segmentDuration}\n`;
    playlist += `#EXT-X-MEDIA-SEQUENCE:${segments[0]}\n`;
    playlist += '#EXT-X-INDEPENDENT-SEGMENTS\n';  // Indicates segments start with keyframes
    playlist += '#EXT-X-ALLOW-CACHE:YES\n';       // Allow caching for better performance
    
    // Add each segment - only include segments that exist
    for (const segmentNumber of segments) {
      // Verify the segment file actually exists and has content
      const segmentPath = path.join(renditionDir, `${segmentNumber}.ts`);
      if (!fs.existsSync(segmentPath) || fs.statSync(segmentPath).size === 0) {
        console.warn(`[Delivery] Skip missing or empty segment: ${segmentNumber}.ts`);
        continue;
      }
      
      playlist += `#EXTINF:${config.streaming.segmentDuration}.0,\n`;
      playlist += `${segmentNumber}.ts\n`;
      console.log('[Delivery] Adding Segment: to rendition', rendition, 'segmentNumber', segmentNumber);
    }
    
    // If live stream, don't add EXT-X-ENDLIST
    // In a real app, you'd have a way to determine if the stream is still live
    // playlist += '#EXT-X-ENDLIST\n';
    
    console.log(`[Delivery] Serving ${rendition} playlist for ${streamId}`);
    res.type('application/vnd.apple.mpegurl');
    res.send(playlist);
  } catch (error) {
    console.error(`[Delivery] Error generating ${rendition} playlist for ${streamId}:`, error);
    res.status(500).json({ error: 'Failed to generate playlist' });
  }
});

// Serve an individual segment
app.get('/streams/:streamId/:rendition/:segment', (req, res) => {
  const { streamId, rendition, segment } = req.params;
  const segmentPath = path.join(config.storagePaths.segments, streamId, rendition, segment);
  
  try {
    // Check if segment file exists
    if (!fs.existsSync(segmentPath)) {
      console.error(`[Delivery] Segment not found: ${segmentPath}`);
      return res.status(404).json({ error: 'Segment not found' });
    }
    
    // Get the absolute path
    const absolutePath = path.resolve(segmentPath);
    console.log(`[Delivery] Serving segment ${segment} for ${streamId}/${rendition} from path: ${absolutePath}`);
    
    // Set appropriate content type for TS segments
    res.setHeader('Content-Type', 'video/mp2t');
    
    // Stream the segment file
    const readStream = fs.createReadStream(absolutePath);
    readStream.pipe(res);
    
    // Handle errors
    readStream.on('error', (err) => {
      console.error(`[Delivery] Error streaming segment: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming segment' });
      } else {
        res.end();
      }
    });
  } catch (error) {
    console.error(`[Delivery] Error serving segment ${segment} for ${streamId}/${rendition}:`, error);
    res.status(500).json({ error: 'Failed to serve segment' });
  }
});

// Start the server
const PORT = config.ports.deliveryHttp;
app.listen(PORT, () => {
  console.log(`[Delivery] HLS delivery server running on port ${PORT}`);
  console.log(`[Delivery] Stream URLs will be available at http://localhost:${PORT}/streams/{streamId}/playlist.m3u8`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('[Delivery] Shutting down...');
  process.exit(0);
}); 