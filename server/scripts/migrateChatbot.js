require('dotenv').config();
const pool = require('../config/db');

const createChatbotTables = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Creating chat_faq table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS chat_faq (
                id SERIAL PRIMARY KEY,
                keywords VARCHAR(255) NOT NULL,
                answer TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Creating chat_messages table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                sender VARCHAR(10) CHECK (sender IN ('user', 'bot')) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Creating support_tickets table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS support_tickets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Inserting default FAQs...');
        const checkFaq = await client.query('SELECT COUNT(*) FROM chat_faq');
        if (parseInt(checkFaq.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO chat_faq (keywords, answer) VALUES 
                ('checkin,check-in,checkout,check-out,time', 'Check-in time is 12:00 PM and check-out is 11:00 AM.'),
                ('wifi,internet', 'Free high-speed WiFi is available in all rooms and public areas.'),
                ('breakfast,food,dining', 'Complimentary breakfast is served from 7:00 AM to 10:00 AM in the main dining hall. Room service is available 24/7.'),
                ('parking,car', 'We offer free valet parking for all our guests. Please provide your keys at the front desk upon arrival.'),
                ('pool,swimming', 'Our outdoor swimming pool is open from 6:00 AM to 10:00 PM daily. Please bring your room key for access.'),
                ('gym,fitness', 'Our 24-hour fitness center is located on the 2nd floor, accessible with your room key.'),
                ('cancel,cancellation,refund', 'Cancellations made 48 hours before check-in are fully refundable. Late cancellations may incur a fee equal to one night''s stay.'),
                ('pet,dog,cat', 'We are a pet-friendly hotel! A non-refundable fee of $50 per stay applies. Please let us know in advance.'),
                ('laundry,iron', 'We offer same-day laundry and dry-cleaning services. Iron and ironing board are provided in your room.'),
                ('contact,phone,email,reach', 'You can reach the front desk by dialing 0 on your room phone, or call us at +1-555-0198. For urgent queries, please create a support ticket in the chat.')
            `);
            console.log('Default FAQs inserted.');
        } else {
            console.log('FAQs already exist. Skipping insertion.');
        }

        await client.query('COMMIT');
        console.log('✅ Chatbot tables created successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating chatbot tables:', error);
    } finally {
        client.release();
        process.exit();
    }
};

createChatbotTables();
