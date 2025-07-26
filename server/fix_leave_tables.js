import { db } from './db.js';
import { sql } from 'drizzle-orm';

async function fixLeaveTables() {
  try {
    console.log('Creating leave_types table...');
    
    // Create leave_types table
    await db.execute(sql`
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
    await db.execute(sql`
      INSERT INTO leave_types (name, description, max_days_per_year, is_active) 
      VALUES 
        ('annual', 'Annual vacation leave', 21, true),
        ('sick', 'Medical leave for illness', 14, true),
        ('casual', 'Short-term personal leave', 7, true),
        ('maternity', 'Maternity leave for female employees', 84, true),
        ('paternity', 'Paternity leave for male employees', 7, true)
      ON CONFLICT (name) DO NOTHING;
    `);
    
    console.log('Inserted default leave types');
    
    // Check if leave_type_id column exists in leave_requests
    const columnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'leave_requests' 
      AND column_name = 'leave_type_id';
    `);
    
    if (columnCheck.length === 0) {
      console.log('Adding leave_type_id column to leave_requests...');
      await db.execute(sql`
        ALTER TABLE leave_requests 
        ADD COLUMN leave_type_id INTEGER REFERENCES leave_types(id);
      `);
      console.log('Added leave_type_id column');
    }
    
    console.log('Leave tables setup completed successfully!');
    
  } catch (error) {
    console.error('Error setting up leave tables:', error);
  }
}

fixLeaveTables();