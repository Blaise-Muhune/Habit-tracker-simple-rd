'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const { theme } = useTheme()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      theme === 'dark' ? 'bg-[#0B1120]' : 'bg-[#F0F4FF]'
    }`}>
      <div className={`max-w-md w-full p-8 rounded-2xl text-center ${
        theme === 'dark' 
          ? 'bg-slate-800/90 border-2 border-red-500/20' 
          : 'bg-white/90 border-2 border-red-100'
      }`}>
        <h2 className={`text-2xl font-bold mb-4 ${
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        }`}>
          Something went wrong!
        </h2>
        <p className={`mb-8 ${
          theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
        }`}>
          There was an error processing your subscription.
        </p>
        <div className="space-y-4">
          <button
            onClick={() => router.push('/premium')}
            className="w-full py-4 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600"
          >
            Return to Premium Page
          </button>
          <button
            onClick={() => reset()}
            className={`
              w-full py-4 rounded-xl font-semibold
              ${theme === 'dark' 
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }
            `}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  )
} 