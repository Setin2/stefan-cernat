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
var babylonjs_1 = require("babylonjs");
var Tank = /** @class */ (function (_super) {
    __extends(Tank, _super);
    /**
     * Override constructor.
     * @warn do not fill.
     */
    // @ts-ignore ignoring the super call as we don't want to re-init
    function Tank() {
        var _this_1 = this;
        return _this_1;
    }
    Tank.prototype.onInitialized = function () {
        // initialize all audio 
        this.bullet = new BABYLON.Sound("music", "assets/sounds/bullet.wav", this.scene, null, { loop: false, volume: 0.5 });
        this.tank_sound = new BABYLON.Sound("tank", "assets/sounds/splash.mp3", this.scene, null, { loop: false, volume: 1 });
        this.brick_sound = new BABYLON.Sound("brick", "assets/sounds/brick.mp3", this.scene, null, { loop: false, volume: 0.5 });
        this.scene = this.getScene();
        var rotationSpeed = 0.02;
        var forward = new BABYLON.Vector3(0, 0, 1);
        var backward = new BABYLON.Vector3(0, 0, -1);
        this.camera = this.scene.getCameraByName("free_camera");
        this.scene.activeCamera = this.camera;
        this.camera.lockedTarget = this.tank;
        this.tank = this.scene.getMeshByName("tank_holder");
        this.tankMovement(this, forward, backward, rotationSpeed);
        this.initializeShooting(this, forward);
    };
    /*
     * Initialize the movement of the player
     * https://playground.babylonjs.com/#LPX1FM#14
     */
    Tank.prototype.tankMovement = function (_this, forward, backward, rotationSpeed) {
        // map the input so that we can press several keys at once to move the tank
        var inputMap = {};
        var input1 = _this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
            inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type == "keydown";
        }));
        var input2 = _this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
            inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type == "keydown";
        }));
        // create instances of the splatter object to reduce memory usage
        var splatter_objects = [];
        splatter_objects.push(_this.scene.getMeshByName("splatter1"));
        splatter_objects.push(splatter_objects[0].createInstance("i" + 1));
        splatter_objects.push(splatter_objects[0].createInstance("i" + 2));
        // we iterate through the splatter objects so we always move the last one in the order
        var current_splatter_index = 0;
        var i = 0;
        var splatPos = new BABYLON.Vector3(0, 0, 0);
        var sound_has_been_played = false;
        // function to change the position of the splatter objects as the tank moves
        function splash() {
            var newSplatPos = new BABYLON.Vector3(_this.tank.position.x, 0, _this.tank.position.z);
            // compute the difference between last splatter position and our current position
            if (Math.abs(splatPos.x - newSplatPos.x) > 0.5 || Math.abs(splatPos.z - newSplatPos.z) > 0.5) {
                if (i == 8) {
                    splatPos = newSplatPos;
                    i += 1;
                }
                // we change the position of the current splatter object
                else if (i == 16) {
                    if (current_splatter_index < 3) {
                        if (sound_has_been_played == false) {
                            _this.tank_sound.play();
                            sound_has_been_played = true;
                        }
                        else {
                            sound_has_been_played = false;
                        }
                        splatter_objects[current_splatter_index].position = splatPos;
                        splatter_objects[current_splatter_index].rotate(BABYLON.Axis.Y, Math.floor(Math.random() * (100 - 10 + 1) + 10), BABYLON.Space.WORLD);
                        current_splatter_index += 1;
                    }
                    else
                        current_splatter_index = 0;
                    i = 0;
                }
                else {
                    i += 1;
                }
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
        _this.tank.physicsImpostor.physicsBody.linearDamping = 0.999;
        _this.tank.physicsImpostor.physicsBody.angularDamping = 1;
        var transpower = 10;
        _this.scene.registerBeforeRender(function () {
            var keydown = false;
            if (inputMap["w"]) {
                keydown = true;
                var direction = _this.tank.getDirection(forward);
                direction.normalize();
                //_this.tank.position = _this.tank.getAbsolutePosition().add(direction);
                translate(_this.tank, new BABYLON.Vector3(0, 0, 1), transpower);
                splash();
            }
            if (inputMap["s"]) {
                keydown = true;
                var direction = _this.tank.getDirection(backward);
                direction.normalize();
                //_this.tank.position = _this.tank.getAbsolutePosition().add(direction);
                translate(_this.tank, new BABYLON.Vector3(0, 0, -1), transpower);
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
            _this.camera.position.x = _this.tank.position.x + -80;
            _this.camera.position.z = _this.tank.position.z + 60;
        });
    };
    /*
     * Give the player the ability to shoot with the tank
     */
    Tank.prototype.initializeShooting = function (_this, forward) {
        // initialize the social media targets for shooting
        var github = _this.scene.getMeshByName("target_github");
        github.material.albedoTexture = new babylonjs_1.Texture("assets/models/target/target (Base Color).png", _this.scene);
        var twitter = github.createInstance("target_twitter");
        twitter.position = new BABYLON.Vector3(69.8355941772461, 4.408603668212891, 46.30295181274414);
        twitter.scaling = new BABYLON.Vector3(1.75, 1.75, 1.75);
        var linkedin = github.createInstance("target_linkedin");
        linkedin.position = new BABYLON.Vector3(69.8355941772461, 2.112103668212891, 17.29005181274414);
        linkedin.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);
        // add velocity to the ball to make a shooting animation
        var translate = function (mesh, direction, power) {
            mesh.physicsImpostor.setLinearVelocity(mesh.physicsImpostor.getLinearVelocity().add(direction.scale(power)));
        };
        // create a ball object to instanciate each time we shoot
        var ball = BABYLON.Mesh.CreateSphere("ball1", 16, 1.5, _this.scene);
        ball.parent = _this.free_camera;
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
                    shootedball.physicsImpostor.registerOnPhysicsCollide(mesh.physicsImpostor, function () { _this.brick_sound.play(); });
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
                // if we shoot the twitter target with this ball
                twitter.actionManager = new BABYLON.ActionManager();
                twitter.actionManager.registerAction(new BABYLON.ExecuteCodeAction({
                    trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger,
                    parameter: shootedball,
                }, function (event) {
                    window.open("https://twitter.com/_setin_");
                    clearTimeout(dispose); // we dont wait to dispose the ball anymore
                    shootedball.dispose(); // we just dispose of it
                }));
                // if we shoot the linkedin target with this ball
                linkedin.actionManager = new BABYLON.ActionManager();
                linkedin.actionManager.registerAction(new BABYLON.ExecuteCodeAction({
                    trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger,
                    parameter: shootedball,
                }, function (event) {
                    window.open("https://www.linkedin.com/in/stefan-cernat/");
                    clearTimeout(dispose); // we dont wait to dispose the ball anymore
                    shootedball.dispose(); // we just dispose of it
                }));
            }
        }));
    };
    return Tank;
}(node_1.Node));
exports.default = Tank;
//# sourceMappingURL=tank.js.map