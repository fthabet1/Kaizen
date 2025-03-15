/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContexts'; 

// PrimeReact imports
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';

export default function TimerDiagnostics() {
  const { user, token } = useAuth();
  const toast = useRef<Toast>(null);
  
  const [taskId, setTaskId] = useState<string>('');
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Function to run diagnostic test
  const runDiagnostic = async () => {
    if (!taskId) {
      toast.current?.show({
        severity: 'error',
        summary: 'Input Required',
        detail: 'Please enter a task ID',
        life: 3000
      });
      return;
    }

    setLoading(true);
    setError(null);
    setTestResult('');

    try {
      // Step 1: Verify the task exists
      let output = '';
      
      output += "TEST 1: Fetching task\n";
      let taskResponse;
      try {
        taskResponse = await axios.get(`/api/tasks/${taskId}`);
        output += `✅ Task found: ${JSON.stringify(taskResponse.data, null, 2)}\n\n`;
      } catch (err) {
        output += `❌ Failed to find task. Error: ${JSON.stringify(err, null, 2)}\n\n`;
        setTestResult(output);
        setLoading(false);
        return;
      }

      // Step 2: Verify the project exists
      output += `TEST 2: Fetching project (ID: ${taskResponse.data.project_id})\n`;
      let projectResponse;
      try {
        projectResponse = await axios.get(`/api/projects/${taskResponse.data.project_id}`);
        output += `✅ Project found: ${JSON.stringify(projectResponse.data, null, 2)}\n\n`;
      } catch (err) {
        output += `❌ Failed to find project. Error: ${JSON.stringify(err, null, 2)}\n\n`;
        setTestResult(output);
        setLoading(false);
        return;
      }

      // Step 3: Try to create a time entry directly
      output += "TEST 3: Creating a test time entry\n";
      try {
        const now = new Date();
        const timeEntryPayload = {
          task_id: parseInt(taskId),
          start_time: now.toISOString(),
          description: "API Diagnostic Test Entry"
        };
        
        output += `Payload: ${JSON.stringify(timeEntryPayload, null, 2)}\n`;
        
        const createResponse = await axios.post('/api/time-entries', timeEntryPayload);
        output += `✅ Time entry created: ${JSON.stringify(createResponse.data, null, 2)}\n\n`;
        
        // Step 4: Try to stop the time entry
        output += "TEST 4: Stopping the test time entry\n";
        try {
          const entryId = createResponse.data.id;
          const endTime = new Date();
          const duration = Math.floor((endTime.getTime() - now.getTime()) / 1000);
          
          const updatePayload = {
            end_time: endTime.toISOString(),
            duration: duration,
            description: "API Diagnostic Test Entry (Stopped)"
          };
          
          output += `Update payload: ${JSON.stringify(updatePayload, null, 2)}\n`;
          
          const updateResponse = await axios.put(`/api/time-entries/${entryId}`, updatePayload);
          output += `✅ Time entry stopped: ${JSON.stringify(updateResponse.data, null, 2)}\n\n`;
        } catch (err) {
          output += `❌ Failed to stop time entry. Error: ${JSON.stringify(err, null, 2)}\n\n`;
        }
      } catch (err) {
        output += `❌ Failed to create time entry. Error: ${JSON.stringify(err, null, 2)}\n\n`;
      }

      output += "Diagnostics complete.";
      setTestResult(output);
    } catch (err) {
      setError('An unexpected error occurred during diagnostics');
      console.error('Diagnostic error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <Card title="Timer API Diagnostics">
        <div className="p-fluid">
          <div className="mb-4">
            <p>This tool helps diagnose issues with the timer API. Enter a task ID to test the time entry creation process.</p>
          </div>
          
          <div className="field mb-4">
            <label htmlFor="taskId" className="block font-medium mb-2">Task ID</label>
            <InputText
              id="taskId"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="Enter task ID"
            />
            <small className="text-color-secondary block mt-1">
              You can find the task ID in the URL when viewing a task&apos;s details
            </small>
          </div>
          
          <div className="mb-4">
            <Button
              label="Run Diagnostic Test"
              icon="pi pi-cog"
              className="p-button-primary"
              onClick={runDiagnostic}
              loading={loading}
            />
          </div>
          
          {loading && (
            <div className="mb-4 flex align-items-center justify-content-center">
              <ProgressSpinner style={{ width: '50px', height: '50px' }} />
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 border-round">
              {error}
            </div>
          )}
          
          {testResult && (
            <div className="mb-4">
              <label className="block font-medium mb-2">Diagnostic Results</label>
              <InputTextarea
                value={testResult}
                rows={15}
                className="w-full font-mono"
                readOnly
              />
            </div>
          )}
          
          <div className="mt-4">
            <p className="text-sm text-color-secondary">
              Note: This tool is for debugging purposes only. Test time entries will be created and stopped during this process.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}