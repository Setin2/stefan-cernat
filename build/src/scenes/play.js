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
var Play = /** @class */ (function (_super) {
    __extends(Play, _super);
    // @ts-ignore ignoring the super call as we don't want to re-init
    function Play() {
        var _this_1 = this;
        return _this_1;
    }
    /**
     * Called on the node is being initialized.
     * This function is called immediatly after the constructor has been called.
     */
    Play.prototype.onInitialize = function () {
        this.initializeGlobalVariables();
        this.initializeTextures();
        this.optimizeScene();
        // set phaysics
        this.camera.lockedTarget = this.tank;
        this.scene.enablePhysics();
        this.scene.getPhysicsEngine().setGravity(new BABYLON.Vector3(0, -40, 0)); // 9.81 = gravitational acceleration consant, too little
        this.easterEgg();
        this.play();
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
        var rotationSpeed = 0.02;
        var forward = new BABYLON.Vector3(0, 0, 1);
        //const backward = new BABYLON.Vector3(0, 0, -1);	
        this.instantiateTrees();
        this.instantiateBricks(this, -20, 0.5, -30);
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
     * Initialize the movement of the player
     */
    Play.prototype.initializeTankMovement = function (_this, rotationSpeed) {
        var _this_1 = this;
        // map the input so that we can press several keys at once to move the tank
        this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        var inputMap = {};
        var input1 = _this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
            inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type == "keydown";
        }));
        var input2 = _this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
            inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type == "keydown";
        }));
        // create instances of the splatter object to reduce memory usage
        var splatterObjects = [];
        splatterObjects.push(_this.scene.getMeshByName("splatter1"));
        splatterObjects.push(splatterObjects[0].createInstance("i" + 1));
        splatterObjects.push(splatterObjects[0].createInstance("i" + 2));
        // we iterate through the splatter objects so we always move the last one in the order
        var currentSplatterIndex = 0;
        var tick = 0;
        var splatPos = new BABYLON.Vector3(0, 0, 0);
        // function to change the position of the splatter objects as the tank moves
        function splash() {
            tick++;
            if (tick == 35) {
                splatPos = new BABYLON.Vector3(_this.tank.position.x, 0, _this.tank.position.z);
            }
            else if (tick == 40) {
                if (currentSplatterIndex == 3)
                    currentSplatterIndex = 0;
                splatterObjects[currentSplatterIndex].position = splatPos;
                splatterObjects[currentSplatterIndex].rotate(BABYLON.Axis.Y, Math.floor(Math.random() * (360 - 10 + 1) + 10), BABYLON.Space.WORLD);
                currentSplatterIndex++;
                tick = 0;
                _this.tankSound.play();
            }
        }
        var transformForce = function (mesh, vec) {
            var mymatrix = new BABYLON.Matrix();
            mesh.rotationQuaternion.toRotationMatrix(mymatrix);
            return BABYLON.Vector3.TransformNormal(vec, mymatrix);
        };
        var translate = function (mesh, direction, power) {
            mesh.physicsImpostor.setLinearVelocity(mesh.physicsImpostor.getLinearVelocity().add(transformForce(mesh, direction.scale(power))));
        };
        // on w,a,s,d key pressed
        _this.scene.registerBeforeRender(function () {
            var keydown = false;
            if (inputMap["w"]) {
                keydown = true;
                translate(_this.tank, new BABYLON.Vector3(0, 0, 1), 10);
                splash();
            }
            if (inputMap["s"]) {
                keydown = true;
                translate(_this.tank, new BABYLON.Vector3(0, 0, -1), 10);
                splash();
            }
            if (inputMap["d"]) {
                _this.tank.rotate(BABYLON.Axis.Y, rotationSpeed, BABYLON.Space.WORLD);
                keydown = true;
            }
            if (inputMap["a"]) {
                _this.tank.rotate(BABYLON.Axis.Y, -rotationSpeed, BABYLON.Space.WORLD);
                keydown = true;
            }
            // make the camera move with the player, otherwise it only rotates
            _this.camera.position.x = _this_1.tank.position.x + -80;
            _this.camera.position.z = _this_1.tank.position.z + 60;
        });
    };
    /**
     * Give the player the ability to shoot with the tank
     */
    Play.prototype.initializeShooting = function (_this, forward) {
        // initialize the social media targets for shooting
        var github = _this.scene.getMeshByName("target_github");
        github.material.albedoTexture = new babylonjs_1.Texture("assets/models/target/target (Base Color).png", this.scene);
        var linkedin = github.createInstance("target_linkedin");
        linkedin.position = new BABYLON.Vector3(69.8355941772461, 4.408603668212891, 46.30295181274414);
        linkedin.scaling = new BABYLON.Vector3(1.75, 1.75, 1.75);
        var twitter = github.createInstance("target_twitter");
        twitter.position = new BABYLON.Vector3(69.8355941772461, 2.112103668212891, 17.29005181274414);
        twitter.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);
        // add velocity to the ball to make a shooting animation
        var translate = function (mesh, direction, power) {
            mesh.physicsImpostor.setLinearVelocity(mesh.physicsImpostor.getLinearVelocity().add(direction.scale(power)));
        };
        // create a ball object to instantiate each time we shoot
        var ball = BABYLON.Mesh.CreateSphere("ball1", 16, 1.5, _this.scene);
        ball.parent = _this.camera;
        var shot = false;
        // once the key 'e' is pressed
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction({
            trigger: BABYLON.ActionManager.OnKeyDownTrigger,
            parameter: 'e'
        }, function () {
            // we can not shoot more than once every 400 ms
            if (!shot) {
                shot = true;
                _this.bullet.play();
                var shooting_direction = _this.tank.getDirection(forward).normalize();
                var shootedball = ball.createInstance("shootedball");
                // change origin position of the ball to make it look like it is coming from the barrel
                shootedball.position.x = _this.tank.position.x + shooting_direction.x * 5;
                shootedball.position.y = _this.tank.position.y + 3;
                shootedball.position.z = _this.tank.position.z + shooting_direction.z * 5;
                // add a physics impostor an shoot the ball
                shootedball.physicsImpostor = new BABYLON.PhysicsImpostor(shootedball, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 0.5, restitution: 0 }, _this.scene);
                translate(shootedball, shooting_direction, 200);
                setTimeout(function () { shot = false; }, 400);
                var dispose = setTimeout(function () { shootedball.dispose(); }, 2000);
                // if we shoot a brick with this ball, we play a brick sound
                _this.scene.meshes
                    .filter(function (mesh) { return mesh.name == "brick"; })
                    .forEach(function (mesh) {
                    shootedball.physicsImpostor.registerOnPhysicsCollide(mesh.physicsImpostor, function () { _this.brickSound.play(); });
                });
                // if we shoot the github target with this ball
                // each time, we restart the action manager to remove the action from the previous ball
                github.actionManager = new BABYLON.ActionManager();
                github.actionManager.registerAction(new BABYLON.ExecuteCodeAction({
                    trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger,
                    parameter: shootedball,
                }, function (event) {
                    window.open("https://github.com/Setin2"); // open a new tab to my github profile
                    clearTimeout(dispose); // we dont wait to dispose the ball anymore
                    shootedball.dispose(); // we just dispose of it
                }));
                // if we shoot the linkedin target with this ball
                linkedin.actionManager = new BABYLON.ActionManager();
                linkedin.actionManager.registerAction(new BABYLON.ExecuteCodeAction({
                    trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger,
                    parameter: shootedball,
                }, function (event) {
                    window.open("https://www.linkedin.com/in/stefan-cernat/"); // open a new tab to my linkedin profile
                    clearTimeout(dispose); // we dont wait to dispose the ball anymore
                    shootedball.dispose(); // we just dispose of it
                }));
            }
        }));
    };
    /**
     * Set up a wall of bricks in the scene at a specified position
     */
    Play.prototype.instantiateBricks = function (_this, x, y, z) {
        var brickMass = 1;
        var brickLength = 6 * 1.1;
        var brickDepth = 3 * 1.1;
        var brickHeight = brickLength * 0.5 * 1.1;
        var numBricksLength = 6;
        var numBricksHeight = 3;
        y = brickHeight * y;
        // create the first brick object
        var brick;
        brick = BABYLON.MeshBuilder.CreateBox("brick", { width: brickLength, height: brickHeight, depth: brickDepth }, _this.scene);
        brick.material = new BABYLON.StandardMaterial("brick", _this.scene);
        changeBrickPropreties(brick, x, y, z);
        x += brickLength;
        // create instances of the object to form a wall in a certain shape
        for (var j = 0; j < numBricksHeight; j++) {
            // the length of the first row is -1 because we already added a brick
            if (j == 0)
                numBricksLength = 5;
            // the last row has 2 bricks missing
            else if (j == numBricksHeight - 1) {
                x += brickLength;
                numBricksLength -= 2;
            }
            else
                numBricksLength = 6;
            for (var i = 0; i < numBricksLength; i++) {
                brick = brick.createInstance("brick");
                changeBrickPropreties(brick, x, y, z);
                x += brickLength;
            }
            y += brickHeight;
            x = -20;
        }
        function changeBrickPropreties(brick, x, y, z) {
            brick.position = new BABYLON.Vector3(x, y, z);
            brick.physicsImpostor = new BABYLON.PhysicsImpostor(brick, BABYLON.PhysicsImpostor.BoxImpostor, { mass: brickMass, friction: 0.3 }, _this.scene);
            brick.physicsImpostor.registerOnPhysicsCollide(_this.tank.physicsImpostor, function () { _this.brickSound.play(); });
            brick.physicsImpostor.physicsBody.linearDamping = 0.95;
        }
    };
    /**
     * We instantiate clones of the sakura tree instead of adding them from the get go. This way we save memory.
     */
    Play.prototype.instantiateTrees = function () {
        // get the original tree objects from the scene
        var trunk = this.scene.getMeshByName("sakura_trunk1");
        var crown = this.scene.getMeshByName("sakura_crown1");
        // this way we can add more trees to other locations if we want
        var tree_coordinates = [
            new BABYLON.Vector3(47.50430679321289, 5.184815406799316, -36.954864501953125),
            new BABYLON.Vector3(-39.5430429077148, 5.184815406799316, -44.9434814453125),
            new BABYLON.Vector3(-54.039398193359375, 5.184815406799316, -22.038150787353516),
            new BABYLON.Vector3(57.13322830200195, 5.184815406799316, 77.02558898925781)
        ];
        // create new instances of the trunk and crown of the tree
        for (var i = 0; i < tree_coordinates.length; i++) {
            var trunkClone = trunk.createInstance("trunk1");
            trunkClone.position = tree_coordinates[i];
            trunkClone.physicsImpostor = new BABYLON.PhysicsImpostor(trunkClone, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0 }, this.scene);
            var crownClone = crown.createInstance("trunk1");
            crownClone.parent = trunkClone;
            crownClone.position = new BABYLON.Vector3(0.25404930114746094, 1.0641212463378906, 5.179561138153076);
        }
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
        this.scene.meshes
            .filter(function (mesh) { return !movableMeshes.includes(mesh.name); })
            .forEach(function (mesh) {
            mesh.isPickable = false;
            mesh.doNotSyncBoundingInfo = true; // disabling bounding info sync if no collisions must be calculated
            mesh.freezeWorldMatrix();
        });
    };
    return Play;
}(node_1.Node));
exports.default = Play;
//# sourceMappingURL=play.js.map