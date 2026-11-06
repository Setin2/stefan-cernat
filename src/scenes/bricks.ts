import * as BABYLON from "@babylonjs/core";

type BrickContext = {
    scene: BABYLON.Scene;
    tank: BABYLON.AbstractMesh;
    brickSound: BABYLON.Sound;
};

/** Shared by every wall, since they all play the same sound. */
const brickSoundCooldownMs = 150;
let lastBrickSoundTime = 0;

/**
 * Set up a wall of bricks centered at (x, z) and rotated around its own center.
 * @param y fallback ground height used if no ground is found below the wall.
 * @param rotationY rotation of the wall around its own vertical axis, in radians.
 */
export function instantiateBricks(
    _this: BrickContext,
    x: number,
    y: number,
    z: number,
    numRows: number,
    numColumnsPerRow: number[],
    rotationY: number = 0
): void {
    const brickMass = 2;
    const brickScaleFactor = 1.1;
    const brickLength = 6 * brickScaleFactor;
    const brickDepth = 3 * brickScaleFactor;
    const brickHeight = brickLength * 0.5 * brickScaleFactor;
    const groundY = getGroundHeight(x, y, z);
    const initialY = groundY + brickHeight / 2;
    const tankImpostor = _this.tank.physicsImpostor;

    if (!tankImpostor) {
        console.warn("Tank physics impostor is missing. Skipping brick collision audio setup.");
        return;
    }

    // Create the initial brick
    const brick = createBrick(_this, brickLength, brickHeight, brickDepth);
    brick.isVisible = false;
    brick.isPickable = false;
    
    // Define a small buffer to prevent collision
    const buffer = 0; // Adjust this value as needed

    // The wall is built in the parent's local space (centered on x = 0, z = 0) so that
    // rotating the parent turns the wall around its own center.
    const wallParent = new BABYLON.TransformNode("wallParent", _this.scene);
    wallParent.position.set(x, 0, z);
    wallParent.rotation.y = rotationY;
    wallParent.computeWorldMatrix(true);
    brick.parent = wallParent;

    // Create the wall of bricks
    for (let j = 0; j < numRows; j++) {
        // Number of bricks in the current row
        const numBricksInRow = numColumnsPerRow[j] ?? 0;
        
        // Calculate the total width of the current row
        const totalRowWidth = numBricksInRow * (brickLength + buffer);
        
        // Start placing bricks so the row is centered on the wall's center
        let localX = -(totalRowWidth / 2);
        const localY = initialY + j * (brickHeight + buffer);

        for (let i = 0; i < numBricksInRow; i++) {
            const brickInstance = brick.createInstance(`brick${j}-${i}`);
            positionBrick(_this, brickInstance, localX, localY, 0, brickMass);
            // Parent only after the impostor exists: Babylon skips creating the physics
            // body for meshes that already have a parent.
            brickInstance.parent = wallParent;
            localX += brickLength + buffer; // Increment x position with buffer
        }
    }

    /**
     * Create a brick mesh.
     */
    function createBrick(
        _this: BrickContext,
        length: number,
        height: number,
        depth: number
    ): BABYLON.Mesh {
        const brick = BABYLON.MeshBuilder.CreateBox(
            "brick",
            { width: length, height: height, depth: depth },
            _this.scene
        );
        brick.material = new BABYLON.StandardMaterial("brickMaterial", _this.scene);
        return brick;
    }

    /**
     * Position a brick mesh and set up its physics.
     */
    function positionBrick(
        _this: BrickContext,
        brick: BABYLON.Mesh | BABYLON.InstancedMesh,
        x: number,
        y: number,
        z: number,
        mass: number
    ): void {
        brick.position.set(x, y, z);
        brick.physicsImpostor = new BABYLON.PhysicsImpostor(
            brick,
            BABYLON.PhysicsImpostor.BoxImpostor,
            { mass: mass, friction: 1 },
            _this.scene
        );

        // Play sound on collision with the tank. Driving into a wall makes many bricks touch the
        // tank in the same moment, and they all share one sound, so throttle it to avoid
        // restarting it many times in a row.
        brick.physicsImpostor.registerOnPhysicsCollide(
            tankImpostor,
            () => {
                const now = performance.now();
                if (now - lastBrickSoundTime < brickSoundCooldownMs) {
                    return;
                }

                lastBrickSoundTime = now;
                _this.brickSound.play();
            }
        );

        const physicsBody = brick.physicsImpostor.physicsBody;
        if (physicsBody) {
            physicsBody.linearDamping = 0.95;
        }
    }

    function getGroundHeight(x: number, fallbackY: number, z: number): number {
        const rayOrigin = new BABYLON.Vector3(x, fallbackY + 200, z);
        const ray = new BABYLON.Ray(rayOrigin, BABYLON.Vector3.Down(), 400);
        const hit = _this.scene.pickWithRay(ray, (mesh) => mesh.isEnabled() && mesh.isVisible);

        return hit?.pickedPoint?.y ?? fallbackY;
    }
}
