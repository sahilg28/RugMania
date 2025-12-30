'use client'

interface FooterProps {
  onOpenHowItWorks?: () => void
}

export function Footer({ onOpenHowItWorks }: FooterProps) {
  return (
    <footer className="border-t border-zinc-800/30 mt-auto" style={{ backgroundColor: 'var(--color-bg-dark)' }}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-6">
            {onOpenHowItWorks && (
              <button 
                onClick={onOpenHowItWorks} 
                className="text-zinc-400 font-semibold text-sm hover:text-main transition-colors"
              >
                How It Works
              </button>
            )}
            <a href="https://docs.rugmania.xyz" target="_blank" rel="noopener noreferrer" className="text-zinc-400 font-semibold text-sm hover:text-main transition-colors">Docs</a>
          </nav>
          <a href="https://x.com/rugmania" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  )
}
