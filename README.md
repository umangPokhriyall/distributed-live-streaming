# DistStream - Distributed Live Streaming Platform

DistStream is a distributed live streaming platform similar to Livepeer that decentralizes video processing workloads. It allows anyone with even a low-end GPU to participate in the network for processing video segments.

## Architecture

DistStream consists of several key components:

1. **Ingestion Service**: Captures RTMP streams from broadcasters and segments them into small chunks
2. **Orchestrator Service**: Coordinates the overall system and distributes transcoding jobs
3. **Worker Service**: Processes video segments independently on distributed nodes
4. **Delivery Service**: Serves HLS/DASH content to viewers
5. **API Service**: Handles client-side interactions and manages stream metadata
6. **Web Interface**: Provides a user interface for viewers

## Project Structure

```
dist-stream/
├── api/                  # API service for client interactions
├── services/
│   ├── ingestion/        # RTMP ingestion and segmentation
│   ├── orchestrator/     # Job coordination and distribution
│   ├── worker/           # Video processing workers
│   └── delivery/         # HLS content delivery
├── shared/               # Shared code and types
├── storage/              # Storage for video segments
├── web/                  # Web interface for viewers
└── scripts/              # Utility scripts
```

## Prerequisites

- Node.js 16+
- Redis server
- FFmpeg with libx264 support
- TypeScript

## Getting Started

### 1. Install Dependencies

```bash
# Install root project dependencies
npm install

# Install web client dependencies
cd web
npm install
cd ..
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```
# Node environment
NODE_ENV=development

# Server ports
API_PORT=3000
RTMP_PORT=1935
HTTP_PORT=8000
WEBSOCKET_PORT=8001

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Storage paths
SEGMENTS_PATH=./storage/segments
THUMBNAILS_PATH=./storage/thumbnails
TEMP_PATH=./storage/temp

# Stream settings
SEGMENT_DURATION=4
MAX_BITRATE=5000

# Worker settings
WORKER_POLL_INTERVAL=1000
WORKER_HEARTBEAT_INTERVAL=5000
WORKER_JOB_TIMEOUT=60000
```

### 3. Build the Project

```bash
npm run build
```

### 4. Start the Services

```bash
# Start all services in development mode
npm run dev

# Or start services individually
npm run start:ingestion
npm run start:orchestrator
npm run start:worker
npm run start:delivery
npm run start:api
```

### 5. Start the Web Interface

```bash
cd web
npm start
```

## Streaming

To stream to DistStream:

1. Create a stream using the API: `POST /streams`
2. Use the returned stream key to stream to: `rtmp://localhost:1935/live/{streamKey}`
3. View the stream at: `http://localhost:3000/watch/{streamId}`

## Contributing

Contributions are welcome! This is a hackathon project with a focus on:

- Scalability: The system should scale horizontally with more worker nodes
- Resilience: The system should be resistant to node failures
- Low barrier to entry: Anyone with modest hardware should be able to participate

## License

MIT
