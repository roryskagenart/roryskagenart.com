import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ArtworkRecord } from '../types';
import { getArtworkSvg } from '../data/artAssets';

/**
 * First readable prose line of a narrative, with markdown scaffolding stripped.
 */
export function heroExcerpt(narrative: string): string {
  const line = narrative
    .split('\n')
    .map((l) => l.trim())
    .find(
      (l) =>
        l.length > 40 &&
        !l.startsWith('#') &&
        !l.startsWith('>') &&
        !l.startsWith('![') &&
        !l.startsWith('|') &&
        !l.startsWith('---') &&
        !l.startsWith('![[') &&
        !l.startsWith('[') &&
        !l.startsWith('←') &&
        !/return to (master )?(catalog|index)/i.test(l)
    );
  if (!line) return 'Curated masterwork in the retro-pop surrealist archive of Austin artist Rory Skagen.';
  return line
    .replace(/!\[\[[^\]]*\]\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_, _target, label) => label || _target)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_{2}([^_]+)_{2}/g, '$1')
    .trim();
}

interface HeroGallerySliderProps {
  artworks: ArtworkRecord[];
}

/**
 * Hero background slider — a pure ambient layer, designed to sit absolute
 * behind the home masthead. The current artwork cover-crops the full
 * container (no letterbox gaps for any aspect ratio), with a gradient wash so
 * overlaid text always reads. No artwork meta card: this is atmosphere, not a
 * detail view.
 *
 * MOTION — the "focus pull". Each slide arrives soft and resolves to sharp:
 *   - opacity  0 → 1   (crossfade between works)
 *   - blur    12px → 0 (the painting comes into focus)
 *   - scale  1.07 → 1  (a slow settle, so it never sits perfectly still)
 *
 * The blur resolves across `FOCUS_IN_MS` at the head of the slide, then holds
 * at 0 for the remainder of the dwell — so the work is RAZOR SHARP for most of
 * the time it is on screen, and softness only ever reads as an entrance. The
 * scale keeps easing over the whole dwell (linear, ~8s), which is what stops
 * the image looking frozen once it is in focus.
 *
 * ⚠️ Blur is deliberately NOT a persistent class. `blur-[6px]` used to sit in
 * the className, which meant the hero was permanently out of focus and no
 * artwork was ever presented at full fidelity — on a page whose job is to sell
 * the work, that is the wrong default. The keyframes below end at blur(0).
 */
const FOCUS_IN_MS = 1800;

/** Slide dwell. Long enough that the zoom reads as a drift, not a movement. */
const SLIDE_DURATION = 7000;

/**
 * The focus-pull endpoints, exported so the test asserts the REAL contract
 * rather than a hand-copied duplicate. jsdom has no Web Animations API and
 * framer-motion drives values on rAF, so a rendered-element assertion cannot
 * see the timeline — the module itself is the reliable source of truth.
 *
 * ⚠️ These must be a two-value pair. A 3-stop keyframe array with a per-property
 * `times` list did NOT interpolate and pinned the hero at HERO_BLUR_SOFT forever.
 */
export const HERO_BLUR_SOFT = 'blur(12px)';
export const HERO_BLUR_SHARP = 'blur(0px)';
export const HERO_FOCUS_IN_MS = FOCUS_IN_MS;
export const HERO_SLIDE_DURATION_MS = SLIDE_DURATION;
export const HeroGallerySlider: React.FC<HeroGallerySliderProps> = ({ artworks }) => {
  const heroItems = React.useMemo(() => {
    const valid = artworks.filter(
      (item) => item.heroSlider === true && item.enabled !== false && !item.trashed && item.status !== 'Hidden' && item.draft !== true
    );
    if (valid.length > 0) return valid;
    return artworks
      .filter((item) => item.enabled !== false && !item.trashed && item.status !== 'Hidden' && item.draft !== true)
      .slice(0, 6);
  }, [artworks]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const totalSlides = heroItems.length;

  const goToSlide = useCallback((index: number) => {
    if (totalSlides === 0) return;
    setCurrentIndex((index + totalSlides) % totalSlides);
  }, [totalSlides]);

  const nextSlide = useCallback(() => goToSlide(currentIndex + 1), [goToSlide, currentIndex]);
  const prevSlide = useCallback(() => goToSlide(currentIndex - 1), [goToSlide, currentIndex]);

  useEffect(() => {
    if (isPlaying && !isHovered && totalSlides > 1) {
      timerRef.current = setInterval(() => nextSlide(), SLIDE_DURATION);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isHovered, totalSlides, nextSlide]);

  useEffect(() => {
    if (currentIndex >= totalSlides && totalSlides > 0) setCurrentIndex(0);
  }, [currentIndex, totalSlides]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) nextSlide();
    else if (distance < -50) prevSlide();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prevSlide();
    else if (e.key === 'ArrowRight') nextSlide();
  };

  if (totalSlides === 0) return null;

  const currentArtwork = heroItems[currentIndex];
  const heroSrc =
    currentArtwork.renditions?.hero?.url || currentArtwork.imageUrl || getArtworkSvg(currentArtwork.slug);

  return (
    <div
      id="hero-gallery-slider-container"
      className="absolute inset-0 overflow-hidden bg-surface-deep select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="presentation"
      aria-label="Featured artwork backdrop"
    >
      {/* Crossfading cover-cropped artwork backdrops.
          ⚠️ `initial={false}` would suppress the mount animation for the FIRST
          slide only; leaving it off lets the opening artwork perform its focus
          pull like every other rotation. */}
      <AnimatePresence initial={true}>
        <motion.div
          key={currentArtwork.slug}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {/* The artwork itself — cover-crops the container: works for
              portrait, landscape, square, panoramic.

              The focus pull: blur eases 12px → 0 over FOCUS_IN_MS at the head of
              the slide, then STAYS sharp. `scale` keeps easing linearly across
              the whole dwell so the image still breathes once focused.

              ⚠️ Blur is a plain two-value `initial`→`animate` pair, NOT a
              keyframe array. A 3-stop array with a per-property `times` list
              does not interpolate here — it left the hero pinned at blur(12px)
              permanently, worse than the static blur it replaced. Verified by
              tracing the inline filter on mount; keep this shape. */}
          <motion.img
            src={heroSrc}
            alt=""
            aria-hidden="true"
            initial={{ scale: 1.07, filter: HERO_BLUR_SOFT }}
            animate={{ scale: 1, filter: HERO_BLUR_SHARP }}
            transition={{
              scale: { duration: SLIDE_DURATION / 1000 + 1, ease: 'linear' },
              filter: { duration: FOCUS_IN_MS / 1000, ease: 'easeOut' },
            }}
            className="absolute inset-0 w-full h-full object-cover brightness-90 dark:brightness-[0.72]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getArtworkSvg(currentArtwork.slug);
            }}
          />
          {/* Readability wash — strongest bottom-left where the masthead sits */}
          <div className="absolute inset-0 bg-linear-to-tr from-black/70 via-black/35 to-black/20" />
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/55 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* ── Ghost arrows (hover only) ── */}
      <button
        onClick={prevSlide}
        className={`absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-white/25 bg-black/25 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer ${
          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } hover:bg-black/50`}
        aria-label="Previous artwork"
      >
        <ChevronLeft className="w-4.5 h-4.5" />
      </button>
      <button
        onClick={nextSlide}
        className={`absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-white/25 bg-black/25 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer ${
          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } hover:bg-black/50`}
        aria-label="Next artwork"
      >
        <ChevronRight className="w-4.5 h-4.5" />
      </button>

      {/* ── Play/pause (top-right) ── */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full border border-white/25 bg-black/25 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/50 transition-colors cursor-pointer"
        aria-label={isPlaying ? 'Pause autoplay' : 'Start autoplay'}
        title={isPlaying ? 'Pause autoplay' : 'Start autoplay'}
      >
        {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </button>

      {/* ── Slide name + dot strip (bottom-right, inside the canvas) ── */}
      {totalSlides > 1 && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3">
          {/* Active slide name pill */}
          <AnimatePresence mode="wait">
            <motion.span
              key={currentArtwork.slug}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35 }}
              className="hidden sm:inline-flex max-w-[220px] items-center rounded-full border border-white/25 bg-black/35 backdrop-blur-md px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest text-white/90 truncate"
            >
              {currentArtwork.title}
            </motion.span>
          </AnimatePresence>
          {heroItems.map((item, idx) => {
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={item.slug}
                onClick={() => goToSlide(idx)}
                aria-label={`Jump to ${item.title}`}
                className="relative h-1.5 rounded-full overflow-hidden cursor-pointer transition-all duration-300"
                style={{ width: isCurrent ? 'clamp(40px, 6vw, 72px)' : '10px', backgroundColor: isCurrent ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.45)' }}
              >
                {isCurrent && isPlaying && !isHovered && (
                  <span
                    key={`progress-${currentIndex}`}
                    className="absolute inset-y-0 left-0 bg-amber-400"
                    style={{ animation: 'heroProgress 7s linear forwards' }}
                  />
                )}
                {isCurrent && (!isPlaying || isHovered) && (
                  <span className="absolute inset-0 bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes heroProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};
