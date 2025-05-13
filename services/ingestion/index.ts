import NodeMediaServer from 'node-media-server';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import Queue from 'bull';
import config from '../../shared/config';
import { StreamRendition, TranscodingJob } from '../../shared/types';
import axios from 'axios';

// Ensure storage directories exist
const { segments, temp } = config.storagePaths;
[segments, temp].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create transcoding queue
const transcodingQueue = new Queue(config.queues.transcoding, {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  }
});

// Configure Node Media Server
const nmsConfig = {
  rtmp: {
    port: config.ports.rtmp,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8888,
    allow_origin: '*'
  },
  auth: {
    play: false,
    publish: false, // Set to true in production and implement proper auth
  }
};

// Initialize Node Media Server
const nms = new NodeMediaServer(nmsConfig as any);

// Handle stream start event
nms.on('prePublish', async (id: string, StreamPath: string, args: any) => {
  console.log('[RTMP] Stream started:', StreamPath);
  
  // Extract stream key from path
  const streamKey = StreamPath.split('/')[2];
  console.log('[RTMP] Stream key:', streamKey);
  
  // Generate a unique ID for this stream
  const stream = await axios.get('http://localhost:3000/streams/')
  const streamId = stream.data.find((stream: any) => stream.streamKey === streamKey)?.id;
  console.log('[RTMP] Stream:', stream.data);
  console.log('[RTMP] Stream ID:', streamId);
  
  // Create stream directory
  const streamDir = path.join(segments, streamId);
  console.log('[RTMP] Stream directory:', streamDir);
  if (!fs.existsSync(streamDir)) {
    fs.mkdirSync(streamDir, { recursive: true });
  }
  
  // Start FFmpeg process to segment the stream
  startSegmentation(streamId, streamKey);
});

// Handle stream end event
nms.on('donePublish', (id: string, StreamPath: string, args: any) => {
  console.log('[RTMP] Stream ended:', StreamPath);
  // Additional cleanup logic could be added here
});

// Function to start FFmpeg segmentation process
function startSegmentation(streamId: string, streamKey: string) {
  const streamInput = `rtmp://localhost:${config.ports.rtmp}/live/${streamKey}`;
  const segmentOutputDir = path.join(segments, streamId);
  const segmentDuration = config.streaming.segmentDuration;
  console.log('[RTMP] Segment output directory:', segmentOutputDir);
  console.log('[RTMP] Segment duration:', segmentDuration);
  // Ensure the output directory exists
  if (!fs.existsSync(segmentOutputDir)) {
    fs.mkdirSync(segmentOutputDir, { recursive: true });
  }
  
  // FFmpeg command to segment the stream into .ts files
  const ffmpeg = spawn('ffmpeg', [
    '-i', streamInput,
    '-force_key_frames', `expr:gte(t,n_forced*${segmentDuration})`, // Enforce keyframes at segment boundaries
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-g', (2 * segmentDuration * 30).toString(), // GOP size = 2x segment duration @ 30fps
    '-sc_threshold', '0',
    '-c:a', 'aac',
    '-f', 'segment',
    '-segment_time', segmentDuration.toString(),
    '-segment_format', 'mpegts',
    '-reset_timestamps', '1',
    path.join(segmentOutputDir, '%d.ts')
  ]);
  
  
  // Log FFmpeg output
  ffmpeg.stdout.on('data', (data) => {
    console.log(`[FFmpeg] ${data}`);
  });
  
  ffmpeg.stderr.on('data', (data) => {
    console.log(`[FFmpeg] ${data}`);
  });
  
  // Watch the output directory for new segments
  const watcher = fs.watch(segmentOutputDir, (eventType: string, filename: string | null) => {
    if (filename) {
      console.log(`[Watcher] ${eventType} ${filename}`);
    }
    if (eventType === 'rename' && filename && filename?.endsWith('.ts')) {
      const segmentNumber = parseInt(filename?.replace('.ts', ''), 10);
      if (!isNaN(segmentNumber)) {
        processNewSegment(streamId, segmentNumber, path.join(segmentOutputDir, filename as string));
      }
    }
  });


  // Clean up when the process exits
  ffmpeg.on('close', (code: number) => {
    console.log(`[FFmpeg] Segmentation process exited with code ${code}`);
    watcher.close();
  });
}

// Process a new segment and queue it for transcoding
async function processNewSegment(streamId: string, segmentNumber: number, filepath: string) {
  console.log(`[Segment] New segment ${segmentNumber} for stream ${streamId}`);

  const limitedRenditions = config.streaming.defaultRenditions.filter(
    r =>  r.name === '480p' || r.name === '360p'
  );
  
  // Queue transcoding jobs for each rendition
  for (const rendition of limitedRenditions) {
    await queueTranscodingJob(streamId, segmentNumber, filepath, rendition);
  }
}

// Queue a transcoding job
async function queueTranscodingJob(
  streamId: string,
  segmentNumber: number,
  inputPath: string,
  rendition: StreamRendition
) {
  const segmentId = uuidv4();
  const outputDir = path.join(segments, streamId, rendition.name);
  console.log('[RTMP] Output directory:', outputDir);
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, `${segmentNumber}.ts`);
  console.log('[RTMP] Output path:', outputPath);
  // Create job data
  const job: TranscodingJob = {
    segmentId,
    streamId,
    segmentNumber,
    inputPath,
    outputPath,
    rendition,
    attempts: 0
  };
  console.log('[RTMP] Job:', job);
  // Add job to queue
  try {
  await transcodingQueue.add(job, {
    attempts: 3,
    backoff: {
      type: 'exponential',
        delay: 1000
      }
    });
  } catch (error) {
    console.error('[RTMP] Error adding job to queue:', error);
  }
  
  console.log(`[Queue] Transcoding job added for segment ${segmentNumber}, rendition ${rendition.name}`);
}

// Start the server
nms.run();
console.log(`[Ingestion] RTMP server running on port ${config.ports.rtmp}`);
console.log(`[Ingestion] HTTP server running on port 8888`);

// Handle process termination
process.on('SIGINT', () => {
  console.log('[Ingestion] Shutting down...');
  nms.stop();
  process.exit(0);
}); 