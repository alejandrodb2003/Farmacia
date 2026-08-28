'use client';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export default function ChatPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [alerts, setAlerts] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io('http://localhost:3001', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat server');
    });

    newSocket.on('receive_global_message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    newSocket.on('reservation_alert', (data) => {
      setAlerts(prev => [data, ...prev]);
      // Play a sound if you want!
      alert(data.message + "\nMedicamento: " + data.medicationName);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !socket) return;

    socket.emit('send_global_message', { message: inputMsg });
    setInputMsg('');
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Chat Global & Alertas</h1>
        <p className="text-slate-500">Comunicate con todas las farmacias de la red en tiempo real.</p>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 font-bold text-slate-700">
            Sala General
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-slate-400 my-10">No hay mensajes aún. ¡Rompe el hielo!</p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="bg-blue-50 text-blue-900 p-3 rounded-lg rounded-tl-none inline-block max-w-[80%]">
                  <div className="text-xs font-bold text-blue-600 mb-1">Farmacia ID: {msg.pharmacyId?.substring(0,8)}...</div>
                  <div>{msg.message}</div>
                  <div className="text-[10px] text-blue-400 text-right mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
            <input 
              type="text" 
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              placeholder="Escribe un mensaje a la red..." 
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
              Enviar
            </button>
          </form>
        </div>

        {/* Alerts Sidebar */}
        <div className="w-80 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-1 overflow-y-auto">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Alertas de Clientes (Derivaciones)</h3>
            
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-500 text-center">Sin alertas recientes.</p>
            ) : (
              alerts.map((alert, i) => (
                <div key={i} className="bg-rose-50 border border-rose-100 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-rose-600">🔔</span>
                    <span className="font-bold text-rose-800 text-sm">Cliente en camino</span>
                  </div>
                  <p className="text-sm text-rose-900 mb-2">{alert.message}</p>
                  <p className="text-xs font-bold bg-white text-rose-600 inline-block px-2 py-1 rounded">
                    Buscar: {alert.medicationName}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
