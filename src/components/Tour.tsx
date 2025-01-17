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
  onSkip: () => void
  theme: string
}

export const Tour = ({ 
  steps, 
  currentStep, 
  onNext, 
  onPrev, 
  onComplete,
  onSkip,
  theme 
}: TourProps) => {
  const [elementPosition, setElementPosition] = useState({ top: 0, left: 0, width: 0, height: 0 })
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })

  const calculatePopupPosition = (elementRect: DOMRect) => {
    const popupWidth = 320 // w-80 = 320px
    const popupHeight = 200 // Approximate height of popup
    const margin = 20 // Margin from element
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    let top = elementRect.bottom + margin + window.scrollY
    let left = elementRect.left + window.scrollX

    // Check if popup would overflow right side
    if (left + popupWidth > windowWidth) {
      left = windowWidth - popupWidth - margin
    }

    // Check if popup would overflow left side
    if (left < margin) {
      left = margin
    }

    // Check if popup would overflow bottom
    if (top + popupHeight > window.scrollY + windowHeight) {
      // Place popup above the element
      top = elementRect.top + window.scrollY - popupHeight - margin
    }

    return { top, left }
  }

  useEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(steps[currentStep].element)
      if (element) {
        const rect = element.getBoundingClientRect()
        setElementPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        })

        // Calculate popup position
        const newPopupPosition = calculatePopupPosition(rect)
        setPopupPosition(newPopupPosition)

        // Scroll element into view with offset
        const offset = window.innerHeight / 3
        const elementTop = rect.top + window.scrollY
        window.scrollTo({
          top: Math.max(0, elementTop - offset),
          behavior: 'smooth'
        })
      }
    }

    // Initial position update with a slight delay to ensure DOM is ready
    const timeoutId = setTimeout(updatePosition, 100)

    // Add event listeners for responsive updates
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [currentStep, steps])

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Spotlight effect with smoother transition */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 pointer-events-auto transition-all duration-300"
          style={{
            clipPath: `path('M 0 0 v ${window.innerHeight} h ${window.innerWidth} v -${window.innerHeight} H 0 Z M ${elementPosition.left} ${elementPosition.top} h ${elementPosition.width} v ${elementPosition.height} h -${elementPosition.width} v -${elementPosition.height}')`
          }}
        />

        {/* Highlighted element border */}
        <div
          className="absolute pointer-events-none border-2 border-blue-500 rounded transition-all duration-300"
          style={{
            top: elementPosition.top,
            left: elementPosition.left,
            width: elementPosition.width,
            height: elementPosition.height
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
            top: popupPosition.top,
            left: popupPosition.left,
            maxWidth: 'calc(100vw - 40px)' // Ensure popup doesn't overflow horizontally
          }}
        >
          {/* Step counter */}
          <div className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Step {currentStep + 1} of {steps.length}
          </div>

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
                  className={`w-2 h-2 rounded-full transition-colors
                    ${index === currentStep
                      ? theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600'
                      : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
                    }
                  `}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onSkip}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-300'
                    : 'text-slate-600 hover:text-slate-700'
                  }
                `}
              >
                Skip
              </button>
              {currentStep > 0 && (
                <button
                  onClick={onPrev}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
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
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
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