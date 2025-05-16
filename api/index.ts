import express from 'express';
import cors from 'cors';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import IORedis from 'ioredis';
import config from '../shared/config';
import { Stream } from '../shared/types';
import { PrismaClient } from '@prisma/client';

// Initialize Redis client
const redisClient = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password
});


// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// In-memory streams storage (in production, use a database)
const streams: Record<string, Stream> = {};
const prisma = new PrismaClient();

// API Routes

// Get all streams
app.get('/streams', (req, res) => {
  console.log('[API] Getting all streams', streams);
  res.json(Object.values(streams));
});

// Get all streams from database
app.get('/streams/db', async (req, res) => {
  const streams = await prisma.stream.findMany();
  console.log('[API] Getting all streams from database', streams);
  res.json(streams);
});

// Get stream by ID
app.get('/streams/:streamId', (req, res) => {
  const { streamId } = req.params;
  
  if (!streams[streamId]) {
    return res.status(404).json({ error: 'Stream not found' });
  }
  
  res.json(streams[streamId]);
});

// Create a new stream
app.post('/streams', async (req, res) => {
  const { title, description, userId } = req.body;
  
  if (!title || !userId) {
    return res.status(400).json({ error: 'Title and userId are required' });
  }
  
  // Generate unique stream ID and stream key
  const streamId = uuidv4();
  const streamKey = uuidv4().replace(/-/g, '');
  
  const stream: Stream = {
    id: streamId,
    title,
    description,
    userId,
    streamKey,
    isLive: false,
    viewerCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    renditions: config.streaming.defaultRenditions
  };
  
  // Store stream info
  streams[streamId] = stream;

  // Store stream info in database
  await prisma.stream.create({
    data: {
      id: streamId,
      title,
      description,  
      streamKey,
      isLive: false,
      streamerId: 1,
      createdAt: new Date(),
      startedAt: new Date(),
      endedAt: null,
      totalCost: 0
    }
  });
  
  
  console.log(`[API] New stream created: ${streamId} with key ${streamKey}`);
  
  // Return stream info to client
  res.status(201).json(stream);
});

// Update stream info
app.put('/streams/:streamId', (req, res) => {
  const { streamId } = req.params;
  const { title, description } = req.body;
  
  if (!streams[streamId]) {
    return res.status(404).json({ error: 'Stream not found' });
  }
  
  // Update stream info
  if (title) streams[streamId].title = title;
  if (description !== undefined) streams[streamId].description = description;
  streams[streamId].updatedAt = new Date();
  
  res.json(streams[streamId]);
});

// Delete a stream
app.delete('/streams/:streamId', (req, res) => {
  const { streamId } = req.params;
  
  if (!streams[streamId]) {
    return res.status(404).json({ error: 'Stream not found' });
  }
  
  // Delete stream
  delete streams[streamId];
  
  res.json({ message: 'Stream deleted successfully' });
});

// Get stream status
app.get('/streams/:streamId/status', (req, res) => {
  const { streamId } = req.params;
  
  if (!streams[streamId]) {
    return res.status(404).json({ error: 'Stream not found' });
  }
  
  res.json({
    isLive: streams[streamId].isLive,
    viewerCount: streams[streamId].viewerCount
  });
});

// Update stream live status (typically called by ingestion service)
app.put('/streams/:streamId/status', (req, res) => {
  const { streamId } = req.params;
  const { isLive, viewerCount } = req.body;
  
  if (!streams[streamId]) {
    return res.status(404).json({ error: 'Stream not found' });
  }
  
  // Update stream status
  if (isLive !== undefined) streams[streamId].isLive = isLive;
  if (viewerCount !== undefined) streams[streamId].viewerCount = viewerCount;
  streams[streamId].updatedAt = new Date();
  
  res.json({
    isLive: streams[streamId].isLive,
    viewerCount: streams[streamId].viewerCount
  });
});

// Get stream key - normally this would be secured with proper authentication
app.get('/streams/:streamId/key', (req, res) => {
  const { streamId } = req.params;
  
  if (!streams[streamId]) {
    return res.status(404).json({ error: 'Stream not found' });
  }
  
  res.json({ streamKey: streams[streamId].streamKey });
});

// Endpoint to check health of all services
app.get('/health', async (req, res) => {
  try {
    // Check Redis connection
    await redisClient.ping();
    
    res.json({
      status: 'healthy',
      services: {
        api: true,
        redis: true
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      services: {
        api: true,
        redis: false
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start the server
const PORT = config.ports.api;
app.listen(PORT, () => {
  console.log(`[API] Server running on port ${PORT}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('[API] Shutting down...');
  redisClient.quit();
  process.exit(0);
}); 