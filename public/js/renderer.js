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

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080606);
    this.scene.fog = new THREE.Fog(0x080606, 10, 38);

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
    const floorTexture = this._createStoneTexture('#52433a', '#2f241f');
    const wallTexture = this._createStoneTexture('#665247', '#332720');
    const crusherTexture = this._createCrusherTexture();

    this.floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      color: 0x8a7668,
      roughness: 0.92,
      metalness: 0.05
    });

    this.wallMaterial = new THREE.MeshStandardMaterial({
      map: wallTexture,
      color: 0x6f5d51,
      roughness: 0.9,
      metalness: 0.04
    });

    this.safeOverlayMaterial = new THREE.MeshBasicMaterial({
      color: 0x101010,
      transparent: true,
      opacity: 0.58
    });

    this.startPadMaterial = new THREE.MeshBasicMaterial({
      color: 0x3d1111,
      transparent: true,
      opacity: 0.65
    });

    this.doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x4c2d23,
      roughness: 0.78,
      metalness: 0.08
    });

    this.frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a2c25,
      roughness: 0.82,
      metalness: 0.12
    });

    this.crusherMaterial = new THREE.MeshStandardMaterial({
      map: crusherTexture,
      color: 0x856961,
      roughness: 0.88,
      metalness: 0.08
    });

    this.propFallbackMaterial = new THREE.MeshStandardMaterial({
      color: 0x77655c,
      roughness: 0.8,
      metalness: 0.06
    });
  }

  _createStoneTexture(baseColor, lineColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');

    context.fillStyle = baseColor;
    context.fillRect(0, 0, 128, 128);
    context.strokeStyle = lineColor;
    context.lineWidth = 2;

    for (let x = 0; x <= 128; x += 32) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, 128);
      context.stroke();
    }

    for (let y = 0; y <= 128; y += 32) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(128, y);
      context.stroke();
    }

    for (let index = 0; index < 400; index += 1) {
      const shade = 20 + Math.random() * 60;
      context.fillStyle = `rgba(${shade}, ${shade * 0.8}, ${shade * 0.7}, 0.18)`;
      context.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
  }

  _createCrusherTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');

    context.fillStyle = '#6d5a52';
    context.fillRect(0, 0, 256, 256);

    context.strokeStyle = '#3c2d28';
    context.lineWidth = 3;

    for (let x = 0; x <= 256; x += 32) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, 256);
      context.stroke();
    }

    for (let y = 0; y <= 256; y += 32) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(256, y);
      context.stroke();
    }

    for (let index = 0; index < 18; index += 1) {
      context.fillStyle = `rgba(120, 10, 10, ${0.18 + Math.random() * 0.18})`;
      const radius = 10 + Math.random() * 26;
      context.beginPath();
      context.arc(Math.random() * 256, Math.random() * 256, radius, 0, Math.PI * 2);
      context.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  _setupLights() {
    const ambient = new THREE.AmbientLight(0x4a3630, 0.48);
    const hemi = new THREE.HemisphereLight(0x806d64, 0x170f0d, 0.62);
    const directional = new THREE.DirectionalLight(0xf5d3b2, 0.5);
    directional.position.set(8, 18, 10);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 1024;
    directional.shadow.mapSize.height = 1024;

    this.cameraLamp = new THREE.PointLight(0xffe6c7, 0.9, 14, 2);
    this.cameraLamp.position.set(0, 0.1, 0);
    this.camera.add(this.cameraLamp);

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
    this._createCrusher();

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
    const doorRows = new Set(levelData.doors.map((door) => door.row));

    for (let column = 0; column < this.gridSize; column += 1) {
      const x = this.cellToWorld(column, 0).x;
      this._addWallSegment(x, northZ, 0, wallThickness, 'wallA');
      if (!entranceColumns.has(column)) {
        this._addWallSegment(x, southZ, 0, wallThickness, 'wallB');
      }
    }

    for (let row = 0; row < this.gridSize; row += 1) {
      const z = this.cellToWorld(0, row).z;
      if (!doorRows.has(row)) {
        this._addWallSegment(westX, z, Math.PI / 2, wallThickness, row % 2 === 0 ? 'wallA' : 'wallB');
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
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(this.cellSize + 0.06, this.wallHeight, thickness),
      this.wallMaterial
    );
    wall.position.set(x, this.wallHeight / 2, z);
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

    this._placeProp('torch', 2, 7, { offsetX: -0.55, offsetZ: 0.65, footprint: 0.56, maxHeight: 1.6 });
    this._placeProp('torch', 5, 7, { offsetX: 0.55, offsetZ: 0.65, footprint: 0.56, maxHeight: 1.6 });
  }

  _createDoors(levelData) {
    const westX = -this.roomHalf;
    const eastX = this.roomHalf;

    levelData.doors.forEach((door) => {
      const z = this.cellToWorld(0, door.row).z;
      const frame = new THREE.Group();
      const jambHeight = 3.1;
      const doorWidth = this.cellSize * 0.86;

      const leftJamb = new THREE.Mesh(new THREE.BoxGeometry(0.22, jambHeight, 0.22), this.frameMaterial);
      const rightJamb = new THREE.Mesh(new THREE.BoxGeometry(0.22, jambHeight, 0.22), this.frameMaterial);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, doorWidth + 0.3), this.frameMaterial);

      const frameX = door.side === 'left' ? westX - 0.02 : eastX + 0.02;
      frame.position.set(frameX, 0, z);
      frame.rotation.y = door.side === 'left' ? Math.PI / 2 : -Math.PI / 2;

      leftJamb.position.set(0, jambHeight / 2, -doorWidth / 2);
      rightJamb.position.set(0, jambHeight / 2, doorWidth / 2);
      lintel.position.set(0, jambHeight - 0.1, 0);

      frame.add(leftJamb, rightJamb, lintel);
      this.rootGroup.add(frame);

      const marker = new THREE.Mesh(
        new THREE.PlaneGeometry(this.cellSize * 0.82, this.cellSize * 0.22),
        new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0 })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(
        door.side === 'left' ? westX + 0.38 : eastX - 0.38,
        0.08,
        z
      );
      this.rootGroup.add(marker);

      const pivot = new THREE.Group();
      pivot.position.set(frameX, 0, z - doorWidth / 2);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.65, doorWidth), this.doorMaterial.clone());
      panel.position.set(0, 1.32, doorWidth / 2);
      panel.castShadow = true;
      panel.receiveShadow = true;
      pivot.add(panel);
      this.rootGroup.add(pivot);

      this._placeWallDecoration('torchWall', door.side, z - 0.85);
      this._placeWallDecoration('torchWall', door.side, z + 0.85);

      this.doors.push({
        id: door.id,
        side: door.side,
        row: door.row,
        approach: door.approach,
        center: new THREE.Vector3(frameX, 1.3, z),
        marker,
        pivot,
        panel,
        openAmount: 0,
        targetOpen: 0,
        openAngle: door.side === 'left' ? -Math.PI * 0.62 : Math.PI * 0.62,
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

    const light = new THREE.PointLight(0xff9955, 0.48, 7, 2);
    light.position.set(side === 'left' ? -this.roomHalf + 0.85 : this.roomHalf - 0.85, 2.1, z);
    this.scene.add(light);
    this.torchLights.push({ light, offset: Math.random() * Math.PI * 2 });
  }

  _createDecor() {
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

    const candlestick = this._cloneAsset('candlestick', 0.75, 1.65);
    if (candlestick) {
      candlestick.position.set(0, 1.4, -this.roomHalf + 0.12);
      candlestick.rotation.y = Math.PI;
      this.rootGroup.add(candlestick);
    }
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

  _createCrusher() {
    this.crusherGroup = new THREE.Group();
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(this.gridSize * this.cellSize + 0.2, 0.68, this.gridSize * this.cellSize + 0.2),
      this.crusherMaterial
    );
    slab.castShadow = true;
    slab.receiveShadow = true;
    this.crusherGroup.add(slab);

    const underside = new THREE.Mesh(
      new THREE.PlaneGeometry(this.gridSize * this.cellSize, this.gridSize * this.cellSize),
      new THREE.MeshBasicMaterial({ color: 0x5b1414, transparent: true, opacity: 0.16 })
    );
    underside.rotation.x = Math.PI / 2;
    underside.position.y = -0.35;
    this.crusherGroup.add(underside);

    this.crusherGroup.position.y = this.crusherTopY;
    this.rootGroup.add(this.crusherGroup);

    this.crusherLight = new THREE.PointLight(0xff3311, 0, 28, 2);
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
    this.targetYaw += direction * (Math.PI / 8);
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
      Math.sin(this.yaw) * Math.cos(this.pitch),
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
    return Math.round(normalized / (Math.PI / 2)) % 4;
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
      item.light.intensity = 0.38 + Math.sin(this.clock.elapsedTime * 7 + item.offset) * 0.08;
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
