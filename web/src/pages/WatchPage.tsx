import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import VideoPlayer from '../components/VideoPlayer';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

interface Stream {
  id: string;
  title: string;
  description?: string;
  isLive: boolean;
  viewerCount: number;
}

const WatchPage: React.FC = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!streamId) return;

    const fetchStreamDetails = async () => {
      try {
        setLoading(true);
        // Try to fetch from API, fall back to mock data if needed
        try {
          const response = await axios.get(`http://localhost:3000/streams/${streamId}`);
          setStream(response.data);
        } catch (err) {
          console.log('Using mock data for stream details');
          // Mock data
          setStream({
            id: streamId,
            title: `Live Stream: ${streamId}`,
            description: 'This is a live streaming demonstration using DistStream.',
            isLive: true,
            viewerCount: Math.floor(Math.random() * 100) + 1
          });
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching stream:', err);
        setError('Failed to load stream details');
      } finally {
        setLoading(false);
      }
    };

    fetchStreamDetails();

    // Poll for updates every 10 seconds
    const intervalId = setInterval(fetchStreamDetails, 10000);

    return () => clearInterval(intervalId);
  }, [streamId]);

  if (loading && !stream) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-40 rounded-lg border border-border bg-card animate-pulse">
          <p className="text-muted-foreground">Loading stream...</p>
        </div>
      </div>
    );
  }

  if (!streamId) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Stream Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">The stream you're looking for doesn't exist.</p>
            <Button asChild>
              <Link to="/">Back to streams</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <VideoPlayer streamId={streamId} serverPort={8082} />
          
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold">{stream?.title || `Live Stream: ${streamId}`}</CardTitle>
                {stream?.isLive && (
                  <span className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded-md">
                    LIVE
                  </span>
                )}
              </div>
              {stream?.viewerCount && (
                <CardDescription>
                  <div className="flex items-center text-sm">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-600 mr-2"></span>
                    <span>{stream.viewerCount} watching now</span>
                  </div>
                </CardDescription>
              )}
            </CardHeader>
            {stream?.description && (
              <CardContent>
                <h3 className="text-base font-medium mb-2">About this stream</h3>
                <p className="text-muted-foreground">{stream.description}</p>
              </CardContent>
            )}
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Chat</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center bg-muted/50">
              <p className="text-muted-foreground text-sm">Chat functionality coming soon</p>
            </CardContent>
          </Card>
          
          {/* Demo Flow - Help process this stream */}
          <Card className="mt-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">⚡ Help process this stream</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                This stream needs computing power. Earn SOL by running a worker node to help transcode video segments.
              </p>
              <Button className="w-full bg-green-600 hover:bg-green-700" asChild>
                <Link to={`/worker?streamId=${streamId}`}>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-300 mr-2 animate-pulse"></span>
                  Start Processing
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="flex justify-start">
        <Button variant="outline" asChild>
          <Link to="/">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Back to all streams
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default WatchPage; 