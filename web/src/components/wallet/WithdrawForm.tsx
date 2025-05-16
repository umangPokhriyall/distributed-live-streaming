import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

interface WithdrawFormProps {
  workerId: string;
  availableAmount: number;
  onWithdrawSuccess?: (txSignature: string) => void;
  onWithdrawError?: (error: Error) => void;
}

// Worker wallet address that will receive payments
const WORKER_WALLET = new PublicKey('F1kc3KSfQrBt9AENxSyBpd38L1khqA2bxRYmusgRmiM4');
// Parent wallet address 
const PARENT_WALLET = new PublicKey('7dKodJvhtH1kByf9AfTTBSKvLwcgdqRvFDBoBd9zyCpU');

const WithdrawForm: React.FC<WithdrawFormProps> = ({
  workerId,
  availableAmount,
  onWithdrawSuccess,
  onWithdrawError
}) => {
  const { publicKey } = useWallet();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const withdrawFunds = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setIsWithdrawing(true);
      setError(null);

      // In a real app, this would be an API call to your backend
      // The backend would then use its private key to send funds to the worker
      
      // Simulate API call and transaction with a timeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo, generate a fake transaction signature
      const mockSignature = Array(87).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)).join('');
      
      console.log('Withdrawal successful:', mockSignature);
      
      // Set transaction signature and call success callback
      setTxSignature(mockSignature);
      onWithdrawSuccess?.(mockSignature);
      
      setIsWithdrawing(false);
    } catch (err) {
      console.error('Withdrawal failed:', err);
      setError((err as Error).message);
      onWithdrawError?.(err as Error);
      setIsWithdrawing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Withdraw Earnings</CardTitle>
        <CardDescription>
          Transfer your accumulated earnings to your wallet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Worker ID:</span>
            <span className="font-medium">{workerId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Available Balance:</span>
            <span className="font-medium text-lg">{availableAmount.toFixed(5)} SOL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Transaction Fee:</span>
            <span className="font-medium">0.000005 SOL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">You will receive:</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {(availableAmount - 0.000005).toFixed(5)} SOL
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-4">
        {!publicKey ? (
          <div className="text-amber-600 dark:text-amber-400 text-sm text-center">
            Please connect your wallet to withdraw funds
          </div>
        ) : null}
        
        <Button 
          onClick={withdrawFunds} 
          disabled={isWithdrawing || !publicKey || !!txSignature || availableAmount <= 0}
          className="w-full"
        >
          {isWithdrawing ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              Processing...
            </span>
          ) : txSignature ? (
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                <path d="M20 6L9 17L4 12"></path>
              </svg>
              Withdrawal Successful
            </span>
          ) : availableAmount <= 0 ? (
            'No funds to withdraw'
          ) : (
            `Withdraw ${availableAmount.toFixed(5)} SOL`
          )}
        </Button>
        
        {error && (
          <div className="text-destructive text-sm text-center">{error}</div>
        )}
        
        {txSignature && (
          <div className="text-sm text-center">
            <span className="text-muted-foreground">Transaction: </span>
            <a 
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`} 
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline break-all"
            >
              {txSignature.slice(0, 14)}...{txSignature.slice(-14)}
            </a>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default WithdrawForm; 