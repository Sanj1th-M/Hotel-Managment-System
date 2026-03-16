/**
 * Receipt Controller — generates PDF receipts for bookings.
 * Only the booking owner (or admin/staff) can download a receipt.
 */
const PDFDocument = require('pdfkit');
const BookingModel = require('../models/Booking');
const logger = require('../utils/logger');

// ─── GET /api/bookings/:id/receipt ────────────────────────────────────────────
const downloadReceipt = async (req, res, next) => {
    try {
        const bookingId = parseInt(req.params.id, 10);
        if (isNaN(bookingId)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const booking = await BookingModel.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        // Authorization: only the booking owner, staff, or admin can download
        const isOwner = booking.createdBy && booking.createdBy.id === req.user.id;
        const isStaffOrAdmin = ['admin', 'staff'].includes(req.user.role);

        if (!isOwner && !isStaffOrAdmin) {
            return res.status(403).json({ success: false, message: 'You are not authorized to download this receipt.' });
        }

        // Generate PDF
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        // Set response headers for PDF download
        const filename = `receipt_booking_${bookingId}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        // ── Header ────────────────────────────────────────────────────────────
        doc.fontSize(24).font('Helvetica-Bold').text('Hotel Management System', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(14).font('Helvetica').fillColor('#666666').text('Booking Receipt', { align: 'center' });
        doc.moveDown(1);

        // Divider
        doc.strokeColor('#E5E7EB').lineWidth(1)
            .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);

        // ── Booking Details ───────────────────────────────────────────────────
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Booking Details');
        doc.moveDown(0.5);

        const details = [
            ['Booking ID', `#${booking.id}`],
            ['Status', booking.bookingStatus.toUpperCase()],
            ['Guest Name', booking.guestName],
            ['Guest Phone', booking.guestPhone],
            ['Guest Email', booking.guestEmail || 'N/A'],
            ['Check-in', new Date(booking.checkInDate).toLocaleDateString('en-IN', { dateStyle: 'long' })],
            ['Check-out', new Date(booking.checkOutDate).toLocaleDateString('en-IN', { dateStyle: 'long' })],
        ];

        doc.font('Helvetica').fontSize(10);
        for (const [label, value] of details) {
            doc.fillColor('#666666').text(label + ':', { continued: true, width: 150 });
            doc.fillColor('#000000').text('  ' + value);
            doc.moveDown(0.3);
        }

        doc.moveDown(0.5);

        // ── Room Details ──────────────────────────────────────────────────────
        if (booking.room) {
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Room Details');
            doc.moveDown(0.5);

            const roomDetails = [
                ['Room Number', `${booking.room.roomNumber}`],
                ['Room Type', booking.room.roomType],
                ['Floor', `${booking.room.floorNumber}`],
                ['Price/Night', `INR ${booking.room.pricePerNight.toFixed(2)}`],
            ];

            doc.font('Helvetica').fontSize(10);
            for (const [label, value] of roomDetails) {
                doc.fillColor('#666666').text(label + ':', { continued: true, width: 150 });
                doc.fillColor('#000000').text('  ' + value);
                doc.moveDown(0.3);
            }
        }

        doc.moveDown(0.5);

        // ── Payment Details ───────────────────────────────────────────────────
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Payment Details');
        doc.moveDown(0.5);

        doc.font('Helvetica').fontSize(10);

        const nights = Math.ceil(
            (new Date(booking.checkOutDate) - new Date(booking.checkInDate)) / (1000 * 60 * 60 * 24)
        );

        const paymentDetails = [
            ['Number of Nights', `${nights}`],
            ['Total Amount', `INR ${booking.totalPrice.toFixed(2)}`],
            ['Payment Status', 'N/A'],
        ];

        for (const [label, value] of paymentDetails) {
            doc.fillColor('#666666').text(label + ':', { continued: true, width: 150 });
            doc.fillColor('#000000').text('  ' + value);
            doc.moveDown(0.3);
        }

        doc.moveDown(1.5);

        // Divider
        doc.strokeColor('#E5E7EB').lineWidth(1)
            .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);

        // ── Total ─────────────────────────────────────────────────────────────
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000')
            .text(`Total: INR ${booking.totalPrice.toFixed(2)}`, { align: 'right' });

        doc.moveDown(2);

        // ── Footer ────────────────────────────────────────────────────────────
        doc.fontSize(8).font('Helvetica').fillColor('#999999')
            .text(`Generated on ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
        doc.text('This is a computer-generated receipt.', { align: 'center' });

        doc.end();

        logger.info({ userId: req.user.id, bookingId }, 'Receipt downloaded');
    } catch (error) {
        next(error);
    }
};

module.exports = { downloadReceipt };
