import { useEffect, useRef, useState } from 'react';
import { startHalden } from './halden-stage';
import type { Part, Pose } from './halden-stage';

/** Dev-only page that renders one pose of the camera on a clear background, for source-3d/render-stills.mjs to capture. */
export function HaldenStill() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const n = (key: string, fallback: number) => Number(query.get(key) ?? fallback);
    const pose: Pose = { yaw: n('yaw', 0), pitch: n('pitch', 0), explode: n('explode', 0), distance: n('distance', 5), x: n('x', 0), y: n('y', 0) };
    const hide = (query.get('hide')?.split(',').filter(Boolean) ?? []) as Part[];
    // Wait two frames after load so the environment map has landed before the capture.
    return startHalden(canvas.current!, [], [pose], { reduced: true, spin: () => 0, hide, onReady: () => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => setReady(true), 400))) });
  }, []);
  return <canvas ref={canvas} data-ready={ready || undefined} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }} />;
}
