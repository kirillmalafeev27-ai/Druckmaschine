// Monster AI
// Moves toward player, occasionally wanders, chases bait

class Monster {
  constructor(x, y, maze) {
    this.x = x;
    this.y = y;
    this.maze = maze;
    this.moveInterval = 4000; // ms between moves
    this.timer = null;
    this.baitTarget = null; // {x, y} if bait is active
    this.baitTurnsLeft = 0;
    this.wanderChance = 0.15; // 15% chance to wander randomly (scare tactic)
    this.isWandering = false;
    this.wanderSteps = 0;
    this.alive = true;
    this.onMove = null; // callback
  }

  start(getPlayerPos) {
    this.getPlayerPos = getPlayerPos;
    this.alive = true;
    this._lastMoveTime = Date.now();
    this._scheduleMove();
  }

  stop() {
    this.alive = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  _scheduleMove() {
    if (!this.alive) return;
    this.timer = setTimeout(() => {
      // Guard against iOS Safari firing batched timers after tab resume
      const now = Date.now();
      const elapsed = now - this._lastMoveTime;
      if (elapsed < this.moveInterval * 0.5) {
        this._scheduleMove();
        return; // skip — timer fired too soon (batched catch-up)
      }
      this._lastMoveTime = now;
      this._doMove();
      this._scheduleMove();
    }, this.moveInterval);
  }

  _doMove() {
    if (!this.alive) return;

    let targetX, targetY;

    // If bait is active, go to bait
    if (this.baitTarget && this.baitTurnsLeft > 0) {
      targetX = this.baitTarget.x;
      targetY = this.baitTarget.y;
      this.baitTurnsLeft--;

      // Reached bait?
      if (this.x === targetX && this.y === targetY) {
        this.baitTarget = null;
        this.baitTurnsLeft = 0;
      }
    }
    // Random wander (scare tactic)
    else if (!this.isWandering && Math.random() < this.wanderChance) {
      this.isWandering = true;
      this.wanderSteps = 2 + Math.floor(Math.random() * 3); // wander for 2-4 steps
      this._moveRandom();
      if (this.onMove) this.onMove(this.x, this.y);
      return;
    }
    else if (this.isWandering) {
      this.wanderSteps--;
      if (this.wanderSteps <= 0) {
        this.isWandering = false;
      }
      this._moveRandom();
      if (this.onMove) this.onMove(this.x, this.y);
      return;
    }
    else {
      // Chase player
      const playerPos = this.getPlayerPos();
      targetX = playerPos.x;
      targetY = playerPos.y;
    }

    // Use BFS to move toward target
    this._moveToward(targetX, targetY);

    if (this.onMove) this.onMove(this.x, this.y);
  }

  _moveToward(tx, ty) {
    const path = this.maze.findPath(this.x, this.y, tx, ty);
    if (path && path.length > 0) {
      this.x = path[0].x;
      this.y = path[0].y;
    }
  }

  _moveRandom() {
    const dirs = [
      { x: 0, y: -1 }, { x: 1, y: 0 },
      { x: 0, y: 1 },  { x: -1, y: 0 }
    ];
    const validDirs = dirs.filter(d => {
      const nx = this.x + d.x;
      const ny = this.y + d.y;
      return nx >= 0 && nx < this.maze.width && ny >= 0 && ny < this.maze.height &&
             this.maze.grid[ny][nx] === 1;
    });

    if (validDirs.length > 0) {
      const dir = validDirs[Math.floor(Math.random() * validDirs.length)];
      this.x += dir.x;
      this.y += dir.y;
    }
  }

  setBait(x, y) {
    this.baitTarget = { x, y };
    this.baitTurnsLeft = 8; // chase bait for ~8 moves
    this.isWandering = false;
  }

  getDistanceToPlayer() {
    const playerPos = this.getPlayerPos();
    return this.maze.getDistance(this.x, this.y, playerPos.x, playerPos.y);
  }
}
