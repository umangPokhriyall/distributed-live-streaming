// Segment types
export interface VideoSegment {
  id: string;
  streamId: string;
  segmentNumber: number;
  startTime: number;
  duration: number;
  inputPath: string;
  outputPath?: string;
  status: SegmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum SegmentStatus {
  CREATED = 'created',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Stream types
export interface Stream {
  id: string;
  title: string;
  description?: string;
  userId: string;
  streamKey: string;
  isLive: boolean;
  viewerCount: number;
  createdAt: Date;
  updatedAt: Date;
  renditions: StreamRendition[];
}

export interface StreamRendition {
  name: string;
  videoBitrate: number;
  audioBitrate: number;
  width: number;
  height: number;
  fps: number;
}

// Job types
export interface TranscodingJob {
  segmentId: string;
  streamId: string;
  segmentNumber: number;
  inputPath: string;
  outputPath: string;
  rendition: StreamRendition;
  attempts: number;
}

// Worker types
export interface Worker {
  id: string;
  ipAddress: string;
  status: WorkerStatus;
  capabilities: WorkerCapabilities;
  jobsProcessed: number;
  lastHeartbeat: Date;
}

export enum WorkerStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  OFFLINE = 'offline'
}

export interface WorkerCapabilities {
  cpu: {
    cores: number;
    model: string;
  };
  gpu?: {
    model: string;
    memory: number;
  };
  memory: number;
  maxConcurrentJobs: number;
} 