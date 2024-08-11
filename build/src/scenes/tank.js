"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTankMovement = initializeTankMovement;
exports.initializeShooting = initializeShooting;
var BABYLON = require("@babylonjs/core");
/**
 * Initialize the movement of the player tank.
 */
function initializeTankMovement(_this, rotationSpeed) {
    var inputMap = {};
    // Handle key down and key up events to update inputMap
    var handleKeyEvent = function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type === "keydown";
    };
    _this.scene.actionManager = new BABYLON.ActionManager(_this.scene);
    _this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, handleKeyEvent));
    _this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, handleKeyEvent));
    // Create and manage splatter objects
    var splatterObjects = createSplatterObjects(_this);
    var currentSplatterIndex = 0;
    var tick = 0;
    // Update splatter positioning and rotation
    var updateSplatter = function () {
        if (++tick === 35) {
            splatterObjects[currentSplatterIndex].position.copyFrom(_this.tank.position);
        }
        else if (tick === 40) {
            var splatter = splatterObjects[currentSplatterIndex];
            splatter.position.y = 0;
            splatter.rotate(BABYLON.Axis.Y, Math.random() * 350 + 10, BABYLON.Space.WORLD);
            currentSplatterIndex = (currentSplatterIndex + 1) % splatterObjects.length;
            tick = 0;
            _this.tankSound.play();
        }
    };
    var transformForce = function (mesh, vec) {
        var matrix = new BABYLON.Matrix(); // Transform a vector by the mesh's rotation matrix
        mesh.rotationQuaternion.toRotationMatrix(matrix);
        return BABYLON.Vector3.TransformNormal(vec, matrix);
    };
    var applyMovement = function (mesh, direction, power) {
        mesh.physicsImpostor.setLinearVelocity(mesh.physicsImpostor.getLinearVelocity().add(transformForce(mesh, direction.scale(power))));
    };
    _this.scene.registerBeforeRender(function () {
        _this.divFps.innerHTML = "".concat(_this.scene.getEngine().getFps().toFixed(), " fps");
        var keydown = false;
        var deltaTimeFactor = 22.5 * _this.scene.deltaTime / 40;
        if (inputMap["w"]) { // move forward
            keydown = true;
            applyMovement(_this.tank, new BABYLON.Vector3(0, 0, 1), deltaTimeFactor);
            updateSplatter();
        }
        if (inputMap["s"]) { // move backwards
            keydown = true;
            applyMovement(_this.tank, new BABYLON.Vector3(0, 0, -1), deltaTimeFactor);
            updateSplatter();
        }
        if (inputMap["d"]) { // rotate right
            _this.tank.rotate(BABYLON.Axis.Y, rotationSpeed, BABYLON.Space.WORLD);
            keydown = true;
        }
        if (inputMap["a"]) { // rotate left
            _this.tank.rotate(BABYLON.Axis.Y, -rotationSpeed, BABYLON.Space.WORLD);
            keydown = true;
        }
        // Update camera position to follow the tank
        _this.camera.position.x = _this.tank.position.x - 80;
        _this.camera.position.z = _this.tank.position.z + 60;
    });
}
/**
 * Create and return splatter objects.
 */
function createSplatterObjects(_this) {
    var baseSplatter = _this.scene.getMeshByName("splatter1");
    if (!baseSplatter) {
        console.error("Base splatter object not found in the scene");
        return [];
    }
    return [
        baseSplatter,
        baseSplatter.createInstance("splatter2"),
        baseSplatter.createInstance("splatter3"),
    ];
}
/**
 * Gives the player the ability to shoot with the tank.
 */
function initializeShooting(_this, forward) {
    // Initialize social media targets
    var targetNames = ["github", "linkedin", "twitter"];
    var targetPositions = [
        new BABYLON.Vector3(69.8356, 4.4086, 46.3030),
        new BABYLON.Vector3(69.8356, 2.1121, 17.2901),
    ];
    var targetScalings = [
        new BABYLON.Vector3(1.75, 1.75, 1.75),
        new BABYLON.Vector3(1.5, 1.5, 1.5),
    ];
    var github = _this.scene.getMeshByName("target_github");
    if (!github) {
        console.error("GitHub target not found in the scene");
        return;
    }
    github.material.albedoTexture = new BABYLON.Texture("assets/models/target/target (Base Color).png", _this.scene);
    // Create and configure targets
    var _a = targetNames.slice(1).map(function (name, index) {
        var target = github.createInstance("target_".concat(name));
        target.position = targetPositions[index];
        target.scaling = targetScalings[index];
        return target;
    }), linkedin = _a[0], twitter = _a[1];
    // Function to apply velocity to a mesh
    var applyVelocity = function (mesh, direction, power) {
        mesh.physicsImpostor.setLinearVelocity(mesh.physicsImpostor.getLinearVelocity().add(direction.scale(power)));
    };
    // Create a ball object for shooting
    var ball = BABYLON.MeshBuilder.CreateSphere("ball", { segments: 16, diameter: 1.5 }, _this.scene);
    ball.parent = _this.camera;
    var canShoot = true;
    // Handle shooting logic
    var handleShoot = function () {
        if (!canShoot)
            return;
        canShoot = false;
        _this.bullet.play();
        var shootingDirection = _this.tank.getDirection(forward).normalize();
        var shotBall = ball.createInstance("ball");
        // Set the initial position of the ball
        shotBall.position = _this.tank.position.add(shootingDirection.scale(5));
        shotBall.position.y += 3;
        // Add physics and shoot the ball
        shotBall.physicsImpostor = new BABYLON.PhysicsImpostor(shotBall, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 0.5, restitution: 0 }, _this.scene);
        applyVelocity(shotBall, shootingDirection, 200);
        // Reset shooting ability after 400 ms
        setTimeout(function () { canShoot = true; }, 400);
        // Dispose the ball after 2000 ms
        var disposeTimeout = setTimeout(function () { shotBall.dispose(); }, 2000);
        // Create action managers for targets
        var createActionManager = function (target, url) {
            target.actionManager = new BABYLON.ActionManager(_this.scene);
            target.actionManager.registerAction(new BABYLON.ExecuteCodeAction({ trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger, parameter: shotBall }, function () {
                window.open(url);
                clearTimeout(disposeTimeout);
                shotBall.dispose();
            }));
        };
        createActionManager(github, "https://github.com/Setin2");
        createActionManager(linkedin, "https://www.linkedin.com/in/stefan-cernat/");
    };
    // Register the shooting action on key press
    _this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction({ trigger: BABYLON.ActionManager.OnKeyDownTrigger, parameter: 'e' }, handleShoot));
}
//# sourceMappingURL=tank.js.map