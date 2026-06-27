// ============================================================
// VozZap - Chat Screen (Direct Messages)
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { AudioPlayer } from '@/components/AudioPlayer';
import { formatRelativeTime, formatDuration } from '@/utils/format';
import { cn } from '@/utils/cn';
import { DirectMessage } from '@/types';
import toast from 'react-hot-toast';

interface ChatScreenProps {
  onOpenProfile: (userId: string) => void;
}

const MAX_AUDIO_DURATION = 60; // 1 minute for DMs

export const ChatScreen: React.FC<ChatScreenProps> = ({ onOpenProfile }) => {
  const { conversations, messages, sendMessage, markAsRead, setActiveConversation, activeConversationId } = useChatStore();
  const { currentUser } = useAuthStore();
  const [messageText, setMessageText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeConv = conversations.find(c => c.id === activeConversationId);
  const convMessages = activeConversationId ? (messages[activeConversationId] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages.length]);

  useEffect(() => {
    if (activeConversationId) {
      markAsRead(activeConversationId);
    }
  }, [activeConversationId, markAsRead]);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !currentUser || !activeConv) return;
    sendMessage(currentUser.id, activeConv.participant.id, messageText.trim());
    setMessageText('');
  };

  const startRecording = async () => {
    try {
      console.log('[Chat Recording] Solicitando acesso ao microfone...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      console.log('[Chat Recording] Microfone obtido, iniciando gravação...');
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.onerror = (event) => {
        console.error('[Chat Recording] Erro ao gravar:', event.error);
        toast.error(`Erro ao gravar: ${event.error}`);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.ondataavailable = e => {
        console.log('[Chat Recording] Dados recebidos:', e.data.size, 'bytes');
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        console.log('[Chat Recording] Parado. Total de chunks:', chunksRef.current.length);
        if (chunksRef.current.length === 0) {
          toast.error('Nenhum áudio foi gravado. Tente novamente.');
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        const blob = new Blob(chunksRef.current, { type: mimeType });
        console.log('[Chat Recording] Blob criado:', blob.size, 'bytes');
        const url = URL.createObjectURL(blob);
        if (currentUser && activeConv) {
          sendMessage(currentUser.id, activeConv.participant.id, undefined, url, recordingTime);
          toast.success('✅ Áudio enviado!');
        }
        stream.getTracks().forEach(t => t.stop());
        setRecordingTime(0);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      console.log('[Chat Recording] Gravação iniciada');

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_AUDIO_DURATION - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[Chat Recording] Erro:', errorMsg);
      if (errorMsg.includes('Permission denied')) {
        toast.error('❌ Permissão negada. Verifique as configurações de privacidade do navegador.');
      } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('no device')) {
        toast.error('❌ Nenhum microfone encontrado no seu dispositivo.');
      } else if (errorMsg.includes('NotAllowedError')) {
        toast.error('❌ Acesso ao microfone foi negado.');
      } else {
        toast.error(`❌ Erro ao acessar microfone: ${errorMsg}`);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  if (!activeConversationId || !activeConv) {
    // Conversations list
    return (
      <div className="pb-4">
        <div className="px-4 pt-4 pb-2">
          <h2 className="font-bold text-[var(--text-primary)] text-lg">Mensagens</h2>
          <p className="text-xs text-[var(--text-secondary)]">{conversations.length} conversas</p>
        </div>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Sem mensagens</h3>
            <p className="text-[var(--text-secondary)] text-sm">
              Encontre pessoas na aba de busca e comece uma conversa!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {conversations.map(conv => {
              const lastMsg = conv.lastMessage;
              const isFromMe = lastMsg?.senderId === currentUser?.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConversation(conv.id);
                    markAsRead(conv.id);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card)] transition-colors text-left"
                >
                  <div className="relative flex-shrink-0">
                    <Avatar src={conv.participant.avatar} name={conv.participant.name} size="md" />
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-vz-primary rounded-full text-white text-xs flex items-center justify-center font-bold">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={cn('font-semibold text-sm', conv.unreadCount > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]')}>
                        {conv.participant.name}
                      </span>
                      {lastMsg && (
                        <span className="text-xs text-[var(--text-secondary)]">
                          {formatRelativeTime(lastMsg.sentAt)}
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <p className={cn(
                        'text-xs truncate mt-0.5',
                        conv.unreadCount > 0 ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                      )}>
                        {isFromMe ? 'Você: ' : ''}
                        {lastMsg.audioUrl ? '🎙️ Áudio' : lastMsg.text}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-0 z-10">
        <button
          onClick={() => setActiveConversation(null)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <Avatar
          src={activeConv.participant.avatar}
          name={activeConv.participant.name}
          size="sm"
          onClick={() => onOpenProfile(activeConv.participant.id)}
        />
        <div>
          <button
            onClick={() => onOpenProfile(activeConv.participant.id)}
            className="font-semibold text-[var(--text-primary)] text-sm hover:text-vz-primary transition-colors"
          >
            {activeConv.participant.name}
          </button>
          <p className="text-xs text-vz-primary">online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {convMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-2">👋</div>
            <p className="text-sm text-[var(--text-secondary)]">
              Diga olá para {activeConv.participant.name}!
            </p>
          </div>
        ) : (
          convMessages.map(msg => <MessageBubble key={msg.id} message={msg} isMe={msg.senderId === currentUser?.id} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 bg-[var(--bg-card)] border-t border-[var(--border)]">
        {isRecording ? (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-2xl px-4 py-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="flex-1 text-sm font-medium text-red-600 dark:text-red-400">
              Gravando... {formatDuration(recordingTime)}
            </span>
            <button
              onClick={stopRecording}
              className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
            >
              Enviar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendText} className="flex items-end gap-2">
            <div className="flex-1 flex items-end gap-2 bg-[var(--bg-secondary)] rounded-2xl px-4 py-2.5 border border-[var(--border)]">
              <textarea
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Mensagem..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] resize-none outline-none max-h-24 overflow-y-auto"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendText(e as unknown as React.FormEvent);
                  }
                }}
              />
            </div>
            {messageText.trim() ? (
              <button
                type="submit"
                className="w-11 h-11 rounded-full bg-vz-primary flex items-center justify-center text-white hover:bg-vz-primary/90 transition-colors flex-shrink-0"
                aria-label="Enviar mensagem"
              >
                <Send size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="w-11 h-11 rounded-full bg-vz-primary flex items-center justify-center text-white hover:bg-vz-primary/90 transition-colors flex-shrink-0"
                aria-label="Gravar áudio"
              >
                <Mic size={18} />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

const MessageBubble: React.FC<{ message: DirectMessage; isMe: boolean }> = ({ message, isMe }) => (
  <div className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
    <div className={cn(
      'max-w-[75%] rounded-2xl px-4 py-2.5',
      isMe
        ? 'bg-vz-primary text-white rounded-br-sm'
        : 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] rounded-bl-sm'
    )}>
      {message.audioUrl ? (
        <div className="min-w-[180px]">
          <AudioPlayer
            audioUrl={message.audioUrl}
            duration={message.audioDuration || 30}
            compact
            inverted={isMe}
            className="py-1"
          />
        </div>
      ) : (
        <p className="text-sm leading-relaxed">{message.text}</p>
      )}
      <div className={cn('flex items-center gap-1 mt-1', isMe ? 'justify-end' : 'justify-start')}>
        <span className={cn('text-xs', isMe ? 'text-white/70' : 'text-[var(--text-secondary)]')}>
          {formatRelativeTime(message.sentAt)}
        </span>
        {isMe && (
          message.read
            ? <CheckCheck size={12} className="text-white/70" />
            : <Check size={12} className="text-white/70" />
        )}
      </div>
    </div>
  </div>
);
