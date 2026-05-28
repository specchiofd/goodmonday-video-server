import { Composition, registerRoot } from 'remotion';
import { GoodMondayVideo } from './Video';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="GoodMondayVideo"
        component={GoodMondayVideo}
        durationInFrames={180 * 30}
        fps={30}
        width={1080}
        height={1920}
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
