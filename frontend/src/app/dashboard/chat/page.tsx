'use client';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

type Message = {
  id: string;
  fromSocketId?: string;
  toSocketId?: string;
  userId?: string;
  userName?: string;
  pharmacyName?: string;
  message: string;
  timestamp: Date;
};

type User = {
  socketId: string;
  userId: string;
  userName: string;
  pharmacyId: string;
  pharmacyName: string;
};

export default function ChatPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const [globalMessages, setGlobalMessages] = useState<Message[]>([]);
  const [privateMessages, setPrivateMessages] = useState<Record<string, Message[]>>({});
  
  const [users, setUsers] = useState<User[]>([]);
  const [activeChat, setActiveChat] = useState<string>('global'); // 'global' or socketId
  const [inputMsg, setInputMsg] = useState('');
  
  const [alerts, setAlerts] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || '', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat server');
    });

    newSocket.on('users_list', (usersList: User[]) => {
      setUsers(usersList);
    });

    newSocket.on('receive_global_message', (data) => {
      setGlobalMessages(prev => [...prev, { ...data, id: Math.random().toString() }]);
    });

    newSocket.on('receive_private_message', (data) => {
      setPrivateMessages(prev => {
        const isMeSender = data.fromSocketId === newSocket.id;
        const bucketId = isMeSender ? data.toSocketId : data.fromSocketId;
        
        const existing = prev[bucketId] || [];
        return {
          ...prev,
          [bucketId]: [...existing, { ...data, id: Math.random().toString() }]
        };
      });
    });

    newSocket.on('reservation_alert', (data) => {
      setAlerts(prev => [data, ...prev]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (activeChat === 'global') return;
    
    // Fetch history for private chat
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/chat/messages/${activeChat}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Merge history with whatever might already be in memory
          setPrivateMessages(prev => ({
            ...prev,
            [activeChat]: data.map((m: any) => ({
              id: m.id,
              fromSocketId: m.senderId === activeChat ? activeChat : socket?.id,
              toSocketId: m.senderId === activeChat ? socket?.id : activeChat,
              message: m.content,
              timestamp: m.createdAt,
              status: m.status
            }))
          }));
        }
      } catch (err) {
        console.error('Error fetching chat history', err);
      }
    };
    
    fetchHistory();
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [globalMessages, privateMessages, activeChat]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !socket) return;

    if (activeChat === 'global') {
      socket.emit('send_global_message', { message: inputMsg });
    } else {
      socket.emit('send_private_message', { toSocketId: activeChat, message: inputMsg });
    }
    
    setInputMsg('');
  };

  const currentMessages = activeChat === 'global' ? globalMessages : (privateMessages[activeChat] || []);
  const activeUser = users.find(u => u.socketId === activeChat);

  return (
    <div className="p-8 h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Chat de la Red</h1>
        <p className="text-slate-500">Comunicate globalmente o de forma privada con otras farmacias.</p>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        
        {/* Users Sidebar */}
        <div className="w-64 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-700 text-sm">
            Usuarios Activos
          </div>
          <div className="flex-1 overflow-y-auto">
            <div 
              onClick={() => setActiveChat('global')}
              className={`px-4 py-3 cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition ${activeChat === 'global' ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
            >
              <div className="font-bold text-slate-800">🌍 Sala Global</div>
              <div className="text-xs text-slate-500">Todos los conectados</div>
            </div>

            {users.map((u) => {
              if (u.socketId === socket?.id) return null; // Don't show self
              return (
                <div 
                  key={u.socketId}
                  onClick={() => setActiveChat(u.socketId)}
                  className={`px-4 py-3 cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition ${activeChat === u.socketId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                >
                  <div className="font-bold text-slate-800 text-sm">{u.pharmacyName}</div>
                  <div className="text-xs text-slate-500">{u.userName}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 font-bold text-slate-700">
            {activeChat === 'global' ? 'Sala Global' : `Chat Privado con: ${activeUser?.pharmacyName} (${activeUser?.userName})`}
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {currentMessages.length === 0 ? (
              <p className="text-center text-slate-400 my-10">No hay mensajes aún.</p>
            ) : (
              currentMessages.map((msg) => {
                const isMe = activeChat === 'global' ? msg.userName === users.find(u=>u.socketId===socket?.id)?.userName : msg.fromSocketId === socket?.id;
                
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`p-3 rounded-xl max-w-[80%] ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                      {!isMe && activeChat === 'global' && (
                        <div className="text-xs font-bold text-blue-600 mb-1">{msg.pharmacyName} <span className="font-normal text-slate-500">({msg.userName})</span></div>
                      )}
                      <div>{msg.message}</div>
                      <div className={`text-[10px] text-right mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                        {isMe && activeChat !== 'global' && (
                          <span className={msg.status === 'READ' ? 'text-blue-300 font-bold' : ''}>
                            {msg.status === 'SENT' ? '✓' : '✓✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
            <input 
              type="text" 
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              placeholder="Escribe un mensaje..." 
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
              Enviar
            </button>
          </form>
        </div>

        {/* Alerts Sidebar (Optional, keep if needed) */}
        {alerts.length > 0 && (
          <div className="w-64 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-1 overflow-y-auto">
              <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Alertas de Clientes</h3>
              {alerts.map((alert, i) => (
                <div key={i} className="bg-rose-50 border border-rose-100 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-rose-600">🔔</span>
                    <span className="font-bold text-rose-800 text-sm">Cliente en camino</span>
                  </div>
                  <p className="text-sm text-rose-900 mb-2">{alert.message}</p>
                  <p className="text-xs font-bold bg-white text-rose-600 inline-block px-2 py-1 rounded">
                    {alert.medicationName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
