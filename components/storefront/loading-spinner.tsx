"use client"

interface LoadingSpinnerProps {
  themeColor?: string
}

export function LoadingSpinner({ themeColor = "#000000" }: LoadingSpinnerProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-[250px] px-4">
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden relative">
            <div
              className="h-full rounded-full absolute left-0 top-0 w-full animate-loading-progress"
              style={{
                backgroundColor: themeColor,
              }}
            />
          </div>
          
          {/* Text */}
          <p className="text-sm text-gray-500 text-center">
            It won&apos;t take too long
          </p>
        </div>
      </div>
    </div>
  )
}

