import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface Stream {
  id: string;
  title: string;
  description?: string;
  isLive: boolean;
  viewerCount: number;
}

const StreamList: React.FC = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        setLoading(true);
        // For demonstration, we'll generate mock data if the API call fails
        try {
          const response = await axios.get('/api/streams');
          setStreams(response.data);
        } catch (error) {
          console.warn('Using mock data due to API error');
          // Mock data for demonstration
          setStreams([
            {
              id: 'stream1',
              title: 'Live Coding Session',
              description: 'Building a distributed streaming platform',
              isLive: true,
              viewerCount: 124
            },
            {
              id: 'stream2',
              title: 'Gaming Stream',
              description: 'Playing the latest releases',
              isLive: true,
              viewerCount: 56
            },
            {
              id: 'stream3',
              title: 'Tech Talk',
              description: 'Discussing modern web technologies',
              isLive: false,
              viewerCount: 0
            }
          ]);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching streams:', err);
        setError('Failed to load streams. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();

    // Poll for updates every 10 seconds
    const intervalId = setInterval(fetchStreams, 10000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading && streams.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-40 rounded-lg border border-border bg-card animate-pulse">
          <p className="text-muted-foreground">Loading streams...</p>
        </div>
      </div>
    );
  }

  if (error && streams.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="p-6 rounded-lg border border-destructive bg-card">
          <h3 className="text-destructive font-medium">Error</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Live Streams</h2>
        <Button asChild>
          <Link to="/stream">Start Streaming</Link>
        </Button>
      </div>
      
      {streams.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-40">
            <p className="text-muted-foreground">No live streams available at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {streams.map(stream => (
            <Card key={stream.id} className={`overflow-hidden transition-all duration-200 hover:shadow-lg ${stream.isLive ? 'border-red-600/20' : ''}`}>
              <div className="relative">
                {stream.isLive && (
                  <span className="absolute top-2 right-2 z-10 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded">
                    LIVE
                  </span>
                )}
                <Link to={`/watch/${stream.id}`} className="block">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <div className="rounded-full bg-background/80 w-12 h-12 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </div>
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-lg">
                  <Link to={`/watch/${stream.id}`} className="hover:underline">
                    {stream.title}
                  </Link>
                </CardTitle>
                {stream.description && (
                  <CardDescription className="line-clamp-2">
                    {stream.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardFooter className="p-4 pt-2">
                {stream.isLive ? (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-600 mr-2"></span>
                    <span>{stream.viewerCount} watching</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Offline</div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StreamList; 