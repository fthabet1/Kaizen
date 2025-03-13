/**
 * Kaizen Database Test Script
 * 
 * This script tests the core database functionality by directly accessing the models.
 * Run this script with: node -r ts-node/register test-db.js
 */

const UserModel = require('./models/userModel').default;
const ProjectModel = require('./models/projectModel').default;
const TaskModel = require('./models/taskModel').default;
const TimeEntryModel = require('./models/timeEntryModel').default;

// Test user ID (this would normally come from Firebase auth)
const TEST_AUTH_ID = 'test-user-' + Date.now();
const TEST_EMAIL = 'test@example.com';

async function runTests() {
  console.log('Starting Kaizen database tests...');
  console.log('=================================');
  
  try {
    // ===== Test User Creation =====
    console.log('\nTesting user creation...');
    const user = await UserModel.create({
      auth_id: TEST_AUTH_ID,
      email: TEST_EMAIL,
      name: 'Test User'
    });
    
    console.log('✅ User created:', user);
    
    // ===== Test Project CRUD =====
    console.log('\nTesting project creation...');
    const project = await ProjectModel.create(TEST_AUTH_ID, {
      name: 'Test Project',
      description: 'This is a test project',
      color: '#0EA5E9'
    });
    
    console.log('✅ Project created:', project);
    
    console.log('\nTesting project retrieval...');
    const projects = await ProjectModel.findByUserId(TEST_AUTH_ID);
    console.log('✅ Projects retrieved:', projects.length);
    
    console.log('\nTesting project update...');
    const updatedProject = await ProjectModel.update(project.id, {
      name: 'Updated Test Project',
      description: 'This project has been updated'
    });
    
    console.log('✅ Project updated:', updatedProject);
    
    // ===== Test Task CRUD =====
    console.log('\nTesting task creation...');
    // Get internal user ID
    const internalUserId = await TaskModel.getUserIdByAuthId(TEST_AUTH_ID);
    
    const task = await TaskModel.create(internalUserId, {
      project_id: project.id,
      name: 'Test Task',
      description: 'This is a test task'
    });
    
    console.log('✅ Task created:', task);
    
    console.log('\nTesting task retrieval...');
    const tasks = await TaskModel.findByUserId(internalUserId);
    console.log('✅ Tasks retrieved:', tasks.length);
    
    console.log('\nTesting task update...');
    const updatedTask = await TaskModel.update(task.id, {
      name: 'Updated Test Task',
      is_completed: true
    });
    
    console.log('✅ Task updated:', updatedTask);
    
    // ===== Test Time Entry CRUD =====
    console.log('\nTesting time entry creation...');
    const startTime = new Date();
    // Simulate a 5-second time entry
    const endTime = new Date(startTime.getTime() + 5000);
    
    const timeEntry = await TimeEntryModel.create(internalUserId, {
      task_id: task.id,
      start_time: startTime,
      end_time: endTime,
      duration: 5, // 5 seconds
      description: 'Test time entry'
    });
    
    console.log('✅ Time entry created:', timeEntry);
    
    console.log('\nTesting time entry retrieval...');
    const timeEntries = await TimeEntryModel.findByUserId(internalUserId);
    console.log('✅ Time entries retrieved:', timeEntries.length);
    
    // ===== Test Statistics =====
    console.log('\nTesting time statistics...');
    const totalTime = await TimeEntryModel.getTotalTrackedTime(internalUserId);
    console.log('✅ Total tracked time:', totalTime, 'seconds');
    
    const projectStats = await TimeEntryModel.getTimeByProject(internalUserId);
    console.log('✅ Project time stats retrieved:', projectStats);
    
    const dailyStats = await TimeEntryModel.getTimeEntriesByDay(internalUserId);
    console.log('✅ Daily time stats retrieved:', dailyStats);
    
        
    console.log('\nCleaning up test data...');
    await TimeEntryModel.delete(timeEntry.id);
    await TaskModel.delete(task.id);
    await ProjectModel.delete(project.id);
    console.log('✅ Test data cleaned up');

    
    console.log('\n=================================');
    console.log('All database tests completed successfully! 🎉');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    // Close the pool connection
    process.exit(0);
  }
}

// Run the tests
runTests();