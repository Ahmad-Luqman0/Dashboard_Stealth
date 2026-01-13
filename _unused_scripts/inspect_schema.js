import { query } from './api/db.js';

async function inspectSchema() {
  try {
    // Check stealth_sessions columns
    const columns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stealth_sessions'
    `);
    console.log('--- stealth_sessions Columns ---');
    console.table(columns.rows);

    // List all tables to find the breakdown table
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('--- All Tables ---');
    console.log(tables.rows.map(r => r.table_name).join(', '));

  } catch (err) {
    console.error('Error insepcting schema:', err);
  } finally {
    process.exit();
  }
}

inspectSchema();
