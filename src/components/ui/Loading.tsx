'use client'

import { motion } from 'framer-motion'

export function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-grid" style={{ backgroundColor: 'var(--color-bg-dark)' }}>
      <div className="relative flex flex-col items-center">
        <motion.div
          className="relative"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-20 h-20 bg-main rounded-base border-4 border-black flex items-center justify-center shadow-brutal">
            <span className="text-black font-black text-4xl">R</span>
          </div>
        </motion.div>
        
        <div className="flex gap-3 mt-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-main rounded-full border border-black"
              animate={{ y: [0, -12, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
        
        <motion.p 
          className="text-main font-black mt-6 text-sm tracking-widest uppercase"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading
        </motion.p>
      </div>
    </div>
  )
}
