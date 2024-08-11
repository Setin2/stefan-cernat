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
var babylonjs_1 = require("babylonjs");
var BABYLON = require("@babylonjs/core");
var node_1 = require("@babylonjs/core/node");
var gui_1 = require("@babylonjs/gui");
var trees_1 = require("./trees");
var bricks_1 = require("./bricks");
var tank_1 = require("./tank");
var Play = /** @class */ (function (_super) {
    __extends(Play, _super);
    // @ts-ignore ignoring the super call as we don't want to re-init
    function Play() {
        var _this = this;
        return _this;
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
        //this.camera.position = new BABYLON.Vector3(-80, 60, 60)
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
        (0, trees_1.instantiateTrees)(this);
        (0, bricks_1.instantiateBricks)(this, -5, 8, -30, 3, [6, 6, 4, 2], 0);
        (0, bricks_1.instantiateBricks)(this, 130, 8, -50, 4, [6, 6, 6, 4], 300);
        (0, tank_1.initializeTankMovement)(this, rotationSpeed);
        (0, tank_1.initializeShooting)(this, forward);
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
        /*var text = new TextBlock("alpha", "ALPHA VERSION: UNDER DEVELOPEMENT");
        advancedTexture.addControl(text);*/
        setTimeout(function () {
            advancedTexture.removeControl(image);
        }, 7500);
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
        this.scene.skipPointerMovePicking = true;
        this.scene.freezeMaterials();
        this.getEngine().enableOfflineSupport = false;
        this.scene.blockMaterialDirtyMechanism = true;
        // disable mouse interactions
        this.scene.pointerMovePredicate = function () { return false; };
        this.scene.pointerDownPredicate = function () { return false; };
        this.scene.pointerUpPredicate = function () { return false; };
        var movableMeshes = new Set(["tank", "amongus"]);
        this.scene.meshes
            .filter(function (mesh) { return !movableMeshes.has(mesh.name); })
            .forEach(function (mesh) {
            mesh.isPickable = false;
            mesh.doNotSyncBoundingInfo = true;
            mesh.freezeWorldMatrix();
        });
    };
    return Play;
}(node_1.Node));
exports.default = Play;
//# sourceMappingURL=play.js.map