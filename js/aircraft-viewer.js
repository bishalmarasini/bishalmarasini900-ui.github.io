// Interactive aircraft viewer. Renders a triangle mesh reconstructed from
// the aircraft's own X-Plane .acf flight-dynamics file (the fuselage and
// wing surface lattice Plane Maker uses internally), not a stand-in model.
// Exposes rotate/pan/zoom via OrbitControls plus preset Front/Side/Top/
// Isometric camera views and a reset.
import * as THREE from 'three';
import { OrbitControls } from './vendor/three/OrbitControls.js';

export function initAircraftViewer(container, jsonPath, opts) {
  opts = opts || {};
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 2000);

  const ambient = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(1, 1.4, 0.6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-1, 0.4, -0.8);
  scene.add(fill);

  const material = new THREE.MeshStandardMaterial({
    color: opts.color || 0x8b92a0,
    roughness: 0.55,
    metalness: 0.12,
    side: THREE.DoubleSide
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.1;
  controls.maxDistance = 1000;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.4;

  let userInteracted = false;
  const stopAutoRotate = function () {
    if (!userInteracted) {
      userInteracted = true;
      controls.autoRotate = false;
    }
  };
  controls.domElement.addEventListener('pointerdown', stopAutoRotate);
  controls.domElement.addEventListener('wheel', stopAutoRotate, { passive: true });

  let modelSize = 10;
  let defaultCamPos = new THREE.Vector3(10, 6, 10);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  function setView(view) {
    stopAutoRotate();
    const d = modelSize * 1.45;
    if (view === 'front') camera.position.set(0, 0, -d);
    else if (view === 'side') camera.position.set(d, 0, 0);
    else if (view === 'top') camera.position.set(0, d, 0.001);
    else if (view === 'iso') camera.position.copy(defaultCamPos);
    else if (view === 'reset') {
      camera.position.copy(defaultCamPos);
      controls.autoRotate = true;
      userInteracted = false;
    }
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  const loadingEl = opts.loadingEl;

  fetch(jsonPath)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      const group = new THREE.Group();

      data.parts.forEach(function (p) {
        const geo = new THREE.BufferGeometry();
        const flat = new Float32Array(p.vertices.length * 3);
        p.vertices.forEach(function (v, idx) {
          flat[idx * 3] = v[0];
          flat[idx * 3 + 1] = v[1];
          flat[idx * 3 + 2] = v[2];
        });
        geo.setAttribute('position', new THREE.BufferAttribute(flat, 3));
        geo.setIndex(p.indices);
        geo.computeVertexNormals();
        group.add(new THREE.Mesh(geo, material));
      });

      scene.add(group);

      const bbox = data.bbox;
      const cx = (bbox[0] + bbox[1]) / 2, cy = (bbox[2] + bbox[3]) / 2, cz = (bbox[4] + bbox[5]) / 2;
      const size = Math.max(bbox[1] - bbox[0], bbox[3] - bbox[2], bbox[5] - bbox[4]);
      group.position.set(-cx, -cy, -cz);
      modelSize = size;
      defaultCamPos = new THREE.Vector3(size * 0.62, size * 0.42, -size * 0.62);
      camera.position.copy(defaultCamPos);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.minDistance = size * 0.25;
      controls.maxDistance = size * 4;
      controls.update();

      if (loadingEl) loadingEl.style.display = 'none';
      canvas.style.opacity = '1';

      function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();
    })
    .catch(function (err) {
      if (loadingEl) loadingEl.textContent = 'Model unavailable';
      console.error('Aircraft viewer load failed:', err);
    });

  return { setView: setView };
}
