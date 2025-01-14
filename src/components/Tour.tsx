import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TourStep {
  element: string
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

interface TourProps {
  steps: TourStep[]
  currentStep: number
  onNext: () => void
  onPrev: () => void
  onComplete: () => void
  theme: string
}

export const Tour = ({ 
  steps, 
  currentStep, 
  onNext, 
  onPrev, 
  onComplete, 
  theme 
}: TourProps) => {
  const [elementPosition, setElementPosition] = useState({ top: 0, left: 0, width: 0, height: 0 })

  useEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(steps[currentStep].element)
      if (element) {
        setTimeout(() => {
          const rect = element.getBoundingClientRect()
          setElementPosition({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height
          })

          const offset = window.innerHeight / 3
          const elementTop = rect.top + window.scrollY
          window.scrollTo({
            top: elementTop - offset,
            behavior: 'smooth'
          })
        }, 100)
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [currentStep, steps])

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Spotlight effect */}
        <div 
          className="absolute inset-0 bg-black/50 pointer-events-auto"
          style={{
            clipPath: `path('M 0 0 v ${window.innerHeight} h ${window.innerWidth} v -${window.innerHeight} H 0 Z M ${elementPosition.left} ${elementPosition.top} h ${elementPosition.width} v ${elementPosition.height} h -${elementPosition.width} v -${elementPosition.height}')`
          }}
        />

        {/* Tour popup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`
            absolute pointer-events-auto p-6 rounded-xl shadow-lg w-80
            ${theme === 'dark' 
              ? 'bg-slate-800 border border-slate-700' 
              : 'bg-white border border-slate-200'
            }
          `}
          style={{
            top: elementPosition.top + elementPosition.height + 20,
            left: elementPosition.left
          }}
        >
          <h3 className={`text-lg font-semibold mb-2
            ${theme === 'dark' ? 'text-white' : 'text-slate-900'}
          `}>
            {steps[currentStep].title}
          </h3>
          <p className={`text-sm mb-4
            ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}
          `}>
            {steps[currentStep].description}
          </p>
          <div className="flex justify-between items-center">
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full
                    ${index === currentStep
                      ? theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600'
                      : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
                    }
                  `}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={onPrev}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium
                    ${theme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }
                  `}
                >
                  Back
                </button>
              )}
              <button
                onClick={currentStep === steps.length - 1 ? onComplete : onNext}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium
                  ${theme === 'dark'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                `}
              >
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
} 