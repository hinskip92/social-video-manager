import { useState, useEffect, useRef } from 'react';
import { PaperAirplaneIcon, XMarkIcon, SparklesIcon, UserIcon } from '@heroicons/react/24/solid';
import { VideoCameraIcon } from '@heroicons/react/24/outline';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface VideoChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoPath: string;
}

const VideoChatModal = ({ isOpen, onClose, videoPath }: VideoChatModalProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate a unique key for this video's chat history
  const getChatKey = (path: string) => `videoChat_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  // Load chat history when modal opens
  useEffect(() => {
    if (isOpen) {
      const chatKey = getChatKey(videoPath);
      const savedHistory = localStorage.getItem(chatKey);
      
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory);
          // Convert timestamp strings back to Date objects
          const messagesWithDates = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
        } catch (e) {
          console.error('Failed to load chat history:', e);
          setMessages([{
            sender: 'ai',
            text: "I've loaded the video. What would you like to know about it?",
            timestamp: new Date(),
          }]);
        }
      } else {
        setMessages([{
          sender: 'ai',
          text: "I've loaded the video. What would you like to know about it?",
          timestamp: new Date(),
        }]);
      }
      setPrompt('');
    }
  }, [isOpen, videoPath]);

  // Save chat history whenever messages change
  useEffect(() => {
    if (messages.length > 0 && videoPath) {
      const chatKey = getChatKey(videoPath);
      localStorage.setItem(chatKey, JSON.stringify(messages));
    }
  }, [messages, videoPath]);

  const handleSend = async () => {
    if (!prompt.trim() || isThinking) return;

    const userMessage: Message = { 
      sender: 'user', 
      text: prompt.trim(),
      timestamp: new Date()
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setPrompt('');
    setIsThinking(true);

    try {
      const response = await window.electronAPI.chatWithVideo({
        videoPath,
        question: prompt.trim(),
      });

      setMessages([...newMessages, { 
        sender: 'ai', 
        text: response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error chatting with video:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setMessages([
        ...newMessages,
        { 
          sender: 'ai', 
          text: `Sorry, something went wrong: ${errorMessage}`,
          timestamp: new Date()
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="glass bg-white/95 dark:bg-dark-900/95 rounded-2xl shadow-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-dark-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg">
              <VideoCameraIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">Video Chat Assistant</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Powered by Gemini 2.5 Pro</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="btn btn-icon btn-ghost hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-grow overflow-y-auto p-6">
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-3 animate-slide-up ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-shrink-0 ${msg.sender === 'user' ? 'order-2' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-soft ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white'
                      : 'bg-gradient-to-br from-accent-500 to-accent-600 text-white'
                  }`}>
                    {msg.sender === 'user' ? <UserIcon className="w-5 h-5" /> : <SparklesIcon className="w-5 h-5" />}
                  </div>
                </div>
                
                <div className={`flex-1 ${msg.sender === 'user' ? 'order-1' : ''}`}>
                  <div className={`inline-block px-5 py-3 rounded-2xl shadow-soft ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white ml-auto'
                      : 'bg-white dark:bg-dark-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-dark-700'
                  }`}>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.text}</p>
                  </div>
                  <p className={`text-xs text-gray-400 dark:text-gray-500 mt-1.5 ${
                    msg.sender === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {formatTimestamp(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            
            {isThinking && (
              <div className="flex gap-3 animate-slide-up">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-white shadow-soft">
                    <SparklesIcon className="w-5 h-5 animate-pulse" />
                  </div>
                </div>
                <div className="bg-white dark:bg-dark-800 border border-gray-100 dark:border-dark-700 rounded-2xl px-5 py-3 shadow-soft">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse animation-delay-100"></div>
                      <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse animation-delay-200"></div>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Analyzing video content...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200/50 dark:border-dark-700/50 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about the video..."
                  className="input w-full resize-none pr-12"
                  disabled={isThinking}
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '200px' }}
                />
                <div className="absolute right-2 bottom-2 text-xs text-gray-400 dark:text-gray-500">
                  <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-dark-700 rounded">⏎</kbd>
                </div>
              </div>
              <button
                onClick={handleSend}
                disabled={isThinking || !prompt.trim()}
                className="btn btn-primary btn-icon shadow-lg disabled:shadow-none"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
              Shift+Enter for new line • Your chat history is saved locally
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoChatModal; 