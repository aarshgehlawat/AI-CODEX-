
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from '../types';

interface AssistantPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, image?: string) => void;
  onSpeak: (text: string) => void;
  isProcessing: boolean;
}

const AssistantPanel: React.FC<AssistantPanelProps> = ({ messages, onSendMessage, onSpeak, isProcessing }) => {
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      scrollRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  const handleSend = () => {
    if (!input.trim() && !image) return;
    onSendMessage(input, image || undefined);
    setInput('');
    setImage(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Neural Intelligence Core</h2>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white">
        {messages.map((msg) => (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className={`max-w-[85%] rounded-[1.8rem] p-6 shadow-sm border transition-all ${
              msg.role === 'user' 
                ? 'bg-blue-600 border-blue-500 text-white rounded-tr-none' 
                : 'bg-slate-100 border-slate-200 text-slate-700 rounded-tl-none'
            }`}>
              {msg.isThinking && msg.role === 'assistant' && (
                <div className="mb-3 px-3 py-1 bg-amber-200/50 text-amber-800 rounded-full text-[8px] font-black uppercase tracking-widest w-fit">
                  Processed with Deep Reasoning
                </div>
              )}
              {msg.image && (
                <div className="mb-4 rounded-2xl overflow-hidden border border-black/5">
                  <img src={msg.image} alt="User Attachment" className="w-full h-auto object-cover max-h-64" />
                </div>
              )}
              <p className="text-sm leading-[1.6] whitespace-pre-wrap font-medium">{msg.text || '...'}</p>
              
              {msg.groundingLinks && (
                <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingLinks.map((link, i) => (
                      <a 
                        key={i} 
                        href={link.uri} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`text-[9px] px-3 py-1 rounded-full border transition-all ${
                          msg.role === 'user' ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-slate-200 text-blue-600 hover:border-blue-400'
                        }`}
                      >
                        {link.title || 'Source'}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {msg.role === 'assistant' && msg.text && (
                <div className="mt-5 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                  <button 
                    onClick={() => onSpeak(msg.text)}
                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    </svg>
                    Synthesize
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isProcessing && (
          <div className="flex items-center gap-3 text-blue-500 bg-blue-50 py-2 px-4 rounded-full w-fit">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100">
        <AnimatePresence>
          {image && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 80, opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="relative w-20 h-20 group mb-4">
              <img src={image} className="w-full h-full object-cover rounded-xl border border-blue-500/30 shadow-sm" />
              <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex items-center gap-3">
          <button onClick={() => fileInputRef.current?.click()} className="p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 shadow-sm transition-all group">
            <svg className="group-hover:rotate-12 transition-transform" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Communicate with Neural Core..."
              className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 shadow-sm"
            />
            <button onClick={handleSend} disabled={isProcessing} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 disabled:opacity-30">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantPanel;
