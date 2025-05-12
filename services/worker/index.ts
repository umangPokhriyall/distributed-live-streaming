import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import config from '../../shared/config';
import { StreamRendition, TranscodingJob, WorkerStatus } from '../../shared/types';
import { validateTsSegment, repairTsSegment } from './utils';

// Store worker configuration
let workerId: string | null = null;
const ipAddress = '127.0.0.1'; // Replace with actual IP detection or command line argument
let isProcessing = false;

// Detect system capabilities
const detectCapabilities = () => {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  
  // Detect GPU if available (simplified - in real app, use node-nvidia-smi or similar)
  let gpu = undefined;
  try {
    // This is a placeholder. In a real app, you'd use a proper GPU detection library
    // For NVIDIA cards, you might use node-nvidia-smi
    // For AMD, you might parse the output of rocm-smi
    // For simplicity, we'll just create a basic placeholder
    gpu = {
      model: 'Placeholder GPU Model',
      memory: 4000 // MB
    };
  } catch (error) {
    console.log('[Worker] No GPU detected or unsupported GPU');
  }
  
  return {
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown CPU'
    },
    gpu,
    memory: Math.floor(totalMemory / (1024 * 1024)), // MB
    maxConcurrentJobs: gpu ? 2 : 1 // If GPU, allow 2 concurrent jobs, else 1
  };
};

// Register with orchestrator
const registerWorker = async () => {
  try {
    const capabilities = detectCapabilities();
    
    const response = await axios.post(`http://${config.redis.host}:${config.ports.orchestrator}/workers/register`, {
      capabilities,
      ipAddress
    });
    console.log('[Worker] Response:', response.data);
    
    workerId = response.data.workerId;
    console.log(`[Worker] Registered with orchestrator. Worker ID: ${workerId}`);
    
    // Create temporary directory for processing
    const tempDir = path.join(config.storagePaths.temp, workerId as string);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    return true;
  } catch (error) {
    console.error('[Worker] Failed to register with orchestrator:', error);
    return false;
  }
};

// Send heartbeat to orchestrator
const sendHeartbeat = async () => {
  if (!workerId) {
    console.error('[Worker] Cannot send heartbeat: Worker not registered');
    return false;
  }
  
  try {
    const status = isProcessing ? WorkerStatus.BUSY : WorkerStatus.IDLE;
    
    await axios.post(`http://${config.redis.host}:${config.ports.orchestrator}/workers/${workerId}/heartbeat`, {
      status
    });
    
    return true;
  } catch (error) {
    console.error('[Worker] Failed to send heartbeat:', error);
    return false;
  }
};

// Poll for jobs
const pollForJobs = async () => {
  console.log('[Worker] Polling for jobs');
  console.log('[Worker] Worker ID:', workerId);
  console.log('[Worker] Is processing:', isProcessing);
  if (!workerId || isProcessing) {
    console.log('[Worker] No worker ID or already processing');
    return;
  }
  
  try {
    const response = await axios.get(`http://${config.redis.host}:${config.ports.orchestrator}/jobs/next`, {
      params: { workerId }
    });
    console.log('[Worker] Response:', response.data);
    if (response.data.jobId && response.data.data) {
      const { jobId, data } = response.data;
      processJob(jobId, data);
    }
  } catch (error) {
    console.error('[Worker] Failed to poll for jobs:', error);
  }
};

// Process a transcoding job
const processJob = async (jobId: string, job: TranscodingJob) => {
  console.log(`[Worker] Processing job ${jobId}`);
  isProcessing = true;
  
  // Get input and output paths
  const inputPath = job.inputPath;
  const outputPath = job.outputPath;
  
  // Create temporary directory
  const tempDir = path.join(config.storagePaths.temp, workerId as string);
  const tempOutputPath = path.join(tempDir, `${uuidv4()}.ts`);
  
  try {
    // Ensure input file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Validate the input segment first
    console.log(`[Worker] Validating input segment: ${inputPath}`);
    const isValid = await validateTsSegment(inputPath);
    
    if (!isValid) {
      console.log(`[Worker] Input segment is invalid, attempting repair: ${inputPath}`);
      const repairedPath = path.join(tempDir, `repaired-${uuidv4()}.ts`);
      const repairSuccess = await repairTsSegment(inputPath, repairedPath);
      
      if (repairSuccess) {
        console.log(`[Worker] Successfully repaired input segment, proceeding with transcoding`);
        // Use the repaired file for transcoding
        await transcodeSegment(repairedPath, tempOutputPath, job.rendition);
        
        // Clean up repaired file
        if (fs.existsSync(repairedPath)) {
          fs.unlinkSync(repairedPath);
        }
      } else {
        throw new Error(`Failed to repair invalid segment: ${inputPath}`);
      }
    } else {
      // Perform transcoding with the original file
      console.log(`[Worker] Input segment is valid, proceeding with transcoding`);
      await transcodeSegment(inputPath, tempOutputPath, job.rendition);
    }
    
    // Copy to final destination
    fs.copyFileSync(tempOutputPath, outputPath);
    
    // Clean up temp file
    fs.unlinkSync(tempOutputPath);
    
    // Report job completion
    await axios.post(`http://${config.redis.host}:${config.ports.orchestrator}/jobs/${jobId}/complete`, {
      workerId,
      outputPath
    });
    
    console.log(`[Worker] Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`[Worker] Job ${jobId} failed:`, error);
    
    // Report job failure
    await axios.post(`http://${config.redis.host}:${config.ports.orchestrator}/jobs/${jobId}/fail`, {
      workerId,
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    isProcessing = false;
  }
};

// Transcode a segment using ffmpeg
const transcodeSegment = (inputPath: string, outputPath: string, rendition: StreamRendition): Promise<void> => {
  return new Promise((resolve, reject) => {
    const { width, height, videoBitrate, audioBitrate, fps } = rendition;
    
    console.log(`[FFmpeg] Starting transcode of segment: ${inputPath}`);
    console.log(`[FFmpeg] Target output: ${outputPath}`);
    console.log(`[FFmpeg] Rendition: ${width}x${height} @ ${videoBitrate}kbps video, ${audioBitrate}kbps audio, ${fps}fps`);
    
    // Check if input file exists and get its size
    try {
      const stats = fs.statSync(inputPath);
      console.log(`[FFmpeg] Input file exists, size: ${stats.size} bytes`);
      if (stats.size === 0) {
        console.error(`[FFmpeg] Warning: Input file is empty!`);
      }
    } catch (err) {
      console.error(`[FFmpeg] Error checking input file: ${err}`);
    }
    
    // Create command
    const command = ffmpeg(inputPath)
      .videoCodec('libx264')
      .size(`${width}x${height}`)
      .videoBitrate(videoBitrate)
      .fps(fps)
      .audioCodec('aac')
      .audioBitrate(audioBitrate)
      .outputOptions([
        '-preset veryfast',
        '-profile:v main',
        '-level 3.1',
        '-sc_threshold 0',
        '-g 48', // keyframe interval, 48 is a common value (2 seconds at 24fps)
        '-f mpegts'
      ]);

    // Add event listeners
    command
      .on('start', (commandLine) => {
        console.log(`[FFmpeg] Command: ${commandLine}`);
      })
      .on('progress', (progress) => {
        console.log(`[FFmpeg] Processing: ${progress.percent}% done`);
      })
      .on('end', () => {
        console.log('[FFmpeg] Transcoding completed');
        // Verify output file exists and is not empty
        try {
          const stats = fs.statSync(outputPath);
          console.log(`[FFmpeg] Output file created, size: ${stats.size} bytes`);
          if (stats.size === 0) {
            console.error(`[FFmpeg] Warning: Output file is empty!`);
          }
        } catch (err) {
          console.error(`[FFmpeg] Error verifying output file: ${err}`);
        }
        resolve();
      })
      .on('error', (err, stdout, stderr) => {
        console.error('[FFmpeg] Error:', err);
        console.error('[FFmpeg] stdout:', stdout);
        console.error('[FFmpeg] stderr:', stderr);
        // Try to check what happened with input file
        try {
          console.error(`[FFmpeg] Checking failed segment: ${inputPath}`);
          // Run ffprobe to get info about the failed segment
          ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) {
              console.error(`[FFmpeg] ffprobe error: ${err.message}`);
            } else {
              console.error('[FFmpeg] Input file metadata:', JSON.stringify(metadata, null, 2));
            }
            reject(err);
          });
        } catch (probeErr) {
          console.error(`[FFmpeg] Error during probe attempt: ${probeErr}`);
          reject(err);
        }
      })
      .output(outputPath)
      .run();
  });
};

// Start worker
const startWorker = async () => {
  console.log('[Worker] Starting worker service...');
  
  // Register with orchestrator
  const registrationSuccess = await registerWorker();
  if (!registrationSuccess) {
    console.error('[Worker] Failed to start: Could not register with orchestrator');
    process.exit(1);
  }
  
  // Set up heartbeat interval
  setInterval(sendHeartbeat, config.worker.heartbeatInterval);
  
  // Set up job polling interval
  setInterval(pollForJobs, config.worker.pollInterval);
  
  console.log('[Worker] Worker service started successfully');
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('[Worker] Shutting down...');
  
  // Wait for current job to complete
  if (isProcessing) {
    console.log('[Worker] Waiting for current job to complete...');
    // Wait a bit for job to complete (in a real scenario, add proper wait mechanism)
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  process.exit(0);
});

// Start the worker
startWorker(); 
 