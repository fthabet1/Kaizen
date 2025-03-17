/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTimer } from '../../contexts/TimerContext';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
import { Toast } from 'primereact/toast';
import { format, subHours, subMinutes } from 'date-fns';
import axios from '../../utils/axiosConfig';
import { useRouter } from 'next/navigation';

const TimerBar = () => {
  const { 
    isRunning, 
    currentTask, 
    currentProject, 
    elapsedTime, 
    description, 
    startTime,
    stopTimer, 
    discardTimer, 
    setDescription,
    adjustStartTime
  } = useTimer();

  const router = useRouter();
  const toast = useRef<Toast>(null);
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
  const [tempDescription, setTempDescription] = useState(description);
  const [displayedTime, setDisplayedTime] = useState('00:00:00');

  // Timer adjustment state
  const [showAdjustStartDialog, setShowAdjustStartDialog] = useState(false);
  const [adjustedStartTime, setAdjustedStartTime] = useState<Date | null>(null);
  const [hoursToSubtract, setHoursToSubtract] = useState<number>(0);
  const [minutesToSubtract, setMinutesToSubtract] = useState<number>(0);

  // Update the timer display every second
  useEffect(() => {
    if (isRunning) {
      const timer = setInterval(() => {
        setDisplayedTime(formatTime(elapsedTime));
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isRunning, elapsedTime]);

  // Update temp description when the actual description changes
  useEffect(() => {
    setTempDescription(description);
  }, [description]);

  // Set up timer adjustment when timer is running
  useEffect(() => {
    if (isRunning && startTime) {
      setAdjustedStartTime(new Date(startTime));
    }
  }, [isRunning, startTime]);

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
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to stop the timer. Please try again.',
        life: 3000
      });
    });
  };

  const handleDiscardTimer = () => {
    if (confirm('Are you sure you want to discard this time entry?')) {
      discardTimer();
      toast.current?.show({
        severity: 'info',
        summary: 'Timer Discarded',
        detail: 'Your timer has been discarded',
        life: 3000
      });
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempDescription(e.target.value);
  };

  const handleDescriptionSave = () => {
    setDescription(tempDescription);
    setIsDescriptionEditing(false);
    toast.current?.show({
      severity: 'success',
      summary: 'Description Updated',
      detail: 'Timer description has been updated',
      life: 2000
    });
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleDescriptionSave();
    } else if (e.key === 'Escape') {
      setTempDescription(description);
      setIsDescriptionEditing(false);
    }
  };

  const navigateToTimerPage = () => {
    router.push('/timer');
  };

  const openAdjustStartTimeDialog = () => {
    if (startTime) {
      setAdjustedStartTime(new Date(startTime));
      setHoursToSubtract(0);
      setMinutesToSubtract(0);
      setShowAdjustStartDialog(true);
    }
  };

  const handleAdjustByAmount = () => {
    if (!adjustedStartTime) return;
    
    let newTime = new Date(adjustedStartTime);
    if (hoursToSubtract > 0) {
      newTime = subHours(newTime, hoursToSubtract);
    }
    if (minutesToSubtract > 0) {
      newTime = subMinutes(newTime, minutesToSubtract);
    }
    
    // Ensure the adjusted time is not in the future
    const now = new Date();
    if (newTime > now) {
      toast.current?.show({
        severity: 'error',
        summary: 'Invalid Time',
        detail: 'Start time cannot be in the future',
        life: 3000
      });
      return;
    }
    
    setAdjustedStartTime(newTime);
  };

  const handleSaveAdjustedStartTime = async () => {
    if (!adjustedStartTime || !currentTask) return;
    
    // Ensure the adjusted time is not in the future
    const now = new Date();
    if (adjustedStartTime > now) {
      toast.current?.show({
        severity: 'error',
        summary: 'Invalid Time',
        detail: 'Start time cannot be in the future',
        life: 3000
      });
      return;
    }
    
    try {
      await adjustStartTime(adjustedStartTime);
      
      toast.current?.show({
        severity: 'success',
        summary: 'Start Time Adjusted',
        detail: 'Timer start time has been updated',
        life: 3000
      });
      
      setShowAdjustStartDialog(false);
    } catch (error) {
      console.error('Error adjusting start time', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to adjust the start time. Please try again.',
        life: 3000
      });
    }
  };

  const adjustTimeDialogFooter = (
    <>
      <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setShowAdjustStartDialog(false)} />
      <Button label="Save" icon="pi pi-check" onClick={handleSaveAdjustedStartTime} />
    </>
  );

  return (
    <>
      <Toast ref={toast} position="bottom-right" />
      <div className="fixed bottom-0 left-0 right-0 bg-surface-card shadow-8 p-3 z-5">
        <div className="flex flex-column md:flex-row align-items-center justify-content-between gap-2">
          <div className="flex align-items-center gap-2 cursor-pointer" onClick={navigateToTimerPage}>
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
                icon="pi pi-clock"
                className="p-button-rounded p-button-text"
                onClick={openAdjustStartTimeDialog}
                tooltip="Adjust start time"
              />
              
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

      <Dialog
        visible={showAdjustStartDialog}
        header="Adjust Start Time"
        modal
        className="p-fluid"
        footer={adjustTimeDialogFooter}
        onHide={() => setShowAdjustStartDialog(false)}
        style={{ width: '450px' }}
      >
        <div className="mb-4">
          <p className="text-color-secondary mb-3">
            Adjust when this timer was started. This will change the total duration.
          </p>
          
          <div className="field mb-4">
            <label htmlFor="currentStartTime" className="font-medium mb-2 block">Current Start Time</label>
            <div className="p-inputtext p-disabled" id="currentStartTime">
              {startTime ? format(new Date(startTime), 'h:mm a, MMMM d, yyyy') : ''}
            </div>
          </div>
          
          <div className="field mb-4">
            <label htmlFor="adjustedDateTime" className="font-medium mb-2 block">Exact Start Time</label>
            <Calendar
              id="adjustedDateTime"
              value={adjustedStartTime}
              onChange={(e) => {
                if (e.value && Array.isArray(e.value)) {
                  setAdjustedStartTime(e.value[0]);
                } else {
                  setAdjustedStartTime(e.value as Date);
                }
              }}
              showTime
              showSeconds
              maxDate={new Date()}
              hideOnDateTimeSelect
              className="w-full"
            />
            <small className="text-color-secondary">Cannot be in the future</small>
          </div>
          
          <div className="field">
            <label className="font-medium mb-2 block">Or subtract time</label>
            <div className="grid">
              <div className="col-5">
                <span className="p-float-label">
                  <InputNumber
                    id="hoursToSubtract"
                    value={hoursToSubtract}
                    onValueChange={(e) => setHoursToSubtract(e.value ?? 0)}
                    min={0}
                    max={23}
                  />
                  <label htmlFor="hoursToSubtract">Hours</label>
                </span>
              </div>
              <div className="col-5">
                <span className="p-float-label">
                  <InputNumber
                    id="minutesToSubtract"
                    value={minutesToSubtract}
                    onValueChange={(e) => setMinutesToSubtract(e.value ?? 0)}
                    min={0}
                    max={59}
                  />
                  <label htmlFor="minutesToSubtract">Minutes</label>
                </span>
              </div>
              <div className="col-2">
                <Button
                  icon="pi pi-check"
                  className="p-button-text h-full w-full"
                  onClick={handleAdjustByAmount}
                  disabled={hoursToSubtract === 0 && minutesToSubtract === 0}
                />
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default TimerBar;