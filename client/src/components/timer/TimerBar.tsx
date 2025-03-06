'use client';

import React, { useState } from 'react';
import { useTimer } from '../../contexts/TimerContext';

const TimerBar = () => {
  const { 
    isRunning, 
    currentTask, 
    currentProject, 
    elapsedTime, 
    description, 
    stopTimer, 
    discardTimer, 
    setDescription 
  } = useTimer();

  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
  const [tempDescription, setTempDescription] = useState(description);

  if (!isRunning) {
    return null;
  }

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStopTimer = () => {
    stopTimer().catch((error) => {
      console.error('Error stopping timer', error);
    });
  };

  const handleDiscardTimer = () => {
    if (confirm('Are you sure you want to discard this time entry?')) {
      discardTimer();
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempDescription(e.target.value);
  };

  const handleDescriptionSave = () => {
    setDescription(tempDescription);
    setIsDescriptionEditing(false);
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleDescriptionSave();
    } else if (e.key === 'Escape') {
      setTempDescription(description);
      setIsDescriptionEditing(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 p-4 z-10">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div
            className="w-3 h-3 rounded-full bg-red-500 animate-pulse"
            aria-label="Recording indicator"
          />
          
          <div className="flex flex-col">
            <div className="flex items-center">
              <span className="font-semibold text-lg">{currentTask?.name}</span>
              <span className="mx-2 text-gray-400">in</span>
              <div 
                className="flex items-center px-2 py-1 rounded-md" 
                style={{ backgroundColor: currentProject?.color + '20' }} // Adding opacity to the color
              >
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: currentProject?.color }}
                />
                <span className="text-sm font-medium">{currentProject?.name}</span>
              </div>
            </div>
            
            {isDescriptionEditing ? (
              <div className="flex items-center mt-1">
                <input
                  type="text"
                  value={tempDescription}
                  onChange={handleDescriptionChange}
                  onBlur={handleDescriptionSave}
                  onKeyDown={handleDescriptionKeyDown}
                  className="border border-gray-300 rounded-md py-1 px-2 text-sm w-80"
                  placeholder="Add a description..."
                  autoFocus
                />
              </div>
            ) : (
              <div 
                className="text-sm text-gray-500 mt-1 cursor-pointer hover:text-gray-700"
                onClick={() => {
                  setTempDescription(description);
                  setIsDescriptionEditing(true);
                }}
              >
                {description || 'Add a description...'}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-2xl font-mono font-bold">
            {formatTime(elapsedTime)}
          </div>
          
          <button
            onClick={handleStopTimer}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Stop
          </button>
          
          <button
            onClick={handleDiscardTimer}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimerBar;
