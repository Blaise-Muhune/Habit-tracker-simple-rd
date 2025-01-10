import { useTheme } from 'next-themes'

export default function Loading() {
  const { theme } = useTheme()
  
  return (
    <div className={`min-h-screen flex items-center justify-center ${
      theme === 'dark' ? 'bg-[#0B1120]' : 'bg-[#F0F4FF]'
    }`}>
      <div className="w-16 h-16 border-4 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
} 