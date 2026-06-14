// Minecraft-style voxel mine. Everything is procedural: pixel-art textures are
// painted to 16x16 canvases (nearest-filter for crisp pixels) and mapped onto
// cubes. A blocky avatar descends a shaft in third person, swinging a pickaxe.

const BLOCK = 1;
const SHAFT_HALF = 2;       // perimeter at |x|==2 or |z|==2, interior 3x3 open
const STAND = 0.0;          // avatar feet sit at y = -depth + STAND

// ---------- Pixel-art texture factory ----------
const TextureFactory = {
  cache: {},

  _make(key, draw) {
    if (this.cache[key]) return this.cache[key];
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    draw(ctx);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    this.cache[key] = tex;
    return tex;
  },

  _noise(ctx, shades) {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        ctx.fillStyle = shades[Math.floor(Math.random() * shades.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  },

  _speckle(ctx, mineralShades, clusters) {
    for (let c = 0; c < clusters; c += 1) {
      const cx = 2 + Math.floor(Math.random() * 12);
      const cy = 2 + Math.floor(Math.random() * 12);
      const blobs = 3 + Math.floor(Math.random() * 3);
      for (let b = 0; b < blobs; b += 1) {
        const x = Math.max(0, Math.min(15, cx + Math.floor((Math.random() - 0.5) * 4)));
        const y = Math.max(0, Math.min(15, cy + Math.floor((Math.random() - 0.5) * 4)));
        ctx.fillStyle = mineralShades[Math.floor(Math.random() * mineralShades.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  },

  grassTop() { return this._make('grassTop', (c) => this._noise(c, ['#5fae3f', '#6abe4f', '#56a338', '#74c95a'])); },
  grassSide() {
    return this._make('grassSide', (c) => {
      this._noise(c, ['#8b6b4a', '#946f4d', '#7e5f40', '#82623f']);
      for (let x = 0; x < 16; x += 1) {
        for (let y = 0; y < 4 + Math.floor(Math.random() * 2); y += 1) {
          c.fillStyle = ['#5fae3f', '#6abe4f', '#56a338'][Math.floor(Math.random() * 3)];
          c.fillRect(x, y, 1, 1);
        }
      }
    });
  },
  dirt() { return this._make('dirt', (c) => this._noise(c, ['#8b6b4a', '#946f4d', '#7e5f40', '#82623f'])); },
  stone() { return this._make('stone', (c) => this._noise(c, ['#8a8a8a', '#949494', '#828282', '#7c7c7c'])); },
  cobble() {
    return this._make('cobble', (c) => {
      this._noise(c, ['#8a8a8a', '#777777', '#6f6f6f', '#9a9a9a']);
      for (let i = 0; i < 6; i += 1) {
        c.fillStyle = '#5e5e5e';
        c.fillRect(Math.floor(Math.random() * 14), Math.floor(Math.random() * 14), 2, 2);
      }
    });
  },
  deepslate() { return this._make('deepslate', (c) => this._noise(c, ['#48464f', '#403e47', '#514f59', '#393740'])); },
  planks() {
    return this._make('planks', (c) => {
      this._noise(c, ['#9a6b38', '#a87a45', '#8c5f30', '#b3854f']);
      c.fillStyle = '#6e4a24';
      for (let y = 0; y < 16; y += 4) c.fillRect(0, y, 16, 1);
    });
  },
  ore(name, base, mineral, clusters) {
    return this._make('ore_' + name, (c) => {
      this._noise(c, base);
      this._speckle(c, mineral, clusters);
    });
  }
};

const STONE_SHADES = ['#8a8a8a', '#949494', '#828282', '#7c7c7c'];
const DEEP_SHADES = ['#48464f', '#403e47', '#514f59', '#393740'];

// Ore appearance by tier (1..5): texture + optional emissive glow.
const ORE_TIERS_GFX = {
  1: { tex: () => TextureFactory.ore('coal', STONE_SHADES, ['#2a2a2a', '#1c1c1c', '#363636'], 3), emissive: 0x000000, glow: 0 },
  2: { tex: () => TextureFactory.ore('iron', STONE_SHADES, ['#caa07e', '#b98a64', '#d9b48f'], 3), emissive: 0x000000, glow: 0 },
  3: { tex: () => TextureFactory.ore('gold', STONE_SHADES, ['#f4c542', '#ffd95a', '#c9971f'], 4), emissive: 0x4a3300, glow: 0.7 },
  4: { tex: () => TextureFactory.ore('lapis', STONE_SHADES, ['#2f5bd6', '#3f6bf0', '#1f3fa0'], 4), emissive: 0x0a1f6b, glow: 0.9 },
  5: { tex: () => TextureFactory.ore('diamond', DEEP_SHADES, ['#6cf0e4', '#8ff7ee', '#3fd0c4'], 5), emissive: 0x0c5a52, glow: 1.2 }
};

class MineRenderer {
  constructor(canvas) {
    this.canvas = canvas;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8ec5ff);
    this.scene.fog = new THREE.Fog(0x2a2738, 8, 26);

    this.camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 200);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.blockGeo = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);
    this.frontFaces = {};
    this.oreLights = [];
    this.debris = [];
    this.clouds = [];

    this.depth = 0;
    this.playerY = STAND;
    this.descendStart = 0;
    this.descendFrom = STAND;
    this.descendTo = STAND;
    this.descendDur = 0;
    this.onArrive = null;

    this.swingStart = -1;
    this.shakeUntil = 0;
    this.shakeStrength = 0;

    this.orbitYaw = 0;
    this.targetOrbitYaw = 0;
    this.isDragging = false;
    this.dragOrigin = { x: 0, y: 0 };

    this.clock = new THREE.Clock();
    this.animationId = null;

    this._setupLights();
    this._buildPlayer();
    this._bindControls();
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  ensureReady() { return Promise.resolve(); }

  _setupLights() {
    this.scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x3a2c1e, 0.5));
    const sun = new THREE.DirectionalLight(0xfff4e0, 0.55);
    sun.position.set(6, 26, 8);
    this.scene.add(sun);

    // Warm head lamp on the avatar so deep blocks stay lit and contrasty.
    this.headLamp = new THREE.PointLight(0xffe6b8, 1.15, 11, 2);
    this.scene.add(this.headLamp);
  }

  _mat(tex) { return new THREE.MeshLambertMaterial({ map: tex }); }

  _grassMats() {
    const side = this._mat(TextureFactory.grassSide());
    const top = this._mat(TextureFactory.grassTop());
    const bottom = this._mat(TextureFactory.dirt());
    return [side, side, top, bottom, side, side];
  }

  _wallTexForRow(row) {
    if (row <= 2) return TextureFactory.dirt();
    if (row <= 4) return TextureFactory.stone();
    if (row <= 6) return TextureFactory.cobble();
    if (row <= 8) return TextureFactory.deepslate();
    return TextureFactory.deepslate();
  }

  buildShaft(maxFloors) {
    this.maxFloors = maxFloors;
    this._clear();

    // Grass field around the opening. The front side (toward the camera) is
    // left open so the shaft reads as a clean cross-section / diorama.
    for (let x = -SHAFT_HALF - 2; x <= SHAFT_HALF + 2; x += 1) {
      for (let z = -SHAFT_HALF - 2; z <= SHAFT_HALF + 2; z += 1) {
        if (z >= SHAFT_HALF) continue; // open front
        const isOpening = Math.abs(x) <= SHAFT_HALF - 1 && z >= -SHAFT_HALF + 1;
        if (isOpening) continue;
        const mesh = new THREE.Mesh(this.blockGeo, this._grassMats());
        mesh.position.set(x, 0, z);
        this.rootGroup.add(mesh);
      }
    }

    // Shaft walls, textured by depth band. The south wall (z === SHAFT_HALF,
    // nearest the camera) is skipped so we can see inside.
    for (let row = 1; row <= maxFloors; row += 1) {
      const wallMat = this._mat(this._wallTexForRow(row));
      for (let x = -SHAFT_HALF; x <= SHAFT_HALF; x += 1) {
        for (let z = -SHAFT_HALF; z <= SHAFT_HALF; z += 1) {
          if (Math.abs(x) !== SHAFT_HALF && Math.abs(z) !== SHAFT_HALF) continue;
          if (z === SHAFT_HALF) continue; // open cutaway toward camera
          const mesh = new THREE.Mesh(this.blockGeo, wallMat);
          mesh.position.set(x, -row, z);
          this.rootGroup.add(mesh);
          if (x === 0 && z === -SHAFT_HALF) this.frontFaces[row] = mesh;
        }
      }
    }

    // Wooden ladder on the east wall (visible, doesn't block the hero shot).
    const ladderMat = this._mat(TextureFactory.planks());
    for (let row = 0; row <= maxFloors; row += 1) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), ladderMat);
      rung.position.set(SHAFT_HALF - 0.45, -row + 0.3, 0);
      this.rootGroup.add(rung);
    }

    // Torches every few floors for that lit-cave feel (off the ladder and ore).
    for (let row = 2; row <= maxFloors; row += 3) {
      this._addTorch(-SHAFT_HALF + 0.45, -row + 0.2, 0);
      this._addTorch(SHAFT_HALF - 0.45, -row + 0.2, -1.2);
    }

    // The plank platform the avatar stands on (moves down with the player).
    this.platform = new THREE.Group();
    for (let x = -1; x <= 1; x += 1) {
      for (let z = -1; z <= 1; z += 1) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(1, 0.18, 1), ladderMat);
        plank.position.set(x, -0.1, z);
        this.platform.add(plank);
      }
    }
    this.rootGroup.add(this.platform);

    // A few clouds drifting in the sky.
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (let i = 0; i < 5; i += 1) {
      const cloud = new THREE.Mesh(new THREE.BoxGeometry(3 + Math.random() * 2, 0.6, 2), cloudMat);
      cloud.position.set((Math.random() - 0.5) * 26, 11 + Math.random() * 4, (Math.random() - 0.5) * 26);
      this.rootGroup.add(cloud);
      this.clouds.push(cloud);
    }

    this.depth = 0;
    this.playerY = STAND;
    this._placePlayer(STAND);
    this.orbitYaw = 0; this.targetOrbitYaw = 0;
  }

  _addTorch(x, y, z) {
    const group = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), this._mat(TextureFactory.planks()));
    stick.position.y = -0.1;
    const flame = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xffb030 })
    );
    flame.position.y = 0.16;
    group.add(stick, flame);
    group.position.set(x, y, z);
    this.rootGroup.add(group);

    const light = new THREE.PointLight(0xffa030, 0.8, 7, 2);
    light.position.set(x, y + 0.2, z);
    this.rootGroup.add(light);
    this.oreLights.push(light);
  }

  _buildPlayer() {
    this.player = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: 0xd9a37a });
    const shirt = new THREE.MeshLambertMaterial({ color: 0x2aa9a0 });
    const pants = new THREE.MeshLambertMaterial({ color: 0x3b5bd6 });

    // Head with a simple face.
    const headTex = TextureFactory._make('face', (c) => {
      for (let y = 0; y < 16; y += 1) for (let x = 0; x < 16; x += 1) {
        c.fillStyle = ['#d9a37a', '#cf9870', '#e0ab82'][Math.floor(Math.random() * 3)];
        c.fillRect(x, y, 1, 1);
      }
      c.fillStyle = '#3a2a1a'; // hair top
      c.fillRect(0, 0, 16, 4);
      c.fillStyle = '#ffffff'; c.fillRect(4, 8, 2, 2); c.fillRect(10, 8, 2, 2);
      c.fillStyle = '#3b5bd6'; c.fillRect(4, 9, 1, 1); c.fillRect(10, 9, 1, 1);
      c.fillStyle = '#7a4a2a'; c.fillRect(6, 12, 4, 1);
    });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), this._mat(headTex));
    head.position.y = 1.5;
    this.player.add(head);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.26), shirt);
    torso.position.y = 0.9;
    this.player.add(torso);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), shirt);
    leftArm.position.set(-0.36, 0.9, 0);
    this.player.add(leftArm);

    // Right arm pivots at the shoulder so it can swing.
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.36, 1.25, 0);
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), skin);
    rightArmMesh.position.y = -0.35;
    this.rightArm.add(rightArmMesh);

    // Pickaxe in the right hand.
    const pick = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.07), this._mat(TextureFactory.planks()));
    const headIron = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.09, 0.09),
      new THREE.MeshLambertMaterial({ color: 0xb8c0c8 })
    );
    headIron.position.y = 0.28;
    pick.add(handle, headIron);
    pick.position.set(0, -0.62, 0.1);
    pick.rotation.x = 0.5;
    this.rightArm.add(pick);
    this.player.add(this.rightArm);
    this.rightArmRest = this.rightArm.rotation.x;

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.24), pants);
    leftLeg.position.set(-0.13, 0.35, 0);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.24), pants);
    rightLeg.position.set(0.13, 0.35, 0);
    this.player.add(leftLeg, rightLeg);

    this.scene.add(this.player);
  }

  _placePlayer(y) {
    this.player.position.set(0, y, 0.2);
    this.player.rotation.y = Math.PI; // face into the shaft (-Z)
    if (this.platform) this.platform.position.set(0, y, 0.2);
    this.headLamp.position.set(0, y + 1.6, 0.2);
  }

  swingPickaxe() { this.swingStart = performance.now(); }

  descend(onArrive) {
    this.depth += 1;
    this.descendFrom = this.playerY;
    this.descendTo = -this.depth + STAND;
    this.descendStart = performance.now();
    this.descendDur = 650;
    this.onArrive = onArrive || null;
  }

  setDepth(depth) {
    this.depth = depth;
    this.playerY = -depth + STAND;
    this._placePlayer(this.playerY);
    this.descendDur = 0;
  }

  revealOre(depth, tierIndex) {
    const face = this.frontFaces[depth];
    const gfx = ORE_TIERS_GFX[tierIndex] || ORE_TIERS_GFX[1];
    if (face) {
      face.material = new THREE.MeshLambertMaterial({
        map: gfx.tex(),
        emissive: gfx.emissive,
        emissiveIntensity: 1
      });
      face.userData.popStart = performance.now();
    }
    if (gfx.glow > 0 && face) {
      const light = new THREE.PointLight(gfx.emissive || 0xffffff, gfx.glow, 6, 2);
      light.color.set(tierIndex === 5 ? 0x6cf0e4 : tierIndex === 4 ? 0x3f6bf0 : 0xffd95a);
      light.position.copy(face.position);
      light.position.z += 0.6;
      this.rootGroup.add(light);
      this.oreLights.push(light);
    }
  }

  caveIn(onDone) {
    this.shakeUntil = performance.now() + 1100;
    this.shakeStrength = 0.4;
    const debrisMat = this._mat(this._wallTexForRow(Math.max(1, this.depth)));
    for (let i = 0; i < 18; i += 1) {
      const size = 0.3 + Math.random() * 0.5;
      const block = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), debrisMat);
      block.position.set((Math.random() - 0.5) * 3.2, this.playerY + 6 + Math.random() * 6, (Math.random() - 0.5) * 3.2 - 0.2);
      block.userData.vy = -(3 + Math.random() * 4);
      block.userData.rot = (Math.random() - 0.5) * 0.3;
      this.rootGroup.add(block);
      this.debris.push(block);
    }
    if (onDone) setTimeout(onDone, 900);
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
    this.orbitYaw += (this.targetOrbitYaw - this.orbitYaw) * Math.min(1, delta * 8);

    // Descent tween.
    if (this.descendDur > 0) {
      const t = Math.min(1, (now - this.descendStart) / this.descendDur);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.playerY = this.descendFrom + (this.descendTo - this.descendFrom) * eased;
      this._placePlayer(this.playerY);
      if (t >= 1) {
        this.descendDur = 0;
        this.playerY = this.descendTo;
        this._placePlayer(this.playerY);
        const cb = this.onArrive; this.onArrive = null;
        if (cb) cb();
      }
    }

    // Pickaxe / arm swing.
    if (this.swingStart >= 0) {
      const t = (now - this.swingStart) / 320;
      if (t >= 1) { this.rightArm.rotation.x = this.rightArmRest; this.swingStart = -1; }
      else { this.rightArm.rotation.x = this.rightArmRest - Math.sin(t * Math.PI) * 1.3; }
    }

    // Ore pop.
    this.rootGroup.children.forEach((child) => {
      if (child.userData && child.userData.popStart) {
        const t = (now - child.userData.popStart) / 280;
        if (t >= 1) { child.scale.setScalar(1); child.userData.popStart = 0; }
        else { child.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.22); }
      }
    });

    // Debris.
    for (let i = this.debris.length - 1; i >= 0; i -= 1) {
      const block = this.debris[i];
      block.userData.vy -= 9.8 * delta;
      block.position.y += block.userData.vy * delta;
      block.rotation.x += block.userData.rot;
      if (block.position.y < this.playerY - 6) {
        this.rootGroup.remove(block);
        block.geometry.dispose();
        this.debris.splice(i, 1);
      }
    }

    // Clouds drift.
    this.clouds.forEach((cloud) => {
      cloud.position.x += delta * 0.3;
      if (cloud.position.x > 16) cloud.position.x = -16;
    });

    // Third-person follow camera with shake.
    let shake = 0;
    if (now < this.shakeUntil) shake = ((this.shakeUntil - now) / 1100) * this.shakeStrength;
    const dist = 4.8;
    const height = 2.6;
    const cx = Math.sin(this.orbitYaw) * dist + (Math.random() - 0.5) * shake;
    const cz = Math.cos(this.orbitYaw) * dist + 0.2;
    this.camera.position.set(cx, this.playerY + height + (Math.random() - 0.5) * shake, cz);
    this.camera.lookAt(0, this.playerY + 0.4, -0.8);
  }

  _bindControls() {
    const start = (x) => { this.isDragging = true; this.dragOrigin.x = x; };
    const move = (x) => {
      if (!this.isDragging) return;
      const dx = x - this.dragOrigin.x;
      this.dragOrigin.x = x;
      this.targetOrbitYaw = THREE.MathUtils.clamp(this.targetOrbitYaw - dx * 0.006, -1.1, 1.1);
    };
    const end = () => { this.isDragging = false; };

    this.onMouseDown = (e) => { if (e.button === 0) start(e.clientX); };
    this.onMouseMove = (e) => move(e.clientX);
    this.onMouseUp = end;
    this.onTouchStart = (e) => { if (e.touches.length === 1) start(e.touches[0].clientX); };
    this.onTouchMove = (e) => { if (e.touches.length === 1) move(e.touches[0].clientX); };
    this.onTouchEnd = end;

    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: true });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: true });
    this.canvas.addEventListener('touchend', this.onTouchEnd, { passive: true });
  }

  nudgeYaw(direction) {
    this.targetOrbitYaw = THREE.MathUtils.clamp(this.targetOrbitYaw + direction * 0.3, -1.1, 1.1);
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
    this.clouds = [];
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
    if (this.player) this.scene.remove(this.player);
    this._clear();
    this.blockGeo.dispose();
    this.renderer.dispose();
  }
}
