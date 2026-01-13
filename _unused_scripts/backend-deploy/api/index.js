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
    res.send('Eastriver Analytics API');
});

// Get all users
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

// --- Summary Dashboard Endpoints ---

// Helper for date connection
const getDateFilter = (range, dateCol) => {
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
      return `${dateCol} = CURRENT_DATE - INTERVAL '1 day'`; // Default legacy behavior
  }
};

// KPIs
app.get('/api/summary/kpis', async (req, res) => {
  const { range = 'yesterday' } = req.query; 
  const dateFilter = getDateFilter(range, 'date');
  const activeUserDateFilter = getDateFilter(range, 'last_updated'); // Or specific logic for active users? 
  // User asked "everything filtered according to day". 
  // For 'active_users', usually it implies distinct users active in that period.

  try {
    const timeStats = await query(`
      SELECT 
        COALESCE(SUM(total_time), 0) as total_time,
        COALESCE(SUM(productive_time), 0) as productive_time,
        COALESCE(SUM(wasted_time), 0) as wasted_time,
        COALESCE(SUM(neutral_time), 0) as neutral_time,
        COALESCE(SUM(idle_time), 0) as idle_time
      FROM stealth_sessions
      WHERE ${dateFilter}
    `);
    const row = timeStats.rows[0];

    // 2. Active Users
    // Logic: Always show users active in the last 1 hour (Real-time status), regardless of selected historical range.
    const activeUsersQuery = `SELECT COUNT(DISTINCT user_id) as count FROM stealth_sessions WHERE created_at >= NOW() - INTERVAL '1 hour'`;
    
    const activeUsersResult = await query(activeUsersQuery);
    const activeUsers = activeUsersResult.rows[0].count;

    // 3. Registered Users (Total count from users table)
    const totalUsersResult = await query('SELECT COUNT(*) as count FROM users');
    const totalUsers = totalUsersResult.rows[0].count;

    res.json({
      total_time: row.total_time,
      productive_time: row.productive_time,
      unproductive_time: row.wasted_time,
      neutral_time: row.neutral_time,
      idle_time: row.idle_time,
      break_time: 0, 
      active_users: activeUsers,
      registered_users: totalUsers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
});

// Top Apps
app.get('/api/summary/top-apps', async (req, res) => {
  const { type = 'productive', range = 'yesterday' } = req.query; 
  const category = type === 'productive' ? 'productive' : 'wasted';
  const dateFilter = getDateFilter(range, 'created_at::date');
  
  try {
    const result = await query(`
      SELECT 
        domain_or_app as name,
        category,
        SUM(total_time) as total_time
      FROM session_usage_breakdown
      WHERE category = $1 AND ${dateFilter}
      GROUP BY domain_or_app, category
      ORDER BY total_time DESC
      LIMIT 5
    `, [category]);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch top apps' });
  }
});

// User Activity Stats (Lowest Activity)
app.get('/api/summary/users-activity', async (req, res) => {
  const { range = 'yesterday' } = req.query;
  const dateFilter = getDateFilter(range, 'ss.created_at::date');

  try {
    const result = await query(`
        SELECT 
            u.name,
            COALESCE(SUM(ss.productive_time), 0) as productive_time,
            COALESCE(SUM(ss.idle_time), 0) as idle_time,
            COALESCE(SUM(ss.total_time), 0) as total_time
        FROM users u
        LEFT JOIN stealth_sessions ss ON u.id = ss.user_id AND ${dateFilter}
        GROUP BY u.id, u.name
        HAVING COALESCE(SUM(ss.total_time), 0) > 0
        ORDER BY total_time ASC
        LIMIT 5
    `);
    res.json(result.rows);
  } catch (err) {
     console.error(err);
     res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// Charts
app.get('/api/summary/charts', async (req, res) => {
    const { range = 'yesterday' } = req.query;
    const dateFilter = getDateFilter(range, 'ss.created_at::date');

    try {
        // 1. Highest % Unproductive Time by User
        // User wants "unproductive time in sessions order from highets to lowest of users"
        // So we want: User Name, Unproductive Time (or % of their total time?)
        // Title: "Highest % Unproductive Time On Websites And Apps" -> Maybe "Highest % Unproductive Time by User"
        // Let's calculate Unproductive Time for each user.
        // We will return: name: User Name, value: Unproductive Time (seconds, later converted to % of total time maybe?)
        // Actually, bar chart is labeled "Highest % Unproductive".
        // Let's assume it means: For each user, what is their Unproductive Time. Or Unproductive / Total Time ratio?
        // "Highest % Unproductive Time" generally implies Ratio. (Unproductive / Total) * 100.
        
        const unproductiveRes = await query(`
            SELECT 
                u.name, 
                SUM(ss.wasted_time) as unproductive,
                SUM(ss.total_time) as total
            FROM stealth_sessions ss
            JOIN users u ON ss.user_id = u.id
            WHERE ${dateFilter} 
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
                0 as break
            FROM stealth_sessions ss
            WHERE ${dateFilter}
            GROUP BY ${groupCol}, name
            ORDER BY name ASC
        `);

        // Convert to number
        const trendsData = trendsRes.rows.map(r => ({
            name: r.name,
            tracked: parseFloat(Number(r.tracked).toFixed(2)),
            productive: parseFloat(Number(r.productive).toFixed(2)),
            idle: parseFloat(Number(r.idle).toFixed(2)),
            break: parseFloat(Number(r.break).toFixed(2))
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

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await query(
      'SELECT id, name, email, usertype_id, password FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // WARNING: Plain text password comparison as per current DB state
      if (user.password === password) {
        const { password, ...userWithoutPassword } = user;
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

// Main Admin Dashboard Data Aggregation
app.get('/api/dashboard', async (req, res) => {
    const { range = 'yesterday' } = req.query;
    const dateFilter = getDateFilter(range, 'ss.created_at::date');
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
                COUNT(DISTINCT ss.user_id) as active_users
            FROM stealth_sessions ss
            WHERE ${dateFilter}
        `);
        const kpi = kpiQuery.rows[0];
        const totalUsers = (await query('SELECT COUNT(*) FROM users')).rows[0].count;

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
            { label: "Break time", value: "0h 0m", target: t.break },
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
                0 as break
            FROM stealth_sessions ss
            WHERE ${dateFilter}
            GROUP BY ${groupCol}, label
            ORDER BY label ASC
        `);
        const trendsData = trendsQuery.rows;

        // 3. User Rankings
        const rankingsQuery = await query(`
            SELECT u.name, SUM(ss.total_time)/3600.0 as hours
            FROM stealth_sessions ss JOIN users u ON ss.user_id = u.id
            WHERE ${dateFilter}
            GROUP BY u.name
            ORDER BY hours DESC
        `);
        const rankings = rankingsQuery.rows.map(r => ({ name: r.name, hours: Number(r.hours).toFixed(2) }));

        // 4. Efficiency (Idle)
        const idleQuery = await query(`
             SELECT u.name, (SUM(ss.idle_time)/SUM(ss.total_time)*100) as percent, SUM(ss.idle_time) as idle_seconds
             FROM stealth_sessions ss JOIN users u ON ss.user_id = u.id
             WHERE ${dateFilter}
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
        // Active Users (Active in last 1 hour)
        const activeUsersQuery = await query(`
            SELECT DISTINCT u.name, MAX(ss.created_at) as last_active, SUM(ss.total_time) as duration
            FROM stealth_sessions ss JOIN users u ON ss.user_id = u.id
            WHERE ss.created_at >= NOW() - INTERVAL '1 hour'
            GROUP BY u.name
        `);
        const activeUsersList = activeUsersQuery.rows.map(r => ({
            name: r.name,
            duration: formatTime(r.duration)
        }));

        // Started Late (First session > 9:00 AM)
        // Only applicable for Daily/Yesterday views usually, but we apply filter logic
        const lateQuery = await query(`
            SELECT u.name, MIN(ss.created_at) as start_time
            FROM stealth_sessions ss JOIN users u ON ss.user_id = u.id
            WHERE ${dateFilter}
            GROUP BY u.name, DATE(ss.created_at)
            ORDER BY start_time DESC
        `);
        const SHIFT_START_HOUR = 9; // 9 AM Default
        const startedLateList = lateQuery.rows
            .filter(r => {
                const date = new Date(r.start_time);
                // Convert UTC to local conceptual time or just compare hours
                // Assuming basic hour check for MVP
                return date.getHours() >= SHIFT_START_HOUR && date.getMinutes() > 0;
            })
            .map(r => {
                const date = new Date(r.start_time);
                const shiftDate = new Date(date);
                shiftDate.setHours(SHIFT_START_HOUR, 0, 0, 0);
                const lateMs = date.getTime() - shiftDate.getTime();
                const lateMins = Math.floor(lateMs / 60000);
                const h = Math.floor(lateMins / 60);
                const m = lateMins % 60;
                
                return {
                    name: r.name,
                    scheduled: '09:00 AM',
                    started: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    delay: `${h}h ${m}m late`,
                    dateLabel: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                };
            });

        // Not Started (Users with 0 sessions in period)
        const allUsers = await query('SELECT id, name FROM users WHERE active = true');
        const activeUserIdsInPeriod = (await query(`SELECT DISTINCT user_id FROM stealth_sessions ss WHERE ${dateFilter}`)).rows.map(r => r.user_id);
        const notStartedList = allUsers.rows
            .filter(u => !activeUserIdsInPeriod.includes(u.id))
            .map(u => ({ name: u.name }));

        // 6. Usage Query (Top Apps/Domains)
        const usageQuery = await query(`
            SELECT 
                domain_or_app as name, 
                category, 
                SUM(total_time) as time,
                (SUM(total_time) / (SELECT SUM(total_time) FROM session_usage_breakdown WHERE ${dateFilter.replace(/ss\./g, '')}) * 100) as percent
            FROM session_usage_breakdown
            WHERE ${dateFilter.replace(/ss\./g, '')}
            GROUP BY domain_or_app, category
            ORDER BY time DESC
            LIMIT 20
        `);

        // Helper to process usage data
        const processUsage = (cat) => usageQuery.rows
            .filter(r => r.category === cat)
            .slice(0, 5)
            .map(r => ({
                name: r.name,
                category: r.category,
                time: formatTime(r.time),
                percent: Number(r.percent).toFixed(2) + '%'
            }));

        res.json({
            kpis,
            trends: {
                daily: trendsData.map(d => ({ value: Number(d.tracked), date: d.label })),
                productive: trendsData.map(d => ({ value: Number(d.productive), date: d.label })),
                idle: trendsData.map(d => ({ value: Number(d.idle), date: d.label })),
                break: trendsData.map(d => ({ value: 0, date: d.label }))
            },
            rankings: {
                topUsers: rankings.slice(0, 5),
                bottomUsers: rankings.slice(-5).reverse()
            },
            gauges: {
                productive: usageQuery.rows
                    .filter(r => r.category === 'productive')
                    .slice(0, 3)
                    .map(r => ({
                        name: r.name,
                        percentage: Number(r.percent).toFixed(1)
                    })), 
                unproductive: usageQuery.rows
                    .filter(r => r.category === 'wasted')
                    .slice(0, 3)
                    .map(r => ({
                        name: r.name,
                        percentage: Number(r.percent).toFixed(1)
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
// In Vercel, this export is used
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
}

export default app;
