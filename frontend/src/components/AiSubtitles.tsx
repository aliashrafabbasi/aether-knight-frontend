import { useEffect, useMemo, useRef, useState } from "react";

interface AiSubtitlesProps {
  text: string;
  audioElement: HTMLAudioElement | null;
  playing: boolean;
}

function tokenize(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

export function AiSubtitles({ text, audioElement, playing }: AiSubtitlesProps) {
  const [revealed, setRevealed] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const words = useMemo(() => tokenize(text), [text]);

  useEffect(() => {
    setRevealed(0);
  }, [text]);

  useEffect(() => {
    if (audioElement) audioRef.current = audioElement;
  }, [audioElement]);

  useEffect(() => {
    if (!playing) return;

    const audio = audioRef.current;
    if (!audio) return;

    let raf = 0;

    const syncWords = () => {
      const dur = audio.duration;
      if (!dur || !Number.isFinite(dur) || dur <= 0) {
        raf = requestAnimationFrame(syncWords);
        return;
      }

      const t = audio.currentTime;
      if (t <= 0.05) {
        setRevealed(0);
      } else {
        const progress = Math.min(1, t / dur);
        const target = Math.min(words.length, Math.ceil(progress * words.length));
        setRevealed((prev) => (target > prev ? target : prev));
      }

      if (!audio.paused && !audio.ended) {
        raf = requestAnimationFrame(syncWords);
      }
    };

    const onPlay = () => {
      setRevealed(0);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncWords);
    };

    audio.addEventListener("play", onPlay);
    if (!audio.paused) {
      raf = requestAnimationFrame(syncWords);
    }

    return () => {
      cancelAnimationFrame(raf);
      audio.removeEventListener("play", onPlay);
    };
  }, [playing, words.length, text, audioElement]);

  const showCursor = playing && revealed < words.length;

  if (revealed === 0 && !playing) return null;

  return (
    <div className="pointer-events-none w-full max-w-xl sm:max-w-2xl" aria-live="polite">
      <div className="relative pl-3">
        <span
          className="absolute left-0 top-0 h-full w-px rounded-full bg-gradient-to-b from-transparent via-pink-400/70 to-transparent"
          aria-hidden
        />
        <p className="font-body text-sm leading-relaxed sm:text-base md:text-lg">
          {words.slice(0, revealed).map((word, i) => (
            <span key={`w-${i}`} className="subtitle-word inline text-white/90">
              {word}
            </span>
          ))}
          {showCursor && (
            <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-pink-300/90 align-middle" />
          )}
        </p>
      </div>
    </div>
  );
}
