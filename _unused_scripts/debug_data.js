import { query } from './api/db.js';

async function debug() {
  try {
    const res = await query('SELECT count(*) FROM stealth_sessions');
    console.log('Total sessions:', res.rows[0].count);

    const res2 = await query('SELECT id, user_id, date, created_at, wasted_time FROM stealth_sessions ORDER BY created_at DESC LIMIT 5');
    console.log('Recent sessions:', res2.rows);

    const resToday = await query("SELECT COUNT(*) FROM stealth_sessions WHERE created_at::date = CURRENT_DATE");
    console.log('Sessions Today (DB CURRENT_DATE):', resToday.rows[0].count);

    const resYest = await query("SELECT COUNT(*) FROM stealth_sessions WHERE created_at::date = CURRENT_DATE - INTERVAL '1 day'");
    console.log('Sessions Yesterday:', resYest.rows[0].count);

    const timeCheck = await query("SELECT NOW() as db_now, CURRENT_DATE as db_date");
    console.log('DB Time:', timeCheck.rows[0]);
    
    // Check Data Types
    const typeCheck = await query("SELECT data_type FROM information_schema.columns WHERE table_name = 'stealth_sessions' AND column_name = 'wasted_time'");
    console.log('wasted_time type:', typeCheck.rows[0]);
    const user7 = await query("SELECT * FROM users WHERE id = 7");
    console.log('User 7 exists:', user7.rows.length > 0 ? 'Yes' : 'No');
  } catch (e) {
    console.error(e);
  }
}

debug();
