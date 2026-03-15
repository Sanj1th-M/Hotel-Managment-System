import api from './api';

export const chatbotApi = {
    // Send a message to the chatbot
    sendMessage: async (message) => {
        try {
            const response = await api.post('/chatbot/message', { message });
            return response.data;
        } catch (error) {
            console.error('Error sending message to chatbot:', error);
            throw error;
        }
    },

    // Fetch message history on open
    getHistory: async () => {
        try {
            const response = await api.get('/chatbot/history');
            return response.data;
        } catch (error) {
            console.error('Error fetching chatbot history:', error);
            throw error;
        }
    }
};

export default chatbotApi;
