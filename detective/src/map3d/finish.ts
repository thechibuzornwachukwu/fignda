// How the 3D street is drawn to a canvas: the renderer's settings and the finish laid over the scene. Shared by the map
// on Cases and the dev page /__street.

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
import { ACESFilmicToneMapping, PCFSoftShadowMap, PMREMGenerator, SRGBColorSpace, Vector2, type Camera, type Scene, type WebGLRenderer } from 'three';
import type { Style, View } from './street3d';

/** Soft shadows, filmic tone and the sRGB output every view of the street is drawn with. */
export function prepare(renderer: WebGLRenderer, w: number, h: number) {
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(w, h, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
}

/**
 * The finish: light from the sky, soft ambient occlusion and a glow on lights at night, and for the village from above a
 * tilt-shift. The storybook is drawn with outlines instead.
 */
export function finish(renderer: WebGLRenderer, scene: Scene, camera: Camera, style: Style, view: View, hour: number, w: number, h: number) {
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
  // A glow on the lamps and the lit windows only: from the street it stays tight, so the dark round them stays dark.
  const level = view === 'walk' || view === 'enter' || view === 'front';
  if (night) composer.addPass(new UnrealBloomPass(new Vector2(w, h), level ? 0.28 : 0.55, level ? 0.35 : 0.6, level ? 0.92 : 0.82));
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
