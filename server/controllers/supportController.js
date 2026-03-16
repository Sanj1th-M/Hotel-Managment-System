const pool = require('../config/db');

const getRecentSupportTickets = async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit ?? '50', 10) || 50, 200);
        const status = req.query.status ? String(req.query.status) : null;

        const whereClause = status ? 'WHERE st.status = $2' : '';
        const params = status ? [limit, status] : [limit];

        const [ticketResult, openCountResult] = await Promise.all([
            pool.query(
                `
                SELECT
                    st.id,
                    st.message,
                    st.status,
                    st.created_at,
                    u.id AS user_id,
                    u.username,
                    u.email,
                    u.phone
                FROM support_tickets st
                JOIN users u ON u.id = st.user_id
                ${whereClause}
                ORDER BY st.created_at DESC
                LIMIT $1
            `,
                params
            ),
            pool.query('SELECT COUNT(*) FROM support_tickets WHERE status = $1', ['open']),
        ])

        res.status(200).json({
            success: true,
            data: {
                tickets: ticketResult.rows.map((row) => ({
                    id: row.id,
                    message: row.message,
                    status: row.status,
                    createdAt: row.created_at,
                    guest: {
                        id: row.user_id,
                        username: row.username,
                        email: row.email,
                        phone: row.phone,
                    },
                })),
                openCount: parseInt(openCountResult.rows[0]?.count ?? '0', 10),
            },
        })
    } catch (error) {
        next(error)
    }
}

module.exports = { getRecentSupportTickets }
