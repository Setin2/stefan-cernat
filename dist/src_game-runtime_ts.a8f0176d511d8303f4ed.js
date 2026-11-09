/*! babylonjs-editor-generated-template 4.1.0 Fri Nov 06 2026 16:51:45 GMT+0100 (Central European Standard Time) */
"use strict";
(self["webpackChunkgame"] = self["webpackChunkgame"] || []).push([["src_game-runtime_ts"],{

/***/ "./src/engine-config.ts"
/*!******************************!*\
  !*** ./src/engine-config.ts ***!
  \******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   configureEngine: () => (/* binding */ configureEngine),
/* harmony export */   hideDeprecatedRendererInfo: () => (/* binding */ hideDeprecatedRendererInfo),
/* harmony export */   projectConfiguration: () => (/* binding */ projectConfiguration)
/* harmony export */ });
var projectConfiguration = {
    compressedTextures: {
        supportedFormats: [],
    },
};
/**
 * Configures the engine according to the current project configuration.
 */
function configureEngine(engine) {
    if (projectConfiguration.compressedTextures.supportedFormats.length) {
        engine.setTextureFormatToUse(projectConfiguration.compressedTextures.supportedFormats);
    }
}
/**
 * Babylon asks for the WEBGL_debug_renderer_info extension at startup to read the GPU's name,
 * which Firefox deprecates (with a console warning) because its standard RENDERER and VENDOR
 * parameters now give the same information. In Firefox the extension is hidden from the page, so
 * Babylon falls back to those parameters. Other browsers are left alone.
 */
function hideDeprecatedRendererInfo() {
    if (!navigator.userAgent.includes("Firefox")) {
        return;
    }
    var _loop_1 = function (context) {
        var prototype = context === null || context === void 0 ? void 0 : context.prototype;
        if (!prototype) {
            return "continue";
        }
        var getExtension = prototype.getExtension;
        prototype.getExtension = function (name) {
            return name === "WEBGL_debug_renderer_info" ? null : getExtension.call(this, name);
        };
    };
    for (var _i = 0, _a = [window.WebGLRenderingContext, window.WebGL2RenderingContext]; _i < _a.length; _i++) {
        var context = _a[_i];
        _loop_1(context);
    }
}


/***/ },

/***/ "./src/game-runtime.ts"
/*!*****************************!*\
  !*** ./src/game-runtime.ts ***!
  \*****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GameRuntime: () => (/* binding */ GameRuntime)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _engine_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./engine-config */ "./src/engine-config.ts");
/* harmony import */ var _scenes_core_warmUp__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./scenes/core/warmUp */ "./src/scenes/core/warmUp.ts");
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



var GameRuntime = /** @class */ (function () {
    function GameRuntime() {
        var _this = this;
        this.sceneReady = false;
        this.renderScene = function () { return _this.scene.render(); };
        this._handleResize = function () {
            _this.engine.resize();
        };
        this._handleVisibilityChange = function () {
            _this._syncRenderLoop();
        };
        this._handleRetryClick = function () {
            window.location.reload();
        };
        this._handleBeforeUnload = function () {
            var _a;
            window.removeEventListener("resize", _this._handleResize);
            document.removeEventListener("visibilitychange", _this._handleVisibilityChange);
            window.removeEventListener("beforeunload", _this._handleBeforeUnload);
            (_a = _this.statusRetryButton) === null || _a === void 0 ? void 0 : _a.removeEventListener("click", _this._handleRetryClick);
            _this.engine.stopRenderLoop(_this.renderScene);
            _this.scene.dispose();
            _this.engine.dispose();
        };
        var canvas = document.getElementById("renderCanvas");
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error("Missing #renderCanvas element.");
        }
        this.statusOverlay = document.getElementById("statusOverlay");
        this.statusTitle = document.getElementById("statusTitle");
        this.statusMessage = document.getElementById("statusMessage");
        this.statusRetryButton = document.getElementById("statusRetryButton");
        (0,_engine_config__WEBPACK_IMPORTED_MODULE_1__.hideDeprecatedRendererInfo)();
        this.engine = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Engine(canvas, true);
        (0,_engine_config__WEBPACK_IMPORTED_MODULE_1__.configureEngine)(this.engine);
        this.scene = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Scene(this.engine);
        this._setStatus("Loading scene", this._getInitialStatusMessage());
        this._bindEvents();
        void this._loadScene();
    }
    GameRuntime.prototype._loadScene = function () {
        return __awaiter(this, void 0, void 0, function () {
            var rootUrl, _a, CANNON, appendScene, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        rootUrl = "./scenes/_assets/";
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 5, , 6]);
                        this._hideRetryAction();
                        return [4 /*yield*/, Promise.all([
                                __webpack_require__.e(/*! import() */ "vendors-node_modules_cannon_build_cannon_js").then(__webpack_require__.t.bind(__webpack_require__, /*! cannon */ "./node_modules/cannon/build/cannon.js", 23)),
                                __webpack_require__.e(/*! import() */ "src_scenes_tools_ts").then(__webpack_require__.bind(__webpack_require__, /*! ./scenes/tools */ "./src/scenes/tools.ts")),
                            ])];
                    case 2:
                        _a = _b.sent(), CANNON = _a[0], appendScene = _a[1].appendScene;
                        _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.BabylonFileLoaderConfiguration.LoaderInjectedPhysicsEngine = CANNON;
                        return [4 /*yield*/, appendScene(this.scene, rootUrl, "../scene/scene.babylon")];
                    case 3:
                        _b.sent();
                        if (!this.scene.activeCamera) {
                            throw new Error("No camera defined in the scene. Please add at least one camera in the project or create one yourself in the code.");
                        }
                        this.scene.activeCamera.attachControl(this.engine.getRenderingCanvas(), false);
                        // Compile all shaders now, so nothing stutters the first time it comes into view.
                        return [4 /*yield*/, (0,_scenes_core_warmUp__WEBPACK_IMPORTED_MODULE_2__.warmUpShaders)(this.scene)];
                    case 4:
                        // Compile all shaders now, so nothing stutters the first time it comes into view.
                        _b.sent();
                        this.sceneReady = true;
                        this._hideStatus();
                        this._syncRenderLoop();
                        return [3 /*break*/, 6];
                    case 5:
                        error_1 = _b.sent();
                        console.error("Failed to finish scene initialization", error_1);
                        this._setStatus("Scene failed to load", "Refresh the page to try again. If the problem persists, check the browser console for details.", true);
                        this._showRetryAction();
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    GameRuntime.prototype._setStatus = function (title, message, isError) {
        var _a, _b;
        if (isError === void 0) { isError = false; }
        (_a = this.statusTitle) === null || _a === void 0 ? void 0 : _a.replaceChildren(title);
        (_b = this.statusMessage) === null || _b === void 0 ? void 0 : _b.replaceChildren(message);
        if (this.statusOverlay) {
            this.statusOverlay.hidden = false;
            this.statusOverlay.dataset.state = isError ? "error" : "loading";
        }
    };
    GameRuntime.prototype._hideStatus = function () {
        if (this.statusOverlay) {
            this.statusOverlay.hidden = true;
            delete this.statusOverlay.dataset.state;
        }
        this._hideRetryAction();
    };
    GameRuntime.prototype._getInitialStatusMessage = function () {
        if (window.matchMedia("(pointer: coarse)").matches) {
            return "Loading assets. This scene is built around keyboard controls, so desktop works best.";
        }
        return "Loading assets and interactive scene data.";
    };
    GameRuntime.prototype._syncRenderLoop = function () {
        this.engine.stopRenderLoop(this.renderScene);
        if (!this.sceneReady || document.hidden) {
            return;
        }
        this.engine.runRenderLoop(this.renderScene);
    };
    GameRuntime.prototype._bindEvents = function () {
        var _a;
        window.addEventListener("resize", this._handleResize);
        document.addEventListener("visibilitychange", this._handleVisibilityChange);
        window.addEventListener("beforeunload", this._handleBeforeUnload);
        (_a = this.statusRetryButton) === null || _a === void 0 ? void 0 : _a.addEventListener("click", this._handleRetryClick);
    };
    GameRuntime.prototype._showRetryAction = function () {
        if (this.statusRetryButton) {
            this.statusRetryButton.hidden = false;
        }
    };
    GameRuntime.prototype._hideRetryAction = function () {
        if (this.statusRetryButton) {
            this.statusRetryButton.hidden = true;
        }
    };
    return GameRuntime;
}());



/***/ },

/***/ "./src/scenes/core/warmUp.ts"
/*!***********************************!*\
  !*** ./src/scenes/core/warmUp.ts ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registerLoadingTask: () => (/* binding */ registerLoadingTask),
/* harmony export */   warmUpShaders: () => (/* binding */ warmUpShaders)
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
 * Compiles every shader the game will need while the loading screen is still up.
 *
 * Babylon compiles a material's shader the first time a mesh using it is drawn, which happens in
 * the middle of play: when something first comes into view, or a cloud first fades. On Windows
 * (where browsers translate shaders to Direct3D) each compile can freeze the game for a moment,
 * which showed up as stutter while driving around. Compiling them up front moves that cost into
 * the loading screen. Browsers that support it compile in parallel, so it adds little to loading.
 */
/** Gives up waiting after this long, rather than keep the loading screen up. */
var MAX_WAIT_MS = 10000;
var pending = [];
/** Things still being set up after the scene loads (e.g. the target HUD), to wait for first. */
function registerLoadingTask(task) {
    pending.push(task.catch(function () { return undefined; }));
}
function warmUpShaders(scene) {
    return __awaiter(this, void 0, void 0, function () {
        var tasks, casters, _i, _a, mesh, hasInstances, material, _loop_1, _b, _c, light;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, withTimeout(Promise.all(pending.splice(0)))];
                case 1:
                    _d.sent();
                    if (scene.isDisposed) {
                        return [2 /*return*/];
                    }
                    tasks = [];
                    casters = [];
                    for (_i = 0, _a = scene.meshes; _i < _a.length; _i++) {
                        mesh = _a[_i];
                        if (!(mesh instanceof _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh) || !mesh.isEnabled() || !mesh.material || mesh.getTotalVertices() === 0) {
                            continue;
                        }
                        hasInstances = mesh.instances.length > 0 || mesh.hasThinInstances;
                        if (!mesh.isVisible && !hasInstances) {
                            continue;
                        }
                        casters.push(mesh);
                        material = mesh.material;
                        // Babylon can't compile these up front correctly (per-instance attributes like the tread
                        // prints' fading colours are left out), so they compile when first drawn, as before.
                        if (material instanceof _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MultiMaterial || hasPerInstanceAttributes(mesh)) {
                            continue;
                        }
                        tasks.push(material.forceCompilationAsync(mesh, { useInstances: mesh.instances.length > 0 }).catch(function () { return undefined; }));
                    }
                    _loop_1 = function (light) {
                        var generator = light.getShadowGenerator();
                        var shadowMap = generator === null || generator === void 0 ? void 0 : generator.getShadowMap();
                        if (!generator || !shadowMap) {
                            return "continue";
                        }
                        var renderList = shadowMap.renderList;
                        shadowMap.renderList = casters;
                        tasks.push(generator.forceCompilationAsync().catch(function () { return undefined; }).then(function () {
                            shadowMap.renderList = renderList;
                        }));
                    };
                    // The shadow map's own (depth) shaders, for everything that may cast a shadow at some point.
                    for (_b = 0, _c = scene.lights; _b < _c.length; _b++) {
                        light = _c[_b];
                        _loop_1(light);
                    }
                    return [4 /*yield*/, withTimeout(Promise.all(tasks))];
                case 2:
                    _d.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function hasPerInstanceAttributes(mesh) {
    var _a, _b;
    var thinInstanceBuffers = (_a = mesh._userThinInstanceBuffersStorage) === null || _a === void 0 ? void 0 : _a.data;
    return Object.keys((_b = mesh.instancedBuffers) !== null && _b !== void 0 ? _b : {}).length > 0 || Object.keys(thinInstanceBuffers !== null && thinInstanceBuffers !== void 0 ? thinInstanceBuffers : {}).length > 0;
}
function withTimeout(task) {
    return Promise.race([task, new Promise(function (resolve) { return setTimeout(resolve, MAX_WAIT_MS); })]);
}


/***/ }

}]);
//# sourceMappingURL=src_game-runtime_ts.a8f0176d511d8303f4ed.js.map