import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

type ToastProps = {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
  duration?: number
}

export const Toast = ({ message, type = 'info', onClose, duration = 3000 }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 200) // Allow exit animation to complete
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getColors = (theme: 'dark' | 'light') => {
    const colors = {
      success: {
        dark: 'bg-green-500/20 border-green-500/20 text-green-400',
        light: 'bg-green-50 border-green-100 text-green-600'
      },
      error: {
        dark: 'bg-red-500/20 border-red-500/20 text-red-400',
        light: 'bg-red-50 border-red-100 text-red-600'
      },
      info: {
        dark: 'bg-blue-500/20 border-blue-500/20 text-blue-400',
        light: 'bg-blue-50 border-blue-100 text-blue-600'
      }
    }
    return colors[type][theme]
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className={`
            px-6 py-3 rounded-xl border shadow-lg
            flex items-center gap-3
            ${getColors('dark')} dark:${getColors('light')}
          `}>
            {type === 'success' && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {type === 'error' && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {type === 'info' && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <p className="text-sm font-medium">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 