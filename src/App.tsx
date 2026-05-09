/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smile, 
  BookOpen, 
  Users, 
  CheckCircle, 
  User, 
  AlertTriangle, 
  Smartphone, 
  Phone,
  MoreHorizontal,
  Mic,
  MicOff,
  Send, 
  ArrowLeft,
  Loader2,
  Heart
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { COUNSELING_CATEGORIES, SYSTEM_PROMPT } from './constants';
import { cn } from './lib/utils';

// Icon Map for dynamic rendering
const IconMap: { [key: string]: any } = {
  Smile,
  BookOpen,
  Users,
  CheckCircle,
  User,
  AlertTriangle,
  Smartphone,
  Phone,
  MoreHorizontal
};

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function App() {
  const [screen, setScreen] = useState<'welcome' | 'chat'>('welcome');
  const [selectedCategory, setSelectedCategory] = useState<typeof COUNSELING_CATEGORIES[0] | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const baseTranscriptRef = useRef<string>('');
  const latestInputRef = useRef<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCategorySelect = (category: typeof COUNSELING_CATEGORIES[0]) => {
    if (category.id === 'help') {
      setShowHelpModal(true);
      return;
    }

    setSelectedCategory(category);
    setScreen('chat');
    baseTranscriptRef.current = '';
    
    // Initial greeting based on category
    let greeting = `${category.label}에 대해 고민이 있구나. 내가 들어줄게. 어떤 일이 있었는지 편하게 말해줘.`;
    
    if (category.id === 'etc') {
      greeting = "말하기 조금 어려운 다른 고민이 있구나. 괜찮아, 어떤 이야기든 들어줄 준비가 되어 있어. 편하게 시작해볼까?";
    }
    
    setMessages([{ role: 'model', content: greeting }]);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    latestInputRef.current = '';
    baseTranscriptRef.current = '';
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      // Filter out empty messages and prepare for Gemini
      const contents = messages
        .filter(m => m.content.trim() !== '')
        .map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

      // Ensure history starts with 'user'
      let validHistory = contents;
      if (validHistory.length > 0 && validHistory[0].role === 'model') {
        validHistory = validHistory.slice(1);
      }

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: [
          ...validHistory,
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT + `\n\n현재 상담 주제: ${selectedCategory?.label}\n상담 상황: ${selectedCategory?.description}`,
          temperature: 0.7,
        },
      });

      let fullText = '';
      setMessages(prev => [...prev, { role: 'model', content: '' }]);

      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullText += chunk.text;
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = fullText;
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', content: "미안해, 지금은 잠시 대화가 어려워. 잠시 후에 다시 시도해줄래?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    stopListening();
    setScreen('welcome');
    setMessages([]);
    setSelectedCategory(null);
    baseTranscriptRef.current = '';
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      return;
    }

    baseTranscriptRef.current = input; 
    startRecognition();
  };

  const startRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("이 브라우저는 음성 인식을 지원하지 않아요.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = true;
    recognition.continuous = false; // Using single-shot for better mobile compatibility

    const resetSilenceTimeout = () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(() => {
        stopListening();
      }, 5000); // 5 seconds of silence
    };

    recognition.onstart = () => {
      setIsListening(true);
      resetSilenceTimeout();
    };

    recognition.onresult = (event: any) => {
      resetSilenceTimeout();
      let sessionTranscript = '';
      
      // On some mobile browsers, event.results is not always cumulative as expected
      // Or it might contain old session results if not handled carefully.
      // We only use the current session's results.
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // If a result is final, we commit it to the base for the NEXT session
          // But for this session's UI, we show it along with base.
          baseTranscriptRef.current += transcript;
          sessionTranscript = ''; // Reset session part since it's now in base
        } else {
          sessionTranscript += transcript;
        }
      }
      
      const newVal = baseTranscriptRef.current + sessionTranscript;
      setInput(newVal);
      latestInputRef.current = newVal;
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        stopListening();
      }
    };

    recognition.onend = () => {
      // If we are still "listening" (timer active), restart for next phrase
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Recognition restart failed", e);
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    setIsListening(false);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-800 font-sans flex flex-col">
      {/* Sticky Header Section */}
      <header className="sticky top-0 z-50 w-full bg-[#F3F4F6]/80 backdrop-blur-md border-b border-slate-200/50 px-4 py-4 md:px-8 md:py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-indigo-900 flex items-center gap-2">
              마음코치 AI <span className="text-indigo-500 text-lg md:text-xl font-medium hidden md:inline">· 1319 청소년 상담</span>
            </h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1 italic">"너의 이야기를 들려줘, 언제나 네 편이 되어줄게."</p>
          </div>
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs md:text-sm font-semibold text-slate-700">실시간 상담 가능</span>
            {screen === 'chat' && (
              <button 
                onClick={handleBack}
                className="ml-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                id="back-button"
              >
                <ArrowLeft size={14} />
                처음으로
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 overflow-hidden p-4 md:p-8">
        <AnimatePresence mode="wait">
          {screen === 'welcome' ? (
            <motion.div 
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 grid grid-cols-12 gap-6 min-h-0"
            >
              {/* Problem Categories (Bento Grid) */}
              <div className="col-span-12 lg:col-span-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 auto-rows-fr">
                {/* Custom order for Bento Grid visuals */}
                {/* Big Card: Emotion */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCategorySelect(COUNSELING_CATEGORIES[0])}
                  className="col-span-2 row-span-2 bg-indigo-100 border-2 border-indigo-200 rounded-[2.5rem] p-8 flex flex-col justify-between hover:bg-indigo-200 cursor-pointer transition-all group shadow-sm"
                >
                  <div>
                    <div className="text-5xl mb-6 group-hover:scale-110 transition-transform origin-left">💙</div>
                    <h2 className="text-2xl font-bold text-indigo-900">{COUNSELING_CATEGORIES[0].label}</h2>
                    <p className="text-indigo-700 text-sm mt-3 opacity-80 leading-relaxed max-w-xs">{COUNSELING_CATEGORIES[0].description}</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-4">선택하기 →</span>
                </motion.div>

                {/* Other Cards */}
                {COUNSELING_CATEGORIES.slice(1).map((cat, idx) => {
                  const colors = {
                    school: "bg-emerald-100 border-emerald-200 text-emerald-900 sub:text-emerald-700 hover:bg-emerald-200",
                    relation: "bg-rose-100 border-rose-200 text-rose-900 sub:text-rose-700 hover:bg-rose-200",
                    habit: "bg-sky-100 border-sky-200 text-sky-900 sub:text-sky-700 hover:bg-sky-200",
                    identity: "bg-amber-100 border-amber-200 text-amber-900 sub:text-amber-700 hover:bg-amber-200",
                    crisis: "bg-red-500 border-red-600 text-white sub:text-white/90 hover:bg-red-600",
                    digital: "bg-violet-100 border-violet-200 text-violet-900 sub:text-violet-700 hover:bg-violet-200",
                    help: "bg-blue-100 border-blue-200 text-blue-900 sub:text-blue-700 hover:bg-blue-200",
                    etc: "bg-slate-200 border-slate-300 text-slate-900 sub:text-slate-700 hover:bg-slate-300",
                  }[cat.id] || "bg-white border-slate-200";

                  const emojiMap: { [key: string]: string } = {
                    school: "🏫",
                    relation: "🤝",
                    habit: "🕹️",
                    identity: "🌈",
                    crisis: "🚨",
                    digital: "📱",
                    help: "📞",
                    etc: "💬"
                  };

                  return (
                    <motion.div
                      key={cat.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleCategorySelect(cat)}
                      className={cn(
                        "border-2 rounded-[2rem] p-6 flex flex-col justify-start cursor-pointer transition-all group shadow-sm",
                        colors,
                        cat.isCrisis && "items-center text-center justify-center p-4"
                      )}
                    >
                      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">{emojiMap[cat.id]}</div>
                      <h2 className="text-lg font-bold leading-tight">{cat.label}</h2>
                      <p className="text-xs mt-1 opacity-80 leading-relaxed">{cat.description.split(' 고민')[0]}</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col max-w-4xl mx-auto w-full bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden relative"
            >
              <div className="bg-indigo-600 p-6 text-white flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl shadow-inner">✨</div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">마음코치 AI</h3>
                    <p className="text-xs text-indigo-100 opacity-80 underline decoration-indigo-300">대화 중: {selectedCategory?.label}</p>
                  </div>
                </div>
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-600 bg-indigo-400"></div>
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-600 bg-indigo-500"></div>
                </div>
              </div>

              <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50 scroll-smooth">
                {messages.map((m, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-3 max-w-[85%]",
                      m.role === 'user' ? "ml-auto flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className="flex-1">
                      <div className={cn(
                        "p-4 rounded-3xl text-sm leading-relaxed shadow-sm border",
                        m.role === 'user' 
                          ? "bg-indigo-500 text-white rounded-tr-none border-indigo-600" 
                          : "bg-white text-slate-700 rounded-tl-none border-slate-100"
                      )}>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                      <div className={cn("mt-1.5 flex", m.role === 'user' ? "justify-end mr-1" : "justify-start ml-1")}>
                        <span className="text-[10px] text-slate-400 font-medium tracking-tight">
                          {m.role === 'user' ? '전송됨' : '마음코치'} · {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 p-4 rounded-3xl rounded-tl-none shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-6 border-t border-slate-100 bg-white">
                <div className="flex gap-3 items-center bg-slate-100 p-2 rounded-full border border-slate-200 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white focus-within:border-indigo-200">
                  <button
                    onClick={toggleListening}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      isListening ? "bg-red-500 text-white animate-pulse" : "bg-white text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-200"
                    )}
                    title={isListening ? "음성 인식 중지" : "음성 인식 시작"}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="이곳에 속마음을 입력하세요..."
                    className="flex-1 bg-transparent border-none px-4 py-2 text-sm focus:outline-none resize-none max-h-24 h-[40px] text-slate-700"
                    rows={1}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-md active:scale-95"
                  >
                    ↑
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelpModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-indigo-600 p-8 text-white text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto shadow-inner">📞</div>
                <h2 className="text-2xl font-bold mb-2">도움 연락처 안내</h2>
                <p className="text-indigo-100 text-sm opacity-90 leading-relaxed">
                  전문 상담원과 직접 대화하고 싶다면<br />
                  아래 기관으로 언제든 연락해줘.
                </p>
              </div>
              <div className="p-8 space-y-4">
                <div className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">1388</div>
                    <div className="text-left">
                      <p className="font-bold text-slate-800">청소년전화</p>
                      <p className="text-xs text-slate-500">24시간 상담 가능</p>
                    </div>
                  </div>
                  <a href="tel:1388" className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-lg shadow-indigo-200 active:scale-95 transition-all">전화걸기</a>
                </div>

                <div className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-rose-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center font-bold">1393</div>
                    <div className="text-left">
                      <p className="font-bold text-slate-800">자살예방상담</p>
                      <p className="text-xs text-slate-500">도움이 필요하다면 언제든</p>
                    </div>
                  </div>
                  <a href="tel:1393" className="px-4 py-2 bg-rose-500 text-white text-xs font-bold rounded-full shadow-lg shadow-rose-200 active:scale-95 transition-all">전화걸기</a>
                </div>

                <div className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">1577-0199</div>
                    <div className="text-left">
                      <p className="font-bold text-slate-800">정신건강상담</p>
                      <p className="text-xs text-slate-500">마음의 안정이 필요할 때</p>
                    </div>
                  </div>
                  <a href="tel:15770199" className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-200 active:scale-95 transition-all">전화걸기</a>
                </div>

                <button 
                  onClick={() => setShowHelpModal(false)}
                  className="w-full py-4 mt-4 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Crisis Hotline Banner */}
      <footer className="max-w-7xl mx-auto w-full mt-8 bg-slate-800 text-white/90 p-4 rounded-3xl flex flex-col md:flex-row justify-between items-center px-8 gap-4 mb-2">
        <div className="flex flex-wrap gap-4 md:gap-8 text-xs font-semibold">
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)]"></span> 청소년상담 1388</span>
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-red-400 rounded-full shadow-[0_0_8px_rgba(248,113,113,0.5)]"></span> 자살예방상담 1393</span>
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.5)]"></span> 정신건강상담 1577-0199</span>
        </div>
        <p className="text-[10px] opacity-60 text-center md:text-right max-w-xs leading-tight">
          이 서비스는 AI 상담이며 전문의의 진단을 대신할 수 없습니다. 위기 시에는 반드시 전화 상담을 이용해주세요.
        </p>
      </footer>
    </div>
  );
}
