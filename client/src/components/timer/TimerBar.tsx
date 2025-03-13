'use client';

import React, { useState, useEffect } from 'react';
import { useTimer } from '../../contexts/TimerContext';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';

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
  const [displayedTime, setDisplayedTime] = useState('00:00:00');

  // Update the timer display every second
  useEffect(() => {
    if (isRunning) {
      const timer = setInterval(() => {
        setDisplayedTime(formatTime(elapsedTime));
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isRunning, elapsedTime]);

  if (!isRunning) {
    return null;
  }

  // Format elapsed time
  function formatTime(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

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
    <div className="fixed bottom-0 left-0 right-0 bg-surface-card shadow-8 p-3 z-5">
      <div className="flex flex-column md:flex-row align-items-center justify-content-between gap-2">
        <div className="flex align-items-center gap-2">
          <div className="w-1rem h-1rem border-circle bg-red-500 flex-shrink-0 animate-pulse"></div>
          
          <div className="flex flex-column">
            <div className="font-medium">{currentTask?.name}</div>
            
            <div className="flex align-items-center text-sm text-color-secondary">
              <span>in</span>
              <div 
                className="inline-flex align-items-center mx-2 px-2 py-1 border-round" 
                style={{ backgroundColor: currentProject?.color + '20' }}
              >
                <div
                  className="inline-block border-circle mr-1 flex-shrink-0"
                  style={{ backgroundColor: currentProject?.color, width: '0.5rem', height: '0.5rem' }}
                ></div>
                <span>{currentProject?.name}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-grow-1 md:flex-grow-0">
          {isDescriptionEditing ? (
            <div className="flex align-items-center">
              <InputText
                value={tempDescription}
                onChange={handleDescriptionChange}
                onBlur={handleDescriptionSave}
                onKeyDown={handleDescriptionKeyDown}
                className="w-full"
                placeholder="Add a description..."
                autoFocus
              />
            </div>
          ) : (
            <div 
              className="text-color-secondary cursor-pointer hover:text-color-primary transition-colors transition-duration-200 text-center md:text-left"
              onClick={() => {
                setTempDescription(description);
                setIsDescriptionEditing(true);
              }}
            >
              {description || 'Add a description...'}
            </div>
          )}
        </div>
        
        <div className="flex align-items-center gap-3">
          <div className="font-medium font-mono text-xl">{displayedTime}</div>
          
          <div className="flex gap-2">
            <Button
              icon="pi pi-stop-circle"
              className="p-button-rounded p-button-danger"
              onClick={handleStopTimer}
              tooltip="Stop timer"
            />
            
            <Button
              icon="pi pi-times"
              className="p-button-rounded p-button-text p-button-secondary"
              onClick={handleDiscardTimer}
              tooltip="Discard timer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerBar;