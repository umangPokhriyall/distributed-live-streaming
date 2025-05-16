import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../button'
import { cn } from '../../../lib/utils'
import WalletButton from '../../wallet/WalletButton'

type NavbarProps = {
  className?: string
}

export function Navbar({ className }: NavbarProps) {
  return (
    <header className={cn(
      "w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6 md:gap-10">
          <Link to="/" className="flex items-center space-x-2">
            <span className="font-bold text-2xl bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              DistStream
            </span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link
              to="/"
              className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              Home
            </Link>
            <Link
              to="/streamer"
              className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              Streamer Dashboard
            </Link>
            <Link
              to="/worker"
              className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              Worker Dashboard
            </Link>
            <Link
              to="/stream"
              className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              Start Streaming
            </Link>
            <Link
              to="/about"
              className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              About
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <WalletButton variant="default" size="sm" className="hidden md:flex" />
          <Button variant="outline" size="icon" className="md:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[1.2rem] w-[1.2rem]">
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
    </header>
  )
} 