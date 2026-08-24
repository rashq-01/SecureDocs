import React from 'react';

const LoadingSpinner = ({ size = 'md', fullScreen = false }) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const spinner = (
    <div className={`${sizes[size]} border-4 border-accent-subtle border-t-accent rounded-full animate-spin`} />
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;