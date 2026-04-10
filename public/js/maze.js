// Maze generation using recursive backtracker (DFS)
// Grid cells: 0 = wall, 1 = path

class MazeGenerator {
  constructor(width, height) {
    // Ensure odd dimensions for proper maze structure
    this.width = width % 2 === 0 ? width + 1 : width;
    this.height = height % 2 === 0 ? height + 1 : height;
    this.grid = [];
  }

  generate() {
    // Initialize grid with all walls
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = 0; // wall
      }
    }

    // Start from (1,1)
    const stack = [];
    const startX = 1;
    const startY = 1;
    this.grid[startY][startX] = 1;
    stack.push({ x: startX, y: startY });

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this._getUnvisitedNeighbors(current.x, current.y);

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        // Carve wall between current and next
        const wallX = current.x + (next.x - current.x) / 2;
        const wallY = current.y + (next.y - current.y) / 2;
        this.grid[wallY][wallX] = 1;
        this.grid[next.y][next.x] = 1;
        stack.push(next);
      }
    }

    // Add some extra passages for wider corridors (makes it less claustrophobic)
    this._addExtraPassages(0.15);

    return this.grid;
  }

  _getUnvisitedNeighbors(x, y) {
    const dirs = [
      { x: 0, y: -2 }, { x: 2, y: 0 },
      { x: 0, y: 2 },  { x: -2, y: 0 }
    ];
    const neighbors = [];
    for (const dir of dirs) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1) {
        if (this.grid[ny][nx] === 0) {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }
    return neighbors;
  }

  _addExtraPassages(ratio) {
    const wallsToRemove = Math.floor(this.width * this.height * ratio);
    let removed = 0;
    let attempts = 0;

    while (removed < wallsToRemove && attempts < wallsToRemove * 10) {
      attempts++;
      const x = 1 + Math.floor(Math.random() * (this.width - 2));
      const y = 1 + Math.floor(Math.random() * (this.height - 2));

      if (this.grid[y][x] === 0) {
        // Check if removing this wall connects two path cells
        let adjPaths = 0;
        if (y > 0 && this.grid[y - 1][x] === 1) adjPaths++;
        if (y < this.height - 1 && this.grid[y + 1][x] === 1) adjPaths++;
        if (x > 0 && this.grid[y][x - 1] === 1) adjPaths++;
        if (x < this.width - 1 && this.grid[y][x + 1] === 1) adjPaths++;

        if (adjPaths >= 2) {
          this.grid[y][x] = 1;
          removed++;
        }
      }
    }
  }

  // Get all walkable cells
  getPathCells() {
    const cells = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === 1) {
          cells.push({ x, y });
        }
      }
    }
    return cells;
  }

  // BFS shortest path
  findPath(startX, startY, endX, endY) {
    const visited = new Set();
    const queue = [{ x: startX, y: startY, path: [] }];
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
      const { x, y, path } = queue.shift();

      if (x === endX && y === endY) {
        return path;
      }

      const dirs = [
        { x: 0, y: -1 }, { x: 1, y: 0 },
        { x: 0, y: 1 },  { x: -1, y: 0 }
      ];

      for (const dir of dirs) {
        const nx = x + dir.x;
        const ny = y + dir.y;
        const key = `${nx},${ny}`;

        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
            this.grid[ny][nx] === 1 && !visited.has(key)) {
          visited.add(key);
          queue.push({ x: nx, y: ny, path: [...path, { x: nx, y: ny }] });
        }
      }
    }

    return null; // No path found
  }

  // Get distance (BFS) between two points
  getDistance(x1, y1, x2, y2) {
    const path = this.findPath(x1, y1, x2, y2);
    return path ? path.length : Infinity;
  }
}
