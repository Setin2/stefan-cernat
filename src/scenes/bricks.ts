import * as BABYLON from "@babylonjs/core";

type BrickContext = {
    scene: BABYLON.Scene;
    tank: BABYLON.AbstractMesh;
    brickSound: BABYLON.Sound;
};

/**
 * Set up a wall of bricks in the scene at a specified position.
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
    const initialX = x;
    const groundY = getGroundHeight(x, y, z);
    const initialY = groundY + brickHeight / 2;

    // Create the initial brick
    const brick = createBrick(_this, brickLength, brickHeight, brickDepth);
    brick.isVisible = false;
    brick.isPickable = false;
    
    // Define a small buffer to prevent collision
    const buffer = 0; // Adjust this value as needed

    const wallParent = new BABYLON.TransformNode("wallParent", _this.scene);
    brick.parent = wallParent;

    // Create the wall of bricks
    for (let j = 0; j < numRows; j++) {
        // Number of bricks in the current row
        const numBricksInRow = numColumnsPerRow[j] ?? 0;
        
        // Calculate the total width of the current row
        const totalRowWidth = numBricksInRow * (brickLength + buffer);
        
        // Calculate the center position for the current row
        const rowCenterX = initialX;
        
        // Start placing bricks from the center
        let x = rowCenterX - (totalRowWidth / 2);
        let y = initialY + j * (brickHeight + buffer);
        
        for (let i = 0; i < numBricksInRow; i++) {
            const brickInstance = brick.createInstance(`brick${j}-${i}`);
            positionBrick(_this, brickInstance, x, y, z, brickMass);
            x += brickLength + buffer; // Increment x position with buffer
            brickInstance.parent = wallParent;
        }
    }
    wallParent.rotate(BABYLON.Axis.Y, rotationY, BABYLON.Space.WORLD);

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

        // Play sound on collision with the tank
        brick.physicsImpostor.registerOnPhysicsCollide(
            _this.tank.physicsImpostor,
            () => {
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
