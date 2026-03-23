const pool = require('../config/db');

class ChatbotService {
    async processMessage(userId, message) {
        try {
            const lowerMessage = message.toLowerCase();
            let botReply = '';

            // Rule 1: Specific keyword matching
            if (lowerMessage.includes('price')) {
                const priceList = await pool.query('SELECT room_type, price_per_night FROM rooms GROUP BY room_type, price_per_night');
                if (priceList.rows.length > 0) {
                    botReply = 'Here is our general price list:\n' + priceList.rows.map(r => `- ${r.room_type}: ₹${r.price_per_night}`).join('\n');
                } else {
                    botReply = 'I couldn\'t fetch the price list right now.';
                }
            } else if (lowerMessage.includes('available rooms')) {
                // Return generic info or direct to booking
                const available = await pool.query('SELECT COUNT(*) FROM rooms WHERE status != $1', ['maintenance']);
                botReply = `We currently have ${available.rows[0].count} rooms available for booking. You can check specific dates in the booking section!`;
            } else if (lowerMessage.includes('cancel booking') || lowerMessage.includes('cancel my booking')) {
                botReply = 'To cancel a booking, please go to your "My Bookings" page and click cancel next to the active booking.';
            } else {
                // Fallback: search chat_faq table
                // Very basic search by trying to find a matching keyword
                const faqs = await pool.query('SELECT keywords, answer FROM chat_faq');
                let foundMatch = null;
                
                for (const row of faqs.rows) {
                    const keywords = row.keywords.split(',');
                    for (const kw of keywords) {
                        if (lowerMessage.includes(kw.trim().toLowerCase())) {
                            foundMatch = row.answer;
                            break;
                        }
                    }
                    if (foundMatch) break;
                }

                if (foundMatch) {
                    botReply = foundMatch;
                } else {
                    botReply = "I'm not sure about that. Would you like to contact support?";
                }
            }

            // Save user message to history
            await pool.query(
                'INSERT INTO chat_messages (user_id, sender, message) VALUES ($1, $2, $3)',
                [userId, 'user', message]
            );

            // Save bot reply to history
            const botMsg = await pool.query(
                'INSERT INTO chat_messages (user_id, sender, message) VALUES ($1, $2, $3) RETURNING id, user_id, sender, message, created_at',
                [userId, 'bot', botReply]
            );

            return botMsg.rows[0];
        } catch (error) {
            console.error('Error processing chatbot message:', error);
            throw new Error('Chatbot processing failed');
        }
    }

    async getHistory(userId, limit = 20) {
        const result = await pool.query(
            'SELECT id, sender, message, created_at AS timestamp FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC LIMIT $2',
            [userId, limit]
        );
        return result.rows;
    }

    async createSupportTicket(userId) {
        // Find last user message to use as the ticket subject
        const lastMsg = await pool.query(
            'SELECT message FROM chat_messages WHERE user_id = $1 AND sender = $2 ORDER BY created_at DESC LIMIT 1',
            [userId, 'user']
        );
        
        const message = lastMsg.rows.length > 0 ? lastMsg.rows[0].message : 'User requested support via chatbot.';

        const ticket = await pool.query(
            'INSERT INTO support_tickets (user_id, message, status) VALUES ($1, $2, $3) RETURNING id',
            [userId, message, 'open']
        );

        return ticket.rows[0].id;
    }
}

module.exports = new ChatbotService();
