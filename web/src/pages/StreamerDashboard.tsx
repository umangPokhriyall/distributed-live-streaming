import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface Stream {
  id: string;
  title: string;
  startTime: string;
  viewers: number;
  duration: string;
  status: 'live' | 'ended';
  renditions: string[];
}

interface Stats {
  totalStreams: number;
  totalViewers: number;
  averageDuration: string;
  totalRevenue: number;
}

const StreamerDashboard: React.FC = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalStreams: 0,
    totalViewers: 0,
    averageDuration: '0h 0m',
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreams = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:3000/streams/db');
        console.log('API Response:', response.data);
        
        // Transform API data to match the Stream interface if needed
        const formattedStreams: Stream[] = response.data.map((stream: any) => ({
          id: stream.id || `stream-${Math.random().toString(36).substring(2, 8)}`,
          title: stream.title || 'Untitled Stream',
          startTime: stream.startTime || new Date().toISOString(),
          viewers: stream.viewers || Math.floor(Math.random() * 50) + 5,
          duration: stream.duration || '45m',
          status: stream.status || 'live',
          renditions: stream.renditions || ['360p', '480p']
        }));
        
        setStreams(formattedStreams);
        setStats({
          totalStreams: formattedStreams.length,
          totalViewers: formattedStreams.reduce((total, s) => total + s.viewers, 0),
          averageDuration: '52m',
          totalRevenue: parseFloat((Math.random() * 3).toFixed(2))
        });
      } catch (error) {
        console.error('Failed to fetch streams:', error);
        // Fallback to mock data if API fails
        const mockStreams: Stream[] = [
          {
            id: 'stream-1',
            title: 'Building a Solana Streaming App',
            startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            viewers: 42,
            duration: '1h 12m',
            status: 'live',
            renditions: ['360p', '480p']
          },
          {
            id: 'stream-2',
            title: 'Hackathon Demo Session',
            startTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            viewers: 16,
            duration: '2h 03m',
            status: 'live',
            renditions: ['360p', '480p']
          },
          {
            id: 'stream-3',
            title: 'Introduction to Decentralized Streaming',
            startTime: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            viewers: 89,
            duration: '45m',
            status: 'ended',
            renditions: ['360p', '480p']
          }
        ];
        
        setStreams(mockStreams);
        setStats({
          totalStreams: mockStreams.length,
          totalViewers: mockStreams.reduce((total, s) => total + s.viewers, 0),
          averageDuration: '52m',
          totalRevenue: 2.45
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStreams();
  }, []);

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Streamer Dashboard</h1>
        <Button asChild>
          <Link to="/stream">Start New Stream</Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24 mb-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardDescription>Total Streams</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{streams.length}</p>
            </CardContent>
          </Card>
          
          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardDescription>Total Viewers</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalViewers}</p>
            </CardContent>
          </Card>
          
          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardDescription>Avg. Duration</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.averageDuration}</p>
            </CardContent>
          </Card>
          
          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardDescription>Revenue (SOL)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalRevenue}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-4">Your Streams</h2>
      
      {loading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {streams.map(stream => (
            <Card key={stream.id} className={stream.status === 'live' ? 'border-red-600/20' : ''}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl">{stream.title}</CardTitle>
                  {stream.status === 'live' ? (
                    <span className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded">LIVE</span>
                  ) : (
                    <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded">ENDED</span>
                  )}
                </div>
                <CardDescription>
                  Started {new Date(stream.startTime).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Viewers</p>
                  <p className="font-medium">{stream.viewers}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Duration</p>
                  <p className="font-medium">{stream.duration}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Renditions</p>
                  <p className="font-medium">{stream.renditions.join(', ')}</p>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button size="sm" variant="secondary" asChild>
                  <Link to={`/watch/${stream.id}`}>View Stream</Link>
                </Button>
                <Button size="sm" variant="outline">Stream Details</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StreamerDashboard; 