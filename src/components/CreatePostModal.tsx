// ============================================================
// VozZap - Create / Edit Post Modal
// Supports live recording and file upload
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Upload, X, Clock, Image, Globe, Users } from 'lucide-react';
import { Category, Post, Visibility } from '@/types';
import { usePostsStore } from '@/store/postsStore';
import { useAuthStore } from '@/store/authStore';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { formatDuration, formatFileSize } from '@/utils/format';
import { AudioPlayer } from './AudioPlayer';
import { cn } from '@/utils/cn';
import { uploadSupabaseFile } from '@/lib/supabase';
import toast from 'react-hot-toast';

const CATEGORIES: Category[] = ['Música', 'Comédia', 'Educação', 'Notícias', 'História', 'Outros'];
const MAX_DURATION = 120; // 2 minutes
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  editPost?: Post | null;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, editPost }) => {
  const { addPost, updatePost } = usePostsStore();
  const { currentUser } = useAuthStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Outros');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioDuration, setAudioDuration] = useState(0);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<'record' | 'upload'>('record');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editPost;

  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title);
      setDescription(editPost.description);
      setCategory(editPost.category);
      setVisibility(editPost.visibility);
    } else {
      resetForm();
    }
  }, [editPost, isOpen]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Outros');
    setVisibility('public');
    setAudioBlob(null);
    setAudioUrl('');
    setAudioDuration(0);
    setCoverPreview('');
    setRecordingTime(0);
    setIsRecording(false);
  };

  const startRecording = async () => {
    try {
      console.log('[Recording] Solicitando acesso ao microfone...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      console.log('[Recording] Microfone obtido, iniciando gravação...');
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.onerror = (event) => {
        console.error('[Recording] Erro ao gravar:', event.error);
        toast.error(`Erro ao gravar: ${event.error}`);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.ondataavailable = e => {
        console.log('[Recording] Dados recebidos:', e.data.size, 'bytes');
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        console.log('[Recording] Parado. Total de chunks:', chunksRef.current.length);
        if (chunksRef.current.length === 0) {
          toast.error('Nenhum áudio foi gravado. Tente novamente.');
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        
        const blob = new Blob(chunksRef.current, { type: mimeType });
        console.log('[Recording] Blob criado:', blob.size, 'bytes');
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setAudioDuration(recordingTime);
        stream.getTracks().forEach(t => t.stop());
        toast.success(`✅ Áudio gravado! (${formatFileSize(blob.size)})`);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      console.log('[Recording] Gravação iniciada');

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_DURATION - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[Recording] Erro:', errorMsg);
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
    console.log('[Recording] Parando gravação. Estado:', mediaRecorderRef.current?.state);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      console.log('[Recording] Sinal de parada enviado');
    } else {
      console.warn('[Recording] Nenhuma gravação ativa para parar');
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
  };

  const handleAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    const allowed = ['audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac', 'audio/webm'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp3|ogg|wav|aac|webm|m4a)$/i)) {
      toast.error('Formato não suportado. Use MP3, AAC, OGG ou WAV.');
      return;
    }

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setAudioBlob(file);

    // Get duration
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      setAudioDuration(Math.round(audio.duration));
    };

    toast.success(`✅ ${file.name} carregado! (${formatFileSize(file.size)})`);
  };

  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!title.trim()) { toast.error('Adicione um título.'); return; }
    if (!isEditing && !audioUrl) { toast.error('Grave ou faça upload de um áudio.'); return; }

    setIsSubmitting(true);
    try {
      if (isEditing && editPost) {
        updatePost(editPost.id, { title: title.trim(), description: description.trim(), category, visibility });
        toast.success('✅ Publicação atualizada!');
      } else {
        let remoteAudioUrl = audioUrl;
        if (audioBlob && currentUser) {
          try {
            remoteAudioUrl = await uploadSupabaseFile(audioBlob, 'audio-files', currentUser.id);
          } catch {
            toast.error('Não foi possível enviar o áudio para o Supabase.');
          }
        }

        await addPost({
          userId: currentUser.id,
          user: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar },
          title: title.trim(),
          description: description.trim(),
          category,
          audioUrl: remoteAudioUrl,
          duration: audioDuration,
          coverUrl: coverPreview || undefined,
          visibility,
        });
        toast.success('🎙️ Publicação criada!');
      }
      onClose();
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? '✏️ Editar Publicação' : '🎙️ Nova Publicação'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <Input
          label="Título"
          value={title}
          onChange={e => setTitle(e.target.value.slice(0, 50))}
          placeholder="Título da sua publicação..."
          maxLength={50}
          required
        />
        <div className="flex justify-end -mt-2">
          <span className="text-xs text-[var(--text-secondary)]">{title.length}/50</span>
        </div>

        {/* Description */}
        <Textarea
          label="Descrição"
          value={description}
          onChange={e => setDescription(e.target.value.slice(0, 200))}
          placeholder="Descreva seu áudio..."
          rows={3}
          maxLength={200}
        />
        <div className="flex justify-end -mt-2">
          <span className="text-xs text-[var(--text-secondary)]">{description.length}/200</span>
        </div>

        {/* Category */}
        <div>
          <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">Categoria</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  category === cat
                    ? 'bg-vz-primary text-white shadow-sm'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-vz-primary/10'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">Visibilidade</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={cn(
                'flex items-center gap-2 flex-1 py-2.5 px-4 rounded-xl border-2 text-sm font-medium transition-all',
                visibility === 'public'
                  ? 'border-vz-primary bg-vz-primary/10 text-vz-primary'
                  : 'border-[var(--border)] text-[var(--text-secondary)]'
              )}
            >
              <Globe size={16} />
              Público
            </button>
            <button
              type="button"
              onClick={() => setVisibility('followers')}
              className={cn(
                'flex items-center gap-2 flex-1 py-2.5 px-4 rounded-xl border-2 text-sm font-medium transition-all',
                visibility === 'followers'
                  ? 'border-vz-primary bg-vz-primary/10 text-vz-primary'
                  : 'border-[var(--border)] text-[var(--text-secondary)]'
              )}
            >
              <Users size={16} />
              Seguidores
            </button>
          </div>
        </div>

        {/* Audio - only for new posts */}
        {!isEditing && (
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">Áudio</label>

            {/* Tabs */}
            <div className="flex rounded-xl overflow-hidden border border-[var(--border)] mb-3">
              <button
                type="button"
                onClick={() => setTab('record')}
                className={cn(
                  'flex-1 py-2.5 text-sm font-medium transition-colors',
                  tab === 'record'
                    ? 'bg-vz-primary text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                )}
              >
                🎙️ Gravar
              </button>
              <button
                type="button"
                onClick={() => setTab('upload')}
                className={cn(
                  'flex-1 py-2.5 text-sm font-medium transition-colors',
                  tab === 'upload'
                    ? 'bg-vz-primary text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                )}
              >
                📁 Upload
              </button>
            </div>

            {tab === 'record' && (
              <div className="flex flex-col items-center gap-3 py-4 bg-[var(--bg-secondary)] rounded-xl">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    'w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95',
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40'
                      : 'bg-vz-primary text-white shadow-lg shadow-vz-primary/30 hover:bg-vz-primary/90'
                  )}
                  aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
                >
                  {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
                </button>
                <div className="text-center">
                  {isRecording ? (
                    <div>
                      <div className="flex items-center gap-2 text-red-500 font-semibold">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        Gravando... {formatDuration(recordingTime)}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        Máx: {formatDuration(MAX_DURATION)} | Clique para parar
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">
                      {audioUrl ? '✅ Gravação pronta! Clique para regravar' : 'Clique para iniciar a gravação'}
                    </p>
                  )}
                </div>
                {audioDuration > 0 && !isRecording && (
                  <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                    <Clock size={12} />
                    Duração: {formatDuration(audioDuration)}
                  </div>
                )}
              </div>
            )}

            {tab === 'upload' && (
              <div>
                <input
                  ref={audioFileRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleAudioFile}
                />
                <button
                  type="button"
                  onClick={() => audioFileRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-[var(--border)] rounded-xl flex flex-col items-center gap-2 hover:border-vz-primary hover:bg-vz-primary/5 transition-all"
                >
                  <Upload size={28} className="text-[var(--text-secondary)]" />
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    {audioBlob ? '✅ Arquivo selecionado' : 'Clique para selecionar áudio'}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">MP3, AAC, OGG, WAV • Máx. 10MB</span>
                </button>
              </div>
            )}

            {/* Audio preview */}
            {audioUrl && !isRecording && (
              <div className="mt-3">
                <p className="text-xs text-[var(--text-secondary)] mb-1 font-medium">Preview:</p>
                <AudioPlayer audioUrl={audioUrl} duration={audioDuration} compact />
              </div>
            )}
          </div>
        )}

        {/* Cover Image */}
        {!isEditing && (
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">
              Capa (opcional)
            </label>
            <input
              ref={coverFileRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
              onChange={handleCoverFile}
            />
            <div className="flex gap-3 items-center">
              {coverPreview && (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverPreview('')}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => coverFileRef.current?.click()}
                className="flex items-center gap-2 py-2.5 px-4 border border-dashed border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] hover:border-vz-primary hover:text-vz-primary transition-all"
              >
                <Image size={16} />
                {coverPreview ? 'Alterar capa' : 'Adicionar capa'}
              </button>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={!title.trim() || (!isEditing && !audioUrl)}
            className="flex-1"
          >
            {isEditing ? 'Salvar' : 'Publicar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
