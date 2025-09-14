'use client';

import React, { useState } from 'react';

interface HelpTooltipProps {
  content: string;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  children?: React.ReactNode;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ 
  content, 
  title, 
  position = 'top', 
  className = '',
  children 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-800 border-t-[6px] border-x-transparent border-x-[6px] border-b-0',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-800 border-b-[6px] border-x-transparent border-x-[6px] border-t-0',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-800 border-l-[6px] border-y-transparent border-y-[6px] border-r-0',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-800 border-r-[6px] border-y-transparent border-y-[6px] border-l-0'
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {children || (
        <button
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          onFocus={() => setIsVisible(true)}
          onBlur={() => setIsVisible(false)}
          className="inline-flex items-center justify-center w-5 h-5 text-gray-400 hover:text-blue-600 focus:text-blue-600 focus:outline-none"
          aria-label="Help"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </button>
      )}
      
      {isVisible && (
        <div 
          className={`absolute z-50 px-3 py-2 max-w-sm text-sm text-white bg-gray-800 rounded-lg shadow-lg ${positionClasses[position]}`}
          style={{ minWidth: '200px' }}
        >
          {title && (
            <div className="font-semibold mb-1">{title}</div>
          )}
          <div className="text-gray-100">{content}</div>
          
          {/* Arrow */}
          <div className={`absolute w-0 h-0 ${arrowClasses[position]}`}></div>
        </div>
      )}
    </div>
  );
};

export default HelpTooltip;