// Procedural voxel mine shaft — no external models, everything is drawn from
// coloured cubes. First-person camera descends a square shaft; the block at the
// front of each level is the "ore face" that gets mined and revealed.

const BLOCK = 1;
const SHAFT_HALF = 2;       // perimeter at |x|==2 or |z|==2, interior 3x3 open
const EYE = 0.5;

// Wall palette by depth band (the deeper, the darker / cooler).
const WALL_BANDS = [
  { upTo: 2, colors: [0x8b6b4a, 0x946f4d, 0x7e5f40] },   // dirt
  { upTo: 4, colors: [0x8f8f8f, 0x9a9a9a, 0x848484] },   // stone
  { upTo: 6, colors: [0x6f6f78, 0x787884, 0x65656e] },   // grey stone
  { upTo: 8, colors: [0x50505f, 0x585868, 0x474754] },   // deep stone
  { upTo: 99, colors: [0x3a3744, 0x423f4e, 0x33313c] }   // dark stone
];

// Ore appearance by tier (1..5).
const ORE_STYLES = {
  1: { color: 0x2b2b2b, emissive: 0x000000, glow: 0 },          // coal
  2: { color: 0xd9a17a, emissive: 0x3a1e0c, glow: 0 },          // iron
  3: { color: 0xf4c542, emissive: 0x6b4a00, glow: 0.6 },        // gold
  4: { color: 0x2f5bd6, emissive: 0x0a1f6b, glow: 0.8 },        // lapis
  5: { color: 0x6cf0e4, emissive: 0x0c5a52, glow: 1.1 }         // diamond
};

class MineRenderer {
  constructor(canvas) {
    this.canvas = canvas;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8ec5ff);
    this.scene.fog = new THREE.Fog(0x6a7388, 7, 30);

    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.blockGeo = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);
    this.frontFaces = {};     // depth -> mesh
    this.oreLights = [];
    this.debris = [];

    this.depth = 0;
    this.cameraBaseY = EYE;
    this.descendStart = 0;
    this.descendFrom = EYE;
    this.descendTo = EYE;
    this.descendDur = 0;
    this.onArrive = null;

    this.swingStart = -1;
    this.shakeUntil = 0;
    this.shakeStrength = 0;

    this.yaw = 0;
    this.pitch = -0.28;
    this.targetYaw = 0;
    this.targetPitch = -0.28;
    this.isDragging = false;
    this.dragOrigin = { x: 0, y: 0 };

    this.clock = new THREE.Clock();
    this.animationId = null;

    this._setupLights();
    this._buildPickaxe();
    this._bindControls();
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  ensureReady() {
    return Promise.resolve();
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4a3a28, 0.95);
    const sun = new THREE.DirectionalLight(0xffffff, 0.7);
    sun.position.set(4, 24, 6);
    this.scene.add(hemi, sun);

    // Head lamp so nearby blocks stay readable as you go deep.
    this.headLamp = new THREE.PointLight(0xfff0d0, 1.15, 16, 2);
    this.headLamp.position.set(0, 0.1, 0.2);
    this.camera.add(this.headLamp);
  }

  _wallMaterialFor(row) {
    const band = WALL_BANDS.find((b) => row <= b.upTo) || WALL_BANDS[WALL_BANDS.length - 1];
    const color = band.colors[Math.floor(Math.random() * band.colors.length)];
    return new THREE.MeshLambertMaterial({ color });
  }

  buildShaft(maxFloors) {
    this.maxFloors = maxFloors;
    this._clear();

    // Grass rim around the surface opening.
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x6abe4f });
    const dirtTopMat = new THREE.MeshLambertMaterial({ color: 0x7a5b3c });
    for (let x = -SHAFT_HALF - 1; x <= SHAFT_HALF + 1; x += 1) {
      for (let z = -SHAFT_HALF - 1; z <= SHAFT_HALF + 1; z += 1) {
        const isOpening = Math.abs(x) <= SHAFT_HALF - 1 && Math.abs(z) <= SHAFT_HALF - 1;
        if (isOpening) continue;
        const onRim = Math.abs(x) === SHAFT_HALF + 1 || Math.abs(z) === SHAFT_HALF + 1;
        const mesh = new THREE.Mesh(this.blockGeo, onRim ? grassMat : dirtTopMat);
        mesh.position.set(x, 0, z);
        this.rootGroup.add(mesh);
      }
    }

    // Shaft walls, one ring per floor.
    for (let row = 1; row <= maxFloors; row += 1) {
      for (let x = -SHAFT_HALF; x <= SHAFT_HALF; x += 1) {
        for (let z = -SHAFT_HALF; z <= SHAFT_HALF; z += 1) {
          const perimeter = Math.abs(x) === SHAFT_HALF || Math.abs(z) === SHAFT_HALF;
          if (!perimeter) continue;
          const mesh = new THREE.Mesh(this.blockGeo, this._wallMaterialFor(row));
          mesh.position.set(x, -row, z);
          this.rootGroup.add(mesh);

          // Remember the front-centre block as this floor's ore face.
          if (x === 0 && z === -SHAFT_HALF) {
            this.frontFaces[row] = mesh;
          }
        }
      }
    }

    // A simple wooden ladder on the back wall for the "climb out" read.
    const ladderMat = new THREE.MeshLambertMaterial({ color: 0x6b4a24 });
    for (let row = 0; row <= maxFloors; row += 1) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.12), ladderMat);
      rung.position.set(0, -row + 0.3, SHAFT_HALF - 0.55);
      this.rootGroup.add(rung);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, maxFloors + 1, 0.12), ladderMat);
    rail.position.set(0, -maxFloors / 2, SHAFT_HALF - 0.55);
    this.rootGroup.add(rail);

    this.depth = 0;
    this.cameraBaseY = EYE;
    this.camera.position.set(0, EYE, SHAFT_HALF - 0.4);
    this.yaw = 0; this.targetYaw = 0;
    this.pitch = -0.28; this.targetPitch = -0.28;
  }

  _buildPickaxe() {
    this.pickaxe = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x7a4f24 });
    const ironMat = new THREE.MeshLambertMaterial({ color: 0xb8c0c8 });

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), woodMat);
    handle.position.set(0, -0.1, 0);
    handle.rotation.z = 0.4;
    this.pickaxe.add(handle);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.08), ironMat);
    head.position.set(0.06, 0.16, 0);
    head.rotation.z = -0.2;
    this.pickaxe.add(head);

    this.pickaxe.position.set(0.42, -0.34, -0.85);
    this.pickaxe.rotation.set(0, -0.3, 0);
    this.pickaxeRest = this.pickaxe.rotation.x;
    this.camera.add(this.pickaxe);
  }

  swingPickaxe() {
    this.swingStart = performance.now();
  }

  // Animate the camera down one level; calls onArrive when it lands.
  descend(onArrive) {
    this.depth += 1;
    this.descendFrom = this.cameraBaseY;
    this.descendTo = -this.depth + EYE;
    this.descendStart = performance.now();
    this.descendDur = 650;
    this.onArrive = onArrive || null;
  }

  setDepth(depth) {
    this.depth = depth;
    this.cameraBaseY = -depth + EYE;
    this.descendDur = 0;
  }

  revealOre(depth, tierIndex) {
    const face = this.frontFaces[depth];
    const style = ORE_STYLES[tierIndex] || ORE_STYLES[1];
    if (face) {
      face.material = new THREE.MeshLambertMaterial({
        color: style.color,
        emissive: style.emissive,
        emissiveIntensity: 1
      });
      face.userData.popStart = performance.now();
    }
    if (style.glow > 0 && face) {
      const light = new THREE.PointLight(style.color, style.glow, 6, 2);
      light.position.copy(face.position);
      light.position.z += 0.6;
      this.rootGroup.add(light);
      this.oreLights.push(light);
    }
  }

  caveIn(onDone) {
    this.shakeUntil = performance.now() + 1100;
    this.shakeStrength = 0.32;

    const debrisMat = new THREE.MeshLambertMaterial({ color: 0x5a5258 });
    for (let i = 0; i < 16; i += 1) {
      const size = 0.3 + Math.random() * 0.5;
      const block = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), debrisMat);
      block.position.set(
        (Math.random() - 0.5) * 3,
        this.cameraBaseY + 5 + Math.random() * 6,
        (Math.random() - 0.5) * 3
      );
      block.userData.vy = -(3 + Math.random() * 4);
      block.userData.rot = (Math.random() - 0.5) * 0.3;
      this.rootGroup.add(block);
      this.debris.push(block);
    }

    if (onDone) {
      setTimeout(onDone, 900);
    }
  }

  startLoop(updateCallback) {
    const tick = () => {
      const delta = this.clock.getDelta();
      this._update(delta);
      if (updateCallback) updateCallback(delta);
      this.renderer.render(this.scene, this.camera);
      this.animationId = requestAnimationFrame(tick);
    };
    this.animationId = requestAnimationFrame(tick);
  }

  stopLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  _update(delta) {
    const now = performance.now();

    // Smooth look.
    this.yaw += (this.targetYaw - this.yaw) * Math.min(1, delta * 10);
    this.pitch += (this.targetPitch - this.pitch) * Math.min(1, delta * 10);

    // Descent tween.
    if (this.descendDur > 0) {
      const t = Math.min(1, (now - this.descendStart) / this.descendDur);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.cameraBaseY = this.descendFrom + (this.descendTo - this.descendFrom) * eased;
      if (t >= 1) {
        this.descendDur = 0;
        this.cameraBaseY = this.descendTo;
        const cb = this.onArrive;
        this.onArrive = null;
        if (cb) cb();
      }
    }

    // Shake.
    let shakeX = 0, shakeY = 0;
    if (now < this.shakeUntil) {
      const remain = (this.shakeUntil - now) / 1100;
      const amt = this.shakeStrength * remain;
      shakeX = (Math.random() - 0.5) * amt;
      shakeY = (Math.random() - 0.5) * amt;
    }

    this.camera.position.y = this.cameraBaseY + shakeY;
    this.camera.position.x = shakeX;
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Pickaxe swing.
    if (this.swingStart >= 0) {
      const t = (now - this.swingStart) / 320;
      if (t >= 1) {
        this.pickaxe.rotation.x = this.pickaxeRest;
        this.swingStart = -1;
      } else {
        this.pickaxe.rotation.x = this.pickaxeRest - Math.sin(t * Math.PI) * 1.1;
      }
    }

    // Ore-block pop.
    this.rootGroup.children.forEach((child) => {
      if (child.userData && child.userData.popStart) {
        const t = (now - child.userData.popStart) / 280;
        if (t >= 1) {
          child.scale.setScalar(1);
          child.userData.popStart = 0;
        } else {
          child.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.22);
        }
      }
    });

    // Falling debris.
    if (this.debris.length) {
      for (let i = this.debris.length - 1; i >= 0; i -= 1) {
        const block = this.debris[i];
        block.userData.vy -= 9.8 * delta;
        block.position.y += block.userData.vy * delta;
        block.rotation.x += block.userData.rot;
        block.rotation.z += block.userData.rot;
        if (block.position.y < this.cameraBaseY - 6) {
          this.rootGroup.remove(block);
          block.geometry.dispose();
          this.debris.splice(i, 1);
        }
      }
    }
  }

  _bindControls() {
    const start = (x, y) => { this.isDragging = true; this.dragOrigin.x = x; this.dragOrigin.y = y; };
    const move = (x, y) => {
      if (!this.isDragging) return;
      const dx = x - this.dragOrigin.x;
      const dy = y - this.dragOrigin.y;
      this.dragOrigin.x = x; this.dragOrigin.y = y;
      this.targetYaw -= dx * 0.005;
      this.targetYaw = THREE.MathUtils.clamp(this.targetYaw, -0.9, 0.9);
      this.targetPitch = THREE.MathUtils.clamp(this.targetPitch - dy * 0.004, -0.75, 0.2);
    };
    const end = () => { this.isDragging = false; };

    this.onMouseDown = (e) => { if (e.button === 0) start(e.clientX, e.clientY); };
    this.onMouseMove = (e) => move(e.clientX, e.clientY);
    this.onMouseUp = end;
    this.onTouchStart = (e) => { if (e.touches.length === 1) start(e.touches[0].clientX, e.touches[0].clientY); };
    this.onTouchMove = (e) => { if (e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY); };
    this.onTouchEnd = end;

    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: true });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: true });
    this.canvas.addEventListener('touchend', this.onTouchEnd, { passive: true });
  }

  nudgeYaw(direction) {
    this.targetYaw = THREE.MathUtils.clamp(this.targetYaw + direction * 0.25, -0.9, 0.9);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _clear() {
    this.frontFaces = {};
    this.oreLights.forEach((l) => this.rootGroup.remove(l));
    this.oreLights = [];
    this.debris = [];
    for (let i = this.rootGroup.children.length - 1; i >= 0; i -= 1) {
      const child = this.rootGroup.children[i];
      this.rootGroup.remove(child);
      if (child.geometry && child.geometry !== this.blockGeo) child.geometry.dispose();
    }
  }

  dispose() {
    this.stopLoop();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this._clear();
    this.blockGeo.dispose();
    this.renderer.dispose();
  }
}
