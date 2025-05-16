import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

interface PaymentFormProps {
  streamId?: string;
  onPaymentSuccess?: (txSignature: string) => void;
  onPaymentError?: (error: Error) => void;
}

// Parent wallet - the platform wallet that receives payments
const PARENT_WALLET = new PublicKey('7dKodJvhtH1kByf9AfTTBSKvLwcgdqRvFDBoBd9zyCpU');
const PAYMENT_AMOUNT = 0.05; // SOL

const PaymentForm: React.FC<PaymentFormProps> = ({ 
  streamId = 'new-stream',
  onPaymentSuccess,
  onPaymentError
}) => {
  const { publicKey, sendTransaction } = useWallet();
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const makePayment = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setIsPaying(true);
      setError(null);

      // Connect to the devnet
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      
      // Create a new transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: PARENT_WALLET,
          lamports: LAMPORTS_PER_SOL * PAYMENT_AMOUNT
        })
      );

      // Set recent blockhash and fee payer
      transaction.feePayer = publicKey;
      const blockhashResponse = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhashResponse.blockhash;

      // Send the transaction
      const signature = await sendTransaction(transaction, connection);
      console.log('Transaction sent with signature:', signature);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      console.log('Transaction confirmed:', confirmation);

      // Set transaction signature and call success callback
      setTxSignature(signature);
      onPaymentSuccess?.(signature);

      // For demo purposes, let's simulate some processing time
      setTimeout(() => {
        setIsPaying(false);
      }, 2000);
    } catch (err) {
      console.error('Payment failed:', err);
      setError((err as Error).message);
      onPaymentError?.(err as Error);
      setIsPaying(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Stream Payment</CardTitle>
        <CardDescription>
          Pay {PAYMENT_AMOUNT} SOL to create your stream. Workers will receive a portion of this payment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {streamId !== 'new-stream' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stream ID:</span>
              <span className="font-medium">{streamId}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">{PAYMENT_AMOUNT} SOL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform Fee:</span>
            <span className="font-medium">0.02 SOL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Worker Reward Pool:</span>
            <span className="font-medium">0.03 SOL</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-4">
        {!publicKey ? (
          <div className="text-amber-600 dark:text-amber-400 text-sm text-center">
            Please connect your wallet to make a payment
          </div>
        ) : null}
        
        <Button 
          onClick={makePayment} 
          disabled={isPaying || !publicKey || !!txSignature}
          className="w-full"
        >
          {isPaying ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              Processing...
            </span>
          ) : txSignature ? (
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                <path d="M20 6L9 17L4 12"></path>
              </svg>
              Payment Successful
            </span>
          ) : (
            `Pay ${PAYMENT_AMOUNT} SOL`
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

export default PaymentForm; 