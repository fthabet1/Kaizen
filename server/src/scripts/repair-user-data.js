// server/src/scripts/repair-user-data.js

/**
 * This script helps repair user data issues by:
 * 1. Finding all Firebase auth users
 * 2. Ensuring they have corresponding entries in the database
 * 3. Assigning ownership of orphaned projects/tasks to the correct users
 * 
 * Run with: node -r ts-node/register repair-user-data.js
 */

const admin = require('firebase-admin');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  console.log('Firebase Admin initialized successfully');
}

// Initialize the database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'Kaizen',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Query function
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

/**
 * List all Firebase users
 */
async function listFirebaseUsers() {
  try {
    const listUsersResult = await admin.auth().listUsers();
    return listUsersResult.users;
  } catch (error) {
    console.error('Error listing users:', error);
    return [];
  }
}

/**
 * Ensure each Firebase user has a corresponding user in the database
 */
async function ensureDatabaseUsers(firebaseUsers) {
  for (const user of firebaseUsers) {
    try {
      // Check if user exists in the database
      const result = await query('SELECT * FROM users WHERE auth_id = $1', [user.uid]);
      
      if (result.rows.length === 0) {
        // User doesn't exist in the database, create them
        console.log(`Creating database user for Firebase user: ${user.uid}, email: ${user.email}`);
        
        await query(
          'INSERT INTO users (auth_id, email, name) VALUES ($1, $2, $3) RETURNING *',
          [user.uid, user.email, user.displayName || user.email]
        );
        
        console.log(`User created successfully`);
      } else {
        console.log(`User already exists in database: ${user.uid}, database ID: ${result.rows[0].id}`);
      }
    } catch (error) {
      console.error(`Error processing user ${user.uid}:`, error);
    }
  }
}

/**
 * List orphaned projects (projects without a valid owner)
 */
async function findOrphanedProjects() {
  const result = await query(`
    SELECT p.* 
    FROM projects p 
    LEFT JOIN users u ON p.user_id = u.id 
    WHERE u.id IS NULL
  `);
  
  return result.rows;
}

/**
 * Assign orphaned projects to the first user
 */
async function repairOrphanedProjects(projects) {
  if (projects.length === 0) {
    console.log('No orphaned projects found');
    return;
  }
  
  // Get the first user to assign projects to
  const userResult = await query('SELECT id FROM users LIMIT 1');
  if (userResult.rows.length === 0) {
    console.error('No users found to assign projects to');
    return;
  }
  
  const userId = userResult.rows[0].id;
  console.log(`Assigning orphaned projects to user ID: ${userId}`);
  
  for (const project of projects) {
    try {
      await query('UPDATE projects SET user_id = $1 WHERE id = $2', [userId, project.id]);
      console.log(`Updated project ${project.id} ownership to user ${userId}`);
    } catch (error) {
      console.error(`Error updating project ${project.id}:`, error);
    }
  }
}

/**
 * Fix orphaned tasks (tasks without a valid owner)
 */
async function repairOrphanedTasks() {
  // Update tasks to have the same user_id as their project's user_id
  const result = await query(`
    UPDATE tasks t
    SET user_id = p.user_id
    FROM projects p
    WHERE t.project_id = p.id AND t.user_id != p.user_id
    RETURNING t.id, t.user_id
  `);
  
  if (result.rowCount > 0) {
    console.log(`Updated ${result.rowCount} tasks to match their project owners`);
    console.log(result.rows);
  } else {
    console.log('No tasks needed updating');
  }
}

/**
 * List tasks and their owners for debugging
 */
async function listTaskOwnership() {
  const result = await query(`
    SELECT 
      t.id as task_id, 
      t.name as task_name, 
      t.user_id as task_user_id,
      p.id as project_id,
      p.name as project_name,
      p.user_id as project_user_id,
      u1.email as task_user_email,
      u2.email as project_user_email
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u1 ON t.user_id = u1.id
    LEFT JOIN users u2 ON p.user_id = u2.id
  `);
  
  console.log('Task ownership status:');
  console.table(result.rows);
}

/**
 * Main function that runs all repair tasks
 */
async function main() {
  try {
    console.log('Starting user data repair process...');
    
    // Get all Firebase users
    const firebaseUsers = await listFirebaseUsers();
    console.log(`Found ${firebaseUsers.length} Firebase users`);
    
    // Ensure database users exist
    await ensureDatabaseUsers(firebaseUsers);
    
    // Find and repair orphaned projects
    const orphanedProjects = await findOrphanedProjects();
    console.log(`Found ${orphanedProjects.length} orphaned projects`);
    await repairOrphanedProjects(orphanedProjects);
    
    // Repair task ownership
    await repairOrphanedTasks();
    
    // List task ownership for debugging
    await listTaskOwnership();
    
    console.log('User data repair process completed');
  } catch (error) {
    console.error('Error during repair process:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

main();