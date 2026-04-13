const MODEL_FILES = {
  floor: 'assets/models/FloorTIle.glb',
  wallA: 'assets/models/Dungeon_Wall_Var1.glb',
  wallB: 'assets/models/Dungeon_Wall_Var2.glb',
  hallway: 'assets/models/Hallway_Full.glb',
  straight: 'assets/models/Dungeon_Straight.glb',
  pillar: 'assets/models/Pillar.glb',
  torch: 'assets/models/Torch.glb',
  torchWall: 'assets/models/Torch_Wall.glb',
  candlestick: 'assets/models/Candlestick_Wall.glb',
  chest: 'assets/models/Chest.glb',
  chestSmall: 'assets/models/ChestSmall.glb',
  barrel: 'assets/models/Barrel_Closed.glb',
  bag: 'assets/models/Bag.glb',
  amphora: 'assets/models/Amphora.glb',
  bone: 'assets/models/Bone.glb',
  crystal: 'assets/models/CrystalBall.glb',
  player: 'assets/models/Player_Rogue.glb'
};

class CrusherRoomRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gridSize = 8;
    this.cellSize = 2.35;
    this.roomHalf = (this.gridSize * this.cellSize) / 2;
    this.eyeHeight = 1.52;
    this.wallHeight = 4.2;
    this.crusherTopY = 5.75;
    this.crusherBottomY = 0.85;

    this.ceilingY = this.crusherTopY - 0.34;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x12101a);
    this.scene.fog = new THREE.Fog(0x12101a, 10, 35);

    this.camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.1, 120);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.6;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.loader = new THREE.GLTFLoader();
    this.modelCache = Object.create(null);
    this.loadPromise = null;

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.torchLights = [];
    this.doors = [];
    this.safeOverlays = [];
    this.crusherGroup = null;
    this.crusherLight = null;
    this.currentActiveDoorId = null;
    this.currentHintDoorId = null;
    this.crusherState = { progress: 0, phase: 'waiting', danger: 0 };

    this.playerTarget = new THREE.Vector3();
    this.playerRender = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = -0.08;
    this.targetYaw = 0;
    this.targetPitch = -0.08;

    this.isDragging = false;
    this.dragOrigin = { x: 0, y: 0 };
    this.shakeUntil = 0;
    this.shakeStrength = 0;

    this.clock = new THREE.Clock();
    this.animationId = null;

    this._createMaterials();
    this._setupLights();
    this._bindControls();
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  ensureModelsLoaded() {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    const entries = Object.entries(MODEL_FILES);
    this.loadPromise = Promise.allSettled(
      entries.map(([key, file]) => this._loadModel(key, file))
    ).then(() => undefined);

    return this.loadPromise;
  }

  _loadModel(key, file) {
    return new Promise((resolve) => {
      this.loader.load(
        file,
        (gltf) => {
          this.modelCache[key] = gltf.scene;
          resolve(gltf.scene);
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  _createMaterials() {
    const floorCanvas = this._createFloorTexture();
    const wallCanvas = this._createWallTexture();
    const doorCanvas = this._createDoorTexture();
    const crusherCanvas = this._createCrusherCanvas();

    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(2, 2);

    const floorNormal = this._generateNormalMap(floorCanvas, 1.8);
    floorNormal.wrapS = THREE.RepeatWrapping;
    floorNormal.wrapT = THREE.RepeatWrapping;
    floorNormal.repeat.set(2, 2);

    this.floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      normalMap: floorNormal,
      normalScale: new THREE.Vector2(0.8, 0.8),
      color: 0x9a8a78,
      roughness: 0.92,
      metalness: 0.02
    });

    const wallTexture = new THREE.CanvasTexture(wallCanvas);
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;

    const wallNormal = this._generateNormalMap(wallCanvas, 2.0);
    wallNormal.wrapS = THREE.RepeatWrapping;
    wallNormal.wrapT = THREE.RepeatWrapping;

    this.wallMaterial = new THREE.MeshStandardMaterial({
      map: wallTexture,
      normalMap: wallNormal,
      normalScale: new THREE.Vector2(1.0, 1.0),
      color: 0x8a7a6a,
      roughness: 0.88,
      metalness: 0.03
    });

    const doorTexture = new THREE.CanvasTexture(doorCanvas);
    doorTexture.wrapS = THREE.RepeatWrapping;
    doorTexture.wrapT = THREE.RepeatWrapping;

    const doorNormal = this._generateNormalMap(doorCanvas, 1.5);
    doorNormal.wrapS = THREE.RepeatWrapping;
    doorNormal.wrapT = THREE.RepeatWrapping;

    this.doorMaterial = new THREE.MeshStandardMaterial({
      map: doorTexture,
      normalMap: doorNormal,
      normalScale: new THREE.Vector2(0.7, 0.7),
      color: 0x5a3828,
      roughness: 0.78,
      metalness: 0.06
    });

    this.frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3c30,
      roughness: 0.82,
      metalness: 0.15
    });

    const crusherTexture = new THREE.CanvasTexture(crusherCanvas);
    crusherTexture.wrapS = THREE.RepeatWrapping;
    crusherTexture.wrapT = THREE.RepeatWrapping;
    crusherTexture.repeat.set(4, 4);

    this.crusherMaterial = new THREE.MeshStandardMaterial({
      map: crusherTexture,
      color: 0x8a7568,
      roughness: 0.88,
      metalness: 0.1
    });

    const safeCanvas = this._createSafeZoneTexture(false);
    const safeTexture = new THREE.CanvasTexture(safeCanvas);
    safeTexture.wrapS = THREE.ClampToEdgeWrapping;
    safeTexture.wrapT = THREE.ClampToEdgeWrapping;

    this.safeOverlayMaterial = new THREE.MeshBasicMaterial({
      map: safeTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.78,
      depthWrite: false
    });

    const startCanvas = this._createSafeZoneTexture(true);
    const startTexture = new THREE.CanvasTexture(startCanvas);
    startTexture.wrapS = THREE.ClampToEdgeWrapping;
    startTexture.wrapT = THREE.ClampToEdgeWrapping;

    this.startPadMaterial = new THREE.MeshBasicMaterial({
      map: startTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.82,
      depthWrite: false
    });

    this.propFallbackMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a7a6e,
      roughness: 0.82,
      metalness: 0.04
    });
  }

  _createFloorTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1e1814';
    ctx.fillRect(0, 0, size, size);

    const blockW = 128;
    const blockH = 64;
    const rows = Math.ceil(size / blockH);
    const cols = Math.ceil(size / blockW) + 2;

    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * (blockW / 2);
      for (let col = -1; col < cols; col++) {
        const bx = col * blockW + offset;
        const by = row * blockH;
        const pad = 3;

        const r = 42 + Math.floor(Math.random() * 28);
        const g = 34 + Math.floor(Math.random() * 22);
        const b = 28 + Math.floor(Math.random() * 16);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(bx + pad, by + pad, blockW - pad * 2, blockH - pad * 2);

        for (let i = 0; i < 60; i++) {
          const nx = bx + pad + Math.random() * (blockW - pad * 2);
          const ny = by + pad + Math.random() * (blockH - pad * 2);
          const shade = Math.floor(Math.random() * 35);
          ctx.fillStyle = `rgba(${shade},${shade},${shade},0.12)`;
          ctx.fillRect(nx, ny, 1 + Math.random() * 4, 1 + Math.random() * 4);
        }

        if (Math.random() > 0.65) {
          ctx.strokeStyle = `rgba(10,8,6,${(0.25 + Math.random() * 0.25).toFixed(2)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          let cx = bx + pad + Math.random() * (blockW - pad * 4);
          let cy = by + pad + Math.random() * (blockH - pad * 4);
          ctx.moveTo(cx, cy);
          for (let s = 0; s < 4; s++) {
            cx += (Math.random() - 0.5) * 24;
            cy += (Math.random() - 0.5) * 16;
            ctx.lineTo(cx, cy);
          }
          ctx.stroke();
        }

        if (Math.random() > 0.8) {
          const sx = bx + blockW / 2 + (Math.random() - 0.5) * blockW * 0.5;
          const sy = by + blockH / 2 + (Math.random() - 0.5) * blockH * 0.5;
          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 12 + Math.random() * 18);
          grad.addColorStop(0, 'rgba(15,10,5,0.2)');
          grad.addColorStop(1, 'rgba(15,10,5,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(bx, by, blockW, blockH);
        }
      }
    }

    ctx.strokeStyle = '#0e0b08';
    ctx.lineWidth = 3;
    for (let row = 0; row <= rows; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * blockH);
      ctx.lineTo(size, row * blockH);
      ctx.stroke();
    }
    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * (blockW / 2);
      for (let col = -1; col <= cols; col++) {
        ctx.beginPath();
        ctx.moveTo(col * blockW + offset, row * blockH);
        ctx.lineTo(col * blockW + offset, (row + 1) * blockH);
        ctx.stroke();
      }
    }

    return canvas;
  }

  _createWallTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1a1410';
    ctx.fillRect(0, 0, size, size);

    const bw = 85;
    const bh = 42;
    const rows = Math.ceil(size / bh);
    const cols = Math.ceil(size / bw) + 2;

    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * (bw / 2);
      for (let col = -1; col < cols; col++) {
        const bx = col * bw + offset;
        const by = row * bh;
        const pad = 2;

        const r = 52 + Math.floor(Math.random() * 30);
        const g = 40 + Math.floor(Math.random() * 24);
        const b = 32 + Math.floor(Math.random() * 18);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(bx + pad, by + pad, bw - pad * 2, bh - pad * 2);

        for (let i = 0; i < 40; i++) {
          const nx = bx + pad + Math.random() * (bw - pad * 2);
          const ny = by + pad + Math.random() * (bh - pad * 2);
          const shade = Math.floor(Math.random() * 30);
          ctx.fillStyle = `rgba(${shade},${shade},${shade},0.1)`;
          ctx.fillRect(nx, ny, 1 + Math.random() * 3, 1 + Math.random() * 3);
        }

        if (row > rows - 4) {
          const alpha = ((row - rows + 4) * 0.04).toFixed(3);
          ctx.fillStyle = `rgba(8,18,6,${alpha})`;
          ctx.fillRect(bx + pad, by + pad, bw - pad * 2, bh - pad * 2);
        }

        if (row < 3 && Math.random() > 0.6) {
          ctx.fillStyle = 'rgba(5,3,2,0.15)';
          ctx.fillRect(bx + Math.random() * bw * 0.8, by, 3 + Math.random() * 6, bh * (1 + Math.random()));
        }
      }
    }

    ctx.strokeStyle = '#0c0908';
    ctx.lineWidth = 2.5;
    for (let row = 0; row <= rows; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * bh);
      ctx.lineTo(size, row * bh);
      ctx.stroke();
    }
    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * (bw / 2);
      for (let col = -1; col <= cols; col++) {
        ctx.beginPath();
        ctx.moveTo(col * bw + offset, row * bh);
        ctx.lineTo(col * bw + offset, (row + 1) * bh);
        ctx.stroke();
      }
    }

    return canvas;
  }

  _createDoorTexture() {
    const w = 256;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(0, 0, w, h);

    for (let x = 0; x < w; x++) {
      const intensity = 30 + Math.sin(x * 0.3) * 8 + Math.sin(x * 1.1) * 4;
      ctx.strokeStyle = `rgba(${intensity + 15},${intensity + 5},${intensity},0.3)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y < h; y += 4) {
        ctx.lineTo(x + Math.sin(y * 0.02 + x * 0.1) * 1.5, y);
      }
      ctx.stroke();
    }

    const plankWidth = Math.floor(w / 3);
    ctx.strokeStyle = '#151008';
    ctx.lineWidth = 3;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * plankWidth, 0);
      ctx.lineTo(i * plankWidth, h);
      ctx.stroke();
    }

    const bandPositions = [h * 0.15, h * 0.5, h * 0.85];
    bandPositions.forEach((by) => {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, by - 8, w, 16);
      for (let i = 0; i < 3; i++) {
        const rx = plankWidth * i + plankWidth / 2;
        ctx.fillStyle = '#2a2a28';
        ctx.beginPath();
        ctx.arc(rx, by, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#353530';
        ctx.beginPath();
        ctx.arc(rx - 1, by - 1, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(0,0,0,${(0.05 + Math.random() * 0.1).toFixed(2)})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }

    for (let k = 0; k < 3; k++) {
      if (Math.random() > 0.4) {
        const kx = Math.random() * w;
        const ky = Math.random() * h;
        const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, 6 + Math.random() * 8);
        grad.addColorStop(0, 'rgba(15,8,4,0.6)');
        grad.addColorStop(0.5, 'rgba(25,15,8,0.3)');
        grad.addColorStop(1, 'rgba(25,15,8,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(kx, ky, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return canvas;
  }

  _createSafeZoneTexture(isStart) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Transparent background
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = size * 0.46;

    // Subtle darkened stone patch (worn rune ring)
    const baseColor = isStart ? [60, 18, 14] : [12, 10, 16];
    const [br, bg, bb] = baseColor;

    const ringGrad = ctx.createRadialGradient(cx, cy, outerRadius * 0.25, cx, cy, outerRadius);
    ringGrad.addColorStop(0, `rgba(${br},${bg},${bb},0.05)`);
    ringGrad.addColorStop(0.55, `rgba(${br},${bg},${bb},0.55)`);
    ringGrad.addColorStop(0.82, `rgba(${br},${bg},${bb},0.78)`);
    ringGrad.addColorStop(1, `rgba(${br},${bg},${bb},0)`);
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Outer carved ring line
    const ringColor = isStart ? 'rgba(160,40,20,0.55)' : 'rgba(120,130,170,0.40)';
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius * 0.86, 0, Math.PI * 2);
    ctx.stroke();

    // Inner ring
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius * 0.74, 0, Math.PI * 2);
    ctx.stroke();

    // Runic tick marks around the ring
    const tickCount = 12;
    const tickColor = isStart ? 'rgba(180,60,30,0.5)' : 'rgba(140,150,180,0.45)';
    ctx.strokeStyle = tickColor;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < tickCount; i += 1) {
      const angle = (i / tickCount) * Math.PI * 2;
      const r1 = outerRadius * 0.76;
      const r2 = outerRadius * 0.84;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      ctx.stroke();
    }

    // Central glyph: 4-pointed compass-like mark for normal, different for start
    ctx.strokeStyle = isStart ? 'rgba(200,70,35,0.6)' : 'rgba(140,155,190,0.50)';
    ctx.lineWidth = 1.8;
    const glyphR = outerRadius * 0.38;
    if (isStart) {
      // Star burst
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * Math.PI * 2;
        const inner = glyphR * 0.25;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
        ctx.lineTo(cx + Math.cos(angle) * glyphR, cy + Math.sin(angle) * glyphR);
        ctx.stroke();
      }
    } else {
      // Simple cross
      ctx.beginPath();
      ctx.moveTo(cx - glyphR, cy);
      ctx.lineTo(cx + glyphR, cy);
      ctx.moveTo(cx, cy - glyphR);
      ctx.lineTo(cx, cy + glyphR);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, glyphR * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Speckle/wear noise
    for (let i = 0; i < 80; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * outerRadius * 0.9;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      ctx.fillStyle = `rgba(0,0,0,${(0.08 + Math.random() * 0.12).toFixed(2)})`;
      ctx.fillRect(px, py, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    return canvas;
  }

  _createCrusherCanvas() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#4a3830';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#2a1c18';
    ctx.lineWidth = 3;
    for (let x = 0; x <= size; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y <= size; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    for (let i = 0; i < 25; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 8 + Math.random() * 22;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(120,8,8,${(0.2 + Math.random() * 0.25).toFixed(2)})`);
      grad.addColorStop(0.6, `rgba(80,4,4,${(0.1 + Math.random() * 0.1).toFixed(2)})`);
      grad.addColorStop(1, 'rgba(80,4,4,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 15; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size * 0.5;
      ctx.strokeStyle = `rgba(100,6,6,${(0.15 + Math.random() * 0.15).toFixed(2)})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 8, y + 20 + Math.random() * 40);
      ctx.stroke();
    }

    for (let i = 0; i < 8; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.strokeStyle = `rgba(20,15,10,${(0.3 + Math.random() * 0.3).toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
      ctx.stroke();
    }

    for (let i = 0; i < 500; i++) {
      const shade = Math.floor(20 + Math.random() * 40);
      ctx.fillStyle = `rgba(${shade},${Math.floor(shade * 0.7)},${Math.floor(shade * 0.6)},0.12)`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }

    return canvas;
  }

  _generateNormalMap(sourceCanvas, strength) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const srcCtx = sourceCanvas.getContext('2d');
    const srcData = srcCtx.getImageData(0, 0, w, h).data;

    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = w;
    normalCanvas.height = h;
    const nCtx = normalCanvas.getContext('2d');
    const normalImg = nCtx.createImageData(w, h);

    const getHeight = (x, y) => {
      x = ((x % w) + w) % w;
      y = ((y % h) + h) % h;
      const i = (y * w + x) * 4;
      return (srcData[i] + srcData[i + 1] + srcData[i + 2]) / (3 * 255);
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const left = getHeight(x - 1, y);
        const right = getHeight(x + 1, y);
        const up = getHeight(x, y - 1);
        const down = getHeight(x, y + 1);

        const dx = (left - right) * strength;
        const dy = (up - down) * strength;
        const len = Math.sqrt(dx * dx + dy * dy + 1);

        const i = (y * w + x) * 4;
        normalImg.data[i] = Math.floor((dx / len * 0.5 + 0.5) * 255);
        normalImg.data[i + 1] = Math.floor((dy / len * 0.5 + 0.5) * 255);
        normalImg.data[i + 2] = Math.floor((1 / len * 0.5 + 0.5) * 255);
        normalImg.data[i + 3] = 255;
      }
    }

    nCtx.putImageData(normalImg, 0, 0);
    const texture = new THREE.CanvasTexture(normalCanvas);
    return texture;
  }

  _setupLights() {
    const ambient = new THREE.AmbientLight(0x4a4060, 0.9);
    const hemi = new THREE.HemisphereLight(0x6a6080, 0x2a2010, 0.85);

    const directional = new THREE.DirectionalLight(0x8090c0, 0.6);
    directional.position.set(8, 18, 10);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 50;
    directional.shadow.bias = -0.001;

    // Player-carried lamp: warm, bright where the player looks
    this.cameraLamp = new THREE.PointLight(0xffb070, 1.6, 16, 2);
    this.cameraLamp.position.set(0, -0.05, 0.1);
    this.cameraLamp.castShadow = true;
    this.cameraLamp.shadow.mapSize.width = 512;
    this.cameraLamp.shadow.mapSize.height = 512;
    this.camera.add(this.cameraLamp);

    // Subtle aura around the player — "a little" glow
    this.playerAura = new THREE.PointLight(0xffc888, 0.35, 5, 2);
    this.playerAura.position.set(0, -0.4, 0);
    this.camera.add(this.playerAura);

    this.scene.add(ambient, hemi, directional);
  }

  _bindControls() {
    this.onMouseDown = (event) => {
      if (event.button !== 0) {
        return;
      }
      this.isDragging = true;
      this.dragOrigin.x = event.clientX;
      this.dragOrigin.y = event.clientY;
    };

    this.onMouseMove = (event) => {
      if (!this.isDragging) {
        return;
      }
      const deltaX = event.clientX - this.dragOrigin.x;
      const deltaY = event.clientY - this.dragOrigin.y;
      this.dragOrigin.x = event.clientX;
      this.dragOrigin.y = event.clientY;
      this.targetYaw -= deltaX * 0.005;
      this.targetPitch = THREE.MathUtils.clamp(this.targetPitch - deltaY * 0.003, -0.55, 0.35);
    };

    this.onMouseUp = () => {
      this.isDragging = false;
    };

    this.onTouchStart = (event) => {
      if (event.touches.length !== 1) {
        return;
      }
      this.isDragging = true;
      this.dragOrigin.x = event.touches[0].clientX;
      this.dragOrigin.y = event.touches[0].clientY;
    };

    this.onTouchMove = (event) => {
      if (!this.isDragging || event.touches.length !== 1) {
        return;
      }
      const touch = event.touches[0];
      const deltaX = touch.clientX - this.dragOrigin.x;
      const deltaY = touch.clientY - this.dragOrigin.y;
      this.dragOrigin.x = touch.clientX;
      this.dragOrigin.y = touch.clientY;
      this.targetYaw -= deltaX * 0.006;
      this.targetPitch = THREE.MathUtils.clamp(this.targetPitch - deltaY * 0.004, -0.55, 0.35);
    };

    this.onTouchEnd = () => {
      this.isDragging = false;
    };

    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: true });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: true });
    this.canvas.addEventListener('touchend', this.onTouchEnd, { passive: true });
  }

  buildLevel(levelData) {
    this.levelData = levelData;
    this._clearCurrentLevel();

    this._createFloor(levelData);
    this._createWalls(levelData);
    this._createEntrance();
    this._createDoors(levelData);
    this._createDecor(levelData);
    this._createCrusher(levelData);

    this.currentActiveDoorId = null;
    this.currentHintDoorId = null;
    this.setPlayerCell(levelData.start.x, levelData.start.y, true);
    this.yaw = 0;
    this.targetYaw = 0;
    this.pitch = -0.08;
    this.targetPitch = -0.08;
  }

  _clearCurrentLevel() {
    this.doors = [];
    this.safeOverlays = [];
    this.torchLights.forEach((item) => this.scene.remove(item.light));
    this.torchLights = [];

    if (this.rootGroup) {
      this.scene.remove(this.rootGroup);
      this._disposeObject(this.rootGroup);
    }

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);
    this.crusherGroup = null;
    this.crusherLight = null;
  }

  _disposeObject(object) {
    object.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  _createFloor(levelData) {
    const planeGeometry = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
    const safeKeys = new Set(levelData.safeTiles.map((tile) => `${tile.x}:${tile.y}`));
    const startKeys = new Set(levelData.startSafeTiles.map((tile) => `${tile.x}:${tile.y}`));

    for (let row = 0; row < this.gridSize; row += 1) {
      for (let column = 0; column < this.gridSize; column += 1) {
        const position = this.cellToWorld(column, row);
        const plane = new THREE.Mesh(planeGeometry, this.floorMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.position.set(position.x, 0, position.z);
        plane.receiveShadow = true;
        this.rootGroup.add(plane);

        const floorTile = this._cloneAsset('floor', this.cellSize * 0.96, 0.4);
        if (floorTile) {
          floorTile.position.set(position.x, 0.02, position.z);
          this.rootGroup.add(floorTile);
        }

        const key = `${column}:${row}`;
        if (safeKeys.has(key) || startKeys.has(key)) {
          const overlay = new THREE.Mesh(
            new THREE.PlaneGeometry(this.cellSize * 0.76, this.cellSize * 0.76),
            startKeys.has(key) ? this.startPadMaterial.clone() : this.safeOverlayMaterial.clone()
          );
          overlay.rotation.x = -Math.PI / 2;
          overlay.position.set(position.x, startKeys.has(key) ? 0.08 : 0.06, position.z);
          overlay.userData.baseOpacity = overlay.material.opacity;
          this.rootGroup.add(overlay);
          this.safeOverlays.push(overlay);
        }
      }
    }
  }

  _createWalls(levelData) {
    const wallThickness = 0.42;
    const northZ = -this.roomHalf;
    const southZ = this.roomHalf;
    const westX = -this.roomHalf;
    const eastX = this.roomHalf;
    const entranceColumns = new Set([3, 4]);
    const doorJambHeight = 3.1;
    const aboveHeight = this.ceilingY - doorJambHeight;
    const aboveCenterY = doorJambHeight + aboveHeight / 2;

    const northDoorCols = new Set();
    const westDoorRows = new Set();
    const eastDoorRows = new Set();
    for (const door of levelData.doors) {
      if (door.side === 'north') {
        northDoorCols.add(door.col);
      } else if (door.side === 'west') {
        westDoorRows.add(door.row);
      } else if (door.side === 'east') {
        eastDoorRows.add(door.row);
      }
    }

    for (let column = 0; column < this.gridSize; column += 1) {
      const x = this.cellToWorld(column, 0).x;
      if (northDoorCols.has(column)) {
        this._addAboveDoorSegment(x, northZ, 0, wallThickness, aboveHeight, aboveCenterY);
      } else {
        this._addWallSegment(x, northZ, 0, wallThickness, column % 2 === 0 ? 'wallA' : 'wallB');
      }
      if (!entranceColumns.has(column)) {
        this._addWallSegment(x, southZ, 0, wallThickness, column % 2 === 0 ? 'wallB' : 'wallA');
      }
    }

    for (let row = 0; row < this.gridSize; row += 1) {
      const z = this.cellToWorld(0, row).z;

      if (westDoorRows.has(row)) {
        this._addAboveDoorSegment(westX, z, Math.PI / 2, wallThickness, aboveHeight, aboveCenterY);
      } else {
        this._addWallSegment(westX, z, Math.PI / 2, wallThickness, row % 2 === 0 ? 'wallA' : 'wallB');
      }

      if (eastDoorRows.has(row)) {
        this._addAboveDoorSegment(eastX, z, Math.PI / 2, wallThickness, aboveHeight, aboveCenterY);
      } else {
        this._addWallSegment(eastX, z, Math.PI / 2, wallThickness, row % 2 === 0 ? 'wallB' : 'wallA');
      }
    }

    const rail = this._cloneAsset('straight', this.cellSize * 3.2, 1.7);
    if (rail) {
      rail.position.set(0, this.wallHeight - 0.7, -this.cellSize * 1.1);
      rail.rotation.y = Math.PI / 2;
      this.rootGroup.add(rail);
    }
  }

  _addWallSegment(x, z, rotationY, thickness, variantKey) {
    const boxHeight = this.ceilingY;
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(this.cellSize + 0.06, boxHeight, thickness),
      this.wallMaterial
    );
    wall.position.set(x, boxHeight / 2, z);
    wall.rotation.y = rotationY;
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.rootGroup.add(wall);

    const visual = this._cloneAsset(variantKey, this.cellSize * 0.95, this.wallHeight - 0.2);
    if (visual) {
      visual.position.set(x, 0, z);
      visual.rotation.y = rotationY;
      this.rootGroup.add(visual);
    }
  }

  _addAboveDoorSegment(x, z, rotationY, thickness, height, centerY) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(this.cellSize + 0.06, height, thickness),
      this.wallMaterial
    );
    wall.position.set(x, centerY, z);
    wall.rotation.y = rotationY;
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.rootGroup.add(wall);
  }

  _createEntrance() {
    const z = this.roomHalf + this.cellSize * 1.1;
    const hallwayFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(this.cellSize * 2, this.cellSize * 2),
      this.floorMaterial
    );
    hallwayFloor.rotation.x = -Math.PI / 2;
    hallwayFloor.position.set(0, 0.01, z);
    this.rootGroup.add(hallwayFloor);

    const hallway = this._cloneAsset('hallway', this.cellSize * 2.1, this.wallHeight);
    if (hallway) {
      hallway.position.set(0, 0, z + 0.15);
      hallway.rotation.y = Math.PI;
      this.rootGroup.add(hallway);
    }

    const rogue = this._cloneAsset('player', this.cellSize * 0.85, 2.2);
    if (rogue) {
      rogue.position.set(0, 0, z + this.cellSize * 0.45);
      rogue.rotation.y = Math.PI;
      this.rootGroup.add(rogue);
    }

    this._createInactiveDoor();

    this._placeProp('torch', 2, 7, { offsetX: -0.55, offsetZ: 0.65, footprint: 0.56, maxHeight: 1.6 });
    this._placeProp('torch', 5, 7, { offsetX: 0.55, offsetZ: 0.65, footprint: 0.56, maxHeight: 1.6 });
  }

  _createInactiveDoor() {
    const z = this.roomHalf;
    const jambHeight = 3.1;
    const openingWidth = this.cellSize * 2;
    const doorWidth = openingWidth - 0.2;
    const wallThickness = 0.42;

    const frame = new THREE.Group();
    const leftJamb = new THREE.Mesh(new THREE.BoxGeometry(0.22, jambHeight, 0.22), this.frameMaterial);
    const rightJamb = new THREE.Mesh(new THREE.BoxGeometry(0.22, jambHeight, 0.22), this.frameMaterial);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(openingWidth + 0.3, 0.28, 0.22), this.frameMaterial);

    leftJamb.position.set(-openingWidth / 2, jambHeight / 2, 0);
    rightJamb.position.set(openingWidth / 2, jambHeight / 2, 0);
    lintel.position.set(0, jambHeight - 0.1, 0);

    frame.add(leftJamb, rightJamb, lintel);
    frame.position.set(0, 0, z);
    this.rootGroup.add(frame);

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth, 2.65, 0.16),
      this.doorMaterial.clone()
    );
    panel.position.set(0, 1.32, z);
    panel.castShadow = true;
    panel.receiveShadow = true;
    this.rootGroup.add(panel);

    const aboveHeight = this.ceilingY - jambHeight;
    const above = new THREE.Mesh(
      new THREE.BoxGeometry(openingWidth + 0.3, aboveHeight, wallThickness),
      this.wallMaterial
    );
    above.position.set(0, jambHeight + aboveHeight / 2, z);
    above.castShadow = true;
    above.receiveShadow = true;
    this.rootGroup.add(above);
  }

  _createDoors(levelData) {
    const westX = -this.roomHalf;
    const eastX = this.roomHalf;
    const northZ = -this.roomHalf;
    const jambHeight = 3.1;
    const doorWidth = this.cellSize * 0.92;
    const panelHeight = 2.7;
    const panelThickness = 0.16;
    const panelWidth = doorWidth - 0.08;

    if (!this.ironMaterial) {
      this.ironMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2420,
        roughness: 0.42,
        metalness: 0.85
      });
      this.knobMaterial = new THREE.MeshStandardMaterial({
        color: 0x8a6f35,
        roughness: 0.3,
        metalness: 0.9,
        emissive: 0x1a0f05,
        emissiveIntensity: 0.18
      });
    }

    levelData.doors.forEach((door) => {
      let frameWorldX;
      let frameWorldZ;
      let frameRotationY;
      let markerX;
      let markerZ;

      if (door.side === 'west') {
        const cell = this.cellToWorld(0, door.row);
        frameWorldX = westX;
        frameWorldZ = cell.z;
        frameRotationY = 0;
        markerX = westX + 0.4;
        markerZ = cell.z;
      } else if (door.side === 'east') {
        const cell = this.cellToWorld(this.gridSize - 1, door.row);
        frameWorldX = eastX;
        frameWorldZ = cell.z;
        frameRotationY = Math.PI;
        markerX = eastX - 0.4;
        markerZ = cell.z;
      } else {
        const cell = this.cellToWorld(door.col, 0);
        frameWorldX = cell.x;
        frameWorldZ = northZ;
        frameRotationY = -Math.PI / 2;
        markerX = cell.x;
        markerZ = northZ + 0.4;
      }

      const frame = new THREE.Group();
      frame.position.set(frameWorldX, 0, frameWorldZ);
      frame.rotation.y = frameRotationY;
      this.rootGroup.add(frame);

      const leftJamb = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, jambHeight, 0.26),
        this.frameMaterial
      );
      leftJamb.position.set(0, jambHeight / 2, -doorWidth / 2);
      leftJamb.castShadow = true;
      leftJamb.receiveShadow = true;
      frame.add(leftJamb);

      const rightJamb = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, jambHeight, 0.26),
        this.frameMaterial
      );
      rightJamb.position.set(0, jambHeight / 2, doorWidth / 2);
      rightJamb.castShadow = true;
      rightJamb.receiveShadow = true;
      frame.add(rightJamb);

      const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.34, doorWidth + 0.4),
        this.frameMaterial
      );
      lintel.position.set(0, jambHeight - 0.12, 0);
      lintel.castShadow = true;
      frame.add(lintel);

      const sill = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.08, doorWidth + 0.32),
        this.frameMaterial
      );
      sill.position.set(0, 0.04, 0);
      frame.add(sill);

      // Pivot is inside the frame, at the hinge edge
      const pivot = new THREE.Group();
      pivot.position.set(0, 0, -doorWidth / 2 + 0.05);
      frame.add(pivot);

      const panelMaterial = this.doorMaterial.clone();
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(panelThickness, panelHeight, panelWidth),
        panelMaterial
      );
      panel.position.set(0, panelHeight / 2 + 0.05, panelWidth / 2);
      panel.castShadow = true;
      panel.receiveShadow = true;
      pivot.add(panel);

      // Iron horizontal bands with rivets
      const bandOffsets = [0.4, 1.1, 1.85, 2.55];
      for (const by of bandOffsets) {
        const band = new THREE.Mesh(
          new THREE.BoxGeometry(panelThickness + 0.06, 0.09, panelWidth + 0.02),
          this.ironMaterial
        );
        band.position.set(0, by + 0.05, panelWidth / 2);
        band.castShadow = true;
        pivot.add(band);

        const rivetOffsets = [panelWidth * 0.12, panelWidth * 0.38, panelWidth * 0.62, panelWidth * 0.88];
        for (const rzFrac of rivetOffsets) {
          const rivet = new THREE.Mesh(
            new THREE.SphereGeometry(0.035, 8, 6),
            this.ironMaterial
          );
          rivet.position.set(
            panelThickness / 2 + 0.015,
            by + 0.05,
            rzFrac
          );
          pivot.add(rivet);
        }
      }

      // Hinges near the pivot edge
      for (const hy of [0.55, 2.3]) {
        const hinge = new THREE.Mesh(
          new THREE.BoxGeometry(panelThickness + 0.08, 0.18, 0.24),
          this.ironMaterial
        );
        hinge.position.set(0, hy + 0.05, 0.16);
        hinge.castShadow = true;
        pivot.add(hinge);
      }

      // Lock plate and knob on the far edge
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.32, 0.22),
        this.ironMaterial
      );
      plate.position.set(panelThickness / 2 + 0.02, 1.32, panelWidth - 0.2);
      pivot.add(plate);

      const knob = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 14, 10),
        this.knobMaterial
      );
      knob.position.set(panelThickness / 2 + 0.12, 1.34, panelWidth - 0.2);
      knob.castShadow = true;
      pivot.add(knob);

      // Compute door center in world space for interactive dot check
      const centerLocal = new THREE.Vector3(0.12, 1.32, 0);
      const centerWorld = centerLocal.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), frameRotationY);
      centerWorld.x += frameWorldX;
      centerWorld.z += frameWorldZ;
      centerWorld.y = 1.3;

      const marker = new THREE.Mesh(
        new THREE.PlaneGeometry(this.cellSize * 0.8, this.cellSize * 0.22),
        new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0 })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(markerX, 0.08, markerZ);
      this.rootGroup.add(marker);

      this.doors.push({
        id: door.id,
        side: door.side,
        row: door.row,
        col: door.col,
        approach: door.approach,
        center: centerWorld,
        marker,
        pivot,
        panel,
        openAmount: 0,
        targetOpen: 0,
        openAngle: -Math.PI * 0.62,
        flashUntil: 0
      });
    });
  }

  _placeWallDecoration(assetKey, side, z) {
    const decoration = this._cloneAsset(assetKey, 0.78, 1.8);
    if (!decoration) {
      return;
    }

    decoration.position.set(side === 'left' ? -this.roomHalf + 0.1 : this.roomHalf - 0.1, 1.55, z);
    decoration.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
    this.rootGroup.add(decoration);

    const light = new THREE.PointLight(0xff7733, 0.65, 9, 2);
    light.position.set(side === 'left' ? -this.roomHalf + 0.85 : this.roomHalf - 0.85, 2.1, z);
    light.castShadow = true;
    light.shadow.mapSize.width = 256;
    light.shadow.mapSize.height = 256;
    this.scene.add(light);
    this.torchLights.push({ light, base: 0.55, offset: Math.random() * Math.PI * 2 });
  }

  _createDecor(levelData) {
    this._placeProp('pillar', 0, 0, { offsetX: 0.48, offsetZ: 0.48, footprint: 0.65, maxHeight: 2.7 });
    this._placeProp('pillar', 7, 0, { offsetX: -0.48, offsetZ: 0.48, footprint: 0.65, maxHeight: 2.7 });
    this._placeProp('pillar', 0, 7, { offsetX: 0.48, offsetZ: -0.48, footprint: 0.65, maxHeight: 2.7 });
    this._placeProp('pillar', 7, 7, { offsetX: -0.48, offsetZ: -0.48, footprint: 0.65, maxHeight: 2.7 });
    this._placeProp('chest', 0, 0, { offsetX: 0.7, offsetZ: 0.7, footprint: 0.85, maxHeight: 1.2 });
    this._placeProp('chestSmall', 7, 0, { offsetX: -0.7, offsetZ: 0.68, footprint: 0.72, maxHeight: 1 });
    this._placeProp('barrel', 0, 6, { offsetX: 0.6, offsetZ: 0.2, footprint: 0.68, maxHeight: 1.3 });
    this._placeProp('bag', 7, 6, { offsetX: -0.58, offsetZ: 0.18, footprint: 0.6, maxHeight: 0.7 });
    this._placeProp('amphora', 1, 1, { offsetX: -0.32, offsetZ: -0.32, footprint: 0.52, maxHeight: 0.95 });
    this._placeProp('bone', 6, 1, { offsetX: 0.35, offsetZ: -0.28, footprint: 0.4, maxHeight: 0.24 });
    this._placeProp('crystal', 4, 0, { offsetX: 0, offsetZ: 0.42, footprint: 0.54, maxHeight: 0.95 });

    this._placeRandomTorches(levelData);
  }

  _placeRandomTorches(levelData) {
    const doorSet = {
      north: new Set(),
      west: new Set(),
      east: new Set()
    };
    (levelData.doors || []).forEach((door) => {
      if (doorSet[door.side]) {
        doorSet[door.side].add(door.side === 'north' ? door.col : door.row);
      }
    });

    const candidates = [];
    for (let col = 0; col < this.gridSize; col += 1) {
      if (!doorSet.north.has(col)) {
        candidates.push({ side: 'north', index: col });
      }
    }
    for (let row = 0; row < this.gridSize; row += 1) {
      if (!doorSet.west.has(row)) {
        candidates.push({ side: 'west', index: row });
      }
      if (!doorSet.east.has(row)) {
        candidates.push({ side: 'east', index: row });
      }
    }

    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const torchCount = Math.min(6, candidates.length);
    const chosen = [];
    for (const cand of candidates) {
      if (chosen.length >= torchCount) break;
      // Enforce minimum spacing on the same wall
      const conflict = chosen.some((o) => o.side === cand.side && Math.abs(o.index - cand.index) < 2);
      if (conflict) continue;
      chosen.push(cand);
    }

    chosen.forEach((spot, idx) => this._placeTorch(spot, idx));
  }

  _placeTorch(spot, idx) {
    let world;
    let rotationY;
    let lightOffsetX = 0;
    let lightOffsetZ = 0;
    const inset = 0.22;

    if (spot.side === 'north') {
      world = this.cellToWorld(spot.index, 0);
      world.z = -this.roomHalf + inset;
      rotationY = 0;
      lightOffsetZ = 0.65;
    } else if (spot.side === 'west') {
      world = this.cellToWorld(0, spot.index);
      world.x = -this.roomHalf + inset;
      rotationY = Math.PI / 2;
      lightOffsetX = 0.65;
    } else {
      world = this.cellToWorld(this.gridSize - 1, spot.index);
      world.x = this.roomHalf - inset;
      rotationY = -Math.PI / 2;
      lightOffsetX = -0.65;
    }

    const torch = this._cloneAsset('torchWall', 0.55, 1.7) || this._cloneAsset('torch', 0.55, 1.7);
    if (torch) {
      torch.position.set(world.x, 1.55, world.z);
      torch.rotation.y = rotationY;
      this.rootGroup.add(torch);
    }

    const light = new THREE.PointLight(0xff9a4a, 1.4, 14, 2);
    light.position.set(world.x + lightOffsetX, 2.3, world.z + lightOffsetZ);
    light.castShadow = false;
    this.scene.add(light);
    this.torchLights.push({
      light,
      base: 1.3,
      offset: idx * 1.31 + Math.random() * Math.PI * 2
    });
  }

  _placeProp(assetKey, x, y, options = {}) {
    const prop = this._cloneAsset(assetKey, options.footprint || 0.7, options.maxHeight || 1.2);
    if (!prop) {
      return;
    }

    const world = this.cellToWorld(x, y);
    prop.position.set(
      world.x + (options.offsetX || 0),
      0,
      world.z + (options.offsetZ || 0)
    );
    prop.rotation.y = options.rotationY || 0;
    this.rootGroup.add(prop);
  }

  _createCrusher(levelData) {
    this.crusherGroup = new THREE.Group();

    const safeKeys = new Set();
    const allSafe = [...(levelData.safeTiles || []), ...(levelData.startSafeTiles || [])];
    allSafe.forEach((tile) => safeKeys.add(`${tile.x}:${tile.y}`));

    const slabThickness = 0.68;
    const halfSlab = slabThickness / 2;
    const cellSize = this.cellSize;
    const recessCapThickness = 0.22;
    const recessHeight = 2.0;
    const recessWallThickness = 0.12;
    const capBottomLocalY = -halfSlab + recessHeight;
    const capCenterLocalY = capBottomLocalY + recessCapThickness / 2;
    const wallCenterLocalY = (-halfSlab + capBottomLocalY) / 2;
    const wallHeightLocal = capBottomLocalY - (-halfSlab);

    for (let row = 0; row < this.gridSize; row += 1) {
      for (let col = 0; col < this.gridSize; col += 1) {
        const world = this.cellToWorld(col, row);
        const key = `${col}:${row}`;

        if (safeKeys.has(key)) {
          const neighborSafe = (nc, nr) => safeKeys.has(`${nc}:${nr}`);

          // North wall of recess (-Z)
          if (!neighborSafe(col, row - 1)) {
            const n = new THREE.Mesh(
              new THREE.BoxGeometry(cellSize + 0.02, wallHeightLocal, recessWallThickness),
              this.crusherMaterial
            );
            n.position.set(world.x, wallCenterLocalY, world.z - cellSize / 2 + recessWallThickness / 2);
            n.castShadow = true;
            n.receiveShadow = true;
            this.crusherGroup.add(n);
          }

          // South wall of recess (+Z)
          if (!neighborSafe(col, row + 1)) {
            const s = new THREE.Mesh(
              new THREE.BoxGeometry(cellSize + 0.02, wallHeightLocal, recessWallThickness),
              this.crusherMaterial
            );
            s.position.set(world.x, wallCenterLocalY, world.z + cellSize / 2 - recessWallThickness / 2);
            s.castShadow = true;
            s.receiveShadow = true;
            this.crusherGroup.add(s);
          }

          // West wall of recess (-X)
          if (!neighborSafe(col - 1, row)) {
            const w = new THREE.Mesh(
              new THREE.BoxGeometry(recessWallThickness, wallHeightLocal, cellSize - recessWallThickness * 2 + 0.02),
              this.crusherMaterial
            );
            w.position.set(world.x - cellSize / 2 + recessWallThickness / 2, wallCenterLocalY, world.z);
            w.castShadow = true;
            w.receiveShadow = true;
            this.crusherGroup.add(w);
          }

          // East wall of recess (+X)
          if (!neighborSafe(col + 1, row)) {
            const e = new THREE.Mesh(
              new THREE.BoxGeometry(recessWallThickness, wallHeightLocal, cellSize - recessWallThickness * 2 + 0.02),
              this.crusherMaterial
            );
            e.position.set(world.x + cellSize / 2 - recessWallThickness / 2, wallCenterLocalY, world.z);
            e.castShadow = true;
            e.receiveShadow = true;
            this.crusherGroup.add(e);
          }

          // Recess cap (the pocket ceiling above the player in the safe cell)
          const cap = new THREE.Mesh(
            new THREE.BoxGeometry(cellSize + 0.02, recessCapThickness, cellSize + 0.02),
            this.crusherMaterial
          );
          cap.position.set(world.x, capCenterLocalY, world.z);
          cap.castShadow = true;
          cap.receiveShadow = true;
          this.crusherGroup.add(cap);
        } else {
          // Solid crushing panel
          const panel = new THREE.Mesh(
            new THREE.BoxGeometry(cellSize + 0.02, slabThickness, cellSize + 0.02),
            this.crusherMaterial
          );
          panel.position.set(world.x, 0, world.z);
          panel.castShadow = true;
          panel.receiveShadow = true;
          this.crusherGroup.add(panel);
        }
      }
    }

    // Perimeter rim strips: seal the gap between per-cell panels and room walls
    const wallThickness = 0.42;
    const rimDepth = wallThickness + 0.3;
    const roomSpan = this.gridSize * cellSize + 0.4;
    const rimPositions = [
      { x: 0, z: -this.roomHalf, rotY: 0 },
      { x: 0, z: this.roomHalf, rotY: 0 },
      { x: -this.roomHalf, z: 0, rotY: Math.PI / 2 },
      { x: this.roomHalf, z: 0, rotY: Math.PI / 2 }
    ];
    for (const rim of rimPositions) {
      const rimMesh = new THREE.Mesh(
        new THREE.BoxGeometry(roomSpan, slabThickness, rimDepth),
        this.crusherMaterial
      );
      rimMesh.position.set(rim.x, 0, rim.z);
      rimMesh.rotation.y = rim.rotY;
      this.crusherGroup.add(rimMesh);
    }

    // Red underside glow plane just below the slab bottom
    const underside = new THREE.Mesh(
      new THREE.PlaneGeometry(this.gridSize * cellSize, this.gridSize * cellSize),
      new THREE.MeshBasicMaterial({ color: 0x5b1414, transparent: true, opacity: 0.14 })
    );
    underside.rotation.x = Math.PI / 2;
    underside.position.y = -halfSlab - 0.01;
    this.crusherGroup.add(underside);

    this.crusherGroup.position.y = this.crusherTopY;
    this.rootGroup.add(this.crusherGroup);

    this.crusherLight = new THREE.PointLight(0xff2200, 0, 30, 1.8);
    this.crusherLight.position.set(0, this.crusherTopY - 0.4, 0);
    this.scene.add(this.crusherLight);
  }

  _cloneAsset(key, footprint, maxHeight) {
    const source = this.modelCache[key];
    if (!source) {
      return null;
    }

    const clone = source.clone(true);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this._fitObject(clone, footprint, maxHeight);
    return clone;
  }

  _fitObject(object, footprint, maxHeight) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const maxFootprint = Math.max(size.x || 1, size.z || 1);
    const footprintScale = footprint / maxFootprint;
    const heightScale = maxHeight ? maxHeight / (size.y || 1) : footprintScale;
    const scale = Math.min(footprintScale, heightScale);

    object.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(object);
    const center = scaledBox.getCenter(new THREE.Vector3());
    const minY = scaledBox.min.y;
    object.position.sub(center);
    object.position.y -= minY;
  }

  cellToWorld(x, y) {
    return new THREE.Vector3(
      -this.roomHalf + this.cellSize * 0.5 + x * this.cellSize,
      0,
      -this.roomHalf + this.cellSize * 0.5 + y * this.cellSize
    );
  }

  setPlayerCell(x, y, instant = false) {
    const world = this.cellToWorld(x, y);
    this.playerTarget.set(world.x, this.eyeHeight, world.z);
    if (instant) {
      this.playerRender.copy(this.playerTarget);
    }
  }

  getHeadCrushProgress() {
    return (this.crusherTopY - this.eyeHeight) / (this.crusherTopY - this.crusherBottomY);
  }

  setCrusherState(progress, phase, danger) {
    this.crusherState.progress = progress;
    this.crusherState.phase = phase;
    this.crusherState.danger = danger;
  }

  setActiveDoor(doorId) {
    this.currentActiveDoorId = doorId;
  }

  setHintedDoor(doorId) {
    this.currentHintDoorId = doorId;
  }

  triggerDoorAttempt(doorId, success) {
    const door = this.doors.find((item) => item.id === doorId);
    if (!door) {
      return;
    }

    door.flashUntil = performance.now() + 500;
    if (success) {
      door.targetOpen = 1;
    }
  }

  shake(intensity, durationMs) {
    this.shakeStrength = intensity;
    this.shakeUntil = performance.now() + durationMs;
  }

  nudgeYaw(direction) {
    this.targetYaw -= direction * (Math.PI / 8);
  }

  getMoveDelta(relativeDirection) {
    const vectors = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 }
    ];
    const offsetMap = { up: 0, right: 1, down: 2, left: 3 };
    const facing = this._getCardinalIndex();
    return vectors[(facing + offsetMap[relativeDirection]) % 4];
  }

  getInteractableDoorId(playerX, playerY) {
    const forward = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      0,
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();

    let bestDoor = null;
    let bestDot = 0.58;

    for (const door of this.doors) {
      if (door.approach.x !== playerX || door.approach.y !== playerY) {
        continue;
      }

      const toDoor = door.center.clone().sub(this.camera.position).setY(0).normalize();
      const dot = forward.dot(toDoor);
      if (dot > bestDot) {
        bestDot = dot;
        bestDoor = door;
      }
    }

    return bestDoor ? bestDoor.id : null;
  }

  _getCardinalIndex() {
    const normalized = ((this.targetYaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return (4 - Math.round(normalized / (Math.PI / 2)) % 4) % 4;
  }

  _animate(deltaSeconds) {
    const smooth = 1 - Math.exp(-deltaSeconds * 9);
    this.playerRender.lerp(this.playerTarget, smooth);
    this.yaw += (this.targetYaw - this.yaw) * (1 - Math.exp(-deltaSeconds * 10));
    this.pitch += (this.targetPitch - this.pitch) * (1 - Math.exp(-deltaSeconds * 10));

    const bob = Math.sin(this.clock.elapsedTime * 6) * 0.012;
    const now = performance.now();
    const shakeActive = now < this.shakeUntil;
    const shakeAmount = shakeActive ? this.shakeStrength : 0;

    this.camera.position.set(
      this.playerRender.x + (Math.random() - 0.5) * shakeAmount,
      this.playerRender.y + bob + (Math.random() - 0.5) * shakeAmount * 0.6,
      this.playerRender.z + (Math.random() - 0.5) * shakeAmount
    );
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch + (shakeActive ? (Math.random() - 0.5) * shakeAmount * 0.3 : 0);

    if (this.crusherGroup) {
      const crusherY = THREE.MathUtils.lerp(this.crusherTopY, this.crusherBottomY, this.crusherState.progress);
      this.crusherGroup.position.y = crusherY;
      if (this.crusherLight) {
        this.crusherLight.position.y = crusherY - 0.35;
        this.crusherLight.intensity =
          this.crusherState.phase === 'dropping'
            ? 1.35 + this.crusherState.danger
            : this.crusherState.phase === 'down'
              ? 1.8
              : this.crusherState.danger * 0.6;
      }
    }

    this.safeOverlays.forEach((overlay, index) => {
      overlay.material.opacity = overlay.userData.baseOpacity + Math.sin(this.clock.elapsedTime * 2 + index) * 0.04;
    });

    this.torchLights.forEach((item) => {
      const t = this.clock.elapsedTime;
      const flicker = Math.sin(t * 7 + item.offset) * 0.12
        + Math.sin(t * 13.7 + item.offset * 2.3) * 0.08
        + Math.sin(t * 23.1 + item.offset * 0.7) * 0.04;
      item.light.intensity = item.base + flicker;
    });

    this.doors.forEach((door, index) => {
      door.openAmount += (door.targetOpen - door.openAmount) * (1 - Math.exp(-deltaSeconds * 8));
      door.pivot.rotation.y = door.openAngle * door.openAmount;

      const isHinted = this.currentHintDoorId === door.id;
      const isActive = this.currentActiveDoorId === door.id;
      const isFlashing = performance.now() < door.flashUntil;
      const pulse = 0.35 + 0.25 * Math.sin(this.clock.elapsedTime * 5 + index);

      if (isFlashing) {
        door.panel.material.emissive = new THREE.Color(0x882222);
        door.panel.material.emissiveIntensity = 0.65;
      } else if (isHinted) {
        door.panel.material.emissive = new THREE.Color(0xaa5500);
        door.panel.material.emissiveIntensity = pulse;
      } else if (isActive) {
        door.panel.material.emissive = new THREE.Color(0x553300);
        door.panel.material.emissiveIntensity = 0.32;
      } else {
        door.panel.material.emissive = new THREE.Color(0x000000);
        door.panel.material.emissiveIntensity = 0;
      }

      door.marker.material.opacity = isHinted ? 0.72 : isActive ? 0.26 : 0;
    });
  }

  startLoop(updateCallback) {
    this.stopLoop();
    this.clock.start();

    const loop = () => {
      this.animationId = requestAnimationFrame(loop);
      const delta = this.clock.getDelta();
      updateCallback(delta);
      this._animate(delta);
      this.renderer.render(this.scene, this.camera);
    };

    loop();
  }

  stopLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose() {
    this.stopLoop();
    window.removeEventListener('resize', this._onResize);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this._clearCurrentLevel();
    this.renderer.dispose();
  }
}
