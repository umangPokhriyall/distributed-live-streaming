import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import Queue from 'bull';
import IORedis from 'ioredis';
import path from 'path';
import fs from 'fs';
import config from '../../shared/config';
import { Worker, WorkerStatus, TranscodingJob } from '../../shared/types';

// Initialize Redis client
const redisClient = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password
});

// Initialize the job queue
const transcodingQueue = new Queue(config.queues.transcoding, {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password
  }
});

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.IO server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory storage for active workers
const workers: Record<string, Worker> = {};

// Register a new worker
app.post('/workers/register', (req, res) => {
  console.log('[Orchestrator] Registering worker');
  const { capabilities, ipAddress } = req.body;
  console.log('[Orchestrator] Capabilities:', capabilities);
  console.log('[Orchestrator] IP Address:', ipAddress);
  // Generate a worker ID
  const workerId = uuidv4();
  console.log('[Orchestrator] Worker ID:', workerId);
  
  // Create worker record
  const worker: Worker = {
    id: workerId,
    ipAddress,
    status: WorkerStatus.IDLE,
    capabilities,
    jobsProcessed: 0,
    lastHeartbeat: new Date()
  };

  // Store worker info
  workers[workerId] = worker;
  console.log('[Orchestrator] Workers:', workers);
  console.log(`[Worker] New worker registered: ${workerId}`);
  console.log('[Orchestrator] Workers:', workers);
  // Return worker ID to the client
  return res.json({ workerId, message: 'Worker registered successfully' });
});

// Worker heartbeat endpoint
app.post('/workers/:workerId/heartbeat', (req, res) => {
  const { workerId } = req.params;
  const { status } = req.body;
  console.log('[Orchestrator] Heartbeat received from worker:', workerId);
  console.log('[Orchestrator] Status:', status);
  // Check if worker exists
  if (!workers[workerId]) {
    return res.status(404).json({ error: 'Worker not found' });
  }
  
  // Update worker status and heartbeat timestamp
  workers[workerId].status = status;
  workers[workerId].lastHeartbeat = new Date();
  
  return res.json({ message: 'Heartbeat received' });
});

// Get available workers
app.get('/workers', (req, res) => {
  console.log('[Orchestrator] Getting available workers');
  console.log('[Orchestrator] Workers:', workers);
  return res.json(Object.values(workers));
});

// Handle job completion
app.post('/jobs/:jobId/complete', (req, res) => {
  const { jobId } = req.params;
  const { workerId, outputPath } = req.body;
  console.log('[Orchestrator] Job completed:', jobId);
  console.log('[Orchestrator] Worker ID:', workerId);
  console.log('[Orchestrator] Output path:', outputPath);
  // Check if worker exists
  if (!workers[workerId]) {
    return res.status(404).json({ error: 'Worker not found' });
  }
  
  // Update worker stats
  workers[workerId].jobsProcessed += 1;
  
  console.log(`[Job] Job ${jobId} completed by worker ${workerId}`);
  
  // Notify clients about job completion via Socket.IO
  io.emit('job:complete', { jobId, workerId });
  
  return res.json({ message: 'Job completion acknowledged' });
});

// Handle job failure
app.post('/jobs/:jobId/fail', (req, res) => {
  const { jobId } = req.params;
  const { workerId, error } = req.body;
  console.log('[Orchestrator] Job failed:', jobId);
  console.log('[Orchestrator] Worker ID:', workerId);
  console.log('[Orchestrator] Error:', error);
  // Check if worker exists
  if (!workers[workerId]) {
    return res.status(404).json({ error: 'Worker not found' });
  }
  
  console.log(`[Job] Job ${jobId} failed by worker ${workerId}:`, error);
  
  // Notify clients about job failure via Socket.IO
  io.emit('job:fail', { jobId, workerId, error });
  
  return res.json({ message: 'Job failure acknowledged' });
});

// Get next job from queue
app.get('/jobs/next', async (req, res) => {
  const { workerId } = req.query;
  console.log('[Orchestrator] Getting next job');
  console.log('[Orchestrator] Worker ID:', workerId);
  // Check if worker exists
  if (!workerId || !workers[workerId as string]) {
    return res.status(404).json({ error: 'Worker not found' });
  }
  
  // Get job from queue
  const job = await transcodingQueue.getNextJob();
  console.log('[Orchestrator] Job:', job?.data);
  if (!job) {
    return res.json({ message: 'No jobs available' });
  }
  console.log('[Orchestrator] Job:', job?.data);
  // Update worker status
  workers[workerId as string].status = WorkerStatus.BUSY;
  
  console.log(`[Job] Assigned job ${job.id} to worker ${workerId}`);

  // Return job data
  return res.json({
    jobId: job.id,
    data: job.data
  });
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Start the server
const PORT = config.ports.orchestrator;
httpServer.listen(PORT, () => {
  console.log(`[Orchestrator] Server running on port ${PORT}`);
});

// Monitor worker heartbeats
setInterval(() => {
  const now = new Date();
  const timeoutThreshold = config.worker.heartbeatInterval * 3; // 3 missed heartbeats
  
  for (const workerId in workers) {
    const worker = workers[workerId];
    const timeSinceLastHeartbeat = now.getTime() - worker.lastHeartbeat.getTime();
    
    if (timeSinceLastHeartbeat > timeoutThreshold && worker.status !== WorkerStatus.OFFLINE) {
      console.log(`[Worker] Worker ${workerId} marked as offline (no heartbeat for ${timeSinceLastHeartbeat}ms)`);
      worker.status = WorkerStatus.OFFLINE;
      
      // TODO: Handle job reassignment for jobs that were assigned to this worker
    }
  }
}, config.worker.heartbeatInterval); 