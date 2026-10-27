'use client';

import React, { useState, useEffect } from 'react';
import { X, Send, ShieldCheck, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import {
  RealChatMessage,
  subscribeToChatMessages,
  sendChatMessage,
} from '@/lib/firebase/services/chatService';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  cultoId?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose, cultoId = 'culto-general' }) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<RealChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToChatMessages(cultoId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [isOpen, cultoId]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || !user) return;

    setIsSending(true);
    try {
      await sendChatMessage(
        cultoId,
        {
          uid: user.uid,
          displayName: profile?.displayName || user.displayName || 'Miembro FAMA',
          photoURL: user.photoURL || undefined,
        },
        inputText
      );
      setInputText('');
    } catch (err) {
      console.error('[ChatPanel] Error enviando mensaje:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm sm:max-w-md bg-[#070B14]/98 border-l border-[#1E2D4A] shadow-2xl flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-300">
      
      {/* Cabecera del Chat */}
      <div className="p-4 border-b border-[#1E2D4A] flex items-center justify-between bg-[#0E1626]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <h3 className="text-sm font-bold text-white">Comunión en Vivo</h3>
            <span className="text-[10px] text-[#D4AF37] tracking-wider uppercase">FAMA Auditorio</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#141E33] rounded-lg transition-colors"
          aria-label="Cerrar chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Moderación */}
      <div className="bg-[#141E33]/60 px-3 py-2 border-b border-[#1E2D4A]/50 flex items-center gap-2 text-[11px] text-slate-300">
        <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
        <span>Chat moderado en Cloud Firestore con respeto fraternal.</span>
      </div>

      {/* Lista de Mensajes Reales */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-600" />
            <p className="text-xs">No hay mensajes aún. Sé el primero en escribir.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === user?.uid;
            return (
              <div
                key={msg.id}
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  isMe
                    ? 'bg-[#141E33] border-[#D4AF37]/40 ml-4 text-white'
                    : 'bg-[#0E1626] border-[#1E2D4A] text-slate-200 mr-4'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`font-bold ${isMe ? 'text-[#F3D079]' : 'text-white'}`}>
                    {msg.senderName}
                  </span>
                </div>
                <p className="break-words">{msg.content}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Formulario de Envío de Mensaje */}
      {user ? (
        <form onSubmit={handleSendMessage} className="p-3 border-t border-[#1E2D4A] bg-[#0E1626]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe un mensaje de edificación..."
              disabled={isSending}
              className="flex-1 bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="p-2.5 bg-[#D4AF37] hover:bg-[#F3D079] text-black font-semibold rounded-xl transition-colors focus:outline-none disabled:opacity-40"
              title="Enviar mensaje"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      ) : (
        <div className="p-3 border-t border-[#1E2D4A] bg-[#0E1626] text-center text-xs text-slate-400">
          Inicia sesión para participar en el chat.
        </div>
      )}
    </div>
  );
};
