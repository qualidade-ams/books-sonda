import React from 'react';

interface QuoteDividerProps {
  position: 'left' | 'right';
  color: 'blue' | 'pink';
}

const QuoteDivider: React.FC<QuoteDividerProps> = ({ position, color }) => {
  const isRight = position === 'right';
  const colorClass = color === 'blue' ? 'text-[#0066FF]' : 'text-[#FF0066]';
  
  // Simple SVG for a quote mark
  const QuoteIcon = () => (
    <svg 
      width="32" 
      height="32" 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={`${colorClass} w-8 h-8 md:w-10 md:h-10`}
    >
      <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9H17.017C16.4647 9 16.017 8.55228 16.017 8V3H21.017V15C21.017 18.3137 18.3307 21 15.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9H8.0166C7.46432 9 7.0166 8.55228 7.0166 8V3H12.0166V15C12.0166 18.3137 9.33031 21 6.0166 21H5.0166Z" />
    </svg>
  );

  return (
    <div className="w-full flex items-center my-8 md:my-12 relative">
      <div className={`w-full border-t border-black`}></div>
      <div className={`absolute ${isRight ? 'right-0' : 'left-0'} -top-4 md:-top-5 bg-white px-2`}>
        <QuoteIcon />
      </div>
    </div>
  );
};

export default QuoteDivider;