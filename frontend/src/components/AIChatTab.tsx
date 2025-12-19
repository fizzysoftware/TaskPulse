import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { User, TaskDraft, TaskPriority } from '../types';
import { Send, Mic, Sparkles, Loader2, UserCircle2, Bot } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface AIChatTabProps {
  currentUser: User;
  onDraftCreated: (draft: TaskDraft) => void;
  onVoiceCreate: () => void;
}

const draftTaskTool: FunctionDeclaration = {
  name: "draftTask",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The main title of the task" },
      description: { type: Type.STRING, description: "Detailed description of what needs to be done" },
      priority: { 
          type: Type.STRING, 
          enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
          description: "Priority level of the task"
      },
      dueDate: { type: Type.STRING, description: "The due date in YYYY-MM-DD format" },
      dueTime: { type: Type.STRING, description: "The due time in HH:MM 24-hour format" }
    },
    required: ["title"]
  }
};

const AIChatTab: React.FC<AIChatTabProps> = ({ currentUser, onDraftCreated, onVoiceCreate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hi ${currentUser.name}! I'm your TeamSync assistant. You can tell me to create a task, or ask for help with one. How can I help you today?`,
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      // We use gemini-3-flash-preview for fast conversational responses
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: messages.concat(userMessage).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.text }]
        })),
        config: {
          tools: [{ functionDeclarations: [draftTaskTool] }],
          systemInstruction: `You are the TeamSync assistant. Help users create tasks. 
          Today is ${new Date().toISOString().split('T')[0]}. 
          If a user mentions a task, try to extract its title, description, priority, and due date.
          Call the 'draftTask' tool whenever you have enough information to form a task.
          Be friendly and professional.`,
        }
      });

      const assistantText = response.text || "I've processed your request.";
      const toolCalls = response.functionCalls;

      if (toolCalls && toolCalls.length > 0) {
        const call = toolCalls.find(fc => fc.name === 'draftTask');
        if (call) {
          const args = call.args as any;
          const draft: TaskDraft = {
            title: args.title,
            description: args.description,
            priority: args.priority as TaskPriority,
            dueDate: args.dueDate,
            dueTime: args.dueTime
          };
          onDraftCreated(draft);
        }
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: assistantText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages(prev => [...prev, {
        id: 'error',
        role: 'assistant',
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar"
      >
        {messages.map(msg => (
          <div 
            key={msg.id} 
            className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'assistant' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
              {msg.role === 'assistant' ? <Bot size={18} /> : <UserCircle2 size={18} />}
            </div>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
              msg.role === 'assistant' 
                ? 'bg-blue-50 text-gray-800 rounded-tl-none' 
                : 'bg-primary text-white rounded-tr-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 text-blue-400 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin" />
            </div>
            <span className="text-xs font-medium">Assistant is thinking...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={10} className="text-blue-400" /> Powered by Gemini
            </span>
        </div>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button 
            type="button"
            onClick={onVoiceCreate}
            className="p-3 bg-white border border-gray-200 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
            title="Voice input"
          >
            <Mic size={20} />
          </button>
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="E.g. Assign a task to check stock..."
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
          />
          <button 
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="p-3 bg-primary text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-primary transition-all shadow-md active:scale-95"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChatTab;