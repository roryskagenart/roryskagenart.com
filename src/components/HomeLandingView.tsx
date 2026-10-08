import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Check,
  ChevronDown,
  Mail,
  MapPin,
  Maximize2,
  Palette,
  Ruler,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ArtworkRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import { InquiryModal } from './InquiryModal';
import { resolveAssetUrl } from '../data/assetResolver';
import { getArtworkSvg } from '../data/artAssets';
import { HeroGallerySlider, heroExcerpt } from './HeroGallerySlider';
import { LANDMARK_TRIPTYCH, STUDIO_TIMELINE, resolveImageUrl } from '../data/homeContent';

interface HomeLandingViewProps {
  onNavigate: (route: string, param?: string) => void;
  featuredArtworks: ArtworkRecord[];
  totalWorks: number;
}

/**
 * Statuses that mean "you can buy this". Everything else is shown as context, never as a
 * purchasable card — a gallery that prices a Sold work the same as an Available one teaches the
 * collector not to trust its labels.
 */
const FOR_SALE: ReadonlySet<string> = new Set(['Available', 'Limited Edition']);

/** Sort key that floats genuinely purchasable works to the top without reordering the rest. */
const saleRank = (a: ArtworkRecord): number => (FOR_SALE.has(a.status) ? 0 : 1);

const isPublic = (a: ArtworkRecord): boolean =>
  !a.trashed && !a.draft && a.enabled !== false && a.status !== 'Hidden' && a.status !== 'Disabled';

/**
 * The gallery-first home page.
 *
 * WHY THIS REPLACED THE OLD ONE
 * The previous layout was an *archive homage*: a 2-column feed of four 2010 works, a "2010 Archive
 * Spotlight" sidebar, a 5-column "Canonical 2010 Collections" grid, and a leftover filter/search bar
 * that only ever filtered those four hard-coded items. It answered "what did the studio do in 2010"
 * when the visitor's actual question is "what can I buy, and should I trust this person".
 *
 * This page answers that instead, in the order a collector asks it:
 *
 *   1. Hero            — what this is, in one line, with real numbers.
 *   2. Acquisition rail — what is available RIGHT NOW, priced, one click to inquire.
 *   3. The proof        — why the work is authentic and where it hangs (certificate, landmark).
 *   4. The story        — four decades, told as credentials rather than prose.
 *   5. The artist       — who he is, and what a commission looks like.
 *   6. Close            — the whole catalogue, and a commission enquiry.
 *
 * Two rules hold everywhere below:
 *  - A price is only shown as a price. Sold/archived works are labelled as such.
 *  - Every "buy" path ends in a real human contact (the inquiry modal), because that is how the
 *    studio actually sells — there is no checkout in this app.
 */
export const HomeLandingView: React.FC<HomeLandingViewProps> = ({
  onNavigate,
  featuredArtworks,
  totalWorks,
}) => {
  const { isAuthenticated } = useAuth();
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [selectedInquiryArtwork, setSelectedInquiryArtwork] = useState<ArtworkRecord | null>(null);
  const [lightboxArtwork, setLightboxArtwork] = useState<ArtworkRecord | null>(null);

  /**
   * The acquisition rail. Real catalogue records only — no hard-coded feature list — so the page
   * cannot drift from the studio's actual inventory, and works that sell simply stop appearing.
   */
  const availableWorks = useMemo(
    () =>
      featuredArtworks
        .filter(isPublic)
        .slice()
        .sort((a, b) => saleRank(a) - saleRank(b))
        .slice(0, 6),
    [featuredArtworks],
  );

  const availableCount = featuredArtworks.filter((a) => isPublic(a) && FOR_SALE.has(a.status)).length;

  const openInquiry = (artwork: ArtworkRecord | null) => {
    setSelectedInquiryArtwork(artwork);
    setLightboxArtwork(null);
    setInquiryModalOpen(true);
  };

  return (
    <div id="rory-skagen-home" className="pb-20 font-sans">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO — one full-bleed canvas; the slider IS the background.
      ────────────────────────────────────────────────────────────────*/}
      <section
        className="relative w-full min-h-[470px] sm:min-h-[540px] md:min-h-[600px] overflow-hidden bg-surface-deep"
        aria-label="The studio of Rory Skagen — Austin, Texas"
      >
        <HeroGallerySlider artworks={featuredArtworks} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Statement column */}
            <div className="lg:col-span-8 space-y-5">
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.28em] text-white/75"
              >
                <span className="h-px w-8 bg-amber-400" />
                <span>The studio of Rory Skagen — Austin, Texas</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="font-serif font-black uppercase tracking-tight leading-[0.95] text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
              >
                Original paintings,
                <br />
                sold from the studio
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="max-w-2xl text-sm sm:text-base leading-relaxed text-white/85"
              >
                Four decades of atomic Americana, Kaiju giants, neon supper clubs and landmark Texas
                murals — every enamel and canvas painted by hand, signed, and sold directly by the
                artist who made it.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="flex flex-wrap items-center gap-3 pt-1"
              >
                <a
                  href="#available-works"
                  className="px-6 py-3 bg-amber-500 text-black font-mono font-bold uppercase tracking-[0.18em] text-xs hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <span>Browse works for sale</span>
                  <ChevronDown className="w-4 h-4" />
                </a>
                <button
                  onClick={() => openInquiry(null)}
                  className="px-6 py-3 border border-white/35 text-white font-mono font-bold uppercase tracking-[0.18em] text-xs hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Commission a painting
                </button>
              </motion.div>
            </div>

            {/* Trust meta column — the numbers that make the claim checkable */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="lg:col-span-4 space-y-3 font-mono text-[11px] border-l border-white/25 pl-5 lg:pl-6"
            >
              {[
                { label: 'Works catalogued', value: String(totalWorks) },
                { label: 'Available now', value: String(availableCount) },
                { label: 'Studio est.', value: '1985' },
                { label: 'Landmark', value: 'Greetings from Austin' },
              ].map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4">
                  <span className="uppercase tracking-widest text-white/60">{row.label}</span>
                  <span className="text-right font-bold text-white">{row.value}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-16 sm:space-y-20 pt-14 sm:pt-16">
        {/* ─────────────────────────────────────────────────────────────
            2. THE ACQUISITION RAIL — what is for sale, right now.
        ────────────────────────────────────────────────────────────────*/}
        <section id="available-works" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-line-strong pb-3">
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground font-bold flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Available from the studio
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-foreground font-serif tracking-tight">
                Works for sale
              </h2>
            </div>
            <button
              onClick={() => onNavigate('gallery')}
              className="text-xs font-mono font-bold uppercase tracking-wider text-foreground hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <span>See all {totalWorks} works</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {availableWorks.length === 0 ? (
            <p className="text-sm text-muted-foreground font-mono py-8 text-center">
              The studio is between releases — <button onClick={() => openInquiry(null)} className="underline cursor-pointer hover:text-foreground">ask about what is on the easel</button>.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {availableWorks.map((art, idx) => (
                <ArtworkSaleCard
                  key={art.slug}
                  artwork={art}
                  index={idx}
                  onInspect={() => setLightboxArtwork(art)}
                  onInquire={() => openInquiry(art)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </section>

        {/* ─────────────────────────────────────────────────────────────
            3. WHY BUY HERE — the trust block. Every claim is one the
            studio can actually stand behind.
        ────────────────────────────────────────────────────────────────*/}
        <section className="border-y-2 border-line-strong py-12 sm:py-14 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground font-bold">
              Buying from the artist
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-foreground font-serif">
              No gallery, no markup, no middleman
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              These works are sold directly from the studio they were painted in. You are talking to
              the artist, and the paperwork says so.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: BadgeCheck,
                title: 'Signed & documented',
                body: 'Every original is signed by the artist and ships with a numbered certificate of authenticity naming the work, medium, dimensions and year.',
              },
              {
                icon: Palette,
                title: 'Painted by hand',
                body: 'Enamel on steel and panel, acrylic on board and canvas — no reproductions, no prints sold as originals. Each surface is a one-off.',
              },
              {
                icon: Truck,
                title: 'Crated & insured',
                body: 'Panels are custom-crated and insured for transit. Regional delivery around Austin and national freight are both arranged through the studio.',
              },
              {
                icon: Mail,
                title: 'You reach Rory',
                body: 'Enquiries land in the studio inbox and are answered by the artist or studio manager — not a sales team. Ask questions before you buy.',
              },
            ].map((item) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.45 }}
                className="bg-card border-2 border-line-strong p-5 shadow-sm space-y-3"
              >
                <item.icon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                <h3 className="font-serif font-black text-base uppercase tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
              </motion.div>
            ))}
          </div>

          {/* Provenance strip — the landmark, in three eras. This is the trust anchor: the
              single most photographed mural in Austin is by the same hand selling you a panel. */}
          <div className="pt-4 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground font-bold flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  The landmark behind the name
                </span>
                <h3 className="text-xl sm:text-2xl font-black uppercase text-foreground font-serif tracking-tight">
                  &ldquo;Greetings from Austin&rdquo; — 1998 to today
                </h3>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
                Co-created with Bill Johnston • Roadhouse Relics
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {LANDMARK_TRIPTYCH.map((photo, idx) => (
                <motion.figure
                  key={photo.src}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.55, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative overflow-hidden border-2 border-line-strong bg-card shadow-md transition-shadow hover:shadow-xl"
                >
                  <div className="relative aspect-4/3 overflow-hidden">
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading={idx === 0 ? 'eager' : 'lazy'}
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/80 backdrop-blur-xs text-white text-[9px] font-mono font-bold uppercase tracking-widest">
                      {photo.tag}
                    </span>
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <figcaption className="p-4 space-y-1 bg-surface">
                    <span className="block font-serif font-black text-sm uppercase tracking-tight text-foreground">
                      {photo.era}
                    </span>
                    <span className="block text-[11px] text-muted-foreground leading-relaxed">
                      {photo.caption}
                    </span>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            4. THE STORY, AS CREDENTIALS — four decades, four facts.
        ────────────────────────────────────────────────────────────────*/}
        <section className="space-y-8">
          <div className="border-b border-line-strong pb-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground block mb-1">
              Four decades of work
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-foreground font-serif">
              From hand-painted signs to public landmarks
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {STUDIO_TIMELINE.map((beat, idx) => (
              <motion.div
                key={beat.year}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                className="bg-card border-2 border-line-strong p-5 shadow-sm space-y-3"
              >
                <span className="inline-block px-2.5 py-1 bg-amber-500 text-black font-mono font-black text-xs uppercase tracking-widest">
                  {beat.year}
                </span>
                <h3 className="font-serif font-black text-base uppercase tracking-tight text-foreground leading-tight">
                  {beat.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{beat.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            5. THE ARTIST + COMMISSION PATH
        ────────────────────────────────────────────────────────────────*/}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-5">
            <div className="relative aspect-4/5 bg-surface-deep border-2 border-line-strong overflow-hidden">
              <img
                src={resolveImageUrl('Rory-Skagen-Photo.jpg', 'rory-skagen-photo')}
                alt="Artist Rory Skagen in the studio"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
              <div className="absolute bottom-0 inset-x-0 bg-black/75 backdrop-blur-xs text-white p-3 text-[10px] font-mono text-center uppercase tracking-widest">
                Rory Skagen • Painter &amp; public muralist
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground font-bold">
                The artist
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-foreground font-serif tracking-tight">
                Rory Skagen
              </h2>
              <p className="text-sm text-foreground/85 leading-relaxed">
                An American painter and public muralist working in Austin since 1985, Skagen merges
                1950s atomic pop culture, monster cinema and retro advertising into a single visual
                universe — the same eye that painted the city&apos;s best-known wall, applied to
                panels you can hang.
              </p>
            </div>

            <div className="bg-surface-deep border border-line p-5 space-y-4">
              <h3 className="font-mono font-bold uppercase tracking-wider text-sm text-foreground flex items-center gap-2 border-b border-line pb-2">
                <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Commissioning a work
              </h3>
              <ol className="space-y-3 text-xs text-foreground/85">
                {[
                  'Tell the studio the subject, the wall or room, and roughly what you want to spend.',
                  'Rory replies with a size, medium and price — enamel on panel for bold colour, canvas for large fields.',
                  'A deposit holds the slot; the studio gives you a sketch and a completion window.',
                  'The finished work ships crated and insured, with its certificate of authenticity.',
                ].map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex-none w-5 h-5 rounded-full bg-amber-500 text-black font-mono font-black text-[10px] flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
              <button
                onClick={() => openInquiry(null)}
                className="w-full py-3 bg-primary text-primary-foreground font-mono font-bold uppercase tracking-[0.2em] text-[11px] hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
              >
                <Mail className="w-3.5 h-3.5" />
                Start a commission enquiry
              </button>
              <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5" />
                Answered by the studio, usually within two business days
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            6. CLOSE — the full catalogue, and the acquisition FAQ.
        ────────────────────────────────────────────────────────────────*/}
        <section className="bg-card border-2 border-line-strong p-6 sm:p-10 shadow-lg space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[10px] font-mono uppercase tracking-widest font-bold">
                <Award className="w-3.5 h-3.5" />
                The complete catalogue
              </div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-foreground font-serif">
                {totalWorks} documented works, 1985 to today
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Original paintings, enamel on panel, studio editions and landmark public murals —
                each with medium, dimensions and provenance on record.
              </p>
            </div>

            <div className="flex-shrink-0 w-full md:w-auto text-center space-y-3">
              <button
                onClick={() => onNavigate('gallery')}
                className="w-full sm:w-auto px-8 py-3.5 bg-primary text-primary-foreground font-mono font-bold uppercase tracking-[0.2em] text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <span>Browse the catalogue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="text-[10px] font-mono text-muted-foreground">
                Open to collectors, curators, &amp; fine art enthusiasts
              </div>
            </div>
          </div>

          <div className="border-t border-line pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            {[
              {
                q: 'Can I see a work in person?',
                a: 'Yes — studio viewings in Austin are by appointment, and enquiries can request extra detail photography first.',
              },
              {
                q: 'How is a purchase completed?',
                a: 'The studio confirms availability, then invoices directly. Works ship only after payment clears and the crate is insured.',
              },
              {
                q: 'What about editions?',
                a: 'Studio editions are marked as such with their number. Anything labelled an original is a single, hand-painted work.',
              },
            ].map((item) => (
              <div key={item.q} className="space-y-1.5">
                <h3 className="font-mono font-bold uppercase tracking-wider text-foreground flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-none mt-0.5" />
                  {item.q}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          7. LIGHTBOX — high-resolution inspection before committing.
      ────────────────────────────────────────────────────────────────*/}
      {lightboxArtwork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-card border-2 border-line-strong p-4 sm:p-8 shadow-2xl overflow-y-auto flex flex-col md:flex-row gap-6">
            <button
              onClick={() => setLightboxArtwork(null)}
              className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-foreground bg-surface-deep border border-line p-1.5 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="md:w-3/5 bg-surface-deep border border-line flex items-center justify-center p-4 min-h-[300px]">
              <img
                src={
                  resolveAssetUrl(lightboxArtwork.featured_image, lightboxArtwork.slug, 'hero') ||
                  lightboxArtwork.imageUrl ||
                  getArtworkSvg(lightboxArtwork.slug)
                }
                alt={lightboxArtwork.title}
                referrerPolicy="no-referrer"
                className="max-h-[70vh] max-w-full object-contain"
              />
            </div>

            <div className="md:w-2/5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="border-b border-line pb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold block mb-1">
                    {lightboxArtwork.year} • {lightboxArtwork.status}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black uppercase text-foreground font-serif">
                    {lightboxArtwork.title}
                  </h3>
                </div>

                <div className="text-xs font-mono space-y-1 text-muted-foreground">
                  <div>
                    <strong className="text-foreground">Medium:</strong> {lightboxArtwork.medium}
                  </div>
                  <div>
                    <strong className="text-foreground">Dimensions:</strong> {lightboxArtwork.dimensions}
                  </div>
                  <div>
                    <strong className="text-foreground">Price:</strong> {lightboxArtwork.price}
                  </div>
                </div>

                {lightboxArtwork.narrative && (
                  <div className="pt-2 border-t border-line">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
                      Artist statement
                    </span>
                    {/*
                      The catalogue stores narratives as raw markdown — wiki-links, image embeds,
                      frontmatter fences. Piping that straight into a buyer's modal shows them
                      `[[index|← Return to Master Catalog Index]]` and `![[r.jpg]]`, which reads as a
                      broken page. `heroExcerpt` is the existing, tested cleaner for exactly this
                      scaffolding.
                    */}
                    <p className="text-xs sm:text-sm text-foreground/85 font-serif italic leading-relaxed line-clamp-[10]">
                      &ldquo;{heroExcerpt(lightboxArtwork.narrative)}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-line space-y-2">
                <button
                  onClick={() => openInquiry(lightboxArtwork)}
                  className="w-full py-3 bg-primary text-primary-foreground font-bold uppercase tracking-[0.2em] text-[11px] hover:opacity-90 transition-opacity cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Inquire about this work
                </button>

                <button
                  onClick={() => {
                    const slug = lightboxArtwork.slug;
                    setLightboxArtwork(null);
                    onNavigate('artwork', slug);
                  }}
                  className="w-full py-2 bg-surface-deep text-foreground font-mono font-bold uppercase tracking-wider text-[10px] border border-line hover:bg-muted transition-colors cursor-pointer"
                >
                  Open the full dossier →
                </button>
                {isAuthenticated && (
                  <div className="text-[10px] font-mono text-center text-muted-foreground pt-1">
                    <Maximize2 className="w-3 h-3 inline mr-1" />
                    Signed in as studio staff
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <InquiryModal
        artwork={selectedInquiryArtwork}
        isOpen={inquiryModalOpen}
        onClose={() => {
          setInquiryModalOpen(false);
          setSelectedInquiryArtwork(null);
        }}
      />
    </div>
  );
};

/**
 * A single purchasable work.
 *
 * The card leads with the painting, then title, then the three things a buyer needs before they
 * will email a stranger: size, medium, price. "Sold" and "Archived" are rendered as status, not as
 * a price, so the grid never implies something is buyable when it is not.
 */
const ArtworkSaleCard: React.FC<{
  artwork: ArtworkRecord;
  index: number;
  onInspect: () => void;
  onInquire: () => void;
  onNavigate: (route: string, param?: string) => void;
}> = ({ artwork, index, onInspect, onInquire, onNavigate }) => {
  const imageUrl =
    resolveAssetUrl(artwork.featured_image, artwork.slug, 'hero') ||
    artwork.imageUrl ||
    getArtworkSvg(artwork.slug);
  const forSale = FOR_SALE.has(artwork.status);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: (index % 3) * 0.08 }}
      className="group bg-card border-2 border-line-strong shadow-sm hover:shadow-xl transition-shadow flex flex-col"
    >
      <div
        onClick={onInspect}
        className="relative aspect-4/3 bg-surface-deep overflow-hidden cursor-pointer flex items-center justify-center p-4"
      >
        {/* Blurred ambience so non-matching aspect ratios never letterbox into dead space */}
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-30"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getArtworkSvg(artwork.slug);
          }}
        />
        <img
          src={imageUrl}
          alt={artwork.title}
          referrerPolicy="no-referrer"
          className="relative max-h-full max-w-full object-contain drop-shadow-xl transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute top-3 left-3">
          <span
            className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider ${
              forSale
                ? 'bg-emerald-600 text-white'
                : 'bg-black/75 text-white/90'
            }`}
          >
            {artwork.status}
          </span>
        </div>

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-mono text-xs font-bold uppercase tracking-widest">
          <Maximize2 className="w-4 h-4" />
          <span>Zoom &amp; inspect</span>
        </div>
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-line pb-2">
          <button
            onClick={() => onNavigate('artwork', artwork.slug)}
            className="text-left font-serif font-black text-lg uppercase tracking-tight text-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer leading-tight"
          >
            {artwork.title}
          </button>
          <span className="font-mono font-bold text-sm text-foreground whitespace-nowrap flex-none">
            {forSale ? artwork.price : '—'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Ruler className="w-3 h-3" />
            {artwork.dimensions}
          </span>
          <span className="truncate">{artwork.medium}</span>
        </div>

        <div className="pt-2 mt-auto flex items-center gap-2">
          {forSale ? (
            <button
              onClick={onInquire}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-mono font-bold uppercase tracking-wider text-[11px] hover:opacity-90 transition-opacity cursor-pointer"
            >
              Inquire to purchase
            </button>
          ) : (
            <button
              onClick={() => onNavigate('artwork', artwork.slug)}
              className="flex-1 px-4 py-2 bg-surface-deep border border-line text-foreground font-mono font-bold uppercase tracking-wider text-[11px] hover:bg-muted transition-colors cursor-pointer"
            >
              View the dossier
            </button>
          )}
          <button
            onClick={onInspect}
            aria-label={`Inspect ${artwork.title}`}
            className="px-3 py-2 bg-surface-deep border border-line text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.article>
  );
};
