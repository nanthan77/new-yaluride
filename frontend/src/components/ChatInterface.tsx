import React, { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import {
  MessageCircle, Phone, Send, Shield, Clock,
  AlertTriangle, User, Car, Lock, CheckCircle, Flag, MapPin, MessageSquarePlus, X, Languages, Loader2
} from 'lucide-react';

// --- Internal Component Imports ---
import CannedResponseSelector from './CannedResponseSelector';
import TranslationButton from './TranslationButton';
import CallInterface from './CallInterface'; // Assuming CallInterface is extracted to its own file

// --- Type Definitions ---
// These should ideally be in a shared types directory, e.g., `src/types/yaluride.ts`
interface Message {
  id: string;
  tripId: string;
  senderId: string;
  senderRole: 'driver' | 'passenger';
  content: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type: 'text' | 'location' | 'image' | 'system';
  encrypted: boolean;
  language?: string; // ISO 639-1 code, e.g., 'en', 'si', 'ta'
  metadata?: any;
}

interface Call {
  id: string;
  tripId: string;
  callerId: string;
  receiverId: string;
  status: 'initiating' | 'ringing' | 'connected' | 'ended';
  startTime?: number;
  endTime?: number;
  duration?: number;
  maskedNumbers: {
    caller: string;
    receiver: string;
  };
  recordingUrl?: string;
}

interface UserProfile {
  id: string;
  name: string;
  role: 'driver' | 'passenger';
  avatar: string;
  language: 'en' | 'si' | 'ta'; // User's preferred language
  verified: boolean;
}

// --- Mock WebSocket Service (for demonstration) ---
class CommunicationService {
  private listeners: Map<string, Function[]> = new Map();
  connect(tripId: string, userId: string) { console.log(`Connecting to comms for trip ${tripId}, user ${userId}`); setTimeout(() => this.emit('connected', {}), 500); }
  disconnect() { console.log('Disconnecting from comms'); }
  sendMessage(message: Message) {
    this.emit('message:sent', { ...message, status: 'sent' });
    setTimeout(() => this.emit('message:delivered', { messageId: message.id }), 1000);
  }
  startCall(callData: any) { this.emit('call:initiated', callData); }
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)?.push(callback);
  }
  off(event: string, callback: Function) {
    const cbs = this.listeners.get(event);
    if (cbs) this.listeners.set(event, cbs.filter(cb => cb !== callback));
  }
  emit(event: string, data: any) { this.listeners.get(event)?.forEach(cb => cb(data)); }
}

// --- Custom Hooks ---
const useCommunication = (tripId: string, userId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const serviceRef = useRef(new CommunicationService());

  useEffect(() => {
    const service = serviceRef.current;
    service.connect(tripId, userId);
    const handleConnected = () => setConnectionStatus('connected');
    const handleDisconnected = () => setConnectionStatus('disconnected');
    const handleMessageReceived = (message: Message) => setMessages(prev => [...prev, message]);
    const handleMessageDelivered = ({ messageId }: { messageId: string }) => setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, status: 'delivered' } : msg));
    const handleCallIncoming = (call: Call) => setCurrentCall(call);

    service.on('connected', handleConnected);
    service.on('disconnected', handleDisconnected);
    service.on('message:received', handleMessageReceived);
    service.on('message:delivered', handleMessageDelivered);
    service.on('call:incoming', handleCallIncoming);

    return () => {
      service.off('connected', handleConnected);
      service.off('disconnected', handleDisconnected);
      service.off('message:received', handleMessageReceived);
      service.off('message:delivered', handleMessageDelivered);
      service.off('call:incoming', handleCallIncoming);
      service.disconnect();
    };
  }, [tripId, userId]);

  const sendMessage = useCallback((content: string, type: Message['type'] = 'text') => {
    const message: Message = {
      id: `msg-${Date.now()}`,
      tripId,
      senderId: userId,
      senderRole: 'passenger', // This would be determined by actual user role
      content,
      timestamp: Date.now(),
      status: 'sending',
      type,
      encrypted: true,
      language: 'en', // Should come from user profile
    };
    setMessages(prev => [...prev, message]);
    serviceRef.current.sendMessage(message);
  }, [tripId, userId]);

  const initiateCall = useCallback((receiverId: string) => {
    const call: Call = { id: `call-${Date.now()}`, tripId, callerId: userId, receiverId, status: 'initiating', maskedNumbers: { caller: '+1-XXX-XXX-1234', receiver: '+1-XXX-XXX-5678' } };
    setCurrentCall(call);
    serviceRef.current.startCall(call);
  }, [tripId, userId]);

  return { messages, currentCall, connectionStatus, sendMessage, initiateCall, setCurrentCall };
};

// --- Components ---
const MessageBubble: React.FC<{
  message: Message;
  isOwn: boolean;
  translatedText?: string;
  onTranslate: () => void;
  onReport?: () => void;
}> = ({ message, isOwn, translatedText, onTranslate, onReport }) => {
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sent': return <CheckCircle className="w-3 h-3 text-gray-400" />;
      case 'delivered': return <div className="flex -space-x-1"><CheckCircle className="w-3 h-3 text-gray-400" /><CheckCircle className="w-3 h-3 text-gray-400" /></div>;
      case 'read': return <div className="flex -space-x-1"><CheckCircle className="w-3 h-3 text-blue-500" /><CheckCircle className="w-3 h-3 text-blue-500" /></div>;
      default: return <Clock className="w-3 h-3 text-gray-300" />;
    }
  };

  return (
    <div className={`flex items-end ${isOwn ? 'justify-end' : 'justify-start'} mb-1 group`}>
      <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'}`}>
        {message.type === 'location' && <div className="flex items-center gap-2 mb-1"><MapPin className="w-4 h-4" /><span className="text-sm font-medium">Shared Location</span></div>}
        
        <p className="text-sm">{translatedText || message.content}</p>
        {translatedText && <p className="text-xs italic opacity-70 mt-1 border-t border-white/20 dark:border-gray-500 pt-1">Translated from original</p>}
        
        <div className={`flex items-center justify-end mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
          <span className="text-xs">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isOwn && <div className="flex items-center gap-1 ml-2">{message.encrypted && <Lock className="w-3 h-3" />}{getStatusIcon()}</div>}
        </div>
      </div>
      
      <div className="flex flex-col items-center">
        {!isOwn && message.language !== 'en' && !translatedText && ( // Assuming current user's lang is 'en'
          <TranslationButton 
            originalText={message.content}
            targetLanguage='en'
            sourceLanguage={message.language}
            onTranslated={onTranslate}
            className="ml-1 mb-1 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
        {!isOwn && onReport && (
          <button onClick={onReport} className="ml-1 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Report message">
            <Flag className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

const ChatInterface: React.FC<{
  tripId: string;
  currentUser: UserProfile;
  otherUser: UserProfile;
}> = ({ tripId, currentUser, otherUser }) => {
  const [messageText, setMessageText] = useState('');
  const [showCallUI, setShowCallUI] = useState(false);
  const [isCannedResponseOpen, setIsCannedResponseOpen] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, currentCall, connectionStatus, sendMessage, initiateCall, setCurrentCall } = useCommunication(tripId, currentUser.id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(() => {
    if (messageText.trim()) {
      sendMessage(messageText);
      setMessageText('');
    }
  }, [messageText, sendMessage]);

  const handleSelectCannedResponse = (text: string) => {
    sendMessage(text);
  };

  const handleTranslateMessage = (messageId: string, translatedText: string) => {
    setTranslatedMessages(prev => ({ ...prev, [messageId]: translatedText }));
  };

  const handleStartCall = () => { setShowCallUI(true); initiateCall(otherUser.id); };
  const handleEndCall = () => { setShowCallUI(false); setCurrentCall(null); };
  const handleShareLocation = () => { navigator.geolocation?.getCurrentPosition(pos => sendMessage(`📍 Location: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`, 'location')); };
  const handleReport = (messageId: string) => { console.log('Reporting message:', messageId); alert('Message reported.'); };

  const demoMessages: Message[] = [
    { id: '1', tripId, senderId: otherUser.id, senderRole: otherUser.role, content: "හෙලෝ! මම දැන් එන ගමන් ඉන්නේ.", timestamp: Date.now() - 300000, status: 'read', type: 'text', encrypted: true, language: 'si' },
    { id: '2', tripId, senderId: currentUser.id, senderRole: currentUser.role, content: "Great! I'm waiting at the main entrance.", timestamp: Date.now() - 240000, status: 'read', type: 'text', encrypted: true, language: 'en' },
    ...messages
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={otherUser.avatar} alt={otherUser.name} className="w-10 h-10 rounded-full object-cover" />
            <div>
              <h3 className="font-semibold flex items-center gap-2 text-gray-800 dark:text-white">{otherUser.name}{otherUser.verified && <CheckCircle className="w-4 h-4 text-blue-500" />}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{otherUser.role === 'driver' ? 'Your Driver' : 'Your Passenger'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleStartCall} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600" title="Start voice call"><Phone className="w-5 h-5" /></button>
            <div className={`w-2.5 h-2.5 rounded-full transition-colors ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-gray-300'}`} title={`Connection: ${connectionStatus}`} />
          </div>
        </div>
      </div>
      <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 px-4 py-2"><div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300"><Shield className="w-4 h-4" /><span>Messages are encrypted and monitored for safety</span></div></div>
      <div className="flex-1 overflow-y-auto px-4 py-4"><AnimatePresence initial={false}>{demoMessages.map((message) => (<motion.div key={message.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><MessageBubble message={message} isOwn={message.senderId === currentUser.id} translatedText={translatedMessages[message.id]} onTranslate={(text) => handleTranslateMessage(message.id, text)} onReport={() => handleReport(message.id)} /></motion.div>))}</AnimatePresence><div ref={messagesEndRef} /></div>
      <div className="border-t dark:border-gray-700 p-2 sm:p-4 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <button onClick={handleShareLocation} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200" title="Share location"><MapPin className="w-5 h-5" /></button>
          <button onClick={() => setIsCannedResponseOpen(true)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200" title="Send a quick response"><MessageSquarePlus className="w-5 h-5" /></button>
          <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type a message..." className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" maxLength={500} />
          <button onClick={handleSendMessage} disabled={!messageText.trim()} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600"><Send className="w-5 h-5" /></button>
        </div>
      </div>
      {showCallUI && currentCall && <CallInterface call={currentCall} otherUser={otherUser} onEndCall={handleEndCall} />}
      <CannedResponseSelector isOpen={isCannedResponseOpen} onClose={() => setIsCannedResponseOpen(false)} onSelect={handleSelectCannedResponse} />
    </div>
  );
};

export default ChatInterface;
