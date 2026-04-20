import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, X, Bot, Plus, ChevronDown, Terminal, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { interactWithAIAssistant } from '../services/aiService';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { useLocation, useNavigate } from 'react-router-dom';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, updateSettings, addCustomSignal } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    const newMsg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await interactWithAIAssistant(settings, userMessage, { path: location.pathname });
      
      // Execute any commands the AI requested
      if (response.commands && Array.isArray(response.commands)) {
        for (const cmd of response.commands) {
          if (cmd.type === 'UPDATE_SETTINGS' && cmd.payload) {
            updateSettings(cmd.payload);
          } else if (cmd.type === 'ADD_SIGNAL' && cmd.payload) {
            const newSignal = {
              metadata: {
                id: `ai-gen-${Math.random().toString(36).substr(2, 9)}`,
                name: cmd.payload.metadata?.name || 'AI Discovered Signal',
                description: cmd.payload.metadata?.description || 'Signal retrieved by AI.',
                category: cmd.payload.metadata?.category || 'SETI Database',
                telescope: cmd.payload.metadata?.telescope || 'AI Archival Search',
                frequency: cmd.payload.metadata?.frequency || 'Variable',
                date: cmd.payload.metadata?.date || new Date().toISOString().split('T')[0],
                coordinates: cmd.payload.metadata?.coordinates || 'Unknown',
                aiReasoning: cmd.payload.metadata?.aiReasoning || response.message
              },
              data: cmd.payload.data || Array(2000).fill(0).map(() => Math.random() * 0.2)
            };
            addCustomSignal(newSignal as any);
          } else if (cmd.type === 'NAVIGATE' && cmd.payload.path) {
            navigate(cmd.payload.path);
          } else if (cmd.type === 'REPORT_ERROR') {
            setMessages(prev => [...prev, {
              id: Math.random().toString(36).substr(2, 9),
              role: 'system',
              content: `NEXUS_DIAGNOSTICS: ${cmd.payload.error}`,
              timestamp: new Date(),
              metadata: cmd.payload
            }]);
          }
        }
      }

      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      }]);

    } catch (error) {
       setMessages(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: "I encountered a communication error with the mainframe. Check console logs.",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: isOpen ? 0 : 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 p-4 rounded-full shadow-2xl z-40 transition-all text-white backdrop-blur-md",
          "bg-[#1e1f22]/80 border border-[#2a2b2f]/50 hover:bg-[#2a2b2f]"
        )}
      >
        <Sparkles className="w-6 h-6 text-[#a8c7fa]" />
      </motion.button>

      {/* Chat Window - Gemini Style */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95, pointerEvents: 'none' }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-0 sm:bottom-6 right-0 sm:right-6 w-full sm:w-[500px] h-[100dvh] sm:h-[800px] sm:max-h-[90vh] bg-[#131314] sm:border border-[#2a2b2f] sm:rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="flex flex-row items-center justify-between px-6 py-4 bg-[#131314] z-10 sticky top-0 border-b border-[#2a2b2f]">
              <div className="flex items-center gap-2">
                <span className="text-xl font-medium text-[#e3e3e3] flex items-center gap-2 tracking-tight">
                  Nexus AI <span className="text-[#a8c7fa] rounded text-[10px] px-2 py-0.5 bg-[#a8c7fa]/10 font-bold uppercase tracking-wider">Station Master</span>
                </span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setMessages([])} 
                  className="p-2 lg:hover:bg-[#1e1f22] rounded-full text-[#c4c7c5] transition-colors"
                  title="New Chat"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 lg:hover:bg-[#1e1f22] rounded-full text-[#c4c7c5] transition-colors"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-28 pt-4 scrollbar-thin scrollbar-thumb-[#2a2b2f] scrollbar-track-transparent">
              {messages.length === 0 && (
                <div className="flex flex-col justify-center h-full max-h-[500px] mt-10">
                  <h1 className="text-4xl sm:text-5xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#a8c7fa] via-[#d3e3fd] to-[#c4c7c5] mb-2 leading-tight">
                    Nexus Core Online
                  </h1>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-[#8e918f] mb-12">
                    Station mastery authorized. How shall we explore?
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-80">
                    <div className="p-4 rounded-2xl bg-[#1e1f22] border border-[#2a2b2f] text-[#e3e3e3] text-sm">
                      "Analyze the gr-01 signal and sonify it."
                    </div>
                    <div className="p-4 rounded-2xl bg-[#1e1f22] border border-[#2a2b2f] text-[#e3e3e3] text-sm">
                      "Take me to the Navigator and find SETI candidates."
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-8 pb-4">
                {messages.map((msg) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id} 
                    className="flex flex-col w-full"
                  >
                    {msg.role === 'user' ? (
                      <div className="self-end max-w-[85%] bg-[#1e1f22] rounded-3xl px-5 py-3.5 text-[#e3e3e3] shadow-sm whitespace-pre-wrap text-[15px] leading-relaxed border border-[#2a2b2f]">
                        {msg.content}
                      </div>
                    ) : msg.role === 'system' ? (
                      <div className="my-2 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-red-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Diagnostic Alert</span>
                        </div>
                        <div className="font-mono text-xs text-red-300">
                          {msg.content}
                        </div>
                        {msg.metadata?.context && (
                          <div className="mt-2 bg-black/40 rounded p-2 overflow-x-auto">
                            <pre className="text-[10px] text-red-200/50">
                              {JSON.stringify(msg.metadata.context, null, 2)}
                            </pre>
                          </div>
                        )}
                        <p className="text-[9px] text-[#8e918f] italic mt-1 font-sans">
                          * Reporting anomaly to development core...
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-4 w-full">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#2a2b2f]">
                            <Sparkles className="w-5 h-5 text-[#a8c7fa]" />
                          </div>
                        </div>
                        <div className="flex-1 text-[#e3e3e3] text-[15px] leading-relaxed overflow-hidden">
                          <div className="markdown-body prose prose-invert max-w-none text-[#e3e3e3] bg-transparent pb-2 font-sans align-top prose-p:my-2 prose-headings:text-[#e3e3e3] prose-headings:font-medium prose-a:text-[#a8c7fa] prose-code:bg-[#1e1f22] prose-code:text-[#e3e3e3] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#1e1f22] prose-pre:border prose-pre:border-[#2a2b2f] prose-li:my-0.5 prose-ul:my-2 prose-ol:my-2">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="flex gap-4 w-full"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center animate-pulse shadow-sm border border-[#2a2b2f]">
                        <Sparkles className="w-5 h-5 text-[#a8c7fa]" />
                      </div>
                    </div>
                    <div className="flex gap-1.5 items-center bg-[#1e1f22] px-4 py-2 rounded-full border border-[#2a2b2f]">
                      <div className="w-1.5 h-1.5 bg-[#a8c7fa] rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-[#a8c7fa] rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-[#a8c7fa] rounded-full animate-bounce" />
                    </div>
                  </motion.div>
                )}
              </div>
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Form Area */}
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#131314] via-[#131314] to-transparent pt-10 pb-4 px-4 sm:px-6">
              <form onSubmit={handleSubmit} className="relative flex items-end w-full bg-[#1e1f22] rounded-[32px] p-2 pr-3 shadow-[0_0_15px_rgba(0,0,0,0.2)] border border-[#2a2b2f]">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask Nexus anything..."
                  className="w-full bg-transparent border-none focus:ring-0 text-[#e3e3e3] text-[15px] placeholder-[#8e918f] pl-4 py-3 pb-3 h-12 outline-none resize-none"
                />
                <div className="flex items-center pb-1">
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isTyping}
                    className="p-2 rounded-full transition-colors flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent text-[#c4c7c5] hover:bg-[#2a2b2f]"
                  >
                    <Send className="w-5 h-5 fill-current" />
                  </button>
                </div>
              </form>
              <div className="mt-2 text-center text-[10px] text-[#8e918f] uppercase tracking-widest font-bold">
                  Nexus Protocol Active &bull; Station Mastery Enabled
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
