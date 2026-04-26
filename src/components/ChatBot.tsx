import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Bot } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { getAIHelp } from '../services/aiService';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

interface Message {
  id?: string;
  sessionId: string;
  sender: 'user' | 'admin' | 'ai';
  text: string;
  timestamp: string;
}

export default function ChatBot({ sessionId, isAdmin = false }: { sessionId: string; isAdmin?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    const q = query(
      collection(db, 'messages'),
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'asc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages'));
    return unsub;
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setLoading(true);

    try {
      // 1. Add user message
      await addDoc(collection(db, 'messages'), {
        sessionId,
        sender: isAdmin ? 'admin' : 'user',
        text: userText,
        timestamp: new Date().toISOString(),
        isRead: false
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'messages'));

      // 2. If not admin, get AI response
      if (!isAdmin) {
        const aiResponse = await getAIHelp(userText, { sessionId });
        await addDoc(collection(db, 'messages'), {
          sessionId,
          sender: 'ai',
          text: aiResponse,
          timestamp: new Date().toISOString(),
          isRead: false
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'messages'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 border-4 border-slate-900 group"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageSquare size={24} />
            </motion.div>
          )}
        </AnimatePresence>
        <span className="absolute right-full mr-4 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-border-dark uppercase tracking-widest">
            AI Assistant
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] dark-card flex flex-col z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-border-dark flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand/20 rounded-lg flex items-center justify-center">
                  <Bot size={18} className="text-brand" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest">HS-AI Bot</h4>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sedia Membantu</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 technical-grid">
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-3">
                    <Bot size={40} className="mx-auto text-slate-700" />
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-10 leading-relaxed">
                        Sila taip sebarang soalan mengenai sambungan WiFi anda. 
                    </p>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id || m.timestamp} className={cn(
                  "flex flex-col max-w-[85%]",
                  m.sender === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}>
                  <div className={cn(
                    "p-3 rounded-2xl text-xs font-medium leading-relaxed",
                    m.sender === 'user' ? "bg-brand text-white rounded-tr-none" : 
                    m.sender === 'ai' ? "bg-slate-800 text-slate-300 border border-slate-700 rounded-tl-none" :
                    "bg-blue-900/40 text-blue-300 border border-blue-800 rounded-tl-none"
                  )}>
                    {m.text}
                  </div>
                  <span className="text-[9px] text-slate-600 mt-1 font-bold">
                    {m.sender.toUpperCase()} • {format(new Date(m.timestamp), 'HH:mm')}
                  </span>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 items-center text-slate-500 animate-pulse">
                   <div className="w-2 h-2 bg-brand rounded-full"></div>
                   <span className="text-[10px] font-bold uppercase tracking-widest">AI sedang menaip...</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-slate-900/50 border-t border-border-dark flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Tanya soalan..."
                className="flex-1 bg-bg-dark border border-border-dark rounded-xl px-4 py-2.5 text-xs text-text-dark focus:outline-none focus:border-brand transition-all"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || loading}
                className="w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
