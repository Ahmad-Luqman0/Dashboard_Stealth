import { query } from './api/db.js';

async function checkData() {
  try {
    const users = await query('SELECT COUNT(*) FROM users');
    console.log('Users count:', users.rows[0].count);

    const sessions = await query('SELECT COUNT(*) FROM user_sessions');
    console.log('User Sessions count:', sessions.rows[0].count);

    const breakdown = await query('SELECT COUNT(*) FROM session_usage_breakdown');
    console.log('Session Usage Breakdown count:', breakdown.rows[0].count);

    const kpi = await query(`
      SELECT 
        COALESCE(SUM(total_time), 0) as total_time
      FROM user_sessions
    `);
    console.log('Total Time Sum:', kpi.rows[0].total_time);

  } catch (err) {
    console.error('Error checking data:', err);
  } finally {
    process.exit();
  }
}

checkData();
