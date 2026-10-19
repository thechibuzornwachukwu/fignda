import { useEffect, useRef, useState } from 'react';
import { ACESFilmicToneMapping, PCFSoftShadowMap, PMREMGenerator, SRGBColorSpace, Vector2, WebGLRenderer, type Scene, type Camera } from 'three';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { HorizontalTiltShiftShader } from 'three/examples/jsm/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/examples/jsm/shaders/VerticalTiltShiftShader.js';
import type { Weather } from '../map/street';
import { buildStreet, type Style, type View } from '../map3d/street3d';

/**
 * /__street, in development only: the 3D street (src/map3d) with every camera, hour, weather and look, to look at and
 * to render the previews in design/sketches/map/3d from (npm run street3d:render). Not a game screen.
 */
export function StreetLab() {
  const ref = useRef<HTMLCanvasElement>(null);
  // Read once: the address only sets where the lab starts.
  const [q] = useState(() => new URLSearchParams(location.search));
  const [view, setView] = useState<View>((q.get('view') as View) ?? 'iso');
  const [hour, setHour] = useState(Number(q.get('hour') ?? 15));
  const [weather, setWeather] = useState<Weather>((q.get('weather') as Weather) ?? 'clear');
  const [walkX, setWalkX] = useState(Number(q.get('x') ?? 300));
  const [style, setStyle] = useState<Style>((q.get('style') as Style) ?? 'village');
  const bare = q.has('bare');

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const w = Number(q.get('w') ?? window.innerWidth);
    const h = Number(q.get('h') ?? window.innerHeight);
    const renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(w, h, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = SRGBColorSpace;
    const { scene, camera } = buildStreet({ view, hour, weather, walkX, aspect: w / h, style });
    draw(renderer, scene, camera, style, view, hour, w, h);
    document.body.dataset.ready = `${style}-${view}-${hour}-${weather}-${walkX}`;
    return () => renderer.dispose();
  }, [q, view, hour, weather, walkX, style]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
      {!bare && (
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 8, padding: 8, background: 'rgba(255,255,255,0.85)', fontFamily: 'Manrope, sans-serif', fontSize: 13 }}>
          <select value={style} onChange={(e) => setStyle(e.target.value as Style)}>
            {(['village', 'real', 'storybook'] as const).map((v) => <option key={v}>{v}</option>)}
          </select>
          <select value={view} onChange={(e) => setView(e.target.value as View)}>
            {(['iso', 'plan', 'front', 'walk', 'enter'] as const).map((v) => <option key={v}>{v}</option>)}
          </select>
          <label>
            Hour <input type="range" min={0} max={23} value={hour} onChange={(e) => setHour(Number(e.target.value))} /> {hour}
          </label>
          <select value={weather} onChange={(e) => setWeather(e.target.value as Weather)}>
            {(['clear', 'rain', 'fog', 'snow', 'storm', 'flood'] as const).map((v) => <option key={v}>{v}</option>)}
          </select>
          <label>
            Walk <input type="range" min={0} max={1150} value={walkX} onChange={(e) => setWalkX(Number(e.target.value))} />
          </label>
        </div>
      )}
    </div>
  );
}

/**
 * The finish: light from the sky, soft ambient occlusion and a glow on lights at night, and for the village from above a
 * tilt-shift. The storybook is drawn with outlines instead.
 */
function draw(renderer: WebGLRenderer, scene: Scene, camera: Camera, style: Style, view: View, hour: number, w: number, h: number) {
  const night = hour < 6 || hour >= 18;
  if (style === 'storybook') {
    new OutlineEffect(renderer, { defaultThickness: 0.0032, defaultColor: [0.16, 0.13, 0.11], defaultAlpha: 0.9 }).render(scene, camera);
    return;
  }
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = night ? 0.05 : 0.3;
  const composer = new EffectComposer(renderer);
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new SSAOPass(scene, camera, w, h);
  ao.kernelRadius = view === 'iso' || view === 'plan' ? 14 : 8;
  ao.minDistance = 0.0006;
  ao.maxDistance = 0.04;
  composer.addPass(ao);
  if (night) composer.addPass(new UnrealBloomPass(new Vector2(w, h), 0.6, 0.6, 0.82));
  // From above, the village is photographed like a model: sharp in the middle band, softly out of focus above and below.
  if (style === 'village' && (view === 'iso' || view === 'plan')) {
    const hz = new ShaderPass(HorizontalTiltShiftShader);
    const vt = new ShaderPass(VerticalTiltShiftShader);
    hz.uniforms.h!.value = 2.2 / w;
    vt.uniforms.v!.value = 2.2 / h;
    hz.uniforms.r!.value = vt.uniforms.r!.value = 0.5;
    composer.addPass(hz);
    composer.addPass(vt);
  }
  composer.addPass(new OutputPass());
  composer.render();
}
