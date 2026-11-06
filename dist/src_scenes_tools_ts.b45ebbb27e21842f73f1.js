/*! babylonjs-editor-generated-template 4.1.0 Fri Nov 06 2026 15:54:09 GMT+0100 (Central European Standard Time) */
"use strict";
(self["webpackChunkgame"] = self["webpackChunkgame"] || []).push([["src_scenes_tools_ts"],{

/***/ "./src/scenes/bricks.ts"
/*!******************************!*\
  !*** ./src/scenes/bricks.ts ***!
  \******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   instantiateBricks: () => (/* binding */ instantiateBricks)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");

/** Shared by every wall, since they all play the same sound. */
var brickSoundCooldownMs = 150;
var lastBrickSoundTime = 0;
/**
 * Set up a wall of bricks centered at (x, z) and rotated around its own center.
 * @param y fallback ground height used if no ground is found below the wall.
 * @param rotationY rotation of the wall around its own vertical axis, in radians.
 */
function instantiateBricks(_this, x, y, z, numRows, numColumnsPerRow, rotationY) {
    var _a;
    if (rotationY === void 0) { rotationY = 0; }
    var brickMass = 2;
    var brickScaleFactor = 1.1;
    var brickLength = 6 * brickScaleFactor;
    var brickDepth = 3 * brickScaleFactor;
    var brickHeight = brickLength * 0.5 * brickScaleFactor;
    var groundY = getGroundHeight(x, y, z);
    var initialY = groundY + brickHeight / 2;
    var tankImpostor = _this.tank.physicsImpostor;
    if (!tankImpostor) {
        console.warn("Tank physics impostor is missing. Skipping brick collision audio setup.");
        return;
    }
    // Create the initial brick
    var brick = createBrick(_this, brickLength, brickHeight, brickDepth);
    brick.isVisible = false;
    brick.isPickable = false;
    // Define a small buffer to prevent collision
    var buffer = 0; // Adjust this value as needed
    // The wall is built in the parent's local space (centered on x = 0, z = 0) so that
    // rotating the parent turns the wall around its own center.
    var wallParent = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("wallParent", _this.scene);
    wallParent.position.set(x, 0, z);
    wallParent.rotation.y = rotationY;
    wallParent.computeWorldMatrix(true);
    brick.parent = wallParent;
    // Create the wall of bricks
    for (var j = 0; j < numRows; j++) {
        // Number of bricks in the current row
        var numBricksInRow = (_a = numColumnsPerRow[j]) !== null && _a !== void 0 ? _a : 0;
        // Calculate the total width of the current row
        var totalRowWidth = numBricksInRow * (brickLength + buffer);
        // Start placing bricks so the row is centered on the wall's center
        var localX = -(totalRowWidth / 2);
        var localY = initialY + j * (brickHeight + buffer);
        for (var i = 0; i < numBricksInRow; i++) {
            var brickInstance = brick.createInstance("brick".concat(j, "-").concat(i));
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
    function createBrick(_this, length, height, depth) {
        var brick = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateBox("brick", { width: length, height: height, depth: depth }, _this.scene);
        brick.material = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("brickMaterial", _this.scene);
        return brick;
    }
    /**
     * Position a brick mesh and set up its physics.
     */
    function positionBrick(_this, brick, x, y, z, mass) {
        brick.position.set(x, y, z);
        brick.physicsImpostor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor(brick, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor.BoxImpostor, { mass: mass, friction: 1 }, _this.scene);
        // Play sound on collision with the tank. Driving into a wall makes many bricks touch the
        // tank in the same moment, and they all share one sound, so throttle it to avoid
        // restarting it many times in a row.
        brick.physicsImpostor.registerOnPhysicsCollide(tankImpostor, function () {
            var now = performance.now();
            if (now - lastBrickSoundTime < brickSoundCooldownMs) {
                return;
            }
            lastBrickSoundTime = now;
            _this.brickSound.play();
        });
        var physicsBody = brick.physicsImpostor.physicsBody;
        if (physicsBody) {
            physicsBody.linearDamping = 0.95;
        }
    }
    function getGroundHeight(x, fallbackY, z) {
        var _a, _b;
        var rayOrigin = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(x, fallbackY + 200, z);
        var ray = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Ray(rayOrigin, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Down(), 400);
        var hit = _this.scene.pickWithRay(ray, function (mesh) { return mesh.isEnabled() && mesh.isVisible; });
        return (_b = (_a = hit === null || hit === void 0 ? void 0 : hit.pickedPoint) === null || _a === void 0 ? void 0 : _a.y) !== null && _b !== void 0 ? _b : fallbackY;
    }
}


/***/ },

/***/ "./src/scenes/play.ts"
/*!****************************!*\
  !*** ./src/scenes/play.ts ***!
  \****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _babylonjs_core_Materials_Textures_texture__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babylonjs/core/Materials/Textures/texture */ "./node_modules/@babylonjs/core/Materials/Textures/texture.js");
/* harmony import */ var _babylonjs_core_node__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babylonjs/core/node */ "./node_modules/@babylonjs/core/node.js");
/* harmony import */ var _trees__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./trees */ "./src/scenes/trees.ts");
/* harmony import */ var _bricks__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./bricks */ "./src/scenes/bricks.ts");
/* harmony import */ var _tank__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./tank */ "./src/scenes/tank.ts");
var __extends = (undefined && undefined.__extends) || (function () {
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
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};






var Play = /** @class */ (function (_super) {
    __extends(Play, _super);
    // @ts-ignore Babylon attaches script classes without calling Node's public constructor shape.
    function Play() {
        var _this = this;
        _this.divFps = null;
        _this.controlOverlayTexture = null;
        _this.controlOverlayPanel = null;
        _this.controlOverlayHint = null;
        _this.controlDismissTimer = null;
        _this.isAudioMuted = false;
        _this.handleControlHotkeys = function (event) {
            if (event.repeat) {
                return;
            }
            var key = event.key.toLowerCase();
            if (key === "h") {
                _this.toggleControlOverlay();
                return;
            }
            if (key === "escape") {
                _this.hideControlOverlay();
                return;
            }
            if (key === "m") {
                _this.toggleAudioMute();
            }
        };
        return _this;
    }
    /**
     * Called when the node is being initialized.
     * This function is called immediately after the constructor has been called.
     */
    Play.prototype.onInitialize = function () {
        var _this = this;
        var _a;
        this.initializeGlobalVariables();
        this.initializeTextures();
        this.divFps = document.getElementById("fps");
        this.configureFpsCounter();
        // Set physics after the required scene nodes are available.
        this.scene.enablePhysics();
        (_a = this.scene.getPhysicsEngine()) === null || _a === void 0 ? void 0 : _a.setGravity(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, -40, 0));
        this.configurePhysicsSubsteps();
        this.easterEgg();
        this.play();
        this.optimizeScene();
        this.onDisposeObservable.addOnce(function () {
            _this.disposeControlOverlay();
        });
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
        var forward = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 0, 1);
        (0,_trees__WEBPACK_IMPORTED_MODULE_3__.instantiateTrees)({ scene: this.scene });
        (0,_bricks__WEBPACK_IMPORTED_MODULE_4__.instantiateBricks)({ scene: this.scene, tank: this.tank, brickSound: this.brickSound }, -5, 8, -30, 3, [6, 6, 4, 2], 0);
        // Center and angle match where this wall has always been placed (it was previously
        // built at (130, -50) and then rotated 300 rad around the world origin).
        (0,_bricks__WEBPACK_IMPORTED_MODULE_4__.instantiateBricks)({ scene: this.scene, tank: this.tank, brickSound: this.brickSound }, 47.1152, 8, 131.0731, 4, [6, 6, 6, 4], 4.6903);
        try {
            this.initializeShadows();
        }
        catch (error) {
            console.error("Shadow initialization failed", error);
        }
        (0,_tank__WEBPACK_IMPORTED_MODULE_5__.initializeTankMovement)({ scene: this.scene, tank: this.tank, camera: this.camera, divFps: this.divFps, tankSound: this.tankSound, bullet: this.bullet }, rotationSpeed);
        void (0,_tank__WEBPACK_IMPORTED_MODULE_5__.initializeShooting)({ scene: this.scene, tank: this.tank, camera: this.camera, divFps: this.divFps, tankSound: this.tankSound, bullet: this.bullet }, forward);
        void this.showControl();
    };
    /**
     * Creates a dedicated shadow-casting light and applies shadows to visible scene meshes.
     */
    Play.prototype.initializeShadows = function () {
        var lightDirection = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(-1, -2, -1).normalize();
        var shadowLight = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DirectionalLight("shadow_sun", lightDirection, this.scene);
        shadowLight.position = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(60, 220, 40);
        shadowLight.intensity = 0.65;
        shadowLight.shadowMinZ = 1;
        shadowLight.shadowMaxZ = 500;
        shadowLight.autoCalcShadowZBounds = false;
        shadowLight.autoUpdateExtends = false;
        shadowLight.orthoLeft = -220;
        shadowLight.orthoRight = 220;
        shadowLight.orthoTop = 220;
        shadowLight.orthoBottom = -220;
        var shadowGenerator = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.ShadowGenerator(2048, shadowLight);
        shadowGenerator.usePercentageCloserFiltering = true;
        shadowGenerator.filteringQuality = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.ShadowGenerator.QUALITY_HIGH;
        shadowGenerator.bias = 0.0015;
        shadowGenerator.normalBias = 0.05;
        shadowGenerator.depthScale = 25;
        shadowGenerator.forceBackFacesOnly = true;
        shadowGenerator.setDarkness(0.25);
        var shadowMap = shadowGenerator.getShadowMap();
        if (!shadowMap) {
            return;
        }
        var excludedShadowMeshes = new Set([
            "ball",
            "splatter1",
            "splatter2",
            "splatter3",
            "ffdescription",
            "monitor",
        ]);
        var shadowCasterKeywords = [
            "tank", "brick", "tree-trunk", "tree-leaves", "text", "arrow", "project", "target",
            "podium", "practice", "github", "linkedin", "twitter", "amongus", "statue", "berserk",
            "guts", "monument", "table", "desk", "chair",
        ];
        var shouldCastShadow = function (mesh) {
            if (excludedShadowMeshes.has(mesh.name)) {
                return false;
            }
            var normalizedName = mesh.name.toLowerCase();
            var sourceName = mesh instanceof _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.InstancedMesh ? mesh.sourceMesh.name.toLowerCase() : "";
            var searchableName = "".concat(normalizedName, " ").concat(sourceName);
            return shadowCasterKeywords.some(function (keyword) { return searchableName.includes(keyword); });
        };
        this.scene.meshes.forEach(function (mesh) {
            if (!mesh.isEnabled() || !mesh.isVisible) {
                return;
            }
            if (mesh instanceof _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh && mesh.material) {
                mesh.receiveShadows = true;
            }
            else if (mesh instanceof _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.InstancedMesh && mesh.sourceMesh.material) {
                mesh.sourceMesh.receiveShadows = true;
            }
            if (shouldCastShadow(mesh)) {
                shadowGenerator.addShadowCaster(mesh, false);
            }
        });
    };
    /**
     * Creates the reusable help overlay and shows it on first load.
     */
    Play.prototype.showControl = function () {
        return __awaiter(this, void 0, void 0, function () {
            var gui, advancedTexture, _a, panel, hint;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, __webpack_require__.e(/*! import() */ "vendors-node_modules_babylonjs_gui_index_js").then(__webpack_require__.bind(__webpack_require__, /*! @babylonjs/gui */ "./node_modules/@babylonjs/gui/index.js"))];
                    case 1:
                        gui = _b.sent();
                        if (this.scene.isDisposed) {
                            return [2 /*return*/];
                        }
                        this.disposeControlOverlay();
                        advancedTexture = gui.AdvancedDynamicTexture.CreateFullscreenUI("control-overlay", true, this.scene);
                        _a = createControlOverlay(gui, advancedTexture, {
                            onToggle: function () { return _this.toggleControlOverlay(); },
                            onClose: function () { return _this.hideControlOverlay(); },
                            onToggleMute: function () { return _this.toggleAudioMute(); },
                            isTouchDevice: window.matchMedia("(pointer: coarse)").matches,
                        }), panel = _a.panel, hint = _a.hint;
                        this.controlOverlayTexture = advancedTexture;
                        this.controlOverlayPanel = panel;
                        this.controlOverlayHint = hint;
                        this.updateControlHint();
                        window.addEventListener("keydown", this.handleControlHotkeys);
                        this.controlDismissTimer = setTimeout(function () {
                            _this.hideControlOverlay();
                        }, 10000);
                        return [2 /*return*/];
                }
            });
        });
    };
    Play.prototype.configureFpsCounter = function () {
        if (!this.divFps) {
            return;
        }
        var isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
        this.divFps.hidden = isTouchDevice;
    };
    /**
     * Initializes the shared scene objects used across the gameplay helpers.
     */
    Play.prototype.initializeGlobalVariables = function () {
        this.scene = this.getScene();
        var camera = this.scene.getCameraByName("free_camera");
        if (!(camera instanceof _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.FreeCamera)) {
            throw new Error("Missing required free_camera in the scene.");
        }
        var tank = this.scene.getMeshByName("tank_holder");
        if (!tank) {
            throw new Error("Missing required tank_holder mesh in the scene.");
        }
        this.camera = camera;
        this.tank = tank;
        this.bullet = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Sound("music", "assets/sounds/bullet.wav", this.scene, null, { loop: false, volume: 0.5 });
        this.tankSound = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Sound("tank", "assets/sounds/splash.mp3", this.scene, null, { loop: false, volume: 1 });
        this.brickSound = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Sound("brick", "assets/sounds/brick.mp3", this.scene, null, { loop: false, volume: 0.5 });
        this.tank.physicsImpostor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor(this.tank, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor.BoxImpostor, { mass: 1000, restitution: 0 }, this.scene);
        // Movement sets the tank's velocity every frame, so linear damping isn't needed. Keep strong
        // angular damping so knocks from bricks can't spin the tank between frames.
        var physicsBody = this.tank.physicsImpostor.physicsBody;
        if (physicsBody) {
            physicsBody.angularDamping = 0.98;
        }
    };
    /**
     * By default Babylon advances cannon.js with one step per frame, sized to the frame time. At
     * 60 fps a shot (200 units/s) moves ~3.3 units per step, about the thickness of a brick, so it
     * can pass straight through; at lower frame rates it gets worse. Splitting each frame into
     * equal sub-steps of at most 1/120s keeps the simulation stable at any frame rate while still
     * advancing exactly the frame's time, so motion stays smooth.
     */
    Play.prototype.configurePhysicsSubsteps = function () {
        var _a;
        var plugin = (_a = this.scene.getPhysicsEngine()) === null || _a === void 0 ? void 0 : _a.getPhysicsPlugin();
        if (!plugin) {
            return;
        }
        var maxSubStepSeconds = 1 / 120;
        var executeStep = plugin.executeStep.bind(plugin);
        plugin.executeStep = function (delta, impostors) {
            var subSteps = Math.max(1, Math.ceil(delta / maxSubStepSeconds - 1e-6));
            var subStepSeconds = delta / subSteps;
            for (var i = 0; i < subSteps; i++) {
                executeStep(subStepSeconds, impostors);
            }
        };
    };
    /**
     * Initializes textures manually to keep them loading reliably in production builds.
     */
    Play.prototype.initializeTextures = function () {
        var fruitFactoryScreen = this.scene.getMeshByName("monitor");
        var screenMaterial = fruitFactoryScreen === null || fruitFactoryScreen === void 0 ? void 0 : fruitFactoryScreen.material;
        if (screenMaterial && "albedoTexture" in screenMaterial) {
            screenMaterial.albedoTexture = new _babylonjs_core_Materials_Textures_texture__WEBPACK_IMPORTED_MODULE_1__.Texture("assets/models/projects/monitor (Base Color).png", this.scene);
        }
        var fruitFactoryDescriptionText = this.scene.getMeshByName("ffdescription");
        var descriptionMaterial = fruitFactoryDescriptionText === null || fruitFactoryDescriptionText === void 0 ? void 0 : fruitFactoryDescriptionText.material;
        if (descriptionMaterial && "diffuseTexture" in descriptionMaterial && "opacityTexture" in descriptionMaterial) {
            var descriptionTexture = new _babylonjs_core_Materials_Textures_texture__WEBPACK_IMPORTED_MODULE_1__.Texture("assets/textures/fruit factory description.png", this.scene);
            descriptionMaterial.diffuseTexture = descriptionTexture;
            descriptionMaterial.opacityTexture = descriptionTexture;
        }
    };
    Play.prototype.optimizeScene = function () {
        this.scene.skipPointerMovePicking = true;
        this.scene.skipPointerDownPicking = true;
        this.scene.skipPointerUpPicking = true;
        this.scene.freezeMaterials();
        this.getEngine().enableOfflineSupport = false;
        this.scene.blockMaterialDirtyMechanism = true;
        this.scene.collisionsEnabled = false;
        // disable mouse interactions
        this.scene.pointerMovePredicate = function () { return false; };
        this.scene.pointerDownPredicate = function () { return false; };
        this.scene.pointerUpPredicate = function () { return false; };
        var movableMeshes = new Set(["tank", "tank_holder", "amongus", "splatter1", "splatter2", "splatter3"]);
        this.scene.meshes
            .filter(function (mesh) { return !mesh.physicsImpostor && !movableMeshes.has(mesh.name); })
            .forEach(function (mesh) {
            mesh.isPickable = false;
            mesh.doNotSyncBoundingInfo = true;
            mesh.freezeWorldMatrix();
        });
    };
    Play.prototype.clearControlDismissTimer = function () {
        if (this.controlDismissTimer) {
            clearTimeout(this.controlDismissTimer);
            this.controlDismissTimer = null;
        }
    };
    Play.prototype.disposeControlOverlay = function () {
        this.clearControlDismissTimer();
        window.removeEventListener("keydown", this.handleControlHotkeys);
        if (this.controlOverlayTexture) {
            this.controlOverlayTexture.dispose();
            this.controlOverlayTexture = null;
        }
        this.controlOverlayPanel = null;
        this.controlOverlayHint = null;
    };
    Play.prototype.toggleControlOverlay = function () {
        if (!this.controlOverlayPanel) {
            return;
        }
        // Manual interaction takes over; don't let the first-load auto-dismiss hide a reopened panel.
        this.clearControlDismissTimer();
        this.controlOverlayPanel.isVisible = !this.controlOverlayPanel.isVisible;
        this.updateControlHint();
    };
    Play.prototype.hideControlOverlay = function () {
        this.clearControlDismissTimer();
        if (!this.controlOverlayPanel || !this.controlOverlayPanel.isVisible) {
            return;
        }
        this.controlOverlayPanel.isVisible = false;
        this.updateControlHint();
    };
    Play.prototype.toggleAudioMute = function () {
        var _a;
        this.isAudioMuted = !this.isAudioMuted;
        (_a = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Engine.audioEngine) === null || _a === void 0 ? void 0 : _a.setGlobalVolume(this.isAudioMuted ? 0 : 1);
        this.updateControlHint();
    };
    Play.prototype.updateControlHint = function () {
        var _a;
        if (!this.controlOverlayHint) {
            return;
        }
        var soundAction = this.isAudioMuted ? "Unmute" : "Mute";
        var helpAction = ((_a = this.controlOverlayPanel) === null || _a === void 0 ? void 0 : _a.isVisible) ? "Hide help" : "Show help";
        this.controlOverlayHint.text = "H ".concat(helpAction, "   M ").concat(soundAction);
    };
    return Play;
}(_babylonjs_core_node__WEBPACK_IMPORTED_MODULE_2__.Node));
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Play);
function createControlOverlay(gui, ui, options) {
    var panel = new gui.Rectangle("controls-panel");
    panel.width = options.isTouchDevice ? "92%" : "380px";
    panel.height = "1px";
    panel.adaptHeightToChildren = true;
    panel.thickness = 1;
    panel.cornerRadius = 18;
    panel.color = "rgba(255,255,255,0.14)";
    panel.background = "rgba(7, 9, 14, 0.78)";
    panel.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_BOTTOM;
    panel.paddingRight = options.isTouchDevice ? "16px" : "22px";
    panel.paddingBottom = "20px";
    panel.isPointerBlocker = true;
    var stack = new gui.StackPanel("controls-panel-stack");
    stack.isVertical = true;
    stack.width = 1;
    stack.paddingTop = "18px";
    stack.paddingBottom = "18px";
    panel.addControl(stack);
    var eyebrow = new gui.TextBlock("controls-eyebrow");
    eyebrow.text = "Controls";
    eyebrow.color = "#f7b955";
    eyebrow.fontSize = 12;
    eyebrow.fontFamily = "Inter, Segoe UI, sans-serif";
    eyebrow.height = "18px";
    eyebrow.textHorizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    eyebrow.paddingLeft = "18px";
    eyebrow.paddingRight = "18px";
    stack.addControl(eyebrow);
    var title = new gui.TextBlock("controls-title");
    title.text = options.isTouchDevice ? "Desktop gives the full experience" : "Drive, aim, and explore";
    title.color = "#f5f7ff";
    title.fontSize = 24;
    title.height = "34px";
    title.textHorizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    title.paddingTop = "4px";
    title.paddingLeft = "18px";
    title.paddingRight = "18px";
    stack.addControl(title);
    var description = new gui.TextBlock("controls-description");
    description.text = options.isTouchDevice
        ? "This portfolio is built around keyboard driving. You can still look around, but movement and shooting are best on desktop."
        : "Use the tank to move between projects and shoot glowing targets to open links.";
    description.color = "rgba(255,255,255,0.76)";
    description.fontSize = 14;
    description.textWrapping = true;
    description.resizeToFit = true;
    description.textHorizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    description.paddingTop = "10px";
    description.paddingLeft = "18px";
    description.paddingRight = "18px";
    description.paddingBottom = "8px";
    stack.addControl(description);
    [
        "W A S D  Move tank",
        "E  Shoot glowing targets",
        "H  Reopen or hide this help",
        "M  Mute or unmute sound",
        "Esc  Close the help panel",
    ].forEach(function (line, index) {
        var item = new gui.TextBlock("controls-line-".concat(index));
        item.text = line;
        item.color = "#f4f7ff";
        item.fontSize = 15;
        item.height = "26px";
        item.textHorizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
        item.paddingLeft = "18px";
        item.paddingRight = "18px";
        stack.addControl(item);
    });
    var actionRow = new gui.StackPanel("controls-actions");
    actionRow.isVertical = false;
    actionRow.height = "42px";
    actionRow.paddingTop = "14px";
    actionRow.paddingLeft = "18px";
    actionRow.paddingRight = "18px";
    stack.addControl(actionRow);
    var muteButton = gui.Button.CreateSimpleButton("controls-mute", "Toggle sound");
    muteButton.width = "132px";
    muteButton.height = "38px";
    muteButton.thickness = 0;
    muteButton.cornerRadius = 18;
    muteButton.color = "#0b0d12";
    muteButton.background = "#f7b955";
    muteButton.fontSize = 14;
    muteButton.onPointerClickObservable.add(function () { return options.onToggleMute(); });
    actionRow.addControl(muteButton);
    var closeButton = gui.Button.CreateSimpleButton("controls-close", "Close");
    closeButton.width = "92px";
    closeButton.height = "38px";
    closeButton.thickness = 1;
    closeButton.cornerRadius = 18;
    closeButton.color = "#f5f7ff";
    closeButton.background = "rgba(255,255,255,0.08)";
    closeButton.fontSize = 14;
    closeButton.paddingLeft = "10px";
    closeButton.onPointerClickObservable.add(function () { return options.onClose(); });
    actionRow.addControl(closeButton);
    var hintBadge = new gui.Rectangle("controls-hint-badge");
    hintBadge.width = options.isTouchDevice ? "210px" : "198px";
    hintBadge.height = "36px";
    hintBadge.thickness = 1;
    hintBadge.cornerRadius = 18;
    hintBadge.color = "rgba(255,255,255,0.16)";
    hintBadge.background = "rgba(8, 10, 16, 0.58)";
    hintBadge.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    hintBadge.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_TOP;
    hintBadge.paddingTop = "52px";
    hintBadge.paddingRight = "12px";
    hintBadge.isPointerBlocker = true;
    var hintText = new gui.TextBlock("controls-hint-text");
    hintText.color = "#f4f7ff";
    hintText.fontSize = 13;
    hintText.fontFamily = "Inter, Segoe UI, sans-serif";
    hintBadge.addControl(hintText);
    hintBadge.onPointerClickObservable.add(function () { return options.onToggle(); });
    ui.addControl(panel);
    ui.addControl(hintBadge);
    return { panel: panel, hint: hintText };
}


/***/ },

/***/ "./src/scenes/scripts-map.ts"
/*!***********************************!*\
  !*** ./src/scenes/scripts-map.ts ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   scriptsMap: () => (/* binding */ scriptsMap)
/* harmony export */ });
/**
 * Defines the map of all available scripts in the project.
 */
var scriptsMap = {
    "src/scenes/bricks.ts": __webpack_require__(/*! ./bricks */ "./src/scenes/bricks.ts"),
    "src/scenes/play.ts": __webpack_require__(/*! ./play */ "./src/scenes/play.ts"),
    "src/scenes/tank.ts": __webpack_require__(/*! ./tank */ "./src/scenes/tank.ts"),
    "src/scenes/trees.ts": __webpack_require__(/*! ./trees */ "./src/scenes/trees.ts"),
};


/***/ },

/***/ "./src/scenes/tank.ts"
/*!****************************!*\
  !*** ./src/scenes/tank.ts ***!
  \****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   initializeShooting: () => (/* binding */ initializeShooting),
/* harmony export */   initializeTankMovement: () => (/* binding */ initializeTankMovement)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};

/**
 * Initialize the movement of the player tank.
 */
function initializeTankMovement(_this, rotationSpeed) {
    var inputMap = {};
    var engine = _this.scene.getEngine();
    var forwardDirection = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
    var zeroVector = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
    var tankVelocity = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
    var cameraTargetPosition = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
    var cameraFocusPoint = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
    var nextPosition = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
    var uprightRotation = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion.Identity();
    var previousTankPosition = _this.tank.position.clone();
    var translationDelta = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
    var baseTankY = _this.tank.position.y;
    // Tree trunks are static, so their collision footprint is computed once instead of every frame.
    var treeColliders = _this.scene.meshes
        .filter(function (mesh) { return mesh.name.startsWith("tree-trunk"); })
        .map(function (trunk) {
        var radius = getHorizontalRadius(trunk);
        return { x: trunk.absolutePosition.x, z: trunk.absolutePosition.z, radius: radius };
    });
    var maxDeltaSeconds = 0.1;
    var maxForwardSpeed = 38;
    var maxReverseSpeed = 20;
    var acceleration = 48;
    var deceleration = 44;
    var maxTurnSpeed = rotationSpeed * 60;
    var turnAcceleration = 12;
    var cameraFollowSharpness = 6;
    var tankCollisionRadius = getHorizontalRadius(_this.tank) * 0.55;
    var lastFpsUpdateTime = 0;
    var currentTurnSpeed = 0;
    var currentMoveSpeed = 0;
    _this.camera.lockedTarget = null;
    _this.tank.computeWorldMatrix(true);
    cameraFocusPoint.copyFrom(_this.tank.getBoundingInfo().boundingBox.centerWorld);
    _this.camera.setTarget(cameraFocusPoint);
    cameraTargetPosition.copyFrom(_this.camera.position);
    _this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
    // Handle key down and key up events to update inputMap
    var handleKeyEvent = function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type === "keydown";
    };
    // Key-up events are lost when the window loses focus, so release every key on blur.
    var releaseAllKeys = function () {
        for (var key in inputMap) {
            inputMap[key] = false;
        }
    };
    window.addEventListener("blur", releaseAllKeys);
    _this.scene.onDisposeObservable.addOnce(function () { return window.removeEventListener("blur", releaseAllKeys); });
    _this.scene.actionManager = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.ActionManager(_this.scene);
    _this.scene.actionManager.registerAction(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.ExecuteCodeAction(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.ActionManager.OnKeyDownTrigger, handleKeyEvent));
    _this.scene.actionManager.registerAction(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.ExecuteCodeAction(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.ActionManager.OnKeyUpTrigger, handleKeyEvent));
    // Create and manage splatter objects
    var splatterObjects = createSplatterObjects(_this);
    var currentSplatterIndex = 0;
    var tick = 0;
    // Update splatter positioning and rotation
    var updateSplatter = function () {
        if (!splatterObjects.length) {
            return;
        }
        if (++tick === 35) {
            splatterObjects[currentSplatterIndex].position.copyFrom(_this.tank.position);
        }
        else if (tick === 40) {
            var splatter = splatterObjects[currentSplatterIndex];
            splatter.position.y = 0;
            splatter.rotate(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Axis.Y, Math.random() * 350 + 10, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Space.WORLD);
            currentSplatterIndex = (currentSplatterIndex + 1) % splatterObjects.length;
            tick = 0;
            _this.tankSound.play();
        }
    };
    var applyMovement = function (mesh, moveInput, deltaSeconds) {
        var physicsImpostor = mesh.physicsImpostor;
        if (!physicsImpostor) {
            return 0;
        }
        var desiredSpeed = moveInput > 0 ? maxForwardSpeed : moveInput < 0 ? -maxReverseSpeed : 0;
        var speedDelta = (moveInput === 0 ? deceleration : acceleration) * deltaSeconds;
        currentMoveSpeed = moveToward(currentMoveSpeed, desiredSpeed, speedDelta);
        var yaw = getYaw(mesh);
        forwardDirection.set(Math.sin(yaw), 0, Math.cos(yaw));
        forwardDirection.normalize();
        // Trees are checked against where the tank will be after this step, so it stops cleanly
        // before a trunk instead of grinding against it.
        nextPosition.copyFrom(mesh.position);
        nextPosition.y = baseTankY;
        nextPosition.addInPlace(forwardDirection.scale(currentMoveSpeed * deltaSeconds));
        if (collidesWithTree(nextPosition)) {
            currentMoveSpeed = 0;
        }
        // The tank is moved by the physics engine using this velocity (rather than by setting its
        // position directly), so the engine knows how fast it is going: bricks and other loose
        // objects get knocked away with real momentum, and static objects still block it.
        forwardDirection.scaleToRef(currentMoveSpeed, tankVelocity);
        physicsImpostor.setLinearVelocity(tankVelocity);
        physicsImpostor.setAngularVelocity(zeroVector);
        return currentMoveSpeed;
    };
    // Runs once per frame, right before the physics step, so the velocity set here is what the
    // physics engine uses to move the tank this frame.
    var tankControllerObserver = _this.scene.onBeforePhysicsObservable.add(function () {
        // Clamp so a long pause (hidden tab, stalled frame) can't teleport the tank through obstacles.
        // Babylon clamps the physics step to the same 0.1s.
        var deltaSeconds = Math.min(engine.getDeltaTime() / 1000, maxDeltaSeconds);
        var moveInput = (inputMap["w"] ? 1 : 0) - (inputMap["s"] ? 1 : 0);
        var turnInput = (inputMap["d"] ? 1 : 0) - (inputMap["a"] ? 1 : 0);
        var currentForwardSpeed = applyMovement(_this.tank, moveInput, deltaSeconds);
        if (moveInput !== 0 && Math.abs(currentForwardSpeed) > 0.5) {
            updateSplatter();
        }
        var desiredTurnSpeed = turnInput * maxTurnSpeed;
        currentTurnSpeed = moveToward(currentTurnSpeed, desiredTurnSpeed, turnAcceleration * deltaSeconds);
        if (currentTurnSpeed !== 0) {
            _this.tank.rotate(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Axis.Y, currentTurnSpeed * deltaSeconds, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Space.WORLD);
        }
        _this.tank.position.y = baseTankY;
        var rotationQuaternion = _this.tank.rotationQuaternion;
        if (rotationQuaternion) {
            _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion.RotationYawPitchRollToRef(getYaw(_this.tank), 0, 0, uprightRotation);
            rotationQuaternion.copyFrom(uprightRotation);
        }
        else {
            _this.tank.rotation.x = 0;
            _this.tank.rotation.z = 0;
        }
    });
    // Runs after the physics step has moved the tank this frame.
    _this.scene.registerBeforeRender(function () {
        if (_this.divFps) {
            var now = performance.now();
            if (now - lastFpsUpdateTime >= 250) {
                _this.divFps.textContent = "".concat(engine.getFps().toFixed(), " fps");
                lastFpsUpdateTime = now;
            }
        }
        var deltaSeconds = Math.min(engine.getDeltaTime() / 1000, maxDeltaSeconds);
        _this.tank.position.subtractToRef(previousTankPosition, translationDelta);
        translationDelta.y = 0;
        cameraTargetPosition.addInPlace(translationDelta);
        _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.LerpToRef(_this.camera.position, cameraTargetPosition, Math.min(1, cameraFollowSharpness * deltaSeconds), _this.camera.position);
        previousTankPosition.copyFrom(_this.tank.position);
    });
    _this.scene.onDisposeObservable.addOnce(function () {
        _this.scene.onBeforePhysicsObservable.remove(tankControllerObserver);
    });
    function moveToward(current, target, maxDelta) {
        if (Math.abs(target - current) <= maxDelta) {
            return target;
        }
        return current + Math.sign(target - current) * maxDelta;
    }
    function getYaw(mesh) {
        return mesh.rotationQuaternion ? mesh.rotationQuaternion.toEulerAngles().y : mesh.rotation.y;
    }
    function getHorizontalRadius(mesh) {
        mesh.computeWorldMatrix(true);
        var extent = mesh.getBoundingInfo().boundingBox.extendSizeWorld;
        return Math.max(extent.x, extent.z);
    }
    function collidesWithTree(position) {
        for (var _i = 0, treeColliders_1 = treeColliders; _i < treeColliders_1.length; _i++) {
            var tree = treeColliders_1[_i];
            var dx = position.x - tree.x;
            var dz = position.z - tree.z;
            var minimumDistance = tankCollisionRadius + tree.radius;
            if ((dx * dx) + (dz * dz) < minimumDistance * minimumDistance) {
                return true;
            }
        }
        return false;
    }
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
    if (!(baseSplatter instanceof _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh)) {
        console.error("Base splatter object must be a mesh");
        return [];
    }
    return [baseSplatter, baseSplatter.createInstance("splatter2"), baseSplatter.createInstance("splatter3")];
}
/**
 * Gives the player the ability to shoot with the tank.
 */
function initializeShooting(_this, forward) {
    return __awaiter(this, void 0, void 0, function () {
        var activeShots, shotOffset, shotHeightOffset, shotRadius, shotLifetimeMs, shotCooldownMs, targetHintRangeSquared, targetAimRangeSquared, aimLockThreshold, recoilRecoverSpeed, shotDirection, shotSpawnPosition, targetPosition, tankForward, toTarget, recoilOffset, recoilStep, targetConfigs, github, githubMaterial, gui, highlightLayer, targetUi, objectiveHint, reticle, hitFeedback, impactBurst, getHitRadiusSquared, targetLabels, targets, applyVelocity, ball, canShoot, shotCooldownUntil, hitFeedbackUntil, impactBurstUntil, currentStatusUntil, currentObjectiveText, hitTarget, impactTarget, discoveredTargets, totalTargetCount, recoilRestoreObserver, shotObserver, handleShoot;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    activeShots = [];
                    shotOffset = 5;
                    shotHeightOffset = 3;
                    shotRadius = 0.75;
                    shotLifetimeMs = 2000;
                    shotCooldownMs = 400;
                    targetHintRangeSquared = 42 * 42;
                    targetAimRangeSquared = 52 * 52;
                    aimLockThreshold = 0.965;
                    recoilRecoverSpeed = 11;
                    shotDirection = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
                    shotSpawnPosition = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
                    targetPosition = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
                    tankForward = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
                    toTarget = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
                    recoilOffset = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
                    recoilStep = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
                    targetConfigs = [
                        {
                            name: "linkedin",
                            label: "LinkedIn",
                            position: new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(69.8356, 4.4086, 46.3030),
                            scaling: new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.75, 1.75, 1.75),
                            url: "https://www.linkedin.com/in/stefan-cernat/",
                        },
                        {
                            name: "twitter",
                            label: "X / Twitter",
                            position: new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(69.8356, 2.1121, 17.2901),
                            scaling: new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.5, 1.5, 1.5),
                            url: "https://x.com/Setin2",
                        },
                    ];
                    github = _this.scene.getMeshByName("target_github");
                    if (!(github instanceof _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh)) {
                        console.error("GitHub target not found in the scene");
                        return [2 /*return*/];
                    }
                    githubMaterial = github.material;
                    if (githubMaterial && "albedoTexture" in githubMaterial) {
                        githubMaterial.albedoTexture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Texture("assets/models/target/target (Base Color).png", _this.scene);
                    }
                    return [4 /*yield*/, __webpack_require__.e(/*! import() */ "vendors-node_modules_babylonjs_gui_index_js").then(__webpack_require__.bind(__webpack_require__, /*! @babylonjs/gui */ "./node_modules/@babylonjs/gui/index.js"))];
                case 1:
                    gui = _a.sent();
                    if (_this.scene.isDisposed) {
                        return [2 /*return*/];
                    }
                    highlightLayer = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.HighlightLayer("target-highlight", _this.scene, {
                        blurHorizontalSize: 0.6,
                        blurVerticalSize: 0.6,
                    });
                    targetUi = gui.AdvancedDynamicTexture.CreateFullscreenUI("target-hints", true, _this.scene);
                    objectiveHint = createObjectiveHint(gui, targetUi);
                    reticle = createReticle(gui, targetUi);
                    hitFeedback = createHitFeedback(gui, targetUi);
                    impactBurst = createImpactBurst(gui, targetUi);
                    getHitRadiusSquared = function (mesh) {
                        // Derive the world radius from the local sphere and absolute scaling: radiusWorld is stale for
                        // meshes with doNotSyncBoundingInfo (set by Play.optimizeScene and copied onto clones).
                        mesh.computeWorldMatrix(true);
                        var scaling = mesh.absoluteScaling;
                        var maxScale = Math.max(Math.abs(scaling.x), Math.abs(scaling.y), Math.abs(scaling.z));
                        var radius = mesh.getBoundingInfo().boundingSphere.radius * maxScale + shotRadius;
                        return radius * radius;
                    };
                    targetLabels = new Map();
                    targets = [{ mesh: github, hitRadiusSquared: getHitRadiusSquared(github), url: "https://github.com/Setin2", label: "GitHub" }];
                    targetConfigs.forEach(function (_a) {
                        var name = _a.name, label = _a.label, position = _a.position, scaling = _a.scaling, url = _a.url;
                        var target = github.clone("target_".concat(name));
                        if (!(target instanceof _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh)) {
                            return;
                        }
                        target.position.copyFrom(position);
                        target.scaling.copyFrom(scaling);
                        targets.push({ mesh: target, hitRadiusSquared: getHitRadiusSquared(target), url: url, label: label });
                    });
                    targets.forEach(function (target) {
                        highlightLayer.addMesh(target.mesh, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString("#f7b955"));
                        targetLabels.set(target.mesh, createTargetLabel(gui, targetUi, target.mesh, target.label));
                    });
                    applyVelocity = function (mesh, direction, power) {
                        var _a;
                        var currentVelocity = (_a = mesh.physicsImpostor) === null || _a === void 0 ? void 0 : _a.getLinearVelocity();
                        if (!mesh.physicsImpostor || !currentVelocity) {
                            return;
                        }
                        mesh.physicsImpostor.setLinearVelocity(currentVelocity.add(direction.scale(power)));
                    };
                    ball = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("ball", { segments: 16, diameter: 1.5 }, _this.scene);
                    ball.parent = _this.camera;
                    ball.isVisible = false;
                    ball.isPickable = false;
                    canShoot = true;
                    shotCooldownUntil = 0;
                    hitFeedbackUntil = 0;
                    impactBurstUntil = 0;
                    currentStatusUntil = 0;
                    currentObjectiveText = objectiveHint.text;
                    hitTarget = null;
                    impactTarget = null;
                    discoveredTargets = new Set();
                    totalTargetCount = targets.length;
                    recoilRestoreObserver = _this.scene.onAfterRenderObservable.add(function () {
                        _this.camera.position.subtractInPlace(recoilOffset);
                    });
                    shotObserver = _this.scene.onBeforeRenderObservable.add(function () {
                        var now = performance.now();
                        var deltaSeconds = _this.scene.getEngine().getDeltaTime() / 1000;
                        var nearbyTargetLabel = "";
                        var nearestTargetDistanceSquared = Number.POSITIVE_INFINITY;
                        var aimedTargetLabel = "";
                        var aimedTargetDistanceSquared = Number.POSITIVE_INFINITY;
                        var bestAimDot = aimLockThreshold;
                        recoilStep.copyFrom(recoilOffset).scaleInPlace(Math.min(1, recoilRecoverSpeed * deltaSeconds));
                        recoilOffset.subtractInPlace(recoilStep);
                        _this.camera.position.addInPlace(recoilOffset);
                        _this.tank.getDirectionToRef(forward, tankForward);
                        tankForward.normalize();
                        for (var _i = 0, targets_1 = targets; _i < targets_1.length; _i++) {
                            var target = targets_1[_i];
                            targetPosition.copyFrom(target.mesh.absolutePosition);
                            var distanceSquared = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.DistanceSquared(_this.tank.absolutePosition, targetPosition);
                            var label = targetLabels.get(target.mesh);
                            if (label) {
                                label.isVisible = distanceSquared <= targetHintRangeSquared;
                            }
                            if (distanceSquared < nearestTargetDistanceSquared) {
                                nearestTargetDistanceSquared = distanceSquared;
                                nearbyTargetLabel = target.label;
                            }
                            if (distanceSquared <= targetHintRangeSquared && !discoveredTargets.has(target.mesh.name)) {
                                discoveredTargets.add(target.mesh.name);
                                currentObjectiveText = "New link discovered: ".concat(target.label, ". ").concat(discoveredTargets.size, " of ").concat(totalTargetCount, " found.");
                                objectiveHint.text = currentObjectiveText;
                                currentStatusUntil = now + 2400;
                            }
                            if (distanceSquared > targetAimRangeSquared) {
                                continue;
                            }
                            toTarget.copyFrom(target.mesh.absolutePosition).subtractInPlace(_this.tank.absolutePosition);
                            toTarget.normalize();
                            var aimDot = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Dot(tankForward, toTarget);
                            if (aimDot >= bestAimDot) {
                                bestAimDot = aimDot;
                                aimedTargetLabel = target.label;
                                aimedTargetDistanceSquared = distanceSquared;
                            }
                        }
                        if (hitTarget && now >= hitFeedbackUntil) {
                            hitFeedback.container.isVisible = false;
                            hitTarget = null;
                        }
                        if (impactTarget && now >= impactBurstUntil) {
                            impactBurst.container.isVisible = false;
                            impactTarget = null;
                        }
                        var cooldownProgress = Math.min(1, Math.max(0, (shotCooldownUntil - now) / shotCooldownMs));
                        reticle.cooldown.alpha = cooldownProgress > 0 ? 0.95 : 0;
                        reticle.cooldown.width = "".concat(Math.max(16, cooldownProgress * 56), "px");
                        reticle.cooldown.height = "".concat(Math.max(16, cooldownProgress * 56), "px");
                        reticle.cooldown.color = hasRecentHit(now, hitFeedbackUntil) ? "rgba(141,247,176,0.4)" : "rgba(247,185,85,0.28)";
                        var hasAimLock = aimedTargetLabel !== "";
                        reticle.frame.color = hasAimLock ? "#f7b955" : "rgba(255,255,255,0.52)";
                        reticle.frame.thickness = hasAimLock ? 2 : 1;
                        reticle.dot.background = hasAimLock ? "#f7b955" : "rgba(255,255,255,0.85)";
                        reticle.label.text = hasAimLock
                            ? "LOCKED: ".concat(aimedTargetLabel)
                            : nearestTargetDistanceSquared <= targetHintRangeSquared
                                ? "NEARBY: ".concat(nearbyTargetLabel)
                                : "".concat(discoveredTargets.size, "/").concat(totalTargetCount, " LINKS FOUND");
                        var nextObjectiveText = hasAimLock
                            ? "Target locked: ".concat(aimedTargetLabel, " (").concat(formatDistance(Math.sqrt(aimedTargetDistanceSquared)), "). Press E to fire.")
                            : nearestTargetDistanceSquared <= targetHintRangeSquared
                                ? "Target in range: ".concat(nearbyTargetLabel, " (").concat(formatDistance(Math.sqrt(nearestTargetDistanceSquared)), "). Turn toward it to lock on.")
                                : "Explore the island to discover glowing targets, projects, and social links. ".concat(discoveredTargets.size, " of ").concat(totalTargetCount, " links found.");
                        if (now >= currentStatusUntil && nextObjectiveText !== currentObjectiveText) {
                            objectiveHint.text = nextObjectiveText;
                            currentObjectiveText = nextObjectiveText;
                        }
                        if (!activeShots.length) {
                            return;
                        }
                        for (var shotIndex = activeShots.length - 1; shotIndex >= 0; shotIndex--) {
                            var activeShot = activeShots[shotIndex];
                            var shotPosition = activeShot.mesh.absolutePosition;
                            var didHit = false;
                            for (var _a = 0, targets_2 = targets; _a < targets_2.length; _a++) {
                                var target = targets_2[_a];
                                // Test the whole path travelled since the last frame: at 200 units/s a shot moves
                                // several units per frame and could otherwise skip straight past a target.
                                if (segmentDistanceSquared(activeShot.previousPosition, shotPosition, target.mesh.absolutePosition) <= target.hitRadiusSquared) {
                                    didHit = true;
                                    window.open(target.url, "_blank", "noopener,noreferrer");
                                    currentObjectiveText = "Direct hit. Opening ".concat(target.label, " in a new tab.");
                                    objectiveHint.text = currentObjectiveText;
                                    currentStatusUntil = now + 2200;
                                    hitTarget = target.mesh;
                                    hitFeedback.container.linkWithMesh(target.mesh);
                                    hitFeedback.container.isVisible = true;
                                    hitFeedbackUntil = now + 900;
                                    impactTarget = target.mesh;
                                    impactBurst.container.linkWithMesh(target.mesh);
                                    impactBurst.container.isVisible = true;
                                    impactBurstUntil = now + 420;
                                    reticle.frame.color = "#8df7b0";
                                    reticle.dot.background = "#8df7b0";
                                    reticle.label.text = "DIRECT HIT: ".concat(target.label);
                                    clearTimeout(activeShot.disposeTimeout);
                                    activeShot.dispose();
                                    activeShots.splice(shotIndex, 1);
                                    break;
                                }
                            }
                            if (!didHit) {
                                activeShot.previousPosition.copyFrom(shotPosition);
                            }
                        }
                    });
                    handleShoot = function () {
                        var _a;
                        if (!canShoot) {
                            return;
                        }
                        canShoot = false;
                        shotCooldownUntil = performance.now() + shotCooldownMs;
                        _this.bullet.play();
                        _this.tank.getDirectionToRef(forward, shotDirection);
                        shotDirection.normalize();
                        recoilOffset.addInPlaceFromFloats(-shotDirection.x * 0.22, 0.18, -shotDirection.z * 0.22);
                        var shotBall = ball.createInstance("ball");
                        shotBall.parent = null;
                        shotDirection.scaleToRef(shotOffset, shotSpawnPosition);
                        shotSpawnPosition.addInPlace(_this.tank.position);
                        shotSpawnPosition.y += shotHeightOffset;
                        shotBall.position.copyFrom(shotSpawnPosition);
                        shotBall.physicsImpostor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor(shotBall, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor.SphereImpostor, { mass: 0.5, restitution: 0 }, _this.scene);
                        // Shots inherit the tank's motion, so firing while driving still goes where you aim.
                        var tankVelocity = (_a = _this.tank.physicsImpostor) === null || _a === void 0 ? void 0 : _a.getLinearVelocity();
                        if (tankVelocity) {
                            shotBall.physicsImpostor.setLinearVelocity(tankVelocity);
                        }
                        applyVelocity(shotBall, shotDirection, 200);
                        setTimeout(function () { canShoot = true; }, shotCooldownMs);
                        var disposeShot = function () {
                            var _a;
                            (_a = shotBall.physicsImpostor) === null || _a === void 0 ? void 0 : _a.dispose();
                            if (!shotBall.isDisposed()) {
                                shotBall.dispose();
                            }
                        };
                        var disposeTimeout = setTimeout(function () {
                            disposeShot();
                            var shotIndex = activeShots.findIndex(function (activeShot) { return activeShot.mesh === shotBall; });
                            if (shotIndex !== -1) {
                                activeShots.splice(shotIndex, 1);
                            }
                        }, shotLifetimeMs);
                        activeShots.push({ mesh: shotBall, previousPosition: shotSpawnPosition.clone(), dispose: disposeShot, disposeTimeout: disposeTimeout });
                    };
                    _this.scene.actionManager.registerAction(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.ExecuteCodeAction({ trigger: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.ActionManager.OnKeyDownTrigger, parameter: 'e' }, handleShoot));
                    _this.scene.onDisposeObservable.addOnce(function () {
                        _this.scene.onBeforeRenderObservable.remove(shotObserver);
                        _this.scene.onAfterRenderObservable.remove(recoilRestoreObserver);
                        activeShots.forEach(function (activeShot) {
                            clearTimeout(activeShot.disposeTimeout);
                            activeShot.dispose();
                        });
                        activeShots.length = 0;
                        targetUi.dispose();
                        highlightLayer.dispose();
                        if (!ball.isDisposed()) {
                            ball.dispose();
                        }
                    });
                    return [2 /*return*/];
            }
        });
    });
}
function createObjectiveHint(gui, ui) {
    var container = new gui.Rectangle("objective-hint");
    container.width = "420px";
    container.height = "1px";
    container.adaptHeightToChildren = true;
    container.thickness = 1;
    container.cornerRadius = 18;
    container.color = "rgba(255,255,255,0.18)";
    container.background = "rgba(8, 10, 16, 0.68)";
    container.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    container.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_TOP;
    container.paddingTop = "18px";
    container.paddingLeft = "18px";
    container.zIndex = 2;
    var text = new gui.TextBlock("objective-hint-text");
    text.text = "Explore the island to discover glowing targets, projects, and social links.";
    text.color = "#f4f7ff";
    text.fontSize = 15;
    text.fontFamily = "Inter, Segoe UI, sans-serif";
    text.textWrapping = true;
    text.resizeToFit = true;
    text.paddingLeft = "16px";
    text.paddingRight = "16px";
    text.paddingTop = "12px";
    text.paddingBottom = "12px";
    container.addControl(text);
    ui.addControl(container);
    return text;
}
function createReticle(gui, ui) {
    var frame = new gui.Rectangle("reticle-frame");
    frame.width = "28px";
    frame.height = "28px";
    frame.thickness = 1;
    frame.cornerRadius = 8;
    frame.color = "rgba(255,255,255,0.52)";
    frame.background = "rgba(10, 12, 18, 0.12)";
    frame.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_CENTER;
    frame.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_CENTER;
    frame.isPointerBlocker = false;
    var dot = new gui.Rectangle("reticle-dot");
    dot.width = "4px";
    dot.height = "4px";
    dot.thickness = 0;
    dot.cornerRadius = 999;
    dot.background = "rgba(255,255,255,0.85)";
    frame.addControl(dot);
    var cooldown = new gui.Ellipse("reticle-cooldown");
    cooldown.width = "16px";
    cooldown.height = "16px";
    cooldown.thickness = 2;
    cooldown.color = "rgba(247,185,85,0.28)";
    cooldown.alpha = 0;
    cooldown.isPointerBlocker = false;
    ui.addControl(cooldown);
    var label = new gui.TextBlock("reticle-label");
    label.text = "0/0 LINKS FOUND";
    label.color = "rgba(255,255,255,0.72)";
    label.fontSize = 12;
    label.fontFamily = "Inter, Segoe UI, sans-serif";
    label.top = "28px";
    label.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_CENTER;
    label.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_CENTER;
    label.isPointerBlocker = false;
    ui.addControl(frame);
    ui.addControl(label);
    return { frame: frame, dot: dot, label: label, cooldown: cooldown };
}
function createHitFeedback(gui, ui) {
    var container = new gui.Rectangle("hit-feedback");
    container.width = "116px";
    container.height = "34px";
    container.thickness = 1;
    container.cornerRadius = 16;
    container.color = "rgba(141,247,176,0.55)";
    container.background = "rgba(10, 28, 18, 0.78)";
    container.linkOffsetY = -92;
    container.isPointerBlocker = false;
    container.isVisible = false;
    var text = new gui.TextBlock("hit-feedback-text");
    text.text = "Direct hit";
    text.color = "#8df7b0";
    text.fontSize = 13;
    text.fontFamily = "Inter, Segoe UI, sans-serif";
    container.addControl(text);
    ui.addControl(container);
    return { container: container, text: text };
}
function createImpactBurst(gui, ui) {
    var container = new gui.Rectangle("impact-burst-anchor");
    container.width = "1px";
    container.height = "1px";
    container.thickness = 0;
    container.background = "transparent";
    container.linkOffsetY = -92;
    container.isPointerBlocker = false;
    container.isVisible = false;
    var ring = new gui.Ellipse("impact-burst-ring");
    ring.width = "82px";
    ring.height = "82px";
    ring.thickness = 3;
    ring.color = "rgba(141,247,176,0.75)";
    ring.background = "rgba(141,247,176,0.1)";
    ring.alpha = 0.9;
    container.addControl(ring);
    ui.addControl(container);
    return { container: container, ring: ring };
}
function hasRecentHit(now, hitFeedbackUntil) {
    return now < hitFeedbackUntil;
}
function formatDistance(distance) {
    return "".concat(Math.max(1, Math.round(distance)), "m away");
}
function createTargetLabel(gui, ui, mesh, label) {
    var container = new gui.Rectangle("label-".concat(mesh.name));
    container.width = "128px";
    container.height = "42px";
    container.thickness = 1;
    container.cornerRadius = 14;
    container.color = "rgba(255,255,255,0.26)";
    container.background = "rgba(7, 9, 14, 0.74)";
    container.linkOffsetY = -80;
    container.isPointerBlocker = false;
    container.isVisible = false;
    var text = new gui.TextBlock("label-text-".concat(mesh.name));
    text.text = "".concat(label, "\nShoot to open");
    text.color = "#fff3cf";
    text.fontSize = 13;
    text.fontFamily = "Inter, Segoe UI, sans-serif";
    text.textWrapping = true;
    container.addControl(text);
    container.linkWithMesh(mesh);
    ui.addControl(container);
    return container;
}
/**
 * Squared distance from a point to the segment between start and end.
 */
function segmentDistanceSquared(start, end, point) {
    var sx = end.x - start.x;
    var sy = end.y - start.y;
    var sz = end.z - start.z;
    var lengthSquared = (sx * sx) + (sy * sy) + (sz * sz);
    var t = 0;
    if (lengthSquared > 0) {
        t = (((point.x - start.x) * sx) + ((point.y - start.y) * sy) + ((point.z - start.z) * sz)) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
    }
    var dx = start.x + (sx * t) - point.x;
    var dy = start.y + (sy * t) - point.y;
    var dz = start.z + (sz * t) - point.z;
    return (dx * dx) + (dy * dy) + (dz * dz);
}


/***/ },

/***/ "./src/scenes/tools.ts"
/*!*****************************!*\
  !*** ./src/scenes/tools.ts ***!
  \*****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   appendScene: () => (/* binding */ appendScene),
/* harmony export */   applyMeshColliders: () => (/* binding */ applyMeshColliders),
/* harmony export */   applyMeshesPoseMatrices: () => (/* binding */ applyMeshesPoseMatrices),
/* harmony export */   attachScriptToNodeAtRuntime: () => (/* binding */ attachScriptToNodeAtRuntime),
/* harmony export */   attachScripts: () => (/* binding */ attachScripts),
/* harmony export */   attachTransformNodesToBones: () => (/* binding */ attachTransformNodesToBones),
/* harmony export */   configureEngine: () => (/* reexport safe */ _engine_config__WEBPACK_IMPORTED_MODULE_15__.configureEngine),
/* harmony export */   configurePostProcesses: () => (/* binding */ configurePostProcesses),
/* harmony export */   defaultRenderingPipelineRef: () => (/* binding */ defaultRenderingPipelineRef),
/* harmony export */   motionBlurPostProcessRef: () => (/* binding */ motionBlurPostProcessRef),
/* harmony export */   projectConfiguration: () => (/* reexport safe */ _engine_config__WEBPACK_IMPORTED_MODULE_15__.projectConfiguration),
/* harmony export */   runScene: () => (/* binding */ runScene),
/* harmony export */   screenSpaceReflectionPostProcessRef: () => (/* binding */ screenSpaceReflectionPostProcessRef),
/* harmony export */   setupRenderingGroups: () => (/* binding */ setupRenderingGroups),
/* harmony export */   ssao2RenderingPipelineRef: () => (/* binding */ ssao2RenderingPipelineRef)
/* harmony export */ });
/* harmony import */ var _babylonjs_core_node__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core/node */ "./node_modules/@babylonjs/core/node.js");
/* harmony import */ var _babylonjs_core_scene__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babylonjs/core/scene */ "./node_modules/@babylonjs/core/scene.js");
/* harmony import */ var _babylonjs_core_Meshes_mesh__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babylonjs/core/Meshes/mesh */ "./node_modules/@babylonjs/core/Meshes/mesh.js");
/* harmony import */ var _babylonjs_core_Misc_tools__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @babylonjs/core/Misc/tools */ "./node_modules/@babylonjs/core/Misc/tools.js");
/* harmony import */ var _babylonjs_core_Maths_math_color__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @babylonjs/core/Maths/math.color */ "./node_modules/@babylonjs/core/Maths/math.color.js");
/* harmony import */ var _babylonjs_core_Engines_engineStore__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @babylonjs/core/Engines/engineStore */ "./node_modules/@babylonjs/core/Engines/engineStore.js");
/* harmony import */ var _babylonjs_core_Loading_sceneLoader__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @babylonjs/core/Loading/sceneLoader */ "./node_modules/@babylonjs/core/Loading/sceneLoader.js");
/* harmony import */ var _babylonjs_core_Meshes_abstractMesh__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @babylonjs/core/Meshes/abstractMesh */ "./node_modules/@babylonjs/core/Meshes/abstractMesh.js");
/* harmony import */ var _babylonjs_core_Materials_Textures_texture__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! @babylonjs/core/Materials/Textures/texture */ "./node_modules/@babylonjs/core/Materials/Textures/texture.js");
/* harmony import */ var _babylonjs_core_Misc_decorators__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! @babylonjs/core/Misc/decorators */ "./node_modules/@babylonjs/core/Misc/decorators.js");
/* harmony import */ var _babylonjs_core_Maths_math_vector__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! @babylonjs/core/Maths/math.vector */ "./node_modules/@babylonjs/core/Maths/math.vector.js");
/* harmony import */ var _babylonjs_core_Audio_audioSceneComponent__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! @babylonjs/core/Audio/audioSceneComponent */ "./node_modules/@babylonjs/core/Audio/audioSceneComponent.js");
/* harmony import */ var _babylonjs_core_Physics_physicsEngineComponent__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! @babylonjs/core/Physics/physicsEngineComponent */ "./node_modules/@babylonjs/core/Physics/physicsEngineComponent.js");
/* harmony import */ var _babylonjs_core_Engines_Extensions_engine_textureSelector__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! @babylonjs/core/Engines/Extensions/engine.textureSelector */ "./node_modules/@babylonjs/core/Engines/Extensions/engine.textureSelector.js");
/* harmony import */ var _babylonjs_core_Materials_Textures_Loaders_ktxTextureLoader__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! @babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader */ "./node_modules/@babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader.js");
/* harmony import */ var _engine_config__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../engine-config */ "./src/engine-config.ts");
/**
 * Generated by the Babylon.JS Editor v4.5.0
 */
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
















/**
 * Loads the given scene file and appends it to the given scene reference (`toScene`).
 * @param toScene defines the instance of `Scene` to append to.
 * @param rootUrl defines the root url for the scene and resources or the concatenation of rootURL and filename (e.g. http://example.com/test.glb)
 * @param sceneFilename defines the name of the scene file.
 */
function appendScene(toScene, rootUrl, sceneFilename) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, _babylonjs_core_Loading_sceneLoader__WEBPACK_IMPORTED_MODULE_6__.SceneLoader.AppendAsync(rootUrl, sceneFilename, toScene, null, ".babylon")];
                case 1:
                    _a.sent();
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            toScene.executeWhenReady(function () {
                                void runScene(toScene, rootUrl).then(resolve).catch(reject);
                            });
                        })];
            }
        });
    });
}
/**
 * Returns whether or not the given constructor is an ES6 (or more) class.
 * @param ctor defines the reference to the constructor to test.
 * @param scene defines the reference to the scene in case the tested script is a graph.
 * @returns whether or not the given constructor is a class.
 */
function isEs6Class(ctor, scene) {
    try {
        ctor.call({}, scene, {});
        return false;
    }
    catch (e) {
        return true;
    }
}
/**
 * Loads the gui data and configures the given node.
 * @param path defines the path to the GUI file to load.
 * @param node defines the reference to the node to configure.
 * @param exports defines the reference to the exported object of the attached script.
 */
function loadGuiComponent(path, node, exports) {
    return __awaiter(this, void 0, void 0, function () {
        var isDisposed, disposeObserver, dataResult, data, ui, controlsLinks, _i, controlsLinks_1, link, c, controlsClickLinks, _loop_1, _a, controlsClickLinks_1, link, images, basePath;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    isDisposed = false;
                    disposeObserver = node.onDisposeObservable.addOnce(function () { return isDisposed = true; });
                    return [4 /*yield*/, _babylonjs_core_Misc_tools__WEBPACK_IMPORTED_MODULE_3__.Tools.LoadFileAsync(path, false)];
                case 1:
                    dataResult = _e.sent();
                    if (isDisposed) {
                        return [2 /*return*/];
                    }
                    node.onDisposeObservable.remove(disposeObserver);
                    data = JSON.parse(dataResult);
                    ui = (_b = node.onGuiInitialized) === null || _b === void 0 ? void 0 : _b.call(node, data);
                    if (!ui) {
                        return [2 /*return*/];
                    }
                    ui.parseContent(data, true);
                    node.onDisposeObservable.addOnce(function () { return ui.dispose(); });
                    controlsLinks = (_c = exports.default._ControlsValues) !== null && _c !== void 0 ? _c : [];
                    for (_i = 0, controlsLinks_1 = controlsLinks; _i < controlsLinks_1.length; _i++) {
                        link = controlsLinks_1[_i];
                        c = ui.getControlByName(link.controlName);
                        node[link.propertyKey] = c;
                    }
                    controlsClickLinks = (_d = exports.default._ControlsClickValues) !== null && _d !== void 0 ? _d : [];
                    _loop_1 = function (link) {
                        var c = ui.getControlByName(link.controlName);
                        switch (link.type) {
                            case "onPointerClickObservable":
                                c === null || c === void 0 ? void 0 : c.onPointerClickObservable.add(function (i) { return node[link.propertyKey](i); });
                                break;
                            case "onPointerEnterObservable":
                                c === null || c === void 0 ? void 0 : c.onPointerEnterObservable.add(function (c) { return node[link.propertyKey](c); });
                                break;
                            case "onPointerOutObservable":
                                c === null || c === void 0 ? void 0 : c.onPointerOutObservable.add(function (c) { return node[link.propertyKey](c); });
                                break;
                        }
                    };
                    for (_a = 0, controlsClickLinks_1 = controlsClickLinks; _a < controlsClickLinks_1.length; _a++) {
                        link = controlsClickLinks_1[_a];
                        _loop_1(link);
                    }
                    images = ui.getControlsByType("Image");
                    basePath = _babylonjs_core_Misc_tools__WEBPACK_IMPORTED_MODULE_3__.Tools.GetFolderPath(path);
                    images.forEach(function (i) {
                        var _a;
                        var source = (_a = i.source) !== null && _a !== void 0 ? _a : "";
                        // Only plain relative paths are resolved against the GUI file's folder. Empty sources,
                        // root-relative paths and any URL with a scheme (http:, https:, data:, blob:, ...) or
                        // protocol-relative "//" prefix are left untouched.
                        if (!source || source.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(source)) {
                            return;
                        }
                        i.source = basePath + source;
                    });
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Requires the needed scripts for the given nodes array and attaches them.
 * @param scene defines the reference to the scene that contains the given nodes.
 * @param scriptsMap defines the map that contains the scripts constructors ordered by script path.
 * @param nodes the array of nodes to attach script (if exists).
 */
function requireScriptForNodes(scene, scriptsMap, nodes) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    var dummyScene = new _babylonjs_core_scene__WEBPACK_IMPORTED_MODULE_1__.Scene(scene.getEngine(), { virtual: true });
    var initializedNodes = [];
    var engine = scene.getEngine();
    // Initialize nodes
    for (var _i = 0, _o = nodes; _i < _o.length; _i++) {
        var n = _o[_i];
        if (!n.metadata || !n.metadata.script || !n.metadata.script.name || n.metadata.script.name === "None") {
            continue;
        }
        var exports_1 = scriptsMap[n.metadata.script.name];
        if (!exports_1) {
            continue;
        }
        var scene_1 = n instanceof _babylonjs_core_scene__WEBPACK_IMPORTED_MODULE_1__.Scene ? n : n.getScene();
        // Get prototype.
        var prototype = exports_1.default.prototype;
        // Call constructor
        if (isEs6Class(prototype.constructor, scene_1)) {
            var currentScene = _babylonjs_core_Engines_engineStore__WEBPACK_IMPORTED_MODULE_5__.EngineStore.LastCreatedScene;
            _babylonjs_core_Engines_engineStore__WEBPACK_IMPORTED_MODULE_5__.EngineStore._LastCreatedScene = dummyScene;
            var clone = null;
            if (exports_1.IsGraph) {
                clone = Reflect.construct(prototype.constructor.bind(n), [scene_1, n]);
            }
            else {
                var className = n.getClassName();
                switch (className) {
                    case "PointLight":
                    case "HemisphericLight":
                    case "DirectionalLight":
                        clone = Reflect.construct(prototype.constructor, [null, _babylonjs_core_Maths_math_vector__WEBPACK_IMPORTED_MODULE_10__.Vector3.Zero(), dummyScene]);
                        break;
                    case "SpotLight":
                        clone = Reflect.construct(prototype.constructor, [null, _babylonjs_core_Maths_math_vector__WEBPACK_IMPORTED_MODULE_10__.Vector3.Zero(), _babylonjs_core_Maths_math_vector__WEBPACK_IMPORTED_MODULE_10__.Vector3.Zero(), 0, 0, dummyScene]);
                        break;
                    case "InstancedMesh":
                        clone = Reflect.construct(prototype.constructor, [null, n.sourceMesh]);
                        break;
                    case "TouchCamera":
                    case "UniversalCamera":
                    case "TargetCamera":
                    case "Camera":
                    case "FreeCamera":
                        clone = Reflect.construct(prototype.constructor, [null, _babylonjs_core_Maths_math_vector__WEBPACK_IMPORTED_MODULE_10__.Vector3.Zero()]);
                        break;
                    case "ArcRotateCamera":
                        clone = Reflect.construct(prototype.constructor, [null, 0, 0, 0, _babylonjs_core_Maths_math_vector__WEBPACK_IMPORTED_MODULE_10__.Vector3.Zero(), dummyScene]);
                        break;
                    default:
                        clone = Reflect.construct(prototype.constructor, []);
                        break;
                }
            }
            Reflect.setPrototypeOf(n, clone.constructor.prototype);
            _babylonjs_core_Engines_engineStore__WEBPACK_IMPORTED_MODULE_5__.EngineStore._LastCreatedScene = currentScene;
            for (var key in clone) {
                if (!Reflect.has(n, key)) {
                    n[key] = clone[key];
                }
            }
            clone.dispose();
        }
        else {
            if (exports_1.IsGraph) {
                exports_1.IsGraphAttached = true;
                prototype.constructor.call(n, scene_1, n);
            }
            else {
                prototype.constructor.call(n);
            }
            // Add prototype
            do {
                for (var key in prototype) {
                    if (!prototype.hasOwnProperty(key) || key === "constructor") {
                        continue;
                    }
                    n[key] = prototype[key].bind(n);
                }
                prototype = Object.getPrototypeOf(prototype);
            } while (((_a = prototype.constructor) === null || _a === void 0 ? void 0 : _a.IsComponent) === true);
        }
        // Call onInitialize
        (_b = n.onInitialize) === null || _b === void 0 ? void 0 : _b.call(n);
        initializedNodes.push({ node: n, exports: exports_1 });
    }
    var _loop_2 = function (i) {
        var n = i.node;
        var e = i.exports;
        var scene_2 = i.node instanceof _babylonjs_core_scene__WEBPACK_IMPORTED_MODULE_1__.Scene ? i.node : i.node.getScene();
        // Check properties
        var properties = (_c = n.metadata.script.properties) !== null && _c !== void 0 ? _c : {};
        for (var key in properties) {
            var p = properties[key];
            switch (p.type) {
                case "Vector2":
                    n[key] = new _babylonjs_core_Maths_math_vector__WEBPACK_IMPORTED_MODULE_10__.Vector2(p.value.x, p.value.y);
                    break;
                case "Vector3":
                    n[key] = new _babylonjs_core_Maths_math_vector__WEBPACK_IMPORTED_MODULE_10__.Vector3(p.value.x, p.value.y, p.value.z);
                    break;
                case "Vector4":
                    n[key] = new _babylonjs_core_Maths_math_vector__WEBPACK_IMPORTED_MODULE_10__.Vector4(p.value.x, p.value.y, p.value.z, p.value.w);
                    break;
                case "Quaternion":
                    n[key] = new _babylonjs_core_Maths_math_vector__WEBPACK_IMPORTED_MODULE_10__.Quaternion(p.value.x, p.value.y, p.value.z, p.value.w);
                    break;
                case "Color3":
                    n[key] = new _babylonjs_core_Maths_math_color__WEBPACK_IMPORTED_MODULE_4__.Color3(p.value.r, p.value.g, p.value.b);
                    break;
                case "Color4":
                    n[key] = new _babylonjs_core_Maths_math_color__WEBPACK_IMPORTED_MODULE_4__.Color4(p.value.r, p.value.g, p.value.b, p.value.a);
                    break;
                case "Node":
                    n[key] = scene_2.getNodeById(p.value);
                    break;
                default:
                    n[key] = p.value;
                    break;
            }
        }
        // Check linked children.
        if (n instanceof _babylonjs_core_node__WEBPACK_IMPORTED_MODULE_0__.Node) {
            var childrenLinks = (_d = e.default._ChildrenValues) !== null && _d !== void 0 ? _d : [];
            var _loop_3 = function (link) {
                var child = n.getChildren((function (node) { return node.name === link.nodeName; }), true)[0];
                n[link.propertyKey] = child;
            };
            for (var _q = 0, childrenLinks_1 = childrenLinks; _q < childrenLinks_1.length; _q++) {
                var link = childrenLinks_1[_q];
                _loop_3(link);
            }
        }
        // Check linked nodes from scene.
        var sceneLinks = (_e = e.default._SceneValues) !== null && _e !== void 0 ? _e : [];
        for (var _r = 0, sceneLinks_1 = sceneLinks; _r < sceneLinks_1.length; _r++) {
            var link = sceneLinks_1[_r];
            var node = scene_2.getNodeByName(link.nodeName);
            n[link.propertyKey] = node;
        }
        // Check particle systems
        var particleSystemLinks = (_f = e.default._ParticleSystemValues) !== null && _f !== void 0 ? _f : [];
        var _loop_4 = function (link) {
            var ps = scene_2.particleSystems.find(function (ps) { return ps.name === link.particleSystemName; });
            n[link.propertyKey] = ps;
        };
        for (var _s = 0, particleSystemLinks_1 = particleSystemLinks; _s < particleSystemLinks_1.length; _s++) {
            var link = particleSystemLinks_1[_s];
            _loop_4(link);
        }
        // Check animation groups
        var animationGroupLinks = (_g = e.default._AnimationGroupValues) !== null && _g !== void 0 ? _g : [];
        for (var _t = 0, animationGroupLinks_1 = animationGroupLinks; _t < animationGroupLinks_1.length; _t++) {
            var link = animationGroupLinks_1[_t];
            var ag = scene_2.getAnimationGroupByName(link.animationGroupName);
            n[link.propertyKey] = ag;
        }
        // Sounds
        var soundLinks = (_h = e.default._SoundValues) !== null && _h !== void 0 ? _h : [];
        var _loop_5 = function (link) {
            switch (link.type) {
                case "global":
                    n[link.propertyKey] = scene_2.mainSoundTrack.soundCollection.find(function (s) { return s.name === link.soundName && !s.spatialSound; });
                    break;
                case "spatial":
                    n[link.propertyKey] = scene_2.mainSoundTrack.soundCollection.find(function (s) { return s.name === link.soundName && s.spatialSound; });
                    break;
                default:
                    n[link.propertyKey] = scene_2.getSoundByName(link.soundName);
                    break;
            }
        };
        for (var _u = 0, soundLinks_1 = soundLinks; _u < soundLinks_1.length; _u++) {
            var link = soundLinks_1[_u];
            _loop_5(link);
        }
        // Materials
        var materialLinks = (_j = e.default._MaterialsValues) !== null && _j !== void 0 ? _j : [];
        for (var _v = 0, materialLinks_1 = materialLinks; _v < materialLinks_1.length; _v++) {
            var link = materialLinks_1[_v];
            var m = scene_2.getMaterialByName(link.nodeName);
            n[link.propertyKey] = m;
        }
        // Check pointer events
        var pointerEvents = (_k = e.default._PointerValues) !== null && _k !== void 0 ? _k : [];
        var _loop_6 = function (event_1) {
            var observer = scene_2.onPointerObservable.add(function (e) {
                var _a;
                if (e.type !== event_1.type) {
                    return;
                }
                if (!event_1.onlyWhenMeshPicked) {
                    return n[event_1.propertyKey](e);
                }
                if (((_a = e.pickInfo) === null || _a === void 0 ? void 0 : _a.pickedMesh) === n) {
                    n[event_1.propertyKey](e);
                }
            });
            n.onDisposeObservable.addOnce(function () { return scene_2.onPointerObservable.remove(observer); });
        };
        for (var _w = 0, pointerEvents_1 = pointerEvents; _w < pointerEvents_1.length; _w++) {
            var event_1 = pointerEvents_1[_w];
            _loop_6(event_1);
        }
        var resultCallback = function () {
            var _a, _b, _c, _d, _e;
            // Check start
            if (n.onStart) {
                var startObserver_1 = scene_2.onBeforeRenderObservable.addOnce(function () {
                    startObserver_1 = null;
                    n.onStart();
                });
                n.onDisposeObservable.addOnce(function () {
                    if (startObserver_1) {
                        scene_2.onBeforeRenderObservable.remove(startObserver_1);
                    }
                });
            }
            // Check update
            if (n.onUpdate) {
                var updateObserver_1 = scene_2.onBeforeRenderObservable.add(function () { return n.onUpdate(); });
                n.onDisposeObservable.addOnce(function () { return scene_2.onBeforeRenderObservable.remove(updateObserver_1); });
            }
            // Check stop
            if (n.onStop) {
                n.onDisposeObservable.addOnce(function () { return n.onStop(); });
            }
            // Check keyboard events
            var keyboardEvents = (_a = e.default._KeyboardValues) !== null && _a !== void 0 ? _a : [];
            var _loop_7 = function (event_2) {
                var observer = scene_2.onKeyboardObservable.add(function (e) {
                    if (event_2.type && e.type !== event_2.type) {
                        return;
                    }
                    if (!event_2.keys.length) {
                        return n[event_2.propertyKey](e);
                    }
                    if (event_2.keys.indexOf(e.event.keyCode) !== -1 || event_2.keys.indexOf(e.event.key) !== -1) {
                        n[event_2.propertyKey](e);
                    }
                });
                n.onDisposeObservable.addOnce(function () { return scene_2.onKeyboardObservable.remove(observer); });
            };
            for (var _i = 0, keyboardEvents_1 = keyboardEvents; _i < keyboardEvents_1.length; _i++) {
                var event_2 = keyboardEvents_1[_i];
                _loop_7(event_2);
            }
            // Check resize events
            var resizeEvents = (_b = e.default._ResizeValues) !== null && _b !== void 0 ? _b : [];
            var _loop_8 = function (event_3) {
                var observer = engine.onResizeObservable.add(function (e) {
                    n[event_3.propertyKey](e.getRenderWidth(), e.getRenderHeight());
                });
                n.onDisposeObservable.addOnce(function () { return engine.onResizeObservable.remove(observer); });
            };
            for (var _f = 0, resizeEvents_1 = resizeEvents; _f < resizeEvents_1.length; _f++) {
                var event_3 = resizeEvents_1[_f];
                _loop_8(event_3);
            }
            // Retrieve impostors
            if (n instanceof _babylonjs_core_Meshes_abstractMesh__WEBPACK_IMPORTED_MODULE_7__.AbstractMesh && !n.physicsImpostor) {
                n.physicsImpostor = (_d = (_c = n._scene.getPhysicsEngine()) === null || _c === void 0 ? void 0 : _c.getImpostorForPhysicsObject(n)) !== null && _d !== void 0 ? _d : null;
            }
            delete n.metadata.script;
            // Tell the script it has is ready
            (_e = n.onInitialized) === null || _e === void 0 ? void 0 : _e.call(n);
        };
        // Check asynchronous components
        var promises = [];
        var guiPath = (_l = e.default._GuiPath) !== null && _l !== void 0 ? _l : (_m = n.metadata) === null || _m === void 0 ? void 0 : _m.guiPath;
        if (guiPath) {
            promises.push(loadGuiComponent(guiPath, n, e));
        }
        if (promises.length) {
            Promise.all(promises).then(function () { return resultCallback(); });
        }
        else {
            resultCallback();
        }
    };
    // Configure initialized nodes
    for (var _p = 0, initializedNodes_1 = initializedNodes; _p < initializedNodes_1.length; _p++) {
        var i = initializedNodes_1[_p];
        _loop_2(i);
    }
    dummyScene.dispose();
}
/**
 * Works as an helper, this will:
 * - attach scripts on objects.
 * - configure post-processes
 * - setup rendering groups
 * @param scene the scene to attach scripts, etc.
 */
function runScene(scene, rootUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var scriptsMap;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    scriptsMap = (__webpack_require__(/*! ./scripts-map */ "./src/scenes/scripts-map.ts").scriptsMap);
                    // Attach scripts to objects in scene.
                    attachScripts(scriptsMap, scene);
                    // Configure post-processes
                    return [4 /*yield*/, configurePostProcesses(scene, rootUrl)];
                case 1:
                    // Configure post-processes
                    _a.sent();
                    // Rendering groups
                    setupRenderingGroups(scene);
                    // Pose matrices
                    applyMeshesPoseMatrices(scene);
                    // Bones parenting
                    attachTransformNodesToBones(scene);
                    // Apply colliders
                    applyMeshColliders(scene);
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Attaches all available scripts on nodes of the given scene.
 * @param scene the scene reference that contains the nodes to attach scripts.
 */
function attachScripts(scriptsMap, scene) {
    requireScriptForNodes(scene, scriptsMap, scene.meshes);
    requireScriptForNodes(scene, scriptsMap, scene.lights);
    requireScriptForNodes(scene, scriptsMap, scene.cameras);
    requireScriptForNodes(scene, scriptsMap, scene.transformNodes);
    requireScriptForNodes(scene, scriptsMap, [scene]);
    var _loop_9 = function (scriptKey) {
        var script = scriptsMap[scriptKey];
        if (script.IsGraph && !script.IsGraphAttached) {
            var instance_1 = new script.default(scene);
            scene.executeWhenReady(function () { return instance_1["onStart"](); });
            scene.onBeforeRenderObservable.add(function () { return instance_1["onUpdate"](); });
        }
    };
    // Graphs
    for (var scriptKey in scriptsMap) {
        _loop_9(scriptKey);
    }
}
/**
 * Applies the waiting mesh colliders in case the scene is incremental.
 * @param scene defines the reference to the scene that contains the mesh colliders to apply.
 */
function applyMeshColliders(scene) {
    scene.meshes.forEach(function (m) {
        var _a;
        if (m instanceof _babylonjs_core_Meshes_mesh__WEBPACK_IMPORTED_MODULE_2__.Mesh && ((_a = m.metadata) === null || _a === void 0 ? void 0 : _a.collider)) {
            m._checkDelayState();
        }
    });
}
/**
 * Setups the rendering groups for meshes in the given scene.
 * @param scene defines the scene containing the meshes to configure their rendering group Ids.
 */
function setupRenderingGroups(scene) {
    scene.meshes.forEach(function (m) {
        var _a;
        if (!m.metadata || !(m instanceof _babylonjs_core_Meshes_mesh__WEBPACK_IMPORTED_MODULE_2__.Mesh)) {
            return;
        }
        m.renderingGroupId = (_a = m.metadata.renderingGroupId) !== null && _a !== void 0 ? _a : m.renderingGroupId;
    });
}
/**
 * Meshes using pose matrices with skeletons can't be parsed directly as the pose matrix is
 * missing from the serialized data of meshes. These matrices are stored in the meshes metadata
 * instead and can be applied by calling this function.
 * @param scene defines the scene containing the meshes to configure their pose matrix.
 */
function applyMeshesPoseMatrices(scene) {
    scene.meshes.forEach(function (m) {
        var _a;
        if (m.skeleton && ((_a = m.metadata) === null || _a === void 0 ? void 0 : _a.basePoseMatrix)) {
            m.updatePoseMatrix(_babylonjs_core_Maths_math_vector__WEBPACK_IMPORTED_MODULE_10__.Matrix.FromArray(m.metadata.basePoseMatrix));
            delete m.metadata.basePoseMatrix;
        }
    });
}
/**
 * Checks scene's transform nodes in order to attach to related bones.
 * @param scene defines the reference to the scene containing the transform nodes to potentially attach to bones.
 */
function attachTransformNodesToBones(scene) {
    var apply = function (tn) {
        var _a;
        if (!((_a = tn.metadata) === null || _a === void 0 ? void 0 : _a.parentBoneId)) {
            return;
        }
        var bone = scene.getBoneByID(tn.metadata.parentBoneId);
        if (!bone) {
            return;
        }
        var skeleton = bone.getSkeleton();
        var mesh = scene.meshes.find(function (m) { return m.skeleton === skeleton; });
        if (mesh) {
            tn.attachToBone(bone, mesh);
        }
        delete tn.metadata.parentBoneId;
    };
    scene.meshes.forEach(function (m) { return apply(m); });
    scene.transformNodes.forEach(function (tn) { return apply(tn); });
}
/**
 * Attaches a script at runtime to the given node according to the given script's path.
 * @param scriptPath defines the path to the script to attach (available as a key in the exported "scriptsMap" map).
 * @param object defines the reference to the object (node or scene) to attach the script to.
 */
function attachScriptToNodeAtRuntime(scriptPath, object) {
    var _a, _b;
    var scriptsMap = (__webpack_require__(/*! ./scripts-map */ "./src/scenes/scripts-map.ts").scriptsMap);
    object.metadata = (_a = object.metadata) !== null && _a !== void 0 ? _a : {};
    object.metadata.script = (_b = object.metadata.script) !== null && _b !== void 0 ? _b : {};
    object.metadata.script.name = scriptPath;
    requireScriptForNodes(object instanceof _babylonjs_core_scene__WEBPACK_IMPORTED_MODULE_1__.Scene ? object : object.getScene(), scriptsMap, [object]);
    return object;
}
/**
 * Defines the reference to the SSAO2 rendering pipeline.
 */
var ssao2RenderingPipelineRef = null;
/**
 * Defines the reference to the SSR post-process.
 */
var screenSpaceReflectionPostProcessRef = null;
/**
 * Defines the reference to the default rendering pipeline.
 */
var defaultRenderingPipelineRef = null;
/**
 * Defines the reference to the motion blur post-process.
 */
var motionBlurPostProcessRef = null;
/**
 * Configures and attaches the post-processes of the given scene.
 * @param scene the scene where to create the post-processes and attach to its cameras.
 * @param rootUrl the root Url where to find extra assets used by pipelines. Should be the same as the scene.
 */
function configurePostProcesses(scene_3) {
    return __awaiter(this, arguments, void 0, function (scene, rootUrl) {
        var data, _a, ssaoModule, ssrModule, defaultPipelineModule, colorCurvesModule, colorGradingModule, motionBlurModule, SSAO2RenderingPipeline_1, ScreenSpaceReflectionPostProcess_1, DefaultRenderingPipeline_1, ColorCurves, ColorGradingTexture, MotionBlurPostProcess_1;
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        if (rootUrl === void 0) { rootUrl = null; }
        return __generator(this, function (_q) {
            switch (_q.label) {
                case 0:
                    if (rootUrl === null || !((_b = scene.metadata) === null || _b === void 0 ? void 0 : _b.postProcesses)) {
                        return [2 /*return*/];
                    }
                    data = scene.metadata.postProcesses;
                    return [4 /*yield*/, Promise.all([
                            data.ssao && !ssao2RenderingPipelineRef ? Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! @babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline */ "./node_modules/@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline.js")) : Promise.resolve(null),
                            ((_c = data.screenSpaceReflections) === null || _c === void 0 ? void 0 : _c.json) && !screenSpaceReflectionPostProcessRef ? Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! @babylonjs/core/PostProcesses/screenSpaceReflectionPostProcess */ "./node_modules/@babylonjs/core/PostProcesses/screenSpaceReflectionPostProcess.js")) : Promise.resolve(null),
                            data.default && !defaultRenderingPipelineRef ? Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! @babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline */ "./node_modules/@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline.js")) : Promise.resolve(null),
                            ((_f = (_e = (_d = data.default) === null || _d === void 0 ? void 0 : _d.json) === null || _e === void 0 ? void 0 : _e.imageProcessing) === null || _f === void 0 ? void 0 : _f.colorCurves) ? Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! @babylonjs/core/Materials/colorCurves */ "./node_modules/@babylonjs/core/Materials/colorCurves.js")) : Promise.resolve(null),
                            ((_j = (_h = (_g = data.default) === null || _g === void 0 ? void 0 : _g.json) === null || _h === void 0 ? void 0 : _h.imageProcessing) === null || _j === void 0 ? void 0 : _j.colorGradingTexture) ? Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! @babylonjs/core/Materials/Textures/colorGradingTexture */ "./node_modules/@babylonjs/core/Materials/Textures/colorGradingTexture.js")) : Promise.resolve(null),
                            ((_k = data.motionBlur) === null || _k === void 0 ? void 0 : _k.json) ? Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! @babylonjs/core/PostProcesses/motionBlurPostProcess */ "./node_modules/@babylonjs/core/PostProcesses/motionBlurPostProcess.js")) : Promise.resolve(null),
                        ])];
                case 1:
                    _a = _q.sent(), ssaoModule = _a[0], ssrModule = _a[1], defaultPipelineModule = _a[2], colorCurvesModule = _a[3], colorGradingModule = _a[4], motionBlurModule = _a[5];
                    if (data.ssao && !ssao2RenderingPipelineRef) {
                        SSAO2RenderingPipeline_1 = ssaoModule === null || ssaoModule === void 0 ? void 0 : ssaoModule.SSAO2RenderingPipeline;
                        if (!SSAO2RenderingPipeline_1) {
                            return [2 /*return*/];
                        }
                        ssao2RenderingPipelineRef = SSAO2RenderingPipeline_1.Parse(data.ssao.json, scene, rootUrl);
                        if (data.ssao.enabled) {
                            scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(ssao2RenderingPipelineRef.name, scene.cameras);
                        }
                    }
                    if (((_l = data.screenSpaceReflections) === null || _l === void 0 ? void 0 : _l.json) && !screenSpaceReflectionPostProcessRef) {
                        ScreenSpaceReflectionPostProcess_1 = ssrModule === null || ssrModule === void 0 ? void 0 : ssrModule.ScreenSpaceReflectionPostProcess;
                        if (!ScreenSpaceReflectionPostProcess_1) {
                            return [2 /*return*/];
                        }
                        screenSpaceReflectionPostProcessRef = new ScreenSpaceReflectionPostProcess_1("ssr", scene, 1.0, scene.activeCamera);
                        screenSpaceReflectionPostProcessRef.step = data.screenSpaceReflections.json.step;
                        screenSpaceReflectionPostProcessRef.strength = data.screenSpaceReflections.json.strength;
                        screenSpaceReflectionPostProcessRef.threshold = data.screenSpaceReflections.json.threshold;
                        screenSpaceReflectionPostProcessRef.smoothSteps = data.screenSpaceReflections.json.smoothSteps;
                        screenSpaceReflectionPostProcessRef.roughnessFactor = data.screenSpaceReflections.json.roughnessFactor;
                        screenSpaceReflectionPostProcessRef.reflectionSamples = data.screenSpaceReflections.json.reflectionSamples;
                        screenSpaceReflectionPostProcessRef.enableSmoothReflections = data.screenSpaceReflections.json.enableSmoothReflections;
                    }
                    if (data.default && !defaultRenderingPipelineRef) {
                        DefaultRenderingPipeline_1 = defaultPipelineModule === null || defaultPipelineModule === void 0 ? void 0 : defaultPipelineModule.DefaultRenderingPipeline;
                        if (!DefaultRenderingPipeline_1) {
                            return [2 /*return*/];
                        }
                        defaultRenderingPipelineRef = new DefaultRenderingPipeline_1(data.default.json.name, true, scene);
                        defaultRenderingPipelineRef.fxaaEnabled = data.default.json.fxaa.enabled;
                        // Image processing
                        defaultRenderingPipelineRef.imageProcessingEnabled = data.default.json.imageProcessing.enabled;
                        defaultRenderingPipelineRef.imageProcessing.exposure = data.default.json.imageProcessing.exposure;
                        defaultRenderingPipelineRef.imageProcessing.contrast = data.default.json.imageProcessing.contrast;
                        defaultRenderingPipelineRef.imageProcessing.fromLinearSpace = data.default.json.imageProcessing.fromLinearSpace;
                        defaultRenderingPipelineRef.imageProcessing.toneMappingEnabled = data.default.json.imageProcessing.toneMappingEnabled;
                        defaultRenderingPipelineRef.imageProcessing.toneMappingType = data.default.json.imageProcessing.toneMappingType;
                        defaultRenderingPipelineRef.imageProcessing.colorCurvesEnabled = (_m = data.default.json.imageProcessing.colorCurvesEnabled) !== null && _m !== void 0 ? _m : defaultRenderingPipelineRef.imageProcessing.colorCurvesEnabled;
                        defaultRenderingPipelineRef.imageProcessing.colorGradingEnabled = (_o = data.default.json.imageProcessing.colorGradingEnabled) !== null && _o !== void 0 ? _o : defaultRenderingPipelineRef.imageProcessing.colorGradingEnabled;
                        if (data.default.json.imageProcessing.colorCurves) {
                            ColorCurves = colorCurvesModule === null || colorCurvesModule === void 0 ? void 0 : colorCurvesModule.ColorCurves;
                            if (!ColorCurves) {
                                return [2 /*return*/];
                            }
                            defaultRenderingPipelineRef.imageProcessing.colorCurves = ColorCurves.Parse(data.default.json.imageProcessing.colorCurves);
                        }
                        if (data.default.json.imageProcessing.colorGradingTexture) {
                            ColorGradingTexture = colorGradingModule === null || colorGradingModule === void 0 ? void 0 : colorGradingModule.ColorGradingTexture;
                            if (!ColorGradingTexture) {
                                return [2 /*return*/];
                            }
                            data.default.json.imageProcessing.colorGradingTexture.name = rootUrl + data.default.json.imageProcessing.colorGradingTexture.name;
                            defaultRenderingPipelineRef.imageProcessing.colorGradingTexture = ColorGradingTexture.Parse(data.default.json.imageProcessing.colorGradingTexture, scene);
                        }
                        // Vignette
                        defaultRenderingPipelineRef.imageProcessing.vignetteEnabled = data.default.json.vignette.enabled;
                        defaultRenderingPipelineRef.imageProcessing.vignetteWeight = data.default.json.vignette.vignetteWeight;
                        defaultRenderingPipelineRef.imageProcessing.vignetteBlendMode = data.default.json.vignette.vignetteBlendMode;
                        defaultRenderingPipelineRef.imageProcessing.vignetteColor = _babylonjs_core_Maths_math_color__WEBPACK_IMPORTED_MODULE_4__.Color4.FromArray(data.default.json.vignette.vignetteColor);
                        // Sharpen
                        defaultRenderingPipelineRef.sharpenEnabled = data.default.json.sharpen.enabled;
                        defaultRenderingPipelineRef.sharpen.edgeAmount = data.default.json.sharpen.edgeAmount;
                        defaultRenderingPipelineRef.sharpen.colorAmount = data.default.json.sharpen.colorAmount;
                        // Bloom
                        defaultRenderingPipelineRef.bloomEnabled = data.default.json.bloom.enabled;
                        defaultRenderingPipelineRef.bloomScale = data.default.json.bloom.bloomScale;
                        defaultRenderingPipelineRef.bloomWeight = data.default.json.bloom.bloomWeight;
                        defaultRenderingPipelineRef.bloomKernel = data.default.json.bloom.bloomKernel;
                        defaultRenderingPipelineRef.bloomThreshold = data.default.json.bloom.bloomThreshold;
                        // Depth of field
                        defaultRenderingPipelineRef.depthOfFieldEnabled = data.default.json.depthOfField.enabled;
                        defaultRenderingPipelineRef.depthOfField.fStop = data.default.json.depthOfField.fStop;
                        defaultRenderingPipelineRef.depthOfField.focalLength = data.default.json.depthOfField.focalLength;
                        defaultRenderingPipelineRef.depthOfField.focusDistance = data.default.json.depthOfField.focusDistance;
                        defaultRenderingPipelineRef.depthOfFieldBlurLevel = data.default.json.depthOfField.depthOfFieldBlurLevel;
                        // Chromatic aberration
                        defaultRenderingPipelineRef.chromaticAberrationEnabled = data.default.json.chromaticAberration.enabled;
                        defaultRenderingPipelineRef.chromaticAberration.aberrationAmount = data.default.json.chromaticAberration.aberrationAmount;
                        defaultRenderingPipelineRef.chromaticAberration.radialIntensity = data.default.json.chromaticAberration.radialIntensity;
                        defaultRenderingPipelineRef.chromaticAberration.direction = _babylonjs_core_Maths_math_vector__WEBPACK_IMPORTED_MODULE_10__.Vector2.FromArray(data.default.json.chromaticAberration.direction);
                        defaultRenderingPipelineRef.chromaticAberration.centerPosition = _babylonjs_core_Maths_math_vector__WEBPACK_IMPORTED_MODULE_10__.Vector2.FromArray(data.default.json.chromaticAberration.centerPosition);
                        // Grain
                        defaultRenderingPipelineRef.grainEnabled = data.default.json.grain.enabled;
                        defaultRenderingPipelineRef.grain.animated = data.default.json.grain.animated;
                        defaultRenderingPipelineRef.grain.intensity = data.default.json.grain.intensity;
                        // Glow
                        defaultRenderingPipelineRef.glowLayerEnabled = data.default.json.glowLayer.enabled;
                        if (defaultRenderingPipelineRef.glowLayer) {
                            defaultRenderingPipelineRef.glowLayer.intensity = data.default.json.glowLayer.intensity;
                            defaultRenderingPipelineRef.glowLayer.blurKernelSize = data.default.json.glowLayer.blurKernelSize;
                        }
                        if (!data.default.enabled) {
                            scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(defaultRenderingPipelineRef.name, scene.cameras);
                        }
                    }
                    if ((_p = data.motionBlur) === null || _p === void 0 ? void 0 : _p.json) {
                        MotionBlurPostProcess_1 = motionBlurModule === null || motionBlurModule === void 0 ? void 0 : motionBlurModule.MotionBlurPostProcess;
                        if (!MotionBlurPostProcess_1) {
                            return [2 /*return*/];
                        }
                        motionBlurPostProcessRef = new MotionBlurPostProcess_1(data.motionBlur.json.name, scene, 1.0, scene.activeCamera);
                        motionBlurPostProcessRef.isObjectBased = data.motionBlur.json.isObjectBased;
                        motionBlurPostProcessRef.motionStrength = data.motionBlur.json.motionStrength;
                        motionBlurPostProcessRef.motionBlurSamples = data.motionBlur.json.motionBlurSamples;
                    }
                    scene.onDisposeObservable.addOnce(function () {
                        ssao2RenderingPipelineRef = null;
                        screenSpaceReflectionPostProcessRef = null;
                        defaultRenderingPipelineRef = null;
                        motionBlurPostProcessRef = null;
                    });
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Overrides the texture parser.
 */
(function overrideTextureParser() {
    var textureParser = _babylonjs_core_Misc_decorators__WEBPACK_IMPORTED_MODULE_9__.SerializationHelper._TextureParser;
    _babylonjs_core_Misc_decorators__WEBPACK_IMPORTED_MODULE_9__.SerializationHelper._TextureParser = function (sourceProperty, scene, rootUrl) {
        var _a;
        if (sourceProperty.isCube && !sourceProperty.isRenderTarget && sourceProperty.files && ((_a = sourceProperty.metadata) === null || _a === void 0 ? void 0 : _a.isPureCube)) {
            sourceProperty.files.forEach(function (f, index) {
                sourceProperty.files[index] = rootUrl + f;
            });
        }
        var texture = textureParser.call(_babylonjs_core_Misc_decorators__WEBPACK_IMPORTED_MODULE_9__.SerializationHelper, sourceProperty, scene, rootUrl);
        if (sourceProperty.url && texture instanceof _babylonjs_core_Materials_Textures_texture__WEBPACK_IMPORTED_MODULE_8__.Texture) {
            texture.url = rootUrl + sourceProperty.url;
        }
        return texture;
    };
})();


/***/ },

/***/ "./src/scenes/trees.ts"
/*!*****************************!*\
  !*** ./src/scenes/trees.ts ***!
  \*****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   instantiateTrees: () => (/* binding */ instantiateTrees)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
// treeGenerator.ts

function instantiateTrees(_this) {
    var trunkMaterial = _this.scene.getMaterialByName("default material");
    var leafMaterial = _this.scene.getMaterialByName("Feuille.002");
    if (!trunkMaterial || !leafMaterial) {
        console.warn("Tree materials are missing from the scene.");
        return;
    }
    // Define the coordinates where the trees will be placed
    var treeCoordinates = [
        new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(78.3985, 5.1848, -11.2018),
        new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(47.5043, 5.1848, -36.9549),
        new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(-39.5430, 5.1848, -44.9435),
        new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(-54.0394, 5.1848, -22.0382),
        new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(57.1332, 5.1848, 77.0256),
    ];
    var treeTemplates = createTreeTemplates(20, 15, 5, trunkMaterial, leafMaterial, _this.scene);
    if (!treeTemplates) {
        return;
    }
    treeCoordinates.forEach(function (position, index) {
        instantiateTree(treeTemplates, position, index, _this.scene);
    });
}
function createTreeTemplates(sizeBranch, sizeTrunk, radius, trunkMaterial, leafMaterial, scene) {
    var leaves = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("tree-leaves", { segments: 2, diameter: sizeBranch }, scene);
    var positions = leaves.getVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.PositionKind);
    var indices = leaves.getIndices();
    if (!positions || !indices) {
        console.error("Failed to retrieve vertices data or indices.");
        return null;
    }
    var numberOfPoints = positions.length / 3;
    var pointMap = [];
    for (var i = 0; i < numberOfPoints; i++) {
        var p = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        var found = false;
        for (var index = 0; index < pointMap.length && !found; index++) {
            var current = pointMap[index];
            if (current.point.equals(p) || current.point.subtract(p).lengthSquared() < 0.01) {
                current.indices.push(i * 3);
                found = true;
            }
        }
        if (!found) {
            pointMap.push({ point: p, indices: [i * 3] });
        }
    }
    var randomNumber = function (min, max) {
        if (min === max)
            return min;
        var random = Math.random();
        return (random * (max - min)) + min;
    };
    pointMap.forEach(function (_a) {
        var indicesArray = _a.indices;
        var min = -sizeBranch / 10;
        var max = sizeBranch / 10;
        var rx = randomNumber(min, max);
        var ry = randomNumber(min, max);
        var rz = randomNumber(min, max);
        indicesArray.forEach(function (i) {
            if (i + 2 < positions.length) {
                positions[i] += rx;
                positions[i + 1] += ry;
                positions[i + 2] += rz;
            }
        });
    });
    leaves.setVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.PositionKind, positions);
    var normals = [];
    _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexData.ComputeNormals(positions, indices, normals);
    leaves.setVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.NormalKind, normals);
    leaves.convertToFlatShadedMesh();
    leaves.material = leafMaterial;
    leaves.isPickable = false;
    var trunk = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("tree-trunk", {
        height: sizeTrunk,
        diameterTop: Math.max(radius - 2, 1),
        diameterBottom: radius,
        tessellation: 10,
        subdivisions: 2
    }, scene);
    trunk.material = trunkMaterial;
    trunk.convertToFlatShadedMesh();
    trunk.isPickable = false;
    leaves.position.y = (sizeTrunk + sizeBranch) / 2 - 2;
    return { leaves: leaves, trunk: trunk };
}
function instantiateTree(templates, position, index, scene) {
    var tree = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("tree-".concat(index), scene);
    tree.position.copyFrom(position);
    var leaves = index === 0 ? templates.leaves : templates.leaves.createInstance("tree-leaves-".concat(index));
    var trunk = index === 0 ? templates.trunk : templates.trunk.clone("tree-trunk-".concat(index));
    if (!trunk) {
        console.error("Failed to create trunk mesh for tree ".concat(index));
        return;
    }
    leaves.parent = tree;
    trunk.parent = tree;
    leaves.computeWorldMatrix(true);
    trunk.computeWorldMatrix(true);
    trunk.physicsImpostor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor(trunk, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0 }, scene);
}


/***/ }

}]);
//# sourceMappingURL=src_scenes_tools_ts.b45ebbb27e21842f73f1.js.map