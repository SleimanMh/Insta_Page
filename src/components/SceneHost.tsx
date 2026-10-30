import { Component, ReactNode, Suspense, lazy, useCallback, useEffect, useState } from 'react';

// The 3D scene is the heaviest part of the page. The HTML renders first; three.js is fetched
// once the browser is idle, and only if WebGL is available. Until then (or without WebGL)
// an intentional static drawing of the prism stands in.

const Scene = lazy(() => import('../three/Scene'));

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

export function SceneHost() {
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!webglAvailable()) { setFailed(true); return; }
    const go = () => setLoad(true);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 900 }); else setTimeout(go, 200);
  }, []);

  const onReady = useCallback(() => setReady(true), []);

  return (
    <>
      <svg className={`poster${ready ? ' is-hidden' : ''}${failed ? ' is-fallback' : ''}`} viewBox="0 0 420 300" aria-hidden="true">
        <defs>
          <linearGradient id="pEdge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F3E3C6" /><stop offset="1" stopColor="#8E7E6A" /></linearGradient>
          <linearGradient id="pBeam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".55" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        </defs>
        <path d="M0 178 420 136" stroke="url(#pBeam)" strokeWidth="1.4" />
        <g fill="rgba(255,255,255,.03)" stroke="url(#pEdge)" strokeWidth="1.1" strokeLinejoin="round">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <path key={i} d={`M${200 + i * 16} ${58 + i * 6} L${262 + i * 16} ${196 + i * 4} L${138 + i * 16} ${214 + i * 3}Z`} opacity={1 - i * .13} />
          ))}
        </g>
      </svg>
      {load && !failed && (
        <Suspense fallback={null}>
          <ErrorCatcher onError={() => setFailed(true)}><Scene onReady={onReady} /></ErrorCatcher>
        </Suspense>
      )}
    </>
  );
}

// If the WebGL context cannot be created after all, fall back to the static drawing.
class ErrorCatcher extends Component<{ onError: () => void; children: ReactNode }, { bad: boolean }> {
  state = { bad: false };
  static getDerivedStateFromError() { return { bad: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.bad ? null : this.props.children; }
}
