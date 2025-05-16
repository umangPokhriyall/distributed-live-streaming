import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '../ui/button';

interface WalletButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

const WalletButton: React.FC<WalletButtonProps> = ({ 
  variant = 'default', 
  size = 'default',
  className = '' 
}) => {
  const { wallet, publicKey, disconnect } = useWallet();

  // Truncate SOL address for display
  const getTruncatedAddress = () => {
    if (!publicKey) return '';
    const address = publicKey.toString();
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <>
      {!wallet ? (
        <div className={`wallet-adapter-button-wrapper ${className}`}>
          <WalletMultiButton className="wallet-adapter-button" />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button 
            variant={publicKey ? 'outline' : variant}
            size={size}
            className={className}
            onClick={publicKey ? () => disconnect() : undefined}
          >
            {publicKey ? (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                {getTruncatedAddress()}
              </span>
            ) : (
              'Connect Wallet'
            )}
          </Button>
        </div>
      )}
    </>
  );
};

export default WalletButton; 