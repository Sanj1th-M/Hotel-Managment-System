import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { chatbotApi } from '../services/chatApi';

const SPLINE_SCRIPT_SRC = 'https://unpkg.com/@splinetool/viewer@1.12.69/build/spline-viewer.js';
const SPLINE_SCENE_URL = 'https://prod.spline.design/tno19tUqOeDSCuvU/scene.splinecode';

const RobotChatButton = ({ onClick }) => {
    useEffect(() => {
        if (document.querySelector('script[data-spline-viewer-script]')) {
            return;
        }

        const script = document.createElement('script');
        script.src = SPLINE_SCRIPT_SRC;
        script.type = 'module';
        script.dataset.splineViewerScript = 'true';
        document.head.appendChild(script);
    }, []);

    return (
        <div className='robot-chat-toggle'>
            <button
                type='button'
                onClick={onClick}
                aria-label='Open Support Chat'
                className='robot-button'
            >
                <div className='robot-spline-frame'>
                    <spline-viewer
                        url={SPLINE_SCENE_URL}
                        className='robot-spline'
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            </button>
        </div>
    );
};

const UserSupportChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Fetch message history when chat is opened
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            loadHistory();
        }
    }, [isOpen]);

    // Scroll to bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await chatbotApi.getHistory();
            if (data.success && data.data.length > 0) {
                setMessages(data.data);
            } else {
                // Default welcome message
                setMessages([
                    {
                        id: 'welcome',
                        sender: 'bot',
                        message: 'Hello! How can I help you today? You can ask me about check-in times, room availability, prices, or hotel amenities.',
                        timestamp: new Date().toISOString()
                    }
                ]);
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
            setMessages([
                {
                    id: 'error-load',
                    sender: 'bot',
                    message: 'Welcome to the support chat. How can I assist you?',
                    timestamp: new Date().toISOString()
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e?.preventDefault();

        if (!inputMessage.trim()) return;

        const userMsgText = inputMessage.trim();
        const optimisticUserMessage = {
            id: Date.now().toString(),
            sender: 'user',
            message: userMsgText,
            timestamp: new Date().toISOString()
        };

        setMessages((prev) => [...prev, optimisticUserMessage]);
        setInputMessage('');
        setLoading(true);

        try {
            const botResponse = await chatbotApi.sendMessage(userMsgText);
            if (botResponse.success) {
                setMessages((prev) => [...prev, {
                    id: botResponse.reply.id || Date.now().toString(),
                    sender: 'bot',
                    message: botResponse.reply.message || botResponse.reply,
                    timestamp: botResponse.reply.created_at || new Date().toISOString()
                }]);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages((prev) => [...prev, {
                id: Date.now().toString(),
                sender: 'bot',
                message: 'Sorry, I am having trouble connecting right now. Please try again later.',
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTicket = async () => {
        const supportTicketCommand = 'create_support_ticket';
        setLoading(true);

        try {
            const botResponse = await chatbotApi.sendMessage(supportTicketCommand);
            if (botResponse.success) {
                setMessages((prev) => [...prev, {
                    id: Date.now().toString(),
                    sender: 'bot',
                    message: botResponse.reply.message,
                    timestamp: new Date().toISOString()
                }]);
            }
        } catch (error) {
            console.error('Failed to create ticket:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return <RobotChatButton onClick={() => setIsOpen(true)} />;
    }



    return (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden transform transition-all duration-300 ease-in-out">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center rounded-t-2xl">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <MessageCircle size={20} />
                        Hotel Support
                    </h3>
                    <p className="text-blue-100 text-xs mt-0.5">Ask me anything</p>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-blue-100 hover:text-white hover:bg-blue-500 p-1.5 rounded-full transition-colors focus:outline-none"
                    aria-label="Close Chat"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-4 min-h-0 max-h-[24rem]">
                {messages.map((msg, index) => {
                    const isUser = msg.sender === 'user';
                    const showSupportButton = msg.sender === 'bot' && msg.message.includes('contact support');

                    return (
                        <div key={msg.id || index} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                            <div
                                className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${isUser
                                        ? 'bg-blue-600 text-white rounded-tr-sm shadow-md'
                                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm shadow-sm'
                                    }`}
                                style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                            >
                                {msg.message}
                            </div>

                            {/* Render Create Ticket button if bot suggests support */}
                            {showSupportButton && (
                                <button
                                    onClick={handleCreateTicket}
                                    disabled={loading}
                                    className="mt-2 text-sm bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-gray-700 transition flex items-center gap-1 shadow-sm"
                                >
                                    Create Support Ticket
                                </button>
                            )}

                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-100 px-4 py-2 text-gray-400 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin" />
                            <span className="text-sm">Typing...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100">
                <div className="flex items-center gap-2 relative">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-gray-100 text-gray-800 text-sm rounded-full py-2.5 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all w-full border border-transparent"
                        disabled={loading}
                    />
                    <div className="absolute right-1 top-1 bottom-1">
                        <button
                            type="submit"
                            disabled={!inputMessage.trim() || loading}
                            className="bg-blue-600 text-white p-1.5 h-full aspect-square rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 focus:outline-none transition-colors shadow-sm"
                            aria-label="Send Message"
                        >
                            <Send size={16} className="ml-0.5" />
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default UserSupportChat;
