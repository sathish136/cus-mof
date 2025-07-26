import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function createLeaveTypesTable() {
  const client = await pool.connect();
  
  try {
    console.log('Creating leave_types table...');
    
    // Create leave_types table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        max_days_per_year INTEGER,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    
    console.log('Created leave_types table');
    
    // Insert default leave types
    await client.query(`
      INSERT INTO leave_types (name, description, max_days_per_year, is_active) 
      VALUES 
        ('Annual Leave', 'Annual vacation leave', 21, true),
        ('Sick Leave', 'Medical leave for illness', 14, true),
        ('Casual Leave', 'Short-term personal leave', 7, true),
        ('Maternity Leave', 'Maternity leave for female employees', 84, true),
        ('Paternity Leave', 'Paternity leave for male employees', 7, true)
      ON CONFLICT (name) DO NOTHING;
    `);
    
    console.log('Inserted default leave types');
    
    // Check if leave_type_id column exists in leave_requests
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'leave_requests' 
      AND column_name = 'leave_type_id';
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('Adding leave_type_id column to leave_requests...');
      await client.query(`
        ALTER TABLE leave_requests 
        ADD COLUMN leave_type_id INTEGER REFERENCES leave_types(id);
      `);
      console.log('Added leave_type_id column');
    }
    
    console.log('Leave types setup completed successfully!');
    
  } catch (error) {
    console.error('Error setting up leave types:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createLeaveTypesTable();