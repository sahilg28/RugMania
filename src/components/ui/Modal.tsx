'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, subtitle, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto mx-4"
          >
            <div className="bg-zinc-900 border-2 border-lime-400 rounded-xl p-6 relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-lime-400 text-black hover:bg-lime-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Header */}
              <div className="text-center mb-6 pr-8">
                <h2 className="text-white text-xl font-black">{title}</h2>
                {subtitle && <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>}
              </div>
              
              {/* Content */}
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
