import { query } from './api/db.js';

async function debugQuery() {
  try {
    const res = await query('SELECT DISTINCT category FROM session_usage_breakdown');
    console.log('Categories:', res.rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

debugQuery();
