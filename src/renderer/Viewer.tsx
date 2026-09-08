import { useEffect, useRef, useState } from 'react';
import { Focus, Grid2X2, Sun, Moon, Pause, Play, RotateCcw, Box, LoaderCircle } from 'lucide-react';
import { assetUrl, type Asset } from '../shared/contracts';
import { PreviewScene } from './scene';
export function Viewer({ asset }: { asset: Asset }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    host = useRef<HTMLDivElement>(null),
    scene = useRef<PreviewScene | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [error, setError] = useState(''),
    [wire, setWire] = useState(false),
    [dark, setDark] = useState(false),
    [playing, setPlaying] = useState(false),
    [clips, setClips] = useState<string[]>([]),
    [stats, setStats] = useState({ vertices: 0, triangles: 0 }),
    [attempt, setAttempt] = useState(0);
  const previewSupported =
    ['glb', 'gltf'].includes(asset.format) && asset.size <= 256 * 1024 * 1024;
  useEffect(() => {
    setState('loading');
    setWire(false);
    setDark(false);
    setPlaying(false);
    setClips([]);
    if (!previewSupported) {
      setState('failed');
      setError(
        asset.previewError ||
          (!['glb', 'gltf'].includes(asset.format)
            ? 'This format has no 3D preview yet. You can still review it or reveal the source file.'
            : 'Asset exceeds the 256 MB preview limit.'),
      );
      return;
    }
    let instance: PreviewScene,
      raf = 0,
      disposed = false,
      observer: ResizeObserver | undefined;
    const fail = (message: string) => {
      if (disposed) return;
      setError(message.replace(/data:[^"'\s]+/g, '[embedded data]').slice(0, 2000));
      setState('failed');
      cancelAnimationFrame(raf);
      instance?.dispose();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      fail('The graphics context was lost. Retry the viewer.');
    };
    const timer = setTimeout(
      () => fail('Loading timed out after 30 seconds. You can retry the preview.'),
      30000,
    );
    try {
      instance = new PreviewScene(canvas.current!);
      scene.current = instance;
      observer = new ResizeObserver(([entry]) => {
        if (!instance.disposed) {
          instance.resize(entry.contentRect.width, entry.contentRect.height);
          instance.render(0);
        }
      });
      observer.observe(host.current!);
      instance.resize(host.current!.clientWidth, host.current!.clientHeight);
      canvas.current!.addEventListener('webglcontextlost', lost);
      void instance
        .load(assetUrl(asset))
        .then(() => {
          clearTimeout(timer);
          if (disposed || instance.disposed) return;
          setState('ready');
          setStats({ vertices: instance.vertices, triangles: instance.triangles });
          setClips(instance.clips.map((clip, i) => clip.name || `Clip ${i + 1}`));
          let previous = performance.now();
          const animate = (now: number) => {
            instance.render((now - previous) / 1000);
            previous = now;
            raf = requestAnimationFrame(animate);
          };
          raf = requestAnimationFrame(animate);
        })
        .catch((e) => {
          clearTimeout(timer);
          fail(String(e));
        });
    } catch (e) {
      clearTimeout(timer);
      fail(String(e));
    }
    const element = canvas.current;
    return () => {
      disposed = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      observer?.disconnect();
      element?.removeEventListener('webglcontextlost', lost);
      instance?.dispose();
      scene.current = null;
    };
  }, [asset.id, asset.fingerprint, attempt]);
  return (
    <div className={`viewer-wrap ${dark ? 'dark-preview' : ''}`}>
      <div className="viewer" ref={host}>
        <canvas
          key={`${asset.id}:${asset.fingerprint}:${attempt}`}
          ref={canvas}
          aria-label={`Interactive 3D preview of ${asset.name}`}
        />
        <span className="viewer-label">
          Perspective <span>/</span> Studio light
        </span>
        {state === 'loading' && (
          <div className="viewer-message">
            <LoaderCircle className="spin" size={25} />
            <span>Preparing preview…</span>
          </div>
        )}
        {state === 'failed' && (
          <div className="viewer-message error">
            <Box size={34} />
            <strong>Preview unavailable</strong>
            <p>{error}</p>
            {previewSupported && (
              <button onClick={() => setAttempt((n) => n + 1)}>
                <RotateCcw size={14} /> Retry viewer
              </button>
            )}
          </div>
        )}
        {state === 'ready' && (
          <span className="viewer-hint">Drag to orbit · Scroll to zoom · Right-drag to pan</span>
        )}
      </div>
      <div className="viewer-toolbar">
        <div>
          <button
            disabled={state !== 'ready'}
            title="Frame model"
            aria-label="Frame model"
            onClick={() => scene.current?.frame()}
          >
            <Focus size={17} />
          </button>
          <button
            disabled={state !== 'ready'}
            title="Toggle wireframe"
            aria-label="Toggle wireframe"
            aria-pressed={wire}
            onClick={() => {
              scene.current?.wireframe(!wire);
              setWire(!wire);
            }}
          >
            <Grid2X2 size={16} />
          </button>
          <button
            disabled={state !== 'ready'}
            aria-label="Toggle background"
            title="Toggle background"
            onClick={() => {
              scene.current?.background(!dark);
              setDark(!dark);
            }}
          >
            {dark ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
        <span title="Per mesh instance, including repeated geometry. Triangles count indexed elements or positions divided by three.">
          {stats.triangles.toLocaleString()} triangles <span>·</span>{' '}
          {stats.vertices.toLocaleString()} vertices
        </span>
      </div>
      {clips.length > 0 && (
        <div className="animation">
          <button
            aria-label={playing ? 'Pause animation' : 'Play animation'}
            onClick={() => {
              if (scene.current) scene.current.playing = !playing;
              setPlaying(!playing);
            }}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <select
            aria-label="Animation clip"
            onChange={(e) => scene.current?.selectClip(Number(e.target.value))}
          >
            {clips.map((clip, i) => (
              <option key={i} value={i}>
                {clip}
              </option>
            ))}
          </select>
          <small>Animation</small>
        </div>
      )}
    </div>
  );
}
