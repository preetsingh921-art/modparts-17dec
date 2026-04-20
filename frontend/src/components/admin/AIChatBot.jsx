import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/config';

const PREDEFINED_PROMPTS = [
    { label: "Show all users", query: "Show me all users" },
    { label: "Pending Orders", query: "Find pending orders" },
    { label: "Low Stock Items", query: "Show low stock products" },
    { label: "Today's Revenue", query: "What is today's total revenue?" },
];

const AIChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState('gemini');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Initialize initial message only when opened
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{ role: 'ai', content: 'Hi there! I am your Admin Assistant. How can I help you today?' }]);
            
            // Optionally, pre-fetch quick stats here in the future
        }
    }, [isOpen, messages.length]);

    // Keyboard shortcut Cmd+K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 100);
        }
    }, [isOpen]);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSpeechRecognition = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Your browser does not support voice input. Please use Chrome or Edge.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            // Optionally auto-submit
            // submitQuery(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const submitQuery = async (userText) => {
        if (!userText.trim() || isLoading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userText }]);
        setIsLoading(true);

        try {
            const response = await api.post('/ai/query', { prompt: userText, provider: selectedProvider });
            const data = response.data.data;

            setMessages(prev => [...prev, { role: 'ai', content: data.responseText }]);

            // If the AI determined a navigation intent, execute it
            if (data.actionType === 'navigate' && data.targetPage) {
                const queryParams = new URLSearchParams();
                if (data.filters) {
                    Object.entries(data.filters).forEach(([key, value]) => {
                        if (value) queryParams.append(key, value);
                    });
                }
                
                const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
                const path = `/admin/${data.targetPage}${queryString}`;
                
                setMessages(prev => [...prev, { 
                    role: 'system', 
                    content: `Navigating to ${data.targetPage} with filters...`,
                    action: path
                }]);

                setTimeout(() => navigate(path), 1500);
            }

        } catch (error) {
            console.error('AI Chat Error:', error);
            setMessages(prev => [...prev, { 
                role: 'ai', 
                content: error.response?.data?.message || 'Sorry, I encountered an error. Please make sure the API key is configured.' 
            }]);
        } finally {
            setIsLoading(false);
            if (inputRef.current) inputRef.current.focus();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        submitQuery(input);
    };

    return (
        <>
            {/* Floating Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${
                    isOpen ? 'bg-[#242424] border border-[#333] text-gray-400 opacity-0 pointer-events-none' : 'bg-[#8B2332] text-white shadow-[#8B2332]/30'
                }`}
                title="AI Assistant (Cmd+K)"
            >
                <span className="text-3xl">✨</span>
            </button>

            {/* Command Palette Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div 
                        className="w-full max-w-2xl bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()} // Prevent clicks inside from closing
                    >
                        {/* Header */}
                        <div className="bg-[#1a1a1a] border-b border-[#333] px-5 py-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl text-[#8B2332]">✨</span>
                                <h3 className="font-semibold text-lg text-[#F5F0E1]" style={{ fontFamily: "'Oswald', sans-serif" }}>AI Assistant Palette</h3>
                                <span className="text-[#666] text-xs px-2 py-0.5 rounded border border-[#333] bg-[#242424] hidden sm:inline-block">Cmd+K</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <select 
                                    value={selectedProvider}
                                    onChange={(e) => setSelectedProvider(e.target.value)}
                                    className="bg-[#2a2a2a] text-[#F5F0E1] border border-[#444] text-xs rounded-md px-2 py-1 focus:outline-none focus:border-[#8B2332]"
                                >
                                    <option value="gemini">Google Gemini</option>
                                    <option value="groq">Llama 3 (Groq)</option>
                                </select>
                                <button onClick={() => setIsOpen(false)} className="text-[#666] hover:text-white transition-colors ml-2">
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 p-5 overflow-y-auto" style={{ minHeight: '350px', maxHeight: '50vh' }}>
                            <div className="flex flex-col gap-4">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'system' ? (
                                            <div className="w-full text-center mt-2 mb-1">
                                                <button 
                                                    className="text-xs bg-[#242424] border border-[#8B2332] text-[#A8A090] px-4 py-1.5 rounded-full hover:bg-[#8B2332] hover:text-white transition-colors"
                                                    onClick={() => navigate(msg.action)}
                                                >
                                                    {msg.content} ↗
                                                </button>
                                            </div>
                                        ) : (
                                            <div className={`group relative max-w-[85%] rounded-2xl px-5 py-3 text-[15px] leading-relaxed shadow-sm ${
                                                msg.role === 'user' 
                                                    ? 'bg-[#8B2332] text-white rounded-br-sm' 
                                                    : 'bg-[#2a2a2a] border border-[#333] text-[#F5F0E1] rounded-bl-sm'
                                            }`}>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                                
                                                {/* Copy Button for AI Messages */}
                                                {msg.role === 'ai' && (
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(msg.content);
                                                            // Could add a tiny visual feedback here if desired
                                                        }}
                                                        className="absolute top-2 -right-8 p-1.5 text-[#666] hover:text-[#F5F0E1] opacity-0 group-hover:opacity-100 transition-opacity bg-[#2a2a2a] border border-[#333] rounded-md shadow-sm"
                                                        title="Copy response"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-[#2a2a2a] border border-[#333] rounded-2xl rounded-bl-sm px-6 py-4 flex gap-1.5">
                                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2.5 h-2.5 bg-[#8B2332] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="border-t border-[#333] bg-[#1a1a1a] p-4">
                            {/* Pellets */}
                            <div className="flex flex-wrap gap-2 mb-3 px-1">
                                {PREDEFINED_PROMPTS.map((prompt, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => submitQuery(prompt.query)}
                                        disabled={isLoading}
                                        className="text-xs bg-[#242424] hover:bg-[#333] text-[#A8A090] hover:text-white border border-[#444] px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                                    >
                                        {prompt.label}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleSubmit} className="flex gap-2 relative">
                                <button
                                    type="button"
                                    onClick={handleSpeechRecognition}
                                    className={`absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${
                                        isListening ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-[#666] hover:text-white'
                                    }`}
                                    title="Speak your query"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={isListening ? "Listening..." : "Ask AI to filter, find, or analyze data..."}
                                    className="w-full bg-[#0a0a0a] text-white border border-[#444] rounded-lg pl-12 pr-12 py-3 focus:outline-none focus:border-[#8B2332] text-[15px] shadow-inner"
                                    disabled={isLoading}
                                    autoComplete="off"
                                />
                                <button 
                                    type="submit" 
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-blue-500 hover:text-blue-400 disabled:text-gray-600 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-90" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AIChatBot;
