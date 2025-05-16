import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          <span className="solana-text-gradient">DistStream</span>
        </h1>
        
        <h2 className="text-2xl md:text-3xl font-semibold mb-4">
          Decentralized Streaming Platform Powered by Solana
        </h2>
        
        <p className="text-lg mb-8 text-muted-foreground">
          DistStream enables content creators to stream with lower costs 
          while providing fair compensation to network participants.
        </p>
        
        <div className="my-8 p-6 glass-card rounded-xl">
          <h3 className="text-xl font-semibold mb-4">Platform Highlights</h3>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div>
              <h4 className="font-semibold mb-2">Streamers</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Lower streaming costs</li>
                <li>Real-time SOL payments</li>
                <li>Transparent pricing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Workers</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Earn SOL for resources</li>
                <li>Immediate payments</li>
                <li>Choose workload</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Technology</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Solana blockchain</li>
                <li>Phantom wallet integration</li>
                <li>Decentralized network</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate('/streamer')}
            className="solana-gradient text-lg px-8 py-6"
            size="lg"
          >
            Streamer Dashboard
          </Button>
          <Button
            onClick={() => navigate('/worker')}
            className="bg-secondary text-secondary-foreground text-lg px-8 py-6"
            size="lg"
          >
            Worker Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;