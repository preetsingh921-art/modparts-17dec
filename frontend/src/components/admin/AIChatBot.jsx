import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/config';

const AIChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', content: 'Hi there! I am your Admin Assistant. How can I help you today? Try asking "Show me pending orders" or "Find brake parts."' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userText }]);
        setIsLoading(true);

        try {
            const response = await api.post('/ai/query', { prompt: userText });
            const data = response.data.data;

            setMessages(prev => [...prev, { role: 'ai', content: data.responseText }]);

            // If the AI determined a navigation intent, execute it
            if (data.actionType === 'navigate' && data.targetPage) {
                // Build the query string
                const queryParams = new URLSearchParams();
                if (data.filters) {
                    Object.entries(data.filters).forEach(([key, value]) => {
                        if (value) queryParams.append(key, value);
                    });
                }
                
                const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
                const path = `/admin/${data.targetPage}${queryString}`;
                
                // Add a small system message indicating action
                setMessages(prev => [...prev, { 
                    role: 'system', 
                    content: `Executing: Navigating to ${data.targetPage} with filters...`,
                    action: path
                }]);

                // Navigate and optionally close
                setTimeout(() => {
                    navigate(path);
                    // setIsOpen(false); // Can auto-close if preferred
                }, 1500);
            }

        } catch (error) {
            console.error('AI Chat Error:', error);
            setMessages(prev => [...prev, { 
                role: 'ai', 
                content: error.response?.data?.message || 'Sorry, I encountered an error connecting to the AI service. Please make sure the API key is configured.' 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl flex flex-col overflow-hidden transition-all duration-300">
                    {/* Header */}
                    <div className="bg-[#8B2332] text-[#F5F0E1] px-4 py-3 flex justify-between items-center cursor-pointer" onClick={() => setIsOpen(false)}>
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🤖</span>
                            <h3 className="font-semibold tracking-wide" style={{ fontFamily: "'Oswald', sans-serif" }}>AI Assistant</h3>
                        </div>
                        <button className="text-[#F5F0E1] hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 p-4 overflow-y-auto" style={{ minHeight: '300px', maxHeight: '400px' }}>
                        <div className="flex flex-col gap-3">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'system' ? (
                                        <div className="w-full text-center my-2">
                                            <span className="text-xs bg-[#242424] border border-[#8B2332] text-[#A8A090] px-3 py-1 rounded-full cursor-pointer hover:bg-[#8B2332] hover:text-white transition-colors"
                                                  onClick={() => navigate(msg.action)}>
                                                {msg.content}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                                            msg.role === 'user' 
                                                ? 'bg-blue-600 text-white rounded-tr-sm' 
                                                : 'bg-[#2a2a2a] border border-[#333] text-[#F5F0E1] rounded-tl-sm'
                                        }`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-[#2a2a2a] border border-[#333] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                                        <div className="w-2 h-2 bg-[#8B2332] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-[#8B2332] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-[#8B2332] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSubmit} className="border-t border-[#333] p-3 bg-[#1a1a1a]">
                        <div className="flex gap-2 relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask AI to filter or find..."
                                className="w-full bg-[#242424] text-white border border-[#444] rounded-full pl-4 pr-10 py-2 focus:outline-none focus:border-[#8B2332] text-sm"
                                disabled={isLoading}
                            />
                            <button 
                                type="submit" 
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-500 hover:text-blue-400 disabled:text-gray-600 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-90" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Floating Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${
                    isOpen ? 'bg-[#242424] border border-[#333] text-gray-400' : 'bg-[#8B2332] text-white shadow-[#8B2332]/30'
                }`}
                title="AI Assistant"
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                ) : (
                    <span className="text-3xl">✨</span>
                )}
            </button>
        </div>
    );
};

export default AIChatBot;
