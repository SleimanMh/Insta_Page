import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { Band, Contact, Estimate, Expertise, Footer, Header, Work } from './components/Sections';
import { ScrollProgress, usePointerFx } from './motion/fx';
import { Story } from './components/Story';
import { story } from './story/controller';

export default function App() {
  const snap = useSyncExternalStore(story.subscribe, story.getSnapshot);
  const [needs, setNeeds] = useState('');
  usePointerFx();
  useLayoutEffect(() => {
    document.documentElement.dataset.layout = snap.mode;
    document.documentElement.dataset.motion = snap.reduce ? 'reduce' : 'full';
  }, [snap.mode, snap.reduce]);
  return (
    <>
      <a className="skip-link" href="#work">Skip to our work</a>
      <ScrollProgress />
      <Header />
      <main>
        <Story />
        <Band />
        <Work />
        <Expertise />
        <Estimate onRequest={setNeeds} />
        <Contact needs={needs} />
      </main>
      <Footer />
    </>
  );
}
