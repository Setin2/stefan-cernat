"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var node_1 = require("@babylonjs/core/node");
var BABYLON = require("@babylonjs/core");
var gui_1 = require("@babylonjs/gui");
require("babylonjs-loaders");
var babylonjs_1 = require("babylonjs");
var treeGenerator_1 = require("./treeGenerator");
var Play = /** @class */ (function (_super) {
    __extends(Play, _super);
    // @ts-ignore ignoring the super call as we don't want to re-init
    function Play(name, scene) {
        var _this_1 = this;
        return _this_1;
    }
    Play.createInstance = function (name, scene) {
        var instance = new Play(name, scene);
        instance.onInitialize();
        return instance;
    };
    /**
     * Called on the node is being initialized.
     * This function is called immediatly after the constructor has been called.
     */
    Play.prototype.onInitialize = function () {
        this.initializeGlobalVariables();
        this.initializeTextures();
        this.optimizeScene();
        this.initializeShadows();
        // set phaysics
        this.camera.lockedTarget = this.tank;
        this.scene.enablePhysics();
        this.scene.getPhysicsEngine().setGravity(new BABYLON.Vector3(0, -40, 0)); // 9.81 = gravitational acceleration consant, too little
        this.easterEgg();
        this.play();
        this.divFps = document.getElementById("fps");
        //this.scene.debugLayer.show();
    };
    /**
     * Might add other easter eggs later if I feel like it
     */
    Play.prototype.easterEgg = function () {
        console.log("%c Very sly of you, but there is nothing to see here ;)", "color: #CE718F");
    };
    /**
     * Initialize constant variables and functionalities of the game
     */
    Play.prototype.play = function () {
        var rotationSpeed = 0.07;
        var forward = new BABYLON.Vector3(0, 0, 1);
        //const backward = new BABYLON.Vector3(0, 0, -1);	
        this.instantiateTrees();
        this.instantiateBricks(-20, 0.5, -30);
        this.initializeTankMovement(this, rotationSpeed);
        this.initializeShooting(this, forward);
        this.show_Control();
    };
    /**
     * Add image telling the player how to control the tank (+ under developement text)
     */
    Play.prototype.show_Control = function () {
        var advancedTexture = gui_1.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        var image = new gui_1.Image("control", "assets/textures/control_final.png");
        image.width = "250px";
        image.height = "100px";
        image.verticalAlignment = gui_1.Control.VERTICAL_ALIGNMENT_BOTTOM;
        image.paddingBottomInPixels = 40;
        advancedTexture.addControl(image);
        var text = new gui_1.TextBlock("alpha", "ALPHA VERSION: UNDER DEVELOPEMENT");
        advancedTexture.addControl(text);
        setTimeout(function () {
            advancedTexture.removeControl(image);
        }, 7500);
    };
    /**
     * Initialize the movement of the player tank.
     */
    Play.prototype.initializeTankMovement = function (_this, rotationSpeed) {
        // Initialize input map and action manager
        this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        var inputMap = {};
        // Handle key down and key up events to update inputMap
        var handleKeyEvent = function (evt) {
            inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type === "keydown";
        };
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, handleKeyEvent));
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, handleKeyEvent));
        // Create and manage splatter objects
        var splatterObjects = this.createSplatterObjects();
        var currentSplatterIndex = 0;
        var tick = 0;
        var splatPos = new BABYLON.Vector3(0, 0, 0);
        // Function to manage splatter positioning and rotation
        var updateSplatter = function () {
            tick++;
            if (tick === 35) {
                splatPos = new BABYLON.Vector3(_this.tank.position.x, 0, _this.tank.position.z);
            }
            else if (tick === 40) {
                splatterObjects[currentSplatterIndex].position = splatPos;
                splatterObjects[currentSplatterIndex].rotate(BABYLON.Axis.Y, Math.random() * 350 + 10, BABYLON.Space.WORLD);
                currentSplatterIndex = (currentSplatterIndex + 1) % splatterObjects.length;
                tick = 0;
                _this.tankSound.play();
            }
        };
        // Transform a vector by the mesh's rotation matrix
        var transformForce = function (mesh, vec) {
            var matrix = new BABYLON.Matrix();
            mesh.rotationQuaternion.toRotationMatrix(matrix);
            return BABYLON.Vector3.TransformNormal(vec, matrix);
        };
        // Apply velocity to a mesh
        var applyMovement = function (mesh, direction, power) {
            mesh.physicsImpostor.setLinearVelocity(mesh.physicsImpostor.getLinearVelocity().add(transformForce(mesh, direction.scale(power))));
        };
        // Register before render callback for tank movement
        this.scene.registerBeforeRender(function () {
            _this.divFps.innerHTML = _this.getEngine().getFps().toFixed() + " fps";
            var keydown = false;
            // Handle forward and backward movement
            if (inputMap["w"]) {
                keydown = true;
                applyMovement(_this.tank, new BABYLON.Vector3(0, 0, 1), 22.5);
                updateSplatter();
            }
            if (inputMap["s"]) {
                keydown = true;
                applyMovement(_this.tank, new BABYLON.Vector3(0, 0, -1), 22.5);
                updateSplatter();
            }
            // Handle rotation
            if (inputMap["d"]) {
                _this.tank.rotate(BABYLON.Axis.Y, rotationSpeed, BABYLON.Space.WORLD);
                keydown = true;
            }
            if (inputMap["a"]) {
                _this.tank.rotate(BABYLON.Axis.Y, -rotationSpeed, BABYLON.Space.WORLD);
                keydown = true;
            }
            // Update camera position to follow the tank
            _this.camera.position.x = _this.tank.position.x - 80;
            _this.camera.position.z = _this.tank.position.z + 60;
        });
    };
    /**
     * Create and return splatter objects.
     */
    Play.prototype.createSplatterObjects = function () {
        var baseSplatter = this.scene.getMeshByName("splatter1");
        if (!baseSplatter) {
            console.error("Base splatter object not found in the scene");
            return [];
        }
        return [
            baseSplatter,
            baseSplatter.createInstance("splatter_instance_1"),
            baseSplatter.createInstance("splatter_instance_2"),
        ];
    };
    /**
     * Gives the player the ability to shoot with the tank.
     */
    Play.prototype.initializeShooting = function (_this, forward) {
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
        var ball = BABYLON.Mesh.CreateSphere("ball1", 16, 1.5, _this.scene);
        ball.parent = _this.camera;
        var canShoot = true;
        // Handle shooting logic
        var handleShoot = function () {
            if (!canShoot)
                return;
            canShoot = false;
            _this.bullet.play();
            var shootingDirection = _this.tank.getDirection(forward).normalize();
            var shotBall = ball.createInstance("shootedball");
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
            // Play sound if ball hits a brick
            _this.scene.meshes
                .filter(function (mesh) { return mesh.name === "brick"; })
                .forEach(function (mesh) {
                shotBall.physicsImpostor.registerOnPhysicsCollide(mesh.physicsImpostor, function () { _this.brickSound.play(); });
            });
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
    };
    /**
     * Set up a wall of bricks in the scene at a specified position.
     */
    Play.prototype.instantiateBricks = function (x, y, z) {
        var brickMass = 1;
        var brickScaleFactor = 1.1;
        var brickLength = 6 * brickScaleFactor;
        var brickDepth = 3 * brickScaleFactor;
        var brickHeight = brickLength * 0.5 * brickScaleFactor;
        var initialX = x;
        var numBricksHeight = 3;
        y = brickHeight * y;
        // Create the initial brick
        var brick = this.createBrick(brickLength, brickHeight, brickDepth);
        // Place the initial brick
        this.positionBrick(brick, x, y, z, brickMass);
        x += brickLength;
        // Create the wall of bricks
        for (var j = 0; j < numBricksHeight; j++) {
            var numBricksLength = this.getBricksPerRow(j, numBricksHeight);
            var startLengthIndex = 0;
            if (j == numBricksHeight - 1) {
                numBricksLength += 1;
                startLengthIndex -= 1;
            }
            for (var i = startLengthIndex; i < numBricksLength; i++) {
                var brickInstance = brick.createInstance("brick".concat(j, "-").concat(i));
                this.positionBrick(brickInstance, x, y, z, brickMass);
                x += brickLength;
            }
            y += brickHeight;
            x = initialX;
        }
    };
    /**
     * Creates a brick mesh with the given dimensions.
     */
    Play.prototype.createBrick = function (length, height, depth) {
        var brick = BABYLON.MeshBuilder.CreateBox("brick", { width: length, height: height, depth: depth }, this.scene);
        brick.material = new BABYLON.StandardMaterial("brickMaterial", this.scene);
        return brick;
    };
    /**
     * Positions and sets up physics properties for a brick.
     */
    Play.prototype.positionBrick = function (brick, x, y, z, mass) {
        var _this_1 = this;
        brick.position = new BABYLON.Vector3(x, y, z);
        brick.physicsImpostor = new BABYLON.PhysicsImpostor(brick, BABYLON.PhysicsImpostor.BoxImpostor, { mass: mass, friction: 0.3 }, this.scene);
        brick.physicsImpostor.registerOnPhysicsCollide(this.tank.physicsImpostor, function () { _this_1.brickSound.play(); });
        brick.physicsImpostor.physicsBody.linearDamping = 0.95;
    };
    /**
     * Determines the number of bricks in the current row based on its index.
     */
    Play.prototype.getBricksPerRow = function (rowIndex, totalRows) {
        if (rowIndex === 0) {
            return 5; // First row has 5 bricks because the initial brick was added manually
        }
        else if (rowIndex === totalRows - 1) {
            return 4; // Last row has 4 bricks
        }
        return 6; // All other rows have 6 bricks
    };
    /**
     * Instantiates clones of the sakura tree to save memory and allow dynamic placement.
     */
    Play.prototype.instantiateTrees = function () {
        var _this_1 = this;
        // Function to get a material by name
        function getMaterialByName(scene, name) {
            for (var _i = 0, _a = scene.materials; _i < _a.length; _i++) {
                var material = _a[_i];
                if (material.name === name) {
                    return material;
                }
            }
            console.warn("Material with name ".concat(name, " not found."));
            return null;
        }
        // Define the coordinates where the trees will be placed
        var treeCoordinates = [
            new BABYLON.Vector3(78.3985, 5.1848, -11.2018),
            new BABYLON.Vector3(47.5043, 5.1848, -36.9549),
            new BABYLON.Vector3(-39.5430, 5.1848, -44.9435),
            new BABYLON.Vector3(-54.0394, 5.1848, -22.0382),
            new BABYLON.Vector3(57.1332, 5.1848, 77.0256),
        ];
        // Create trees and apply physics impostor
        treeCoordinates.forEach(function (position) {
            var tree = (0, treeGenerator_1.QuickTreeGenerator)(20, 15, 5, getMaterialByName(_this_1.scene, "default material"), getMaterialByName(_this_1.scene, "Feuille.002"), _this_1.scene);
            if (tree) {
                tree.position = position;
            }
        });
    };
    Play.prototype.initializeShadows = function () {
        // Create a shadow generator
        console.log("%c Very sly of you, but 4", "color: #CE718F");
        var dir_light = this.scene.getLightByName("dir_light");
        var shadowGenerator = new BABYLON.ShadowGenerator(1024, dir_light);
        shadowGenerator.bias = 0.0001;
        this.scene.meshes.forEach(function (mesh) {
            shadowGenerator.addShadowCaster(mesh);
            mesh.receiveShadows = true;
        });
    };
    /**
     * Initialize all global variables that will be used in other functions
     */
    Play.prototype.initializeGlobalVariables = function () {
        this.scene = this.getScene();
        this.camera = this.scene.getCameraByName("free_camera");
        // initialize all audio 
        this.bullet = new BABYLON.Sound("music", "assets/sounds/bullet.wav", this.scene, null, { loop: false, volume: 0.5 });
        this.tankSound = new BABYLON.Sound("tank", "assets/sounds/splash.mp3", this.scene, null, { loop: false, volume: 1 });
        this.brickSound = new BABYLON.Sound("brick", "assets/sounds/brick.mp3", this.scene, null, { loop: false, volume: 0.5 });
        // initialize global objects & their physicsImpostors
        this.tank = this.scene.getMeshByName("tank_holder");
        this.tank.physicsImpostor = new BABYLON.PhysicsImpostor(this.tank, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1000, restitution: 0 }, this.scene);
        this.tank.physicsImpostor.physicsBody.linearDamping = 0.999;
        this.tank.physicsImpostor.physicsBody.angularDamping = 1;
    };
    /**
     * We have to initialize textures manually inside code, otherwise they dont show up in production for some reason
     */
    Play.prototype.initializeTextures = function () {
        var fruitFactoryScreen = this.scene.getMeshByName("monitor");
        fruitFactoryScreen.material.albedoTexture = new babylonjs_1.Texture("assets/models/projects/monitor (Base Color).png", this.scene);
        var fruitFactoryDescriptionText = this.scene.getMeshByName("ffdescription");
        fruitFactoryDescriptionText.material.diffuseTexture = new babylonjs_1.Texture("assets/textures/fruit factory description.png", this.scene);
        fruitFactoryDescriptionText.material.opacityTexture = new babylonjs_1.Texture("assets/textures/fruit factory description.png", this.scene);
    };
    Play.prototype.optimizeScene = function () {
        // disable browsing the list of meshes to see if a mesh under the pointer may need to have an associated action / event raised
        this.scene.skipPointerMovePicking = true;
        // freeze the materials to reduce unwanted calculations
        this.scene.freezeMaterials();
        this.getEngine().enableOfflineSupport = false;
        this.scene.blockMaterialDirtyMechanism = true;
        // disable mouse interactions
        this.scene.pointerMovePredicate = function () { return false; };
        this.scene.pointerDownPredicate = function () { return false; };
        this.scene.pointerUpPredicate = function () { return false; };
        // these only apply to static meshes
        var movableMeshes = ["tank", "amongus"];
        var otherMeshes = [];
        this.scene.meshes
            .filter(function (mesh) { return !movableMeshes.includes(mesh.name); })
            .forEach(function (mesh) {
            mesh.isPickable = false;
            mesh.doNotSyncBoundingInfo = true; // disabling bounding info sync if no collisions must be calculated
            mesh.freezeWorldMatrix();
            // Ensure all meshes have the same overrideMaterialSideOrientation
            // mesh.overrideMaterialSideOrientation = BABYLON.Mesh.DEFAULTSIDE;
            otherMeshes.push(mesh);
        });
    };
    return Play;
}(node_1.Node));
exports.default = Play;
//# sourceMappingURL=play.js.map