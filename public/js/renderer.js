// Minecraft-style underground mine. Procedural pixel-art textures on cubes, a
// blocky third-person avatar that descends a dungeon shaft. Terrain grows more
// exotic with depth (dirt -> stone -> deepslate -> obsidian -> amethyst ->
// bedrock) and is dressed with lava, water, crystals and cave openings.

const BLOCK = 1;
const SHAFT_HALF = 2;       // perimeter at |x|==2 or |z|==2, interior 3x3 open
const STAND = 0.0;          // avatar feet sit at y = -depth + STAND

// ---------- Pixel-art texture factory ----------
const TextureFactory = {
  cache: {},
  _make(key, draw) {
    if (this.cache[key]) return this.cache[key];
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 16;
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
    for (let y = 0; y < 16; y += 1) for (let x = 0; x < 16; x += 1) {
      ctx.fillStyle = shades[Math.floor(Math.random() * shades.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  },
  _speckle(ctx, shades, n) {
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = shades[Math.floor(Math.random() * shades.length)];
      ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 1, 1);
    }
  },

  grassTop() { return this._make('grassTop', (c) => this._noise(c, ['#5fae3f', '#6abe4f', '#56a338', '#74c95a'])); },
  grassSide() {
    return this._make('grassSide', (c) => {
      this._noise(c, ['#8b6b4a', '#946f4d', '#7e5f40']);
      for (let x = 0; x < 16; x += 1) for (let y = 0; y < 4; y += 1) {
        c.fillStyle = ['#5fae3f', '#6abe4f'][Math.floor(Math.random() * 2)];
        c.fillRect(x, y, 1, 1);
      }
    });
  },
  bricks() {
    return this._make('bricks', (c) => {
      this._noise(c, ['#6f6a62', '#7a756c', '#646058']);
      c.fillStyle = '#3f3b35';
      for (let y = 0; y <= 16; y += 4) c.fillRect(0, y, 16, 1);
      for (let y = 0; y < 16; y += 8) { c.fillRect(4, y, 1, 4); c.fillRect(12, y, 1, 4); }
      for (let y = 4; y < 16; y += 8) { c.fillRect(8, y, 1, 4); }
    });
  },
  dirt() { return this._make('dirt', (c) => this._noise(c, ['#8b6b4a', '#946f4d', '#7e5f40', '#82623f'])); },
  stone() { return this._make('stone', (c) => this._noise(c, ['#8a8a8a', '#949494', '#828282', '#7c7c7c'])); },
  cobble() {
    return this._make('cobble', (c) => {
      this._noise(c, ['#8a8a8a', '#777', '#6f6f6f', '#9a9a9a']);
      for (let i = 0; i < 6; i += 1) { c.fillStyle = '#5e5e5e'; c.fillRect(Math.floor(Math.random() * 14), Math.floor(Math.random() * 14), 2, 2); }
    });
  },
  andesite() { return this._make('andesite', (c) => this._noise(c, ['#7e8a8f', '#8d989c', '#727d82', '#9aa4a8'])); },
  deepslate() { return this._make('deepslate', (c) => this._noise(c, ['#48464f', '#403e47', '#514f59', '#393740'])); },
  obsidian() {
    return this._make('obsidian', (c) => {
      this._noise(c, ['#17121f', '#1d1726', '#120e18', '#241c30']);
      this._speckle(c, ['#5a3f8a', '#7a52c0'], 10);
    });
  },
  amethyst() {
    return this._make('amethyst', (c) => {
      this._noise(c, ['#5a3f8a', '#6b4aa0', '#4a3275', '#7e5cc0']);
      this._speckle(c, ['#b58cff', '#d6b8ff'], 14);
    });
  },
  bedrock() { return this._make('bedrock', (c) => this._noise(c, ['#2a2730', '#201d26', '#34313c', '#171520'])); },
  planks() {
    return this._make('planks', (c) => {
      this._noise(c, ['#9a6b38', '#a87a45', '#8c5f30', '#b3854f']);
      c.fillStyle = '#6e4a24'; for (let y = 0; y < 16; y += 4) c.fillRect(0, y, 16, 1);
    });
  },
  lava() {
    return this._make('lava', (c) => {
      this._noise(c, ['#ff7b1a', '#ff9b2a', '#e85a0c', '#ffc14a']);
      this._speckle(c, ['#fff0a0', '#c83a06'], 18);
    });
  },
  water() { return this._make('water', (c) => this._noise(c, ['#2a6bd0', '#3f7be0', '#235ab0', '#4f8bf0'])); }
};

// Depth bands: which wall texture, from the surface down to bedrock.
const DEPTH_BANDS = [
  { upTo: 4, tex: 'dirt' },
  { upTo: 9, tex: 'stone' },
  { upTo: 14, tex: 'cobble' },
  { upTo: 19, tex: 'andesite' },
  { upTo: 24, tex: 'deepslate' },
  { upTo: 30, tex: 'obsidian' },
  { upTo: 36, tex: 'amethyst' },
  { upTo: 999, tex: 'bedrock' }
];

class MineRenderer {
  constructor(canvas) {
    this.canvas = canvas;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0a12);   // dark dungeon, no blue sky
    this.scene.fog = new THREE.Fog(0x0c0a12, 7, 26);

    this.camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 200);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.blockGeo = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);
    this.dynamicLights = [];
    this.debris = [];
    this.goldBurst = [];

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
    this.chestOpenStart = -1;

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
    this.scene.add(new THREE.HemisphereLight(0x3a3550, 0x141019, 0.35));

    // Soft light spilling down from the dungeon entrance.
    this.entranceLight = new THREE.PointLight(0xbcd0ff, 0.8, 14, 2);
    this.entranceLight.position.set(0, 3, 1);
    this.scene.add(this.entranceLight);

    // Warm head lamp on the avatar so the working face stays lit.
    this.headLamp = new THREE.PointLight(0xffe6b8, 1.3, 12, 2);
    this.scene.add(this.headLamp);
  }

  _mat(texName) { return new THREE.MeshLambertMaterial({ map: TextureFactory[texName]() }); }

  _bandTexFor(row) {
    const band = DEPTH_BANDS.find((b) => row <= b.upTo) || DEPTH_BANDS[DEPTH_BANDS.length - 1];
    return band.tex;
  }

  buildShaft(maxFloors) {
    this.maxFloors = maxFloors;
    this._clear();

    // Dungeon entrance rim (stone bricks, not grass) — front side left open.
    const brickMat = this._mat('bricks');
    for (let x = -SHAFT_HALF - 2; x <= SHAFT_HALF + 2; x += 1) {
      for (let z = -SHAFT_HALF - 2; z <= SHAFT_HALF + 2; z += 1) {
        if (z >= SHAFT_HALF) continue;
        const isOpening = Math.abs(x) <= SHAFT_HALF - 1 && z >= -SHAFT_HALF + 1;
        if (isOpening) continue;
        const mesh = new THREE.Mesh(this.blockGeo, brickMat);
        mesh.position.set(x, 0, z);
        this.rootGroup.add(mesh);
      }
    }

    // Shaft walls (south wall toward camera left open for the cross-section).
    for (let row = 1; row <= maxFloors; row += 1) {
      const wallMat = this._mat(this._bandTexFor(row));
      for (let x = -SHAFT_HALF; x <= SHAFT_HALF; x += 1) {
        for (let z = -SHAFT_HALF; z <= SHAFT_HALF; z += 1) {
          if (Math.abs(x) !== SHAFT_HALF && Math.abs(z) !== SHAFT_HALF) continue;
          if (z === SHAFT_HALF) continue;
          const mesh = new THREE.Mesh(this.blockGeo, wallMat);
          mesh.position.set(x, -row, z);
          this.rootGroup.add(mesh);
        }
      }
      this._maybeFeature(row);
    }

    // Ladder on the east wall.
    const ladderMat = this._mat('planks');
    for (let row = 0; row <= maxFloors; row += 1) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), ladderMat);
      rung.position.set(SHAFT_HALF - 0.45, -row + 0.3, 0);
      this.rootGroup.add(rung);
    }

    // Plank platform + treasure chest the avatar carries (moves with player).
    this.platform = new THREE.Group();
    for (let x = -1; x <= 1; x += 1) for (let z = -1; z <= 1; z += 1) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1, 0.18, 1), ladderMat);
      plank.position.set(x, -0.1, z);
      this.platform.add(plank);
    }
    this._buildChest();
    this.platform.add(this.chest);
    this.rootGroup.add(this.platform);

    this.depth = 0;
    this.playerY = STAND;
    this._placePlayer(STAND);
    this.orbitYaw = 0; this.targetOrbitYaw = 0;
  }

  _maybeFeature(row) {
    if (row < 4 || Math.random() > 0.5) return;

    let pool;
    if (row <= 14) pool = ['water', 'cave', 'crystal'];
    else if (row <= 24) pool = ['cave', 'crystal', 'water', 'lava'];
    else pool = ['lava', 'crystal', 'cave', 'lava'];
    const type = pool[Math.floor(Math.random() * pool.length)];

    // Pick a wall: east, west, or north (never the open south).
    const walls = [
      { axis: 'x', sign: 1 }, { axis: 'x', sign: -1 }, { axis: 'z', sign: -1 }
    ];
    const w = walls[Math.floor(Math.random() * walls.length)];
    const lateral = [-1, 0, 1][Math.floor(Math.random() * 3)];
    const inset = SHAFT_HALF - 0.52;
    const pos = new THREE.Vector3();
    if (w.axis === 'x') pos.set(w.sign * inset, -row, lateral);
    else pos.set(lateral, -row, -inset);

    if (type === 'cave') {
      // Unlit black slab fakes an opening into darkness.
      const geo = w.axis === 'x' ? new THREE.BoxGeometry(0.1, 0.95, 0.95) : new THREE.BoxGeometry(0.95, 0.95, 0.1);
      const slab = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x050308 }));
      slab.position.copy(pos);
      this.rootGroup.add(slab);
    } else if (type === 'water' || type === 'lava') {
      const isLava = type === 'lava';
      const geo = w.axis === 'x' ? new THREE.BoxGeometry(0.1, 0.95, 0.95) : new THREE.BoxGeometry(0.95, 0.95, 0.1);
      const mat = isLava
        ? new THREE.MeshBasicMaterial({ map: TextureFactory.lava() })
        : new THREE.MeshLambertMaterial({ map: TextureFactory.water(), transparent: true, opacity: 0.7 });
      const slab = new THREE.Mesh(geo, mat);
      slab.position.copy(pos);
      this.rootGroup.add(slab);
      if (isLava) {
        const light = new THREE.PointLight(0xff7a1a, 1.0, 6, 2);
        light.position.copy(pos);
        this.rootGroup.add(light);
        this.dynamicLights.push(light);
      }
    } else if (type === 'crystal') {
      const color = row > 24 ? 0xb58cff : row > 14 ? 0x6cf0e4 : 0x8fe3ff;
      const cluster = new THREE.Group();
      for (let i = 0; i < 3; i += 1) {
        const s = 0.12 + Math.random() * 0.16;
        const shard = new THREE.Mesh(
          new THREE.BoxGeometry(s, s + 0.2, s),
          new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.9 })
        );
        shard.position.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.5);
        shard.rotation.set(Math.random(), Math.random(), Math.random());
        cluster.add(shard);
      }
      cluster.position.copy(pos);
      this.rootGroup.add(cluster);
      const light = new THREE.PointLight(color, 0.7, 5, 2);
      light.position.copy(pos);
      this.rootGroup.add(light);
      this.dynamicLights.push(light);
    }
  }

  _buildChest() {
    this.chest = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: 0x6b4a24 });
    const gold = new THREE.MeshLambertMaterial({ color: 0xf4c542, emissive: 0x3a2a00, emissiveIntensity: 0.4 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.5), wood);
    base.position.y = 0.21;
    this.chest.add(base);

    this.chestLid = new THREE.Group();
    this.chestLid.position.set(0, 0.42, -0.25);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.2, 0.52), wood);
    lid.position.set(0, 0.0, 0.25);
    this.chestLid.add(lid);
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.06), gold);
    latch.position.set(0, -0.02, 0.51);
    this.chestLid.add(latch);
    this.chest.add(this.chestLid);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.06, 0.54), gold);
    trim.position.y = 0.42;
    this.chest.add(trim);

    this.chest.position.set(0, 0, -0.55);
    this.chest.rotation.y = 0;
    this.chestLidRest = this.chestLid.rotation.x;
  }

  _buildPlayer() {
    this.player = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: 0xd9a37a });
    const shirt = new THREE.MeshLambertMaterial({ color: 0x2aa9a0 });
    const pants = new THREE.MeshLambertMaterial({ color: 0x3b5bd6 });

    const headTex = TextureFactory._make('face', (c) => {
      for (let y = 0; y < 16; y += 1) for (let x = 0; x < 16; x += 1) {
        c.fillStyle = ['#d9a37a', '#cf9870', '#e0ab82'][Math.floor(Math.random() * 3)];
        c.fillRect(x, y, 1, 1);
      }
      c.fillStyle = '#3a2a1a'; c.fillRect(0, 0, 16, 4);
      c.fillStyle = '#fff'; c.fillRect(4, 8, 2, 2); c.fillRect(10, 8, 2, 2);
      c.fillStyle = '#3b5bd6'; c.fillRect(4, 9, 1, 1); c.fillRect(10, 9, 1, 1);
      c.fillStyle = '#7a4a2a'; c.fillRect(6, 12, 4, 1);
    });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshLambertMaterial({ map: headTex }));
    head.position.y = 1.5;
    this.player.add(head);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.26), shirt);
    torso.position.y = 0.9;
    this.player.add(torso);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), shirt);
    leftArm.position.set(-0.36, 0.9, 0);
    this.player.add(leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.36, 1.25, 0);
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), skin);
    rightArmMesh.position.y = -0.35;
    this.rightArm.add(rightArmMesh);

    const pick = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.07), this._mat('planks'));
    const headIron = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 0.09), new THREE.MeshLambertMaterial({ color: 0xb8c0c8 }));
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
    this.player.rotation.y = Math.PI;
    if (this.platform) this.platform.position.set(0, y, 0.2);
    this.headLamp.position.set(0, y + 1.6, 0.2);
  }

  swingPickaxe() { this.swingStart = performance.now(); }

  // Descend by `steps` floors (driven by the question level).
  descend(steps, onArrive) {
    steps = Math.max(1, steps | 0);
    this.depth += steps;
    this.descendFrom = this.playerY;
    this.descendTo = -this.depth + STAND;
    this.descendStart = performance.now();
    this.descendDur = 420 + steps * 230;
    this.onArrive = onArrive || null;
  }

  setDepth(depth) {
    this.depth = depth;
    this.playerY = -depth + STAND;
    this._placePlayer(this.playerY);
    this.descendDur = 0;
  }

  // Open the chest with a gold burst — the payoff for cashing out.
  openChest(onDone) {
    this.chestOpenStart = performance.now();
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xffd95a, emissive: 0x5a3f00, emissiveIntensity: 0.5 });
    for (let i = 0; i < 22; i += 1) {
      const s = 0.08 + Math.random() * 0.1;
      const coin = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), goldMat);
      coin.position.set(0, this.playerY + 0.5, 0.2 - 0.55);
      const ang = Math.random() * Math.PI * 2;
      coin.userData.vx = Math.cos(ang) * (1 + Math.random() * 1.5);
      coin.userData.vz = Math.sin(ang) * (1 + Math.random() * 1.5);
      coin.userData.vy = 3 + Math.random() * 3;
      this.rootGroup.add(coin);
      this.goldBurst.push(coin);
    }
    const light = new THREE.PointLight(0xffd95a, 1.5, 8, 2);
    light.position.set(0, this.playerY + 0.6, -0.4);
    this.rootGroup.add(light);
    this.dynamicLights.push(light);
    if (onDone) setTimeout(onDone, 1300);
  }

  caveIn(onDone) {
    this.shakeUntil = performance.now() + 1100;
    this.shakeStrength = 0.4;
    const debrisMat = this._mat(this._bandTexFor(Math.max(1, this.depth)));
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
    if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }
  }

  _update(delta) {
    const now = performance.now();
    this.orbitYaw += (this.targetOrbitYaw - this.orbitYaw) * Math.min(1, delta * 8);

    if (this.descendDur > 0) {
      const t = Math.min(1, (now - this.descendStart) / this.descendDur);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.playerY = this.descendFrom + (this.descendTo - this.descendFrom) * eased;
      this._placePlayer(this.playerY);
      if (t >= 1) {
        this.descendDur = 0; this.playerY = this.descendTo; this._placePlayer(this.playerY);
        const cb = this.onArrive; this.onArrive = null;
        if (cb) cb();
      }
    }

    if (this.swingStart >= 0) {
      const t = (now - this.swingStart) / 320;
      if (t >= 1) { this.rightArm.rotation.x = this.rightArmRest; this.swingStart = -1; }
      else { this.rightArm.rotation.x = this.rightArmRest - Math.sin(t * Math.PI) * 1.3; }
    }

    if (this.chestOpenStart >= 0) {
      const t = (now - this.chestOpenStart) / 500;
      this.chestLid.rotation.x = this.chestLidRest - Math.min(1, t) * 1.9;
      if (t >= 1) this.chestOpenStart = -2; // hold open
    }

    for (let i = this.debris.length - 1; i >= 0; i -= 1) {
      const b = this.debris[i];
      b.userData.vy -= 9.8 * delta;
      b.position.y += b.userData.vy * delta;
      b.rotation.x += b.userData.rot;
      if (b.position.y < this.playerY - 6) { this.rootGroup.remove(b); b.geometry.dispose(); this.debris.splice(i, 1); }
    }

    for (let i = this.goldBurst.length - 1; i >= 0; i -= 1) {
      const g = this.goldBurst[i];
      g.userData.vy -= 9.8 * delta;
      g.position.x += g.userData.vx * delta;
      g.position.z += g.userData.vz * delta;
      g.position.y += g.userData.vy * delta;
      g.rotation.x += 0.2; g.rotation.y += 0.2;
      if (g.position.y < this.playerY - 1) { this.rootGroup.remove(g); g.geometry.dispose(); this.goldBurst.splice(i, 1); }
    }

    let shake = 0;
    if (now < this.shakeUntil) shake = ((this.shakeUntil - now) / 1100) * this.shakeStrength;
    const dist = 4.8, height = 2.6;
    this.camera.position.set(
      Math.sin(this.orbitYaw) * dist + (Math.random() - 0.5) * shake,
      this.playerY + height + (Math.random() - 0.5) * shake,
      Math.cos(this.orbitYaw) * dist + 0.2
    );
    this.camera.lookAt(0, this.playerY + 0.4, -0.8);
  }

  _bindControls() {
    const start = (x) => { this.isDragging = true; this.dragOrigin.x = x; };
    const move = (x) => {
      if (!this.isDragging) return;
      const dx = x - this.dragOrigin.x; this.dragOrigin.x = x;
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
    this.dynamicLights.forEach((l) => this.rootGroup.remove(l));
    this.dynamicLights = [];
    this.debris = [];
    this.goldBurst = [];
    this.chestOpenStart = -1;
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
