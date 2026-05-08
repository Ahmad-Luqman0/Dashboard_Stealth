import { query } from './api/db.js';

async function inspectBreakdown() {
  try {
    const columns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'session_usage_breakdown'
    `);
    console.log('--- session_usage_breakdown Columns ---');
    console.table(columns.rows);
  } catch (err) {
    console.error('Error insepcting schema:', err);
  } finally {
    process.exit();
  }
}

inspectBreakdown();
