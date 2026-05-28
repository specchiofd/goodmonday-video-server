import { Composition, registerRoot } from 'remotion';
import { GoodMondayVideo } from './Video';

const FPS = 18;
const INTRO_SECONDS = 15;
const OUTRO_SECONDS = 30;
const MAX_SECONDS = 180;

const getDurationInFrames = (props: { script?: { notizie?: unknown[] } }) => {
  const newsCount = Math.max(1, props.script?.notizie?.length || 1);
  const newsSeconds = Math.min(30, Math.floor((MAX_SECONDS - INTRO_SECONDS - OUTRO_SECONDS) / newsCount));

  return (INTRO_SECONDS + newsSeconds * newsCount + OUTRO_SECONDS) * FPS;
};

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="GoodMondayVideo"
        component={GoodMondayVideo}
        durationInFrames={MAX_SECONDS * FPS}
        fps={FPS}
        width={1080}
        height={1920}
        calculateMetadata={({ props }) => ({
          durationInFrames: getDurationInFrames(props),
        })}
        defaultProps={{
          script: {
            intro: 'Ciao a tutti! Benvenuti a GoodMonday!',
            notizie: [
              {
                testo: 'Prima notizia di esempio.',
                citazione_voce: 'Come ci racconta la NASA!',
                durata: '30 secondi',
              },
            ],
            outro: 'Grazie per averci seguito! A lunedì prossimo!',
          },
          audioPath: '',
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
