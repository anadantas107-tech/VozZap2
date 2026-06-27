// ============================================================
// VozZap - Audio Player Component
// Accessible audio player with progress bar and controls
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatDuration } from '@/utils/format';

interface AudioPlayerProps {
  audioUrl: string;
  duration: number;
  isGlobalActive?: boolean;
  onPlay?: () => void;
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  duration,
  isGlobalActive = true,
  onPlay,
  className,
  compact = false,
  inverted = false,
}) => {
  console.log('[AudioPlayer] Renderizando com URL:', audioUrl, '| Duração:', duration, '| Compact:', compact);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [isMuted, setIsMuted] = useState(false);
  const isDragging = false; // Future: implement drag support
  const progressRef = useRef<HTMLDivElement>(null);

  // Stop playing when global active state changes
  useEffect(() => {
    if (!isGlobalActive && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [isGlobalActive, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      console.log('[AudioPlayer] Metadados carregados:', audio.duration);
      setAudioDuration(audio.duration || duration);
    };

    const handleEnded = () => {
      console.log('[AudioPlayer] Áudio finalizado');
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      console.error('[AudioPlayer] Erro ao carregar áudio:', audio.error?.code, audio.error?.message);
    };

    const handleCanPlay = () => {
      console.log('[AudioPlayer] Áudio pronto para reproduzir');
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [duration, isDragging]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        console.log('[AudioPlayer] Áudio pausado');
      } else {
        onPlay?.();
        console.log('[AudioPlayer] Iniciando reprodução:', audioUrl);
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        setIsPlaying(true);
        console.log('[AudioPlayer] Reprodução iniciada com sucesso');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[AudioPlayer] Erro ao reproduzir:', errorMsg);
      console.error('[AudioPlayer] URL:', audioUrl);
      console.error('[AudioPlayer] Audio tag:', audio);
      console.error('[AudioPlayer] Audio readyState:', audio.readyState);
      console.error('[AudioPlayer] Audio networkState:', audio.networkState);
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !audioRef.current) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * audioDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  // Generate fake waveform bars
  const bars = Array.from({ length: 40 }, (_, i) => {
    const h = Math.sin(i * 0.5) * 0.3 + Math.random() * 0.5 + 0.2;
    return Math.min(1, Math.max(0.1, h));
  });

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          crossOrigin="anonymous"
          controlsList="nodownload"
        />
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-vz-primary flex items-center justify-center text-white flex-shrink-0 hover:bg-vz-primary/90 transition-colors"
          aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <div className="flex-1">
          <div
            ref={progressRef}
            className="h-1.5 bg-[var(--border)] rounded-full cursor-pointer overflow-hidden"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-vz-primary rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={cn('flex justify-between text-xs mt-1', inverted ? 'text-white/80' : 'text-[var(--text-secondary)]')}>
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(audioDuration)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl p-4 bg-gradient-to-br from-vz-secondary/10 to-vz-primary/5',
        'border border-[var(--border)]',
        className
      )}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        crossOrigin="anonymous"
        controlsList="nodownload"
      />

      {/* Waveform visualization */}
      <div
        ref={progressRef}
        className="flex items-center gap-0.5 h-12 mb-3 cursor-pointer"
        onClick={handleProgressClick}
        role="slider"
        aria-label="Progresso do áudio"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        {bars.map((h, i) => {
          const barProgress = (i / bars.length) * 100;
          const isActive = barProgress <= progress;
          return (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-full transition-all duration-75',
                isActive ? 'bg-vz-primary' : 'bg-[var(--border)]'
              )}
              style={{ height: `${h * 100}%`, minHeight: '4px' }}
            />
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-vz-primary flex items-center justify-center text-white hover:bg-vz-primary/90 transition-all active:scale-95 shadow-lg shadow-vz-primary/30"
            aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {formatDuration(currentTime)}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              / {formatDuration(audioDuration)}
            </span>
          </div>
        </div>

        <button
          onClick={toggleMute}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
          aria-label={isMuted ? 'Ativar som' : 'Silenciar'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </div>
  );
};
