"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instantiateBricks = instantiateBricks;
var BABYLON = require("@babylonjs/core");
/**
 * Set up a wall of bricks in the scene at a specified position.
 */
function instantiateBricks(_this, x, y, z, numRows, numColumnsPerRow, rotationY) {
    if (rotationY === void 0) { rotationY = 0; }
    var brickMass = 2;
    var brickScaleFactor = 1.1;
    var brickLength = 6 * brickScaleFactor;
    var brickDepth = 3 * brickScaleFactor;
    var brickHeight = brickLength * 0.5 * brickScaleFactor;
    var initialX = x;
    var initialY = y * brickHeight;
    // Create the initial brick
    var brick = createBrick(_this, brickLength, brickHeight, brickDepth);
    // Define a small buffer to prevent collision
    var buffer = 0; // Adjust this value as needed
    var wallParent = new BABYLON.TransformNode("wallParent", _this.scene);
    brick.parent = wallParent;
    // Create the wall of bricks
    for (var j = 0; j < numRows; j++) {
        // Number of bricks in the current row
        var numBricksInRow = numColumnsPerRow[j];
        // Calculate the total width of the current row
        var totalRowWidth = numBricksInRow * (brickLength + buffer);
        // Calculate the center position for the current row
        var rowCenterX = initialX;
        // Start placing bricks from the center
        var x_1 = rowCenterX - (totalRowWidth / 2);
        var y_1 = initialY + j * (brickHeight + buffer);
        for (var i = 0; i < numBricksInRow; i++) {
            var brickInstance = brick.createInstance("brick".concat(j, "-").concat(i));
            positionBrick(_this, brickInstance, x_1, y_1, z, brickMass);
            x_1 += brickLength + buffer; // Increment x position with buffer
            brickInstance.parent = wallParent;
        }
    }
    wallParent.rotate(BABYLON.Axis.Y, rotationY, BABYLON.Space.WORLD);
    /**
     * Create a brick mesh.
     */
    function createBrick(_this, length, height, depth) {
        var brick = BABYLON.MeshBuilder.CreateBox("brick", { width: length, height: height, depth: depth }, _this.scene);
        brick.material = new BABYLON.StandardMaterial("brickMaterial", _this.scene);
        return brick;
    }
    /**
     * Position a brick mesh and set up its physics.
     */
    function positionBrick(_this, brick, x, y, z, mass) {
        brick.position.set(x, y, z);
        brick.physicsImpostor = new BABYLON.PhysicsImpostor(brick, BABYLON.PhysicsImpostor.BoxImpostor, { mass: mass, friction: 1 }, _this.scene);
        // Play sound on collision with the tank
        brick.physicsImpostor.registerOnPhysicsCollide(_this.tank.physicsImpostor, function () {
            _this.brickSound.play();
        });
        brick.physicsImpostor.physicsBody.linearDamping = 0.95;
    }
}
//# sourceMappingURL=bricks.js.map