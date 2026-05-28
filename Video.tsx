import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

interface Notizia {
  testo: string;
  citazione_voce: string;
  durata: string;
}

interface Script {
  intro: string;
  notizie: Notizia[];
  outro: string;
}

interface Props {
  script: Script;
  audioPath: string;
}

// Colori GoodMonday
const COLORS = {
  sfondo: '#0a0a2e',
  blu_tg24: '#003087',
  rosso_accento: '#e63946',
  bianco: '#ffffff',
  giallo: '#ffd60a',
  verde: '#2dc653',
  grigio_scuro: '#1a1a3e',
};

// Animazione fade + slide dal basso
const FadeSlideIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  from?: 'bottom' | 'left';
}> = ({ children, delay = 0, from = 'bottom' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.5 },
  });

  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateY = from === 'bottom'
    ? interpolate(progress, [0, 1], [60, 0])
    : interpolate(progress, [0, 1], [0, 0]);

  const translateX = from === 'left'
    ? interpolate(progress, [0, 1], [-80, 0])
    : 0;

  return (
    <div style={{ opacity, transform: `translateY(${translateY}px) translateX(${translateX}px)` }}>
      {children}
    </div>
  );
};

// Barra rossa scorrevole in basso (stile TG24)
const BarraScorrevole: React.FC<{ testo: string }> = ({ testo }) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 300], [1080, -testo.length * 18], {
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{
      position: 'absolute',
      bottom: 120,
      left: 0,
      right: 0,
      backgroundColor: COLORS.rosso_accento,
      height: 56,
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
    }}>
      <div style={{
        transform: `translateX(${x}px)`,
        whiteSpace: 'nowrap',
        color: COLORS.bianco,
        fontSize: 28,
        fontWeight: 700,
        fontFamily: 'Arial, sans-serif',
        letterSpacing: 1,
      }}>
        {testo}
      </div>
    </div>
  );
};

// Logo GoodMonday in alto
const Logo: React.FC = () => (
  <div style={{
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  }}>
    <div style={{
      backgroundColor: COLORS.verde,
      borderRadius: 12,
      padding: '12px 32px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <span style={{ fontSize: 40 }}>🌟</span>
      <span style={{
        color: COLORS.bianco,
        fontSize: 42,
        fontWeight: 900,
        fontFamily: 'Arial Black, Arial, sans-serif',
        letterSpacing: 2,
      }}>
        GOOD MONDAY
      </span>
      <span style={{ fontSize: 40 }}>🌟</span>
    </div>
  </div>
);

// Bebè giornalista (emoji animata)
const BebeGiornalista: React.FC<{ parlando?: boolean }> = ({ parlando = false }) => {
  const frame = useCurrentFrame();
  const rimbalzo = parlando
    ? Math.sin(frame * 0.3) * 8
    : Math.sin(frame * 0.1) * 4;

  return (
    <div style={{
      position: 'absolute',
      bottom: 220,
      left: '50%',
      transform: `translateX(-50%) translateY(${rimbalzo}px)`,
      textAlign: 'center',
    }}>
      {/* Scrivania */}
      <div style={{
        backgroundColor: COLORS.blu_tg24,
        borderRadius: '50% 50% 0 0',
        width: 600,
        height: 120,
        position: 'absolute',
        bottom: -20,
        left: '50%',
        transform: 'translateX(-50%)',
        boxShadow: '0 -4px 20px rgba(0,48,135,0.5)',
      }} />
      {/* Bebè */}
      <div style={{ fontSize: 180, lineHeight: 1, position: 'relative', zIndex: 1 }}>
        👶
      </div>
      {/* Microfono */}
      <div style={{
        fontSize: 60,
        position: 'absolute',
        bottom: 80,
        right: -20,
        zIndex: 2,
      }}>
        🎙️
      </div>
    </div>
  );
};

// Schermata di una notizia
const SchermaNotizia: React.FC<{
  notizia: Notizia;
  numero: number;
  totale: number;
}> = ({ notizia, numero, totale }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.sfondo }}>
      {/* Sfondo sfumato */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 30%, ${COLORS.grigio_scuro} 0%, ${COLORS.sfondo} 70%)`,
      }} />

      <Logo />

      {/* Numero notizia */}
      <FadeSlideIn delay={5} from="left">
        <div style={{
          position: 'absolute',
          top: 180,
          left: 60,
          backgroundColor: COLORS.giallo,
          borderRadius: 50,
          width: 72,
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: COLORS.sfondo }}>
            {numero}
          </span>
        </div>
      </FadeSlideIn>

      {/* Testo notizia */}
      <div style={{
        position: 'absolute',
        top: 260,
        left: 60,
        right: 60,
      }}>
        <FadeSlideIn delay={8}>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '32px 40px',
            borderLeft: `6px solid ${COLORS.verde}`,
          }}>
            <p style={{
              color: COLORS.bianco,
              fontSize: 44,
              fontWeight: 700,
              fontFamily: 'Arial, sans-serif',
              lineHeight: 1.4,
              margin: 0,
            }}>
              {notizia.testo}
            </p>
            <p style={{
              color: COLORS.giallo,
              fontSize: 34,
              fontStyle: 'italic',
              margin: '20px 0 0 0',
              fontFamily: 'Arial, sans-serif',
            }}>
              {notizia.citazione_voce}
            </p>
          </div>
        </FadeSlideIn>
      </div>

      <BebeGiornalista parlando={true} />

      <BarraScorrevole
        testo={`NOTIZIA ${numero} DI ${totale}  •  BUONE NOTIZIE DELLA SETTIMANA  •  GOOD MONDAY  •  `}
      />

      {/* Barra blu in basso */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: COLORS.blu_tg24, height: 120,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          color: COLORS.bianco, fontSize: 28,
          fontFamily: 'Arial, sans-serif', letterSpacing: 3,
          textTransform: 'uppercase',
        }}>
          goodmonday.it  •  ogni lunedì alle 8:00
        </span>
      </div>
    </AbsoluteFill>
  );
};

// Schermata intro
const SchermaIntro: React.FC<{ testo: string }> = ({ testo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const scaleValue = interpolate(scale, [0, 1], [0.8, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.sfondo }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 40%, ${COLORS.blu_tg24} 0%, ${COLORS.sfondo} 70%)`,
      }} />

      {/* Logo grande */}
      <div style={{
        position: 'absolute', top: 140,
        left: '50%', transform: `translateX(-50%) scale(${scaleValue})`,
        textAlign: 'center', width: '100%',
      }}>
        <div style={{ fontSize: 120 }}>🌟</div>
        <div style={{
          color: COLORS.bianco, fontSize: 80, fontWeight: 900,
          fontFamily: 'Arial Black, Arial, sans-serif',
          letterSpacing: 4, marginTop: 16,
        }}>
          GOOD MONDAY
        </div>
        <div style={{
          color: COLORS.giallo, fontSize: 36,
          fontFamily: 'Arial, sans-serif', marginTop: 8, letterSpacing: 2,
        }}>
          Le buone notizie della settimana
        </div>
      </div>

      <BebeGiornalista parlando={true} />

      {/* Testo intro */}
      <FadeSlideIn delay={20}>
        <div style={{
          position: 'absolute', bottom: 200,
          left: 60, right: 60,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 20, padding: '28px 40px',
          textAlign: 'center',
        }}>
          <p style={{
            color: COLORS.bianco, fontSize: 40,
            fontFamily: 'Arial, sans-serif',
            lineHeight: 1.4, margin: 0,
          }}>
            {testo}
          </p>
        </div>
      </FadeSlideIn>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: COLORS.verde, height: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          color: COLORS.bianco, fontSize: 32, fontWeight: 700,
          fontFamily: 'Arial, sans-serif', letterSpacing: 2,
        }}>
          🎙️ IN ONDA OGNI LUNEDÌ ALLE 8:00 🎙️
        </span>
      </div>
    </AbsoluteFill>
  );
};

// Schermata outro
const SchermaOutro: React.FC<{ testo: string }> = ({ testo }) => (
  <AbsoluteFill style={{ backgroundColor: COLORS.sfondo }}>
    <div style={{
      position: 'absolute', inset: 0,
      background: `radial-gradient(ellipse at 50% 40%, ${COLORS.verde}33 0%, ${COLORS.sfondo} 70%)`,
    }} />
    <Logo />
    <BebeGiornalista parlando={false} />
    <FadeSlideIn delay={10}>
      <div style={{
        position: 'absolute', bottom: 200,
        left: 60, right: 60,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20, padding: '28px 40px',
        textAlign: 'center',
      }}>
        <p style={{
          color: COLORS.bianco, fontSize: 40,
          fontFamily: 'Arial, sans-serif',
          lineHeight: 1.4, margin: 0,
        }}>
          {testo}
        </p>
        <p style={{
          color: COLORS.giallo, fontSize: 36,
          fontFamily: 'Arial, sans-serif', marginTop: 20,
        }}>
          💚 Torna lunedì prossimo! 💚
        </p>
      </div>
    </FadeSlideIn>
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: COLORS.blu_tg24, height: 120,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{
        color: COLORS.bianco, fontSize: 28,
        fontFamily: 'Arial, sans-serif', letterSpacing: 3,
      }}>
        goodmonday.it  •  ogni lunedì alle 8:00
      </span>
    </div>
  </AbsoluteFill>
);

// Componente principale
export const GoodMondayVideo: React.FC<Props> = ({ script, audioPath }) => {
  const FPS = 30;
  const DURATA_INTRO = 15 * FPS;
  const DURATA_NOTIZIA = 30 * FPS;
  const DURATA_OUTRO = 30 * FPS;

  return (
    <AbsoluteFill>
      {/* Audio voce */}
      {audioPath && <Audio src={audioPath} />}

      {/* Intro */}
      <Sequence from={0} durationInFrames={DURATA_INTRO}>
        <SchermaIntro testo={script.intro} />
      </Sequence>

      {/* Notizie */}
      {script.notizie.map((notizia, i) => (
        <Sequence
          key={i}
          from={DURATA_INTRO + i * DURATA_NOTIZIA}
          durationInFrames={DURATA_NOTIZIA}
        >
          <SchermaNotizia
            notizia={notizia}
            numero={i + 1}
            totale={script.notizie.length}
          />
        </Sequence>
      ))}

      {/* Outro */}
      <Sequence
        from={DURATA_INTRO + script.notizie.length * DURATA_NOTIZIA}
        durationInFrames={DURATA_OUTRO}
      >
        <SchermaOutro testo={script.outro} />
      </Sequence>
    </AbsoluteFill>
  );
};
