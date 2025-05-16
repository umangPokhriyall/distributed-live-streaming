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

// In-memory storage for job history and payments
interface JobRecord {
  id: string;
  streamId: string;
  segmentNumber: number;
  rendition: string;
  status: 'completed' | 'failed' | 'processing';
  workerId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  payment?: number; // SOL
}

const jobHistory: Record<string, JobRecord> = {};

// Calculate payment based on job details
const calculatePayment = (job: JobRecord): number => {
  // Base payment per job
  const basePay = 0.002;
  
  // Premium for higher resolutions
  const resolutionMultiplier = job.rendition === '1080p' ? 2.0 :
    job.rendition === '720p' ? 1.5 :
    job.rendition === '480p' ? 1.2 :
    1.0; // 360p or other
  
  // Success bonus
  const successBonus = job.status === 'completed' ? 1.0 : 0.1;
  
  // Calculate final payment
  return parseFloat((basePay * resolutionMultiplier * successBonus).toFixed(5));
};

// Register a new worker
app.post('/workers/register/:workerId', (req, res) => {
  console.log('[Orchestrator] Registering worker');
  const { capabilities, ipAddress } = req.body;
  console.log('[Orchestrator] Capabilities:', capabilities);
  console.log('[Orchestrator] IP Address:', ipAddress);
  // Generate a worker ID
  const workerId = req.params.workerId;
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

// Get worker by ID
app.get('/workers/:workerId', (req, res) => {
  const { workerId } = req.params;
  // Check if worker exists
  if (!workers[workerId]) {
    return res.status(404).json({ error: 'Worker not found' });
  }
  return res.json(workers[workerId]);
});

// Get worker statistics by ID
app.get('/workers/:workerId/stats', (req, res) => {
  const { workerId } = req.params;
  // Check if worker exists
  if (!workers[workerId]) {
    return res.status(404).json({ error: 'Worker not found' });
  }
  
  const worker = workers[workerId];
  
  // Get worker's job history
  const workerJobs = Object.values(jobHistory).filter(job => job.workerId === workerId);
  
  // Calculate statistics
  const completedJobs = workerJobs.filter(job => job.status === 'completed');
  const failedJobs = workerJobs.filter(job => job.status === 'failed');
  const processingJobs = workerJobs.filter(job => job.status === 'processing');
  
  const totalPayments = completedJobs.reduce((sum, job) => sum + (job.payment || 0), 0);
  const successRate = workerJobs.length > 0 ? (completedJobs.length / workerJobs.length) * 100 : 100;
  
  const stats = {
    workerId,
    totalJobs: workerJobs.length,
    completedJobs: completedJobs.length,
    failedJobs: failedJobs.length,
    processingJobs: processingJobs.length,
    successRate: parseFloat(successRate.toFixed(1)),
    totalEarnings: parseFloat(totalPayments.toFixed(5)),
    status: worker.status,
    lastActive: worker.lastHeartbeat
  };
  
  return res.json(stats);
});

// Get worker jobs by ID
app.get('/workers/:workerId/jobs', (req, res) => {
  const { workerId } = req.params;
  // Check if worker exists
  if (!workers[workerId]) {
    return res.status(404).json({ error: 'Worker not found' });
  }
  
  const workerJobs = Object.values(jobHistory)
    .filter(job => job.workerId === workerId)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  
  return res.json(workerJobs);
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
  
  // If job exists in history, update it
  if (jobHistory[jobId]) {
    const now = new Date();
    jobHistory[jobId].status = 'completed';
    jobHistory[jobId].endTime = now;
    jobHistory[jobId].duration = now.getTime() - new Date(jobHistory[jobId].startTime).getTime();
    jobHistory[jobId].payment = calculatePayment(jobHistory[jobId]);
  } else {
    // If not (might be from the previous job tracking method)
    // Create a new job record with minimal info
    jobHistory[jobId] = {
      id: jobId,
      streamId: outputPath.split('/')[0] || 'unknown-stream',
      segmentNumber: parseInt(outputPath.split('/').pop()?.split('.')[0] || '0', 10) || 0,
      rendition: outputPath.split('/')[1] || '360p',
      status: 'completed',
      workerId,
      startTime: new Date(Date.now() - 5000), // Assume it started 5 seconds ago
      endTime: new Date(),
      duration: 5000, // Default 5 seconds
      payment: 0.002 // Default payment
    };
  }
  
  console.log(`[Job] Job ${jobId} completed by worker ${workerId}`);
  
  // Notify clients about job completion via Socket.IO
  io.emit('job:complete', { 
    jobId, 
    workerId,
    jobDetails: jobHistory[jobId] 
  });
  
  return res.json({ 
    message: 'Job completion acknowledged',
    payment: jobHistory[jobId]?.payment || 0.002
  });
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
  
  // If job exists in history, update it
  if (jobHistory[jobId]) {
    const now = new Date();
    jobHistory[jobId].status = 'failed';
    jobHistory[jobId].endTime = now;
    jobHistory[jobId].duration = now.getTime() - new Date(jobHistory[jobId].startTime).getTime();
    jobHistory[jobId].payment = calculatePayment(jobHistory[jobId]);
  } else {
    // Create a minimal job record
    jobHistory[jobId] = {
      id: jobId,
      streamId: 'unknown-stream',
      segmentNumber: 0,
      rendition: '360p',
      status: 'failed',
      workerId,
      startTime: new Date(Date.now() - 5000), // Assume it started 5 seconds ago
      endTime: new Date(),
      duration: 5000,
      payment: 0.0002 // Very small payment for failed job
    };
  }
  
  console.log(`[Job] Job ${jobId} failed by worker ${workerId}:`, error);
  
  // Notify clients about job failure via Socket.IO
  io.emit('job:fail', { 
    jobId, 
    workerId, 
    error,
    jobDetails: jobHistory[jobId] 
  });
  
  return res.json({ 
    message: 'Job failure acknowledged',
    payment: jobHistory[jobId]?.payment || 0.0002
  });
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
  
  const jobId = job.id.toString();
  
  // Create job record
  jobHistory[jobId] = {
    id: jobId,
    streamId: job.data.streamId,
    segmentNumber: job.data.segmentNumber,
    rendition: job.data.rendition.name,
    status: 'processing',
    workerId: workerId as string,
    startTime: new Date()
  };
  
  // Update worker status
  workers[workerId as string].status = WorkerStatus.BUSY;
  
  console.log(`[Job] Assigned job ${job.id} to worker ${workerId}`);

  // Return job data
  return res.json({
    jobId: job.id,
    data: job.data
  });
});

// Get all jobs for the dashboard
app.get('/jobs', (req, res) => {
  const allJobs = Object.values(jobHistory)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  
  return res.json(allJobs);
});

// API endpoint for the worker dashboard
app.get('/dashboard/stats', (req, res) => {
  // Get all workers
  const allWorkers = Object.values(workers);
  
  // Count active workers
  const activeWorkers = allWorkers.filter(w => 
    w.status !== WorkerStatus.OFFLINE && 
    new Date().getTime() - new Date(w.lastHeartbeat).getTime() < 10000
  );
  
  // Get all jobs
  const allJobs = Object.values(jobHistory);
  const completedJobs = allJobs.filter(job => job.status === 'completed');
  const failedJobs = allJobs.filter(job => job.status === 'failed');
  const processingJobs = allJobs.filter(job => job.status === 'processing');
  
  const totalPayments = completedJobs.reduce((sum, job) => sum + (job.payment || 0), 0);
  
  // Return aggregated stats
  const stats = {
    totalWorkers: allWorkers.length,
    activeWorkers: activeWorkers.length,
    totalJobs: allJobs.length,
    completedJobs: completedJobs.length,
    failedJobs: failedJobs.length,
    processingJobs: processingJobs.length,
    totalPayments: parseFloat(totalPayments.toFixed(5)),
    successRate: allJobs.length > 0 ? (completedJobs.length / allJobs.length) * 100 : 100,
  };
  
  return res.json(stats);
});

// Demo mode: Register a demo worker without generating mock jobs
const setupDemoMode = () => {
  // Register demo worker
  const workerId = "hackathon-demo-worker";
  if (!workers[workerId]) {
    workers[workerId] = {
      id: workerId,
      ipAddress: '127.0.0.1',
      status: WorkerStatus.IDLE,
      capabilities: {
        cpu: { cores: 4, model: 'Demo CPU' },
        memory: 8192,
        maxConcurrentJobs: 2
      },
      jobsProcessed: 0,
      lastHeartbeat: new Date()
    };
    console.log(`[Demo] Registered demo worker: ${workerId}`);
  }
  
  console.log('[Demo] Demo worker registered and ready to process real jobs');
};

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
  
  // Register the demo worker for convenience
  setupDemoMode();
  console.log('[Orchestrator] Demo worker registered. Ready to process real jobs.');
});

// Monitor worker heartbeats
setInterval(() => {
  const now = new Date();
  const timeoutThreshold = config.worker.heartbeatInterval * 3; // 3 missed heartbeats
  
  for (const workerId in workers) {
    const worker = workers[workerId];
    const timeSinceLastHeartbeat = now.getTime() - new Date(worker.lastHeartbeat).getTime();
    
    if (timeSinceLastHeartbeat > timeoutThreshold && worker.status !== WorkerStatus.OFFLINE) {
      console.log(`[Worker] Worker ${workerId} marked as offline (no heartbeat for ${timeSinceLastHeartbeat}ms)`);
      worker.status = WorkerStatus.OFFLINE;
      
      // Find jobs assigned to this worker and mark them as failed
      Object.values(jobHistory)
        .filter(job => job.workerId === workerId && job.status === 'processing')
        .forEach(job => {
          job.status = 'failed';
          job.endTime = now;
          job.duration = now.getTime() - new Date(job.startTime).getTime();
          job.payment = calculatePayment(job);
          
          console.log(`[Job] Job ${job.id} marked as failed due to worker offline`);
        });
    }
  }
}, config.worker.heartbeatInterval); 