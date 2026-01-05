import express from 'express';
import cors from 'cors';
import { query } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Immense Code Analytics API');
});

// Get all dashboard users
app.get('/api/dashboard-users', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, 
        name, 
        email, 
        phone, 
        status, 
        type
      FROM dashboard_users
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard users' });
  }
});

// Add new dashboard user
app.post('/api/dashboard-users', async (req, res) => {
  const { name, username, email, password, phone, type, status = 'active' } = req.body;
  try {
    const result = await query(
      `INSERT INTO dashboard_users (name, username, email, password, phone, type, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [name, username, email, password, phone, type, status]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // Unique violation
        res.status(400).json({ error: 'Username or Email already exists' });
    } else {
        res.status(500).json({ error: 'Failed to add user' });
    }
  }
});

// Get all monitored users
app.get('/api/users', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.phone, 
        u.status, 
        ut.name as type
      FROM users u
      LEFT JOIN usertypes ut ON u.usertype_id = ut.id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get Available Shifts
app.get('/api/shifts', async (req, res) => {
    try {
        const result = await query(`
            SELECT DISTINCT shift_start, shift_end 
            FROM user_shifts 
            ORDER BY shift_start ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch shifts' });
    }
});

// Helper for Shift filtering
const getShiftFilter = (shift) => {
    if (!shift || shift === 'All') return '';
    // shift format expected: "HH:MM:SS-HH:MM:SS"
    const [start, end] = shift.split('-');
    if (!start || !end) return '';
    
    // We filter users who are assigned to this shift
    return ` AND ss.user_id IN (
        SELECT user_id FROM user_shifts 
        WHERE shift_start::text = '${start}' AND shift_end::text = '${end}'
    )`;
};

// Helper for User filtering
const getUserFilter = (userId, alias = 'ss') => {
    if (!userId || userId === 'all' || userId === '') return '';
    return ` AND ${alias}.user_id = ${parseInt(userId)}`;
};


// --- Summary Dashboard Endpoints ---

// Helper for date connection
const getDateFilter = (range, dateCol) => {
  if (range && range.startsWith('custom:')) {
      const parts = range.split(':');
      if (parts.length === 3) {
          const start = parts[1];
          const end = parts[2];
          return `${dateCol} >= '${start}'::date AND ${dateCol} <= '${end}'::date + INTERVAL '1 day' - INTERVAL '1 second'`; 
          // Note: If dateCol is a timestamp, we want to include the text end date fully. 
          // If we pass '2023-01-01', normally it means midnight. 
          // If dateCol is just a date, casting is fine. 
          // However, the dashboard uses 'created_at::date' mostly.
          // Let's stick to simple date comparison if casted to date.
      }
  }

  // If dateCol includes ::date, we can just do string comparison or standard date logic
  // The existing logic uses CURRENT_DATE.
  
  if (range && range.startsWith('custom_date:')) {
      const [_prefix, start, end] = range.split(':');
      // Assuming dateCol is already cast to date or is a date column
      return `${dateCol} >= '${start}' AND ${dateCol} <= '${end}'`;
  }

  switch (range) {
    case 'daily':
      return `${dateCol} = CURRENT_DATE`;
    case 'yesterday':
      return `${dateCol} = CURRENT_DATE - INTERVAL '1 day'`;
    case 'weekly':
      return `${dateCol} >= DATE_TRUNC('week', CURRENT_DATE)`;
    case 'monthly':
      return `${dateCol} >= DATE_TRUNC('month', CURRENT_DATE)`;
    default:
      return `${dateCol} = CURRENT_DATE`; // Default to today if unknown, or maybe yesterday? legacy said yesterday.
  }
};

// KPIs
app.get('/api/summary/kpis', async (req, res) => {
  const { range = 'yesterday', shift, user } = req.query; 
  const dateFilter = getDateFilter(range, 'ss.created_at::date');
  const shiftFilter = getShiftFilter(shift);
  const userFilter = getUserFilter(user);

  try {
    const timeStats = await query(`
      SELECT 
        COALESCE(SUM(total_time), 0) as total_time,
        COALESCE(SUM(productive_time), 0) as productive_time,
        COALESCE(SUM(wasted_time), 0) as wasted_time,
        COALESCE(SUM(neutral_time), 0) as neutral_time,
        COALESCE(SUM(idle_time), 0) as idle_time,
        COALESCE(SUM(break_time), 0) as break_time
      FROM stealth_sessions ss
      WHERE ${dateFilter} ${shiftFilter} ${userFilter}
    `);
    const row = timeStats.rows[0];

    // 2. Active Users - conditional based on range
    // Daily: Users active in the last 30 minutes (real-time)
    // Other ranges: Users who had sessions in that period
    let activeUsersQuery;
    if (range === 'daily') {
        activeUsersQuery = `SELECT COUNT(DISTINCT user_id) as count FROM stealth_sessions ss WHERE last_updated >= NOW() - INTERVAL '30 minutes' ${shiftFilter}`;
    } else {
        activeUsersQuery = `SELECT COUNT(DISTINCT user_id) as count FROM stealth_sessions ss WHERE ${dateFilter} ${shiftFilter}`;
    }
    const activeUsersResult = await query(activeUsersQuery);
    const activeUsers = activeUsersResult.rows[0].count;

    // 3. Logged In Users (Users who had at least one session in the selected date range)
    const loggedInUsersQuery = `SELECT COUNT(DISTINCT user_id) as count FROM stealth_sessions ss WHERE ${dateFilter} ${shiftFilter}`;
    const loggedInUsersResult = await query(loggedInUsersQuery);
    const loggedInUsers = loggedInUsersResult.rows[0].count;

    // 4. Registered Users (Total count from users table, filtered by shift if selected)
    let totalUsersQuery = 'SELECT COUNT(*) as count FROM users';
    if (shift && shift !== 'All') {
        const [start, end] = shift.split('-');
        totalUsersQuery = `
            SELECT COUNT(u.id) as count 
            FROM users u
            JOIN user_shifts us ON u.id = us.user_id
            WHERE us.shift_start::text = '${start}' AND us.shift_end::text = '${end}'
        `;
    }
    const totalUsersResult = await query(totalUsersQuery);
    const totalUsers = totalUsersResult.rows[0].count;

    res.json({
      total_time: row.total_time,
      productive_time: row.productive_time,
      unproductive_time: row.wasted_time,
      neutral_time: row.neutral_time,
      idle_time: row.idle_time,
      break_time: row.break_time, 
      active_users: activeUsers,
      logged_in_users: loggedInUsers,
      registered_users: totalUsers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
});

// Top Apps
app.get('/api/summary/top-apps', async (req, res) => {
  const { type = 'productive', range = 'yesterday', shift } = req.query; 
  let category = type;
  if (type === 'unproductive') category = 'wasted';
  const dateFilter = getDateFilter(range, 'created_at::date');
  
  let shiftJoin = '';
  let shiftCondition = '';
  
  if (shift && shift !== 'All') {
      const [start, end] = shift.split('-');
      shiftJoin = `
        JOIN stealth_sessions us ON sub.user_session_id = us.id
        JOIN user_shifts ush ON us.user_id = ush.user_id
      `;
      shiftCondition = `AND ush.shift_start::text = '${start}' AND ush.shift_end::text = '${end}'`;
  }

  try {
    const result = await query(`
      SELECT 
        sub.domain_or_app as name,
        sub.category,
        COALESCE(SUM(sub.total_time)::numeric, 0) as total_time
      FROM session_usage_breakdown sub
      ${shiftJoin}
      WHERE sub.category = $1 AND ${dateFilter.replace('created_at', 'sub.created_at')}
      ${shiftCondition}
      GROUP BY sub.domain_or_app, sub.category
      ORDER BY total_time DESC
      LIMIT 5
    `, [category]);
    
    // Convert total_time to number for proper formatting on frontend
    const rows = result.rows.map(r => ({
      ...r,
      total_time: Number(r.total_time)
    }));
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch top apps' });
  }
});

// User Activity Stats (Lowest Activity)
app.get('/api/summary/users-activity', async (req, res) => {
  const { range = 'yesterday', shift } = req.query;
  const dateFilter = getDateFilter(range, 'ss.created_at::date');
  const shiftFilter = getShiftFilter(shift);

  try {
    const result = await query(`
        SELECT 
            u.name,
            COALESCE(SUM(ss.productive_time), 0) as productive_time,
            COALESCE(SUM(ss.idle_time), 0) as idle_time,
            COALESCE(SUM(ss.total_time), 0) as total_time
        FROM users u
        LEFT JOIN stealth_sessions ss ON u.id = ss.user_id AND ${dateFilter}
        WHERE 1=1 ${shiftFilter}
        GROUP BY u.id, u.name
        HAVING COALESCE(SUM(ss.total_time), 0) >= 600
        ORDER BY total_time ASC
        LIMIT 5
    `);
    res.json(result.rows);
  } catch (err) {
     console.error(err);
     res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// Full User Activity Breakdown
app.get('/api/summary/user-breakdown', async (req, res) => {
    const { range = 'yesterday', shift, user } = req.query;
    const dateFilter = getDateFilter(range, 'ss.created_at::date');
    const shiftFilter = getShiftFilter(shift);
    const userFilter = getUserFilter(user);

    try {
        // Assuming break time might be tracked in the future, for now 0
        // We select ALL users active in this period
        const result = await query(`
            SELECT 
                u.name,
                COALESCE(SUM(ss.productive_time), 0) as productive,
                COALESCE(SUM(ss.idle_time), 0) as idle,
                COALESCE(SUM(ss.wasted_time), 0) as wasted,
                COALESCE(SUM(ss.neutral_time), 0) as neutral,
                COALESCE(SUM(ss.total_time), 0) as tracked,
                COALESCE(SUM(ss.break_time), 0) as break_time
            FROM users u
            JOIN stealth_sessions ss ON u.id = ss.user_id
            WHERE ${dateFilter} ${shiftFilter} ${userFilter}
            GROUP BY u.id, u.name
            HAVING SUM(ss.total_time) > 0
            ORDER BY tracked DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user breakdown' });
    }
});

// Charts
app.get('/api/summary/charts', async (req, res) => {
    const { range = 'yesterday', shift } = req.query;
    const dateFilter = getDateFilter(range, 'ss.created_at::date');
    const shiftFilter = getShiftFilter(shift);

    try {
        // 1. Highest % Unproductive Time by User
        const unproductiveRes = await query(`
            SELECT 
                u.name, 
                SUM(ss.wasted_time) as unproductive,
                SUM(ss.total_time) as total
            FROM stealth_sessions ss
            JOIN users u ON ss.user_id = u.id
            WHERE ${dateFilter} ${shiftFilter}
            GROUP BY u.name
            HAVING SUM(ss.total_time) > 0
            ORDER BY unproductive DESC
            LIMIT 5
        `);
        
        const unproductiveData = unproductiveRes.rows.map(r => ({
            name: r.name,
            value: parseFloat(((Number(r.unproductive) / Number(r.total)) * 100).toFixed(1)),
            hours: (Number(r.unproductive) / 3600).toFixed(1)
        }));

        // 2. Trends (Tracked, Productive, Idle, Break)
        let groupCol, timeLabel;
        if (range === 'daily' || range === 'yesterday') {
             // Group by Hour
             groupCol = "EXTRACT(HOUR FROM ss.created_at)";
             timeLabel = "TO_CHAR(ss.created_at, 'HH24:00')";
        } else {
             // Group by Date
             groupCol = "ss.created_at::date";
             timeLabel = "TO_CHAR(ss.created_at, 'Mon DD')";
        }

        const trendsRes = await query(`
            SELECT 
                ${timeLabel} as name,
                COALESCE(SUM(ss.total_time), 0) / 3600.0 as tracked,
                COALESCE(SUM(ss.productive_time), 0) / 3600.0 as productive,
                COALESCE(SUM(ss.idle_time), 0) / 3600.0 as idle,
                COALESCE(SUM(ss.break_time), 0) / 3600.0 as break
            FROM stealth_sessions ss
            WHERE ${dateFilter} ${shiftFilter}
            GROUP BY ${groupCol}, name
            ORDER BY name ASC
        `);

        // Convert to number
        const trendsData = trendsRes.rows.map(r => ({
            name: r.name,
            tracked: parseFloat(Number(r.tracked).toFixed(2)),
            productive: parseFloat(Number(r.productive).toFixed(2)),
            idle: parseFloat(Number(r.idle).toFixed(2)),
            break: parseFloat(Number(r.break || 0).toFixed(2))
        }));

        res.json({
            unproductive: unproductiveData,
            trends: trendsData
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ unproductive: [], trends: [] });
    }
});

// Login (Dashboard Users)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await query(
      'SELECT id, name, username, email, phone, type, status, password FROM dashboard_users WHERE email = $1',
      [email]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      if (user.password === password) {
        const { password, ...userWithoutPassword } = user;
        // Check if active
        if (user.status !== 'active') {
             return res.status(401).json({ success: false, error: 'Account is inactive' });
        }
        res.json({ success: true, user: userWithoutPassword });
      } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
    } else {
      res.status(401).json({ success: false, error: 'User not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update Dashboard User Profile (Phone, Password)
app.put('/api/dashboard-users/:id', async (req, res) => {
    const { id } = req.params;
    const { phone, password, newPassword } = req.body;
    
    try {
        let queryStr = 'UPDATE dashboard_users SET updated_at = NOW()';
        const params = [id];
        let paramIdx = 2;

        if (phone !== undefined) {
            queryStr += `, phone = $${paramIdx}`;
            params.push(phone);
            paramIdx++;
        }

        if (newPassword) {
            queryStr += `, password = $${paramIdx}`;
            params.push(newPassword);
            paramIdx++;
        }

        queryStr += ` WHERE id = $1 RETURNING id, name, email, phone, type, status`;

        const result = await query(queryStr, params);
        
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Update failed' });
    }
});

// Delete Dashboard User
app.delete('/api/dashboard-users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query('DELETE FROM dashboard_users WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Deletion failed' });
    }
});

// Main Admin Dashboard Data Aggregation
app.get('/api/dashboard', async (req, res) => {
    const { range = 'yesterday', shift, user } = req.query;
    const dateFilter = getDateFilter(range, 'ss.created_at::date');
    const shiftFilter = getShiftFilter(shift);
    const userFilter = getUserFilter(user);
    const groupCol = range === 'daily' || range === 'yesterday' ? 'EXTRACT(HOUR FROM ss.created_at)' : 'ss.created_at::date';
    const timeLabel = range === 'daily' || range === 'yesterday' ? "TO_CHAR(ss.created_at, 'HH24')" : "TO_CHAR(ss.created_at, 'Mon DD')";

    try {
        // 1. KPIs
        const kpiQuery = await query(`
            SELECT 
                SUM(ss.total_time) as total,
                SUM(ss.productive_time) as productive,
                SUM(ss.wasted_time) as unproductive,
                SUM(ss.neutral_time) as neutral,
                SUM(ss.idle_time) as idle,
                SUM(ss.break_time) as break_time,
                COUNT(DISTINCT ss.user_id) as active_users
            FROM stealth_sessions ss
            WHERE ${dateFilter} ${shiftFilter} ${userFilter}
        `);
        const kpi = kpiQuery.rows[0];

        // Total Users Logic - filtered if shift is on
        let totalUsersQuery = 'SELECT COUNT(*) as count FROM users';
        if (shift && shift !== 'All') {
            const [start, end] = shift.split('-');
            totalUsersQuery = `
                SELECT COUNT(u.id) as count 
                FROM users u
                JOIN user_shifts us ON u.id = us.user_id
                WHERE us.shift_start::text = '${start}' AND us.shift_end::text = '${end}'
            `;
        }
        const totalUsers = (await query(totalUsersQuery)).rows[0].count;

        const formatTime = (sec) => {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            return `${h}h ${m}m`;
        };

        // Dynamic Targets based on Range
        const TARGETS = {
            'daily': { total: '60h', productive: '45h', wasted: '5h', neutral: '5h', idle: '5h', break: '2h' },
            'yesterday': { total: '60h', productive: '45h', wasted: '5h', neutral: '5h', idle: '5h', break: '2h' },
            'weekly': { total: '300h', productive: '225h', wasted: '25h', neutral: '25h', idle: '25h', break: '10h' },
            'monthly': { total: '1200h', productive: '900h', wasted: '100h', neutral: '100h', idle: '100h', break: '40h' }
        };
        const t = TARGETS[range] || TARGETS['daily'];

        const kpis = [
            { label: "Total time tracked", value: formatTime(kpi.total || 0), target: t.total },
            { label: "Productive time", value: formatTime(kpi.productive || 0), target: t.productive },
            { label: "Unproductive time", value: formatTime(kpi.unproductive || 0), target: t.wasted },
            { label: "Neutral & unrated time", value: formatTime(kpi.neutral || 0), target: t.neutral },
            { label: "Idle time", value: formatTime(kpi.idle || 0), target: t.idle },
            { label: "Break time", value: formatTime(kpi.break_time || 0), target: t.break },
            { label: "Total active users", value: kpi.active_users || "0" },
            { label: "Total registered users", value: totalUsers }
        ];

        // 2. Trends
        const trendsQuery = await query(`
            SELECT 
                ${timeLabel} as label,
                COALESCE(SUM(ss.total_time), 0) / 3600.0 as tracked,
                COALESCE(SUM(ss.productive_time), 0) / 3600.0 as productive,
                COALESCE(SUM(ss.idle_time), 0) / 60.0 as idle, -- Minutes
                COALESCE(SUM(ss.break_time), 0) / 60.0 as break -- Minutes
            FROM stealth_sessions ss
            WHERE ${dateFilter} ${shiftFilter} ${userFilter}
            GROUP BY ${groupCol}, label
            ORDER BY label ASC
        `);
        const trendsData = trendsQuery.rows;

        // 3. User Rankings
        const rankingsQuery = await query(`
            SELECT u.name, SUM(ss.total_time)/3600.0 as hours
            FROM stealth_sessions ss JOIN users u ON ss.user_id = u.id
            WHERE ${dateFilter} ${shiftFilter} ${userFilter}
            GROUP BY u.name
            ORDER BY hours DESC
        `);
        const rankings = rankingsQuery.rows.map(r => ({ name: r.name, hours: Number(r.hours).toFixed(2) }));

        // 4. Efficiency (Idle)
        const idleQuery = await query(`
             SELECT u.name, (SUM(ss.idle_time)/SUM(ss.total_time)*100) as percent, SUM(ss.idle_time) as idle_seconds
             FROM stealth_sessions ss JOIN users u ON ss.user_id = u.id
             WHERE ${dateFilter} ${shiftFilter} ${userFilter}
             GROUP BY u.name
             HAVING SUM(ss.total_time) > 0
             ORDER BY percent DESC
             LIMIT 5
        `);
        const idleTable = idleQuery.rows.map(r => ({ 
            name: r.name, 
            percent: Number(r.percent).toFixed(2) + '%', 
            minutes: formatTime(r.idle_seconds) 
        }));

        // 5. User Status Lists
        // Active Users (Active in last 30 minutes)
        const activeUsersQuery = await query(`
            SELECT DISTINCT u.name, MAX(ss.last_updated) as last_active, SUM(ss.total_time) as duration
            FROM stealth_sessions ss JOIN users u ON ss.user_id = u.id
            WHERE ss.last_updated >= NOW() - INTERVAL '30 minutes' ${shiftFilter} ${userFilter}
            GROUP BY u.name
        `);
        const activeUsersList = activeUsersQuery.rows.map(r => ({
            name: r.name,
            duration: formatTime(r.duration)
        }));

        // Started Late (First session > 9:00 AM)
        const lateQuery = await query(`
            SELECT u.name, MIN(ss.created_at) as start_time
            FROM stealth_sessions ss JOIN users u ON ss.user_id = u.id
            WHERE ${dateFilter} ${shiftFilter} ${userFilter}
            GROUP BY u.name, DATE(ss.created_at)
            ORDER BY start_time DESC
        `);
        const SHIFT_START_HOUR = 9; // 9 AM Default
        const PKT_OFFSET_HOURS = 5; // Pakistan Standard Time (UTC+5)
        
        const startedLateList = lateQuery.rows
            .filter(r => {
                const date = new Date(r.start_time);
                // Use UTC hours + PKT offset for consistent timezone handling
                const utcHours = date.getUTCHours();
                const utcMinutes = date.getUTCMinutes();
                const pktHours = (utcHours + PKT_OFFSET_HOURS) % 24;
                const totalMinutes = pktHours * 60 + utcMinutes;
                const targetMinutes = SHIFT_START_HOUR * 60;
                return totalMinutes > targetMinutes;
            })
            .map(r => {
                const date = new Date(r.start_time);
                // Use UTC hours + PKT offset for consistent timezone handling
                const utcHours = date.getUTCHours();
                const utcMinutes = date.getUTCMinutes();
                const pktHours = (utcHours + PKT_OFFSET_HOURS) % 24;
                const totalMinutes = pktHours * 60 + utcMinutes;
                const targetMinutes = SHIFT_START_HOUR * 60;
                const diff = totalMinutes - targetMinutes;
                
                let delayStr;
                if (diff >= 60) {
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    delayStr = `${h}h ${m}m late`;
                } else {
                    delayStr = `${diff}m late`;
                }
                
                // Format time in PKT
                const pktTimeStr = `${pktHours > 12 ? pktHours - 12 : pktHours}:${String(utcMinutes).padStart(2, '0')} ${pktHours >= 12 ? 'PM' : 'AM'}`;
                
                return {
                    name: r.name,
                    scheduled: '09:00 AM',
                    started: pktTimeStr,
                    delay: delayStr,
                    dateLabel: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Karachi' })
                };
            });

        // Not Started
        // Filter not started against the shift filtered total user list
        let allUsersQuery = 'SELECT id, name FROM users WHERE active = true';
        if (shift && shift !== 'All') {
             const [start, end] = shift.split('-');
             allUsersQuery = `
                 SELECT u.id, u.name FROM users u 
                 JOIN user_shifts us ON u.id = us.user_id
                 WHERE us.shift_start::text = '${start}' AND us.shift_end::text = '${end}'
                 AND u.active = true
             `;
        }
        
        // This await is tricky inside sync block if not careful, but we are in async fx
        const allUsers = await query(allUsersQuery);
        
        const activeUserIdsInPeriod = (await query(`SELECT DISTINCT user_id FROM stealth_sessions ss WHERE ${dateFilter} ${shiftFilter}`)).rows.map(r => r.user_id);
        const notStartedList = allUsers.rows
            .filter(u => !activeUserIdsInPeriod.includes(u.id))
            .map(u => ({ name: u.name }));

        // 6. Usage Query (Top Apps/Domains)
        let usageShiftClause = '';
        if (shift && shift !== 'All') {
            const [start, end] = shift.split('-');
            usageShiftClause = `
                AND sub.user_session_id IN (
                    SELECT us.id FROM stealth_sessions us
                    JOIN user_shifts ush ON us.user_id = ush.user_id
                    WHERE ush.shift_start::text = '${start}' AND ush.shift_end::text = '${end}'
                )
            `;
        }
        
        // User filter for usage breakdown - needs to filter via session
        const usageUserClause = user ? `AND sub.user_session_id IN (SELECT id FROM stealth_sessions WHERE user_id = ${parseInt(user)})` : '';

        const usageQuery = await query(`
            SELECT 
                domain_or_app as name, 
                category, 
                SUM(total_time) as time,
                (SUM(total_time) / NULLIF((SELECT SUM(total_time) FROM session_usage_breakdown sub WHERE ${dateFilter.replace(/ss\./g, 'sub.')} ${usageShiftClause} ${usageUserClause}), 0) * 100) as percent
            FROM session_usage_breakdown sub
            WHERE ${dateFilter.replace(/ss\./g, 'sub.')} ${usageShiftClause} ${usageUserClause}
            GROUP BY domain_or_app, category
            ORDER BY time DESC
            LIMIT 20
        `);

        // Helper to process usage data (maps 'unproductive' to 'wasted' category in DB)
        const processUsage = (cat) => {
            const dbCat = cat === 'unproductive' ? 'wasted' : cat;
            return usageQuery.rows
                .filter(r => r.category === dbCat)
                .slice(0, 5)
                .map(r => ({
                    name: r.name,
                    category: r.category,
                    time: formatTime(r.time),
                    percent: Number(r.percent).toFixed(2) + '%'
                }));
        };

        // Gauges: Top Users by % Productive & Unproductive Time
        const userGaugesQuery = await query(`
            SELECT 
                u.name,
                COALESCE(SUM(ss.productive_time), 0) as prod,
                COALESCE(SUM(ss.wasted_time), 0) as wasted,
                NULLIF(SUM(ss.total_time), 0) as total
            FROM stealth_sessions ss
            JOIN users u ON ss.user_id = u.id
            WHERE ${dateFilter} ${shiftFilter} ${userFilter}
            GROUP BY u.name
            HAVING SUM(ss.total_time) > 0
        `);

        const userGaugeStats = userGaugesQuery.rows.map(r => ({
            name: r.name,
            prodPct: (Number(r.prod) / Number(r.total)) * 100,
            wastedPct: (Number(r.wasted) / Number(r.total)) * 100
        }));

        res.json({
            kpis,
            trends: {
                daily: trendsData.map(d => ({ value: Number(d.tracked), date: d.label })),
                productive: trendsData.map(d => ({ value: Number(d.productive), date: d.label })),
                idle: trendsData.map(d => ({ value: Number(d.idle), date: d.label })),
                break: trendsData.map(d => ({ value: Number(d.break) || 0, date: d.label }))
            },
            rankings: {
                topUsers: rankings.slice(0, 5),
                bottomUsers: rankings.slice(-5).reverse()
            },
            gauges: {
                productive: [...userGaugeStats]
                    .sort((a, b) => b.prodPct - a.prodPct)
                    .slice(0, 3)
                    .map(r => ({
                        name: r.name,
                        percentage: r.prodPct.toFixed(1)
                    })), 
                unproductive: [...userGaugeStats]
                    .sort((a, b) => b.wastedPct - a.wastedPct)
                    .slice(0, 3)
                    .map(r => ({
                        name: r.name,
                        percentage: r.wastedPct.toFixed(1)
                    }))
            },
            statusLists: {
                activeUsers: activeUsersList,
                startedLate: startedLateList,
                notStarted: notStartedList
            },
            efficiency: {
                idleTimeTable: idleTable,
                breakTimeTable: []
            },
            distribution: {
                veryHigh: [], high: [], low: [], veryLow: []
            },
            usage: {
                productiveApps: processUsage('productive'), 
                unproductiveApps: processUsage('unproductive'), 
                neutralApps: processUsage('neutral')
            }
        });

    } catch (e) {
        console.error("Dashboard Error:", e);
        res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
});

// Start the server if running directly (local dev)
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

export default app;
