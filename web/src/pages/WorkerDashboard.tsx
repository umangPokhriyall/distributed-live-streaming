import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import WithdrawForm from '../components/wallet/WithdrawForm';
import { useWallet } from '@solana/wallet-adapter-react';

// Constants
const ORCHESTRATOR_PORT = 3001; // Make sure this matches your orchestrator port
const ORCHESTRATOR_URL = `http://localhost:${ORCHESTRATOR_PORT}`;

interface Job {
  id: string;
  streamId: string;
  segmentNumber: number;
  rendition: string;
  status: 'completed' | 'failed' | 'processing';
  duration?: number; // milliseconds
  startTime: string | Date;
  endTime?: string | Date;
  payment?: number; // SOL
  workerId: string;
}

interface WorkerStats {
  totalJobs: number;
  successRate: number;
  totalEarnings: number;
  cpuUtilization: number;
  activeStatus: boolean;
}

const WorkerDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<WorkerStats>({
    totalJobs: 0,
    successRate: 0,
    totalEarnings: 0,
    cpuUtilization: 0,
    activeStatus: false
  });
  const [loading, setLoading] = useState(true);
  const [isWorkerActive, setIsWorkerActive] = useState(false);
  const [workerId, setWorkerId] = useState<string>('worker-1'); // Default to demo worker
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  
  // Extract streamId from URL query parameters if coming from stream view
  const queryParams = new URLSearchParams(location.search);
  const currentStreamId = queryParams.get('streamId') || 'hackathon-demo-stream';

  // Fetch worker stats
  const fetchWorkerStats = async () => {
    try {
      // In a real app, this would come from an actual API
      // For demo purposes, we'll use the orchestrator API if available, or fall back to demo data
      try {
        const response = await axios.get(`${ORCHESTRATOR_URL}/workers/${workerId}/stats`);
        const workerStats = response.data;
        
        setStats({
          totalJobs: workerStats.totalJobs || 0,
          successRate: workerStats.successRate || 98.5,
          totalEarnings: workerStats.totalEarnings || 0,
          cpuUtilization: isWorkerActive ? (Math.floor(Math.random() * 30) + 65) : 0, // Random CPU usage when active
          activeStatus: isWorkerActive
        });
        
        console.log('Fetched worker stats:', workerStats);
      } catch (error) {
        console.error('Error fetching worker stats, using mock data', error);
        // Fall back to mock data
        setStats({
          totalJobs: jobs.length,
          successRate: 98.5,
          totalEarnings: isWorkerActive ? parseFloat((stats.totalEarnings + 0.005).toFixed(3)) : stats.totalEarnings,
          cpuUtilization: isWorkerActive ? (Math.floor(Math.random() * 30) + 65) : 0,
          activeStatus: isWorkerActive
        });
      }
    } catch (error) {
      console.error('Error fetching worker stats:', error);
    }
  };

  // Fetch worker jobs
  const fetchWorkerJobs = async () => {
    try {
      try {
        // Try to get real data from the orchestrator API
        const response = await axios.get(`${ORCHESTRATOR_URL}/workers/${workerId}/jobs`);
        const workerJobs = response.data;
        
        // Sort by most recent first
        workerJobs.sort((a: Job, b: Job) => 
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        
        setJobs(workerJobs.slice(0, 20)); // Limit to 20 jobs
        console.log('Fetched worker jobs:', workerJobs);
      } catch (error) {
        console.error('Error fetching worker jobs, using mock data', error);
        // Fall back to mock data generation
        const mockJobs = generateMockJobs();
        setJobs(mockJobs);
      }
    } catch (error) {
      console.error('Error fetching worker jobs:', error);
    }
  };

  // Generate mock jobs for demo purposes when API is not available
  const generateMockJobs = (isInitial = true) => {
    // For demo purpose, always include some segments from the current stream
    const currentStreamJobs = Array.from({ length: 3 }, (_, i) => ({
      id: `job-${Date.now()}-${i}`,
      streamId: currentStreamId,
      segmentNumber: isInitial ? Math.floor(Math.random() * 5) : jobs.length + i,
      rendition: ['360p', '480p'][Math.floor(Math.random() * 2)],
      status: 'processing' as 'processing', // Explicitly typed as 'processing'
      duration: undefined,
      startTime: new Date().toISOString(),
      endTime: undefined,
      payment: undefined,
      workerId
    }));
    
    // Sort by timestamp (latest first)
    currentStreamJobs.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    
    return currentStreamJobs;
  };

  // Toggle worker active status
  const toggleWorkerStatus = async () => {
    const newStatus = !isWorkerActive;
    setIsWorkerActive(newStatus);
    
    try {
      if (newStatus) {
        // If activating, try to register with the orchestrator or refresh the worker status
        try {
          // For demo purposes, assume the demo worker is already registered
          // In a real app, you'd register a new worker here if needed
          const statusResponse = await axios.post(`${ORCHESTRATOR_URL}/workers/${workerId}/heartbeat`, {
            status: 'idle'
          });
          console.log('Worker status updated:', statusResponse.data);
        } catch (error) {
          console.error('Error updating worker status, using mock mode', error);
        }
      } else {
        // If deactivating, update worker status
        try {
          const statusResponse = await axios.post(`${ORCHESTRATOR_URL}/workers/${workerId}/heartbeat`, {
            status: 'offline'
          });
          console.log('Worker status updated:', statusResponse.data);
        } catch (error) {
          console.error('Error updating worker status', error);
        }
      }
    } catch (error) {
      console.error('Error toggling worker status:', error);
    }
    
    // Update stats immediately for UI feedback
    setStats(prev => ({
      ...prev,
      cpuUtilization: newStatus ? 65 : 0,
      activeStatus: newStatus
    }));
  };

  // Initial data fetch
  useEffect(() => {
    setLoading(true);
    
    // Perform initial data fetching
    const fetchInitialData = async () => {
      await fetchWorkerStats();
      await fetchWorkerJobs();
      setLoading(false);
    };
    
    fetchInitialData();
  }, []);

  // Set up polling when worker is active
  useEffect(() => {
    if (isWorkerActive) {
      // Start polling for updates
      updateIntervalRef.current = setInterval(() => {
        fetchWorkerStats();
        fetchWorkerJobs();
      }, 3000); // Poll every 3 seconds
    } else {
      // Clear interval when worker is inactive
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    }
    
    // Cleanup on component unmount
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isWorkerActive]);

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Worker Dashboard</h1>
        <div className="flex gap-2 items-center">
          {!isWorkerActive && (
            <div className="animate-pulse text-blue-600 dark:text-blue-400 text-sm mr-2">
              Start the worker to process stream segments!
            </div>
          )}
          <Button 
            variant={isWorkerActive ? "destructive" : "default"}
            onClick={toggleWorkerStatus}
            className={isWorkerActive ? "" : "animate-pulse bg-green-600 hover:bg-green-700"}
            size="lg"
          >
            {isWorkerActive ? 'Stop Worker' : 'Start Worker'}
          </Button>
        </div>
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
          <Card className={`stat-card ${isWorkerActive ? 'border-green-500/30' : ''}`}>
            <CardHeader className="pb-2">
              <CardDescription>Status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${isWorkerActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                <p className="text-xl font-bold">{stats.activeStatus ? 'Active' : 'Inactive'}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardDescription>Total Jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalJobs}</p>
            </CardContent>
          </Card>
          
          <Card className={`stat-card ${isWorkerActive ? 'border-yellow-500/30' : ''}`}>
            <CardHeader className="pb-2">
              <CardDescription>CPU Utilization</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-3xl font-bold">{stats.cpuUtilization}%</p>
                {isWorkerActive && stats.cpuUtilization > 80 && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">High load</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardDescription>Earnings (SOL)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalEarnings}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Withdraw Earnings Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Worker Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Worker ID</p>
              <p className="font-medium">{workerId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Success Rate</p>
              <p className="font-medium">{stats.successRate}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Wallet Address</p>
              <p className="font-medium truncate">
                {publicKey ? `${publicKey.toString().substring(0, 8)}...${publicKey.toString().substring(publicKey.toString().length - 6)}` : 'Not connected'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Supported Renditions</p>
              <p className="font-medium">360p, 480p</p>
            </div>
          </CardContent>
        </Card>

        <WithdrawForm 
          workerId={workerId}
          availableAmount={stats.totalEarnings}
          onWithdrawSuccess={(signature) => {
            // Reset earnings to 0 after withdrawal
            setStats(prev => ({
              ...prev,
              totalEarnings: 0
            }));
          }}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Recent Jobs</h2>
        {isWorkerActive && (
          <div className="flex items-center text-sm text-green-600 dark:text-green-400">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></span>
            <span>Processing stream segments in real-time</span>
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2">Job ID</th>
                <th className="text-left pb-2">Stream</th>
                <th className="text-left pb-2">Segment</th>
                <th className="text-left pb-2">Rendition</th>
                <th className="text-left pb-2">Status</th>
                <th className="text-left pb-2">Duration</th>
                <th className="text-left pb-2">Timestamp</th>
                <th className="text-right pb-2">Payment</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id} className={`border-b border-border/40 hover:bg-muted/50 ${job.status === 'processing' ? 'bg-blue-50 dark:bg-blue-900/10' : ''}${job.streamId === currentStreamId ? ' bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
                  <td className="py-3 pr-4">{job.id.substring(0, 10)}...</td>
                  <td className="py-3 pr-4">
                    {job.streamId === currentStreamId ? (
                      <span className="font-medium text-amber-600 dark:text-amber-400">{job.streamId}</span>
                    ) : (
                      job.streamId
                    )}
                  </td>
                  <td className="py-3 pr-4">{job.segmentNumber}</td>
                  <td className="py-3 pr-4">{job.rendition}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${job.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse' :
                      job.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      job.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {job.status === 'processing' ? 'Processing...' : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {job.duration ? `${job.duration}ms` : job.endTime ? 
                      `${Math.floor(Math.abs(new Date(job.endTime).getTime() - new Date(job.startTime).getTime()))}ms` :
                      'In progress'}
                  </td>
                  <td className="py-3 pr-4">{new Date(job.startTime).toLocaleTimeString()}</td>
                  <td className="py-3 text-right">{job.payment?.toFixed(5) || '0.00000'} SOL</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard; 