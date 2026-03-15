const chatbotService = require('../services/chatbotService');

// POST /api/chatbot/message
const processMessage = async (req, res, next) => {
    try {
        const { message } = req.body;
        const userId = req.user.id;

        if (!message || message.trim() === '') {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        // Special check for generating a support ticket
        if (message.toLowerCase() === 'create_support_ticket') {
            const ticketId = await chatbotService.createSupportTicket(userId);
            return res.status(200).json({ 
                success: true, 
                reply: { message: `Support ticket #${ticketId} created. Our team will contact you soon.` } 
            });
        }

        const botReply = await chatbotService.processMessage(userId, message.trim());

        res.status(200).json({ success: true, reply: botReply });
    } catch (error) {
        next(error);
    }
};

// GET /api/chatbot/history
const getHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const history = await chatbotService.getHistory(userId);
        res.status(200).json({ success: true, count: history.length, data: history });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    processMessage,
    getHistory
};
