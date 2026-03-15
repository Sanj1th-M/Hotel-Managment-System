const pool = require('../config/db');
const RoomModel = require('../models/Room');
const BookingModel = require('../models/Booking');

/**
 * GET /api/dashboard/stats
 * Returns aggregated statistics for the dashboard.
 */
const getDashboardStats = async (req, res, next) => {
    try {
        // Run all count queries concurrently
        const [
            totalRooms,
            maintenanceRooms,
            cleaningRooms,
            totalBookings,
            activeBookings,
            completedBookings,
            cancelledBookings,
            occupiedResult,
            recentResult,
        ] = await Promise.all([
            RoomModel.countByStatus(null),
            RoomModel.countByStatus('maintenance'),
            RoomModel.countByStatus('cleaning'),
            BookingModel.countByStatus(null),
            BookingModel.countByStatus('confirmed'),
            BookingModel.countByStatus('completed'),
            BookingModel.countByStatus('cancelled'),
            // Dynamic check: How many distinct rooms are occupied *today*?
            pool.query(`
                SELECT COUNT(DISTINCT room_id)
                FROM bookings
                WHERE booking_status = 'confirmed'
                  AND CURRENT_DATE >= check_in_date
                  AND CURRENT_DATE < check_out_date
            `),
            // Recent 5 confirmed bookings with room info (JOIN)
            pool.query(`
                SELECT
                    b.id,
                    b.guest_name,
                    b.check_in_date,
                    b.check_out_date,
                    b.booking_status,
                    b.total_price,
                    b.created_at,
                    r.room_number,
                    r.room_type
                FROM bookings b
                LEFT JOIN rooms r ON b.room_id = r.id
                WHERE b.booking_status = 'confirmed'
                ORDER BY b.created_at DESC
                LIMIT 5
            `),
        ]);

        const occupiedRooms = parseInt(occupiedResult.rows[0].count, 10);
        // Available rooms = Total Rooms - Maintenance - Cleaning - Occupied Today
        const availableRooms = totalRooms - maintenanceRooms - cleaningRooms - occupiedRooms;

        res.status(200).json({
            success: true,
            data: {
                rooms: {
                    total: totalRooms,
                    available: availableRooms >= 0 ? availableRooms : 0,
                    occupied: occupiedRooms,
                    maintenance: maintenanceRooms,
                    cleaning: cleaningRooms,
                },
                bookings: {
                    total: totalBookings,
                    active: activeBookings,
                    completed: completedBookings,
                    cancelled: cancelledBookings,
                },
                recentBookings: recentResult.rows.map((row) => ({
                    id: row.id,
                    guestName: row.guest_name,
                    checkInDate: row.check_in_date,
                    checkOutDate: row.check_out_date,
                    bookingStatus: row.booking_status,
                    totalPrice: parseFloat(row.total_price),
                    createdAt: row.created_at,
                    room: {
                        roomNumber: row.room_number,
                        roomType: row.room_type,
                    },
                })),
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getDashboardStats };
