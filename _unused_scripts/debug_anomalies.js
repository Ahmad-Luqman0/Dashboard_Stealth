import { query } from './api/db.js';

async function debugAnomalies() {
  try {
    console.log("Checking for sessions with huge total_time (> 10 hours)...");
    const hugeSessions = await query(`
        SELECT id, user_id, created_at, total_time, idle_time, date 
        FROM stealth_sessions 
        WHERE total_time > 36000 
        ORDER BY total_time DESC 
        LIMIT 10
    `);
    console.log("Huge Sessions:", hugeSessions.rows);

    console.log("Checking Aggregates for Yesterday...");
    const agg = await query(`
        SELECT u.name, COUNT(ss.id) as session_count, SUM(ss.idle_time) as total_idle
        FROM stealth_sessions ss
        JOIN users u ON ss.user_id = u.id
        WHERE ss.created_at::date = CURRENT_DATE - INTERVAL '1 day'
        GROUP BY u.name
    `);
    console.log("Aggregates:", agg.rows);

  } catch (e) {
    console.error(e);
  }
}

debugAnomalies();
