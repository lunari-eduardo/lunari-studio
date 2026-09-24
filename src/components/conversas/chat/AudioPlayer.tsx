import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCw, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AudioPlayerProps {
  src: string;
  isOwn?: boolean;
}

export function AudioPlayer({ src, isOwn = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Formata segundos em MM:SS
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs === Infinity) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  // Trata carregamento e duração (com hack especial para OGG Opus do WhatsApp)
  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsLoading(false);
    setIsError(false);

    // No WhatsApp, áudios Ogg/Opus gravados em streaming vêm com duration = Infinity ou NaN
    if (audio.duration === Infinity || isNaN(audio.duration)) {
      audio.currentTime = 1e101;
      const onTimeUpdateTemp = () => {
        audio.removeEventListener('timeupdate', onTimeUpdateTemp);
        if (audio.duration && audio.duration !== Infinity) {
          setDuration(audio.duration);
        }
        audio.currentTime = 0;
      };
      audio.addEventListener('timeupdate', onTimeUpdateTemp);
    } else {
      setDuration(audio.duration);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsLoading(true);
    setIsError(false);
    setIsPlaying(false);
    setCurrentTime(0);

    const onCanPlay = () => {
      setIsLoading(false);
      setIsError(false);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && audio.duration !== Infinity) {
        setDuration(prev => (prev > 0 ? prev : audio.duration));
      }
    };

    const onPlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const onError = () => {
      setIsLoading(false);
      setIsError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    // Se o áudio já estiver em cache/pronto
    if (audio.readyState >= 2) {
      setIsLoading(false);
      if (audio.duration && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [src, handleLoadedMetadata]); // NOTA: duration removido das dependências para evitar re-trigger do loading

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || isError) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(false);
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Erro ao reproduzir áudio:', err);
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    audio.playbackRate = nextSpeed;
    setPlaybackRate(nextSpeed);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5 py-1 px-1 min-w-[240px] max-w-[320px]">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
      />

      {/* Botão Play / Pause com identidade Lunari (dourado / grafite) */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={isError}
        aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
        className={cn(
          'h-10 w-10 shrink-0 rounded-full flex items-center justify-center shadow-sm transition-all',
          'bg-[#C9A87C] text-white hover:bg-[#b89567] active:scale-95',
          isError && 'opacity-50 cursor-not-allowed bg-zinc-400'
        )}
      >
        {isLoading ? (
          <RotateCw className="h-4 w-4 animate-spin text-white" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4 fill-white" />
        ) : (
          <Play className="h-4 w-4 fill-white ml-0.5" />
        )}
      </button>

      {/* Área da barra de progresso e tempos */}
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="relative flex items-center h-4 w-full">
          {/* Barra de fundo */}
          <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C9A87C] rounded-full transition-all duration-75"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {/* Input range invisível para arrastar/clicar */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            disabled={isError || duration === 0}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* Linha de tempo e status */}
        <div className="flex items-center justify-between mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 select-none font-mono">
          <span>{isPlaying || currentTime > 0 ? formatTime(currentTime) : formatTime(duration)}</span>
          
          {isError ? (
            <span className="text-red-500 font-sans font-medium text-[11px]">Erro ao carregar</span>
          ) : (
            <div className="flex items-center gap-1.5">
              <Volume2 className="h-3 w-3 text-zinc-400/80 dark:text-zinc-500" />
            </div>
          )}
        </div>
      </div>

      {/* Botão de Velocidade (1x / 1.5x / 2x) */}
      <button
        type="button"
        onClick={toggleSpeed}
        className="shrink-0 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-300 transition-colors select-none"
        title="Velocidade de reprodução"
      >
        {playbackRate}x
      </button>
    </div>
  );
}
