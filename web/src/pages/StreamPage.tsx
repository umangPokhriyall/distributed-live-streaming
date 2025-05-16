import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import PaymentForm from '../components/wallet/PaymentForm';
import { useWallet } from '@solana/wallet-adapter-react';

interface StreamFormData {
  title: string;
  description: string;
}

const StreamPage: React.FC = () => {
  const [streamData, setStreamData] = useState<StreamFormData>({
    title: '',
    description: ''
  });
  const [streamKey, setStreamKey] = useState<string>('');
  const [streamId, setStreamId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [deviceLoaded, setDeviceLoaded] = useState<boolean>(false);
  const [paymentComplete, setPaymentComplete] = useState<boolean>(false);
  const [streamCreated, setStreamCreated] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const { publicKey } = useWallet();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStreamData({
      ...streamData,
      [name]: value
    });
  };

  const startCamera = async () => {
    try {
      const constraints = {
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setDeviceLoaded(true);
      setError(null);
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Failed to access camera and microphone. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setDeviceLoaded(false);
    }
  };

  useEffect(() => {
    // Clean up on component unmount
    return () => {
      stopCamera();
    };
  }, []);

  const createStream = async () => {
    try {
      if (!streamData.title) {
        setError('Please enter a stream title');
        return;
      }

      // Try actual API, fallback to mockup
      try {
        const response = await axios.post('http://localhost:3000/streams', {
          title: streamData.title,
          description: streamData.description,
          userId: 'user-' + Math.random().toString(36).substring(2, 9) // Mock user ID for demo
        });
        setStreamId(response.data.id);
        setStreamKey(response.data.streamKey);
      } catch (err) {
        console.log('Using mock stream data');
        // Create mock stream data
        const mockStreamId = 'stream-' + Math.random().toString(36).substring(2, 9);
        const mockStreamKey = 'live_' + Math.random().toString(36).substring(2, 15);
        setStreamId(mockStreamId);
        setStreamKey(mockStreamKey);
      }
      setStreamCreated(true);
      setError(null);
    } catch (err) {
      console.error('Error creating stream:', err);
      setError('Failed to create stream. Please try again.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  const handlePaymentSuccess = (txSignature: string) => {
    console.log('Payment successful with signature:', txSignature);
    setPaymentComplete(true);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Stream Setup</h1>
        
        {!paymentComplete ? (
          // Step 1: Payment form
          <div className="mb-6">
            <PaymentForm 
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={(err) => setError(err.message)}
            />
            <div className="p-4 mt-6 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-sm border border-blue-200 dark:border-blue-900/50">
              <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">Important:</p>
              <p className="text-blue-700 dark:text-blue-400">
                Please complete the payment to continue with stream setup. Workers who process your stream segments will be rewarded from this payment.
              </p>
            </div>
          </div>
        ) : !streamCreated ? (
          // Step 2: Stream creation form after payment
          <Card>
            <CardHeader>
              <CardTitle>Create New Stream</CardTitle>
              <CardDescription>Fill in the details to start your new stream</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Stream Title*
                </label>
                <input 
                  type="text" 
                  id="title" 
                  name="title" 
                  value={streamData.title} 
                  onChange={handleInputChange} 
                  placeholder="Enter a title for your stream"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <textarea 
                  id="description" 
                  name="description" 
                  value={streamData.description} 
                  onChange={handleInputChange} 
                  placeholder="Describe your stream (optional)"
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={createStream}>
                Create Stream
              </Button>
              {error && (
                <p className="ml-4 text-destructive text-sm">{error}</p>
              )}
            </CardFooter>
          </Card>
        ) : (
          // Step 3: Stream details after creation
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stream Information</CardTitle>
                  <CardDescription>Use these details in your streaming software</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stream Key</label>
                    <div className="flex">
                      <code className="flex-1 px-3 py-2 bg-muted rounded-l-md overflow-x-auto">
                        {streamKey}
                      </code>
                      <Button 
                        variant="outline" 
                        className="rounded-l-none"
                        onClick={() => copyToClipboard(streamKey)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">RTMP URL</label>
                    <div className="flex">
                      <code className="flex-1 px-3 py-2 bg-muted rounded-l-md overflow-x-auto">
                        rtmp://localhost:1935/live/{streamKey}
                      </code>
                      <Button 
                        variant="outline" 
                        className="rounded-l-none"
                        onClick={() => copyToClipboard(`rtmp://localhost:1935/live/${streamKey}`)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => navigate(`/watch/${streamId}`)}
                  >
                    Go to Stream Page
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Camera Preview</CardTitle>
                  <CardDescription>Check your camera before streaming</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full aspect-video bg-muted rounded-md overflow-hidden">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  {!deviceLoaded ? (
                    <Button onClick={startCamera}>
                      Start Camera
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={stopCamera}>
                      Stop Camera
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </div>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Note on Browser Streaming</CardTitle>
                <CardDescription>For the best streaming experience</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  For the best quality live stream, we recommend using dedicated broadcasting software like OBS Studio or Streamlabs OBS. 
                  Use the RTMP URL and stream key above to configure your broadcasting software.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamPage; 