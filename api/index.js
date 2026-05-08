import express from 'express';
import cors from 'cors';
import { query } from './db.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
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
        username,
        phone, 
        status, 
        type,
        companies
      FROM dashboard_users u
      WHERE 1=1 ${getDashboardUserCompanyFilter(req.query.companies, 'u')}
      ORDER BY u.created_at DESC
    `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch dashboard users' });
    }
});

// Add new dashboard user
app.post('/api/dashboard-users', async (req, res) => {
    const { name, username, email, password, phone, type, status = 'active', companies } = req.body;
    try {
        let companiesArray = ['All'];
        if (Array.isArray(companies)) {
            companiesArray = companies;
        } else if (companies && typeof companies === 'string') {
            companiesArray = companies.split(',').map(c => c.trim()).filter(c => c);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await query(
            `INSERT INTO dashboard_users (name, username, email, password, phone, type, status, companies) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
            [name, username, email, hashedPassword, phone, type, status, companiesArray]
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
        u.usertype_id,
        ut.name as usertype,
        u.status,
        u.company,
        u.created_at,
        us.shift_start,
        us.shift_end,
        us.breaktime_start,
        us.breaktime_end,
        COALESCE(COUNT(DISTINCT ss.date), 0) as total_sessions,
        COALESCE(SUM(ss.total_time) * 1000, 0) as total_time
      FROM users u
      LEFT JOIN usertypes ut ON u.usertype_id = ut.id
      LEFT JOIN user_shifts us ON u.id = us.user_id
      LEFT JOIN stealth_sessions ss ON u.id = ss.user_id
      WHERE 1=1 ${getCompanyFilter(req.query.companies)}
      GROUP BY u.id, u.name, u.email, u.phone, u.usertype_id, ut.name, u.status, u.company, u.created_at, us.shift_start, us.shift_end, us.breaktime_start, us.breaktime_end
      ORDER BY u.created_at DESC
    `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Add new monitored user with shift
app.post('/api/users', async (req, res) => {
    const { name, email, phone, usertype_id, company, shift_start, shift_end, breaktime_start, breaktime_end } = req.body;

    if (!name || !email || !usertype_id) {
        return res.status(400).json({ error: 'Name, email, and usertype_id are required' });
    }

    try {
        await query('BEGIN');

        // 1. Insert into users table
        const userResult = await query(
            `INSERT INTO users (name, email, phone, usertype_id, company, status) 
             VALUES ($1, $2, $3, $4, $5, 'active') 
       RETURNING id`,
            [name, email, phone || null, usertype_id, company || null]
        );

        const userId = userResult.rows[0].id;

        // 2. Insert into user_shifts table
        if (shift_start && shift_end) {
            await query(
                `INSERT INTO user_shifts (user_id, shift_start, shift_end, breaktime_start, breaktime_end)
         VALUES ($1, $2, $3, $4, $5)`,
                [userId, shift_start, shift_end, breaktime_start || null, breaktime_end || null]
            );
        }

        await query('COMMIT');
        res.json({ success: true, id: userId });
    } catch (err) {
        await query('ROLLBACK');
        console.error(err);
        if (err.code === '23505') {
            res.status(400).json({ error: 'Email already exists' });
        } else {
            res.status(500).json({ error: 'Failed to add monitored user' });
        }
    }
});

// Delete monitored user
app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const companyFilter = getCompanyFilter(req.query.companies);
        // Note: Database schema should have CASCADE deletes for user_shifts and stealth_sessions
        const result = await query(`DELETE FROM users u WHERE u.id = $1 ${companyFilter} RETURNING u.id`, [id]);
        if (result.rows.length > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Update monitored user
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, usertype_id, company, shift_start, shift_end, breaktime_start, breaktime_end } = req.body;

    if (!name || !email || !usertype_id) {
        return res.status(400).json({ error: 'Name, email, and usertype_id are required' });
    }

    try {
        await query('BEGIN');

        // 1. Update users table
        const companyFilter = getCompanyFilter(req.query.companies);
        const userResult = await query(
            `UPDATE users 
             SET name = $1, email = $2, phone = $3, usertype_id = $4, company = $5, updated_at = NOW()
             WHERE id = $6 ${companyFilter.replace('u.', '')}
             RETURNING *`,
            [name, email, phone || null, usertype_id, company || null, id]
        );

        if (userResult.rows.length === 0) {
            await query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Update or Insert into user_shifts table
        if (shift_start && shift_end) {
            await query(
                `INSERT INTO user_shifts (user_id, shift_start, shift_end, breaktime_start, breaktime_end)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id) DO UPDATE SET 
                    shift_start = EXCLUDED.shift_start,
                    shift_end = EXCLUDED.shift_end,
                    breaktime_start = EXCLUDED.breaktime_start,
                    breaktime_end = EXCLUDED.breaktime_end,
                    updated_at = NOW()`,
                [id, shift_start, shift_end, breaktime_start || null, breaktime_end || null]
            );
        } else {
            // Optionally delete shift if not provided? Usually we just keep it or clear it.
            // For now, let's just keep it.
        }

        await query('COMMIT');
        res.json({ success: true, user: userResult.rows[0] });
    } catch (err) {
        await query('ROLLBACK');
        console.error(err);
        if (err.code === '23505') {
            res.status(400).json({ error: 'Email already exists' });
        } else {
            res.status(500).json({ error: 'Failed to update user' });
        }
    }
});

// Get all user types
app.get('/api/usertypes', async (req, res) => {
    try {
        const result = await query(`
      SELECT id, name
      FROM usertypes
      WHERE active = true
      ORDER BY name ASC
    `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user types' });
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

// Helper for Company filtering
const getCompanyFilter = (companiesQuery, alias = 'u') => {
    if (!companiesQuery || companiesQuery === '' || companiesQuery === 'All') return '';
    const companies = companiesQuery.split(',').map(c => c.trim()).filter(c => c);
    if (companies.includes('All')) return '';
    if (companies.length === 0) return '';

    // Use ANY with array of strings
    const companiesList = companies.map(c => `'${c.replace(/'/g, "''")}'`).join(',');
    return ` AND ${alias}.company = ANY(ARRAY[${companiesList}])`;
};

// Helper for Dashboard User Company filtering (array overlap)
const getDashboardUserCompanyFilter = (companiesQuery, alias = 'u') => {
    if (!companiesQuery || companiesQuery === '' || companiesQuery === 'All') return '';
    const companies = companiesQuery.split(',').map(c => c.trim()).filter(c => c);
    if (companies.includes('All')) return '';
    if (companies.length === 0) return '';

    const companiesList = companies.map(c => `'${c.replace(/'/g, "''")}'`).join(',');
    return ` AND ${alias}.companies && ARRAY[${companiesList}]`;
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
    const { range = 'yesterday', shift, user, companies } = req.query;
    const dateFilter = getDateFilter(range, 'ss.created_at::date');
    const shiftFilter = getShiftFilter(shift);
    const userFilter = getUserFilter(user);
    const companyFilter = getCompanyFilter(companies, 'u');

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
      JOIN users u ON ss.user_id = u.id
      WHERE ${dateFilter} ${shiftFilter} ${userFilter} ${companyFilter}
    `);
        const row = timeStats.rows[0];

        // 2. Active Users - conditional based on range
        // Daily: Users active in the last 30 minutes (real-time)
        // Other ranges: Users who had sessions in that period
        let activeUsersQuery;
        if (range === 'daily') {
            activeUsersQuery = `SELECT COUNT(DISTINCT user_id) as count FROM stealth_sessions ss JOIN users u ON ss.user_id = u.id WHERE last_updated >= NOW() - INTERVAL '30 minutes' ${shiftFilter} ${userFilter} ${companyFilter}`;
        } else {
            activeUsersQuery = `SELECT COUNT(DISTINCT user_id) as count FROM stealth_sessions ss JOIN users u ON ss.user_id = u.id WHERE ${dateFilter} ${shiftFilter} ${userFilter} ${companyFilter}`;
        }
        const activeUsersResult = await query(activeUsersQuery);
        const activeUsers = activeUsersResult.rows[0].count;

        // 3. Logged In Users (Users who had at least one session in the selected date range)
        const loggedInUsersQuery = `SELECT COUNT(DISTINCT user_id) as count FROM stealth_sessions ss JOIN users u ON ss.user_id = u.id WHERE ${dateFilter} ${shiftFilter} ${userFilter} ${companyFilter}`;
        const loggedInUsersResult = await query(loggedInUsersQuery);
        const loggedInUsers = loggedInUsersResult.rows[0].count;

        // 4. Registered Users (Total count from users table, filtered by shift if selected)
        // If a specific user is selected, return 1 instead of total count
        let totalUsersQuery = 'SELECT COUNT(*) as count FROM users';
        if (user && user !== 'all' && user !== '') {
            totalUsersQuery = 'SELECT 1 as count';
        } else if (shift && shift !== 'All') {
            const [start, end] = shift.split('-');
            totalUsersQuery = `
            SELECT COUNT(u.id) as count 
            FROM users u
            JOIN user_shifts us ON u.id = us.user_id
            WHERE us.shift_start::text = '${start}' AND us.shift_end::text = '${end}' ${companyFilter}
        `;
        } else {
            totalUsersQuery = `SELECT COUNT(*) as count FROM users u WHERE 1=1 ${companyFilter}`;
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
    const { type = 'productive', range = 'yesterday', shift, companies } = req.query;
    let category = type;
    if (type === 'unproductive') category = 'wasted';
    const dateFilter = getDateFilter(range, 'created_at::date');
    const companyFilter = getCompanyFilter(companies, 'u');

    let shiftJoin = '';
    let shiftCondition = '';

    if (shift && shift !== 'All') {
        const [start, end] = shift.split('-');
        shiftJoin = `
        JOIN stealth_sessions us ON sub.user_session_id = us.id
        JOIN users u ON us.user_id = u.id
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
      ${shiftJoin || 'JOIN stealth_sessions us ON sub.user_session_id = us.id JOIN users u ON us.user_id = u.id'}
      WHERE sub.category = $1 AND ${dateFilter.replace('created_at', 'sub.created_at')}
      ${shiftCondition} ${companyFilter}
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
    const { range = 'yesterday', shift, companies } = req.query;
    const dateFilter = getDateFilter(range, 'ss.created_at::date');
    const shiftFilter = getShiftFilter(shift);
    const companyFilter = getCompanyFilter(companies, 'u');

    try {
        const result = await query(`
        SELECT 
            u.name,
            COALESCE(SUM(ss.productive_time), 0) as productive_time,
            COALESCE(SUM(ss.idle_time), 0) as idle_time,
            COALESCE(SUM(ss.total_time), 0) as total_time
        FROM users u
        LEFT JOIN stealth_sessions ss ON u.id = ss.user_id AND ${dateFilter}
        WHERE 1=1 ${shiftFilter} ${companyFilter}
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
    const { range = 'yesterday', shift, user, companies } = req.query;
    const dateFilter = getDateFilter(range, 'ss.created_at::date');
    const shiftFilter = getShiftFilter(shift);
    const userFilter = getUserFilter(user);
    const companyFilter = getCompanyFilter(companies, 'u');

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
            WHERE ${dateFilter} ${shiftFilter} ${userFilter} ${companyFilter}
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
    const { range = 'yesterday', shift, companies } = req.query;
    const dateFilter = getDateFilter(range, 'ss.created_at::date');
    const shiftFilter = getShiftFilter(shift);
    const companyFilter = getCompanyFilter(companies, 'u');

    try {
        // 1. Highest % Unproductive Time by User
        const unproductiveRes = await query(`
            SELECT 
                u.name, 
                SUM(ss.wasted_time) as unproductive,
                SUM(ss.total_time) as total
            FROM stealth_sessions ss
            JOIN users u ON ss.user_id = u.id
            WHERE ${dateFilter} ${shiftFilter} ${companyFilter}
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
            JOIN users u ON ss.user_id = u.id
            WHERE ${dateFilter} ${shiftFilter} ${companyFilter}
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
            'SELECT id, name, username, email, phone, type, status, password, companies FROM dashboard_users WHERE email = $1',
            [email]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];

            let isMatch = false;
            try {
                isMatch = await bcrypt.compare(password, user.password);
            } catch (e) {
                isMatch = false;
            }

            // Fallback for existing plain-text passwords
            if (!isMatch && user.password === password) {
                isMatch = true;
            }

            if (isMatch) {
                const { password: userPassword, ...userWithoutPassword } = user;
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

// Get all predefined companies
app.get('/api/companies', async (req, res) => {
    try {
        const result = await query('SELECT * FROM companies ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});

// Add a new company
app.post('/api/companies', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Company name is required' });
    try {
        const result = await query(
            'INSERT INTO companies (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *',
            [name]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add company' });
    }
});

// Delete a company
app.delete('/api/companies/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await query('DELETE FROM companies WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete company' });
    }
});

// Update Dashboard User Profile (Phone, Password)
app.put('/api/dashboard-users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, username, email, phone, type, status, companies, newPassword } = req.body;

    try {
        let queryStr = 'UPDATE dashboard_users SET updated_at = NOW()';
        const params = [id];
        let paramIdx = 2;

        if (name) {
            queryStr += `, name = $${paramIdx}`;
            params.push(name);
            paramIdx++;
        }
        if (username) {
            queryStr += `, username = $${paramIdx}`;
            params.push(username);
            paramIdx++;
        }
        if (email) {
            queryStr += `, email = $${paramIdx}`;
            params.push(email);
            paramIdx++;
        }
        if (phone !== undefined) {
            queryStr += `, phone = $${paramIdx}`;
            params.push(phone);
            paramIdx++;
        }
        if (type) {
            queryStr += `, type = $${paramIdx}`;
            params.push(type);
            paramIdx++;
        }
        if (status) {
            queryStr += `, status = $${paramIdx}`;
            params.push(status);
            paramIdx++;
        }
        if (companies !== undefined) {
            let companiesArray = ['All'];
            if (Array.isArray(companies)) {
                companiesArray = companies;
            } else if (companies && typeof companies === 'string') {
                companiesArray = companies.split(',').map(c => c.trim()).filter(c => c);
            }
            queryStr += `, companies = $${paramIdx}`;
            params.push(companiesArray);
            paramIdx++;
        }
        if (newPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            queryStr += `, password = $${paramIdx}`;
            params.push(hashedPassword);
            paramIdx++;
        }

        queryStr += ` WHERE id = $1 RETURNING id, name, email, username, phone, type, status, companies`;

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

// Device Mappings Management (Admin Only)
// Get all device mappings with user details
app.get('/api/device-mappings', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                udm.id,
                udm.user_id,
                udm.device_id,
                udm.ip_address,
                udm.created_at,
                u.name as user_name,
                u.email as user_email
            FROM user_device_mappings udm
            JOIN users u ON udm.user_id = u.id
            WHERE 1=1 ${getCompanyFilter(req.query.companies, 'u')}
            ORDER BY udm.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch device mappings' });
    }
});

// Create new device mapping
app.post('/api/device-mappings', async (req, res) => {
    const { user_id, device_id, ip_address } = req.body;

    if (!user_id || !device_id) {
        return res.status(400).json({ error: 'user_id and device_id are required' });
    }

    try {
        const result = await query(
            `INSERT INTO user_device_mappings (user_id, device_id, ip_address) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [user_id, device_id, ip_address || null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique violation
            res.status(400).json({ error: 'This device is already mapped to this user' });
        } else if (err.code === '23503') { // Foreign key violation
            res.status(400).json({ error: 'Invalid user_id' });
        } else {
            res.status(500).json({ error: 'Failed to create device mapping' });
        }
    }
});

// Delete device mapping
app.delete('/api/device-mappings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query('DELETE FROM user_device_mappings WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Device mapping not found' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Deletion failed' });
    }
});

// Unregistered Sessions Management (Admin Only)
// Get stealth sessions where user_in_db = false and not mapped to any device
app.get('/api/unregistered-sessions', async (req, res) => {
    const { companies } = req.query;
    // Allow admins to view unregistered sessions so they can claim them.
    // The frontend will ensure they can only register them to their own company.

    try {
        const result = await query(`
            SELECT 
                ss.id,
                ss.session_id,
                ss.device_id,
                ss.system_name,
                ss.windows_username,
                ss.ip_address,
                ss.os_version,
                ss.domain,
                ss.created_at,
                ss.total_time,
                ss.productive_time,
                ss.wasted_time,
                ss.neutral_time,
                ss.idle_time
            FROM stealth_sessions ss
            WHERE ss.user_in_db = false
            ORDER BY ss.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch unregistered sessions' });
    }
});

// Register a new user and link to session
app.post('/api/register-user-from-session', async (req, res) => {
    const { name, email, phone, usertype_id, company, session_id, device_id, windows_username, shift_start, shift_end, breaktime_start, breaktime_end } = req.body;

    if (!name || !email || !usertype_id || !session_id) {
        return res.status(400).json({ error: 'name, email, usertype_id, and session_id are required' });
    }

    try {
        // Start transaction
        await query('BEGIN');

        // Insert user
        const userResult = await query(
            `INSERT INTO users (name, email, phone, usertype_id, company, status) 
             VALUES ($1, $2, $3, $4, $5, 'active') 
             RETURNING *`,
            [name, email, phone || null, usertype_id, company || null]
        );

        const newUser = userResult.rows[0];

        // Update all stealth sessions with same device_id or windows_username and user_id IS NULL
        await query(
            `UPDATE stealth_sessions 
             SET user_id = $1, user_in_db = true 
             WHERE (session_id = $2
                 OR (device_id IS NOT NULL AND device_id = $3)
                 OR (windows_username IS NOT NULL AND windows_username = $4))
               AND (user_id IS NULL OR user_id = 0)`,
            [newUser.id, session_id, device_id || null, windows_username || null]
        );

        // Create device mapping if device_id exists
        if (device_id) {
            await query(
                `INSERT INTO user_device_mappings (user_id, device_id, ip_address)
                 VALUES ($1, $2, (SELECT ip_address FROM stealth_sessions WHERE session_id = $3 LIMIT 1))
                 ON CONFLICT (user_id, device_id) DO NOTHING`,
                [newUser.id, device_id, session_id]
            );
        }

        // Create Windows username mapping if provided
        if (windows_username) {
            await query(
                `INSERT INTO windows_username_mappings (user_id, windows_username)
                 VALUES ($1, $2)
                 ON CONFLICT (windows_username) DO NOTHING`,
                [newUser.id, windows_username]
            );
        }

        // 2. Insert into user_shifts table
        if (shift_start && shift_end) {
            await query(
                `INSERT INTO user_shifts (user_id, shift_start, shift_end, breaktime_start, breaktime_end)
             VALUES ($1, $2, $3, $4, $5)`,
                [newUser.id, shift_start, shift_end, breaktime_start || null, breaktime_end || null]
            );
        }

        await query('COMMIT');
        res.json({ success: true, user: newUser });
    } catch (err) {
        await query('ROLLBACK');
        console.error("Registration error:", err);

        if (err.code === '23505') { // Unique violation
            const detail = err.detail || "";
            if (detail.includes('email')) {
                res.status(400).json({ error: 'Email already exists' });
            } else if (detail.includes('windows_username')) {
                res.status(400).json({ error: 'Windows username is already mapped to another user' });
            } else {
                res.status(400).json({ error: 'A record with these details already exists' });
            }
        } else {
            res.status(500).json({ error: 'Failed to register user: ' + (err.message || 'Unknown error') });
        }
    }
});

// Map existing user to session
app.post('/api/map-user-to-session', async (req, res) => {
    const { user_id, session_id, device_id, windows_username } = req.body;

    if (!user_id || !session_id) {
        return res.status(400).json({ error: 'user_id and session_id are required' });
    }

    try {
        await query('BEGIN');

        // Update the specific session AND all other sessions with matching device_id AND windows_username
        await query(
            `UPDATE stealth_sessions 
             SET user_id = $1, user_in_db = true 
             WHERE (device_id IS NOT NULL AND device_id = $2
                    AND windows_username IS NOT NULL AND windows_username = $3)
               AND (user_id IS NULL OR user_id = 0)`,
            [user_id, device_id || null, windows_username || null]
        );

        // Create device mapping if device_id exists
        if (device_id) {
            await query(
                `INSERT INTO user_device_mappings (user_id, device_id, ip_address)
                 VALUES ($1, $2, (SELECT ip_address FROM stealth_sessions WHERE session_id = $3 LIMIT 1))
                 ON CONFLICT (user_id, device_id) DO NOTHING`,
                [user_id, device_id, session_id]
            );
        }

        // Create Windows username mapping if provided
        if (windows_username) {
            await query(
                `INSERT INTO windows_username_mappings (user_id, windows_username)
                 VALUES ($1, $2)
                 ON CONFLICT (windows_username) DO NOTHING`,
                [user_id, windows_username]
            );
        }

        await query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to map user to session' });
    }
});

// Windows Username Mappings Management
// Get all Windows username mappings
app.get('/api/windows-username-mappings', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                wum.id,
                wum.user_id,
                wum.windows_username,
                wum.created_at,
                u.name as user_name,
                u.email as user_email
            FROM windows_username_mappings wum
            JOIN users u ON wum.user_id = u.id
            WHERE 1=1 ${getCompanyFilter(req.query.companies, 'u')}
            ORDER BY wum.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch Windows username mappings' });
    }
});

// Create Windows username mapping
app.post('/api/windows-username-mappings', async (req, res) => {
    const { user_id, windows_username } = req.body;

    if (!user_id || !windows_username) {
        return res.status(400).json({ error: 'user_id and windows_username are required' });
    }

    try {
        const result = await query(
            `INSERT INTO windows_username_mappings (user_id, windows_username) 
             VALUES ($1, $2) 
             RETURNING *`,
            [user_id, windows_username]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique violation
            res.status(400).json({ error: 'This Windows username is already mapped' });
        } else if (err.code === '23503') { // Foreign key violation
            res.status(400).json({ error: 'Invalid user_id' });
        } else {
            res.status(500).json({ error: 'Failed to create Windows username mapping' });
        }
    }
});

// Delete Windows username mapping
app.delete('/api/windows-username-mappings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query('DELETE FROM windows_username_mappings WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Windows username mapping not found' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Deletion failed' });
    }
});

// Main Admin Dashboard Data Aggregation
app.get('/api/dashboard', async (req, res) => {
    const { range = 'yesterday', shift, user, timezone = 'Asia/Karachi', companies } = req.query;
    const dateFilter = getDateFilter(range, 'ss.created_at::date');
    const shiftFilter = getShiftFilter(shift);
    const userFilter = getUserFilter(user);
    const companyFilter = getCompanyFilter(companies, 'u');
    const groupCol = range === 'daily' || range === 'yesterday' ? 'EXTRACT(HOUR FROM ss.created_at)' : 'ss.created_at::date';
    const timeLabel = range === 'daily' || range === 'yesterday' ? "TO_CHAR(ss.created_at, 'HH24')" : "TO_CHAR(ss.created_at, 'Mon DD')";

    // Timezone-aware time formatting helper
    const formatTimeInTimezone = (date, tz) => {
        try {
            return new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: tz
            }).format(date);
        } catch (e) {
            // Fallback for invalid timezone - use UTC
            const h = date.getUTCHours();
            const m = date.getUTCMinutes();
            const ampm = h >= 12 ? 'PM' : 'AM';
            const hour12 = h % 12 || 12;
            return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
        }
    };

    // Get hour and minute in timezone for calculations
    const getTimePartsInTimezone = (date, tz) => {
        try {
            const parts = new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: false,
                timeZone: tz
            }).formatToParts(date);
            const hour = parseInt(parts.find(p => p.type === 'hour')?.value || 0);
            const minute = parseInt(parts.find(p => p.type === 'minute')?.value || 0);
            return { hour, minute };
        } catch (e) {
            return { hour: date.getUTCHours(), minute: date.getUTCMinutes() };
        }
    };

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
            JOIN users u ON ss.user_id = u.id
            WHERE ${dateFilter} ${shiftFilter} ${userFilter} ${companyFilter}
        `);
        const kpi = kpiQuery.rows[0];

        // Total Users Logic - filtered if shift is on
        let totalUsersQuery = `SELECT COUNT(*) as count FROM users u WHERE u.active = true ${companyFilter}`;
        if (shift && shift !== 'All') {
            const [start, end] = shift.split('-');
            totalUsersQuery = `
                SELECT COUNT(u.id) as count 
                FROM users u
                JOIN user_shifts us ON u.id = us.user_id
                WHERE us.shift_start::text = '${start}' AND us.shift_end::text = '${end}'
                AND u.active = true ${companyFilter}
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
            JOIN users u ON ss.user_id = u.id
            WHERE ${dateFilter} ${shiftFilter} ${userFilter} ${companyFilter}
            GROUP BY ${groupCol}, label
            ORDER BY label ASC
        `);
        const rawTrends = trendsQuery.rows;

        const trends = {
            daily: rawTrends.map(r => ({ date: r.label, value: parseFloat(Number(r.tracked).toFixed(1)) })),
            total: rawTrends.map(r => ({ date: r.label, value: parseFloat(Number(r.tracked).toFixed(1)) })),
            productive: rawTrends.map(r => ({ date: r.label, value: parseFloat(Number(r.productive).toFixed(1)) })),
            idle: rawTrends.map(r => ({ date: r.label, value: parseFloat(Number(r.idle).toFixed(1)) })),
            break: rawTrends.map(r => ({ date: r.label, value: parseFloat(Number(r.break).toFixed(1)) }))
        };

        // 3. Rankings
        const rankingsQuery = await query(`
            SELECT u.id as user_id, u.name, SUM(ss.total_time)/3600.0 as hours
            FROM stealth_sessions ss JOIN users u ON ss.user_id = u.id
            WHERE ${dateFilter} ${shiftFilter} ${userFilter} ${companyFilter}
            GROUP BY u.id, u.name
            ORDER BY hours DESC
        `);
        const rankings = rankingsQuery.rows.map(r => ({ userId: r.user_id, name: r.name, hours: Number(r.hours).toFixed(2) }));

        // 4. Efficiency (Idle)
        const idleQuery = await query(`
             SELECT u.name, (SUM(ss.idle_time)/SUM(ss.total_time)*100) as percent, SUM(ss.idle_time) as idle_seconds
             FROM stealth_sessions ss JOIN users u ON ss.user_id = u.id
             WHERE ${dateFilter} ${shiftFilter} ${userFilter} ${companyFilter}
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
            WHERE ss.last_updated >= NOW() - INTERVAL '30 minutes' ${shiftFilter} ${userFilter} ${companyFilter}
            GROUP BY u.name
        `);
        const activeUsersList = activeUsersQuery.rows.map(r => ({
            name: r.name,
            duration: formatTime(r.duration)
        }));

        // Started Late (First session > user's shift_start from user_shifts table)
        // Shift times in DB are stored as UTC, need to convert to selected timezone
        const lateQuery = await query(`
            SELECT u.id as user_id, u.name, MIN(ss.created_at) as start_time,
                   COALESCE(us.shift_start, '04:00:00') as shift_start,
                   COALESCE(us.shift_end, '12:00:00') as shift_end
            FROM stealth_sessions ss 
            JOIN users u ON ss.user_id = u.id
            LEFT JOIN user_shifts us ON u.id = us.user_id
            WHERE ${dateFilter} ${shiftFilter} ${userFilter} ${companyFilter}
            GROUP BY u.id, u.name, us.shift_start, us.shift_end, DATE(ss.created_at)
            ORDER BY start_time DESC
        `);

        // Helper to convert UTC time (HH:MM:SS) to timezone-adjusted time parts
        const convertShiftTimeToTimezone = (timeStr, tz) => {
            // Create a date object with the UTC time on a fixed date (2000-01-01)
            const [hours, minutes, seconds] = timeStr.split(':').map(Number);
            const utcDate = new Date(Date.UTC(2000, 0, 1, hours, minutes, seconds || 0));

            // Use Intl to get the time in the target timezone
            try {
                const parts = new Intl.DateTimeFormat('en-US', {
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: false,
                    timeZone: tz
                }).formatToParts(utcDate);
                const hour = parseInt(parts.find(p => p.type === 'hour')?.value || 0);
                const minute = parseInt(parts.find(p => p.type === 'minute')?.value || 0);
                return { hour, minute };
            } catch (e) {
                return { hour: hours, minute: minutes };
            }
        };

        // Helper to format time in 12-hour format
        const formatTime12Hour = (hour, minute) => {
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;
        };

        const startedLateList = lateQuery.rows
            .filter(r => {
                const date = new Date(r.start_time);
                // Get session start time in the selected timezone
                const { hour, minute } = getTimePartsInTimezone(date, timezone);
                const sessionMinutes = hour * 60 + minute;

                // Convert shift_start from UTC to selected timezone
                const shiftInTz = convertShiftTimeToTimezone(r.shift_start, timezone);
                const targetMinutes = shiftInTz.hour * 60 + shiftInTz.minute;

                return sessionMinutes > targetMinutes;
            })
            .map(r => {
                const date = new Date(r.start_time);
                // Get session start time in the selected timezone
                const { hour, minute } = getTimePartsInTimezone(date, timezone);
                const sessionMinutes = hour * 60 + minute;

                // Convert shift_start from UTC to selected timezone
                const shiftInTz = convertShiftTimeToTimezone(r.shift_start, timezone);
                const targetMinutes = shiftInTz.hour * 60 + shiftInTz.minute;
                const diff = sessionMinutes - targetMinutes;

                let delayStr;
                if (diff >= 60) {
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    delayStr = `${h}h ${m}m late`;
                } else {
                    delayStr = `${diff}m late`;
                }

                // Format started time using dynamic timezone
                const startedTimeStr = formatTimeInTimezone(date, timezone);

                // Format scheduled time (shift_start converted to selected timezone)
                const scheduledStr = formatTime12Hour(shiftInTz.hour, shiftInTz.minute);

                return {
                    name: r.name,
                    scheduled: scheduledStr,
                    started: startedTimeStr,
                    delay: delayStr,
                    dateLabel: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: timezone })
                };
            });

        // Not Started
        // Filter not started against the shift filtered total user list
        // Also apply user filter if a specific user is selected
        let allUsersQuery = `SELECT u.id, u.name FROM users u WHERE u.active = true ${companyFilter}`;
        if (user && user !== 'all' && user !== '') {
            // If a specific user is selected, only check that user
            allUsersQuery = `SELECT u.id, u.name FROM users u WHERE u.id = ${parseInt(user)} AND u.active = true ${companyFilter}`;
        } else if (shift && shift !== 'All') {
            const [start, end] = shift.split('-');
            allUsersQuery = `
                 SELECT u.id, u.name FROM users u 
                 JOIN user_shifts us ON u.id = us.user_id
                 WHERE us.shift_start::text = '${start}' AND us.shift_end::text = '${end}'
                 AND u.active = true ${companyFilter}
             `;
        }

        // This await is tricky inside sync block if not careful, but we are in async fx
        const allUsers = await query(allUsersQuery);

        const activeUserIdsInPeriod = (await query(`SELECT DISTINCT user_id FROM stealth_sessions ss WHERE ${dateFilter} ${shiftFilter} ${userFilter}`)).rows.map(r => r.user_id);
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
        let usageCompanyClause = '';
        if (companies && companies !== 'All' && companies !== '') {
            const companiesList = companies.split(',').map(c => `'${c.trim().replace(/'/g, "''")}'`).join(',');
            usageCompanyClause = `AND sub.user_session_id IN (SELECT ss2.id FROM stealth_sessions ss2 JOIN users u2 ON ss2.user_id = u2.id WHERE u2.company = ANY(ARRAY[${companiesList}]))`;
        }

        const usageQuery = await query(`
            SELECT 
                domain_or_app as name, 
                category, 
                SUM(total_time) as time,
                (SUM(total_time) / NULLIF((SELECT SUM(total_time) FROM session_usage_breakdown sub WHERE ${dateFilter.replace(/ss\./g, 'sub.')} ${usageShiftClause} ${usageUserClause} ${usageCompanyClause}), 0) * 100) as percent
            FROM session_usage_breakdown sub
            WHERE ${dateFilter.replace(/ss\./g, 'sub.')} ${usageShiftClause} ${usageUserClause} ${usageCompanyClause}
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
            WHERE ${dateFilter} ${shiftFilter} ${userFilter} ${companyFilter}
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
                daily: rawTrends.map(d => ({ value: Number(d.tracked), date: d.label })),
                productive: rawTrends.map(d => ({ value: Number(d.productive), date: d.label })),
                idle: rawTrends.map(d => ({ value: Number(d.idle), date: d.label })),
                break: rawTrends.map(d => ({ value: Number(d.break) || 0, date: d.label }))
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

// User Activity Timeline API
app.get('/api/user-timeline', async (req, res) => {
    const { user, range = 'daily', timezone = 'UTC', companies } = req.query;

    if (!user || user === 'all' || user === '') {
        return res.json({ sessions: [], summary: null });
    }

    const dateFilter = getDateFilter(range, 'ss.created_at::date');

    // Timezone-aware time formatting helper
    const formatTimeInTimezone = (date, tz) => {
        try {
            return new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: tz
            }).format(date);
        } catch (e) {
            // Fallback for invalid timezone
            const h = date.getUTCHours();
            const m = date.getUTCMinutes();
            const ampm = h >= 12 ? 'PM' : 'AM';
            const hour12 = h % 12 || 12;
            return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
        }
    };

    // Get hour in timezone (for timeline bar positioning)
    const getHourInTimezone = (date, tz) => {
        try {
            const parts = new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: false,
                timeZone: tz
            }).formatToParts(date);
            const hour = parseInt(parts.find(p => p.type === 'hour')?.value || 0);
            const minute = parseInt(parts.find(p => p.type === 'minute')?.value || 0);
            return hour + minute / 60;
        } catch (e) {
            return date.getUTCHours() + date.getUTCMinutes() / 60;
        }
    };

    try {
        const companyFilter = getCompanyFilter(companies, 'u');
        // Get user info
        const userResult = await query(`SELECT id, name FROM users u WHERE u.id = $1 ${companyFilter}`, [parseInt(user)]);
        if (userResult.rows.length === 0) {
            return res.json({ sessions: [], summary: null, userName: 'Unknown' });
        }
        const userName = userResult.rows[0].name;

        // Get sessions grouped by date with full session details
        const sessionsResult = await query(`
            SELECT 
                ss.id,
                ss.created_at::date as session_date,
                ss.created_at as start_time,
                ss.last_updated as end_time,
                ss.total_time,
                ss.productive_time,
                ss.idle_time,
                ss.break_time,
                ss.wasted_time,
                ss.neutral_time
            FROM stealth_sessions ss
            WHERE ss.user_id = $1 AND ${dateFilter}
            ORDER BY ss.created_at DESC
        `, [parseInt(user)]);

        // Get session usage breakdown for detailed app/site data
        const sessionIds = sessionsResult.rows.map(s => s.id);
        let usageBreakdown = [];

        if (sessionIds.length > 0) {
            const breakdownResult = await query(`
                SELECT 
                    sub.user_session_id as session_id,
                    sub.category,
                    sub.domain_or_app,
                    sub.total_time,
                    sv.start_time as visit_start,
                    sv.end_time as visit_end
                FROM session_usage_breakdown sub
                LEFT JOIN session_visits sv ON sv.usage_breakdown_id = sub.id
                WHERE sub.user_session_id = ANY($1)
                ORDER BY sub.total_time DESC
            `, [sessionIds]);
            usageBreakdown = breakdownResult.rows;
        }

        // Group sessions by date
        const sessionsByDate = {};
        let totalActiveTime = 0;
        let totalIdleTime = 0;
        let totalSessions = 0;

        // Format time helper - now uses timezone
        const formatTime = (date) => formatTimeInTimezone(new Date(date), timezone);

        sessionsResult.rows.forEach(session => {
            const dateKey = new Date(session.session_date).toISOString().split('T')[0];
            if (!sessionsByDate[dateKey]) {
                sessionsByDate[dateKey] = {
                    date: dateKey,
                    displayDate: new Date(session.session_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    }),
                    sessions: [],
                    totalTime: 0,
                    activeTime: 0,
                    idleTime: 0,
                    productiveTime: 0,
                    unproductiveTime: 0,
                    neutralTime: 0,
                    breakdown: []
                };
            }

            // Use actual timestamps for timezone conversion
            const startDate = new Date(session.start_time);
            const endDate = new Date(session.end_time);

            // Get breakdown for this session
            const sessionBreakdown = usageBreakdown
                .filter(b => b.session_id === session.id)
                .reduce((acc, item) => {
                    if (!acc[item.category]) {
                        acc[item.category] = [];
                    }
                    // Check if app already exists
                    const existing = acc[item.category].find(a => a.name === item.domain_or_app);
                    if (existing) {
                        existing.time += Number(item.total_time) || 0;
                        if (item.visit_start && item.visit_end) {
                            existing.visits.push({ start: item.visit_start, end: item.visit_end });
                        }
                    } else {
                        acc[item.category].push({
                            name: item.domain_or_app,
                            time: Number(item.total_time) || 0,
                            visits: item.visit_start && item.visit_end ? [{ start: item.visit_start, end: item.visit_end }] : []
                        });
                    }
                    return acc;
                }, {});

            // Get all active visits for this session (non-idle) and merge into periods
            const activeVisits = usageBreakdown
                .filter(b => b.session_id === session.id && b.category !== 'idle' && b.visit_start && b.visit_end)
                .map(b => ({ start: new Date(b.visit_start), end: new Date(b.visit_end) }))
                .sort((a, b) => a.start - b.start);

            // Merge overlapping/adjacent visits into contiguous active periods
            const activePeriods = [];
            activeVisits.forEach(visit => {
                if (activePeriods.length === 0) {
                    activePeriods.push({ start: visit.start, end: visit.end });
                } else {
                    const lastPeriod = activePeriods[activePeriods.length - 1];
                    // If visit overlaps or is adjacent (within 5 minutes), extend the period
                    if (visit.start <= new Date(lastPeriod.end.getTime() + 5 * 60 * 1000)) {
                        lastPeriod.end = new Date(Math.max(lastPeriod.end.getTime(), visit.end.getTime()));
                    } else {
                        activePeriods.push({ start: visit.start, end: visit.end });
                    }
                }
            });

            // Format active periods for display - now timezone-aware
            const formattedActivePeriods = activePeriods.map(p => ({
                startTime: formatTimeInTimezone(p.start, timezone),
                endTime: formatTimeInTimezone(p.end, timezone),
                startHour: getHourInTimezone(p.start, timezone),
                endHour: getHourInTimezone(p.end, timezone),
                duration: Math.round((p.end - p.start) / 1000) // in seconds
            }));

            // If no visit data, fallback to session start/end as single period
            const sessionActivePeriods = formattedActivePeriods.length > 0
                ? formattedActivePeriods
                : [{
                    startTime: formatTimeInTimezone(startDate, timezone),
                    endTime: formatTimeInTimezone(endDate, timezone),
                    startHour: getHourInTimezone(startDate, timezone),
                    endHour: getHourInTimezone(endDate, timezone),
                    duration: (Number(session.total_time) || 0) - (Number(session.idle_time) || 0) - (Number(session.break_time) || 0)
                }];

            sessionsByDate[dateKey].sessions.push({
                id: session.id,
                startTime: formatTimeInTimezone(startDate, timezone),
                endTime: formatTimeInTimezone(endDate, timezone),
                startHour: getHourInTimezone(startDate, timezone),
                endHour: getHourInTimezone(endDate, timezone),
                duration: Number(session.total_time) || 0,
                activeTime: (Number(session.total_time) || 0) - (Number(session.idle_time) || 0) - (Number(session.break_time) || 0),
                idleTime: Number(session.idle_time) || 0,
                breakTime: Number(session.break_time) || 0,
                productiveTime: Number(session.productive_time) || 0,
                unproductiveTime: Number(session.wasted_time) || 0,
                neutralTime: Number(session.neutral_time) || 0,
                breakdown: sessionBreakdown,
                activePeriods: sessionActivePeriods
            });

            sessionsByDate[dateKey].totalTime += Number(session.total_time) || 0;
            sessionsByDate[dateKey].activeTime += (Number(session.total_time) || 0) - (Number(session.idle_time) || 0) - (Number(session.break_time) || 0);
            sessionsByDate[dateKey].idleTime += Number(session.idle_time) || 0;
            sessionsByDate[dateKey].productiveTime += Number(session.productive_time) || 0;
            sessionsByDate[dateKey].unproductiveTime += Number(session.wasted_time) || 0;
            sessionsByDate[dateKey].neutralTime += Number(session.neutral_time) || 0;

            totalActiveTime += (Number(session.total_time) || 0) - (Number(session.idle_time) || 0) - (Number(session.break_time) || 0);
            totalIdleTime += Number(session.idle_time) || 0;
            totalSessions++;
        });

        // Convert to array and calculate work period range from all active periods
        const sessionsArray = Object.values(sessionsByDate).map(day => {
            const allSessions = day.sessions;

            // Collect all active period times to find the true work period
            const allActivePeriods = allSessions.flatMap(s => s.activePeriods || []);

            // Parse time string to comparable value
            const parseTimeToMinutes = (timeStr) => {
                const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
                if (!match) return 0;
                let hour = parseInt(match[1]);
                const min = parseInt(match[2]);
                const ampm = match[3].toUpperCase();
                if (ampm === 'PM' && hour !== 12) hour += 12;
                if (ampm === 'AM' && hour === 12) hour = 0;
                return hour * 60 + min;
            };

            let workPeriodStart = '';
            let workPeriodEnd = '';

            if (allActivePeriods.length > 0) {
                // Find earliest start and latest end from all active periods
                let earliestStart = Infinity;
                let latestEnd = 0;
                let earliestStartStr = '';
                let latestEndStr = '';

                allActivePeriods.forEach(period => {
                    const startMins = parseTimeToMinutes(period.startTime);
                    const endMins = parseTimeToMinutes(period.endTime);

                    if (startMins < earliestStart) {
                        earliestStart = startMins;
                        earliestStartStr = period.startTime;
                    }
                    if (endMins > latestEnd) {
                        latestEnd = endMins;
                        latestEndStr = period.endTime;
                    }
                });

                workPeriodStart = earliestStartStr;
                workPeriodEnd = latestEndStr;
            } else {
                // Fallback to session times if no active periods
                workPeriodStart = allSessions.length > 0 ? allSessions[allSessions.length - 1].startTime : '';
                workPeriodEnd = allSessions.length > 0 ? allSessions[0].endTime : '';
            }

            return {
                ...day,
                sessionCount: allSessions.length,
                workPeriod: allSessions.length > 0 ? `${workPeriodStart} - ${workPeriodEnd}` : 'N/A'
            };
        });

        // Format duration helper
        const formatDuration = (seconds) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            return `${h}h ${m}m`;
        };

        res.json({
            userName,
            sessions: sessionsArray,
            summary: {
                activeTime: formatDuration(totalActiveTime),
                activeTimeSeconds: totalActiveTime,
                idleTime: formatDuration(totalIdleTime),
                idleTimeSeconds: totalIdleTime,
                totalSessions
            }
        });

    } catch (e) {
        console.error("User Timeline Error:", e);
        res.status(500).json({ error: "Failed to fetch user timeline" });
    }
});

// Start the server if running directly (local dev)
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

export default app;
