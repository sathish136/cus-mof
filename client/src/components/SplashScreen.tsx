import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export default function SplashScreen({ onComplete, duration = 3000 }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');

  useEffect(() => {
    const loadingSteps = [
      { progress: 20, text: 'Connecting to database...' },
      { progress: 40, text: 'Loading employee data...' },
      { progress: 60, text: 'Initializing attendance system...' },
      { progress: 80, text: 'Setting up dashboard...' },
      { progress: 100, text: 'Ready!' }
    ];

    const stepDuration = duration / loadingSteps.length;
    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        setProgress(loadingSteps[currentStep].progress);
        setLoadingText(loadingSteps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onComplete?.();
        }, 500);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Sri Lanka Emblem */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-2xl animate-float">
            <svg viewBox="0 0 100 100" className="w-16 h-16 text-blue-800 animate-pulse-slow">
              <circle cx="50" cy="50" r="45" fill="currentColor" />
              <circle cx="50" cy="50" r="35" fill="white" />
              <circle cx="50" cy="50" r="25" fill="currentColor" />
              <circle cx="50" cy="50" r="15" fill="white" />
              <circle cx="50" cy="50" r="5" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Ministry Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Ministry of Finance
          </h1>
          <h2 className="text-2xl font-semibold text-blue-200 mb-1">
            Sri Lanka
          </h2>
          <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 to-orange-400 mx-auto mb-4"></div>
          <p className="text-xl text-blue-100 font-medium">
            HR Attendance Management System
          </p>
          <p className="text-sm text-blue-300 mt-2">
            Digital Government Initiative
          </p>
        </div>

        {/* Loading Animation */}
        <div className="mb-8">
          <div className="relative w-64 h-2 bg-blue-700 rounded-full mx-auto overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-300 ease-out loading-shimmer"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="mt-4 text-blue-200 text-sm font-medium">
            {loadingText}
          </div>
          <div className="mt-2 text-blue-300 text-xs">
            {progress}% Complete
          </div>
        </div>

        {/* Animated Dots */}
        <div className="flex justify-center space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            ></div>
          ))}
        </div>

        {/* Version Info */}
        <div className="mt-8 text-blue-400 text-xs">
          <p>Version 2.0.1 | Secure Government Platform</p>
          <p className="mt-1">© 2025 Ministry of Finance, Sri Lanka</p>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-20 h-20 border-2 border-white rounded-full animate-ping"></div>
        <div className="absolute top-20 right-20 w-16 h-16 border-2 border-blue-300 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-20 w-12 h-12 border-2 border-blue-200 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 border-2 border-white rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
      </div>
    </div>
  );
}