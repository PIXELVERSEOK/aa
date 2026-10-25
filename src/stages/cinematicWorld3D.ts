/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Motor cinematográfico 3D en tiempo real (Three.js) para el prólogo de PIXELVERSE:
 * «Cuando el mundo olvidó jugar» (8 escenas consecutivas · 00:00 – 02:30).
 *
 * Cumple estrictamente con:
 * - Guardia isSoftwareGl (SwiftShader / llvmpipe / Basic Render) y cadencia afterDraw.
 * - RoomEnvironment + PMREMGenerator para reflejos PBR reales en bronce, cristal y madera.
 * - Modelos compuestos (THREE.Group de 3 a 12 piezas) sin depender de archivos externos (0 404s).
 * - Texturas procedurales CanvasTexture en SRGBColorSpace con anisotropía máxima.
 * - Cero asignaciones GC dentro del bucle por fotograma.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

// Vectores temporales reutilizables (Cero GC en tick)
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _curLook = new THREE.Vector3();
const _colorTmp = new THREE.Color();
const _mat4Tmp = new THREE.Matrix4();
const _posTmp = new THREE.Vector3();
const _quatTmp = new THREE.Quaternion();
const _scaleTmp = new THREE.Vector3();
const _eulerTmp = new THREE.Euler();

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface CinematicWorldController {
  readonly isSoftwareGl: boolean;
  readonly renderer: THREE.WebGLRenderer;
  resize: (width: number, height: number) => void;
  renderAtTime: (elapsedSec: number, dt: number) => void;
  dispose: () => void;
}

export function createCinematicWorld3D(mountEl: HTMLElement): CinematicWorldController {
  const isSoftwareGl = detectSoftwareWebGL();

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x010206, 1);

  const initW = Math.max(1, mountEl.clientWidth || window.innerWidth);
  const initH = Math.max(1, mountEl.clientHeight || window.innerHeight);
  renderer.setSize(initW, initH);
  renderer.domElement.className = 'block w-full h-full';
  mountEl.innerHTML = '';
  mountEl.appendChild(renderer.domElement);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2(0x03050c, 0.025);
  scene.fog = fog;
  scene.background = new THREE.Color(0x010206);

  const camera = new THREE.PerspectiveCamera(44, initW / initH, 0.1, 260);
  camera.position.set(0, 1.5, 4);

  // Mapa de entorno PBR sin dependencias externas
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  pmremGenerator.dispose();

  const disposables: { dispose: () => void }[] = [envRT];
  const trackDisp = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  /* =========================================================================
     SISTEMA GLOBAL DE ILUMINACIÓN CINEMATOGRÁFICA (3 PUNTOS + HEMISFERIO)
     ========================================================================= */
  const hemiLight = new THREE.HemisphereLight(0x6e8cff, 0x1b1410, 0.45);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffdfa8, 1.4);
  keyLight.position.set(12, 22, 14);
  keyLight.castShadow = !isSoftwareGl;
  if (!isSoftwareGl) {
    keyLight.shadow.mapSize.set(1024, 1024);
    const d = 18;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 65;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
  }
  scene.add(keyLight);
  scene.add(keyLight.target);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
  rimLight.position.set(-14, 10, -12);
  scene.add(rimLight);

  const accentPoint = new THREE.PointLight(0xffb74d, 0, 24, 1.8);
  scene.add(accentPoint);

  /* =========================================================================
     TEXTURAS PROCEDURALES COMPARTIDAS Y PANTALLAS CRT DINÁMICAS
     ========================================================================= */
  function makeCanvasTex(
    w: number,
    h: number,
    drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  ): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture } {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    drawFn(ctx, w, h);
    const tex = trackDisp(new THREE.CanvasTexture(c));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    tex.needsUpdate = true;
    return { canvas: c, ctx, tex };
  }

  // Textura de sombra de contacto suave
  const contactShadowTex = makeCanvasTex(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.68)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.28)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }).tex;

  const contactShadowMat = trackDisp(
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    })
  );

  // Textura de partícula circular suave
  const softDotTex = makeCanvasTex(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,248,230,0.65)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }).tex;

  // Materiales base reutilizables
  const darkWoodMat = trackDisp(
    new THREE.MeshStandardMaterial({ color: 0x261710, roughness: 0.62, metalness: 0.08 })
  );
  const cabinetTrimMat = trackDisp(
    new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.35, metalness: 0.65 })
  );
  const agedBronzeMat = trackDisp(
    new THREE.MeshPhysicalMaterial({
      color: 0x9c7438,
      metalness: 0.88,
      roughness: 0.26,
      anisotropy: 0.7,
      clearcoat: 0.3,
    })
  );
  const darkStoneMat = trackDisp(
    new THREE.MeshStandardMaterial({ color: 0x2b313d, roughness: 0.86, metalness: 0.12 })
  );
  const mossStoneMat = trackDisp(
    new THREE.MeshStandardMaterial({ color: 0x36443a, roughness: 0.9, metalness: 0.06 })
  );

  /**
   * Construye un gabinete arcade clásico compuesto (9 piezas con escalas de silueta).
   */
  function createArcadeCabinetGroup(options: {
    screenTex?: THREE.Texture;
    marqueeColor?: number;
    draped?: boolean;
  }): {
    group: THREE.Group;
    buttonMesh: THREE.Mesh;
    screenMat: THREE.MeshBasicMaterial;
    marqueeMat: THREE.MeshStandardMaterial;
  } {
    const group = new THREE.Group();

    // Sombra de contacto en base (y = 0.01)
    const shadowPlane = new THREE.Mesh(
      trackDisp(new THREE.PlaneGeometry(1.45, 1.45)),
      contactShadowMat
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.01;
    group.add(shadowPlane);

    // 1. Cuerpo inferior
    const baseBox = new THREE.Mesh(
      trackDisp(new THREE.BoxGeometry(0.86, 0.95, 0.78)),
      darkWoodMat
    );
    baseBox.position.set(0, 0.475, 0);
    baseBox.castShadow = true;
    baseBox.receiveShadow = true;
    group.add(baseBox);

    // 2. Cuerpo superior / capucha CRT
    const upperBox = new THREE.Mesh(
      trackDisp(new THREE.BoxGeometry(0.86, 0.86, 0.68)),
      darkWoodMat
    );
    upperBox.position.set(0, 1.36, -0.04);
    upperBox.castShadow = true;
    group.add(upperBox);

    // 3. Paneles laterales biselados metálicos
    const sideL = new THREE.Mesh(
      trackDisp(new THREE.BoxGeometry(0.04, 1.82, 0.8)),
      cabinetTrimMat
    );
    sideL.position.set(-0.44, 0.91, -0.01);
    const sideR = sideL.clone();
    sideR.position.x = 0.44;
    group.add(sideL, sideR);

    // 4. Marquesina superior
    const marqueeMat = trackDisp(
      new THREE.MeshStandardMaterial({
        color: options.marqueeColor ?? 0x1e2430,
        emissive: options.marqueeColor ?? 0x000000,
        emissiveIntensity: options.marqueeColor ? 0.45 : 0,
        roughness: 0.3,
        metalness: 0.1,
      })
    );
    const marquee = new THREE.Mesh(
      trackDisp(new THREE.BoxGeometry(0.82, 0.2, 0.14)),
      marqueeMat
    );
    marquee.position.set(0, 1.72, 0.26);
    marquee.rotation.x = 0.18;
    group.add(marquee);

    // 5. Pantalla CRT empotrada
    const screenMat = trackDisp(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: options.screenTex ?? null,
      })
    );
    if (!options.screenTex) {
      screenMat.color.setHex(0x05070a);
    }
    const screenMesh = new THREE.Mesh(
      trackDisp(new THREE.PlaneGeometry(0.66, 0.52)),
      screenMat
    );
    screenMesh.position.set(0, 1.32, 0.31);
    screenMesh.rotation.x = -0.24;
    group.add(screenMesh);

    // 6. Tablero de control inclinado
    const deck = new THREE.Mesh(
      trackDisp(new THREE.BoxGeometry(0.84, 0.12, 0.34)),
      cabinetTrimMat
    );
    deck.position.set(0, 0.95, 0.28);
    deck.rotation.x = 0.16;
    group.add(deck);

    // 7. Joystick (eje metálico + esfera roja apagada)
    const shaft = new THREE.Mesh(
      trackDisp(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 8)),
      trackDisp(new THREE.MeshStandardMaterial({ color: 0xb8c2cc, metalness: 0.9, roughness: 0.2 }))
    );
    shaft.position.set(-0.2, 1.04, 0.29);
    const ballTop = new THREE.Mesh(
      trackDisp(new THREE.SphereGeometry(0.032, 12, 12)),
      trackDisp(new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.25, metalness: 0.1 }))
    );
    ballTop.position.set(-0.2, 1.09, 0.29);
    group.add(shaft, ballTop);

    // 8. Botones arcade táctiles
    const btnMat = trackDisp(
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.28, metalness: 0.12 })
    );
    const buttonMesh = new THREE.Mesh(
      trackDisp(new THREE.CylinderGeometry(0.026, 0.028, 0.028, 12)),
      btnMat
    );
    buttonMesh.position.set(0.14, 1.022, 0.3);
    buttonMesh.rotation.x = 0.16;
    const buttonMesh2 = buttonMesh.clone();
    buttonMesh2.position.set(0.22, 1.018, 0.28);
    group.add(buttonMesh, buttonMesh2);

    // 9. Puerta de monedas metálica
    const coinDoor = new THREE.Mesh(
      trackDisp(new THREE.BoxGeometry(0.32, 0.36, 0.03)),
      trackDisp(new THREE.MeshStandardMaterial({ color: 0x1f242d, metalness: 0.8, roughness: 0.4 }))
    );
    coinDoor.position.set(0, 0.46, 0.39);
    group.add(coinDoor);

    // Si está cubierto con manta protectora en el salón abandonado
    if (options.draped) {
      const clothMat = trackDisp(
        new THREE.MeshStandardMaterial({
          color: 0x2b303c,
          roughness: 0.94,
          metalness: 0.02,
        })
      );
      const shroud = new THREE.Mesh(
        trackDisp(new THREE.CylinderGeometry(0.46, 0.62, 1.86, 9, 3)),
        clothMat
      );
      shroud.position.set(0, 0.93, 0.02);
      shroud.scale.set(1.08, 1, 0.96);
      group.add(shroud);
    }

    return { group, buttonMesh, screenMat, marqueeMat };
  }

  /**
   * Construye el Glifo 3D original de PIXELVERSE (3 anillos geométricos + diamante central).
   */
  function createPixelverseGlyph3D(scale = 1): {
    group: THREE.Group;
    ring1: THREE.Mesh;
    ring2: THREE.Mesh;
    ring3: THREE.Mesh;
    core: THREE.Mesh;
    mat: THREE.MeshStandardMaterial;
  } {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const mat = trackDisp(
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.4,
        metalness: 0.7,
        roughness: 0.18,
      })
    );

    const ring1 = new THREE.Mesh(trackDisp(new THREE.TorusGeometry(1.05, 0.032, 12, 48)), mat);
    const ring2 = new THREE.Mesh(trackDisp(new THREE.TorusGeometry(0.76, 0.026, 8, 4)), mat);
    ring2.rotation.z = Math.PI / 4;
    const ring3 = new THREE.Mesh(trackDisp(new THREE.TorusGeometry(0.54, 0.022, 10, 6)), mat);

    const core = new THREE.Mesh(
      trackDisp(new THREE.OctahedronGeometry(0.26, 0)),
      trackDisp(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xfbbf24,
          emissiveIntensity: 2.2,
          roughness: 0.1,
          metalness: 0.3,
        })
      )
    );

    group.add(ring1, ring2, ring3, core);
    return { group, ring1, ring2, ring3, core, mat };
  }

  /* =========================================================================
     ESCENA 1 (00:00–00:18): EL SILENCIO DESPUÉS DE LA ÚLTIMA PARTIDA
     ========================================================================= */
  const s1Group = new THREE.Group();
  scene.add(s1Group);

  const s1Floor = new THREE.Mesh(
    trackDisp(new THREE.PlaneGeometry(26, 30)),
    trackDisp(new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.42, metalness: 0.25 }))
  );
  s1Floor.rotation.x = -Math.PI / 2;
  s1Floor.receiveShadow = true;
  s1Group.add(s1Floor);

  // Paredes y techo del salón arcade abandonado
  const wallMat = trackDisp(
    new THREE.MeshStandardMaterial({ color: 0x0d1017, roughness: 0.9, metalness: 0.05 })
  );
  const backWall = new THREE.Mesh(trackDisp(new THREE.BoxGeometry(16, 6, 0.4)), wallMat);
  backWall.position.set(0, 3, -9);
  const leftWall = new THREE.Mesh(trackDisp(new THREE.BoxGeometry(0.4, 6, 22)), wallMat);
  leftWall.position.set(-5.8, 3, -1);
  const rightWall = leftWall.clone();
  rightWall.position.x = 5.8;
  s1Group.add(backWall, leftWall, rightWall);

  // Pantalla CRT del gabinete protagonista (único píxel blanco que parpadea y muere)
  const s1HeroScreen = makeCanvasTex(128, 96, (ctx, w, h) => {
    ctx.fillStyle = '#030508';
    ctx.fillRect(0, 0, w, h);
  });

  const s1HeroCab = createArcadeCabinetGroup({ screenTex: s1HeroScreen.tex });
  s1HeroCab.group.position.set(0.65, 0, 1.8);
  s1HeroCab.group.rotation.y = -0.42;
  s1Group.add(s1HeroCab.group);

  // Fila de gabinetes silenciosos y cubiertos con mantas
  const cabPlacements = [
    { x: -2.4, z: 0.6, ry: 0.38, draped: false },
    { x: -2.6, z: -1.8, ry: 0.32, draped: true },
    { x: -2.5, z: -4.2, ry: 0.28, draped: false },
    { x: -2.6, z: -6.5, ry: 0.22, draped: true },
    { x: 2.5, z: -0.9, ry: -0.35, draped: true },
    { x: 2.6, z: -3.4, ry: -0.3, draped: false },
    { x: 2.5, z: -5.8, ry: -0.25, draped: true },
  ];
  for (const cp of cabPlacements) {
    const c = createArcadeCabinetGroup({ draped: cp.draped });
    c.group.position.set(cp.x, 0, cp.z);
    c.group.rotation.y = cp.ry;
    s1Group.add(c.group);
  }

  // Cables colgantes en curva catenaria
  const cableMat = trackDisp(
    new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.7, metalness: 0.3 })
  );
  for (let i = 0; i < 4; i++) {
    const zPos = 0.5 - i * 2.3;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-5.5, 4.6, zPos),
      new THREE.Vector3(-1.8, 3.35 - (i % 2) * 0.3, zPos + 0.2),
      new THREE.Vector3(2.1, 3.5, zPos - 0.15),
      new THREE.Vector3(5.5, 4.7, zPos),
    ]);
    const tube = new THREE.Mesh(
      trackDisp(new THREE.TubeGeometry(curve, 20, 0.018, 6, false)),
      cableMat
    );
    s1Group.add(tube);
  }

  // Haces de luz volumétrica entrando por persianas rotas (pared izquierda)
  const shaftMat = trackDisp(
    new THREE.MeshBasicMaterial({
      color: 0x6ea8ff,
      transparent: true,
      opacity: 0.065,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  for (let i = 0; i < 5; i++) {
    const beam = new THREE.Mesh(
      trackDisp(new THREE.ConeGeometry(1.15, 7.8, 16, 1, true)),
      shaftMat
    );
    beam.position.set(-2.3, 2.35, 1.2 - i * 1.65);
    beam.rotation.z = -0.92;
    beam.scale.set(0.32, 1, 0.85);
    s1Group.add(beam);
  }

  // Polvo flotando en el aire del salón
  const s1DustCount = 260;
  const s1DustGeo = trackDisp(new THREE.BufferGeometry());
  const s1DustPos = new Float32Array(s1DustCount * 3);
  for (let i = 0; i < s1DustCount; i++) {
    s1DustPos[i * 3] = (Math.random() - 0.5) * 9;
    s1DustPos[i * 3 + 1] = 0.3 + Math.random() * 4.2;
    s1DustPos[i * 3 + 2] = 3 - Math.random() * 11;
  }
  s1DustGeo.setAttribute('position', new THREE.BufferAttribute(s1DustPos, 3));
  const s1DustMat = trackDisp(
    new THREE.PointsMaterial({
      map: softDotTex,
      color: 0xbfd8ff,
      size: 0.06,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const s1Dust = new THREE.Points(s1DustGeo, s1DustMat);
  s1Group.add(s1Dust);

  /* =========================================================================
     ESCENA 2 (00:18–00:42): LOS RECUERDOS DE LA HUMANIDAD
     ========================================================================= */
  const s2Group = new THREE.Group();
  s2Group.visible = false;
  scene.add(s2Group);

  const cityWindowTex = makeCanvasTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);
    for (let y = 8; y < h - 8; y += 12) {
      for (let x = 8; x < w - 8; x += 14) {
        const r = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const frac = r - Math.floor(r);
        if (frac > 0.82) {
          ctx.fillStyle = frac > 0.93 ? '#fde68a' : '#38bdf8';
          ctx.globalAlpha = 0.32;
          ctx.fillRect(x, y, 8, 6);
        }
      }
    }
    ctx.globalAlpha = 1;
  }).tex;

  const towerGeo = trackDisp(new THREE.BoxGeometry(1, 1, 1));
  const towerMat = trackDisp(
    new THREE.MeshStandardMaterial({
      color: 0x161e2e,
      map: cityWindowTex,
      roughness: 0.38,
      metalness: 0.55,
    })
  );
  const towerCount = 44;
  const cityInst = new THREE.InstancedMesh(towerGeo, towerMat, towerCount);
  for (let i = 0; i < towerCount; i++) {
    const col = (i % 11) - 5;
    const row = Math.floor(i / 11);
    const w = 2.4 + (i % 3) * 0.9;
    const h = 8 + ((i * 7) % 16);
    const d = 2.4 + ((i * 5) % 3) * 0.8;
    _posTmp.set(col * 4.4 + (row % 2) * 1.6, h / 2 - 4, -8 - row * 6.5);
    _quatTmp.identity();
    _scaleTmp.set(w, h, d);
    _mat4Tmp.compose(_posTmp, _quatTmp, _scaleTmp);
    cityInst.setMatrixAt(i, _mat4Tmp);
    _colorTmp.setHSL(0.6 + (i % 4) * 0.02, 0.25, 0.55 + (i % 3) * 0.1);
    cityInst.setColorAt(i, _colorTmp);
  }
  cityInst.instanceMatrix.needsUpdate = true;
  if (cityInst.instanceColor) cityInst.instanceColor.needsUpdate = true;
  cityInst.computeBoundingSphere();
  s2Group.add(cityInst);

  // Pantallas publicitarias gigantes apagadas sobre azoteas
  for (let i = 0; i < 3; i++) {
    const bbGroup = new THREE.Group();
    const frame = new THREE.Mesh(
      trackDisp(new THREE.BoxGeometry(4.2, 2.2, 0.18)),
      trackDisp(new THREE.MeshStandardMaterial({ color: 0x0b0f17, roughness: 0.5, metalness: 0.7 }))
    );
    const legL = new THREE.Mesh(
      trackDisp(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6)),
      cabinetTrimMat
    );
    legL.position.set(-1.5, -1.5, 0);
    const legR = legL.clone();
    legR.position.x = 1.5;
    bbGroup.add(frame, legL, legR);
    bbGroup.position.set(-8 + i * 8.2, 8.5 + (i % 2) * 2.4, -12 - i * 3);
    bbGroup.rotation.y = (1 - i) * 0.22;
    s2Group.add(bbGroup);
  }

  // Diorama del apartamento iluminado en primer plano (niño + adulto + vieja consola olvidada)
  const aptGroup = new THREE.Group();
  aptGroup.position.set(0.4, 2.6, 1.5);
  s2Group.add(aptGroup);

  const aptRoom = new THREE.Mesh(
    trackDisp(new THREE.BoxGeometry(3.4, 2.1, 2.2)),
    trackDisp(
      new THREE.MeshStandardMaterial({
        color: 0x241d18,
        roughness: 0.88,
        side: THREE.BackSide,
      })
    )
  );
  aptGroup.add(aptRoom);

  const aptGlow = new THREE.PointLight(0xffcf87, 1.8, 6, 2);
  aptGlow.position.set(0, 0.65, 0);
  aptGroup.add(aptGlow);

  // Mesa baja + consola clásica apagada (compuesta)
  const lowTable = new THREE.Mesh(
    trackDisp(new THREE.BoxGeometry(1.1, 0.08, 0.55)),
    darkWoodMat
  );
  lowTable.position.set(0, -0.68, 0.1);
  const consoleBody = new THREE.Mesh(
    trackDisp(new THREE.BoxGeometry(0.42, 0.11, 0.3)),
    trackDisp(new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.45, metalness: 0.3 }))
  );
  consoleBody.position.set(0, -0.58, 0.1);
  const consoleSlot = new THREE.Mesh(
    trackDisp(new THREE.BoxGeometry(0.22, 0.03, 0.08)),
    cabinetTrimMat
  );
  consoleSlot.position.set(0, -0.52, 0.1);
  aptGroup.add(lowTable, consoleBody, consoleSlot);

  // Siluetas compuestas: niño observando y adulto sin recordar
  const silhouetteMat = trackDisp(
    new THREE.MeshStandardMaterial({ color: 0x12151e, roughness: 0.85, metalness: 0.05 })
  );
  const makeHumanSilhouette = (heightScale: number) => {
    const hg = new THREE.Group();
    const torso = new THREE.Mesh(
      trackDisp(new THREE.CylinderGeometry(0.14, 0.18, 0.62, 10)),
      silhouetteMat
    );
    torso.position.y = 0.52;
    const head = new THREE.Mesh(trackDisp(new THREE.SphereGeometry(0.13, 12, 12)), silhouetteMat);
    head.position.y = 0.96;
    const legs = new THREE.Mesh(
      trackDisp(new THREE.CylinderGeometry(0.13, 0.11, 0.48, 10)),
      silhouetteMat
    );
    legs.position.y = 0.12;
    hg.add(legs, torso, head);
    hg.scale.setScalar(heightScale);
    return hg;
  };
  const childSil = makeHumanSilhouette(0.76);
  childSil.position.set(-0.55, -0.95, 0.15);
  childSil.rotation.z = -0.08;
  const adultSil = makeHumanSilhouette(1.12);
  adultSil.position.set(0.62, -0.95, -0.05);
  adultSil.rotation.z = 0.04;
  aptGroup.add(childSil, adultSil);

  // Fotografía antigua y archivos digitales desvaneciéndose en el aire
  const s2ArchiveScreen = makeCanvasTex(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#0c1322';
    ctx.fillRect(0, 0, w, h);
  });
  const archiveCard = new THREE.Mesh(
    trackDisp(new THREE.PlaneGeometry(2.1, 1.32)),
    trackDisp(
      new THREE.MeshBasicMaterial({
        map: s2ArchiveScreen.tex,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      })
    )
  );
  archiveCard.position.set(0, 6.8, 0.6);
  s2Group.add(archiveCard);

  // Partículas de memoria ascendiendo hacia otro plano
  const s2PartCount = 420;
  const s2PartGeo = trackDisp(new THREE.BufferGeometry());
  const s2PartPos = new Float32Array(s2PartCount * 3);
  for (let i = 0; i < s2PartCount; i++) {
    s2PartPos[i * 3] = (Math.random() - 0.5) * 20;
    s2PartPos[i * 3 + 1] = -2 + Math.random() * 18;
    s2PartPos[i * 3 + 2] = 4 - Math.random() * 18;
  }
  s2PartGeo.setAttribute('position', new THREE.BufferAttribute(s2PartPos, 3));
  const s2PartMat = trackDisp(
    new THREE.PointsMaterial({
      map: softDotTex,
      color: 0x7dd3fc,
      size: 0.14,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const s2Particles = new THREE.Points(s2PartGeo, s2PartMat);
  s2Group.add(s2Particles);

  /* =========================================================================
     ESCENA 3 (00:42–01:05): LOS ECOS DE OTRAS ÉPOCAS (VACÍO CÓSMICO)
     ========================================================================= */
  const s3Group = new THREE.Group();
  s3Group.visible = false;
  scene.add(s3Group);

  // Campo estelar cósmico profundo
  const starCount = 650;
  const starGeo = trackDisp(new THREE.BufferGeometry());
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 18 + Math.random() * 55;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = r * Math.cos(phi);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starField = new THREE.Points(
    starGeo,
    trackDisp(
      new THREE.PointsMaterial({
        map: softDotTex,
        color: 0xe2e8f0,
        size: 0.22,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      })
    )
  );
  s3Group.add(starField);

  // Cristales lejanos instanciados
  const farCrystalGeo = trackDisp(new THREE.OctahedronGeometry(0.32, 0));
  const farCrystalMat = trackDisp(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      roughness: 0.15,
      metalness: 0.4,
    })
  );
  const farCrystalInst = new THREE.InstancedMesh(farCrystalGeo, farCrystalMat, 64);
  for (let i = 0; i < 64; i++) {
    const angle = (i / 64) * Math.PI * 2 * 3;
    const radius = 5.5 + (i % 8) * 1.9;
    _posTmp.set(
      Math.cos(angle) * radius,
      ((i % 9) - 4) * 1.15,
      Math.sin(angle) * radius - 4
    );
    _eulerTmp.set(i * 0.3, i * 0.5, 0);
    _quatTmp.setFromEuler(_eulerTmp);
    const sc = 0.65 + (i % 5) * 0.25;
    _scaleTmp.set(sc * 0.7, sc * 1.35, sc * 0.7);
    _mat4Tmp.compose(_posTmp, _quatTmp, _scaleTmp);
    farCrystalInst.setMatrixAt(i, _mat4Tmp);
  }
  farCrystalInst.instanceMatrix.needsUpdate = true;
  farCrystalInst.computeBoundingSphere();
  s3Group.add(farCrystalInst);

  // 7 Cristales Heroicos con siluetas auténticas de distintas épocas del videojuego
  type EraKind = '70s-pong' | '78-invaders' | '80-maze' | '81-girders' | '85-castle' | 'vector' | '16bit';
  const eraSpecs: { kind: EraKind; pos: [number, number, number]; extinguishAt: number }[] = [
    { kind: '70s-pong', pos: [0, 0, 0], extinguishAt: 999 }, // ¡El cristal de los 70 resiste!
    { kind: '80-maze', pos: [-2.3, 0.7, 1.1], extinguishAt: 45.2 },
    { kind: '78-invaders', pos: [2.2, -0.55, 1.3], extinguishAt: 46.8 },
    { kind: '81-girders', pos: [-1.7, -1.0, -1.6], extinguishAt: 48.2 },
    { kind: '85-castle', pos: [1.9, 1.05, -1.5], extinguishAt: 49.5 },
    { kind: 'vector', pos: [-3.4, -0.2, -0.5], extinguishAt: 50.6 },
    { kind: '16bit', pos: [3.3, 0.4, -0.4], extinguishAt: 51.4 },
  ];

  const heroCrystals: {
    group: THREE.Group;
    innerMat: THREE.MeshBasicMaterial;
    shellMat: THREE.MeshPhysicalMaterial;
    extinguishAt: number;
    basePos: THREE.Vector3;
  }[] = [];

  for (const spec of eraSpecs) {
    const cg = new THREE.Group();
    cg.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);

    const echoTex = makeCanvasTex(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#040814';
      ctx.fillRect(0, 0, w, h);
      if (spec.kind === '70s-pong') {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(18, 42, 6, 36);
        ctx.fillRect(104, 50, 6, 36);
        for (let y = 12; y < h - 12; y += 12) ctx.fillRect(62, y, 4, 6);
        ctx.fillRect(52, 56, 7, 7);
      } else if (spec.kind === '80-maze') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.strokeRect(18, 22, 92, 84);
        ctx.strokeRect(40, 44, 48, 40);
        ctx.fillStyle = '#fde047';
        for (let x = 28; x <= 100; x += 14) ctx.fillRect(x, 32, 4, 4);
      } else if (spec.kind === '78-invaders') {
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(28, 88, 22, 12);
        ctx.fillRect(78, 88, 22, 12);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(46, 36, 36, 18);
        ctx.fillRect(38, 44, 52, 8);
      } else if (spec.kind === '81-girders') {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(16, 34, 96, 8);
        ctx.fillRect(16, 66, 96, 8);
        ctx.fillRect(16, 96, 96, 8);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(84, 42, 8, 24);
      } else if (spec.kind === '85-castle') {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(38, 48, 52, 54);
        ctx.fillRect(38, 36, 12, 12);
        ctx.fillRect(58, 36, 12, 12);
        ctx.fillRect(78, 36, 12, 12);
      } else if (spec.kind === 'vector') {
        ctx.strokeStyle = '#a7f3d0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(64, 24);
        ctx.lineTo(94, 96);
        ctx.lineTo(64, 80);
        ctx.lineTo(34, 96);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.fillStyle = '#34d399';
        ctx.fillRect(26, 62, 76, 18);
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(64, 46, 16, 0, Math.PI * 2);
        ctx.fill();
      }
    }).tex;

    const innerMat = trackDisp(
      new THREE.MeshBasicMaterial({
        map: echoTex,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
      })
    );
    const innerPlane = new THREE.Mesh(trackDisp(new THREE.PlaneGeometry(0.68, 0.68)), innerMat);
    cg.add(innerPlane);

    const shellMat = trackDisp(
      new THREE.MeshPhysicalMaterial({
        color: spec.kind === '70s-pong' ? 0xfef08a : 0xbae6fd,
        emissive: spec.kind === '70s-pong' ? 0xd97706 : 0x0369a1,
        emissiveIntensity: spec.kind === '70s-pong' ? 0.55 : 0.25,
        metalness: 0.05,
        roughness: 0.08,
        transmission: isSoftwareGl ? 0 : 0.86,
        transparent: true,
        opacity: isSoftwareGl ? 0.36 : 1,
        ior: 1.62,
        thickness: 1.1,
        clearcoat: 1.0,
        depthWrite: false,
      })
    );
    const shell = new THREE.Mesh(trackDisp(new THREE.OctahedronGeometry(0.72, 0)), shellMat);
    shell.scale.set(0.88, 1.38, 0.65);
    shell.renderOrder = 4;
    cg.add(shell);

    s3Group.add(cg);
    heroCrystals.push({
      group: cg,
      innerMat,
      shellMat,
      extinguishAt: spec.extinguishAt,
      basePos: new THREE.Vector3(spec.pos[0], spec.pos[1], spec.pos[2]),
    });
  }

  const s3Glyph = createPixelverseGlyph3D(1.45);
  s3Glyph.group.visible = false;
  s3Group.add(s3Glyph.group);

  const s3Shockwave = new THREE.Mesh(
    trackDisp(new THREE.RingGeometry(0.85, 1.05, 48)),
    trackDisp(
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
  );
  s3Group.add(s3Shockwave);

  /* =========================================================================
     ESCENA 4 (01:05–01:28): EL DESCUBRIMIENTO DE PIXELVERSE (ISLA DEL ORIGEN)
     ========================================================================= */
  const s4Group = new THREE.Group();
  s4Group.visible = false;
  scene.add(s4Group);

  // Océano profundo con reflejo especular
  const oceanMesh = new THREE.Mesh(
    trackDisp(new THREE.PlaneGeometry(240, 240, 32, 32)),
    trackDisp(
      new THREE.MeshStandardMaterial({
        color: 0x07243d,
        roughness: 0.18,
        metalness: 0.72,
      })
    )
  );
  oceanMesh.rotation.x = -Math.PI / 2;
  oceanMesh.position.y = -0.2;
  oceanMesh.receiveShadow = true;
  s4Group.add(oceanMesh);

  // Masa monumental de la Isla del Origen (estratos naturales: costa, bosque, meseta, pico)
  const islandGroup = new THREE.Group();
  s4Group.add(islandGroup);

  const shoreBase = new THREE.Mesh(
    trackDisp(new THREE.CylinderGeometry(16.5, 19.5, 1.4, 24)),
    trackDisp(new THREE.MeshStandardMaterial({ color: 0x8c7853, roughness: 0.92, metalness: 0.04 }))
  );
  shoreBase.position.y = 0.5;
  shoreBase.receiveShadow = true;

  const greenPlateau = new THREE.Mesh(
    trackDisp(new THREE.CylinderGeometry(13.2, 16.0, 2.8, 20)),
    trackDisp(new THREE.MeshStandardMaterial({ color: 0x22543d, roughness: 0.88, metalness: 0.04 }))
  );
  greenPlateau.position.set(0, 2.2, -0.4);
  greenPlateau.castShadow = true;
  greenPlateau.receiveShadow = true;

  const highCliff = new THREE.Mesh(
    trackDisp(new THREE.CylinderGeometry(5.2, 8.8, 5.8, 14)),
    mossStoneMat
  );
  highCliff.position.set(-4.5, 5.6, -4.2);
  highCliff.castShadow = true;

  // Cascada descendiendo por el acantilado hacia el océano
  const waterfallMat = trackDisp(
    new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.78,
    })
  );
  const waterfallMesh = new THREE.Mesh(
    trackDisp(new THREE.BoxGeometry(1.15, 6.4, 0.35)),
    waterfallMat
  );
  waterfallMesh.position.set(-2.2, 4.4, -0.1);
  waterfallMesh.rotation.x = 0.22;

  // Cueva misteriosa en la ladera derecha
  const caveArch = new THREE.Mesh(
    trackDisp(new THREE.TorusGeometry(1.3, 0.48, 8, 12, Math.PI)),
    darkStoneMat
  );
  caveArch.position.set(5.8, 3.5, -2.5);
  const caveVoid = new THREE.Mesh(
    trackDisp(new THREE.CircleGeometry(1.2, 12, 0, Math.PI)),
    trackDisp(new THREE.MeshBasicMaterial({ color: 0x030408 }))
  );
  caveVoid.position.set(5.8, 3.5, -2.35);

  islandGroup.add(shoreBase, greenPlateau, highCliff, waterfallMesh, caveArch, caveVoid);

  // Bosque denso instanciado (copas de coníferas con variación de escala y color)
  const treeCanopyGeo = trackDisp(new THREE.ConeGeometry(0.65, 1.9, 7));
  const treeCanopyMat = trackDisp(
    new THREE.MeshStandardMaterial({ color: 0x2f6f44, roughness: 0.85, metalness: 0.02 })
  );
  const treeInst = new THREE.InstancedMesh(treeCanopyGeo, treeCanopyMat, 85);
  for (let i = 0; i < 85; i++) {
    const ang = (i / 85) * Math.PI * 2 * 2.7;
    const rad = 4.2 + (i % 9) * 1.02;
    const tx = Math.cos(ang) * rad;
    const tz = Math.sin(ang) * rad - 0.4;
    const sc = 0.82 + (i % 5) * 0.12;
    _posTmp.set(tx, 3.6 + sc * 0.85, tz);
    _quatTmp.identity();
    _scaleTmp.set(sc, sc * 1.15, sc);
    _mat4Tmp.compose(_posTmp, _quatTmp, _scaleTmp);
    treeInst.setMatrixAt(i, _mat4Tmp);
    _colorTmp.setHSL(0.36 + (i % 4) * 0.02, 0.48, 0.24 + (i % 3) * 0.06);
    treeInst.setColorAt(i, _colorTmp);
  }
  treeInst.instanceMatrix.needsUpdate = true;
  if (treeInst.instanceColor) treeInst.instanceColor.needsUpdate = true;
  treeInst.computeBoundingSphere();
  islandGroup.add(treeInst);

  // Santuario Circular Central con inscripción diegética PIXELVERSE
  const sanctuaryGroup = new THREE.Group();
  sanctuaryGroup.position.set(0.8, 3.62, 0.8);
  islandGroup.add(sanctuaryGroup);

  const sanctDais = new THREE.Mesh(
    trackDisp(new THREE.CylinderGeometry(3.1, 3.6, 0.55, 24)),
    darkStoneMat
  );
  sanctuaryGroup.add(sanctDais);

  const sanctRing = new THREE.Mesh(
    trackDisp(new THREE.TorusGeometry(2.4, 0.14, 10, 36)),
    agedBronzeMat
  );
  sanctRing.rotation.x = Math.PI / 2;
  sanctRing.position.y = 1.9;
  sanctuaryGroup.add(sanctRing);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const col = new THREE.Mesh(
      trackDisp(new THREE.BoxGeometry(0.28, 1.9, 0.28)),
      darkStoneMat
    );
    col.position.set(Math.cos(a) * 2.4, 0.95, Math.sin(a) * 2.4);
    sanctuaryGroup.add(col);
  }

  // Proyección/grabado diegético de PIXELVERSE sobre el anillo tecnológico antiguo
  const diegeticTitleTex = makeCanvasTex(512, 96, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.font = '700 46px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18;
    ctx.fillText('P I X E L V E R S E', w / 2, h / 2);
  }).tex;
  const diegeticSignMat = trackDisp(
    new THREE.MeshBasicMaterial({
      map: diegeticTitleTex,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const diegeticSign = new THREE.Mesh(
    trackDisp(new THREE.CylinderGeometry(2.62, 2.62, 0.62, 32, 1, true, -0.95, 1.9)),
    diegeticSignMat
  );
  diegeticSign.position.y = 2.45;
  sanctuaryGroup.add(diegeticSign);

  // Rayo de sol volumétrico que atraviesa las nubes e ilumina el santuario
  const s4SunbeamMat = trackDisp(
    new THREE.MeshBasicMaterial({
      color: 0xffe49e,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const s4Sunbeam = new THREE.Mesh(
    trackDisp(new THREE.ConeGeometry(4.2, 24, 24, 1, true)),
    s4SunbeamMat
  );
  s4Sunbeam.position.set(0.8, 14.5, 0.8);
  s4Sunbeam.rotation.z = 0.14;
  islandGroup.add(s4Sunbeam);

  // Bancos de nubes volumétricas alrededor de la isla
  const cloudPuffGeo = trackDisp(new THREE.DodecahedronGeometry(1.8, 1));
  const cloudPuffMat = trackDisp(
    new THREE.MeshLambertMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.52,
    })
  );
  const cloudInst = new THREE.InstancedMesh(cloudPuffGeo, cloudPuffMat, 36);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const r = 13 + (i % 5) * 3.2;
    _posTmp.set(Math.cos(a) * r, 5.2 + (i % 4) * 1.4, Math.sin(a) * r);
    _quatTmp.identity();
    _scaleTmp.set(2.2 + (i % 3) * 0.7, 0.65, 1.6 + (i % 2) * 0.6);
    _mat4Tmp.compose(_posTmp, _quatTmp, _scaleTmp);
    cloudInst.setMatrixAt(i, _mat4Tmp);
  }
  cloudInst.instanceMatrix.needsUpdate = true;
  cloudInst.computeBoundingSphere();
  s4Group.add(cloudInst);

  /* =========================================================================
     ESCENA 5 (01:28–01:52): LA MISIÓN · EL CRONOSCOPIO (MÁQUINA DEL TIEMPO)
     ========================================================================= */
  const s5Group = new THREE.Group();
  s5Group.visible = false;
  scene.add(s5Group);

  const chamberFloor = new THREE.Mesh(
    trackDisp(new THREE.CylinderGeometry(16, 16, 0.4, 36)),
    trackDisp(new THREE.MeshStandardMaterial({ color: 0x141923, roughness: 0.48, metalness: 0.35 }))
  );
  chamberFloor.position.y = -0.2;
  chamberFloor.receiveShadow = true;
  s5Group.add(chamberFloor);

  // Columnata circular monumental (12 pilares grabados)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const pGroup = new THREE.Group();
    const colShaft = new THREE.Mesh(
      trackDisp(new THREE.BoxGeometry(0.95, 9.5, 0.95)),
      darkStoneMat
    );
    colShaft.position.y = 4.75;
    const bronzeBand = new THREE.Mesh(
      trackDisp(new THREE.BoxGeometry(1.08, 0.35, 1.08)),
      agedBronzeMat
    );
    bronzeBand.position.y = 2.4;
    pGroup.add(colShaft, bronzeBand);
    pGroup.position.set(Math.cos(a) * 10.5, 0, Math.sin(a) * 10.5);
    pGroup.lookAt(0, 0, 0);
    s5Group.add(pGroup);
  }

  // Modelo Heroico: EL CRONOSCOPIO (10 partes articuladas)
  const cronoGroup = new THREE.Group();
  s5Group.add(cronoGroup);

  const cronoDais1 = new THREE.Mesh(
    trackDisp(new THREE.CylinderGeometry(3.4, 3.9, 0.36, 8)),
    darkStoneMat
  );
  cronoDais1.position.y = 0.18;
  const cronoDais2 = new THREE.Mesh(
    trackDisp(new THREE.CylinderGeometry(2.2, 2.6, 0.42, 8)),
    agedBronzeMat
  );
  cronoDais2.position.y = 0.57;
  cronoGroup.add(cronoDais1, cronoDais2);

  // 4 Pilones de cristal de cuarzo energético alrededor del núcleo
  const pylonCrystalMat = trackDisp(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      roughness: 0.15,
      metalness: 0.25,
    })
  );
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const pylon = new THREE.Mesh(
      trackDisp(new THREE.OctahedronGeometry(0.36, 0)),
      pylonCrystalMat
    );
    pylon.scale.set(0.65, 2.2, 0.65);
    pylon.position.set(Math.cos(a) * 2.15, 1.55, Math.sin(a) * 2.15);
    pylon.lookAt(0, 2.4, 0);
    cronoGroup.add(pylon);
  }

  // 3 Anillos giroscópicos analógicos de bronce envejecido
  const gim1 = new THREE.Mesh(
    trackDisp(new THREE.TorusGeometry(2.05, 0.09, 12, 48)),
    agedBronzeMat
  );
  gim1.position.y = 2.65;
  const gim2 = new THREE.Mesh(
    trackDisp(new THREE.TorusGeometry(1.62, 0.075, 12, 48)),
    agedBronzeMat
  );
  gim2.position.y = 2.65;
  const gim3 = new THREE.Mesh(
    trackDisp(new THREE.TorusGeometry(1.22, 0.06, 12, 40)),
    agedBronzeMat
  );
  gim3.position.y = 2.65;
  cronoGroup.add(gim1, gim2, gim3);

  // Esfera temporal holográfica central con nodo 1970 iluminado y épocas futuras bloqueadas
  const holoEraTex = makeCanvasTex(256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2;
    for (let y = 16; y < h; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillStyle = '#fef08a';
    ctx.fillText('★ 1970s', 22, 68);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.42)';
    ctx.font = '600 15px "JetBrains Mono", monospace';
    ctx.fillText('1980s [?]', 138, 44);
    ctx.fillText('1990s [?]', 138, 88);
  }).tex;

  const cronoCoreMat = trackDisp(
    new THREE.MeshBasicMaterial({
      map: holoEraTex,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const cronoSphere = new THREE.Mesh(
    trackDisp(new THREE.SphereGeometry(0.84, 24, 18)),
    cronoCoreMat
  );
  cronoSphere.position.y = 2.65;
  cronoGroup.add(cronoSphere);

  // Onda expansiva que enciende secuencialmente 3 máquinas arcade distantes
  const s5PulseRing = new THREE.Mesh(
    trackDisp(new THREE.RingGeometry(1.8, 2.15, 48)),
    trackDisp(
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
  );
  s5PulseRing.rotation.x = -Math.PI / 2;
  s5PulseRing.position.y = 0.04;
  s5Group.add(s5PulseRing);

  const s5Beacons: ReturnType<typeof createArcadeCabinetGroup>[] = [];
  const beaconAngles = [-0.68, 0, 0.68];
  for (let i = 0; i < 3; i++) {
    const a = beaconAngles[i];
    const bc = createArcadeCabinetGroup({ marqueeColor: 0x0f172a });
    bc.group.position.set(Math.sin(a) * 6.8, 0, -Math.cos(a) * 6.8);
    bc.group.lookAt(0, 0, 0);
    s5Group.add(bc.group);
    s5Beacons.push(bc);
  }

  /* =========================================================================
     ESCENA 6 (01:52–02:12): LOS ORÍGENES (PORTAL, PONG 1972, INVADERS 1978, ISLA)
     ========================================================================= */
  const s6Group = new THREE.Group();
  s6Group.visible = false;
  scene.add(s6Group);

  // Portal dimensional anómalo en z = 5.6 (visualmente distinto de cualquier puerta común)
  const portalGroup = new THREE.Group();
  portalGroup.position.set(0, 1.55, 5.6);
  const portalOuter = new THREE.Mesh(
    trackDisp(new THREE.TorusGeometry(1.35, 0.11, 12, 40)),
    agedBronzeMat
  );
  const portalVortexMat = trackDisp(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const portalVortex = new THREE.Mesh(
    trackDisp(new THREE.RingGeometry(0.25, 1.28, 36)),
    portalVortexMat
  );
  portalGroup.add(portalOuter, portalVortex);
  s6Group.add(portalGroup);

  // Sala cálida de los años 70 abierta hacia el horizonte de la Isla del Origen
  const s6ArcadeFloor = new THREE.Mesh(
    trackDisp(new THREE.BoxGeometry(8.5, 0.2, 8.0)),
    darkWoodMat
  );
  s6ArcadeFloor.position.set(0, -0.1, 2.2);
  s6ArcadeFloor.receiveShadow = true;
  s6Group.add(s6ArcadeFloor);

  // Pantallas CRT animadas fieles de Pong (1972) y Space Invaders (1978)
  const pongCrt = makeCanvasTex(160, 120, (ctx, w, h) => {
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, w, h);
  });
  const invadersCrt = makeCanvasTex(160, 120, (ctx, w, h) => {
    ctx.fillStyle = '#040806';
    ctx.fillRect(0, 0, w, h);
  });

  const pongCab = createArcadeCabinetGroup({
    screenTex: pongCrt.tex,
    marqueeColor: 0xf59e0b,
  });
  pongCab.group.position.set(-1.35, 0, 2.2);
  pongCab.group.rotation.y = 0.48;

  const invCab = createArcadeCabinetGroup({
    screenTex: invadersCrt.tex,
    marqueeColor: 0x10b981,
  });
  invCab.group.position.set(1.35, 0, 1.8);
  invCab.group.rotation.y = -0.48;
  s6Group.add(pongCab.group, invCab.group);

  // Arco de piedra que da salida a la extensa Isla del Origen
  const exitArchL = new THREE.Mesh(trackDisp(new THREE.BoxGeometry(0.9, 3.6, 0.9)), darkStoneMat);
  exitArchL.position.set(-2.4, 1.8, -1.5);
  const exitArchR = exitArchL.clone();
  exitArchR.position.x = 2.4;
  const exitLintel = new THREE.Mesh(trackDisp(new THREE.BoxGeometry(5.8, 0.7, 1.0)), darkStoneMat);
  exitLintel.position.set(0, 3.85, -1.5);
  s6Group.add(exitArchL, exitArchR, exitLintel);

  // Exterior interconectado: praderas, sendero, casas, cueva, puerta sellada y domo pulsante
  const s6Meadow = new THREE.Mesh(
    trackDisp(new THREE.PlaneGeometry(120, 120)),
    trackDisp(new THREE.MeshStandardMaterial({ color: 0x275a3c, roughness: 0.9, metalness: 0.02 }))
  );
  s6Meadow.rotation.x = -Math.PI / 2;
  s6Meadow.position.set(0, -0.12, -45);
  s6Meadow.receiveShadow = true;
  s6Group.add(s6Meadow);

  const s6Path = new THREE.Mesh(
    trackDisp(new THREE.PlaneGeometry(2.6, 46)),
    trackDisp(new THREE.MeshStandardMaterial({ color: 0xb59663, roughness: 0.95 }))
  );
  s6Path.rotation.x = -Math.PI / 2;
  s6Path.position.set(0, -0.09, -24);
  s6Group.add(s6Path);

  // Casas artesanales de la isla (compuestas: muro, tejado a dos aguas, ventana cálida)
  const makeIslandCottage = (roofHex: number) => {
    const cg = new THREE.Group();
    const walls = new THREE.Mesh(
      trackDisp(new THREE.BoxGeometry(2.8, 1.9, 2.4)),
      trackDisp(new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.85 }))
    );
    walls.position.y = 0.95;
    const roof = new THREE.Mesh(
      trackDisp(new THREE.ConeGeometry(2.3, 1.35, 4)),
      trackDisp(new THREE.MeshStandardMaterial({ color: roofHex, roughness: 0.75 }))
    );
    roof.position.y = 2.55;
    roof.rotation.y = Math.PI / 4;
    const win = new THREE.Mesh(
      trackDisp(new THREE.PlaneGeometry(0.55, 0.55)),
      trackDisp(new THREE.MeshBasicMaterial({ color: 0xfef08a }))
    );
    win.position.set(0.65, 1.05, 1.21);
    cg.add(walls, roof, win);
    return cg;
  };
  const house1 = makeIslandCottage(0x9a3412);
  house1.position.set(-5.8, -0.1, -11.5);
  house1.rotation.y = 0.35;
  const house2 = makeIslandCottage(0x1e3a8a);
  house2.position.set(6.2, -0.1, -16.5);
  house2.rotation.y = -0.4;
  s6Group.add(house1, house2);

  // Puerta antigua sellada en la montaña + estructura tecnológica respondiendo al pulso
  const sealedGate = new THREE.Group();
  sealedGate.position.set(-6.5, 0, -28);
  const gateSlab = new THREE.Mesh(trackDisp(new THREE.BoxGeometry(3.8, 4.8, 1.2)), darkStoneMat);
  gateSlab.position.y = 2.4;
  const gateSeal = new THREE.Mesh(
    trackDisp(new THREE.TorusGeometry(1.1, 0.08, 8, 24)),
    trackDisp(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.2,
      })
    )
  );
  gateSeal.position.set(0, 2.4, 0.65);
  sealedGate.add(gateSlab, gateSeal);
  s6Group.add(sealedGate);

  const distantBeaconTower = new THREE.Group();
  distantBeaconTower.position.set(4.5, 0, -34);
  const towerRidge = new THREE.Mesh(
    trackDisp(new THREE.CylinderGeometry(3.5, 6.2, 7.5, 12)),
    mossStoneMat
  );
  towerRidge.position.y = 3.75;
  const towerPulseOrb = new THREE.Mesh(
    trackDisp(new THREE.OctahedronGeometry(1.1, 1)),
    trackDisp(
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.8,
      })
    )
  );
  towerPulseOrb.position.y = 8.9;
  distantBeaconTower.add(towerRidge, towerPulseOrb);
  s6Group.add(distantBeaconTower);

  /* =========================================================================
     ESCENA 7 (02:12–02:24): EL SENDERO GLITCH (PLATAFORMAS Y PROTAGONISTA)
     ========================================================================= */
  const s7Group = new THREE.Group();
  s7Group.visible = false;
  scene.add(s7Group);

  // Plataformas flotantes suspendidas sobre el abismo cósmico
  const s7Platforms: { group: THREE.Group; trimMat: THREE.MeshStandardMaterial; pos: THREE.Vector3 }[] = [];
  const platCoords: [number, number, number][] = [
    [0, 0, 5.5],
    [1.4, 0.55, 2.4],
    [-1.1, 1.15, -0.8],
    [0.8, 1.65, -4.2],
    [0.0, 2.1, -8.0], // Plataforma del Resonador Astral
    [0.0, 2.35, -12.0],
    [0.0, 2.6, -16.0],
    [0.0, 2.85, -20.0],
  ];

  for (let i = 0; i < platCoords.length; i++) {
    const [px, py, pz] = platCoords[i];
    const pg = new THREE.Group();
    pg.position.set(px, py, pz);

    const slab = new THREE.Mesh(
      trackDisp(new THREE.BoxGeometry(2.1, 0.36, 2.1)),
      trackDisp(new THREE.MeshStandardMaterial({ color: 0x181c2e, roughness: 0.5, metalness: 0.4 }))
    );
    const trimMat = trackDisp(
      new THREE.MeshStandardMaterial({
        color: i < 5 ? 0x38bdf8 : 0x334155,
        emissive: i < 5 ? 0x0284c7 : 0x000000,
        emissiveIntensity: i < 5 ? 1.1 : 0,
        roughness: 0.2,
      })
    );
    const trim = new THREE.Mesh(trackDisp(new THREE.BoxGeometry(2.18, 0.08, 2.18)), trimMat);
    trim.position.y = 0.16;
    pg.add(slab, trim);
    s7Group.add(pg);
    s7Platforms.push({ group: pg, trimMat, pos: new THREE.Vector3(px, py, pz) });
  }

  // Corriente de píxeles digitales (cinta luminosa cian entre plataformas 3 y 5)
  const streamCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.1, 1.5, -0.8),
    new THREE.Vector3(1.1, 2.0, -4.2),
    new THREE.Vector3(0.0, 2.5, -8.0),
  ]);
  const pixelStream = new THREE.Mesh(
    trackDisp(new THREE.TubeGeometry(streamCurve, 32, 0.14, 8, false)),
    trackDisp(
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
  );
  s7Group.add(pixelStream);

  // Peligro Glitch carmesí que el protagonista esquiva
  const glitchHazard = new THREE.Mesh(
    trackDisp(new THREE.OctahedronGeometry(0.58, 0)),
    trackDisp(
      new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 1.8,
        wireframe: true,
      })
    )
  );
  glitchHazard.position.set(-0.25, 2.25, -4.4);
  s7Group.add(glitchHazard);

  // Resonador suspendido sobre el abismo + Santuario distante en el horizonte
  const resonatorGroup = new THREE.Group();
  resonatorGroup.position.set(0, 3.45, -8.0);
  const resCore = new THREE.Mesh(
    trackDisp(new THREE.OctahedronGeometry(0.45, 0)),
    trackDisp(
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.6,
      })
    )
  );
  const resRing = new THREE.Mesh(
    trackDisp(new THREE.TorusGeometry(0.78, 0.045, 10, 32)),
    agedBronzeMat
  );
  resonatorGroup.add(resCore, resRing);
  s7Group.add(resonatorGroup);

  const horizonSanctuary = createPixelverseGlyph3D(3.4);
  horizonSanctuary.group.position.set(0, 5.2, -28);
  s7Group.add(horizonSanctuary.group);

  // Protagonista Original de PIXELVERSE (7 piezas compuestas: túnica, cabeza, visor cian, bufanda ámbar, brazos, piernas)
  const heroExplorer = new THREE.Group();
  const tunic = new THREE.Mesh(
    trackDisp(new THREE.CylinderGeometry(0.18, 0.24, 0.56, 10)),
    trackDisp(new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 }))
  );
  tunic.position.y = 0.52;
  const heroHead = new THREE.Mesh(
    trackDisp(new THREE.BoxGeometry(0.32, 0.3, 0.3)),
    trackDisp(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }))
  );
  heroHead.position.y = 0.96;
  const heroVisor = new THREE.Mesh(
    trackDisp(new THREE.BoxGeometry(0.26, 0.1, 0.04)),
    trackDisp(
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    )
  );
  heroVisor.position.set(0, 0.97, -0.15);
  const heroScarf = new THREE.Mesh(
    trackDisp(new THREE.BoxGeometry(0.36, 0.1, 0.48)),
    trackDisp(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 }))
  );
  heroScarf.position.set(0, 0.78, 0.14);
  heroScarf.rotation.x = 0.25;
  const legA = new THREE.Mesh(
    trackDisp(new THREE.BoxGeometry(0.1, 0.28, 0.12)),
    cabinetTrimMat
  );
  legA.position.set(-0.08, 0.14, 0);
  const legB = legA.clone();
  legB.position.x = 0.08;
  heroExplorer.add(tunic, heroHead, heroVisor, heroScarf, legA, legB);
  s7Group.add(heroExplorer);

  /* =========================================================================
     ESCENA 8 (02:24–02:30): EL TÍTULO Y EL COMIENZO
     ========================================================================= */
  const s8Group = new THREE.Group();
  s8Group.visible = false;
  scene.add(s8Group);

  const s8Emblem = createPixelverseGlyph3D(1.85);
  s8Emblem.group.position.set(0, 0.15, -3.5);
  s8Group.add(s8Emblem.group);

  // Precompilar shaders en GPU para evitar tirones al cambiar de escena
  if (!isSoftwareGl) {
    s1Group.visible = true;
    s2Group.visible = true;
    s3Group.visible = true;
    s4Group.visible = true;
    s5Group.visible = true;
    s6Group.visible = true;
    s7Group.visible = true;
    s8Group.visible = true;
    renderer.compile(scene, camera);
    s2Group.visible = false;
    s3Group.visible = false;
    s4Group.visible = false;
    s5Group.visible = false;
    s6Group.visible = false;
    s7Group.visible = false;
    s8Group.visible = false;
  }

  let prevSceneIdx = -1;

  function renderAtTime(elapsedSec: number, dt: number): void {
    const t = Math.max(0, Math.min(150, elapsedSec));
    const sIdx =
      t < 18 ? 0 : t < 42 ? 1 : t < 65 ? 2 : t < 88 ? 3 : t < 112 ? 4 : t < 132 ? 5 : t < 144 ? 6 : 7;

    if (sIdx !== prevSceneIdx) {
      s1Group.visible = sIdx === 0;
      s2Group.visible = sIdx === 1;
      s3Group.visible = sIdx === 2;
      s4Group.visible = sIdx === 3;
      s5Group.visible = sIdx === 4;
      s6Group.visible = sIdx === 5;
      s7Group.visible = sIdx === 6;
      s8Group.visible = sIdx === 7;
      prevSceneIdx = sIdx;
    }

    // =======================================================================
    // DIRECCIÓN DE FOTOGRAFÍA Y ANIMACIÓN POR ESCENA
    // =======================================================================
    if (sIdx === 0) {
      // ESCENA 1 (00:00–00:18): Oscuridad -> Clic de botón -> Píxel solitario -> Pasillo vacío
      const st = t;
      const darkReveal = smoothstep(1.8, 5.2, st);
      renderer.toneMappingExposure = mix(0.03, 0.95, darkReveal);
      scene.background = _colorTmp.setHex(0x02040a);
      fog.color.setHex(0x030610);
      fog.density = 0.095;
      hemiLight.color.setHex(0x4f75ff);
      hemiLight.groundColor.setHex(0x090b10);
      hemiLight.intensity = 0.32 * darkReveal;
      keyLight.color.setHex(0x8bb8ff);
      keyLight.intensity = 0.85 * darkReveal;
      keyLight.position.set(-8, 6, 2);
      rimLight.intensity = 0.25 * darkReveal;

      // Pulsación física del botón arcade en 2.35s
      const pressPulse =
        st >= 2.32 && st <= 2.58 ? Math.sin(((st - 2.32) / 0.26) * Math.PI) : 0;
      s1HeroCab.buttonMesh.position.y = 1.022 - pressPulse * 0.014;

      // Único píxel blanco que intenta encenderse (11.4s - 15.1s), parpadea dos veces y muere
      let pxAlive = false;
      if (st >= 11.4 && st <= 15.05) {
        const blinkOff1 = st > 12.6 && st < 12.82;
        const blinkOff2 = st > 14.1 && st < 14.32;
        pxAlive = !blinkOff1 && !blinkOff2;
      }
      const hCtx = s1HeroScreen.ctx;
      hCtx.fillStyle = '#030508';
      hCtx.fillRect(0, 0, 128, 96);
      if (pxAlive) {
        hCtx.fillStyle = 'rgba(186, 230, 253, 0.16)';
        hCtx.beginPath();
        hCtx.arc(64, 48, 16, 0, Math.PI * 2);
        hCtx.fill();
        hCtx.fillStyle = '#ffffff';
        hCtx.fillRect(62, 46, 4, 4);
      }
      s1HeroScreen.tex.needsUpdate = true;
      accentPoint.color.setHex(0xbae6fd);
      accentPoint.position.set(0.55, 1.35, 2.15);
      accentPoint.intensity = pxAlive ? 0.85 : 0;

      // Movimiento lento de polvo
      s1Dust.position.y = Math.sin(st * 0.25) * 0.12;

      if (st < 5.5) {
        // Primer plano íntimo sobre el tablero y el botón que alguien presiona sin respuesta
        const u = st / 5.5;
        _camTargetPos.set(mix(0.95, 0.55, u), mix(1.22, 1.42, u), mix(2.75, 3.05, u));
        _camTargetLook.set(0.65, mix(1.02, 1.28, u), 1.9);
      } else {
        // Deslizamiento melancólico por el pasillo de máquinas apagadas
        const u = smoothstep(5.5, 18.0, st);
        _camTargetPos.set(mix(0.45, 0.0, u), mix(1.42, 1.62, u), mix(3.0, -3.2, u));
        _camTargetLook.set(mix(0.45, 0.0, u), 1.28, mix(1.5, -7.5, u));
      }
      camera.position.copy(_camTargetPos);
      camera.lookAt(_camTargetLook);
    } else if (sIdx === 1) {
      // ESCENA 2 (00:18–00:42): Ciudad nocturna, apartamento y recuerdos ascendiendo
      const st = t - 18;
      const silenceFade = 1 - smoothstep(20.6, 23.6, st); // Silencio y oscuridad final 38.6–42s
      renderer.toneMappingExposure = 0.98 * silenceFade + 0.04;
      scene.background = _colorTmp.setHex(0x040711);
      fog.color.setHex(0x040711);
      fog.density = 0.032;
      hemiLight.color.setHex(0x3b5bdb);
      hemiLight.intensity = 0.38 * silenceFade;
      keyLight.color.setHex(0x93c5fd);
      keyLight.intensity = 0.65 * silenceFade;
      aptGlow.intensity = 1.9 * silenceFade;
      accentPoint.intensity = 0;

      // Archivo digital y fotografía perdiendo definición gradualmente
      const eraseProg = smoothstep(8.0, 20.5, st);
      const aCtx = s2ArchiveScreen.ctx;
      aCtx.clearRect(0, 0, 256, 160);
      aCtx.fillStyle = `rgba(12, 22, 42, ${(0.82 * (1 - eraseProg * 0.85)).toFixed(3)})`;
      aCtx.fillRect(0, 0, 256, 160);
      aCtx.strokeStyle = `rgba(125, 211, 252, ${(0.65 * (1 - eraseProg)).toFixed(3)})`;
      aCtx.lineWidth = 2;
      aCtx.strokeRect(8, 8, 240, 144);
      // Silueta de foto familiar frente a un viejo salón arcade borrándose en bandas
      const keepWidth = Math.max(0, Math.floor(210 * (1 - eraseProg)));
      if (keepWidth > 4) {
        aCtx.fillStyle = `rgba(253, 230, 138, ${(0.75 * (1 - eraseProg * 0.7)).toFixed(3)})`;
        aCtx.fillRect(24, 34, Math.min(58, keepWidth), 86);
        aCtx.fillStyle = `rgba(56, 189, 248, ${(0.65 * (1 - eraseProg * 0.7)).toFixed(3)})`;
        aCtx.fillRect(98, 52, Math.max(0, keepWidth - 76), 68);
      }
      s2ArchiveScreen.tex.needsUpdate = true;
      archiveCard.position.y = 6.4 + st * 0.08;
      archiveCard.visible = silenceFade > 0.08;

      // Partículas de memoria extraídas hacia el cielo
      s2PartMat.opacity = smoothstep(5.0, 11.0, st) * silenceFade * 0.85;
      s2Particles.position.y = ((st * 0.65) % 8);

      const u = smoothstep(0, 24, st);
      _camTargetPos.set(mix(1.2, -0.4, u), mix(2.55, 8.8, u), mix(5.2, 7.6, u));
      _camTargetLook.set(mix(0.35, 0.0, u), mix(2.35, 7.6, u), mix(1.4, -2.5, u));
      camera.position.copy(_camTargetPos);
      camera.lookAt(_camTargetLook);
    } else if (sIdx === 2) {
      // ESCENA 3 (00:42–01:05): Vacío cósmico, cristales apagándose y glifo PIXELVERSE
      const st = t - 42;
      renderer.toneMappingExposure = 1.12;
      scene.background = _colorTmp.setHex(0x020309);
      fog.color.setHex(0x020309);
      fog.density = 0.015;
      hemiLight.color.setHex(0x60a5fa);
      hemiLight.intensity = 0.48;
      keyLight.color.setHex(0xfef08a);
      keyLight.intensity = 1.25;
      keyLight.position.set(5, 8, 8);

      starField.rotation.y = st * 0.018;
      farCrystalInst.rotation.y = st * 0.04;
      farCrystalMat.emissiveIntensity = Math.max(0.04, 0.7 * (1 - smoothstep(1.5, 9.5, st)));

      for (let i = 0; i < heroCrystals.length; i++) {
        const hc = heroCrystals[i];
        hc.group.position.y = hc.basePos.y + Math.sin(st * 1.1 + i) * 0.12;
        hc.group.rotation.y = Math.sin(st * 0.45 + i) * 0.28;
        if (t >= hc.extinguishAt) {
          const ext = smoothstep(hc.extinguishAt, hc.extinguishAt + 1.1, t);
          hc.innerMat.opacity = 0.95 * (1 - ext);
          hc.shellMat.emissiveIntensity = 0.25 * (1 - ext);
        } else {
          hc.innerMat.opacity = 0.95;
          hc.shellMat.emissiveIntensity = i === 0 ? 0.65 + smoothstep(9, 16, st) * 1.1 : 0.28;
        }
      }

      // Formación del Glifo PIXELVERSE alrededor del cristal resistente de los 70 (t >= 52s)
      const glyphProg = smoothstep(10.0, 16.5, st);
      s3Glyph.group.visible = glyphProg > 0.01;
      s3Glyph.group.scale.setScalar(mix(0.3, 1.55, glyphProg));
      s3Glyph.ring1.rotation.x = st * 0.55;
      s3Glyph.ring1.rotation.y = st * 0.35;
      s3Glyph.ring2.rotation.z = Math.PI / 4 + st * 0.45;
      s3Glyph.ring3.rotation.y = -st * 0.7;
      s3Glyph.mat.emissiveIntensity = 0.6 + glyphProg * 1.8;

      accentPoint.color.setHex(0xfef08a);
      accentPoint.position.set(0, 0, 0.6);
      accentPoint.intensity = glyphProg * 2.8;

      // Onda de choque de luz en 58.6s (st = 16.6s)
      if (st >= 16.6) {
        const sw = smoothstep(16.6, 22.8, st);
        s3Shockwave.scale.setScalar(1 + sw * 16);
        (s3Shockwave.material as THREE.MeshBasicMaterial).opacity = (1 - sw) * 0.85;
      } else {
        (s3Shockwave.material as THREE.MeshBasicMaterial).opacity = 0;
      }

      const u = smoothstep(0, 23, st);
      _camTargetPos.set(Math.sin(st * 0.16) * mix(2.2, 0.35, u), mix(0.8, 0.12, u), mix(8.2, 3.35, u));
      _camTargetLook.set(0, 0, 0);
      camera.position.copy(_camTargetPos);
      camera.lookAt(_camTargetLook);
    } else if (sIdx === 3) {
      // ESCENA 4 (01:05–01:28): Emergencia sobre el océano, nubes y la Isla del Origen
      const st = t - 65;
      renderer.toneMappingExposure = 1.16;
      scene.background = _colorTmp.setHex(0x163252);
      fog.color.setHex(0x1e3f63);
      fog.density = 0.014;
      hemiLight.color.setHex(0x93c5fd);
      hemiLight.groundColor.setHex(0x1a2e22);
      hemiLight.intensity = 0.85;
      keyLight.color.setHex(0xffe0a3);
      keyLight.intensity = 2.1;
      keyLight.position.set(18, 28, 16);
      accentPoint.intensity = 0;

      cloudInst.rotation.y = st * 0.015;

      // Rayo de sol e inscripción diegética PIXELVERSE iluminándose a partir de 80.5s (st = 15.5)
      const sunProg = smoothstep(14.0, 18.5, st);
      s4SunbeamMat.opacity = sunProg * 0.14;
      diegeticSignMat.opacity = sunProg * 0.95;

      const u = smoothstep(0, 23, st);
      const orbitAng = mix(0.85, 0.05, u);
      const dist = mix(29.0, 9.6, u);
      _camTargetPos.set(
        0.8 + Math.sin(orbitAng) * dist,
        mix(16.5, 6.8, u),
        0.8 + Math.cos(orbitAng) * dist
      );
      _camTargetLook.set(0.8, mix(3.2, 5.4, u), 0.8);
      camera.position.copy(_camTargetPos);
      camera.lookAt(_camTargetLook);
    } else if (sIdx === 4) {
      // ESCENA 5 (01:28–01:52): Cámara interior del Cronoscopio e ignición de 3 gabinetes
      const st = t - 88;
      renderer.toneMappingExposure = 1.08;
      scene.background = _colorTmp.setHex(0x060913);
      fog.color.setHex(0x080d1a);
      fog.density = 0.036;
      hemiLight.color.setHex(0x60a5fa);
      hemiLight.intensity = 0.42;
      keyLight.color.setHex(0xffd89b);
      keyLight.intensity = 1.45;
      keyLight.position.set(4, 16, 6);

      const coreAwake = smoothstep(8.0, 14.0, st);
      const speed = mix(0.22, 0.95, coreAwake);
      gim1.rotation.y = st * speed;
      gim1.rotation.x = 0.35 + Math.sin(st * 0.4) * 0.15;
      gim2.rotation.x = st * speed * 1.25;
      gim2.rotation.z = 0.5;
      gim3.rotation.z = -st * speed * 1.5;
      cronoSphere.rotation.y = st * 0.38;
      pylonCrystalMat.emissiveIntensity = 0.35 + coreAwake * 1.6;

      accentPoint.color.setHex(0xfef08a);
      accentPoint.position.set(0, 2.65, 0);
      accentPoint.intensity = 1.1 + coreAwake * 3.2;

      // Onda de energía propagándose (104s = st 16s) y encendiendo 1ª, 2ª y 3ª máquina
      if (st >= 16.0) {
        const wp = ((st - 16.0) % 2.4) / 2.4;
        s5PulseRing.scale.setScalar(1 + wp * 4.5);
        (s5PulseRing.material as THREE.MeshBasicMaterial).opacity = (1 - wp) * 0.75;
      } else {
        (s5PulseRing.material as THREE.MeshBasicMaterial).opacity = 0;
      }

      const wakeTimes = [16.5, 18.9, 21.3];
      for (let i = 0; i < 3; i++) {
        const lit = smoothstep(wakeTimes[i], wakeTimes[i] + 0.6, st);
        s5Beacons[i].marqueeMat.emissive.setHex(0xfbbf24);
        s5Beacons[i].marqueeMat.emissiveIntensity = lit * 1.8;
        s5Beacons[i].screenMat.color.setRGB(
          mix(0.03, 0.55, lit),
          mix(0.04, 0.88, lit),
          mix(0.06, 1.0, lit)
        );
      }

      const u = smoothstep(0, 24, st);
      const ang = mix(-0.65, 0.55, u);
      const rad = mix(7.6, 5.4, Math.sin(u * Math.PI));
      _camTargetPos.set(Math.sin(ang) * rad, mix(2.2, 3.8, u), Math.cos(ang) * rad);
      _camTargetLook.set(0, 2.45, 0);
      camera.position.copy(_camTargetPos);
      camera.lookAt(_camTargetLook);
    } else if (sIdx === 5) {
      // ESCENA 6 (01:52–02:12): Cruce de portal, Pong 1972 + Space Invaders 1978, horizonte de la isla
      const st = t - 112;
      renderer.toneMappingExposure = 1.12;
      scene.background = _colorTmp.setHex(0x1f3a52);
      fog.color.setHex(0x284b63);
      fog.density = 0.018;
      hemiLight.color.setHex(0xfde68a);
      hemiLight.groundColor.setHex(0x1e3a2f);
      hemiLight.intensity = 0.78;
      keyLight.color.setHex(0xffdfa0);
      keyLight.intensity = 1.95;
      keyLight.position.set(10, 18, 8);

      portalVortex.rotation.z = st * 2.4;

      // Actualizar CRT fiel de Pong (1972)
      {
        const ctx = pongCrt.ctx;
        ctx.fillStyle = '#05070a';
        ctx.fillRect(0, 0, 160, 120);
        ctx.fillStyle = '#f8fafc';
        for (let y = 8; y < 112; y += 10) ctx.fillRect(79, y, 2, 5);
        ctx.font = '700 18px "JetBrains Mono", monospace';
        ctx.fillText('1', 52, 24);
        ctx.fillText('0', 98, 24);
        const bx = 80 + Math.sin(st * 3.8) * 56;
        const by = 60 + Math.cos(st * 2.7) * 34;
        ctx.fillRect(14, Math.max(12, Math.min(88, by - 14)), 4, 28);
        ctx.fillRect(142, Math.max(12, Math.min(88, by - 12)), 4, 28);
        ctx.fillRect(bx - 3, by - 3, 6, 6);
        pongCrt.tex.needsUpdate = true;
      }

      // Actualizar CRT fiel de Space Invaders (1978)
      {
        const ctx = invadersCrt.ctx;
        ctx.fillStyle = '#040806';
        ctx.fillRect(0, 0, 160, 120);
        const marchX = Math.sin(st * 2.4) * 16;
        ctx.fillStyle = '#f8fafc';
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 6; c++) {
            ctx.fillRect(28 + c * 18 + marchX, 20 + r * 14, 10, 7);
          }
        }
        // Escudos verdes de fósforo inferior
        ctx.fillStyle = '#4ade80';
        for (let b = 0; b < 4; b++) {
          ctx.fillRect(22 + b * 34, 84, 18, 9);
        }
        const shipX = 80 + Math.sin(st * 1.9) * 38;
        ctx.fillRect(shipX - 7, 104, 14, 6);
        const laserY = 100 - ((st * 95) % 75);
        ctx.fillRect(shipX - 1, laserY, 2, 7);
        invadersCrt.tex.needsUpdate = true;
      }

      accentPoint.color.setHex(0xffcf87);
      accentPoint.position.set(0, 2.2, 2.2);
      accentPoint.intensity = 1.4;

      if (st < 2.6) {
        // Atravesando el portal anómalo hacia el salón de los 70
        const u = smoothstep(0, 2.6, st);
        _camTargetPos.set(0, 1.55, mix(7.8, 4.4, u));
        _camTargetLook.set(0, 1.45, 1.8);
      } else if (st < 10.2) {
        // Recorriendo los gabinetes vivos de Pong y Space Invaders
        const u = smoothstep(2.6, 10.2, st);
        _camTargetPos.set(mix(-0.35, 0.35, u), 1.48, mix(4.4, 0.6, u));
        _camTargetLook.set(mix(-0.9, 0.4, u), 1.32, mix(2.0, -3.0, u));
      } else {
        // Saliendo por el arco hacia el horizonte interconectado de la Isla del Origen
        const u = smoothstep(10.2, 20.0, st);
        _camTargetPos.set(mix(0.35, 0.0, u), mix(1.48, 5.2, u), mix(0.6, -9.5, u));
        _camTargetLook.set(0, mix(1.4, 3.4, u), -34);
      }
      camera.position.copy(_camTargetPos);
      camera.lookAt(_camTargetLook);
    } else if (sIdx === 6) {
      // ESCENA 7 (02:12–02:24): El Sendero Glitch en pleno movimiento
      const st = t - 132;
      renderer.toneMappingExposure = 1.18;
      scene.background = _colorTmp.setHex(0x060414);
      fog.color.setHex(0x09061d);
      fog.density = 0.024;
      hemiLight.color.setHex(0x38bdf8);
      hemiLight.groundColor.setHex(0x311042);
      hemiLight.intensity = 0.65;
      keyLight.color.setHex(0xfef08a);
      keyLight.intensity = 1.5;

      glitchHazard.rotation.x = st * 3.2;
      glitchHazard.rotation.y = st * 2.5;
      resonatorGroup.rotation.y = st * 1.8;

      // Trayectoria coreografiada del protagonista por plataformas, corriente de píxeles y resonador
      const progress = Math.min(1, st / 11.5);
      const totalSegs = 4; // De plataforma 0 a plataforma 4 (Resonador) y luego admirando el puente
      if (progress < 0.56) {
        const segFloat = (progress / 0.56) * totalSegs;
        const idxA = Math.min(totalSegs - 1, Math.floor(segFloat));
        const localU = segFloat - idxA;
        const pA = s7Platforms[idxA].pos;
        const pB = s7Platforms[idxA + 1].pos;
        heroExplorer.position.lerpVectors(pA, pB, localU);
        // Arco parabólico de salto + esquiva lateral del peligro glitch en el tramo 2->3
        const jumpArc = Math.sin(localU * Math.PI) * 1.15;
        heroExplorer.position.y += 0.18 + jumpArc;
        if (idxA === 2) {
          heroExplorer.position.x += Math.sin(localU * Math.PI) * 0.75;
        }
        heroExplorer.rotation.y = Math.atan2(pA.x - pB.x, pA.z - pB.z);
      } else {
        // En la plataforma del Resonador tras activarlo (t >= 138.4s / st >= 6.4s)
        heroExplorer.position.set(0, s7Platforms[4].pos.y + 0.18, s7Platforms[4].pos.z);
        heroExplorer.rotation.y = 0;
      }

      // Activación secuencial de las plataformas del puente hacia el santuario distante
      for (let i = 5; i < s7Platforms.length; i++) {
        const triggerT = 6.3 + (i - 5) * 0.65;
        const lit = smoothstep(triggerT, triggerT + 0.4, st);
        s7Platforms[i].trimMat.color.setHex(lit > 0.2 ? 0xfef08a : 0x334155);
        s7Platforms[i].trimMat.emissive.setHex(0x38bdf8);
        s7Platforms[i].trimMat.emissiveIntensity = lit * 2.0;
      }

      accentPoint.color.setHex(0x38bdf8);
      accentPoint.position.copy(heroExplorer.position).add(_posTmp.set(0, 1.2, 0.5));
      accentPoint.intensity = 2.2;

      _camTargetPos.set(
        heroExplorer.position.x * 0.55 + 1.8,
        heroExplorer.position.y + 1.85,
        heroExplorer.position.z + 5.2
      );
      _camTargetLook.set(
        heroExplorer.position.x * 0.35,
        heroExplorer.position.y + 0.75,
        heroExplorer.position.z - 6.0
      );
      const dampAlpha = 1 - Math.exp(-6.5 * Math.max(0.001, dt));
      if (st < 0.08) {
        camera.position.copy(_camTargetPos);
        _curLook.copy(_camTargetLook);
      } else {
        camera.position.lerp(_camTargetPos, dampAlpha);
        _curLook.lerp(_camTargetLook, dampAlpha);
      }
      camera.lookAt(_curLook);
    } else {
      // ESCENA 8 (02:24–02:30): Emblema final de PIXELVERSE en la oscuridad
      const st = t - 144;
      const fadeOut = 1 - smoothstep(4.8, 5.9, st);
      renderer.toneMappingExposure = 1.05 * fadeOut;
      scene.background = _colorTmp.setHex(0x010206);
      fog.color.setHex(0x010206);
      fog.density = 0.04;
      hemiLight.intensity = 0.25 * fadeOut;
      keyLight.intensity = 0.85 * fadeOut;

      s8Emblem.ring1.rotation.z = st * 0.25;
      s8Emblem.ring2.rotation.y = st * 0.38;
      s8Emblem.ring3.rotation.x = -st * 0.3;
      s8Emblem.mat.emissiveIntensity = 1.4 * fadeOut;

      accentPoint.color.setHex(0x38bdf8);
      accentPoint.position.set(0, 0.2, -2.2);
      accentPoint.intensity = 1.8 * fadeOut;

      camera.position.set(0, 0.12, mix(2.6, 2.15, st / 6));
      camera.lookAt(0, 0.12, -3.5);
    }

    renderer.render(scene, camera);
  }

  function resize(width: number, height: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function dispose(): void {
    for (const d of disposables) {
      try {
        d.dispose();
      } catch {
        // Ignorar recurso ya liberado
      }
    }
    renderer.dispose();
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }

  return {
    isSoftwareGl,
    renderer,
    resize,
    renderAtTime,
    dispose,
  };
}
