export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QuadNodeData {
  id: string;
  rect: Rect;
}

export class Quadtree {
  private maxObjects = 10;
  private maxLevels = 5;

  private level: number;
  private bounds: Rect;
  private objects: QuadNodeData[];
  private nodes: Quadtree[];

  constructor(bounds: Rect, level = 0, maxObjects = 10, maxLevels = 5) {
    this.bounds = bounds;
    this.level = level;
    this.maxObjects = maxObjects;
    this.maxLevels = maxLevels;
    this.objects = [];
    this.nodes = [];
  }

  clear() {
    this.objects = [];
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].clear();
    }
    this.nodes = [];
  }

  private split() {
    const subWidth = this.bounds.width / 2;
    const subHeight = this.bounds.height / 2;
    const x = this.bounds.x;
    const y = this.bounds.y;

    this.nodes[0] = new Quadtree(
      { x: x + subWidth, y: y, width: subWidth, height: subHeight },
      this.level + 1,
      this.maxObjects,
      this.maxLevels,
    ); // Top Right
    this.nodes[1] = new Quadtree(
      { x: x, y: y, width: subWidth, height: subHeight },
      this.level + 1,
      this.maxObjects,
      this.maxLevels,
    ); // Top Left
    this.nodes[2] = new Quadtree(
      { x: x, y: y + subHeight, width: subWidth, height: subHeight },
      this.level + 1,
      this.maxObjects,
      this.maxLevels,
    ); // Bottom Left
    this.nodes[3] = new Quadtree(
      { x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight },
      this.level + 1,
      this.maxObjects,
      this.maxLevels,
    ); // Bottom Right
  }

  private getIndex(rect: Rect): number[] {
    const indexes: number[] = [];
    const verticalMidpoint = this.bounds.x + this.bounds.width / 2;
    const horizontalMidpoint = this.bounds.y + this.bounds.height / 2;

    const startIsTop = rect.y < horizontalMidpoint;
    const startIsBottom = rect.y + rect.height > horizontalMidpoint;
    const startIsLeft = rect.x < verticalMidpoint;
    const startIsRight = rect.x + rect.width > verticalMidpoint;

    if (startIsTop && startIsRight) indexes.push(0);
    if (startIsTop && startIsLeft) indexes.push(1);
    if (startIsBottom && startIsLeft) indexes.push(2);
    if (startIsBottom && startIsRight) indexes.push(3);

    return indexes;
  }

  insert(node: QuadNodeData) {
    if (this.nodes.length > 0) {
      const indexes = this.getIndex(node.rect);
      for (const index of indexes) {
        this.nodes[index].insert(node);
      }
      return;
    }

    this.objects.push(node);

    if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
      if (this.nodes.length === 0) {
        this.split();
      }

      for (const obj of this.objects) {
        const indexes = this.getIndex(obj.rect);
        for (const index of indexes) {
          this.nodes[index].insert(obj);
        }
      }
      this.objects = [];
    }
  }

  retrieve(rect: Rect, returnObjects = new Set<string>()): Set<string> {
    const indexes = this.getIndex(rect);
    for (const index of indexes) {
      if (this.nodes.length > 0) {
        this.nodes[index].retrieve(rect, returnObjects);
      }
    }

    for (const obj of this.objects) {
      // Precise AABB intersection check
      if (
        rect.x <= obj.rect.x + obj.rect.width &&
        rect.x + rect.width >= obj.rect.x &&
        rect.y <= obj.rect.y + obj.rect.height &&
        rect.y + rect.height >= obj.rect.y
      ) {
        returnObjects.add(obj.id);
      }
    }

    return returnObjects;
  }
}
