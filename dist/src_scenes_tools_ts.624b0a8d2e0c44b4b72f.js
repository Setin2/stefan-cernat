/*! babylonjs-editor-generated-template 4.1.0 Fri Nov 06 2026 16:51:45 GMT+0100 (Central European Standard Time) */
"use strict";
(self["webpackChunkgame"] = self["webpackChunkgame"] || []).push([["src_scenes_tools_ts"],{

/***/ "./src/scenes/audio/engineSound.ts"
/*!*****************************************!*\
  !*** ./src/scenes/audio/engineSound.ts ***!
  \*****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createEngineSound: () => (/* binding */ createEngineSound)
/* harmony export */ });
/* harmony import */ var _core_math__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../core/math */ "./src/scenes/core/math.ts");

/**
 * The tank's motor: a little "putt-putt" toy engine (two detuned low oscillators, muffled and
 * pulsed) plus the rattle of the treads (filtered noise pulsing with the track cleats). Both
 * follow how fast the tank drives and turns, and fade out when it stops. It plays quietly in the
 * background, on the ambience channel that dips whenever a hit or shot plays (see SoundBoard).
 */
var MAX_SPEED = 38;
var MAX_TURN_SPEED = 4.2;
var VOLUME = 0.055;
function createEngineSound(sounds) {
    var nodes = null;
    sounds.whenReady(function () {
        var output = sounds.getOutput();
        if (output) {
            nodes = buildEngine(output.context, output.ambience, output.noise);
        }
    });
    var level = 0;
    return {
        update: function (forwardSpeed, turnSpeed, airborne) {
            if (!nodes) {
                return;
            }
            var drive = Math.abs(forwardSpeed) / MAX_SPEED;
            var turn = Math.abs(turnSpeed) / MAX_TURN_SPEED;
            var target = (0,_core_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(Math.max(drive, turn * 0.55), 0, 1);
            // Rev up quickly, wind down a little slower.
            level += (target - level) * (target > level ? 0.12 : 0.06);
            var time = nodes.context.currentTime;
            var rev = level + (airborne ? 0.25 : 0);
            nodes.output.gain.setTargetAtTime(VOLUME * Math.pow(level, 0.8), time, 0.05);
            nodes.low.frequency.setTargetAtTime(48 + (rev * 40), time, 0.08);
            nodes.high.frequency.setTargetAtTime(73 + (rev * 62), time, 0.08);
            nodes.pulse.frequency.setTargetAtTime(9 + (rev * 15), time, 0.08);
            nodes.muffle.frequency.setTargetAtTime(300 + (rev * 320), time, 0.08);
            // The treads only rattle on the ground.
            nodes.treadGain.gain.setTargetAtTime(airborne ? 0 : 0.3 * Math.min(1, drive + (turn * 0.4)), time, 0.06);
            nodes.cleats.frequency.setTargetAtTime(4 + (drive * 22), time, 0.08);
        },
    };
}
function buildEngine(context, bus, noise) {
    var output = context.createGain();
    output.gain.value = 0;
    output.connect(bus);
    // Motor: two detuned oscillators, low-passed and pulsed by an LFO ("putt-putt").
    var muffle = context.createBiquadFilter();
    muffle.type = "lowpass";
    muffle.Q.value = 0.9;
    var motor = context.createGain();
    motor.gain.value = 0.55;
    muffle.connect(motor);
    motor.connect(output);
    var low = context.createOscillator();
    low.type = "sawtooth";
    var high = context.createOscillator();
    high.type = "square";
    var highGain = context.createGain();
    highGain.gain.value = 0.22;
    low.connect(muffle);
    high.connect(highGain);
    highGain.connect(muffle);
    var pulse = context.createOscillator();
    pulse.type = "sine";
    var pulseDepth = context.createGain();
    pulseDepth.gain.value = 0.4;
    pulse.connect(pulseDepth);
    pulseDepth.connect(motor.gain);
    // Treads: band-passed noise, pulsed at the rate the cleats pass.
    var tread = context.createBufferSource();
    tread.buffer = noise;
    tread.loop = true;
    var treadFilter = context.createBiquadFilter();
    treadFilter.type = "bandpass";
    treadFilter.frequency.value = 1100;
    treadFilter.Q.value = 0.9;
    var treadGain = context.createGain();
    treadGain.gain.value = 0;
    var treadPulse = context.createGain();
    treadPulse.gain.value = 0.5;
    var cleats = context.createOscillator();
    cleats.type = "square";
    var cleatDepth = context.createGain();
    cleatDepth.gain.value = 0.45;
    tread.connect(treadFilter);
    treadFilter.connect(treadPulse);
    treadPulse.connect(treadGain);
    treadGain.connect(output);
    cleats.connect(cleatDepth);
    cleatDepth.connect(treadPulse.gain);
    [low, high, pulse, cleats].forEach(function (oscillator) { return oscillator.start(); });
    tread.start();
    return { context: context, output: output, low: low, high: high, pulse: pulse, muffle: muffle, treadGain: treadGain, cleats: cleats };
}


/***/ },

/***/ "./src/scenes/audio/impactSounds.ts"
/*!******************************************!*\
  !*** ./src/scenes/audio/impactSounds.ts ***!
  \******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createImpactSounds: () => (/* binding */ createImpactSounds)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _soundMaterials__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./soundMaterials */ "./src/scenes/audio/soundMaterials.ts");


function createImpactSounds(scene, sounds, tank) {
    var _a, _b, _c;
    var position = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    var lastContact = null;
    // Both bodies get the event for the same contact, one right after the other: play it once.
    var onCollide = function (event) {
        var _a, _b;
        var contact = event.contact;
        if (contact === lastContact) {
            return;
        }
        lastContact = contact;
        var a = (_a = (0,_soundMaterials__WEBPACK_IMPORTED_MODULE_1__.getSoundMaterial)(contact.bi)) !== null && _a !== void 0 ? _a : "static";
        var b = (_b = (0,_soundMaterials__WEBPACK_IMPORTED_MODULE_1__.getSoundMaterial)(contact.bj)) !== null && _b !== void 0 ? _b : "static";
        position.set(contact.bi.position.x + contact.ri.x, contact.bi.position.y + contact.ri.y, contact.bi.position.z + contact.ri.z);
        sounds.impact(a, b, Math.abs(contact.getImpactVelocityAlongNormal()), position);
    };
    var listening = new WeakSet();
    var track = function (impostor, material) {
        var body = impostor === null || impostor === void 0 ? void 0 : impostor.physicsBody;
        if (!body) {
            return;
        }
        (0,_soundMaterials__WEBPACK_IMPORTED_MODULE_1__.setSoundMaterial)(body, material);
        // Scenery never moves into anything, so it only needs a material: whatever hits it plays.
        if (!(0,_soundMaterials__WEBPACK_IMPORTED_MODULE_1__.isSurface)(material) && !listening.has(body)) {
            listening.add(body);
            body.addEventListener("collide", onCollide);
        }
    };
    // Everything with a physics body in the scene so far, by what it is.
    var engine = scene.getPhysicsEngine();
    var ground = scene.getMeshByName("ground");
    track(ground && ((_a = ground.physicsImpostor) !== null && _a !== void 0 ? _a : engine === null || engine === void 0 ? void 0 : engine.getImpostorForPhysicsObject(ground)), "ground");
    track(tank.physicsImpostor, "tank");
    for (var _i = 0, _d = (_b = engine === null || engine === void 0 ? void 0 : engine.getImpostors()) !== null && _b !== void 0 ? _b : []; _i < _d.length; _i++) {
        var impostor = _d[_i];
        var name_1 = (_c = impostor.object.name) !== null && _c !== void 0 ? _c : "";
        var material = name_1.startsWith("brick") ? "brick"
            : name_1.startsWith("cone-") ? "cone"
                : name_1.endsWith("-collider") ? "trophy"
                    // Big props imported with the scene (the desk, the sword and symbol).
                    : impostor.mass === 0 && impostor.object !== ground ? "solid"
                        : null;
        if (material) {
            track(impostor, material);
        }
    }
    return { track: track };
}


/***/ },

/***/ "./src/scenes/audio/soundBoard.ts"
/*!****************************************!*\
  !*** ./src/scenes/audio/soundBoard.ts ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SoundBoard: () => (/* binding */ SoundBoard)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_math__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/math */ "./src/scenes/core/math.ts");
/* harmony import */ var _soundMaterials__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./soundMaterials */ "./src/scenes/audio/soundMaterials.ts");



/**
 * Every sound in the game, synthesised with the Web Audio API instead of loaded from files: toy
 * sounds built from a few oscillators and filtered noise. Each hit is shaped by how hard it was
 * (louder, brighter and longer), quieter the further it is from the tank, and panned left or
 * right with where it is on screen. Small random variations keep repeated hits from sounding
 * identical.
 *
 * Everything goes through Babylon's master volume, so the mute shortcut (M) still works. Browsers
 * only allow audio after the player interacts with the page, so nothing plays until the first
 * key press or click.
 */
/** Sounds further away than this can't be heard. */
var HEARING_DISTANCE = 190;
/** At most this many impact sounds at once, and this many new ones per burst window. */
var MAX_IMPACT_VOICES = 14;
var MAX_IMPACTS_PER_BURST = 5;
var BURST_WINDOW_SECONDS = 0.06;
/** Slower impacts than this are silent (resting contacts, gentle nudges). */
var MIN_IMPACT_SPEED = 1.5;
/** Loose objects settle onto the ground after loading; their first bumps stay silent. */
var SETTLE_SECONDS = 3;
/** The tank can be stopped by the physics and by its own checks in the same moment: play one bump. */
var TANK_BUMP_COOLDOWN_SECONDS = 0.3;
var SoundBoard = /** @class */ (function () {
    function SoundBoard(scene, tank, camera) {
        var _this = this;
        this.tank = tank;
        this.camera = camera;
        this.context = null;
        this.bus = null;
        /** Background sounds (the engine), turned down briefly whenever something else plays. */
        this.ambience = null;
        this.noise = null;
        this.activeImpacts = 0;
        this.burstStart = 0;
        this.burstCount = 0;
        this.listener = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3();
        this.listenerRight = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(1, 0, 0);
        this.onReady = [];
        this.quietUntil = performance.now() + (SETTLE_SECONDS * 1000);
        this.lastTankBump = 0;
        var audioEngine = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Engine.audioEngine;
        if (!audioEngine) {
            return;
        }
        // We unlock audio ourselves on the first key press or click instead of showing Babylon's
        // speaker button.
        audioEngine.useCustomUnlockedButton = true;
        // The context has to exist before Babylon can resume it.
        var unlock = function () {
            _this.ensureContext();
            audioEngine.unlock();
        };
        window.addEventListener("keydown", unlock);
        window.addEventListener("pointerdown", unlock);
        var observer = scene.onBeforeRenderObservable.add(function () {
            _this.listener.copyFrom(_this.tank.position);
            _this.camera.getDirectionToRef(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Axis.X, _this.listenerRight);
        });
        scene.onDisposeObservable.addOnce(function () {
            var _a;
            window.removeEventListener("keydown", unlock);
            window.removeEventListener("pointerdown", unlock);
            scene.onBeforeRenderObservable.remove(observer);
            (_a = _this.bus) === null || _a === void 0 ? void 0 : _a.disconnect();
        });
    }
    /** Runs `callback` once audio is available (right away if it already is). */
    SoundBoard.prototype.whenReady = function (callback) {
        if (this.isRunning()) {
            callback();
        }
        else {
            this.onReady.push(callback);
        }
    };
    /** The audio context and the bus every sound connects to, once audio is unlocked. */
    SoundBoard.prototype.getOutput = function () {
        return this.isRunning() && this.context && this.bus && this.ambience && this.noise
            ? { context: this.context, bus: this.bus, ambience: this.ambience, noise: this.noise }
            : null;
    };
    /** Dips the background sounds for a moment so a hit or shot stands out (`amount` 0 - 1). */
    SoundBoard.prototype.duck = function (amount) {
        var _a;
        var context = this.context;
        var gain = (_a = this.ambience) === null || _a === void 0 ? void 0 : _a.gain;
        if (!context || !gain) {
            return;
        }
        var time = context.currentTime;
        gain.cancelScheduledValues(time);
        gain.setTargetAtTime(Math.min(gain.value, 1 - (0.7 * (0,_core_math__WEBPACK_IMPORTED_MODULE_1__.clamp)(amount, 0, 1))), time, 0.01);
        gain.setTargetAtTime(1, time + 0.12, 0.18);
    };
    /**
     * Whether audio can play. Never creates the audio context itself: browsers only allow that
     * after the player interacts with the page (and warn otherwise), so only `unlock` does.
     */
    SoundBoard.prototype.isRunning = function () {
        var _a;
        return ((_a = this.context) === null || _a === void 0 ? void 0 : _a.state) === "running";
    };
    SoundBoard.prototype.ensureContext = function () {
        var _this = this;
        if (this.context) {
            return this.context.state === "running";
        }
        var audioEngine = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Engine.audioEngine;
        var context = audioEngine === null || audioEngine === void 0 ? void 0 : audioEngine.audioContext;
        if (!audioEngine || !context || !audioEngine.masterGain) {
            return false;
        }
        this.context = context;
        // A gentle compressor keeps a wall collapsing into many hits from clipping.
        var compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value = 12;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.15;
        this.bus = context.createGain();
        this.bus.gain.value = 0.9;
        this.bus.connect(compressor);
        compressor.connect(audioEngine.masterGain);
        this.ambience = context.createGain();
        this.ambience.connect(this.bus);
        this.noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
        var data = this.noise.getChannelData(0);
        for (var i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2) - 1;
        }
        var flush = function () {
            if (context.state === "running") {
                _this.onReady.splice(0).forEach(function (callback) { return callback(); });
            }
        };
        context.addEventListener("statechange", flush);
        flush();
        return context.state === "running";
    };
    // ----- Sounds ---------------------------------------------------------------------------
    /** The tank firing: a soft toy-cannon "thoomp" with a pop and a puff of air. */
    SoundBoard.prototype.shot = function () {
        var voice = this.createVoice(null, 1, 0.45);
        if (!voice) {
            return;
        }
        this.duck(1);
        var pitch = vary(0.06);
        this.tone(voice, { type: "sine", from: 165 * pitch, to: 46 * pitch, glide: 0.2, attack: 0.004, decay: 0.32, gain: 0.6 });
        this.tone(voice, { type: "triangle", from: 640 * pitch, to: 230 * pitch, glide: 0.05, attack: 0.002, decay: 0.07, gain: 0.13 });
        this.noiseBurst(voice, { filter: "bandpass", frequency: 1900, q: 0.8, attack: 0.001, decay: 0.06, gain: 0.32 });
        this.noiseBurst(voice, { filter: "lowpass", frequency: 650, q: 0.5, attack: 0.006, decay: 0.2, gain: 0.3 });
    };
    /** A link target hit: a cheerful two-note chime. */
    SoundBoard.prototype.chime = function (position) {
        var _this = this;
        var voice = this.createVoice(position, 1, 1.1);
        if (!voice) {
            return;
        }
        this.duck(0.8);
        [[880, 0], [1318.5, 0.09], [1760, 0.18]].forEach(function (_a, i) {
            var frequency = _a[0], delay = _a[1];
            _this.tone(voice, { type: "triangle", from: frequency, attack: 0.004, decay: 0.55 - (i * 0.1), gain: 0.16, delay: delay });
            _this.tone(voice, { type: "sine", from: frequency * 2, attack: 0.004, decay: 0.3, gain: 0.05, delay: delay });
        });
    };
    /**
     * The trading minigame: "buy" and "sell" are short arcade blips (rising and falling), "profit"
     * a cash-register bell, "loss" a sad slide down, "start" and "end" little fanfares.
     */
    SoundBoard.prototype.trade = function (kind, position) {
        var _this = this;
        var voice = this.createVoice(position, 1, 1.2);
        if (!voice) {
            return;
        }
        this.duck(0.7);
        switch (kind) {
            case "buy":
                this.tone(voice, { type: "square", from: 523, to: 784, glide: 0.08, attack: 0.003, decay: 0.16, gain: 0.07 });
                this.tone(voice, { type: "triangle", from: 1046, attack: 0.003, decay: 0.2, gain: 0.08, delay: 0.08 });
                break;
            case "sell":
                this.tone(voice, { type: "square", from: 784, to: 523, glide: 0.08, attack: 0.003, decay: 0.16, gain: 0.07 });
                this.tone(voice, { type: "triangle", from: 392, attack: 0.003, decay: 0.2, gain: 0.08, delay: 0.08 });
                break;
            case "profit":
                this.noiseBurst(voice, { filter: "highpass", frequency: 3000, q: 0.7, attack: 0.001, decay: 0.05, gain: 0.2 });
                [[1568, 0.05], [2093, 0.12]].forEach(function (_a) {
                    var frequency = _a[0], delay = _a[1];
                    _this.tone(voice, { type: "sine", from: frequency, attack: 0.002, decay: 0.7, gain: 0.12, delay: delay });
                    _this.tone(voice, { type: "triangle", from: frequency * 1.5, attack: 0.002, decay: 0.3, gain: 0.04, delay: delay });
                });
                break;
            case "loss":
                this.tone(voice, { type: "triangle", from: 330, to: 196, glide: 0.45, attack: 0.01, decay: 0.55, gain: 0.14 });
                break;
            case "start":
            case "end":
                (kind === "start" ? [[523, 0], [659, 0.1], [784, 0.2], [1046, 0.3]] : [[1046, 0], [784, 0.12], [880, 0.24], [1046, 0.36]]).forEach(function (_a) {
                    var frequency = _a[0], delay = _a[1];
                    _this.tone(voice, { type: "triangle", from: frequency, attack: 0.004, decay: 0.35, gain: 0.12, delay: delay });
                });
                break;
        }
    };
    /** The tank landing after a jump; `speed` is how fast it was falling. */
    SoundBoard.prototype.land = function (speed) {
        var strength = (0,_core_math__WEBPACK_IMPORTED_MODULE_1__.clamp)((speed - 4) / 22, 0, 1);
        if (strength <= 0) {
            return;
        }
        var voice = this.createVoice(null, 0.3 + (0.7 * strength), 0.4);
        if (!voice) {
            return;
        }
        this.duck(strength);
        this.tone(voice, { type: "sine", from: 95, to: 42, glide: 0.18, attack: 0.003, decay: 0.3, gain: 0.7 });
        this.noiseBurst(voice, { filter: "lowpass", frequency: 500, q: 0.7, attack: 0.002, decay: 0.16, gain: 0.35 });
        this.clank(voice, 0.5);
    };
    /**
     * Two bodies hitting each other at `speed` (along the contact normal), at `position`. The
     * sound depends on what they're made of: wooden blocks clack (and thud on the ground), shots
     * boing, cones tap, trophies clunk, and scenery answers with its own sound: trees knock and
     * rustle, bushes rustle, boulders crack, signs knock and wobble, ramps thump.
     */
    SoundBoard.prototype.impact = function (a, b, speed, position) {
        var has = function (material) { return a === material || b === material; };
        var other = function (material) { return (a === material ? b : a); };
        if (speed < MIN_IMPACT_SPEED || performance.now() < this.quietUntil || (has("tank") && other("tank") === "ground")) {
            return;
        }
        if (has("tank")) {
            var now = performance.now() / 1000;
            if (now - this.lastTankBump < TANK_BUMP_COOLDOWN_SECONDS) {
                return;
            }
            this.lastTankBump = now;
        }
        var strength = Math.pow((0,_core_math__WEBPACK_IMPORTED_MODULE_1__.clamp)((speed - MIN_IMPACT_SPEED) / 22, 0, 1), 0.7);
        if (!this.allowImpact()) {
            return;
        }
        // Leaves keep rustling for a while after the hit.
        var rustles = has("trunk") || has("bush");
        var voice = this.createVoice(position, 0.15 + (0.85 * strength), rustles ? 0.9 : 0.35, true);
        if (!voice) {
            return;
        }
        this.duck(strength * 0.8);
        // Whatever moved into the scenery makes its own sound, and the scenery answers.
        var _a = (0,_soundMaterials__WEBPACK_IMPORTED_MODULE_2__.isSurface)(a) ? [b, a] : [a, b], mover = _a[0], target = _a[1];
        var surface = (0,_soundMaterials__WEBPACK_IMPORTED_MODULE_2__.isSurface)(target) ? target : null;
        switch (mover) {
            case "ball":
                this.rubber(voice, strength);
                break;
            case "brick":
                this.wood(voice, strength, surface !== null);
                break;
            case "cone":
                this.plastic(voice, strength);
                break;
            case "trophy":
                this.trophy(voice, strength);
                break;
            case "tank":
                // The tank's tin body rattles on every hit.
                this.clank(voice, strength * 0.5);
                break;
        }
        if (surface && surface !== "ground") {
            // (The ground has no sound of its own: each loose thing already sounds right on it.)
            // A ball or a brick is lighter than the tank: the scenery answers more quietly.
            this.surface(voice, surface, mover === "tank" ? strength : strength * 0.55);
        }
        else if (target !== mover) {
            // Two loose things: the one that was hit sounds too (a shot hitting a brick, the tank
            // shoving a cone).
            switch (target) {
                case "brick":
                    this.wood(voice, strength * 0.7, false);
                    break;
                case "cone":
                    this.plastic(voice, strength * 0.7);
                    break;
                case "trophy":
                    this.trophy(voice, strength * 0.7);
                    break;
            }
        }
    };
    /** The sound a piece of scenery makes when it's hit. */
    SoundBoard.prototype.surface = function (voice, surface, strength) {
        switch (surface) {
            case "trunk":
                this.trunk(voice, strength);
                break;
            case "bush":
                this.bush(voice, strength);
                break;
            case "rock":
                this.rock(voice, strength);
                break;
            case "post":
                this.post(voice, strength);
                break;
            case "ramp":
                this.ramp(voice, strength);
                break;
            case "ground":
            case "solid":
            case "static":
                this.thud(voice, strength);
                break;
        }
    };
    // ----- Materials --------------------------------------------------------------------------
    /** A wooden toy block: a few inharmonic partials that die away fast, plus a click. */
    SoundBoard.prototype.wood = function (voice, strength, onGround) {
        var _this = this;
        var base = 430 * vary(0.18) * (1 + (strength * 0.15));
        var length = 0.6 + (strength * 0.6);
        [[1, 1, 0.1], [2.32, 0.45, 0.06], [4.25, 0.22, 0.035]].forEach(function (_a) {
            var ratio = _a[0], gain = _a[1], decay = _a[2];
            _this.tone(voice, { type: "sine", from: base * ratio, attack: 0.001, decay: decay * length, gain: gain * 0.45 * (onGround ? 0.6 : 1) });
        });
        this.noiseBurst(voice, { filter: "highpass", frequency: 2600, q: 0.7, attack: 0.0005, decay: 0.014, gain: 0.25 });
        if (onGround) {
            this.thud(voice, strength * 0.8);
        }
    };
    /** A rubber ball: a soft, low "boing". */
    SoundBoard.prototype.rubber = function (voice, strength) {
        var pitch = vary(0.1);
        this.tone(voice, { type: "sine", from: 210 * pitch, to: 135 * pitch, glide: 0.08, attack: 0.003, decay: 0.1 + (strength * 0.06), gain: 0.5 });
        this.noiseBurst(voice, { filter: "lowpass", frequency: 900, q: 0.6, attack: 0.001, decay: 0.03, gain: 0.15 });
    };
    /** A hollow plastic cone: a short, bright tap. */
    SoundBoard.prototype.plastic = function (voice, strength) {
        var base = 820 * vary(0.12);
        this.tone(voice, { type: "triangle", from: base, attack: 0.001, decay: 0.045 + (strength * 0.03), gain: 0.3 });
        this.tone(voice, { type: "sine", from: base * 1.93, attack: 0.001, decay: 0.03, gain: 0.12 });
        this.noiseBurst(voice, { filter: "bandpass", frequency: 3200, q: 1.2, attack: 0.0005, decay: 0.02, gain: 0.2 });
    };
    /** A heavy trophy on its plinth: a low clunk with a short ring. */
    SoundBoard.prototype.trophy = function (voice, strength) {
        var base = 290 * vary(0.08);
        this.tone(voice, { type: "sine", from: base, attack: 0.002, decay: 0.12 + (strength * 0.08), gain: 0.4 });
        this.tone(voice, { type: "sine", from: base * 2.71, attack: 0.002, decay: 0.08, gain: 0.14 });
        this.thud(voice, strength);
    };
    /** A tree trunk: a deep wooden knock, and the leaves above shaking. */
    SoundBoard.prototype.trunk = function (voice, strength) {
        var base = 150 * vary(0.1);
        this.tone(voice, { type: "sine", from: base, attack: 0.002, decay: 0.16 + (strength * 0.1), gain: 0.5 });
        this.tone(voice, { type: "sine", from: base * 2.63, attack: 0.002, decay: 0.08, gain: 0.2 });
        this.noiseBurst(voice, { filter: "bandpass", frequency: 900, q: 1.1, attack: 0.001, decay: 0.03, gain: 0.2 });
        this.thud(voice, strength * 0.7);
        this.rustle(voice, strength * 0.8, 0.06);
    };
    /** A bush: a soft, leafy rustle with a muffled bump. */
    SoundBoard.prototype.bush = function (voice, strength) {
        this.rustle(voice, strength * 1.3, 0);
        this.tone(voice, { type: "sine", from: 110 * vary(0.1), to: 70, glide: 0.1, attack: 0.01, decay: 0.15, gain: 0.25 });
    };
    /** A boulder: a hard, gritty crack over a heavy thud. */
    SoundBoard.prototype.rock = function (voice, strength) {
        var base = 720 * vary(0.12);
        this.tone(voice, { type: "triangle", from: base, attack: 0.0005, decay: 0.03, gain: 0.22 });
        this.tone(voice, { type: "sine", from: base * 2.3, attack: 0.0005, decay: 0.02, gain: 0.1 });
        this.noiseBurst(voice, { filter: "bandpass", frequency: 1600, q: 1, attack: 0.0005, decay: 0.05 + (strength * 0.03), gain: 0.35 });
        this.thud(voice, strength * 1.2);
    };
    /** A wooden sign post: a hollow plank knock, then the sign wobbling with a smaller knock. */
    SoundBoard.prototype.post = function (voice, strength) {
        var _this = this;
        var base = 240 * vary(0.1);
        [[0, 1], [0.07, 0.35], [0.13, 0.15]].forEach(function (_a) {
            var delay = _a[0], gain = _a[1];
            _this.tone(voice, { type: "sine", from: base, attack: 0.001, decay: 0.12, gain: 0.45 * gain, delay: delay });
            _this.tone(voice, { type: "sine", from: base * 2.55, attack: 0.001, decay: 0.06, gain: 0.2 * gain, delay: delay });
            _this.tone(voice, { type: "sine", from: base * 4.8, attack: 0.001, decay: 0.035, gain: 0.1 * gain, delay: delay });
        });
        this.noiseBurst(voice, { filter: "highpass", frequency: 2200, q: 0.7, attack: 0.0005, decay: 0.015, gain: 0.2 });
        this.thud(voice, strength * 0.5);
    };
    /** A ramp or platform: a hollow box thump. */
    SoundBoard.prototype.ramp = function (voice, strength) {
        var base = 130 * vary(0.08);
        this.tone(voice, { type: "sine", from: base, attack: 0.002, decay: 0.2 + (strength * 0.08), gain: 0.45 });
        this.tone(voice, { type: "triangle", from: base * 2.4, attack: 0.002, decay: 0.09, gain: 0.15 });
        this.noiseBurst(voice, { filter: "lowpass", frequency: 700, q: 0.8, attack: 0.001, decay: 0.1, gain: 0.25 });
    };
    /** Leaves shaking: two soft swells of high, filtered noise. */
    SoundBoard.prototype.rustle = function (voice, strength, delay) {
        var gain = 0.08 + (0.14 * (0,_core_math__WEBPACK_IMPORTED_MODULE_1__.clamp)(strength, 0, 1));
        this.noiseBurst(voice, { filter: "bandpass", frequency: 3800, q: 0.6, attack: 0.04, decay: 0.45, gain: gain, delay: delay });
        this.noiseBurst(voice, { filter: "bandpass", frequency: 2600, q: 0.7, attack: 0.05, decay: 0.35, gain: gain * 0.7, delay: delay + 0.14 });
    };
    /** Something heavy meeting the ground: a low, short thump. */
    SoundBoard.prototype.thud = function (voice, strength) {
        this.tone(voice, { type: "sine", from: 120 * vary(0.1), to: 55, glide: 0.1, attack: 0.002, decay: 0.12 + (strength * 0.1), gain: 0.5 });
        this.noiseBurst(voice, { filter: "lowpass", frequency: 380, q: 0.6, attack: 0.001, decay: 0.08, gain: 0.25 });
    };
    /** The tank's tin body rattling on a hit. */
    SoundBoard.prototype.clank = function (voice, strength) {
        var base = 340 * vary(0.1);
        this.tone(voice, { type: "square", from: base, attack: 0.001, decay: 0.06 + (strength * 0.05), gain: 0.05 });
        this.tone(voice, { type: "sine", from: base * 2.68, attack: 0.001, decay: 0.12, gain: 0.07 });
    };
    // ----- Building blocks --------------------------------------------------------------------
    /**
     * Output for one sound: gain (for distance) and stereo pan towards `position`, or centred and
     * at full volume when there's no position (the tank's own sounds).
     */
    SoundBoard.prototype.createVoice = function (position, volume, length, isImpact) {
        var _this = this;
        if (isImpact === void 0) { isImpact = false; }
        var output = this.getOutput();
        if (!output) {
            return null;
        }
        var context = output.context, bus = output.bus;
        var pan = 0;
        if (position) {
            var dx = position.x - this.listener.x;
            var dz = position.z - this.listener.z;
            var distance = Math.hypot(dx, dz);
            var falloff = Math.pow((0,_core_math__WEBPACK_IMPORTED_MODULE_1__.clamp)(1 - (distance / HEARING_DISTANCE), 0, 1), 1.6);
            if (falloff <= 0.01) {
                return null;
            }
            volume *= falloff;
            pan = (0,_core_math__WEBPACK_IMPORTED_MODULE_1__.clamp)(((dx * this.listenerRight.x) + (dz * this.listenerRight.z)) / 45, -0.75, 0.75);
        }
        var gain = context.createGain();
        gain.gain.value = volume;
        if (pan !== 0 && typeof context.createStereoPanner === "function") {
            var panner = context.createStereoPanner();
            panner.pan.value = pan;
            gain.connect(panner);
            panner.connect(bus);
        }
        else {
            gain.connect(bus);
        }
        if (isImpact) {
            this.activeImpacts++;
            setTimeout(function () {
                _this.activeImpacts--;
            }, (length + 0.6) * 1000);
        }
        setTimeout(function () { return gain.disconnect(); }, (length + 1) * 1000);
        return { output: gain };
    };
    /** Limits how many impacts sound at once and how many start together (a collapsing wall). */
    SoundBoard.prototype.allowImpact = function () {
        var context = this.context;
        if (!context || this.activeImpacts >= MAX_IMPACT_VOICES) {
            return false;
        }
        var now = context.currentTime;
        if (now - this.burstStart > BURST_WINDOW_SECONDS) {
            this.burstStart = now;
            this.burstCount = 0;
        }
        return ++this.burstCount <= MAX_IMPACTS_PER_BURST;
    };
    /** An oscillator with a quick attack and exponential decay, optionally gliding in pitch. */
    SoundBoard.prototype.tone = function (voice, options) {
        var _a, _b;
        var context = this.context;
        if (!context) {
            return;
        }
        var start = context.currentTime + ((_a = options.delay) !== null && _a !== void 0 ? _a : 0);
        var oscillator = context.createOscillator();
        oscillator.type = options.type;
        oscillator.frequency.setValueAtTime(options.from, start);
        if (options.to !== undefined) {
            oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.to), start + ((_b = options.glide) !== null && _b !== void 0 ? _b : options.decay));
        }
        var envelope = this.envelope(start, options.attack, options.decay, options.gain);
        oscillator.connect(envelope);
        envelope.connect(voice.output);
        oscillator.start(start);
        oscillator.stop(start + options.attack + options.decay + 0.05);
    };
    /** A burst of filtered white noise with a quick attack and exponential decay. */
    SoundBoard.prototype.noiseBurst = function (voice, options) {
        var _a;
        var context = this.context;
        if (!context || !this.noise) {
            return;
        }
        var start = context.currentTime + ((_a = options.delay) !== null && _a !== void 0 ? _a : 0);
        var source = context.createBufferSource();
        source.buffer = this.noise;
        // Start somewhere random in the buffer so bursts don't repeat exactly.
        var offset = Math.random() * (this.noise.duration - 0.5);
        var filter = context.createBiquadFilter();
        filter.type = options.filter;
        filter.frequency.value = options.frequency * vary(0.1);
        filter.Q.value = options.q;
        var envelope = this.envelope(start, options.attack, options.decay, options.gain);
        source.connect(filter);
        filter.connect(envelope);
        envelope.connect(voice.output);
        source.start(start, offset);
        source.stop(start + options.attack + options.decay + 0.05);
    };
    SoundBoard.prototype.envelope = function (start, attack, decay, peak) {
        var gain = this.context.createGain();
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
        return gain;
    };
    return SoundBoard;
}());

/** A random factor around 1 (e.g. 0.1 gives 0.9 - 1.1). */
function vary(amount) {
    return 1 + (((Math.random() * 2) - 1) * amount);
}


/***/ },

/***/ "./src/scenes/audio/soundMaterials.ts"
/*!********************************************!*\
  !*** ./src/scenes/audio/soundMaterials.ts ***!
  \********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getSoundMaterial: () => (/* binding */ getSoundMaterial),
/* harmony export */   isSurface: () => (/* binding */ isSurface),
/* harmony export */   setSoundMaterial: () => (/* binding */ setSoundMaterial)
/* harmony export */ });
/**
 * What each physics body sounds like when something hits it. Bodies register here when they're
 * created (see staticBodies.ts and impactSounds.ts); collision sounds look them up.
 */
var SURFACES = new Set(["ground", "trunk", "bush", "rock", "post", "ramp", "solid", "static"]);
function isSurface(material) {
    return SURFACES.has(material);
}
var materials = new WeakMap();
function setSoundMaterial(body, material) {
    materials.set(body, material);
}
function getSoundMaterial(body) {
    return materials.get(body);
}


/***/ },

/***/ "./src/scenes/core/constants.ts"
/*!**************************************!*\
  !*** ./src/scenes/core/constants.ts ***!
  \**************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FACE_CAMERA_YAW: () => (/* binding */ FACE_CAMERA_YAW),
/* harmony export */   GROUND_Y: () => (/* binding */ GROUND_Y)
/* harmony export */ });
/** World-wide constants shared by the scene builders. */
/** Height of the ground plane's surface. */
var GROUND_Y = -0.5;
/**
 * The fixed camera looks along (0.8, -0.6) in x/z. This yaw turns a mesh's local -Z (its front)
 * towards the camera, for signs and trophies that should face the player.
 */
var FACE_CAMERA_YAW = Math.atan2(0.8, -0.6);


/***/ },

/***/ "./src/scenes/core/math.ts"
/*!*********************************!*\
  !*** ./src/scenes/core/math.ts ***!
  \*********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   clamp: () => (/* binding */ clamp),
/* harmony export */   getYaw: () => (/* binding */ getYaw),
/* harmony export */   segmentDistanceSquared: () => (/* binding */ segmentDistanceSquared),
/* harmony export */   smoothStep: () => (/* binding */ smoothStep)
/* harmony export */ });
/** Small math helpers shared across the scene code. */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
/** Smooth 0..1 ramp between edge0 and edge1 (Hermite, like GLSL's smoothstep). */
function smoothStep(edge0, edge1, value) {
    var t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - (2 * t));
}
/** Rotation of a mesh around the world Y axis, whether it uses a quaternion or Euler angles. */
function getYaw(mesh) {
    return mesh.rotationQuaternion ? mesh.rotationQuaternion.toEulerAngles().y : mesh.rotation.y;
}
/** Squared distance from a point to the segment between start and end. */
function segmentDistanceSquared(start, end, point) {
    var sx = end.x - start.x;
    var sy = end.y - start.y;
    var sz = end.z - start.z;
    var lengthSquared = (sx * sx) + (sy * sy) + (sz * sz);
    var t = 0;
    if (lengthSquared > 0) {
        t = (((point.x - start.x) * sx) + ((point.y - start.y) * sy) + ((point.z - start.z) * sz)) / lengthSquared;
        t = clamp(t, 0, 1);
    }
    var dx = start.x + (sx * t) - point.x;
    var dy = start.y + (sy * t) - point.y;
    var dz = start.z + (sz * t) - point.z;
    return (dx * dx) + (dy * dy) + (dz * dz);
}


/***/ },

/***/ "./src/scenes/core/performance.ts"
/*!****************************************!*\
  !*** ./src/scenes/core/performance.ts ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   optimizeScene: () => (/* binding */ optimizeScene)
/* harmony export */ });
/** Meshes that move without a physics body of their own. */
var MOVING_MESHES = new Set(["tank", "tank_holder"]);
/**
 * Cheap wins for a scene that is never clicked and is mostly static: no pointer picking, and
 * every mesh that never moves gets its world matrix frozen. Builders can opt a mesh out with
 * `mesh.metadata = { keepUnfrozen: true }` (for meshes they animate by hand).
 *
 * Materials are not frozen: frozen materials bind the light and shadow data only once, so the
 * shadow map (which follows the camera) would never show up on them.
 */
function optimizeScene(scene, tank) {
    scene.getEngine().enableOfflineSupport = false;
    scene.blockMaterialDirtyMechanism = true;
    scene.collisionsEnabled = false;
    // The game is driven with the keyboard; mouse picking is never needed.
    scene.skipPointerMovePicking = true;
    scene.skipPointerDownPicking = true;
    scene.skipPointerUpPicking = true;
    scene.pointerMovePredicate = function () { return false; };
    scene.pointerDownPredicate = function () { return false; };
    scene.pointerUpPredicate = function () { return false; };
    scene.meshes
        .filter(function (mesh) { var _a; return !mesh.physicsImpostor && !MOVING_MESHES.has(mesh.name) && !mesh.isDescendantOf(tank) && !((_a = mesh.metadata) === null || _a === void 0 ? void 0 : _a.keepUnfrozen); })
        .forEach(function (mesh) {
        mesh.isPickable = false;
        mesh.doNotSyncBoundingInfo = true;
        mesh.freezeWorldMatrix();
    });
}


/***/ },

/***/ "./src/scenes/core/physics.ts"
/*!************************************!*\
  !*** ./src/scenes/core/physics.ts ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createTankBody: () => (/* binding */ createTankBody),
/* harmony export */   enablePhysics: () => (/* binding */ enablePhysics),
/* harmony export */   prepareLooseBodies: () => (/* binding */ prepareLooseBodies)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _world_playground__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../world/playground */ "./src/scenes/world/playground.ts");


/**
 * Surface of the ground. cannon.js multiplies the two touching bodies' values, so with bricks
 * (0.8 friction) this gives ~0.7 grip, and shots (0.8 restitution) bounce a little off it.
 */
var GROUND_MATERIAL = { friction: 0.9, restitution: 0.4 };
var GRAVITY = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, -40, 0);
var MAX_SUB_STEP_SECONDS = 1 / 120;
/** cannon.js Body.SLEEPING */
var SLEEPING = 2;
/**
 * Turns on physics and tunes cannon.js for this scene:
 *
 * - Performance: resting bodies (bricks, trophies, spent shots) fall asleep and stop being
 *   simulated until something hits them, and the broadphase sorts bodies along an axis instead
 *   of testing every pair against every other. The tank never sleeps, since it's moved by
 *   setting its velocity.
 * - Stability: by default Babylon advances cannon.js with one step per frame, sized to the frame
 *   time. At 60 fps a shot (200 units/s) moves ~3.3 units per step, about the thickness of a
 *   brick, so it can pass straight through; at lower frame rates it gets worse. Splitting each
 *   frame into equal sub-steps of at most 1/120s keeps the simulation stable at any frame rate
 *   while still advancing exactly the frame's time, so motion stays smooth.
 */
function enablePhysics(scene) {
    var _a, _b, _c;
    scene.enablePhysics();
    (_a = scene.getPhysicsEngine()) === null || _a === void 0 ? void 0 : _a.setGravity(GRAVITY);
    var plugin = (_b = scene.getPhysicsEngine()) === null || _b === void 0 ? void 0 : _b.getPhysicsPlugin();
    if (!plugin) {
        return;
    }
    var cannonPlugin = plugin;
    var world = cannonPlugin.world;
    if (world) {
        world.allowSleep = true;
        var SAPBroadphase = (_c = cannonPlugin.BJSCANNON) === null || _c === void 0 ? void 0 : _c.SAPBroadphase;
        if (SAPBroadphase) {
            world.broadphase = new SAPBroadphase(world);
        }
        fixFriction(world);
    }
    setGroundMaterial(scene, cannonPlugin);
    var executeStep = plugin.executeStep.bind(plugin);
    plugin.executeStep = function (delta, impostors) {
        var subSteps = Math.max(1, Math.ceil(delta / MAX_SUB_STEP_SECONDS - 1e-6));
        var subStepSeconds = delta / subSteps;
        for (var i = 0; i < subSteps; i++) {
            executeStep(subStepSeconds, impostors);
        }
    };
}
/**
 * cannon.js 0.6.2 limits each friction *impulse* by the friction *force* (mu * g * mass) without
 * multiplying it by the step time, so friction comes out 1/dt times too strong: about 120x with
 * our 1/120s sub-steps. Nothing could slide: a pushed brick stopped dead in one step and flipped
 * over its front edge instead, and friction values made no difference. Scaling the limits by the
 * step time gives real Coulomb friction (later fixed the same way in cannon-es).
 */
function fixFriction(world) {
    var narrowphase = world.narrowphase;
    var createFrictionEquations = narrowphase.createFrictionEquationsFromContact;
    narrowphase.createFrictionEquationsFromContact = function (contact, out) {
        var created = createFrictionEquations.call(this, contact, out);
        if (created) {
            // It appends one pair of tangent equations per contact.
            for (var i = out.length - 2; i < out.length; i++) {
                out[i].minForce *= world.dt;
                out[i].maxForce *= world.dt;
            }
        }
        return created;
    };
}
/**
 * The imported scene gives the ground 0.2 friction and 0.9 restitution, which made everything
 * slide on it like ice once friction worked. It gets its own material (Babylon shares materials
 * between bodies with equal values, so the existing one isn't edited in place).
 */
function setGroundMaterial(scene, plugin) {
    var _a;
    var ground = scene.getMeshByName("ground");
    var engine = scene.getPhysicsEngine();
    var impostor = ground && ((_a = ground.physicsImpostor) !== null && _a !== void 0 ? _a : engine === null || engine === void 0 ? void 0 : engine.getImpostorForPhysicsObject(ground));
    var body = impostor === null || impostor === void 0 ? void 0 : impostor.physicsBody;
    if (!body || !plugin.BJSCANNON) {
        return;
    }
    var material = new plugin.BJSCANNON.Material("ground");
    material.friction = GROUND_MATERIAL.friction;
    material.restitution = GROUND_MATERIAL.restitution;
    body.material = material;
}
/**
 * The tank's collision box, relative to the holder's centre: the hull and tracks of the toy model
 * (the thin barrel sticks out of it). The imported holder is a 12-unit cube reaching ~2.7 units
 * above the turret, so bricks used to land on an invisible roof above the tank.
 */
var TANK_HALF_EXTENTS = { x: 6.2, y: 4.65, z: 6.9 };
var TANK_BOX_OFFSET_Y = -1.35;
/**
 * A second, thin box around the gun barrel (see toyTank.ts: axis 0.9 above the holder's centre,
 * from the turret out to the muzzle brake at z ~11.2), so it can't poke through walls and bricks.
 */
var BARREL_HALF_EXTENTS = { x: 0.7, y: 0.7, z: 2.35 };
var BARREL_OFFSET = { y: 0.9, z: 8.85 };
/**
 * Gives the tank holder its physics body. Movement sets the tank's velocity every frame, so
 * linear damping isn't needed; strong angular damping keeps knocks from bricks from spinning it
 * between frames.
 */
function createTankBody(scene, tank) {
    var _a, _b;
    var CANNON = (_b = (_a = scene.getPhysicsEngine()) === null || _a === void 0 ? void 0 : _a.getPhysicsPlugin()) === null || _b === void 0 ? void 0 : _b.BJSCANNON;
    tank.physicsImpostor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor(tank, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor.BoxImpostor, { mass: 1000, restitution: 0 }, scene);
    var body = tank.physicsImpostor.physicsBody;
    if (!body) {
        return;
    }
    body.angularDamping = 0.98;
    body.allowSleep = false;
    var box = body.shapes[0];
    if ((box === null || box === void 0 ? void 0 : box.halfExtents) && box.updateConvexPolyhedronRepresentation) {
        box.halfExtents.set(TANK_HALF_EXTENTS.x, TANK_HALF_EXTENTS.y, TANK_HALF_EXTENTS.z);
        box.updateConvexPolyhedronRepresentation();
        box.updateBoundingSphereRadius();
        body.shapeOffsets[0].set(0, TANK_BOX_OFFSET_Y, 0);
        if (CANNON) {
            var barrel = new CANNON.Box(new CANNON.Vec3(BARREL_HALF_EXTENTS.x, BARREL_HALF_EXTENTS.y, BARREL_HALF_EXTENTS.z));
            body.addShape(barrel, new CANNON.Vec3(0, BARREL_OFFSET.y, BARREL_OFFSET.z));
        }
        body.updateBoundingRadius();
        body.updateMassProperties();
        body.aabbNeedsUpdate = true;
    }
}
/**
 * Run once every loose object exists. Babylon copies every physics body's transform to its mesh
 * (and back) on every physics step. Bodies that cannon.js has put to sleep (settled bricks,
 * cones, trophies) don't move, so that work is skipped for them until something wakes them up.
 * Loose objects also land on and bump into the ramps here (the tank rides them instead).
 */
function prepareLooseBodies(scene, tank) {
    var _a, _b;
    var _loop_1 = function (impostor) {
        var body = impostor.physicsBody;
        if (!body || impostor.mass === 0 || impostor.object === tank) {
            return "continue";
        }
        (0,_world_playground__WEBPACK_IMPORTED_MODULE_1__.collideWithRamps)(impostor);
        var beforeStep = impostor.beforeStep;
        var afterStep = impostor.afterStep;
        // The two always run as a pair (a body can fall asleep during the step).
        var synced = false;
        impostor.beforeStep = function () {
            synced = body.sleepState !== SLEEPING;
            if (synced) {
                beforeStep();
            }
        };
        impostor.afterStep = function () {
            if (synced) {
                afterStep();
            }
        };
    };
    for (var _i = 0, _c = (_b = (_a = scene.getPhysicsEngine()) === null || _a === void 0 ? void 0 : _a.getImpostors()) !== null && _b !== void 0 ? _b : []; _i < _c.length; _i++) {
        var impostor = _c[_i];
        _loop_1(impostor);
    }
}


/***/ },

/***/ "./src/scenes/core/resolution.ts"
/*!***************************************!*\
  !*** ./src/scenes/core/resolution.ts ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   adaptResolution: () => (/* binding */ adaptResolution)
/* harmony export */ });
/**
 * A safety net for big screens: renders at a slightly lower resolution when the frame rate stays
 * low. Everything the GPU draws per pixel (the scene, shadows' lookups, the GUI) grows with the
 * screen size, so a 4K screen is four times the work of 1080p.
 *
 * - Screens with more pixels than MAX_PIXELS (beyond 2K) start scaled down to about that size.
 * - If the frame rate stays under LOW_FPS for a few seconds, the resolution steps down a little,
 *   at most to 1 / MAX_SCALE of the screen's. It's never raised again in the same visit, so it
 *   can't flicker between sizes.
 *
 * On machines that keep up, nothing changes.
 */
var MAX_PIXELS = 2560 * 1440;
var MAX_SCALE = 1.5;
var SCALE_STEP = 0.125;
var LOW_FPS = 45;
var SAMPLE_SECONDS = 3;
/** The first frames (shadow maps, physics settling) can be slow; don't judge those. */
var SETTLE_SECONDS = 4;
/** Only consecutive slow samples count, so one hiccup doesn't lower the resolution. */
var SLOW_SAMPLES_NEEDED = 2;
function adaptResolution(scene) {
    var engine = scene.getEngine();
    var scale = engine.getHardwareScalingLevel();
    var apply = function (next) {
        var clamped = Math.min(MAX_SCALE, Math.max(1, next));
        if (Math.abs(clamped - scale) > 0.001) {
            scale = clamped;
            engine.setHardwareScalingLevel(scale);
        }
    };
    var capPixels = function () {
        var _a, _b;
        var canvas = engine.getRenderingCanvas();
        var pixels = ((_a = canvas === null || canvas === void 0 ? void 0 : canvas.clientWidth) !== null && _a !== void 0 ? _a : 0) * ((_b = canvas === null || canvas === void 0 ? void 0 : canvas.clientHeight) !== null && _b !== void 0 ? _b : 0);
        if (pixels > MAX_PIXELS) {
            apply(Math.max(scale, Math.sqrt(pixels / MAX_PIXELS)));
        }
    };
    capPixels();
    var onResize = engine.onResizeObservable.add(capPixels);
    var frames = 0;
    var sampleStart = -1;
    var slowSamples = 0;
    var observer = scene.onAfterRenderObservable.add(function () {
        var now = performance.now();
        if (sampleStart < 0) {
            // Counted from the first rendered frame, after loading.
            sampleStart = now + (SETTLE_SECONDS * 1000);
        }
        if (now < sampleStart) {
            return;
        }
        frames++;
        var elapsed = (now - sampleStart) / 1000;
        if (elapsed < SAMPLE_SECONDS) {
            return;
        }
        var fps = frames / elapsed;
        frames = 0;
        sampleStart = now;
        // A hidden tab or a stalled frame isn't the GPU struggling.
        if (document.hidden || elapsed > SAMPLE_SECONDS * 2) {
            return;
        }
        slowSamples = fps < LOW_FPS ? slowSamples + 1 : 0;
        if (slowSamples >= SLOW_SAMPLES_NEEDED && scale < MAX_SCALE) {
            slowSamples = 0;
            apply(scale + SCALE_STEP);
        }
    });
    scene.onDisposeObservable.addOnce(function () {
        scene.onAfterRenderObservable.remove(observer);
        engine.onResizeObservable.remove(onResize);
    });
}


/***/ },

/***/ "./src/scenes/core/shadows.ts"
/*!************************************!*\
  !*** ./src/scenes/core/shadows.ts ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SUN_DIRECTION: () => (/* binding */ SUN_DIRECTION),
/* harmony export */   initializeShadows: () => (/* binding */ initializeShadows)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");

/**
 * Sunlight and shadows for the world.
 *
 * The scene's own directional light ("dir_light") is the sun: it gets a slightly lower, angled
 * direction so shadows fall away from the camera and a little to the side, which shows them
 * behind every object. A weak second light from the opposite side keeps the shaded faces from
 * going flat, without casting shadows of its own (two shadow directions look muddy).
 *
 * Shadows come from one high-resolution shadow map that follows the area the camera looks at.
 */
/** Sun direction: from behind the camera's right, about 50 degrees above the horizon. */
var SUN_DIRECTION = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.14, -1.3, -0.99).normalize();
var SUN_INTENSITY = 1.2;
var FILL_DIRECTION = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(1, -1.2, 0.4).normalize();
var FILL_INTENSITY = 0.3;
/** Shadow map coverage: a square this many units either side of its centre. */
var SHADOW_HALF_SIZE = 150;
var SHADOW_MAP_SIZE = 4096;
/** How far ahead of the tank (in the camera's view direction) the map is centred. */
var SHADOW_AHEAD = 60;
/** How far back along the sun direction the shadow camera sits. */
var SUN_DISTANCE = 200;
/** Meshes that never cast: effects, overlays and flat decals. */
var NO_CAST = ["ball", "splatter", "ffdescription", "monitor", "ground", "road-slab", "ground-petal", "collider", "cloud"];
/** Meshes thinner than this (world units) lie flat on the ground and only receive. */
var MIN_CASTER_HEIGHT = 0.3;
/** Meshes smaller than this in every direction don't cast (their shadow would be a speck). */
var MIN_CASTER_SIZE = 1.3;
function initializeShadows(scene, options) {
    var sun = setUpLights(scene);
    var generator = createGenerator(scene, sun, options);
    /** Every mesh that casts a shadow; see refreshCasters below for which are drawn. */
    var casters = [];
    var isCaster = function (mesh) {
        // Physics colliders are hidden with visibility 0, which still renders into shadow maps.
        if (!mesh.isEnabled() || !mesh.isVisible || mesh.visibility <= 0) {
            return false;
        }
        var name = "".concat(mesh.name, " ").concat(mesh instanceof _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.InstancedMesh ? mesh.sourceMesh.name : "").toLowerCase();
        if (NO_CAST.some(function (keyword) { return name.includes(keyword); })) {
            return false;
        }
        var box = mesh.getBoundingInfo().boundingBox;
        var size = box.maximumWorld.subtract(box.minimumWorld);
        // Flat things only receive; tiny things (pebbles, blossoms, rivets, cleats) would cost a
        // draw in the shadow map every frame for a shadow a few pixels wide.
        return size.y >= MIN_CASTER_HEIGHT && Math.max(size.x, size.y, size.z) >= MIN_CASTER_SIZE;
    };
    var register = function (mesh) {
        if (mesh instanceof _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh && mesh.material) {
            mesh.receiveShadows = true;
        }
        else if (mesh instanceof _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.InstancedMesh && mesh.sourceMesh.material) {
            mesh.sourceMesh.receiveShadows = true;
        }
        if (isCaster(mesh)) {
            casters.push(mesh);
        }
    };
    scene.meshes.forEach(function (mesh) {
        mesh.computeWorldMatrix(true);
        register(mesh);
    });
    // Shots and anything else created during play cast shadows too (they are small and move, so
    // they only cast; receiving would need their materials recompiled).
    var added = scene.onNewMeshAddedObservable.add(function (mesh) {
        // Wait a frame: the mesh gets its material, position and visibility after creation.
        scene.onAfterRenderObservable.addOnce(function () {
            if (!mesh.isDisposed() && isCaster(mesh)) {
                casters.push(mesh);
                refreshCasters();
            }
        });
    });
    scene.onDisposeObservable.addOnce(function () { return scene.onNewMeshAddedObservable.remove(added); });
    // Only the casters inside (or near) the area the shadow map currently covers are drawn into
    // it; the rest of the world is skipped. The list is refreshed a few times a second as the map
    // follows the camera.
    var map = generator.getShadowMap();
    var point = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    var refreshCasters = function () {
        if (!map) {
            return;
        }
        var transform = generator.getTransformMatrix();
        var visible = [];
        for (var i = casters.length - 1; i >= 0; i--) {
            var mesh = casters[i];
            if (mesh.isDisposed()) {
                casters.splice(i, 1);
                continue;
            }
            var sphere = mesh.getBoundingInfo().boundingSphere;
            _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.TransformCoordinatesToRef(sphere.centerWorld, transform, point);
            var margin = 1 + (sphere.radiusWorld / SHADOW_HALF_SIZE) + 0.05;
            if (Math.abs(point.x) <= margin && Math.abs(point.y) <= margin) {
                visible.push(mesh);
            }
        }
        map.renderList = visible;
    };
    var sinceRefresh = 0;
    var refreshObserver = scene.onBeforeRenderObservable.add(function () {
        sinceRefresh += scene.getEngine().getDeltaTime();
        if (sinceRefresh >= 250) {
            sinceRefresh = 0;
            refreshCasters();
        }
    });
    scene.onDisposeObservable.addOnce(function () { return scene.onBeforeRenderObservable.remove(refreshObserver); });
    refreshCasters();
    return generator;
}
function setUpLights(scene) {
    var _a;
    var sun = scene.getLightByName("dir_light");
    if (!(sun instanceof _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DirectionalLight)) {
        sun = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DirectionalLight("dir_light", SUN_DIRECTION.clone(), scene);
    }
    var directional = sun;
    // The scene file comes with an empty shadow generator on this light; replace it.
    (_a = directional.getShadowGenerator()) === null || _a === void 0 ? void 0 : _a.dispose();
    directional.direction.copyFrom(SUN_DIRECTION);
    directional.intensity = SUN_INTENSITY;
    directional.diffuse = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString("#FFF4E3");
    directional.specular = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString("#FFF4E3");
    var fill = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DirectionalLight("fill_light", FILL_DIRECTION.clone(), scene);
    fill.intensity = FILL_INTENSITY;
    fill.diffuse = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString("#D6E4F5");
    fill.specular = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.Black();
    return directional;
}
function createGenerator(scene, sun, options) {
    // One high-resolution map covering the area around what the camera looks at. (Cascaded
    // shadow maps would be sharper close up, but they split the camera's view range, and this
    // camera's far plane is effectively infinite, which breaks them.)
    sun.autoUpdateExtends = false;
    sun.autoCalcShadowZBounds = false;
    sun.orthoLeft = -SHADOW_HALF_SIZE;
    sun.orthoRight = SHADOW_HALF_SIZE;
    sun.orthoTop = SHADOW_HALF_SIZE;
    sun.orthoBottom = -SHADOW_HALF_SIZE;
    sun.shadowMinZ = SUN_DISTANCE - 120;
    sun.shadowMaxZ = SUN_DISTANCE + 120;
    var generator = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.ShadowGenerator(SHADOW_MAP_SIZE, sun);
    applyCommonSettings(generator);
    // Fade shadows out towards the edge of the map. Without it, a tall object touching the edge
    // smears its shadow across everything beyond the map (the ground there keeps sampling the
    // edge pixels), which shows up as long dark streaks in the distance.
    generator.frustumEdgeFalloff = 0.25;
    // Centre the map a little ahead of the focus point, in the direction the camera looks, and
    // snap it to whole texels so shadow edges don't shimmer while driving.
    var texel = (SHADOW_HALF_SIZE * 2) / SHADOW_MAP_SIZE;
    var forward = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    var center = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    var observer = scene.onBeforeRenderObservable.add(function () {
        options.camera.getDirectionToRef(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Axis.Z, forward);
        forward.y = 0;
        if (forward.lengthSquared() > 0.0001) {
            forward.normalize().scaleInPlace(SHADOW_AHEAD);
        }
        center.copyFrom(options.focus()).addInPlace(forward);
        center.set(Math.round(center.x / texel) * texel, 0, Math.round(center.z / texel) * texel);
        center.subtractToRef(SUN_DIRECTION.scale(SUN_DISTANCE), sun.position);
    });
    scene.onDisposeObservable.addOnce(function () { return scene.onBeforeRenderObservable.remove(observer); });
    return generator;
}
function applyCommonSettings(generator) {
    generator.usePercentageCloserFiltering = true;
    generator.filteringQuality = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.ShadowGenerator.QUALITY_MEDIUM;
    generator.bias = 0.001;
    generator.normalBias = 0.02;
    // Full shadow from the sun: shaded areas still get the sky and fill light (and the toy
    // materials their reflections), so they read as soft blue shade, not black. Any lighter and
    // the shadows all but disappear, since the sun is only part of the ground's light.
    generator.setDarkness(0);
}


/***/ },

/***/ "./src/scenes/core/staticBodies.ts"
/*!*****************************************!*\
  !*** ./src/scenes/core/staticBodies.ts ***!
  \*****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addStaticBox: () => (/* binding */ addStaticBox),
/* harmony export */   addStaticSphere: () => (/* binding */ addStaticSphere)
/* harmony export */ });
/* harmony import */ var _audio_soundMaterials__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../audio/soundMaterials */ "./src/scenes/audio/soundMaterials.ts");

function getCannon(scene) {
    var _a;
    var plugin = (_a = scene.getPhysicsEngine()) === null || _a === void 0 ? void 0 : _a.getPhysicsPlugin();
    if (!(plugin === null || plugin === void 0 ? void 0 : plugin.BJSCANNON) || !plugin.world) {
        return null;
    }
    return { CANNON: plugin.BJSCANNON, world: plugin.world };
}
function addBody(scene, shape, center, options) {
    var _a;
    var cannon = getCannon(scene);
    if (!cannon) {
        return false;
    }
    var body = new cannon.CANNON.Body({ mass: 0 });
    body.addShape(shape(cannon.CANNON));
    body.position.set(center.x, center.y, center.z);
    var rotation = options.rotation;
    if (rotation) {
        body.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
    if (options.group !== undefined) {
        body.collisionFilterGroup = options.group;
    }
    if (options.mask !== undefined) {
        body.collisionFilterMask = options.mask;
    }
    cannon.world.addBody(body);
    (0,_audio_soundMaterials__WEBPACK_IMPORTED_MODULE_0__.setSoundMaterial)(body, (_a = options.sound) !== null && _a !== void 0 ? _a : "static");
    var onHit = options.onHit;
    if (onHit) {
        body.addEventListener("collide", function (event) { return onHit(event.body); });
    }
    scene.onDisposeObservable.addOnce(function () { return cannon.world.removeBody(body); });
    return true;
}
/** A static box of the given full size, centred at `center`. */
function addStaticBox(scene, center, width, height, depth, options) {
    if (options === void 0) { options = {}; }
    return addBody(scene, function (CANNON) { return new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)); }, center, options);
}
/** A static sphere. */
function addStaticSphere(scene, center, radius, options) {
    if (options === void 0) { options = {}; }
    return addBody(scene, function (CANNON) { return new CANNON.Sphere(radius); }, center, options);
}


/***/ },

/***/ "./src/scenes/core/toyStyle.ts"
/*!*************************************!*\
  !*** ./src/scenes/core/toyStyle.ts ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addThinInstances: () => (/* binding */ addThinInstances),
/* harmony export */   buildMesh: () => (/* binding */ buildMesh),
/* harmony export */   createLumpyBall: () => (/* binding */ createLumpyBall),
/* harmony export */   createRandom: () => (/* binding */ createRandom),
/* harmony export */   createRoundedBox: () => (/* binding */ createRoundedBox),
/* harmony export */   createTemplate: () => (/* binding */ createTemplate),
/* harmony export */   createToyMaterial: () => (/* binding */ createToyMaterial),
/* harmony export */   extrudeOutline: () => (/* binding */ extrudeOutline),
/* harmony export */   pushOrientedTriangle: () => (/* binding */ pushOrientedTriangle)
/* harmony export */ });
/* unused harmony export getToyEnvironment */
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _math__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./math */ "./src/scenes/core/math.ts");
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};


var environments = new WeakMap();
/** One shared environment texture per scene. */
function getToyEnvironment(scene) {
    var environment = environments.get(scene);
    if (!environment) {
        environment = createToyEnvironment(scene);
        environments.set(scene, environment);
    }
    return environment;
}
/** Plastic-looking PBR material; `hex` is an sRGB colour like "#F67FAA". */
function createToyMaterial(scene, name, hex, options) {
    var _a, _b, _c;
    if (options === void 0) { options = {}; }
    var material = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PBRMaterial(name, scene);
    material.albedoColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString(hex).toLinearSpace();
    material.metallic = (_a = options.metallic) !== null && _a !== void 0 ? _a : 0;
    material.roughness = (_b = options.roughness) !== null && _b !== void 0 ? _b : 0.45;
    material.reflectionTexture = getToyEnvironment(scene);
    material.environmentIntensity = 0.6;
    var clearCoat = (_c = options.clearCoat) !== null && _c !== void 0 ? _c : 0;
    if (clearCoat > 0) {
        // Glossy varnish layer: crisp highlights on top of the softer plastic underneath.
        material.clearCoat.isEnabled = true;
        material.clearCoat.intensity = clearCoat;
        material.clearCoat.roughness = 0.12;
    }
    return material;
}
/**
 * The scene has no environment map, so PBR plastic would only be lit by the direct lights and
 * look flat. This builds a tiny sky-to-ground gradient cube map for the toy materials (tank, trees, bricks):
 * it gives the plastic soft sky-coloured fill from above, darker undersides, and reflections for
 * the glossy highlights. It only depends on height, so face orientation doesn't matter.
 */
function createToyEnvironment(scene) {
    var size = 32;
    var zenith = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString("#D6E4FF");
    var sky = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString("#F4F1FF");
    var horizon = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString("#FFE6D2");
    var ground = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString("#5E7552");
    var color = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3();
    var faceNames = ["right", "left", "up", "down", "front", "back"];
    var faceAxes = {
        right: [new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(1, 0, 0), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 0, -1), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, -1, 0)],
        left: [new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(-1, 0, 0), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 0, 1), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, -1, 0)],
        up: [new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 1, 0), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(1, 0, 0), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 0, 1)],
        down: [new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, -1, 0), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(1, 0, 0), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 0, -1)],
        front: [new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 0, 1), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(1, 0, 0), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, -1, 0)],
        back: [new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 0, -1), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(-1, 0, 0), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, -1, 0)],
    };
    var faces = faceNames.map(function (faceName) {
        var _a = faceAxes[faceName], normal = _a[0], axisX = _a[1], axisY = _a[2];
        var data = new Uint8Array(size * size * 4);
        for (var py = 0; py < size; py++) {
            for (var px = 0; px < size; px++) {
                var u = (((px + 0.5) / size) * 2) - 1;
                var v = (((py + 0.5) / size) * 2) - 1;
                var dirY = (normal.y + (axisX.y * u) + (axisY.y * v)) / Math.hypot(normal.x + (axisX.x * u) + (axisY.x * v), normal.y + (axisX.y * u) + (axisY.y * v), normal.z + (axisX.z * u) + (axisY.z * v));
                if (dirY >= 0) {
                    _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.LerpToRef(horizon, sky, Math.min(1, dirY * 2.5), color);
                    _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.LerpToRef(color, zenith, Math.max(0, (dirY - 0.4) / 0.6), color);
                    if (dirY > 0.82) {
                        // Bright "studio light" cap for crisp highlights on top surfaces.
                        _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.LerpToRef(color, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.White(), Math.min(1, (dirY - 0.82) / 0.08), color);
                    }
                }
                else {
                    _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.LerpToRef(horizon, ground, Math.min(1, -dirY * 4), color);
                }
                var offset = ((py * size) + px) * 4;
                data[offset] = Math.round(color.r * 255);
                data[offset + 1] = Math.round(color.g * 255);
                data[offset + 2] = Math.round(color.b * 255);
                data[offset + 3] = 255;
            }
        }
        return data;
    });
    var texture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.RawCubeTexture(scene, faces, size, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Constants.TEXTUREFORMAT_RGBA, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Constants.TEXTURETYPE_UNSIGNED_BYTE, true);
    texture.gammaSpace = true;
    texture.name = "toy-environment";
    // Diffuse image-based lighting needs spherical harmonics; compute them from the same data on
    // the CPU instead of reading the texture back from the GPU.
    texture.sphericalPolynomial = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.CubeMapToSphericalPolynomialTools.ConvertCubeMapToSphericalPolynomial({
        size: size,
        right: faces[0],
        left: faces[1],
        up: faces[2],
        down: faces[3],
        front: faces[4],
        back: faces[5],
        format: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Constants.TEXTUREFORMAT_RGBA,
        type: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Constants.TEXTURETYPE_UNSIGNED_BYTE,
        gammaSpace: true,
    });
    return texture;
}
/** Hidden source mesh for instances. */
function createTemplate(mesh, material) {
    mesh.material = material;
    mesh.isVisible = false;
    mesh.isPickable = false;
    return mesh;
}
/**
 * Box with all edges and corners rounded by `radius`: each face is a grid that is extra dense
 * near the edges, and every vertex is pushed onto the rounded surface. `taper` below 1 makes the
 * top narrower than the bottom (above 1, wider).
 */
function createRoundedBox(name, width, height, depth, radius, scene, segments, taper) {
    if (segments === void 0) { segments = 4; }
    if (taper === void 0) { taper = 1; }
    var half = [width / 2, height / 2, depth / 2];
    var r = Math.min.apply(Math, __spreadArray([radius], half, false));
    var inner = half.map(function (h) { return h - r; });
    var samples = half.map(function (h, axis) {
        var i = inner[axis];
        var values = [];
        for (var k = 0; k <= segments; k++) {
            values.push(-h + ((h - i) * k / segments));
        }
        for (var k = 0; k <= segments; k++) {
            var value = i + ((h - i) * k / segments);
            if (value > values[values.length - 1] + 1e-6) {
                values.push(value);
            }
        }
        return values;
    });
    var positions = [];
    var normals = [];
    var indices = [];
    var point = [0, 0, 0];
    var _loop_1 = function (axis) {
        var _loop_2 = function (sign) {
            var uAxis = (axis + 1) % 3;
            var vAxis = (axis + 2) % 3;
            var uValues = samples[uAxis];
            var vValues = samples[vAxis];
            var start = positions.length / 3;
            for (var _b = 0, uValues_1 = uValues; _b < uValues_1.length; _b++) {
                var u = uValues_1[_b];
                var _loop_3 = function (v) {
                    point[axis] = sign * half[axis];
                    point[uAxis] = u;
                    point[vAxis] = v;
                    var nearest = point.map(function (value, i) { return (0,_math__WEBPACK_IMPORTED_MODULE_1__.clamp)(value, -inner[i], inner[i]); });
                    var offset = point.map(function (value, i) { return value - nearest[i]; });
                    var length_1 = Math.hypot(offset[0], offset[1], offset[2]);
                    var normal = length_1 > 1e-9 ? offset.map(function (value) { return value / length_1; }) : [0, 0, 0].map(function (_, i) { return (i === axis ? sign : 0); });
                    var x = nearest[0] + (normal[0] * r);
                    var y = nearest[1] + (normal[1] * r);
                    var z = nearest[2] + (normal[2] * r);
                    // Taper: scale x and z linearly with height, from 1 at the bottom to `taper` at
                    // the top. Normals follow the inverse transpose of that deformation.
                    var scale = 1 - ((1 - taper) * ((y + half[1]) / (2 * half[1])));
                    var scaleSlope = -(1 - taper) / (2 * half[1]);
                    var nx = normal[0] / scale;
                    var ny = normal[1] - ((x * scaleSlope * normal[0]) / scale) - ((z * scaleSlope * normal[2]) / scale);
                    var nz = normal[2] / scale;
                    var normalLength = Math.hypot(nx, ny, nz);
                    positions.push(x * scale, y, z * scale);
                    normals.push(nx / normalLength, ny / normalLength, nz / normalLength);
                };
                for (var _c = 0, vValues_1 = vValues; _c < vValues_1.length; _c++) {
                    var v = vValues_1[_c];
                    _loop_3(v);
                }
            }
            var columns = vValues.length;
            for (var ui = 0; ui < uValues.length - 1; ui++) {
                for (var vi = 0; vi < columns - 1; vi++) {
                    var a = start + (ui * columns) + vi;
                    var b = start + ((ui + 1) * columns) + vi;
                    var c = start + ((ui + 1) * columns) + vi + 1;
                    var d = start + (ui * columns) + vi + 1;
                    pushOrientedTriangle(indices, positions, normals, a, b, c);
                    pushOrientedTriangle(indices, positions, normals, a, c, d);
                }
            }
        };
        for (var _i = 0, _a = [-1, 1]; _i < _a.length; _i++) {
            var sign = _a[_i];
            _loop_2(sign);
        }
    };
    for (var axis = 0; axis < 3; axis++) {
        _loop_1(axis);
    }
    return buildMesh(name, positions, normals, indices, scene);
}
/**
 * Adds a triangle wound the way Babylon expects for a front face whose outward normal is the
 * vertex normal (Babylon's front faces have (b - a) x (c - a) pointing away from the normal).
 */
function pushOrientedTriangle(indices, positions, normals, a, b, c) {
    var ax = positions[a * 3], ay = positions[(a * 3) + 1], az = positions[(a * 3) + 2];
    var e1x = positions[b * 3] - ax, e1y = positions[(b * 3) + 1] - ay, e1z = positions[(b * 3) + 2] - az;
    var e2x = positions[c * 3] - ax, e2y = positions[(c * 3) + 1] - ay, e2z = positions[(c * 3) + 2] - az;
    var cx = (e1y * e2z) - (e1z * e2y);
    var cy = (e1z * e2x) - (e1x * e2z);
    var cz = (e1x * e2y) - (e1y * e2x);
    var nx = normals[a * 3] + normals[b * 3] + normals[c * 3];
    var ny = normals[(a * 3) + 1] + normals[(b * 3) + 1] + normals[(c * 3) + 1];
    var nz = normals[(a * 3) + 2] + normals[(b * 3) + 2] + normals[(c * 3) + 2];
    if ((cx * nx) + (cy * ny) + (cz * nz) > 0) {
        indices.push(a, c, b);
    }
    else {
        indices.push(a, b, c);
    }
}
function buildMesh(name, positions, normals, indices, scene, uvs) {
    var mesh = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh(name, scene);
    var vertexData = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexData();
    vertexData.positions = positions;
    vertexData.normals = normals;
    vertexData.indices = indices;
    if (uvs) {
        vertexData.uvs = uvs;
    }
    vertexData.applyToMesh(mesh);
    return mesh;
}
/** Small deterministic random generator, so procedural shapes look the same on every visit. */
function createRandom(seed) {
    var state = seed >>> 0;
    return function () {
        state = (state + 0x6D2B79F5) >>> 0;
        var t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/**
 * A soft, slightly lumpy ball (radius about 1): an icosphere pushed in and out by a smooth
 * pattern, with smooth normals so it reads as a rounded toy shape rather than a faceted rock.
 */
function createLumpyBall(name, scene, random, lumpiness, subdivisions) {
    if (lumpiness === void 0) { lumpiness = 1; }
    if (subdivisions === void 0) { subdivisions = 3; }
    var ball = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateIcoSphere(name, { radius: 1, subdivisions: subdivisions }, scene);
    var positions = ball.getVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.PositionKind);
    var indices = ball.getIndices();
    if (!positions || !indices) {
        return ball;
    }
    var a = random() * 10;
    var b = random() * 10;
    var c = random() * 10;
    for (var i = 0; i < positions.length; i += 3) {
        var x = positions[i];
        var y = positions[i + 1];
        var z = positions[i + 2];
        var bump = 1 + (lumpiness * ((0.08 * Math.sin((x * 3.1) + a) * Math.sin((y * 2.7) + b))
            + (0.06 * Math.sin((z * 3.7) + c) * Math.cos((x * 2.3) + b))));
        positions[i] = x * bump;
        positions[i + 1] = y * bump;
        positions[i + 2] = z * bump;
    }
    var normals = [];
    _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexData.ComputeNormals(positions, indices, normals);
    ball.setVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.PositionKind, positions);
    ball.setVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.NormalKind, normals);
    return ball;
}
/** Adds many copies of a mesh with one draw call (thin instances). */
function addThinInstances(mesh, matrices) {
    if (!matrices.length) {
        mesh.setEnabled(false);
        return;
    }
    mesh.thinInstanceAdd(matrices, true);
    mesh.thinInstanceRefreshBoundingInfo(false);
    mesh.isPickable = false;
}
/**
 * Extrudes a 2D outline (in X/Y, any winding) into a slab `depth` thick, centred on z = 0 with its
 * front facing -Z, and a rounded bevel of size `bevel` on both edges. The outline must be visible
 * in full from its centroid (true for all the shapes here), so the caps can be triangle fans.
 */
function extrudeOutline(name, outline, depth, bevel, scene) {
    var count = outline.length;
    var cx = 0;
    var cy = 0;
    for (var _i = 0, outline_1 = outline; _i < outline_1.length; _i++) {
        var _a = outline_1[_i], x = _a[0], y = _a[1];
        cx += x;
        cy += y;
    }
    cx /= count;
    cy /= count;
    // Outward 2D normal at each vertex (average of the two edge normals).
    var outward = outline.map(function (point, i) {
        var _a = outline[(i + count - 1) % count], px = _a[0], py = _a[1];
        var _b = outline[(i + 1) % count], nx = _b[0], ny = _b[1];
        var ox = ny - py;
        var oy = -(nx - px);
        var length = Math.hypot(ox, oy) || 1;
        ox /= length;
        oy /= length;
        if ((ox * (point[0] - cx)) + (oy * (point[1] - cy)) < 0) {
            ox = -ox;
            oy = -oy;
        }
        return [ox, oy];
    });
    var positions = [];
    var normals = [];
    var indices = [];
    var front = -depth / 2;
    var back = depth / 2;
    // Rings from front to back: inset front edge, outer front edge, outer back edge, inset back edge.
    var rings = [
        { z: front, inset: bevel, nz: -0.8 },
        { z: front + bevel, inset: 0, nz: -0.25 },
        { z: back - bevel, inset: 0, nz: 0.25 },
        { z: back, inset: bevel, nz: 0.8 },
    ];
    var ringStart = rings.map(function (ring) {
        var start = positions.length / 3;
        outline.forEach(function (_a, i) {
            var x = _a[0], y = _a[1];
            var _b = outward[i], ox = _b[0], oy = _b[1];
            positions.push(x - (ox * ring.inset), y - (oy * ring.inset), ring.z);
            var planar = Math.sqrt(1 - (ring.nz * ring.nz));
            normals.push(ox * planar, oy * planar, ring.nz);
        });
        return start;
    });
    for (var r = 0; r < rings.length - 1; r++) {
        for (var i = 0; i < count; i++) {
            var j = (i + 1) % count;
            var a = ringStart[r] + i;
            var b = ringStart[r] + j;
            var c = ringStart[r + 1] + i;
            var d = ringStart[r + 1] + j;
            pushOrientedTriangle(indices, positions, normals, a, b, c);
            pushOrientedTriangle(indices, positions, normals, b, d, c);
        }
    }
    // Flat caps.
    for (var _b = 0, _c = [[0, front, -1], [3, back, 1]]; _b < _c.length; _b++) {
        var _d = _c[_b], ringIndex = _d[0], z = _d[1], nz = _d[2];
        var center = positions.length / 3;
        positions.push(cx, cy, z);
        normals.push(0, 0, nz);
        var start = positions.length / 3;
        for (var i = 0; i < count; i++) {
            var source = (ringStart[ringIndex] + i) * 3;
            positions.push(positions[source], positions[source + 1], z);
            normals.push(0, 0, nz);
        }
        for (var i = 0; i < count; i++) {
            pushOrientedTriangle(indices, positions, normals, center, start + i, start + ((i + 1) % count));
        }
    }
    // Planar UVs, so these can be merged with other meshes (merging needs matching attributes).
    var uvs = [];
    for (var i = 0; i < positions.length; i += 3) {
        uvs.push(positions[i], positions[i + 1]);
    }
    return buildMesh(name, positions, normals, indices, scene, uvs);
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
/* harmony import */ var _babylonjs_core_node__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babylonjs/core/node */ "./node_modules/@babylonjs/core/node.js");
/* harmony import */ var _audio_impactSounds__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./audio/impactSounds */ "./src/scenes/audio/impactSounds.ts");
/* harmony import */ var _audio_soundBoard__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./audio/soundBoard */ "./src/scenes/audio/soundBoard.ts");
/* harmony import */ var _core_performance__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./core/performance */ "./src/scenes/core/performance.ts");
/* harmony import */ var _core_resolution__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./core/resolution */ "./src/scenes/core/resolution.ts");
/* harmony import */ var _core_physics__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./core/physics */ "./src/scenes/core/physics.ts");
/* harmony import */ var _core_shadows__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./core/shadows */ "./src/scenes/core/shadows.ts");
/* harmony import */ var _core_warmUp__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./core/warmUp */ "./src/scenes/core/warmUp.ts");
/* harmony import */ var _tank_movement__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./tank/movement */ "./src/scenes/tank/movement.ts");
/* harmony import */ var _tank_shooting__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./tank/shooting */ "./src/scenes/tank/shooting.ts");
/* harmony import */ var _tank_tankTrail__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./tank/tankTrail */ "./src/scenes/tank/tankTrail.ts");
/* harmony import */ var _tank_toyTank__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./tank/toyTank */ "./src/scenes/tank/toyTank.ts");
/* harmony import */ var _ui_controlsOverlay__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./ui/controlsOverlay */ "./src/scenes/ui/controlsOverlay.ts");
/* harmony import */ var _ui_fpsCounter__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./ui/fpsCounter */ "./src/scenes/ui/fpsCounter.ts");
/* harmony import */ var _world_aiTrophies__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./world/aiTrophies */ "./src/scenes/world/aiTrophies.ts");
/* harmony import */ var _world_bricks__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./world/bricks */ "./src/scenes/world/bricks.ts");
/* harmony import */ var _world_clouds__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./world/clouds */ "./src/scenes/world/clouds.ts");
/* harmony import */ var _world_codeTrophy__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./world/codeTrophy */ "./src/scenes/world/codeTrophy.ts");
/* harmony import */ var _world_fruitFactory__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ./world/fruitFactory */ "./src/scenes/world/fruitFactory.ts");
/* harmony import */ var _world_fruitFactorySigns__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ./world/fruitFactorySigns */ "./src/scenes/world/fruitFactorySigns.ts");
/* harmony import */ var _world_ground__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ./world/ground */ "./src/scenes/world/ground.ts");
/* harmony import */ var _world_landmarks__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ./world/landmarks */ "./src/scenes/world/landmarks.ts");
/* harmony import */ var _world_mascots__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ./world/mascots */ "./src/scenes/world/mascots.ts");
/* harmony import */ var _world_playground__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ./world/playground */ "./src/scenes/world/playground.ts");
/* harmony import */ var _world_trees__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! ./world/trees */ "./src/scenes/world/trees.ts");
/* harmony import */ var _world_waypointSigns__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! ./world/waypointSigns */ "./src/scenes/world/waypointSigns.ts");
/* harmony import */ var _world_tradingGame__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! ./world/tradingGame */ "./src/scenes/world/tradingGame.ts");
/* harmony import */ var _world_workCorner__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! ./world/workCorner */ "./src/scenes/world/workCorner.ts");
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





























/**
 * The game's entry point: the Babylon.js Editor attaches this script to the scene (see
 * scripts-map.ts), and onInitialize builds everything on top of the imported scene.
 *
 * - core/  engine-level setup: physics, shadows, performance, shared toy-style mesh helpers
 * - tank/  the player tank: model, driving, shooting, tread trail, link targets
 * - world/ everything placed in the world: trees, roads, landmarks, trophies, signs, clouds
 * - ui/    the 2D overlay: help card, target HUD, FPS counter, shared UI style
 */
var Play = /** @class */ (function (_super) {
    __extends(Play, _super);
    // @ts-ignore Babylon attaches script classes without calling Node's public constructor shape.
    function Play() {
        var _this = this;
        _this.toyTank = null;
        _this.workCorner = null;
        return _this;
    }
    /**
     * Called when the node is being initialized.
     * This function is called immediately after the constructor has been called.
     */
    Play.prototype.onInitialize = function () {
        this.findSceneObjects();
        this.loadScreenTexture();
        console.log("%c Very sly of you, but there is nothing to see here ;)", "color: #CE718F");
        (0,_core_physics__WEBPACK_IMPORTED_MODULE_6__.enablePhysics)(this.scene);
        (0,_core_physics__WEBPACK_IMPORTED_MODULE_6__.createTankBody)(this.scene, this.tank);
        (0,_ui_fpsCounter__WEBPACK_IMPORTED_MODULE_14__.attachFpsCounter)(this.scene);
        (0,_core_resolution__WEBPACK_IMPORTED_MODULE_5__.adaptResolution)(this.scene);
        this.buildWorld();
        this.initializeTank();
        // Last, once every mesh and physics body exists.
        (0,_core_performance__WEBPACK_IMPORTED_MODULE_4__.optimizeScene)(this.scene, this.tank);
        (0,_core_physics__WEBPACK_IMPORTED_MODULE_6__.prepareLooseBodies)(this.scene, this.tank);
        var controls = new _ui_controlsOverlay__WEBPACK_IMPORTED_MODULE_13__.ControlOverlay(this.scene);
        (0,_core_warmUp__WEBPACK_IMPORTED_MODULE_8__.registerLoadingTask)(controls.show());
        this.onDisposeObservable.addOnce(function () { return controls.dispose(); });
    };
    Play.prototype.findSceneObjects = function () {
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
    };
    /** Loaded by hand so the desk monitor's texture loads reliably in production builds. */
    Play.prototype.loadScreenTexture = function () {
        var _a;
        var screenMaterial = (_a = this.scene.getMeshByName("monitor")) === null || _a === void 0 ? void 0 : _a.material;
        if (screenMaterial && "albedoTexture" in screenMaterial) {
            screenMaterial.albedoTexture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Texture("assets/models/projects/monitor (Base Color).png", this.scene);
        }
    };
    /** Restyles the imported scene and adds everything built in code. Order matters where noted. */
    Play.prototype.buildWorld = function () {
        var _this = this;
        var scene = this.scene;
        this.createToyTankModel();
        (0,_tank_tankTrail__WEBPACK_IMPORTED_MODULE_11__.createTankTrail)(scene, this.tank);
        (0,_world_trees__WEBPACK_IMPORTED_MODULE_25__.instantiateTrees)({ scene: scene });
        (0,_world_landmarks__WEBPACK_IMPORTED_MODULE_22__.restyleLandmarks)(scene);
        (0,_world_fruitFactory__WEBPACK_IMPORTED_MODULE_19__.restyleFruitFactory)(scene);
        (0,_world_fruitFactorySigns__WEBPACK_IMPORTED_MODULE_20__.createFruitFactorySigns)(scene);
        (0,_world_mascots__WEBPACK_IMPORTED_MODULE_23__.restyleMascots)(scene);
        tryTo("AI trophies", function () { return (0,_world_aiTrophies__WEBPACK_IMPORTED_MODULE_15__.createAiTrophies)(scene); });
        tryTo("C# trophy", function () { return (0,_world_codeTrophy__WEBPACK_IMPORTED_MODULE_18__.createCodeTrophy)(scene); });
        tryTo("Work corner", function () {
            _this.workCorner = (0,_world_workCorner__WEBPACK_IMPORTED_MODULE_28__.createWorkCorner)(scene);
        });
        (0,_world_waypointSigns__WEBPACK_IMPORTED_MODULE_26__.createWaypointSigns)(scene);
        tryTo("Playground", function () { return (0,_world_playground__WEBPACK_IMPORTED_MODULE_24__.createPlayground)(scene); });
        (0,_world_bricks__WEBPACK_IMPORTED_MODULE_16__.createBrickBuilds)({ scene: scene, tank: this.tank });
        // After the bricks: walls measure the ground height with a ray, and decorations avoid them.
        (0,_world_ground__WEBPACK_IMPORTED_MODULE_21__.decorateGround)(scene, _world_trees__WEBPACK_IMPORTED_MODULE_25__.TREE_POSITIONS);
        tryTo("Clouds", function () { return (0,_world_clouds__WEBPACK_IMPORTED_MODULE_17__.createClouds)(scene, _this.tank, _this.camera); });
        // After everything else, so every mesh is considered as a shadow caster.
        tryTo("Shadows", function () { return (0,_core_shadows__WEBPACK_IMPORTED_MODULE_7__.initializeShadows)(scene, { camera: _this.camera, focus: function () { return _this.tank.position; } }); });
    };
    /**
     * Swaps the imported tank model for the toy tank built in code. Add `?tank=classic` to the URL
     * to get the original model back for comparison.
     */
    Play.prototype.createToyTankModel = function () {
        var _a, _b;
        if (new URLSearchParams(window.location.search).get("tank") === "classic") {
            return;
        }
        try {
            this.toyTank = (0,_tank_toyTank__WEBPACK_IMPORTED_MODULE_12__.createToyTank)(this.scene, this.tank);
            (_a = this.scene.getMeshByName("tank")) === null || _a === void 0 ? void 0 : _a.setEnabled(false);
        }
        catch (error) {
            console.error("Toy tank creation failed, keeping the original model", error);
            (_b = this.toyTank) === null || _b === void 0 ? void 0 : _b.root.dispose();
            this.toyTank = null;
        }
    };
    /** Driving, shooting, the work corner's minigame and all the sounds (synthesised, see audio/). After the world is built. */
    Play.prototype.initializeTank = function () {
        var _this = this;
        var _a;
        var sounds = new _audio_soundBoard__WEBPACK_IMPORTED_MODULE_3__.SoundBoard(this.scene, this.tank, this.camera);
        var context = {
            scene: this.scene,
            tank: this.tank,
            camera: this.camera,
            sounds: sounds,
            impacts: (0,_audio_impactSounds__WEBPACK_IMPORTED_MODULE_2__.createImpactSounds)(this.scene, sounds, this.tank),
            onShoot: this.toyTank ? function () { var _a; return (_a = _this.toyTank) === null || _a === void 0 ? void 0 : _a.fire(); } : undefined,
            shotOrigin: (_a = this.toyTank) === null || _a === void 0 ? void 0 : _a.muzzle,
        };
        (0,_tank_movement__WEBPACK_IMPORTED_MODULE_9__.initializeTankMovement)(context, 0.07);
        (0,_core_warmUp__WEBPACK_IMPORTED_MODULE_8__.registerLoadingTask)((0,_tank_shooting__WEBPACK_IMPORTED_MODULE_10__.initializeShooting)(context, new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 0, 1)));
        if (this.workCorner) {
            (0,_core_warmUp__WEBPACK_IMPORTED_MODULE_8__.registerLoadingTask)((0,_world_tradingGame__WEBPACK_IMPORTED_MODULE_27__.createTradingGame)(context, this.workCorner).catch(function (error) { return console.error("Trading game failed", error); }));
        }
    };
    return Play;
}(_babylonjs_core_node__WEBPACK_IMPORTED_MODULE_1__.Node));
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Play);
/** Optional extras log their error instead of taking the whole scene down. */
function tryTo(what, build) {
    try {
        build();
    }
    catch (error) {
        console.error("".concat(what, " failed"), error);
    }
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
    "src/scenes/play.ts": __webpack_require__(/*! ./play */ "./src/scenes/play.ts"),
};


/***/ },

/***/ "./src/scenes/tank/groundContact.ts"
/*!******************************************!*\
  !*** ./src/scenes/tank/groundContact.ts ***!
  \******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createGroundContact: () => (/* binding */ createGroundContact)
/* harmony export */ });
/* harmony import */ var _core_math__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../core/math */ "./src/scenes/core/math.ts");
/* harmony import */ var _world_playground__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../world/playground */ "./src/scenes/world/playground.ts");


/**
 * How the tank sits on the ground and the ramps.
 *
 * The tank's bottom is sampled at a grid of points under its tracks instead of a single point
 * under its centre. The model is tilted (pitch and roll) to fit the surface under it, and its
 * height is then chosen so that the lowest point of the *tilted* tank just touches the surface,
 * so no corner sinks into a ramp, a platform edge or the ground, even while the tilt is still
 * catching up (at the foot of a ramp, rolling off an edge, or landing nose first).
 *
 * The tank falls with its own gravity, keeps the upward speed a slope gives it (so driving off a
 * ramp launches it) and noses up or down in the air with its flight path.
 */
/**
 * Sample points under the tracks, in tank-local units (x to the right, z forwards): along both
 * outer track edges and the centre line, close enough together that a ramp's lip or a platform's
 * edge can't slip in between. `lift` is how far the rounded track ends curve up off the ground
 * (see toyTank.ts: end wheels at z = +-5, belt radius 1.8).
 */
var FOOTPRINT_X = [-5.9, 0, 5.9];
var FOOTPRINT_Z = Array.from({ length: 19 }, function (_, i) { return -6.3 + (i * 0.7); });
var FOOTPRINT = FOOTPRINT_X.flatMap(function (x) { return FOOTPRINT_Z.map(function (z) {
    var overhang = Math.max(0, Math.abs(z) - 5);
    return { x: x, z: z, lift: 1.8 - Math.sqrt((1.8 * 1.8) - (overhang * overhang)) };
}); });
var SUM_X2 = FOOTPRINT.reduce(function (sum, p) { return sum + (p.x * p.x); }, 0);
var SUM_Z2 = FOOTPRINT.reduce(function (sum, p) { return sum + (p.z * p.z); }, 0);
/** How far ahead of the centre the front (or back) of the tracks reaches, for the wall check. */
var LEAD_Z = 7;
var GRAVITY = 60;
var MAX_LAUNCH_SPEED = 22;
/** Steeper steps than this (the back of a ramp, a platform's side) are walls. */
var MAX_CLIMB_STEP = 1.2;
var MAX_TILT = 0.5;
/** How quickly the model's tilt follows the surface (per second). */
var GROUNDED_TILT_RATE = 14;
var AIR_PITCH_RATE = 6;
var AIR_ROLL_RATE = 3;
function createGroundContact(tank, model, 
/** Called when the tank lands after being in the air, with how fast it was falling. */
onLand) {
    var baseY = tank.position.y;
    var heights = new Array(FOOTPRINT.length).fill(0);
    var elevation = 0;
    var verticalSpeed = 0;
    var grounded = true;
    var pitch = 0;
    var roll = 0;
    var sampleFootprint = function (x, z, sin, cos) {
        // Babylon is left-handed: local +z is (sin, cos) and local +x is (cos, -sin) in world x/z.
        FOOTPRINT.forEach(function (p, i) {
            heights[i] = (0,_world_playground__WEBPACK_IMPORTED_MODULE_1__.getPlaygroundHeight)(x + (p.x * cos) + (p.z * sin), z - (p.x * sin) + (p.z * cos));
        });
    };
    /** Height of the tank's centre at which its lowest point, tilted as now, touches the surface. */
    var supportHeight = function () {
        var tanPitch = Math.tan(pitch);
        var tanRoll = Math.tan(roll);
        var support = 0;
        FOOTPRINT.forEach(function (p, i) {
            support = Math.max(support, heights[i] - (p.z * tanPitch) - (p.x * tanRoll) - p.lift);
        });
        return support;
    };
    var update = function (deltaSeconds, yaw, forwardSpeed) {
        if (deltaSeconds <= 0) {
            return;
        }
        var sin = Math.sin(yaw);
        var cos = Math.cos(yaw);
        var position = tank.position;
        sampleFootprint(position.x, position.z, sin, cos);
        // Tilt: on the ground, towards the plane that best fits the surface under the tracks; in
        // the air, the nose follows the flight path and the roll levels out.
        if (grounded) {
            var slopeZ_1 = 0;
            var slopeX_1 = 0;
            FOOTPRINT.forEach(function (p, i) {
                slopeZ_1 += p.z * heights[i];
                slopeX_1 += p.x * heights[i];
            });
            var rate = Math.min(1, deltaSeconds * GROUNDED_TILT_RATE);
            pitch += ((0,_core_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(Math.atan(slopeZ_1 / SUM_Z2), -MAX_TILT, MAX_TILT) - pitch) * rate;
            roll += ((0,_core_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(Math.atan(slopeX_1 / SUM_X2), -MAX_TILT, MAX_TILT) - roll) * rate;
        }
        else {
            var flightPitch = Math.atan2(verticalSpeed, Math.max(Math.abs(forwardSpeed), 12)) * 0.8;
            pitch += ((0,_core_math__WEBPACK_IMPORTED_MODULE_0__.clamp)(flightPitch, -0.45, 0.45) - pitch) * Math.min(1, deltaSeconds * AIR_PITCH_RATE);
            roll -= roll * Math.min(1, deltaSeconds * AIR_ROLL_RATE);
        }
        var support = supportHeight();
        verticalSpeed -= GRAVITY * deltaSeconds;
        var next = elevation + (verticalSpeed * deltaSeconds);
        if (next <= support) {
            // On the surface: move with it, keeping the speed it gives (so the lip of a ramp launches
            // the tank and it stays glued to a downhill slope). A landing never pushes it back up.
            var surfaceSpeed = (support - elevation) / deltaSeconds;
            if (!grounded) {
                onLand === null || onLand === void 0 ? void 0 : onLand(-verticalSpeed);
            }
            verticalSpeed = grounded ? Math.min(MAX_LAUNCH_SPEED, surfaceSpeed) : Math.min(0, surfaceSpeed);
            elevation = support;
            grounded = true;
        }
        else {
            elevation = next;
            grounded = false;
        }
        position.y = baseY + elevation;
        if (model) {
            // rotation.x = -pitch lifts the nose (+z); rotation.z = roll lifts the right side (+x).
            model.rotation.x = -pitch;
            model.rotation.z = roll;
        }
    };
    var isBlocked = function (x, z, yaw, direction) {
        var sin = Math.sin(yaw);
        var cos = Math.cos(yaw);
        var lead = LEAD_Z * direction;
        var leadBottom = elevation + (lead * Math.tan(pitch));
        for (var _i = 0, FOOTPRINT_X_1 = FOOTPRINT_X; _i < FOOTPRINT_X_1.length; _i++) {
            var across = FOOTPRINT_X_1[_i];
            var leadX = x + (across * cos) + (lead * sin);
            var leadZ = z - (across * sin) + (lead * cos);
            var ahead = (0,_world_playground__WEBPACK_IMPORTED_MODULE_1__.getPlaygroundHeight)(leadX, leadZ);
            // A sudden step (not a slope) that rises clearly above the bottom of the tracks.
            var behind = (0,_world_playground__WEBPACK_IMPORTED_MODULE_1__.getPlaygroundHeight)(leadX - (1.5 * direction * sin), leadZ - (1.5 * direction * cos));
            if (ahead - behind > MAX_CLIMB_STEP && ahead - leadBottom > MAX_CLIMB_STEP) {
                return true;
            }
        }
        return false;
    };
    return { update: update, isBlocked: isBlocked, isAirborne: function () { return !grounded; } };
}


/***/ },

/***/ "./src/scenes/tank/movement.ts"
/*!*************************************!*\
  !*** ./src/scenes/tank/movement.ts ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   initializeTankMovement: () => (/* binding */ initializeTankMovement)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_math__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/math */ "./src/scenes/core/math.ts");
/* harmony import */ var _audio_engineSound__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../audio/engineSound */ "./src/scenes/audio/engineSound.ts");
/* harmony import */ var _groundContact__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./groundContact */ "./src/scenes/tank/groundContact.ts");




/**
 * Keyboard driving (W/A/S/D), riding the ramps, and the camera following the tank.
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
    // Ramps, platforms and the tank's tilt (see groundContact.ts).
    var groundContact = (0,_groundContact__WEBPACK_IMPORTED_MODULE_3__.createGroundContact)(_this.tank, _this.scene.getTransformNodeByName("toy-tank-root"), function (fallSpeed) {
        _this.sounds.land(fallSpeed);
    });
    var engineSound = (0,_audio_engineSound__WEBPACK_IMPORTED_MODULE_2__.createEngineSound)(_this.sounds);
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
    // These stops don't go through the physics engine, so they play their bump sound here (at
    // the front, or back when reversing, of the tank).
    var bumpPosition = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
    var bump = function (material) {
        forwardDirection.scaleToRef(Math.sign(currentMoveSpeed) * 7, bumpPosition).addInPlace(_this.tank.position);
        _this.sounds.impact("tank", material, Math.abs(currentMoveSpeed), bumpPosition);
    };
    var applyMovement = function (mesh, moveInput, deltaSeconds) {
        var physicsImpostor = mesh.physicsImpostor;
        if (!physicsImpostor) {
            return 0;
        }
        var desiredSpeed = moveInput > 0 ? maxForwardSpeed : moveInput < 0 ? -maxReverseSpeed : 0;
        var speedDelta = (moveInput === 0 ? deceleration : acceleration) * deltaSeconds;
        currentMoveSpeed = moveToward(currentMoveSpeed, desiredSpeed, speedDelta);
        var yaw = (0,_core_math__WEBPACK_IMPORTED_MODULE_1__.getYaw)(mesh);
        forwardDirection.set(Math.sin(yaw), 0, Math.cos(yaw));
        forwardDirection.normalize();
        // Trees are checked against where the tank will be after this step, so it stops cleanly
        // before a trunk instead of grinding against it.
        nextPosition.copyFrom(mesh.position);
        nextPosition.y = baseTankY;
        nextPosition.addInPlace(forwardDirection.scale(currentMoveSpeed * deltaSeconds));
        if (collidesWithTree(nextPosition)) {
            bump("trunk");
            currentMoveSpeed = 0;
        }
        // The back of a ramp or a platform's side is a wall: stop instead of driving into it.
        if (currentMoveSpeed !== 0 && groundContact.isBlocked(nextPosition.x, nextPosition.z, yaw, currentMoveSpeed > 0 ? 1 : -1)) {
            bump("ramp");
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
        applyMovement(_this.tank, moveInput, deltaSeconds);
        var desiredTurnSpeed = turnInput * maxTurnSpeed;
        currentTurnSpeed = moveToward(currentTurnSpeed, desiredTurnSpeed, turnAcceleration * deltaSeconds);
        if (currentTurnSpeed !== 0) {
            _this.tank.rotate(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Axis.Y, currentTurnSpeed * deltaSeconds, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Space.WORLD);
        }
        groundContact.update(deltaSeconds, (0,_core_math__WEBPACK_IMPORTED_MODULE_1__.getYaw)(_this.tank), currentMoveSpeed);
        engineSound.update(currentMoveSpeed, currentTurnSpeed, groundContact.isAirborne());
        var rotationQuaternion = _this.tank.rotationQuaternion;
        if (rotationQuaternion) {
            _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion.RotationYawPitchRollToRef((0,_core_math__WEBPACK_IMPORTED_MODULE_1__.getYaw)(_this.tank), 0, 0, uprightRotation);
            rotationQuaternion.copyFrom(uprightRotation);
        }
        else {
            _this.tank.rotation.x = 0;
            _this.tank.rotation.z = 0;
        }
    });
    // Runs after the physics step has moved the tank this frame.
    _this.scene.registerBeforeRender(function () {
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


/***/ },

/***/ "./src/scenes/tank/shooting.ts"
/*!*************************************!*\
  !*** ./src/scenes/tank/shooting.ts ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   initializeShooting: () => (/* binding */ initializeShooting)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_math__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/math */ "./src/scenes/core/math.ts");
/* harmony import */ var _ui_style__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../ui/style */ "./src/scenes/ui/style.ts");
/* harmony import */ var _ui_targetHud__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../ui/targetHud */ "./src/scenes/ui/targetHud.ts");
/* harmony import */ var _world_playground__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../world/playground */ "./src/scenes/world/playground.ts");
/* harmony import */ var _toyTarget__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./toyTarget */ "./src/scenes/tank/toyTarget.ts");
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
 * A rubber ball: heavy enough to knock a brick clean out of a wall (it rolls a few bricks' lengths
 * away), and bouncy enough to hop off the ground.
 */
var SHOT_PHYSICS = { mass: 0.3, friction: 0.4, restitution: 0.8 };
/** The link targets are drawn after everything else, in this rendering group (see the glow). */
var TARGET_RENDERING_GROUP = 1;
/** Further than this from the tank, the targets are off screen and don't need their glow. */
var GLOW_DISTANCE = 150;
/**
 * Gives the player the ability to shoot with the tank.
 */
function initializeShooting(_this, forward) {
    return __awaiter(this, void 0, void 0, function () {
        var activeShots, shotOffset, shotHeightOffset, shotRadius, shotLifetimeMs, shotCooldownMs, targetHintRangeSquared, targetAimRangeSquared, aimLockThreshold, recoilRecoverSpeed, shotDirection, shotSpawnPosition, targetPosition, tankForward, toTarget, recoilOffset, recoilStep, targetConfigs, github, githubMaterial, highlightColor, gui, highlightLayer, addGlow, targetUi, objectiveHint, reticle, hitFeedback, impactBurst, getHitRadiusSquared, targetLabels, targets, targetMarks, toyTargets, applyVelocity, ball, canShoot, shotCooldownUntil, hitFeedbackUntil, impactBurstUntil, currentStatusUntil, currentObjectiveText, currentMood, hitTarget, impactTarget, discoveredTargets, totalTargetCount, recoilRestoreObserver, shotObserver, handleShoot;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    activeShots = [];
                    shotOffset = (_b = (_a = _this.shotOrigin) === null || _a === void 0 ? void 0 : _a.forward) !== null && _b !== void 0 ? _b : 5;
                    shotHeightOffset = (_d = (_c = _this.shotOrigin) === null || _c === void 0 ? void 0 : _c.height) !== null && _d !== void 0 ? _d : 3;
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
                    highlightColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString("#f7b955");
                    return [4 /*yield*/, __webpack_require__.e(/*! import() */ "vendors-node_modules_babylonjs_gui_index_js").then(__webpack_require__.bind(__webpack_require__, /*! @babylonjs/gui */ "./node_modules/@babylonjs/gui/index.js"))];
                case 1:
                    gui = _e.sent();
                    if (_this.scene.isDisposed) {
                        return [2 /*return*/];
                    }
                    highlightLayer = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.HighlightLayer("target-highlight", _this.scene, {
                        blurHorizontalSize: 0.6,
                        blurVerticalSize: 0.6,
                        renderingGroupId: TARGET_RENDERING_GROUP,
                    });
                    _this.scene.setRenderingAutoClearDepthStencil(TARGET_RENDERING_GROUP, false, false, false);
                    addGlow = function (mesh) {
                        mesh.renderingGroupId = TARGET_RENDERING_GROUP;
                        if (mesh instanceof _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh) {
                            highlightLayer.addMesh(mesh, highlightColor);
                        }
                    };
                    targetUi = gui.AdvancedDynamicTexture.CreateFullscreenUI("target-hints", true, _this.scene);
                    objectiveHint = (0,_ui_targetHud__WEBPACK_IMPORTED_MODULE_3__.createObjectiveHint)(gui, targetUi);
                    reticle = (0,_ui_targetHud__WEBPACK_IMPORTED_MODULE_3__.createReticle)(gui, targetUi);
                    hitFeedback = (0,_ui_targetHud__WEBPACK_IMPORTED_MODULE_3__.createHitFeedback)(gui, targetUi);
                    impactBurst = (0,_ui_targetHud__WEBPACK_IMPORTED_MODULE_3__.createImpactBurst)(gui, targetUi);
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
                    targetMarks = { GitHub: "GH", LinkedIn: "in" };
                    toyTargets = new Map();
                    targets.forEach(function (target) {
                        var _a;
                        var toyTarget = null;
                        try {
                            toyTarget = (0,_toyTarget__WEBPACK_IMPORTED_MODULE_5__.createToyTarget)(_this.scene, target.mesh, (_a = targetMarks[target.label]) !== null && _a !== void 0 ? _a : "");
                        }
                        catch (error) {
                            console.error("Toy target creation failed, keeping the original", error);
                            target.mesh.isVisible = true;
                        }
                        if (toyTarget) {
                            toyTargets.set(target.mesh, toyTarget);
                            toyTarget.meshes.forEach(addGlow);
                        }
                        else {
                            addGlow(target.mesh);
                        }
                        // The rest of the target (its mark) is drawn with it, so the target can't cover it.
                        target.mesh.getChildMeshes(false).forEach(function (mesh) {
                            mesh.renderingGroupId = TARGET_RENDERING_GROUP;
                        });
                        targetLabels.set(target.mesh, (0,_ui_targetHud__WEBPACK_IMPORTED_MODULE_3__.createTargetLabel)(gui, targetUi, target.mesh, target.label));
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
                    currentMood = "explore";
                    hitTarget = null;
                    impactTarget = null;
                    discoveredTargets = new Set();
                    totalTargetCount = targets.length;
                    recoilRestoreObserver = _this.scene.onAfterRenderObservable.add(function () {
                        _this.camera.position.subtractInPlace(recoilOffset);
                    });
                    shotObserver = _this.scene.onBeforeRenderObservable.add(function () {
                        var _a;
                        var now = performance.now();
                        var deltaSeconds = _this.scene.getEngine().getDeltaTime() / 1000;
                        var nearbyTargetLabel = "";
                        var nearestTargetDistanceSquared = Number.POSITIVE_INFINITY;
                        var nearestTargetMesh = null;
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
                                label.isVisible = false;
                            }
                            if (distanceSquared < nearestTargetDistanceSquared) {
                                nearestTargetDistanceSquared = distanceSquared;
                                nearbyTargetLabel = target.label;
                                nearestTargetMesh = target.mesh;
                            }
                            if (distanceSquared <= targetHintRangeSquared && !discoveredTargets.has(target.mesh.name)) {
                                discoveredTargets.add(target.mesh.name);
                                currentObjectiveText = "You found ".concat(target.label, "! ").concat(discoveredTargets.size, " of ").concat(totalTargetCount, " links found.");
                                currentMood = "found";
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
                        highlightLayer.isEnabled = nearestTargetDistanceSquared <= GLOW_DISTANCE * GLOW_DISTANCE;
                        // Only the nearest target gets its name bubble: they stand close together on the podium.
                        if (nearestTargetMesh && nearestTargetDistanceSquared <= targetHintRangeSquared) {
                            var label = targetLabels.get(nearestTargetMesh);
                            if (label) {
                                label.isVisible = true;
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
                        reticle.cooldown.color = hasRecentHit(now, hitFeedbackUntil) ? _ui_style__WEBPACK_IMPORTED_MODULE_2__.UI.mint : _ui_style__WEBPACK_IMPORTED_MODULE_2__.UI.gold;
                        var hasAimLock = aimedTargetLabel !== "";
                        reticle.frame.color = hasAimLock ? _ui_style__WEBPACK_IMPORTED_MODULE_2__.UI.pink : _ui_style__WEBPACK_IMPORTED_MODULE_2__.UI.cream;
                        reticle.frame.thickness = hasAimLock ? 4 : 3;
                        reticle.dot.background = hasAimLock ? _ui_style__WEBPACK_IMPORTED_MODULE_2__.UI.pink : _ui_style__WEBPACK_IMPORTED_MODULE_2__.UI.cream;
                        reticle.label.color = hasAimLock ? _ui_style__WEBPACK_IMPORTED_MODULE_2__.UI.pinkDeep : _ui_style__WEBPACK_IMPORTED_MODULE_2__.UI.navy;
                        reticle.label.text = hasAimLock
                            ? "LOCKED: ".concat(aimedTargetLabel)
                            : nearestTargetDistanceSquared <= targetHintRangeSquared
                                ? "NEARBY: ".concat(nearbyTargetLabel)
                                : "".concat(discoveredTargets.size, "/").concat(totalTargetCount, " LINKS FOUND");
                        // The sight only shows up when there is something to aim at (progress is in the corner card).
                        var showSight = hasAimLock || nearestTargetDistanceSquared <= targetHintRangeSquared || hasRecentHit(now, hitFeedbackUntil);
                        reticle.frame.isVisible = showSight;
                        reticle.pill.isVisible = showSight;
                        var isNearby = nearestTargetDistanceSquared <= targetHintRangeSquared;
                        var nextObjectiveText = hasAimLock
                            ? "".concat(aimedTargetLabel, " is locked on, ").concat(formatDistance(Math.sqrt(aimedTargetDistanceSquared)), ". Press E to fire!")
                            : isNearby
                                ? "".concat(nearbyTargetLabel, " is ").concat(formatDistance(Math.sqrt(nearestTargetDistanceSquared)), ". Turn toward it to lock on.")
                                : "Drive around the island to find the glowing targets, my projects, my work and links.";
                        var nextMood = hasAimLock ? "locked" : isNearby ? "nearby" : "explore";
                        if (now >= currentStatusUntil) {
                            currentMood = nextMood;
                            if (nextObjectiveText !== currentObjectiveText) {
                                objectiveHint.text = nextObjectiveText;
                                currentObjectiveText = nextObjectiveText;
                            }
                        }
                        objectiveHint.setStatus(currentMood, discoveredTargets.size, totalTargetCount);
                        if (!activeShots.length) {
                            return;
                        }
                        for (var shotIndex = activeShots.length - 1; shotIndex >= 0; shotIndex--) {
                            var activeShot = activeShots[shotIndex];
                            var shotPosition = activeShot.mesh.absolutePosition;
                            var didHit = false;
                            for (var _b = 0, targets_2 = targets; _b < targets_2.length; _b++) {
                                var target = targets_2[_b];
                                // Test the whole path travelled since the last frame: at 200 units/s a shot moves
                                // several units per frame and could otherwise skip straight past a target.
                                if ((0,_core_math__WEBPACK_IMPORTED_MODULE_1__.segmentDistanceSquared)(activeShot.previousPosition, shotPosition, target.mesh.absolutePosition) <= target.hitRadiusSquared) {
                                    didHit = true;
                                    (_a = toyTargets.get(target.mesh)) === null || _a === void 0 ? void 0 : _a.hit();
                                    _this.sounds.chime(target.mesh.absolutePosition);
                                    window.open(target.url, "_blank", "noopener,noreferrer");
                                    currentObjectiveText = "Direct hit! Opening ".concat(target.label, " in a new tab.");
                                    currentMood = "hit";
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
                                    reticle.frame.color = _ui_style__WEBPACK_IMPORTED_MODULE_2__.UI.mint;
                                    reticle.dot.background = _ui_style__WEBPACK_IMPORTED_MODULE_2__.UI.mint;
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
                        var _a, _b;
                        if (!canShoot) {
                            return;
                        }
                        canShoot = false;
                        shotCooldownUntil = performance.now() + shotCooldownMs;
                        _this.sounds.shot();
                        (_a = _this.onShoot) === null || _a === void 0 ? void 0 : _a.call(_this);
                        _this.tank.getDirectionToRef(forward, shotDirection);
                        shotDirection.normalize();
                        recoilOffset.addInPlaceFromFloats(-shotDirection.x * 0.22, 0.18, -shotDirection.z * 0.22);
                        var shotBall = ball.createInstance("ball");
                        shotBall.parent = null;
                        shotDirection.scaleToRef(shotOffset, shotSpawnPosition);
                        shotSpawnPosition.addInPlace(_this.tank.position);
                        shotSpawnPosition.y += shotHeightOffset;
                        shotBall.position.copyFrom(shotSpawnPosition);
                        shotBall.physicsImpostor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor(shotBall, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor.SphereImpostor, SHOT_PHYSICS, _this.scene);
                        (0,_world_playground__WEBPACK_IMPORTED_MODULE_4__.collideWithRamps)(shotBall.physicsImpostor);
                        _this.impacts.track(shotBall.physicsImpostor, "ball");
                        // Shots inherit the tank's motion, so firing while driving still goes where you aim.
                        var tankVelocity = (_b = _this.tank.physicsImpostor) === null || _b === void 0 ? void 0 : _b.getLinearVelocity();
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
function hasRecentHit(now, hitFeedbackUntil) {
    return now < hitFeedbackUntil;
}
function formatDistance(distance) {
    return "".concat(Math.max(1, Math.round(distance)), "m away");
}


/***/ },

/***/ "./src/scenes/tank/tankTrail.ts"
/*!**************************************!*\
  !*** ./src/scenes/tank/tankTrail.ts ***!
  \**************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createTankTrail: () => (/* binding */ createTankTrail)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_constants__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/constants */ "./src/scenes/core/constants.ts");


/**
 * What the tank leaves behind while driving: pairs of tread prints pressed into the play mat that
 * fade away after a while, and little puffs of dust kicked up behind both tracks.
 *
 * Replaces the imported "splatter" decals. Everything follows the physics holder ("tank_holder"),
 * whatever tank model is shown on it.
 */
/** Prints sit just above the road slabs (whose tops are at GROUND_Y + 0.15) so they show there too. */
var PRINT_Y = _core_constants__WEBPACK_IMPORTED_MODULE_1__.GROUND_Y + 0.17;
// Track layout in world units (see toyTank.ts): tracks 4.6 either side of the centre line,
// 2.6 wide, and the rear of the tracks 6.8 behind the centre.
var TRACK_X = 4.6;
var TRACK_WIDTH = 2.6;
var TRACK_REAR_Z = -6.8;
/** Distance driven between two prints, and the length of one print (slightly longer, so they join). */
var PRINT_SPACING = 1.9;
var PRINT_LENGTH = 2.1;
var PRINT_LIFETIME = 9;
var PRINT_FADE = 3.5;
var MAX_PRINTS = 420;
/** Below this speed (units per second) the tank leaves no prints or dust. */
var MIN_SPEED = 2;
var PALETTE = {
    print: "#123248",
    dust: "#E8DCC6",
};
function createTankTrail(scene, holder) {
    var _a;
    // The old decals are replaced by this trail.
    for (var _i = 0, _b = ["splatter1", "splatter2", "splatter3"]; _i < _b.length; _i++) {
        var name_1 = _b[_i];
        (_a = scene.getMeshByName(name_1)) === null || _a === void 0 ? void 0 : _a.setEnabled(false);
    }
    var prints = null;
    var dust = null;
    try {
        prints = createPrints(scene);
    }
    catch (error) {
        console.error("Tank tread prints failed", error);
    }
    try {
        dust = createDust(scene, holder);
    }
    catch (error) {
        console.error("Tank dust failed", error);
    }
    if (!prints && !dust) {
        return null;
    }
    var lastPosition = holder.position.clone();
    // Height of the holder when on the ground; above it the tank is on a ramp or in the air, and
    // leaves no prints or dust (they would end up inside the ramp or on the ground below).
    var groundedY = holder.position.y;
    var lastPrintPosition = holder.position.clone();
    var forward = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    var time = 0;
    var observer = scene.onAfterRenderObservable.add(function () {
        var deltaSeconds = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
        time += deltaSeconds;
        var moved = Math.hypot(holder.position.x - lastPosition.x, holder.position.z - lastPosition.z);
        var speed = deltaSeconds > 0 ? moved / deltaSeconds : 0;
        lastPosition.copyFrom(holder.position);
        var onGround = holder.position.y < groundedY + 0.3;
        var driving = speed > MIN_SPEED && onGround;
        if (prints) {
            if (!driving) {
                // Restart the spacing from here, so the next print isn't stretched over a gap.
                lastPrintPosition.copyFrom(holder.position);
            }
            else {
                holder.computeWorldMatrix(true);
                holder.getDirectionToRef(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Axis.Z, forward);
                forward.y = 0;
                forward.normalize();
                var yaw = Math.atan2(forward.x, forward.z);
                // Lay prints along the path in equal steps, even if a frame covered several.
                var travelled = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Distance(holder.position, lastPrintPosition);
                while (travelled >= PRINT_SPACING) {
                    var t = PRINT_SPACING / travelled;
                    _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.LerpToRef(lastPrintPosition, holder.position, t, lastPrintPosition);
                    prints.stamp(lastPrintPosition, yaw, time);
                    travelled -= PRINT_SPACING;
                }
            }
            prints.update(time);
        }
        if (dust) {
            dust.emitRate = driving ? Math.min(36, speed * 0.9) : 0;
        }
    });
    var dispose = function () {
        scene.onAfterRenderObservable.remove(observer);
        prints === null || prints === void 0 ? void 0 : prints.mesh.dispose();
        dust === null || dust === void 0 ? void 0 : dust.dispose();
    };
    scene.onDisposeObservable.addOnce(dispose);
    return { dispose: dispose };
}
/**
 * All prints are thin instances of one flat quad with a tread texture; each one has its own
 * colour (for fading) in a per-instance colour buffer, and is recycled oldest-first.
 */
function createPrints(scene) {
    var mesh = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateGround("tank-trail-prints", { width: TRACK_WIDTH, height: PRINT_LENGTH }, scene);
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.hasVertexAlpha = true;
    mesh.metadata = { keepUnfrozen: true };
    var material = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("tank-trail-prints-material", scene);
    material.diffuseTexture = createTreadTexture(scene);
    material.diffuseTexture.hasAlpha = true;
    material.useAlphaFromDiffuseTexture = true;
    material.specularColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.Black();
    material.diffuseColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString(PALETTE.print);
    material.zOffset = -2;
    material.backFaceCulling = false;
    mesh.material = material;
    var matrices = new Float32Array(MAX_PRINTS * 16);
    var colors = new Float32Array(MAX_PRINTS * 4);
    var born = new Float32Array(MAX_PRINTS).fill(-1000);
    var hidden = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Matrix.Scaling(0, 0, 0);
    for (var i = 0; i < MAX_PRINTS; i++) {
        hidden.copyToArray(matrices, i * 16);
    }
    mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
    mesh.thinInstanceSetBuffer("color", colors, 4, false);
    var next = 0;
    /** Time the newest print expires; nothing to update after that. */
    var lastExpiry = -1;
    var rotation = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion();
    var position = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    var scaling = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.One();
    var matrix = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Matrix();
    var matricesDirty = false;
    return {
        mesh: mesh,
        /** One pair of prints, under both tracks, centred on `center` and turned to `yaw`. */
        stamp: function (center, yaw, time) {
            _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion.RotationYawPitchRollToRef(yaw, 0, 0, rotation);
            var rightX = Math.cos(yaw);
            var rightZ = -Math.sin(yaw);
            for (var _i = 0, _a = [-1, 1]; _i < _a.length; _i++) {
                var side = _a[_i];
                position.set(center.x + (rightX * side * TRACK_X), PRINT_Y, center.z + (rightZ * side * TRACK_X));
                _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Matrix.ComposeToRef(scaling, rotation, position, matrix);
                matrix.copyToArray(matrices, next * 16);
                born[next] = time;
                next = (next + 1) % MAX_PRINTS;
            }
            matricesDirty = true;
            lastExpiry = time + PRINT_LIFETIME;
        },
        /** Fades prints out at the end of their life and hides expired ones. */
        update: function (time) {
            // All prints have faded: skip the loop and the buffer upload (one last pass hides them).
            if (time > lastExpiry + 1) {
                return;
            }
            for (var i = 0; i < MAX_PRINTS; i++) {
                var age = time - born[i];
                var alpha = age < 0 || age > PRINT_LIFETIME ? 0 : Math.min(1, (PRINT_LIFETIME - age) / PRINT_FADE) * 0.8;
                colors[(i * 4)] = 1;
                colors[(i * 4) + 1] = 1;
                colors[(i * 4) + 2] = 1;
                colors[(i * 4) + 3] = alpha;
            }
            mesh.thinInstanceBufferUpdated("color");
            if (matricesDirty) {
                mesh.thinInstanceBufferUpdated("matrix");
                matricesDirty = false;
            }
        },
    };
}
/** Tread pattern: chunky chevron cleats with soft edges, on a transparent background. */
function createTreadTexture(scene) {
    var width = 128;
    var height = 128;
    var texture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("tank-trail-tread", { width: width, height: height }, scene, true);
    var context = texture.getContext();
    context.clearRect(0, 0, width, height);
    // A faint pressed-in band the width of the track...
    context.fillStyle = "rgba(255,255,255,0.45)";
    context.fillRect(width * 0.06, 0, width * 0.88, height);
    // ...with three chevron cleats along it (the texture's V runs along the direction of travel).
    context.fillStyle = "rgba(255,255,255,1)";
    for (var i = 0; i < 3; i++) {
        var y = (i + 0.5) * (height / 3);
        var thickness = height * 0.12;
        context.beginPath();
        context.moveTo(width * 0.1, y + (thickness * 0.9));
        context.lineTo(width * 0.5, y - (thickness * 0.4));
        context.lineTo(width * 0.9, y + (thickness * 0.9));
        context.lineTo(width * 0.9, y + (thickness * 0.9) - thickness);
        context.lineTo(width * 0.5, y - (thickness * 0.4) - thickness);
        context.lineTo(width * 0.1, y + (thickness * 0.9) - thickness);
        context.closePath();
        context.fill();
    }
    texture.update();
    texture.wrapU = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Texture.WRAP_ADDRESSMODE;
    return texture;
}
/** Soft sand-coloured puffs from the back of both tracks. */
function createDust(scene, holder) {
    var dust = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.ParticleSystem("tank-trail-dust", 300, scene);
    dust.particleTexture = createPuffTexture(scene);
    dust.emitter = holder;
    // Positions and directions are computed in world space from the holder's world matrix (the
    // holder is a scaled 12-unit cube, so local offsets are divided by its scale).
    var holderScale = holder.scaling.x || 1;
    var local = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    dust.startPositionFunction = function (worldMatrix, positionToUpdate) {
        var side = Math.random() < 0.5 ? -1 : 1;
        local.set((side * TRACK_X + ((Math.random() - 0.5) * TRACK_WIDTH)) / holderScale, (_core_constants__WEBPACK_IMPORTED_MODULE_1__.GROUND_Y + 0.4 - holder.position.y) / holderScale, (TRACK_REAR_Z + (Math.random() * 0.8)) / holderScale);
        _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.TransformCoordinatesToRef(local, worldMatrix, positionToUpdate);
    };
    var back = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    dust.startDirectionFunction = function (worldMatrix, directionToUpdate) {
        _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.TransformNormalFromFloatsToRef(0, 0, -1, worldMatrix, back);
        back.y = 0;
        back.normalize();
        directionToUpdate.set((back.x * 2.5) + ((Math.random() - 0.5) * 3), 2 + (Math.random() * 2.5), (back.z * 2.5) + ((Math.random() - 0.5) * 3));
    };
    var color = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString(PALETTE.dust);
    dust.addColorGradient(0, new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color4(color.r, color.g, color.b, 0));
    dust.addColorGradient(0.15, new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color4(color.r, color.g, color.b, 0.38));
    dust.addColorGradient(1, new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color4(color.r, color.g, color.b, 0));
    dust.addSizeGradient(0, 1.6);
    dust.addSizeGradient(1, 4.4);
    dust.minLifeTime = 0.6;
    dust.maxLifeTime = 1.1;
    dust.minEmitPower = 1;
    dust.maxEmitPower = 1.6;
    dust.minAngularSpeed = -1.5;
    dust.maxAngularSpeed = 1.5;
    dust.gravity = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, -2, 0);
    dust.blendMode = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.ParticleSystem.BLENDMODE_STANDARD;
    dust.emitRate = 0;
    dust.start();
    return dust;
}
function createPuffTexture(scene) {
    var size = 64;
    var texture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("tank-trail-puff", { width: size, height: size }, scene, false);
    var context = texture.getContext();
    var gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.55, "rgba(255,255,255,0.8)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.clearRect(0, 0, size, size);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    texture.update();
    texture.hasAlpha = true;
    return texture;
}


/***/ },

/***/ "./src/scenes/tank/toyTank.ts"
/*!************************************!*\
  !*** ./src/scenes/tank/toyTank.ts ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createToyTank: () => (/* binding */ createToyTank)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");
/* harmony import */ var _core_math__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/math */ "./src/scenes/core/math.ts");



var HOLDER_SIZE = 12;
// Track layout
var TRACK_X = 4.6; // distance from the center line to the middle of each track
var TRACK_WIDTH = 2.6;
var TRACK_END_Z = 5; // z of the front/rear wheel centers
var TRACK_CENTER_Y = 1.8; // height of the front/rear wheel centers
var TRACK_RADIUS = 1.8; // outer radius of the belt around the end wheels
var TRACK_THICKNESS = 0.35;
var CLEAT_COUNT = 30;
var ROAD_WHEEL_RADIUS = 1.15;
var ROAD_WHEEL_Z = [-3.6, -1.8, 0, 1.8, 3.6];
var END_WHEEL_RADIUS = 1.3;
var RETURN_ROLLER_RADIUS = 0.42;
var RETURN_ROLLER_Z = [-2.6, 2.6];
// The turret narrows towards the top (top is this fraction of the base width/depth).
var TURRET_TAPER = 0.85;
// Gun layout
var BARREL_Y = 6.9;
var BARREL_START_Z = 3.6;
var BARREL_LENGTH = 7.5;
// Slate blue body with sakura pink accents (pink comes from the cherry trees, blue is its
// complement), warm sand details and brass fittings.
var PALETTE = {
    body: "#4F6F8F",
    bodyDark: "#344B63",
    cream: "#E8DCC6",
    gold: "#C9A35B",
    accent: "#E8869F",
    rubber: "#2A2C30",
    cleat: "#45484E",
    lens: "#FFE7A8",
};
function createToyTank(scene, holder) {
    var materials = createMaterials(scene);
    var meshes = [];
    var track = function (mesh) {
        meshes.push(mesh);
        return mesh;
    };
    var root = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("toy-tank-root", scene);
    root.parent = holder;
    root.position.set(0, -0.5, 0);
    root.scaling.setAll(1 / HOLDER_SIZE);
    // Everything above the tracks sits on this node so it can sway on its "suspension".
    var body = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("toy-tank-body", scene);
    body.parent = root;
    var bodyPivotY = 3.6;
    body.position.y = bodyPivotY;
    var bodyContent = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("toy-tank-body-content", scene);
    bodyContent.parent = body;
    bodyContent.position.y = -bodyPivotY;
    // ---------------------------------------------------------------- Hull
    var lowerHull = track((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("toy-tank-lower-hull", 6.6, 2.4, 12.4, 0.55, scene, 4, 1.06));
    lowerHull.material = materials.bodyDark;
    lowerHull.parent = bodyContent;
    lowerHull.position.set(0, 2.5, 0);
    var deck = track((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("toy-tank-deck", 12.4, 1.2, 12.8, 0.5, scene, 4, 0.95));
    deck.material = materials.body;
    deck.parent = bodyContent;
    deck.position.set(0, 4.55, 0);
    var glacis = track((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("toy-tank-glacis", 6.4, 0.9, 3.0, 0.4, scene));
    glacis.material = materials.body;
    glacis.parent = bodyContent;
    glacis.position.set(0, 3.25, 6.0);
    glacis.rotation.x = 0.55;
    // Rivets along the fenders for that snap-together toy look.
    var rivetTemplate = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createTemplate)(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("toy-tank-rivet", { diameter: 0.38, segments: 8 }, scene), materials.cream);
    [-1, 1].forEach(function (side) {
        for (var i = 0; i < 6; i++) {
            var rivet = track(rivetTemplate.createInstance("toy-tank-rivet-".concat(side, "-").concat(i)));
            rivet.parent = bodyContent;
            rivet.position.set(side * 6.2, 4.55, -5 + i * 2);
        }
    });
    // Headlights
    [-1, 1].forEach(function (side) {
        var housing = track(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("toy-tank-headlight-".concat(side), { diameter: 1.1, height: 0.7, tessellation: 20 }, scene));
        housing.material = materials.cream;
        housing.parent = bodyContent;
        housing.rotation.x = Math.PI / 2;
        housing.position.set(side * 4.3, 5.55, 5.7);
        var lens = track(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("toy-tank-headlight-lens-".concat(side), { diameter: 0.8, height: 0.12, tessellation: 20 }, scene));
        lens.material = materials.lens;
        lens.parent = bodyContent;
        lens.rotation.x = Math.PI / 2;
        lens.position.set(side * 4.3, 5.55, 6.07);
    });
    // Exhaust pipes
    [-1, 1].forEach(function (side) {
        var pipe = track(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("toy-tank-exhaust-".concat(side), { diameter: 0.7, height: 1.6, tessellation: 16 }, scene));
        pipe.material = materials.gold;
        pipe.parent = bodyContent;
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(side * 3.2, 5.35, -6.3);
    });
    // Wind-up key on the back: the signature toy detail. It turns as the tank drives.
    var windUpKey = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("toy-tank-key", scene);
    windUpKey.parent = bodyContent;
    windUpKey.position.set(0, 3.0, -6.2);
    var keyShaft = track(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("toy-tank-key-shaft", { diameter: 0.45, height: 1.6, tessellation: 12 }, scene));
    keyShaft.material = materials.gold;
    keyShaft.parent = windUpKey;
    keyShaft.rotation.x = Math.PI / 2;
    keyShaft.position.z = -0.6;
    [-1, 1].forEach(function (side) {
        var wing = track(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("toy-tank-key-wing-".concat(side), { diameter: 1.7, height: 0.32, tessellation: 24 }, scene));
        // Flat discs lying in the plane of the shaft, like the bow of a real wind-up key.
        wing.material = materials.gold;
        wing.parent = windUpKey;
        wing.position.set(side * 0.95, 0, -1.45);
    });
    // ---------------------------------------------------------------- Turret
    var turret = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("toy-tank-turret", scene);
    turret.parent = bodyContent;
    turret.position.set(0, 5.15, -0.6);
    var turretRing = track(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("toy-tank-turret-ring", { diameter: 6.4, height: 0.5, tessellation: 40 }, scene));
    turretRing.material = materials.cream;
    turretRing.parent = turret;
    turretRing.position.y = 0.25;
    var turretShell = track((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("toy-tank-turret-shell", 6.8, 2.6, 7.2, 0.75, scene, 5, TURRET_TAPER));
    turretShell.material = materials.body;
    turretShell.parent = turret;
    turretShell.position.y = 1.8;
    var cupola = track(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("toy-tank-cupola", { diameter: 2.4, height: 0.6, tessellation: 32 }, scene));
    cupola.material = materials.bodyDark;
    cupola.parent = turret;
    cupola.position.set(-1.4, 3.35, -1.4);
    var hatch = track(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("toy-tank-hatch", { diameter: 2.1, segments: 20, slice: 0.5 }, scene));
    hatch.material = materials.cream;
    hatch.parent = turret;
    hatch.scaling.y = 0.55;
    hatch.position.set(-1.4, 3.6, -1.4);
    var periscope = track((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("toy-tank-periscope", 1.2, 0.7, 0.9, 0.2, scene));
    periscope.material = materials.cream;
    periscope.parent = turret;
    periscope.position.set(1.6, 3.3, 1.2);
    // Star decals on both turret sides
    var decalMaterial = createStarDecalMaterial(scene);
    [-1, 1].forEach(function (side) {
        var decal = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreatePlane("toy-star-decal-".concat(side), { size: 1.7 }, scene);
        decal.material = decalMaterial;
        decal.parent = turret;
        // Sit on the sloped turret side: at mid-height the side is at 3.4 * (1 + TURRET_TAPER) / 2.
        var sideSlope = Math.atan((3.4 * (1 - TURRET_TAPER)) / 2.6);
        decal.position.set(side * ((3.4 * (1 + TURRET_TAPER) / 2) + 0.03), 1.8, -0.4);
        decal.rotation.y = -side * Math.PI / 2;
        decal.rotation.x = sideSlope;
        decal.isPickable = false;
    });
    // Antenna (wobbles on a spring)
    var antenna = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("toy-tank-antenna", scene);
    antenna.parent = turret;
    antenna.position.set(1.9, 3.05, -2.2);
    var antennaBase = track(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("toy-tank-antenna-base", { diameter: 0.6, height: 0.4, tessellation: 12 }, scene));
    antennaBase.material = materials.bodyDark;
    antennaBase.parent = antenna;
    var antennaRod = track(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("toy-tank-antenna-rod", { diameterTop: 0.1, diameterBottom: 0.18, height: 4.2, tessellation: 8 }, scene));
    antennaRod.material = materials.rubber;
    antennaRod.parent = antenna;
    antennaRod.position.y = 2.1;
    var antennaTip = track(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("toy-tank-antenna-tip", { diameter: 0.55, segments: 12 }, scene));
    antennaTip.material = materials.accent;
    antennaTip.parent = antenna;
    antennaTip.position.y = 4.25;
    // ---------------------------------------------------------------- Gun
    var mantlet = track((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("toy-tank-mantlet", 3.4, 2.0, 1.4, 0.55, scene, 4, 0.88));
    mantlet.material = materials.bodyDark;
    mantlet.parent = turret;
    mantlet.position.set(0, BARREL_Y - turret.position.y, BARREL_START_Z - turret.position.z - 0.3);
    // The barrel slides back on this node when firing.
    var barrel = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("toy-tank-barrel", scene);
    barrel.parent = turret;
    barrel.position.set(0, BARREL_Y - turret.position.y, BARREL_START_Z - turret.position.z);
    var barrelTube = track(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("toy-tank-barrel-tube", { diameter: 0.9, height: BARREL_LENGTH, tessellation: 24 }, scene));
    barrelTube.material = materials.body;
    barrelTube.parent = barrel;
    barrelTube.rotation.x = Math.PI / 2;
    barrelTube.position.z = BARREL_LENGTH / 2;
    var barrelCollar = track(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("toy-tank-barrel-collar", { diameter: 1.2, height: 0.6, tessellation: 24 }, scene));
    barrelCollar.material = materials.cream;
    barrelCollar.parent = barrel;
    barrelCollar.rotation.x = Math.PI / 2;
    barrelCollar.position.z = 1.2;
    var muzzleBrake = track(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("toy-tank-muzzle", { diameter: 1.35, height: 1.2, tessellation: 24 }, scene));
    muzzleBrake.material = materials.gold;
    muzzleBrake.parent = barrel;
    muzzleBrake.rotation.x = Math.PI / 2;
    muzzleBrake.position.z = BARREL_LENGTH - 0.5;
    var muzzleFlash = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("toy-tank-muzzle-flash", { diameter: 1.6, segments: 12 }, scene);
    muzzleFlash.material = materials.flash;
    muzzleFlash.parent = barrel;
    muzzleFlash.position.z = BARREL_LENGTH + 0.5;
    muzzleFlash.isVisible = false;
    muzzleFlash.isPickable = false;
    // ---------------------------------------------------------------- Tracks and wheels
    var wheelSpinners = [];
    var cleatSides = [];
    var roadWheel = createWheelTemplates(scene, "road", ROAD_WHEEL_RADIUS, 2.0, materials);
    var endWheel = createWheelTemplates(scene, "end", END_WHEEL_RADIUS, 2.2, materials);
    var roller = createWheelTemplates(scene, "roller", RETURN_ROLLER_RADIUS, 1.6, materials);
    var cleatTemplate = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createTemplate)((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("toy-tank-cleat", TRACK_WIDTH + 0.2, 0.26, 0.5, 0.1, scene, 2), materials.cleat);
    [-1, 1].forEach(function (side) {
        var trackGroup = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("toy-tank-track-".concat(side), scene);
        trackGroup.parent = root;
        trackGroup.position.x = side * TRACK_X;
        var belt = track(createTrackBelt("toy-tank-belt-".concat(side), scene));
        belt.material = materials.rubber;
        belt.parent = trackGroup;
        var addWheel = function (templates, radius, y, z, index) {
            var spinner = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("toy-tank-wheel-".concat(side, "-").concat(index), scene);
            spinner.parent = trackGroup;
            spinner.position.set(0, y, z);
            var wheelBody = track(templates.body.createInstance("toy-tank-wheel-body-".concat(side, "-").concat(index)));
            wheelBody.parent = spinner;
            var hub = track(templates.hub.createInstance("toy-tank-wheel-hub-".concat(side, "-").concat(index)));
            hub.parent = spinner;
            if (side < 0) {
                hub.rotation.y = Math.PI;
            }
            wheelSpinners.push({ node: spinner, radius: radius, side: side });
        };
        var innerBottom = TRACK_CENTER_Y - TRACK_RADIUS + TRACK_THICKNESS;
        ROAD_WHEEL_Z.forEach(function (z, i) { return addWheel(roadWheel, ROAD_WHEEL_RADIUS, innerBottom + ROAD_WHEEL_RADIUS, z, "road".concat(i)); });
        addWheel(endWheel, END_WHEEL_RADIUS, TRACK_CENTER_Y, TRACK_END_Z, "front");
        addWheel(endWheel, END_WHEEL_RADIUS, TRACK_CENTER_Y, -TRACK_END_Z, "rear");
        var innerTop = TRACK_CENTER_Y + TRACK_RADIUS - TRACK_THICKNESS;
        RETURN_ROLLER_Z.forEach(function (z, i) { return addWheel(roller, RETURN_ROLLER_RADIUS, innerTop - RETURN_ROLLER_RADIUS, z, "roller".concat(i)); });
        var cleats = [];
        for (var i = 0; i < CLEAT_COUNT; i++) {
            var cleat = track(cleatTemplate.createInstance("toy-tank-cleat-".concat(side, "-").concat(i)));
            cleat.parent = trackGroup;
            cleats.push(cleat);
        }
        cleatSides.push({ side: side, cleats: cleats });
    });
    meshes.forEach(function (mesh) {
        mesh.isPickable = false;
    });
    // ---------------------------------------------------------------- Animation
    var cleatRadius = TRACK_RADIUS + 0.06;
    var cleatPerimeter = (4 * TRACK_END_Z) + (2 * Math.PI * cleatRadius);
    var cleatSpacing = cleatPerimeter / CLEAT_COUNT;
    var trackOffsets = new Map([[-1, 0], [1, 0]]);
    var wheelAngles = new Map();
    var placeCleats = function () {
        var _a;
        var _loop_1 = function (side, cleats) {
            var offset = (_a = trackOffsets.get(side)) !== null && _a !== void 0 ? _a : 0;
            cleats.forEach(function (cleat, i) {
                setCleatPose(cleat, (i * cleatSpacing) + offset, cleatRadius, cleatPerimeter);
            });
        };
        for (var _i = 0, cleatSides_1 = cleatSides; _i < cleatSides_1.length; _i++) {
            var _b = cleatSides_1[_i], side = _b.side, cleats = _b.cleats;
            _loop_1(side, cleats);
        }
    };
    placeCleats();
    var previousPosition = holder.position.clone();
    var previousYaw = (0,_core_math__WEBPACK_IMPORTED_MODULE_2__.getYaw)(holder);
    var previousSpeed = 0;
    var travelled = 0;
    var keyAngle = 0;
    var sway = { pitch: 0, pitchVelocity: 0, roll: 0, rollVelocity: 0 };
    var antennaSway = { x: 0, xVelocity: 0, z: 0, zVelocity: 0 };
    var recoil = 0;
    var flashTime = 0;
    var forwardVector = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
    var movement = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Zero();
    scene.onBeforeRenderObservable.add(function () {
        var _a, _b;
        var deltaSeconds = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
        if (deltaSeconds <= 0) {
            return;
        }
        // How the holder actually moved this frame (after physics), so the wheels match reality,
        // including when the tank is blocked or pushed.
        var yaw = (0,_core_math__WEBPACK_IMPORTED_MODULE_2__.getYaw)(holder);
        forwardVector.set(Math.sin(yaw), 0, Math.cos(yaw));
        holder.position.subtractToRef(previousPosition, movement);
        movement.y = 0;
        previousPosition.copyFrom(holder.position);
        var speed = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Dot(movement, forwardVector) / deltaSeconds;
        var yawRate = wrapAngle(yaw - previousYaw) / deltaSeconds;
        previousYaw = yaw;
        var acceleration = (speed - previousSpeed) / deltaSeconds;
        previousSpeed = speed;
        // Turning right speeds up the left track and slows the right one.
        for (var _i = 0, _c = [-1, 1]; _i < _c.length; _i++) {
            var side = _c[_i];
            var trackSpeed = speed - (side * yawRate * TRACK_X);
            trackOffsets.set(side, ((_a = trackOffsets.get(side)) !== null && _a !== void 0 ? _a : 0) + (trackSpeed * deltaSeconds));
        }
        placeCleats();
        for (var _d = 0, wheelSpinners_1 = wheelSpinners; _d < wheelSpinners_1.length; _d++) {
            var wheel = wheelSpinners_1[_d];
            var trackSpeed = speed - (wheel.side * yawRate * TRACK_X);
            var angle = ((_b = wheelAngles.get(wheel.node)) !== null && _b !== void 0 ? _b : 0) + ((trackSpeed / wheel.radius) * deltaSeconds);
            wheelAngles.set(wheel.node, angle);
            wheel.node.rotation.x = angle;
        }
        // Suspension: the nose lifts when accelerating, dips when braking, and the body leans
        // out of turns. Slightly under-damped so it settles with a little bounce.
        var clampedAcceleration = (0,_core_math__WEBPACK_IMPORTED_MODULE_2__.clamp)(acceleration, -80, 80);
        var pitchTarget = (0,_core_math__WEBPACK_IMPORTED_MODULE_2__.clamp)(-clampedAcceleration * 0.0011, -0.06, 0.06);
        var rollTarget = (0,_core_math__WEBPACK_IMPORTED_MODULE_2__.clamp)(speed * yawRate * 0.0022, -0.05, 0.05);
        stepSpring(sway, "pitch", "pitchVelocity", pitchTarget, 140, 9, deltaSeconds);
        stepSpring(sway, "roll", "rollVelocity", rollTarget, 140, 9, deltaSeconds);
        body.rotation.x = sway.pitch;
        body.rotation.z = sway.roll;
        // A tiny rattle while driving, like a plastic toy on a hard floor.
        travelled += Math.abs(speed) * deltaSeconds;
        var rattle = Math.min(1, Math.abs(speed) / 10) * 0.06;
        body.position.y = bodyPivotY + (Math.sin(travelled * 1.7) * rattle);
        // Antenna whips back when accelerating and swings out in turns.
        stepSpring(antennaSway, "x", "xVelocity", (0,_core_math__WEBPACK_IMPORTED_MODULE_2__.clamp)(-clampedAcceleration * 0.004, -0.3, 0.3), 70, 2.2, deltaSeconds);
        stepSpring(antennaSway, "z", "zVelocity", (0,_core_math__WEBPACK_IMPORTED_MODULE_2__.clamp)(speed * yawRate * 0.01, -0.25, 0.25), 70, 2.2, deltaSeconds);
        antenna.rotation.x = antennaSway.x;
        antenna.rotation.z = antennaSway.z;
        keyAngle += speed * 0.12 * deltaSeconds;
        windUpKey.rotation.z = keyAngle;
        recoil *= Math.exp(-9 * deltaSeconds);
        barrel.position.z = BARREL_START_Z - turret.position.z - recoil;
        if (flashTime > 0) {
            flashTime -= deltaSeconds;
            var progress = 1 - Math.max(0, flashTime) / 0.09;
            muzzleFlash.isVisible = flashTime > 0;
            muzzleFlash.scaling.setAll(0.6 + progress * 0.9);
        }
    });
    var muzzleHeight = (root.position.y * HOLDER_SIZE) + BARREL_Y;
    return {
        root: root,
        // Just clear of the barrel's collision box (see core/physics.ts), so shots don't hit the tank.
        muzzle: { forward: BARREL_START_Z + BARREL_LENGTH + 0.9, height: muzzleHeight },
        fire: function () {
            recoil = 1.0;
            flashTime = 0.09;
            muzzleFlash.isVisible = true;
            muzzleFlash.scaling.setAll(0.6);
            sway.pitchVelocity -= 0.9;
            antennaSway.xVelocity -= 2.5;
        },
    };
}
function createMaterials(scene) {
    var plastic = function (name, hex, roughness, metallic, clearCoat) {
        if (metallic === void 0) { metallic = 0; }
        if (clearCoat === void 0) { clearCoat = 0; }
        return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-tank-".concat(name), hex, { roughness: roughness, metallic: metallic, clearCoat: clearCoat });
    };
    var lens = plastic("lens", PALETTE.lens, 0.2);
    lens.emissiveColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString(PALETTE.lens).toLinearSpace().scale(0.9);
    var flash = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("toy-tank-flash", scene);
    flash.disableLighting = true;
    flash.emissiveColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString("#FFD27A");
    flash.alpha = 0.85;
    return {
        body: plastic("body", PALETTE.body, 0.5, 0, 0.55),
        bodyDark: plastic("body-dark", PALETTE.bodyDark, 0.55, 0, 0.4),
        cream: plastic("cream", PALETTE.cream, 0.55, 0, 0.35),
        gold: plastic("gold", PALETTE.gold, 0.32, 0.65, 0.3),
        accent: plastic("accent", PALETTE.accent, 0.45, 0, 0.5),
        rubber: plastic("rubber", PALETTE.rubber, 0.85),
        cleat: plastic("cleat", PALETTE.cleat, 0.75),
        lens: lens,
        flash: flash,
    };
}
/**
 * Wheel templates with their axle along X: a cream wheel body, and a gold hub cap with bolts on
 * the +X face (left-side wheels turn the hub around so it faces outward).
 */
function createWheelTemplates(scene, name, radius, width, materials) {
    var axleAlongX = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Matrix.RotationZ(Math.PI / 2);
    var tire = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("toy-tank-".concat(name, "-tire"), { diameter: radius * 2, height: width, tessellation: 28 }, scene);
    var rim = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("toy-tank-".concat(name, "-rim"), { diameter: radius * 1.35, height: width + 0.14, tessellation: 28 }, scene);
    var body = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.MergeMeshes([tire, rim], true, true);
    if (!body) {
        throw new Error("Failed to build toy tank wheel");
    }
    body.bakeTransformIntoVertices(axleAlongX);
    body.name = "toy-tank-".concat(name, "-wheel");
    (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createTemplate)(body, materials.cream);
    var hubParts = [];
    var cap = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("toy-tank-".concat(name, "-cap"), { diameter: radius * 0.75, height: 0.2, tessellation: 20 }, scene);
    cap.position.y = (width / 2) + 0.12;
    hubParts.push(cap);
    var boltCount = 5;
    for (var i = 0; i < boltCount; i++) {
        var angle = (i / boltCount) * Math.PI * 2;
        var bolt = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("toy-tank-".concat(name, "-bolt-").concat(i), { diameter: radius * 0.18, segments: 6 }, scene);
        bolt.position.set(Math.cos(angle) * radius * 0.5, (width / 2) + 0.1, Math.sin(angle) * radius * 0.5);
        hubParts.push(bolt);
    }
    var hub = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.MergeMeshes(hubParts, true, true);
    if (!hub) {
        throw new Error("Failed to build toy tank wheel hub");
    }
    // Cylinder axis is Y; rotating -90° around Z points the +Y face toward +X.
    hub.bakeTransformIntoVertices(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Matrix.RotationZ(-Math.PI / 2));
    hub.name = "toy-tank-".concat(name, "-hub");
    (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createTemplate)(hub, materials.gold);
    return { body: body, hub: hub };
}
/**
 * Places one track cleat on the belt loop. Distance 0 is the front of the bottom run; distance
 * grows backwards along the bottom, up the rear, forwards along the top and down the front, which
 * is the direction the belt moves (relative to the tank) when driving forward.
 */
function setCleatPose(cleat, distance, radius, perimeter) {
    var s = ((distance % perimeter) + perimeter) % perimeter;
    var straight = 2 * TRACK_END_Z;
    var arc = Math.PI * radius;
    var y;
    var z;
    var normalY;
    var normalZ;
    if (s < straight) {
        z = TRACK_END_Z - s;
        y = TRACK_CENTER_Y - radius;
        normalY = -1;
        normalZ = 0;
    }
    else if ((s -= straight) < arc) {
        var theta = s / radius;
        normalY = -Math.cos(theta);
        normalZ = -Math.sin(theta);
        z = -TRACK_END_Z + (normalZ * radius);
        y = TRACK_CENTER_Y + (normalY * radius);
    }
    else if ((s -= arc) < straight) {
        z = -TRACK_END_Z + s;
        y = TRACK_CENTER_Y + radius;
        normalY = 1;
        normalZ = 0;
    }
    else {
        s -= straight;
        var theta = s / radius;
        normalY = Math.cos(theta);
        normalZ = Math.sin(theta);
        z = TRACK_END_Z + (normalZ * radius);
        y = TRACK_CENTER_Y + (normalY * radius);
    }
    cleat.position.set(0, y, z);
    // Rotating around X by `a` turns the cleat's local up (0, 1, 0) into (0, cos a, sin a).
    cleat.rotation.x = Math.atan2(normalZ, normalY);
}
/**
 * Closed rubber belt around the track loop: a slightly bevelled rectangular profile swept around
 * a stadium shape (two straight runs joined by half circles).
 */
function createTrackBelt(name, scene) {
    var midRadius = TRACK_RADIUS - (TRACK_THICKNESS / 2);
    var loop = [];
    var straightSteps = 6;
    var arcSteps = 20;
    for (var i = 0; i < straightSteps; i++) {
        var t_1 = i / straightSteps;
        loop.push({ z: TRACK_END_Z - (2 * TRACK_END_Z * t_1), y: TRACK_CENTER_Y - midRadius, ny: -1, nz: 0 });
    }
    for (var i = 0; i < arcSteps; i++) {
        var theta = (i / arcSteps) * Math.PI;
        var ny = -Math.cos(theta);
        var nz = -Math.sin(theta);
        loop.push({ z: -TRACK_END_Z + (nz * midRadius), y: TRACK_CENTER_Y + (ny * midRadius), ny: ny, nz: nz });
    }
    for (var i = 0; i < straightSteps; i++) {
        var t_2 = i / straightSteps;
        loop.push({ z: -TRACK_END_Z + (2 * TRACK_END_Z * t_2), y: TRACK_CENTER_Y + midRadius, ny: 1, nz: 0 });
    }
    for (var i = 0; i < arcSteps; i++) {
        var theta = (i / arcSteps) * Math.PI;
        var ny = Math.cos(theta);
        var nz = Math.sin(theta);
        loop.push({ z: TRACK_END_Z + (nz * midRadius), y: TRACK_CENTER_Y + (ny * midRadius), ny: ny, nz: nz });
    }
    var w = TRACK_WIDTH / 2;
    var t = TRACK_THICKNESS / 2;
    var b = 0.08;
    // Profile points: x offset, radial offset (outward), and the normal in (x, radial).
    var profile = [
        [-w + b, t, -0.3, 1], [w - b, t, 0.3, 1], [w, t - b, 1, 0.3], [w, -t + b, 1, -0.3],
        [w - b, -t, 0.3, -1], [-w + b, -t, -0.3, -1], [-w, -t + b, -1, -0.3], [-w, t - b, -1, 0.3],
    ];
    var positions = [];
    var normals = [];
    for (var _i = 0, loop_1 = loop; _i < loop_1.length; _i++) {
        var point = loop_1[_i];
        for (var _a = 0, profile_1 = profile; _a < profile_1.length; _a++) {
            var _b = profile_1[_a], px = _b[0], pr = _b[1], nx = _b[2], nr = _b[3];
            positions.push(px, point.y + (point.ny * pr), point.z + (point.nz * pr));
            var length_1 = Math.hypot(nx, nr);
            normals.push(nx / length_1, (point.ny * nr) / length_1, (point.nz * nr) / length_1);
        }
    }
    var indices = [];
    var profileCount = profile.length;
    for (var i = 0; i < loop.length; i++) {
        var nextI = (i + 1) % loop.length;
        for (var j = 0; j < profileCount; j++) {
            var nextJ = (j + 1) % profileCount;
            var a = (i * profileCount) + j;
            var bIndex = (nextI * profileCount) + j;
            var c = (nextI * profileCount) + nextJ;
            var d = (i * profileCount) + nextJ;
            (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.pushOrientedTriangle)(indices, positions, normals, a, bIndex, c);
            (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.pushOrientedTriangle)(indices, positions, normals, a, c, d);
        }
    }
    return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.buildMesh)(name, positions, normals, indices, scene);
}
/** Sand roundel with a sakura-pink star, drawn once into a small texture. */
function createStarDecalMaterial(scene) {
    var size = 256;
    var texture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("toy-star-decal-texture", { width: size, height: size }, scene, true);
    texture.hasAlpha = true;
    var context = texture.getContext();
    var center = size / 2;
    context.clearRect(0, 0, size, size);
    context.fillStyle = PALETTE.cream;
    context.beginPath();
    context.arc(center, center, size * 0.47, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.accent;
    context.strokeStyle = PALETTE.bodyDark;
    context.lineWidth = size * 0.03;
    context.lineJoin = "round";
    context.beginPath();
    for (var i = 0; i < 10; i++) {
        var angle = (-Math.PI / 2) + (i * Math.PI / 5);
        var pointRadius = i % 2 === 0 ? size * 0.38 : size * 0.16;
        var x = center + (Math.cos(angle) * pointRadius);
        var y = center + (Math.sin(angle) * pointRadius);
        if (i === 0) {
            context.moveTo(x, y);
        }
        else {
            context.lineTo(x, y);
        }
    }
    context.closePath();
    context.fill();
    context.stroke();
    texture.update();
    var material = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("toy-star-decal", scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.emissiveColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.25, 0.22, 0.2);
    material.specularColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.15, 0.15, 0.15);
    material.zOffset = -2;
    return material;
}
function stepSpring(state, valueKey, velocityKey, target, stiffness, damping, deltaSeconds) {
    var value = state[valueKey];
    var velocity = state[velocityKey] + (((stiffness * (target - value)) - (damping * state[velocityKey])) * deltaSeconds);
    state[velocityKey] = velocity;
    state[valueKey] = (value + (velocity * deltaSeconds));
}
function wrapAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
}


/***/ },

/***/ "./src/scenes/tank/toyTarget.ts"
/*!**************************************!*\
  !*** ./src/scenes/tank/toyTarget.ts ***!
  \**************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createToyTarget: () => (/* binding */ createToyTarget)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");


var PALETTE = {
    backing: "#344B63",
    rim: "#E8DCC6",
    light: "#F4EBDD",
    accent: "#E8869F",
    bullseye: "#C9A35B",
    mark: "#344B63",
};
/** Rings from the outside in: radius, colour, and how far the ring's face stands out. */
var RINGS = [
    { radius: 1.7, color: "light", top: 0.16 },
    { radius: 1.36, color: "accent", top: 0.22 },
    { radius: 1.02, color: "light", top: 0.28 },
    { radius: 0.7, color: "accent", top: 0.34 },
    { radius: 0.4, color: "bullseye", top: 0.42 },
];
var materialCache = new WeakMap();
function getMaterials(scene) {
    var materials = materialCache.get(scene);
    if (!materials) {
        materials = {
            backing: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-target-backing", PALETTE.backing, { roughness: 0.45, clearCoat: 0.4 }),
            rim: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-target-rim", PALETTE.rim, { roughness: 0.45, clearCoat: 0.4 }),
            light: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-target-light", PALETTE.light, { roughness: 0.4, clearCoat: 0.6 }),
            accent: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-target-accent", PALETTE.accent, { roughness: 0.4, clearCoat: 0.6 }),
            bullseye: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-target-bullseye", PALETTE.bullseye, { roughness: 0.25, metallic: 0.6, clearCoat: 0.6 }),
            mark: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-target-mark", PALETTE.mark, { roughness: 0.4, clearCoat: 0.4 }),
        };
        materialCache.set(scene, materials);
    }
    return materials;
}
function createToyTarget(scene, target, mark) {
    var materials = getMaterials(scene);
    var meshes = [];
    var add = function (mesh) {
        mesh.isPickable = false;
        meshes.push(mesh);
        return mesh;
    };
    // Everything hangs off this node so the whole target can move when hit.
    var root = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("".concat(target.name, "-toy"), scene);
    root.parent = target;
    // Backing disc with a bevelled edge (a short cone on top of a cylinder) and a sand rim.
    var backing = add(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("".concat(target.name, "-backing"), { diameter: 3.8, height: 0.45, tessellation: 48 }, scene));
    backing.material = materials.backing;
    backing.parent = root;
    backing.position.y = -0.2;
    var bevel = add(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("".concat(target.name, "-bevel"), { diameterBottom: 3.8, diameterTop: 3.55, height: 0.14, tessellation: 48 }, scene));
    bevel.material = materials.backing;
    bevel.parent = root;
    bevel.position.y = 0.09;
    var rim = add(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateTorus("".concat(target.name, "-rim"), { diameter: 3.8, thickness: 0.26, tessellation: 48 }, scene));
    rim.material = materials.rim;
    rim.parent = root;
    rim.position.y = -0.2;
    // Raised rings, each a little taller than the one around it.
    for (var _i = 0, RINGS_1 = RINGS; _i < RINGS_1.length; _i++) {
        var ring = RINGS_1[_i];
        var height = ring.top + 0.05;
        var disc = add(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("".concat(target.name, "-ring-").concat(ring.radius), {
            diameterTop: (ring.radius * 2) - 0.06,
            diameterBottom: ring.radius * 2,
            height: height,
            tessellation: 48,
        }, scene));
        disc.material = materials[ring.color];
        disc.parent = root;
        disc.position.y = ring.top - (height / 2);
    }
    // The platform's mark on the bullseye.
    var label = createMarkPlane(scene, "".concat(target.name, "-mark"), mark);
    if (label) {
        label.parent = root;
        label.position.y = RINGS[RINGS.length - 1].top + 0.01;
        // Not added to `meshes`: the highlight glow would outline the whole square plane.
    }
    // Two little brackets at the back, as if it's screwed onto the podium.
    for (var _a = 0, _b = [-1, 1]; _a < _b.length; _a++) {
        var side = _b[_a];
        var bracket = add(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateBox("".concat(target.name, "-bracket-").concat(side), { width: 0.5, height: 0.5, depth: 0.9 }, scene));
        bracket.material = materials.rim;
        bracket.parent = root;
        bracket.position.set(0, -0.5, side * 1.2);
    }
    target.isVisible = false;
    // Hit feedback without any rotation: the target is knocked slightly back (along -Y, into the
    // podium) and springs back to its place.
    var hitTime = -1;
    var observer = scene.onBeforeRenderObservable.add(function () {
        if (hitTime < 0) {
            return;
        }
        hitTime += scene.getEngine().getDeltaTime() / 1000;
        var push = 0.12 * Math.exp(-hitTime * 9) * Math.cos(hitTime * 14);
        root.position.y = -push;
        if (hitTime > 0.6) {
            root.position.y = 0;
            hitTime = -1;
        }
    });
    target.onDisposeObservable.addOnce(function () { return scene.onBeforeRenderObservable.remove(observer); });
    return {
        meshes: meshes,
        hit: function () {
            hitTime = 0;
        },
    };
}
/**
 * A small flat plane lying on the bullseye with the mark drawn on it. The plane is rotated to lie
 * in the disc (facing +Y, the player).
 */
function createMarkPlane(scene, name, mark) {
    if (!mark) {
        return null;
    }
    var size = 256;
    var texture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("".concat(name, "-texture"), { width: size, height: size }, scene, true);
    texture.hasAlpha = true;
    var context = texture.getContext();
    context.clearRect(0, 0, size, size);
    context.fillStyle = PALETTE.mark;
    var fontSize = mark.length > 1 ? size * 0.46 : size * 0.6;
    context.font = "900 ".concat(fontSize, "px \"Arial Rounded MT Bold\", \"Nunito\", \"Trebuchet MS\", Arial, sans-serif");
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(mark, size / 2, size * 0.54);
    texture.update();
    var material = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("".concat(name, "-material"), scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.specularColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.1, 0.1, 0.1);
    material.emissiveColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.2, 0.2, 0.25);
    material.zOffset = -2;
    var plane = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreatePlane(name, { size: 0.72 }, scene);
    plane.material = material;
    // A plane faces -Z; tip it back so it faces +Y (out of the target), and turn it half way
    // around so the text is upright (the target's local +Z points down in the world).
    plane.rotation.set(Math.PI / 2, Math.PI, 0);
    plane.isPickable = false;
    return plane;
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
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
                    data = __assign(__assign({}, scene.metadata.postProcesses), { ssao: undefined, default: undefined });
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

/***/ "./src/scenes/ui/controlsOverlay.ts"
/*!******************************************!*\
  !*** ./src/scenes/ui/controlsOverlay.ts ***!
  \******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ControlOverlay: () => (/* binding */ ControlOverlay)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _style__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./style */ "./src/scenes/ui/style.ts");
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


/** The help card hides itself after this long on first load. */
var AUTO_DISMISS_MS = 10000;
/**
 * The "how to play" help card and the H / M shortcut badge, plus the keyboard shortcuts that
 * drive them: H toggles the help, Esc closes it and M mutes all sound.
 */
var ControlOverlay = /** @class */ (function () {
    function ControlOverlay(scene) {
        var _this = this;
        this.scene = scene;
        this.texture = null;
        this.panel = null;
        this.hint = null;
        this.dismissTimer = null;
        this.muted = false;
        this.handleHotkeys = function (event) {
            if (event.repeat) {
                return;
            }
            var key = event.key.toLowerCase();
            if (key === "h") {
                _this.toggle();
            }
            else if (key === "escape") {
                _this.hide();
            }
            else if (key === "m") {
                _this.toggleMute();
            }
        };
    }
    /** Builds the overlay and shows the help card (it hides itself after a while). */
    ControlOverlay.prototype.show = function () {
        return __awaiter(this, void 0, void 0, function () {
            var gui, _a, panel, hint;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, __webpack_require__.e(/*! import() */ "vendors-node_modules_babylonjs_gui_index_js").then(__webpack_require__.bind(__webpack_require__, /*! @babylonjs/gui */ "./node_modules/@babylonjs/gui/index.js"))];
                    case 1:
                        gui = _b.sent();
                        if (this.scene.isDisposed) {
                            return [2 /*return*/];
                        }
                        this.dispose();
                        this.texture = gui.AdvancedDynamicTexture.CreateFullscreenUI("control-overlay", true, this.scene);
                        _a = createControlOverlay(gui, this.texture, {
                            onToggle: function () { return _this.toggle(); },
                            onClose: function () { return _this.hide(); },
                            onToggleMute: function () { return _this.toggleMute(); },
                            isTouchDevice: window.matchMedia("(pointer: coarse)").matches,
                        }), panel = _a.panel, hint = _a.hint;
                        this.panel = panel;
                        this.hint = hint;
                        this.updateHint();
                        window.addEventListener("keydown", this.handleHotkeys);
                        this.dismissTimer = setTimeout(function () { return _this.hide(); }, AUTO_DISMISS_MS);
                        return [2 /*return*/];
                }
            });
        });
    };
    ControlOverlay.prototype.dispose = function () {
        var _a;
        this.clearDismissTimer();
        window.removeEventListener("keydown", this.handleHotkeys);
        (_a = this.texture) === null || _a === void 0 ? void 0 : _a.dispose();
        this.texture = null;
        this.panel = null;
        this.hint = null;
    };
    ControlOverlay.prototype.toggle = function () {
        if (!this.panel) {
            return;
        }
        // Manual interaction takes over; don't let the first-load auto-dismiss hide a reopened panel.
        this.clearDismissTimer();
        this.panel.isVisible = !this.panel.isVisible;
        this.updateHint();
    };
    ControlOverlay.prototype.hide = function () {
        var _a;
        this.clearDismissTimer();
        if (!((_a = this.panel) === null || _a === void 0 ? void 0 : _a.isVisible)) {
            return;
        }
        this.panel.isVisible = false;
        this.updateHint();
    };
    ControlOverlay.prototype.toggleMute = function () {
        var _a;
        this.muted = !this.muted;
        (_a = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Engine.audioEngine) === null || _a === void 0 ? void 0 : _a.setGlobalVolume(this.muted ? 0 : 1);
        this.updateHint();
    };
    ControlOverlay.prototype.updateHint = function () {
        var _a, _b;
        (_a = this.hint) === null || _a === void 0 ? void 0 : _a.update(!!((_b = this.panel) === null || _b === void 0 ? void 0 : _b.isVisible), this.muted);
    };
    ControlOverlay.prototype.clearDismissTimer = function () {
        if (this.dismissTimer) {
            clearTimeout(this.dismissTimer);
            this.dismissTimer = null;
        }
    };
    return ControlOverlay;
}());

/**
 * The "how to play" card (bottom right, shown on first load) and the shortcut badge in the top
 * right corner, in the same toy style as the rest of the UI.
 */
function createControlOverlay(gui, ui, options) {
    var panel = (0,_style__WEBPACK_IMPORTED_MODULE_1__.createCard)(gui, "controls-panel", { radius: 20 });
    panel.width = options.isTouchDevice ? "92%" : "370px";
    panel.height = "1px";
    panel.adaptHeightToChildren = true;
    panel.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_BOTTOM;
    panel.left = options.isTouchDevice ? "-4%" : "-22px";
    panel.top = "-24px";
    panel.isPointerBlocker = true;
    var stack = new gui.StackPanel("controls-panel-stack");
    stack.isVertical = true;
    stack.paddingTop = "16px";
    stack.paddingBottom = "18px";
    panel.addControl(stack);
    var eyebrow = (0,_style__WEBPACK_IMPORTED_MODULE_1__.createText)(gui, "controls-eyebrow", "HOW TO PLAY", { size: 12, weight: "900", color: _style__WEBPACK_IMPORTED_MODULE_1__.UI.pinkDeep });
    eyebrow.height = "18px";
    eyebrow.paddingLeft = "20px";
    stack.addControl(eyebrow);
    var title = (0,_style__WEBPACK_IMPORTED_MODULE_1__.createText)(gui, "controls-title", options.isTouchDevice ? "Best on a desktop" : "Drive, aim and explore", { size: 24, weight: "900", color: _style__WEBPACK_IMPORTED_MODULE_1__.UI.navy });
    title.height = "36px";
    title.paddingLeft = "20px";
    stack.addControl(title);
    var description = (0,_style__WEBPACK_IMPORTED_MODULE_1__.createText)(gui, "controls-description", options.isTouchDevice
        ? "The portfolio is built around keyboard driving. You can look around here, but driving and shooting need a keyboard."
        : "Drive the tank between the projects and shoot the glowing targets to open links.", { size: 14, weight: "700", color: _style__WEBPACK_IMPORTED_MODULE_1__.UI.muted });
    description.textWrapping = true;
    description.resizeToFit = true;
    description.paddingLeft = "20px";
    description.paddingRight = "20px";
    description.paddingBottom = "10px";
    stack.addControl(description);
    // One row per control: keycaps, then what they do.
    var rows = [
        { keys: ["W", "A", "S", "D"], text: "Drive the tank" },
        { keys: ["E"], text: "Shoot glowing targets" },
        { keys: ["H"], text: "Show or hide this help" },
        { keys: ["M"], text: "Sound on or off" },
        { keys: ["Esc"], text: "Close the help" },
    ];
    rows.forEach(function (row, index) {
        var line = (0,_style__WEBPACK_IMPORTED_MODULE_1__.createRow)(gui, "controls-line-".concat(index), 36);
        line.paddingLeft = "20px";
        line.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
        var keys = (0,_style__WEBPACK_IMPORTED_MODULE_1__.createRow)(gui, "controls-keys-".concat(index), 36);
        keys.width = "130px";
        row.keys.forEach(function (key, k) {
            var cap = (0,_style__WEBPACK_IMPORTED_MODULE_1__.createKeycap)(gui, "controls-key-".concat(index, "-").concat(k), key);
            cap.paddingRight = "4px";
            cap.width = "".concat(parseInt(String(cap.width), 10) + 4, "px");
            keys.addControl(cap);
        });
        line.addControl(keys);
        var text = (0,_style__WEBPACK_IMPORTED_MODULE_1__.createText)(gui, "controls-text-".concat(index), row.text, { size: 15, weight: "800", color: _style__WEBPACK_IMPORTED_MODULE_1__.UI.text });
        text.width = "200px";
        line.addControl(text);
        stack.addControl(line);
    });
    var actions = (0,_style__WEBPACK_IMPORTED_MODULE_1__.createRow)(gui, "controls-actions", 56);
    actions.paddingTop = "14px";
    actions.paddingLeft = "20px";
    actions.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    stack.addControl(actions);
    var closeButton = createButton(gui, "controls-close", "Got it!", _style__WEBPACK_IMPORTED_MODULE_1__.UI.pink, _style__WEBPACK_IMPORTED_MODULE_1__.UI.navyDeep, 110);
    closeButton.onPointerClickObservable.add(function () { return options.onClose(); });
    actions.addControl(closeButton);
    actions.addControl((0,_style__WEBPACK_IMPORTED_MODULE_1__.createSpacer)(gui, "controls-actions-gap", 10));
    var muteButton = createButton(gui, "controls-mute", "Sound on/off", _style__WEBPACK_IMPORTED_MODULE_1__.UI.cream, _style__WEBPACK_IMPORTED_MODULE_1__.UI.navy, 130);
    muteButton.onPointerClickObservable.add(function () { return options.onToggleMute(); });
    actions.addControl(muteButton);
    // Shortcut badge, top right (below the FPS counter): [H] Help  [M] Mute
    var badge = (0,_style__WEBPACK_IMPORTED_MODULE_1__.createCard)(gui, "controls-hint-badge", { radius: 18, thickness: 2 });
    badge.width = "1px";
    badge.adaptWidthToChildren = true;
    badge.height = "42px";
    badge.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    badge.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_TOP;
    badge.top = "54px";
    badge.left = "-14px";
    badge.shadowOffsetY = 3;
    badge.isPointerBlocker = true;
    badge.hoverCursor = "pointer";
    var badgeRow = (0,_style__WEBPACK_IMPORTED_MODULE_1__.createRow)(gui, "controls-hint-row", 42);
    badgeRow.paddingLeft = "8px";
    badgeRow.paddingRight = "8px";
    badge.addControl(badgeRow);
    var helpText = (0,_style__WEBPACK_IMPORTED_MODULE_1__.createText)(gui, "controls-hint-help", "", { size: 13, weight: "800", color: _style__WEBPACK_IMPORTED_MODULE_1__.UI.navy });
    var muteText = (0,_style__WEBPACK_IMPORTED_MODULE_1__.createText)(gui, "controls-hint-mute", "", { size: 13, weight: "800", color: _style__WEBPACK_IMPORTED_MODULE_1__.UI.navy });
    for (var _i = 0, _a = [["H", helpText], ["M", muteText]]; _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], text = _b[1];
        badgeRow.addControl((0,_style__WEBPACK_IMPORTED_MODULE_1__.createKeycap)(gui, "controls-hint-key-".concat(key), key));
        text.resizeToFit = true;
        text.paddingLeft = "7px";
        text.paddingRight = "9px";
        badgeRow.addControl(text);
    }
    badge.onPointerClickObservable.add(function () { return options.onToggle(); });
    ui.addControl(panel);
    ui.addControl(badge);
    (0,_style__WEBPACK_IMPORTED_MODULE_1__.refreshWhenFontLoaded)(ui);
    var hint = {
        update: function (helpVisible, muted) {
            helpText.text = helpVisible ? "Hide help" : "Help";
            muteText.text = muted ? "Unmute" : "Mute";
        },
    };
    return { panel: panel, hint: hint };
}
/** Chunky rounded button with a hard shadow. */
function createButton(gui, name, label, background, color, width) {
    var button = gui.Button.CreateSimpleButton(name, label);
    button.width = "".concat(width, "px");
    button.height = "40px";
    button.thickness = 3;
    button.cornerRadius = 20;
    button.color = _style__WEBPACK_IMPORTED_MODULE_1__.UI.navy;
    button.background = background;
    button.shadowColor = _style__WEBPACK_IMPORTED_MODULE_1__.UI.shadow;
    button.shadowOffsetY = 3;
    button.shadowBlur = 0;
    button.fontFamily = _style__WEBPACK_IMPORTED_MODULE_1__.UI.font;
    button.fontWeight = "900";
    button.fontSize = 14;
    if (button.textBlock) {
        button.textBlock.color = color;
    }
    button.hoverCursor = "pointer";
    button.pointerEnterAnimation = function () {
        button.scaleX = 1.04;
        button.scaleY = 1.04;
    };
    button.pointerOutAnimation = function () {
        button.scaleX = 1;
        button.scaleY = 1;
    };
    return button;
}


/***/ },

/***/ "./src/scenes/ui/fpsCounter.ts"
/*!*************************************!*\
  !*** ./src/scenes/ui/fpsCounter.ts ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   attachFpsCounter: () => (/* binding */ attachFpsCounter)
/* harmony export */ });
var UPDATE_INTERVAL_MS = 250;
/** Updates the FPS pill from index.html (#fps) a few times a second. Hidden on touch devices. */
function attachFpsCounter(scene) {
    var element = document.getElementById("fps");
    if (!element) {
        return;
    }
    element.hidden = window.matchMedia("(pointer: coarse)").matches;
    if (element.hidden) {
        return;
    }
    var engine = scene.getEngine();
    var lastUpdate = 0;
    var observer = scene.onBeforeRenderObservable.add(function () {
        var now = performance.now();
        if (now - lastUpdate >= UPDATE_INTERVAL_MS) {
            element.textContent = "".concat(engine.getFps().toFixed(), " fps");
            lastUpdate = now;
        }
    });
    scene.onDisposeObservable.addOnce(function () { return scene.onBeforeRenderObservable.remove(observer); });
}


/***/ },

/***/ "./src/scenes/ui/style.ts"
/*!********************************!*\
  !*** ./src/scenes/ui/style.ts ***!
  \********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   UI: () => (/* binding */ UI),
/* harmony export */   createCard: () => (/* binding */ createCard),
/* harmony export */   createKeycap: () => (/* binding */ createKeycap),
/* harmony export */   createRow: () => (/* binding */ createRow),
/* harmony export */   createSpacer: () => (/* binding */ createSpacer),
/* harmony export */   createText: () => (/* binding */ createText),
/* harmony export */   refreshWhenFontLoaded: () => (/* binding */ refreshWhenFontLoaded)
/* harmony export */ });
var UI = {
    cream: "#F4EBDD",
    sand: "#E8DCC6",
    navy: "#344B63",
    navyDeep: "#22313F",
    pink: "#E8869F",
    pinkDeep: "#C9667F",
    gold: "#D9A13B",
    mint: "#7CC9A0",
    text: "#2B3A4A",
    muted: "#6B7B8C",
    shadow: "rgba(26, 40, 56, 0.45)",
    font: "Nunito, \"Arial Rounded MT Bold\", \"Trebuchet MS\", sans-serif",
};
/** Redraws the UI once the web font has loaded (text drawn before that uses the fallback font). */
function refreshWhenFontLoaded(ui) {
    if (!("fonts" in document)) {
        return;
    }
    void Promise.all(["700", "800", "900"].map(function (weight) { return document.fonts.load("".concat(weight, " 16px Nunito")); }))
        .then(function () { return ui.markAsDirty(); })
        .catch(function () { return undefined; });
}
/** A cream card with a navy outline and a hard drop shadow. */
function createCard(gui, name, options) {
    var _a, _b, _c, _d;
    if (options === void 0) { options = {}; }
    var card = new gui.Rectangle(name);
    card.background = (_a = options.background) !== null && _a !== void 0 ? _a : UI.cream;
    card.color = (_b = options.border) !== null && _b !== void 0 ? _b : UI.navy;
    card.thickness = (_c = options.thickness) !== null && _c !== void 0 ? _c : 3;
    card.cornerRadius = (_d = options.radius) !== null && _d !== void 0 ? _d : 16;
    card.shadowColor = UI.shadow;
    card.shadowOffsetY = 4;
    card.shadowOffsetX = 0;
    card.shadowBlur = 0;
    return card;
}
function createText(gui, name, text, options) {
    var _a, _b, _c;
    if (options === void 0) { options = {}; }
    var block = new gui.TextBlock(name, text);
    block.fontFamily = UI.font;
    block.fontSize = (_a = options.size) !== null && _a !== void 0 ? _a : 15;
    block.fontWeight = (_b = options.weight) !== null && _b !== void 0 ? _b : "700";
    block.color = (_c = options.color) !== null && _c !== void 0 ? _c : UI.text;
    block.textHorizontalAlignment = options.align === "center" ? gui.Control.HORIZONTAL_ALIGNMENT_CENTER : gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    return block;
}
/** A keyboard key: navy rounded square with a cream letter and a darker "side" underneath. */
function createKeycap(gui, name, key) {
    var width = key.length > 1 ? 16 + (key.length * 9) : 28;
    var cap = new gui.Rectangle(name);
    cap.width = "".concat(width, "px");
    cap.height = "28px";
    cap.thickness = 0;
    cap.cornerRadius = 7;
    cap.background = UI.navy;
    cap.shadowColor = UI.navyDeep;
    cap.shadowOffsetY = 3;
    cap.shadowBlur = 0;
    var label = createText(gui, "".concat(name, "-label"), key, { size: 13, weight: "900", color: UI.cream, align: "center" });
    label.top = "-1px";
    cap.addControl(label);
    return cap;
}
/** Horizontal row of controls with a fixed height. */
function createRow(gui, name, height) {
    var row = new gui.StackPanel(name);
    row.isVertical = false;
    row.height = "".concat(height, "px");
    return row;
}
/** Fixed-width horizontal gap for rows. */
function createSpacer(gui, name, width) {
    var spacer = new gui.Rectangle(name);
    spacer.width = "".concat(width, "px");
    spacer.height = "1px";
    spacer.thickness = 0;
    return spacer;
}


/***/ },

/***/ "./src/scenes/ui/targetHud.ts"
/*!************************************!*\
  !*** ./src/scenes/ui/targetHud.ts ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createHitFeedback: () => (/* binding */ createHitFeedback),
/* harmony export */   createImpactBurst: () => (/* binding */ createImpactBurst),
/* harmony export */   createObjectiveHint: () => (/* binding */ createObjectiveHint),
/* harmony export */   createReticle: () => (/* binding */ createReticle),
/* harmony export */   createTargetLabel: () => (/* binding */ createTargetLabel)
/* harmony export */ });
/* harmony import */ var _style__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./style */ "./src/scenes/ui/style.ts");

var OBJECTIVE_MOODS = {
    explore: { label: "EXPLORE", color: _style__WEBPACK_IMPORTED_MODULE_0__.UI.navy },
    nearby: { label: "TARGET NEARBY", color: _style__WEBPACK_IMPORTED_MODULE_0__.UI.gold },
    locked: { label: "LOCKED ON", color: _style__WEBPACK_IMPORTED_MODULE_0__.UI.pink },
    found: { label: "NEW LINK FOUND", color: _style__WEBPACK_IMPORTED_MODULE_0__.UI.mint },
    hit: { label: "DIRECT HIT", color: _style__WEBPACK_IMPORTED_MODULE_0__.UI.mint },
};
/**
 * The card in the top-left corner: a coloured eyebrow saying what is going on, progress pips for
 * the links found so far, and the current hint.
 */
function createObjectiveHint(gui, ui) {
    var card = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createCard)(gui, "objective-hint");
    card.width = "360px";
    card.height = "1px";
    card.adaptHeightToChildren = true;
    card.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    card.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_TOP;
    card.left = "18px";
    card.top = "18px";
    card.zIndex = 2;
    card.isPointerBlocker = false;
    var stack = new gui.StackPanel("objective-hint-stack");
    stack.isVertical = true;
    stack.paddingTop = "12px";
    stack.paddingBottom = "14px";
    card.addControl(stack);
    var header = new gui.Grid("objective-hint-header");
    header.height = "26px";
    header.paddingLeft = "16px";
    header.paddingRight = "16px";
    header.addColumnDefinition(1);
    header.addColumnDefinition(90, true);
    stack.addControl(header);
    var badge = new gui.Rectangle("objective-hint-badge");
    badge.height = "24px";
    badge.width = "1px";
    badge.adaptWidthToChildren = true;
    badge.thickness = 0;
    badge.cornerRadius = 12;
    badge.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    var badgeText = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createText)(gui, "objective-hint-badge-text", "", { size: 12, weight: "900", color: _style__WEBPACK_IMPORTED_MODULE_0__.UI.cream, align: "center" });
    badgeText.resizeToFit = true;
    badgeText.paddingLeft = "10px";
    badgeText.paddingRight = "10px";
    badge.addControl(badgeText);
    header.addControl(badge, 0, 0);
    var pips = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createRow)(gui, "objective-hint-pips", 24);
    pips.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    header.addControl(pips, 0, 1);
    var pipControls = [];
    var text = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createText)(gui, "objective-hint-text", "", { size: 15, weight: "700" });
    text.textWrapping = true;
    text.resizeToFit = true;
    text.lineSpacing = "2px";
    text.paddingLeft = "16px";
    text.paddingRight = "16px";
    text.paddingTop = "8px";
    stack.addControl(text);
    ui.addControl(card);
    (0,_style__WEBPACK_IMPORTED_MODULE_0__.refreshWhenFontLoaded)(ui);
    var lastStatus = "";
    var hint = {
        get text() {
            return text.text;
        },
        set text(value) {
            text.text = value;
        },
        setStatus: function (mood, found, total) {
            var key = "".concat(mood, ":").concat(found, ":").concat(total);
            if (key === lastStatus) {
                return;
            }
            lastStatus = key;
            badgeText.text = OBJECTIVE_MOODS[mood].label;
            badge.background = OBJECTIVE_MOODS[mood].color;
            // One pip per link: filled pink once found.
            while (pipControls.length < total) {
                // Little toy blocks: sand while missing, pink once found.
                var slot = new gui.Rectangle("objective-hint-pip-slot-".concat(pipControls.length));
                slot.width = "24px";
                slot.height = "24px";
                slot.thickness = 0;
                var pip = new gui.Rectangle("objective-hint-pip-".concat(pipControls.length));
                pip.width = "18px";
                pip.height = "18px";
                pip.thickness = 2;
                pip.cornerRadius = 5;
                pip.color = _style__WEBPACK_IMPORTED_MODULE_0__.UI.navy;
                slot.addControl(pip);
                pips.addControl(slot);
                pipControls.push(pip);
            }
            pipControls.forEach(function (pip, i) {
                pip.background = i < found ? _style__WEBPACK_IMPORTED_MODULE_0__.UI.pink : _style__WEBPACK_IMPORTED_MODULE_0__.UI.sand;
            });
        },
    };
    return hint;
}
function createReticle(gui, ui) {
    // Round sight: a cream ring with a navy outline (drawn as the shadow) and a dot in the middle.
    var frame = new gui.Rectangle("reticle-frame");
    frame.width = "34px";
    frame.height = "34px";
    frame.thickness = 3;
    frame.cornerRadius = 17;
    frame.color = _style__WEBPACK_IMPORTED_MODULE_0__.UI.cream;
    frame.background = "transparent";
    frame.shadowColor = _style__WEBPACK_IMPORTED_MODULE_0__.UI.navyDeep;
    frame.shadowBlur = 0;
    frame.shadowOffsetY = 2;
    frame.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_CENTER;
    frame.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_CENTER;
    frame.isPointerBlocker = false;
    var dot = new gui.Rectangle("reticle-dot");
    dot.width = "8px";
    dot.height = "8px";
    dot.thickness = 0;
    dot.cornerRadius = 4;
    dot.background = _style__WEBPACK_IMPORTED_MODULE_0__.UI.cream;
    frame.addControl(dot);
    // Grows while the gun reloads.
    var cooldown = new gui.Ellipse("reticle-cooldown");
    cooldown.width = "16px";
    cooldown.height = "16px";
    cooldown.thickness = 3;
    cooldown.color = _style__WEBPACK_IMPORTED_MODULE_0__.UI.gold;
    cooldown.alpha = 0;
    cooldown.isPointerBlocker = false;
    ui.addControl(cooldown);
    // Status pill under the sight.
    var pill = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createCard)(gui, "reticle-pill", { radius: 12, thickness: 2 });
    pill.height = "26px";
    pill.width = "1px";
    pill.adaptWidthToChildren = true;
    pill.top = "40px";
    pill.shadowOffsetY = 3;
    pill.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_CENTER;
    pill.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_CENTER;
    pill.isPointerBlocker = false;
    var label = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createText)(gui, "reticle-label", "0/0 LINKS FOUND", { size: 12, weight: "900", color: _style__WEBPACK_IMPORTED_MODULE_0__.UI.navy, align: "center" });
    label.resizeToFit = true;
    label.paddingLeft = "12px";
    label.paddingRight = "12px";
    label.isPointerBlocker = false;
    pill.addControl(label);
    ui.addControl(frame);
    ui.addControl(pill);
    // Hidden until a target is in range (see the update loop), so it doesn't sit on the tank.
    frame.isVisible = false;
    pill.isVisible = false;
    return { frame: frame, dot: dot, label: label, pill: pill, cooldown: cooldown };
}
function createHitFeedback(gui, ui) {
    var container = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createCard)(gui, "hit-feedback", { radius: 18, background: _style__WEBPACK_IMPORTED_MODULE_0__.UI.mint, border: _style__WEBPACK_IMPORTED_MODULE_0__.UI.navy });
    container.width = "150px";
    container.height = "40px";
    container.linkOffsetY = -96;
    container.isPointerBlocker = false;
    container.isVisible = false;
    var text = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createText)(gui, "hit-feedback-text", "DIRECT HIT!", { size: 16, weight: "900", color: _style__WEBPACK_IMPORTED_MODULE_0__.UI.navyDeep, align: "center" });
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
    container.linkOffsetY = -96;
    container.isPointerBlocker = false;
    container.isVisible = false;
    var ring = new gui.Ellipse("impact-burst-ring");
    ring.width = "90px";
    ring.height = "90px";
    ring.thickness = 5;
    ring.color = _style__WEBPACK_IMPORTED_MODULE_0__.UI.gold;
    ring.background = "rgba(217, 161, 59, 0.12)";
    ring.alpha = 0.9;
    container.addControl(ring);
    ui.addControl(container);
    return { container: container, ring: ring };
}
/**
 * A little speech-bubble card above a target with its name, shown when the tank is close by.
 */
function createTargetLabel(gui, ui, mesh, label) {
    var container = new gui.Rectangle("label-".concat(mesh.name));
    container.width = "170px";
    container.height = "70px";
    container.thickness = 0;
    container.linkOffsetY = -86;
    container.isPointerBlocker = false;
    container.isVisible = false;
    // Pointer: a rotated square peeking out under the card.
    var pointer = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createCard)(gui, "label-pointer-".concat(mesh.name), { radius: 3 });
    pointer.width = "16px";
    pointer.height = "16px";
    pointer.rotation = Math.PI / 4;
    pointer.top = "24px";
    pointer.shadowOffsetY = 0;
    container.addControl(pointer);
    var card = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createCard)(gui, "label-card-".concat(mesh.name), { radius: 14 });
    card.height = "54px";
    card.top = "-6px";
    card.shadowOffsetY = 0;
    container.addControl(card);
    var name = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createText)(gui, "label-name-".concat(mesh.name), label, { size: 16, weight: "900", color: _style__WEBPACK_IMPORTED_MODULE_0__.UI.navy, align: "center" });
    name.top = "-8px";
    card.addControl(name);
    var action = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createText)(gui, "label-action-".concat(mesh.name), "Shoot to open", { size: 12, weight: "800", color: _style__WEBPACK_IMPORTED_MODULE_0__.UI.pinkDeep, align: "center" });
    action.top = "11px";
    card.addControl(action);
    // The control must be on the texture before it can follow a mesh.
    ui.addControl(container);
    container.linkWithMesh(mesh);
    return container;
}


/***/ },

/***/ "./src/scenes/ui/tradingHud.ts"
/*!*************************************!*\
  !*** ./src/scenes/ui/tradingHud.ts ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createTradingHud: () => (/* binding */ createTradingHud)
/* harmony export */ });
/* harmony import */ var _style__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./style */ "./src/scenes/ui/style.ts");

function createTradingHud(gui, ui) {
    var card = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createCard)(gui, "trading-hud");
    card.width = "340px";
    card.height = "1px";
    card.adaptHeightToChildren = true;
    card.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_CENTER;
    card.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_TOP;
    card.top = "18px";
    card.zIndex = 2;
    card.isPointerBlocker = false;
    card.isVisible = false;
    var stack = new gui.StackPanel("trading-hud-stack");
    stack.isVertical = true;
    stack.paddingTop = "10px";
    stack.paddingBottom = "12px";
    card.addControl(stack);
    var badge = new gui.Rectangle("trading-hud-badge");
    badge.height = "24px";
    badge.width = "1px";
    badge.adaptWidthToChildren = true;
    badge.thickness = 0;
    badge.cornerRadius = 12;
    var badgeText = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createText)(gui, "trading-hud-badge-text", "", { size: 12, weight: "900", color: _style__WEBPACK_IMPORTED_MODULE_0__.UI.cream, align: "center" });
    badgeText.resizeToFit = true;
    badgeText.paddingLeft = "10px";
    badgeText.paddingRight = "10px";
    badge.addControl(badgeText);
    stack.addControl(badge);
    var main = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createText)(gui, "trading-hud-main", "", { size: 20, weight: "900", color: _style__WEBPACK_IMPORTED_MODULE_0__.UI.navy, align: "center" });
    main.height = "32px";
    main.paddingTop = "6px";
    stack.addControl(main);
    var detail = (0,_style__WEBPACK_IMPORTED_MODULE_0__.createText)(gui, "trading-hud-detail", "", { size: 14, weight: "800", color: _style__WEBPACK_IMPORTED_MODULE_0__.UI.muted, align: "center" });
    detail.textWrapping = true;
    detail.resizeToFit = true;
    detail.paddingLeft = "14px";
    detail.paddingRight = "14px";
    detail.paddingTop = "2px";
    stack.addControl(detail);
    ui.addControl(card);
    (0,_style__WEBPACK_IMPORTED_MODULE_0__.refreshWhenFontLoaded)(ui);
    var last = "";
    return {
        setVisible: function (visible) {
            card.isVisible = visible;
        },
        set: function (badgeLabel, badgeColor, mainText, detailText, mainColor) {
            if (mainColor === void 0) { mainColor = _style__WEBPACK_IMPORTED_MODULE_0__.UI.navy; }
            var key = [badgeLabel, badgeColor, mainText, detailText, mainColor].join("|");
            if (key === last) {
                return;
            }
            last = key;
            badgeText.text = badgeLabel;
            badge.background = badgeColor;
            main.text = mainText;
            main.color = mainColor;
            detail.text = detailText;
        },
    };
}


/***/ },

/***/ "./src/scenes/world/aiTrophies.ts"
/*!****************************************!*\
  !*** ./src/scenes/world/aiTrophies.ts ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createAiTrophies: () => (/* binding */ createAiTrophies)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");
/* harmony import */ var _core_constants__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/constants */ "./src/scenes/core/constants.ts");
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};



var HALF_HEIGHT = 4;
var LOGO_Y = 1.5;
/** The logo is drawn a bit larger than the plinth so it's easy to recognise. */
var LOGO_SCALE = 1.15;
var PALETTE = {
    plinth: "#344B63",
    plinthTop: "#E8DCC6",
    gold: "#C9A35B",
};
/** Where the figure at the desk stood. */
var FIGURE_AT_DESK = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector2(-86.3, -4.8);
/** Size of the standing trophies (1 = the old figures' 4 x 8 x 4 box). */
var STANDING_SCALE = 1.5;
/**
 * Standing trophies: ChatGPT and Gemini on the camera's side of the brick wall by the Berserk
 * sword (so the wall doesn't hide them), Mistral close to the tank's start (visible straight
 * away), and DeepSeek and Hugging Face out in open areas of the world. All spots are clear of
 * other physics bodies so nothing starts out overlapping.
 */
var SPOTS = [
    { logo: "claude", label: "Claude", x: FIGURE_AT_DESK.x, z: FIGURE_AT_DESK.y, yawOffset: 0, pushable: false, scale: 1.1 },
    { logo: "chatgpt", label: "ChatGPT", x: 23, z: 114, yawOffset: 0.12, pushable: true, scale: STANDING_SCALE },
    { logo: "gemini", label: "Gemini", x: 31, z: 124, yawOffset: -0.1, pushable: true, scale: STANDING_SCALE },
    { logo: "mistral", label: "Mistral", x: 30, z: -4, yawOffset: 0.08, pushable: true, scale: STANDING_SCALE },
    { logo: "deepseek", label: "DeepSeek", x: -28, z: 36, yawOffset: -0.12, pushable: true, scale: STANDING_SCALE },
    { logo: "huggingface", label: "Hugging Face", x: 72, z: -100, yawOffset: 0.14, pushable: true, scale: STANDING_SCALE },
];
function createAiTrophies(scene) {
    removeFigures(scene);
    var shared = {
        plinth: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "ai-trophy-plinth", PALETTE.plinth, { roughness: 0.45, clearCoat: 0.4 }),
        plinthTop: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "ai-trophy-plinth-top", PALETTE.plinthTop, { roughness: 0.45, clearCoat: 0.35 }),
        gold: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "ai-trophy-gold", PALETTE.gold, { roughness: 0.25, metallic: 0.6, clearCoat: 0.6 }),
    };
    for (var _i = 0, SPOTS_1 = SPOTS; _i < SPOTS_1.length; _i++) {
        var spot = SPOTS_1[_i];
        try {
            createTrophy(scene, spot, shared);
        }
        catch (error) {
            console.error("AI trophy \"".concat(spot.label, "\" failed"), error);
        }
    }
}
function removeFigures(scene) {
    var _a, _b;
    var physics = scene.getPhysicsEngine();
    var figures = scene.meshes.filter(function (mesh) { return mesh.name === "amongus" && !mesh.parent; });
    for (var _i = 0, figures_1 = figures; _i < figures_1.length; _i++) {
        var figure = figures_1[_i];
        // The scene loader creates the physics bodies without setting mesh.physicsImpostor, so
        // disposing the mesh alone would leave an invisible body behind for the trophies to hit.
        (_b = ((_a = figure.physicsImpostor) !== null && _a !== void 0 ? _a : physics === null || physics === void 0 ? void 0 : physics.getImpostorForPhysicsObject(figure))) === null || _b === void 0 ? void 0 : _b.dispose();
        figure.dispose();
    }
}
function createTrophy(scene, spot, shared) {
    var _a;
    var id = "ai-trophy-".concat(spot.logo);
    var yaw = _core_constants__WEBPACK_IMPORTED_MODULE_2__.FACE_CAMERA_YAW + spot.yawOffset;
    var centerY = _core_constants__WEBPACK_IMPORTED_MODULE_2__.GROUND_Y + (HALF_HEIGHT * spot.scale) + 0.05;
    // Root: a physics box for the pushable ones (impostor created before any children are added),
    // a plain node for the one at the desk.
    var holder;
    if (spot.pushable) {
        var collider = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateBox("".concat(id, "-collider"), { width: 4 * spot.scale, height: HALF_HEIGHT * 2 * spot.scale, depth: 4 * spot.scale }, scene);
        collider.position.set(spot.x, centerY, spot.z);
        collider.rotation.y = yaw;
        collider.isVisible = false;
        collider.isPickable = false;
        // No bounce and decent grip: a bump from the tank slides and tips them instead of
        // sending them flying. Light damping, so they still fall at full speed.
        var impostor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor(collider, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor.BoxImpostor, { mass: 3, friction: 0.6, restitution: 0 }, scene);
        collider.physicsImpostor = impostor;
        var body = impostor.physicsBody;
        if (body) {
            body.linearDamping = 0.15;
            body.angularDamping = 0.3;
        }
        holder = collider;
    }
    else {
        holder = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("".concat(id, "-holder"), scene);
        holder.position.set(spot.x, centerY, spot.z);
        holder.rotation.y = yaw;
    }
    // Everything visible is built at size 1 under this node.
    var root = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode(id, scene);
    root.parent = holder;
    root.scaling.setAll(spot.scale);
    var parts = [];
    var attach = function (mesh) {
        var _a;
        mesh.parent = root;
        mesh.isPickable = false;
        mesh.metadata = __assign(__assign({}, ((_a = mesh.metadata) !== null && _a !== void 0 ? _a : {})), { keepUnfrozen: true });
        parts.push(mesh);
        return mesh;
    };
    // Plinth with a sand top.
    var plinth = attach((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("".concat(id, "-plinth"), 3.8, 1.5, 3.8, 0.3, scene));
    plinth.material = shared.plinth;
    plinth.position.y = -HALF_HEIGHT + 0.75;
    var top = attach((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("".concat(id, "-plinth-top"), 3.3, 0.3, 3.3, 0.12, scene));
    top.material = shared.plinthTop;
    top.position.y = -HALF_HEIGHT + 1.55;
    var collar = attach(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("".concat(id, "-collar"), { diameterTop: 0.8, diameterBottom: 1.3, height: 0.45, tessellation: 24 }, scene));
    collar.material = shared.gold;
    collar.position.y = -HALF_HEIGHT + 1.9;
    var stem = attach(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("".concat(id, "-stem"), { diameter: 0.45, height: 3, tessellation: 16 }, scene));
    stem.material = shared.gold;
    stem.position.set(0, -HALF_HEIGHT + 3.4, 0.15);
    // The logo itself.
    var logo = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("".concat(id, "-logo"), scene);
    logo.parent = root;
    logo.position.y = LOGO_Y;
    logo.scaling.setAll(LOGO_SCALE);
    for (var _i = 0, _b = LOGO_BUILDERS[spot.logo](scene, id); _i < _b.length; _i++) {
        var mesh = _b[_i];
        mesh.parent = logo;
        mesh.isPickable = false;
        mesh.metadata = __assign(__assign({}, ((_a = mesh.metadata) !== null && _a !== void 0 ? _a : {})), { keepUnfrozen: true });
    }
}
var LOGO_BUILDERS = {
    claude: buildClaude,
    chatgpt: buildChatGpt,
    gemini: buildGemini,
    mistral: buildMistral,
    deepseek: buildDeepSeek,
    huggingface: buildHuggingFace,
};
/** Claude: a terracotta spark of rounded rays with slightly uneven lengths. */
function buildClaude(scene, id) {
    var lengths = [1.95, 1.62, 1.84, 1.55, 1.92, 1.7, 1.58, 1.88, 1.66, 1.8, 1.6, 1.86];
    var rays = lengths.map(function (length, i) {
        var angle = ((i / lengths.length) * Math.PI * 2) + 0.13 + (Math.sin(i * 2.3) * 0.05);
        var outline = taperedCapsule(length, 0.13, 0.25);
        var ray = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.extrudeOutline)("".concat(id, "-ray-").concat(i), rotate2d(outline, angle), 0.55, 0.1, scene);
        return ray;
    });
    var spark = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.MergeMeshes(rays, true, true);
    if (!spark) {
        return [];
    }
    spark.name = "".concat(id, "-spark");
    spark.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "".concat(id, "-material"), "#D97757", { roughness: 0.38, clearCoat: 0.6 });
    return [spark];
}
/** ChatGPT: the white six-link knot on a teal rounded tile. */
function buildChatGpt(scene, id) {
    var tile = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("".concat(id, "-tile"), 3.8, 3.8, 0.5, 0.7, scene);
    tile.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "".concat(id, "-tile-material"), "#10A37F", { roughness: 0.4, clearCoat: 0.6 });
    tile.position.z = 0.1;
    var links = [];
    var halfLength = 0.5;
    var radius = 0.36;
    for (var k = 0; k < 6; k++) {
        var angle = k * (Math.PI / 3);
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);
        var z = -0.32 - ((k % 2) * 0.06);
        // A rounded "link" offset from the centre and slid sideways, so the six of them swirl
        // around a hexagonal opening.
        var path = [];
        for (var _i = 0, _a = stadium(halfLength, radius, 40); _i < _a.length; _i++) {
            var _b = _a[_i], x = _b[0], y = _b[1];
            var lx = x + 0.32;
            var ly = y - 0.62;
            path.push(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3((lx * cos) - (ly * sin), (lx * sin) + (ly * cos), z));
        }
        path.push(path[0].clone());
        links.push(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateTube("".concat(id, "-link-").concat(k), { path: path, radius: 0.13, tessellation: 12, cap: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.NO_CAP }, scene));
    }
    var knot = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.MergeMeshes(links, true, true);
    if (knot) {
        knot.name = "".concat(id, "-knot");
        knot.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "".concat(id, "-knot-material"), "#FFFFFF", { roughness: 0.35, clearCoat: 0.6 });
        knot.scaling.setAll(1.12);
        return [tile, knot];
    }
    return [tile];
}
/** Gemini: a four-pointed sparkle with concave sides and a blue-to-purple-to-rose gradient. */
function buildGemini(scene, id) {
    var outline = [];
    var steps = 128;
    var radius = 1.95;
    var power = 2.4;
    for (var i = 0; i < steps; i++) {
        var t = (i / steps) * Math.PI * 2;
        var c = Math.cos(t);
        var s = Math.sin(t);
        outline.push([radius * Math.sign(c) * Math.pow(Math.abs(c), power), radius * Math.sign(s) * Math.pow(Math.abs(s), power)]);
    }
    var star = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.extrudeOutline)("".concat(id, "-star"), outline, 0.6, 0.12, scene);
    var stops = ["#4796E3", "#9177C7", "#CA6673"].map(function (hex) { return _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString(hex).toLinearSpace(); });
    paintVertices(star, function (x, y) {
        var t = clampUnit((((x * 0.45) + (y * 0.9)) / (radius * 1.35) + 1) / 2);
        var _a = t < 0.5 ? [stops[0], stops[1], t * 2] : [stops[1], stops[2], (t - 0.5) * 2], a = _a[0], b = _a[1], f = _a[2];
        return _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.Lerp(a, b, f);
    });
    star.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "".concat(id, "-material"), "#FFFFFF", { roughness: 0.35, clearCoat: 0.7 });
    return [star];
}
/** Mistral: a blocky "M" of toy cubes, yellow at the top to red at the bottom. */
function buildMistral(scene, id) {
    var pattern = [
        "X...X",
        "XX.XX",
        "XXXXX",
        "X.X.X",
        "X...X",
    ];
    var rowColors = ["#FFD800", "#FFAF00", "#FF8205", "#FA500F", "#E10500"];
    var pitch = 0.74;
    var size = 0.7;
    var meshes = [];
    pattern.forEach(function (row, r) {
        var blocks = [];
        for (var c = 0; c < row.length; c++) {
            if (row[c] !== "X") {
                continue;
            }
            var block = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("".concat(id, "-block-").concat(r, "-").concat(c), size, size, size, 0.12, scene, 2);
            block.position.set((c - 2) * pitch, (2 - r) * pitch, 0);
            blocks.push(block);
        }
        var merged = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.MergeMeshes(blocks, true, true);
        if (merged) {
            merged.name = "".concat(id, "-row-").concat(r);
            merged.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "".concat(id, "-row-").concat(r, "-material"), rowColors[r], { roughness: 0.4, clearCoat: 0.6 });
            meshes.push(merged);
        }
    });
    return meshes;
}
/** DeepSeek: a friendly blue whale with a curled-up tail. */
function buildDeepSeek(scene, id) {
    var blue = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "".concat(id, "-material"), "#4D6BFE", { roughness: 0.38, clearCoat: 0.6 });
    // Body: a rounded blob with a big head on the left, narrowing towards the tail.
    var body = [];
    for (var i = 0; i < 64; i++) {
        var t = (i / 64) * Math.PI * 2;
        var c = Math.cos(t);
        var s = Math.sin(t);
        var taper = 1 - (0.5 * Math.max(c, 0));
        var belly_1 = s < 0 ? 0.82 : 1;
        body.push([-0.35 + (1.45 * c), -0.35 + (0.95 * s * taper * belly_1)]);
    }
    var bodyMesh = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.extrudeOutline)("".concat(id, "-body"), body, 0.75, 0.16, scene);
    // Tail: curls up from the back of the body, ending in two flukes.
    var tailPath = [];
    for (var i = 0; i <= 16; i++) {
        var t = i / 16;
        var x = ((1 - t) * (1 - t) * 0.85) + (2 * (1 - t) * t * 1.75) + (t * t * 1.45);
        var y = ((1 - t) * (1 - t) * -0.4) + (2 * (1 - t) * t * -0.45) + (t * t * 0.75);
        tailPath.push(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(x, y, 0));
    }
    var tail = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateTube("".concat(id, "-tail"), {
        path: tailPath,
        radiusFunction: function (i) { return 0.27 - ((i / 16) * 0.13); },
        tessellation: 16,
        cap: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.CAP_ALL,
    }, scene);
    tail.scaling.z = 1.35;
    var flukes = [-1, 1].map(function (side) {
        var fluke = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.extrudeOutline)("".concat(id, "-fluke-").concat(side), rotate2d(ellipse(0.5, 0.2, 24), side * 0.75), 0.4, 0.08, scene);
        fluke.position.set(1.45 + (side * 0.33), 0.92, 0);
        return fluke;
    });
    var whale = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.MergeMeshes(__spreadArray([bodyMesh, tail], flukes, true), true, true);
    var meshes = [];
    if (whale) {
        whale.name = "".concat(id, "-whale");
        whale.material = blue;
        meshes.push(whale);
    }
    // Eye with a little shine.
    var eyeWhite = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("".concat(id, "-eye"), { diameter: 0.42, segments: 12 }, scene);
    eyeWhite.scaling.z = 0.4;
    eyeWhite.position.set(-1.05, -0.12, -0.38);
    eyeWhite.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "".concat(id, "-eye-material"), "#FFFFFF", { roughness: 0.3, clearCoat: 0.6 });
    var pupil = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("".concat(id, "-pupil"), { diameter: 0.22, segments: 10 }, scene);
    pupil.scaling.z = 0.4;
    pupil.position.set(-1.1, -0.14, -0.45);
    pupil.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "".concat(id, "-pupil-material"), "#1E2A4A", { roughness: 0.3, clearCoat: 0.8 });
    meshes.push(eyeWhite, pupil);
    // Lighter belly stripe.
    var belly = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.extrudeOutline)("".concat(id, "-belly"), ellipse(0.9, 0.2, 32).map(function (_a) {
        var x = _a[0], y = _a[1];
        return [x - 0.45, y - 0.85];
    }), 0.2, 0.05, scene);
    belly.position.z = -0.3;
    belly.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "".concat(id, "-belly-material"), "#A9B9FF", { roughness: 0.4, clearCoat: 0.5 });
    meshes.push(belly);
    return meshes;
}
/** Hugging Face: the yellow hugging smiley with orange hands. */
function buildHuggingFace(scene, id) {
    var faceRadius = 1.65;
    var faceDepth = 0.5;
    var surfaceZ = function (x, y) { return -faceRadius * faceDepth * Math.sqrt(Math.max(0, 1 - (((x * x) + (y * y)) / (faceRadius * faceRadius)))); };
    var dark = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "".concat(id, "-dark"), "#3A3B45", { roughness: 0.3, clearCoat: 0.8 });
    var face = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("".concat(id, "-face"), { diameter: faceRadius * 2, segments: 32 }, scene);
    face.scaling.z = faceDepth;
    face.position.y = 0.2;
    face.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "".concat(id, "-face-material"), "#FFD21E", { roughness: 0.38, clearCoat: 0.6 });
    var meshes = [face];
    for (var _i = 0, _a = [-1, 1]; _i < _a.length; _i++) {
        var side = _a[_i];
        var x = side * 0.6;
        var y = 0.45;
        var eye = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("".concat(id, "-eye-").concat(side), { diameter: 0.42, segments: 12 }, scene);
        eye.scaling.set(1, 1.25, 0.45);
        eye.position.set(x, y + 0.2, surfaceZ(x, y) - 0.02);
        eye.material = dark;
        meshes.push(eye);
        var shine = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("".concat(id, "-shine-").concat(side), { diameter: 0.12, segments: 8 }, scene);
        shine.scaling.z = 0.4;
        shine.position.set(x + 0.06, y + 0.3, surfaceZ(x, y) - 0.1);
        shine.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "".concat(id, "-shine-material-").concat(side), "#FFFFFF", { roughness: 0.2 });
        meshes.push(shine);
    }
    // Open smile (a half disc) with a tongue in it.
    var smile = [];
    for (var i = 0; i <= 24; i++) {
        var t = Math.PI + ((i / 24) * Math.PI);
        smile.push([0.85 * Math.cos(t), 0.62 * Math.sin(t)]);
    }
    var mouth = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.extrudeOutline)("".concat(id, "-mouth"), smile, 0.3, 0.06, scene);
    mouth.position.set(0, 0.05, -0.74);
    mouth.material = dark;
    meshes.push(mouth);
    var tongue = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.extrudeOutline)("".concat(id, "-tongue"), ellipse(0.38, 0.17, 24), 0.12, 0.04, scene);
    tongue.position.set(0, -0.38, -0.86);
    tongue.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "".concat(id, "-tongue-material"), "#FF6B4A", { roughness: 0.4, clearCoat: 0.5 });
    meshes.push(tongue);
    // Hands coming in from the bottom corners.
    var handMaterial = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "".concat(id, "-hands"), "#FF9D0B", { roughness: 0.4, clearCoat: 0.5 });
    var random = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRandom)(42);
    for (var _b = 0, _c = [-1, 1]; _b < _c.length; _b++) {
        var side = _c[_b];
        var hand = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createLumpyBall)("".concat(id, "-hand-").concat(side), scene, random, 1.4, 2);
        hand.scaling.set(0.6, 0.48, 0.42);
        hand.rotation.z = side * -0.5;
        hand.position.set(side * 1.15, -1.15, -0.55);
        hand.material = handMaterial;
        meshes.push(hand);
    }
    return meshes;
}
// ==================================================================== Shape helpers
/** Ray from the origin to `length`, `baseHalfWidth` wide at the centre and `tipHalfWidth` at the rounded tip. */
function taperedCapsule(length, baseHalfWidth, tipHalfWidth) {
    var points = [];
    var tipCenter = length - tipHalfWidth;
    for (var i = 0; i <= 12; i++) {
        var a = -Math.PI / 2 + ((i / 12) * Math.PI);
        points.push([tipCenter + (Math.cos(a) * tipHalfWidth), Math.sin(a) * tipHalfWidth]);
    }
    for (var i = 0; i <= 8; i++) {
        var a = Math.PI / 2 + ((i / 8) * Math.PI);
        points.push([baseHalfWidth + (Math.cos(a) * baseHalfWidth), Math.sin(a) * baseHalfWidth]);
    }
    return points;
}
/** Stadium (rounded rectangle with semicircle ends) along X. */
function stadium(halfLength, radius, steps) {
    var points = [];
    var half = steps / 2;
    for (var i = 0; i < half; i++) {
        var a = -Math.PI / 2 + ((i / (half - 1)) * Math.PI);
        points.push([halfLength + (Math.cos(a) * radius), Math.sin(a) * radius]);
    }
    for (var i = 0; i < half; i++) {
        var a = Math.PI / 2 + ((i / (half - 1)) * Math.PI);
        points.push([-halfLength + (Math.cos(a) * radius), Math.sin(a) * radius]);
    }
    return points;
}
function ellipse(rx, ry, steps) {
    var points = [];
    for (var i = 0; i < steps; i++) {
        var t = (i / steps) * Math.PI * 2;
        points.push([rx * Math.cos(t), ry * Math.sin(t)]);
    }
    return points;
}
function rotate2d(points, angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    return points.map(function (_a) {
        var x = _a[0], y = _a[1];
        return [(x * c) - (y * s), (x * s) + (y * c)];
    });
}
function clampUnit(value) {
    return Math.max(0, Math.min(1, value));
}
/** Sets per-vertex colours from each vertex's x/y position. */
function paintVertices(mesh, color) {
    var positions = mesh.getVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.PositionKind);
    if (!positions) {
        return;
    }
    var colors = [];
    for (var i = 0; i < positions.length; i += 3) {
        var c = color(positions[i], positions[i + 1]);
        colors.push(c.r, c.g, c.b, 1);
    }
    mesh.setVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.ColorKind, colors);
}


/***/ },

/***/ "./src/scenes/world/bricks.ts"
/*!************************************!*\
  !*** ./src/scenes/world/bricks.ts ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createBrickBuilds: () => (/* binding */ createBrickBuilds)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");


/** Earthy toy-block colours (brick red, mustard, teal, slate blue, sand); neighbours differ. */
var BRICK_COLORS = ["#B9553F", "#D9A13B", "#3F8C84", "#456F99", "#DCC9A8"];
/**
 * The brick builds placed around the world: (x, z) centre, bricks per row from the bottom up,
 * and the rotation around their own centre.
 */
var BRICK_BUILDS = [
    { x: -5, z: -30, rows: [6, 6, 4], rotationY: 0 },
    // Centre and angle match where this wall has always been placed (it was previously built at
    // (130, -50) and then rotated 300 rad around the world origin).
    { x: 47.1152, z: 131.0731, rows: [6, 6, 6, 4], rotationY: 4.6903 },
    // A pyramid south of the start and a tower in the north-west to knock over.
    { x: 25, z: -100, rows: [5, 4, 3, 2, 1], rotationY: 0.3 },
    { x: -64, z: 76, rows: [1, 1, 1, 1, 1, 1], rotationY: 0.4 },
];
/** Builds every brick wall, pyramid and tower in BRICK_BUILDS. */
function createBrickBuilds(context) {
    brickImpostors.length = 0;
    context.scene.onDisposeObservable.addOnce(function () {
        brickImpostors.length = 0;
    });
    for (var _i = 0, BRICK_BUILDS_1 = BRICK_BUILDS; _i < BRICK_BUILDS_1.length; _i++) {
        var build = BRICK_BUILDS_1[_i];
        instantiateBricks(context, build.x, 8, build.z, build.rows, build.rotationY);
    }
    keepBricksCalm(context.scene, context.tank);
}
/** Bricks within this distance of the tank are kept awake (the tank is 12 wide). */
var WAKE_DISTANCE = 16;
/** Above anything natural: the tank drives at 38, and a brick falling off a wall reaches ~34. */
var MAX_BRICK_SPEED = 50;
/**
 * Resting bricks fall asleep, and cannon.js treats a sleeping body as immovable for the step in
 * which something first touches it. The tank (whose speed is forced every frame) then drives into
 * bricks that can't move, and once they wake, the solver pushes them apart violently, sometimes
 * shooting a brick off at well over 100 units/s. So bricks near the tank are woken up before it
 * reaches them, and as a safety net brick speeds are capped after every physics step.
 */
function keepBricksCalm(scene, tank) {
    var _a, _b;
    var SLEEPING = 2;
    var allBodies = brickImpostors
        .map(function (impostor) { return impostor.physicsBody; })
        .filter(function (body) { return !!body; });
    var wakeObserver = scene.onBeforePhysicsObservable.add(function () {
        var x = tank.position.x;
        var z = tank.position.z;
        for (var _i = 0, allBodies_1 = allBodies; _i < allBodies_1.length; _i++) {
            var body = allBodies_1[_i];
            if (body.sleepState === SLEEPING && Math.abs(body.position.x - x) < WAKE_DISTANCE && Math.abs(body.position.z - z) < WAKE_DISTANCE) {
                body.wakeUp();
            }
        }
    });
    var world = (_b = (_a = scene.getPhysicsEngine()) === null || _a === void 0 ? void 0 : _a.getPhysicsPlugin()) === null || _b === void 0 ? void 0 : _b.world;
    var capSpeeds = function () {
        for (var _i = 0, allBodies_2 = allBodies; _i < allBodies_2.length; _i++) {
            var body = allBodies_2[_i];
            if (body.sleepState !== SLEEPING) {
                var speed = body.velocity.length();
                if (speed > MAX_BRICK_SPEED) {
                    body.velocity.scale(MAX_BRICK_SPEED / speed, body.velocity);
                }
            }
        }
    };
    world === null || world === void 0 ? void 0 : world.addEventListener("postStep", capSpeeds);
    scene.onDisposeObservable.addOnce(function () {
        scene.onBeforePhysicsObservable.remove(wakeObserver);
        world === null || world === void 0 ? void 0 : world.removeEventListener("postStep", capSpeeds);
    });
}
/**
 * Toy-block physics: grippy against each other and the ground (so stacks stand and knocked
 * bricks tumble and stop instead of skating away), barely bouncy, and only lightly damped so
 * they fall at full speed.
 */
var BRICK_PHYSICS = { mass: 2, friction: 0.8, restitution: 0.1 };
var BRICK_LINEAR_DAMPING = 0.1;
var BRICK_ANGULAR_DAMPING = 0.2;
/** Every brick's physics body (see keepBricksCalm). Their sounds are in audio/impactSounds.ts. */
var brickImpostors = [];
/**
 * Set up a wall of bricks centered at (x, z) and rotated around its own center.
 * @param y fallback ground height used if no ground is found below the wall.
 * @param rotationY rotation of the wall around its own vertical axis, in radians.
 */
function instantiateBricks(_this, x, y, z, numColumnsPerRow, rotationY) {
    var _a;
    if (rotationY === void 0) { rotationY = 0; }
    var brickScaleFactor = 1.1;
    var brickLength = 6 * brickScaleFactor;
    var brickDepth = 3 * brickScaleFactor;
    var brickHeight = brickLength * 0.5 * brickScaleFactor;
    var groundY = getGroundHeight(x, y, z);
    var initialY = groundY + brickHeight / 2;
    // One hidden template per colour; the visible bricks are instances of these.
    var brickTemplates = createBrickTemplates(_this, brickLength, brickHeight, brickDepth);
    var colorOffset = Math.abs(Math.round(x + z)) % BRICK_COLORS.length;
    // Define a small buffer to prevent collision
    var buffer = 0; // Adjust this value as needed
    // The wall is built in the parent's local space (centered on x = 0, z = 0) so that
    // rotating the parent turns the wall around its own center.
    var wallParent = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("wallParent", _this.scene);
    wallParent.position.set(x, 0, z);
    wallParent.rotation.y = rotationY;
    wallParent.computeWorldMatrix(true);
    // Create the wall of bricks
    for (var j = 0; j < numColumnsPerRow.length; j++) {
        // Number of bricks in the current row
        var numBricksInRow = (_a = numColumnsPerRow[j]) !== null && _a !== void 0 ? _a : 0;
        // Calculate the total width of the current row
        var totalRowWidth = numBricksInRow * (brickLength + buffer);
        // Start placing bricks so the row is centered on the wall's center
        var localX = -(totalRowWidth / 2);
        var localY = initialY + j * (brickHeight + buffer);
        for (var i = 0; i < numBricksInRow; i++) {
            // Stepping by 2 per brick and 3 per row keeps side-by-side and stacked bricks different.
            var template = brickTemplates[(colorOffset + (i * 2) + (j * 3)) % brickTemplates.length];
            var brickInstance = template.createInstance("brick".concat(j, "-").concat(i));
            positionBrick(brickInstance, localX, localY, 0);
            // Parent only after the impostor exists: Babylon skips creating the physics
            // body for meshes that already have a parent.
            brickInstance.parent = wallParent;
            localX += brickLength + buffer; // Increment x position with buffer
        }
    }
    /**
     * Create the hidden, rounded toy-block templates (one per colour).
     */
    function createBrickTemplates(_this, length, height, depth) {
        return BRICK_COLORS.map(function (hex, i) {
            var material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(_this.scene, "toy-brick-".concat(i), hex, { roughness: 0.5, clearCoat: 0.4 });
            return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createTemplate)((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("brick-template-".concat(i), length, height, depth, 0.38, _this.scene, 3), material);
        });
    }
    /**
     * Position a brick mesh and set up its physics.
     */
    function positionBrick(brick, x, y, z) {
        brick.position.set(x, y, z);
        var impostor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor(brick, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor.BoxImpostor, BRICK_PHYSICS, _this.scene);
        brickImpostors.push(impostor);
        var body = impostor.physicsBody;
        if (body) {
            body.linearDamping = BRICK_LINEAR_DAMPING;
            body.angularDamping = BRICK_ANGULAR_DAMPING;
            // Walls are built resting on the ground, so they start asleep: no settling jitter on
            // load, and no simulation cost until the tank or a shot wakes them up.
            body.sleep();
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

/***/ "./src/scenes/world/clouds.ts"
/*!************************************!*\
  !*** ./src/scenes/world/clouds.ts ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createClouds: () => (/* binding */ createClouds)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_shadows__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/shadows */ "./src/scenes/core/shadows.ts");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");
/* harmony import */ var _core_math__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../core/math */ "./src/scenes/core/math.ts");
/* harmony import */ var _core_constants__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../core/constants */ "./src/scenes/core/constants.ts");





/**
 * Chunky toy clouds drifting low over the world, each with a soft shadow patch sliding over the
 * ground beneath it.
 *
 * The camera looks down at the tank from above, so the clouds float fairly low (24-34 units up,
 * still well above the trees) to be seen at all. A cloud that drifts in between the camera and the
 * tank fades out (its shadow stays), so it never hides what you're driving, and so do clouds close
 * to the camera. Clouds that drift too far from the tank wrap around to the other side, so there
 * are always some about wherever you go.
 */
var CLOUD_COUNT = 14;
/** Clouds live in a square this many units either side of the tank. */
var AREA_HALF = 260;
var MIN_HEIGHT = 24;
var MAX_HEIGHT = 34;
var WIND = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(3.2, 0, 1.1);
/** Shadow patches sit just above the road slabs and tread prints. */
var SHADOW_Y = _core_constants__WEBPACK_IMPORTED_MODULE_4__.GROUND_Y + 0.19;
/** Extra clearance (on top of the cloud's own size) kept around the camera's view of the tank. */
var VIEW_CLEARANCE = 8;
/** Clouds closer than this to the camera (plus their size) fade out, so none fill the screen. */
var CAMERA_CLEARANCE = 80;
function createClouds(scene, tank, camera) {
    var random = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createRandom)(77);
    var material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "toy-cloud", "#FFFFFF", { roughness: 0.85, clearCoat: 0.15 });
    // Keep them bright white even on their shaded side, like painted plastic clouds.
    material.emissiveColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString("#DCE6F2").toLinearSpace().scale(0.35);
    // Fading a cloud made of overlapping puffs needs a depth pre-pass, or the inner puffs show through.
    material.needDepthPrePass = true;
    // Always blended (not just while fading), so fading never switches to a different shader that
    // would have to be compiled mid-game. (Babylon only blends a PBR material whose alpha is below
    // 1, hence 0.999 rather than 1.)
    material.transparencyMode = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Material.MATERIAL_ALPHABLEND;
    material.alpha = 0.999;
    var shadowMaterial = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("cloud-shadow-material", scene);
    shadowMaterial.diffuseColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.Black();
    shadowMaterial.specularColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.Black();
    shadowMaterial.emissiveColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString("#123248");
    shadowMaterial.disableLighting = true;
    shadowMaterial.opacityTexture = createSoftDiscTexture(scene);
    shadowMaterial.alpha = 0.3;
    shadowMaterial.zOffset = -3;
    var clouds = [];
    for (var i = 0; i < CLOUD_COUNT; i++) {
        var _a = buildCloud(scene, "cloud-".concat(i), random, material), mesh = _a.mesh, radius = _a.radius;
        mesh.position.set(tank.position.x + ((random() * 2) - 1) * AREA_HALF, MIN_HEIGHT + (random() * (MAX_HEIGHT - MIN_HEIGHT)), tank.position.z + ((random() * 2) - 1) * AREA_HALF);
        mesh.rotation.y = random() * Math.PI * 2;
        var shadow = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateDisc("cloud-shadow-".concat(i), { radius: radius * 1.05, tessellation: 32 }, scene);
        shadow.rotation.x = Math.PI / 2;
        shadow.scaling.y = 0.7;
        shadow.material = shadowMaterial;
        shadow.isPickable = false;
        shadow.metadata = { keepUnfrozen: true };
        clouds.push({ mesh: mesh, shadow: shadow, radius: radius, fade: 1 });
    }
    var step = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    var groundOffset = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    var observer = scene.onBeforeRenderObservable.add(function () {
        var deltaSeconds = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
        WIND.scaleToRef(deltaSeconds, step);
        for (var _i = 0, clouds_1 = clouds; _i < clouds_1.length; _i++) {
            var cloud = clouds_1[_i];
            var position = cloud.mesh.position;
            position.addInPlace(step);
            // Wrap around the tank so clouds keep coming wherever it drives.
            var wrapped = false;
            for (var _a = 0, _b = ["x", "z"]; _a < _b.length; _a++) {
                var axis = _b[_a];
                var offset = position[axis] - tank.position[axis];
                if (offset > AREA_HALF) {
                    position[axis] -= AREA_HALF * 2;
                    wrapped = true;
                }
                else if (offset < -AREA_HALF) {
                    position[axis] += AREA_HALF * 2;
                    wrapped = true;
                }
            }
            if (wrapped) {
                // Pop in faded out; it fades back in below.
                cloud.fade = 0;
            }
            // Fade out while between the camera and the tank.
            var clearance = cloud.radius + VIEW_CLEARANCE;
            var nearCamera = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.DistanceSquared(camera.position, position) < Math.pow((cloud.radius + CAMERA_CLEARANCE), 2);
            var blocking = nearCamera || (0,_core_math__WEBPACK_IMPORTED_MODULE_3__.segmentDistanceSquared)(camera.position, tank.position, position) < clearance * clearance;
            var target = blocking ? 0 : 1;
            cloud.fade += (target - cloud.fade) * Math.min(1, deltaSeconds * 3);
            cloud.mesh.visibility = cloud.fade;
            cloud.mesh.isVisible = cloud.fade > 0.02;
            // The shadow lies on the ground where the sunlight through the cloud's centre lands.
            _core_shadows__WEBPACK_IMPORTED_MODULE_1__.SUN_DIRECTION.scaleToRef((position.y - SHADOW_Y) / -_core_shadows__WEBPACK_IMPORTED_MODULE_1__.SUN_DIRECTION.y, groundOffset);
            cloud.shadow.position.set(position.x + groundOffset.x, SHADOW_Y, position.z + groundOffset.z);
            cloud.shadow.rotation.y = cloud.mesh.rotation.y;
            cloud.shadow.visibility = wrapped ? 0 : Math.min(1, cloud.shadow.visibility + (deltaSeconds * 0.5));
        }
    });
    scene.onDisposeObservable.addOnce(function () { return scene.onBeforeRenderObservable.remove(observer); });
}
/**
 * One cloud: a flat-bottomed cluster of soft lumpy puffs, biggest in the middle, merged into a
 * single mesh so it can fade as a whole.
 */
function buildCloud(scene, name, random, material) {
    var _a;
    var length = 16 + (random() * 14);
    var puffCount = 5 + Math.floor(random() * 3);
    var puffs = [];
    for (var i = 0; i < puffCount; i++) {
        var t = puffCount === 1 ? 0.5 : i / (puffCount - 1);
        // Bigger towards the middle, a little jitter in depth and height.
        var size = (length * 0.22) * (0.7 + (Math.sin(t * Math.PI) * 0.6)) * (0.85 + (random() * 0.3));
        var puff = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createLumpyBall)("".concat(name, "-puff-").concat(i), scene, random, 1.2, 3);
        puff.scaling.set(size, size * 0.82, size * 0.9);
        puff.position.set((t - 0.5) * length, size * 0.35 * Math.sin(t * Math.PI), (random() - 0.5) * size * 0.8);
        puffs.push(puff);
    }
    // A couple of puffs on top for a fluffier silhouette.
    for (var i = 0; i < 2; i++) {
        var size = length * (0.17 + (random() * 0.06));
        var puff = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createLumpyBall)("".concat(name, "-top-").concat(i), scene, random, 1.2, 3);
        puff.scaling.set(size, size * 0.85, size * 0.9);
        puff.position.set((random() - 0.5) * length * 0.45, length * 0.2, (random() - 0.5) * size * 0.6);
        puffs.push(puff);
    }
    var mesh = (_a = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.MergeMeshes(puffs, true, true)) !== null && _a !== void 0 ? _a : puffs[0];
    mesh.name = name;
    // Flatten the bottom: squash everything below the base line up onto it.
    var positions = mesh.getVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.PositionKind);
    var normals = mesh.getVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.NormalKind);
    if (positions && normals) {
        var baseY = -length * 0.06;
        for (var i = 0; i < positions.length; i += 3) {
            if (positions[i + 1] < baseY) {
                positions[i + 1] = baseY + ((positions[i + 1] - baseY) * 0.25);
                normals[i] *= 0.4;
                normals[i + 1] = Math.min(normals[i + 1], -0.6);
                normals[i + 2] *= 0.4;
                var n = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
                normals[i] /= n;
                normals[i + 1] /= n;
                normals[i + 2] /= n;
            }
        }
        mesh.updateVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.PositionKind, positions);
        mesh.updateVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.NormalKind, normals);
        mesh.refreshBoundingInfo();
    }
    mesh.material = material;
    mesh.isPickable = false;
    mesh.metadata = { keepUnfrozen: true };
    return { mesh: mesh, radius: length * 0.6 };
}
/** White disc fading to transparent at the edge, for the soft cloud shadows. */
function createSoftDiscTexture(scene) {
    var size = 128;
    var texture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("cloud-shadow-texture", { width: size, height: size }, scene, true);
    var context = texture.getContext();
    var gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.55, "rgba(255,255,255,0.85)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.clearRect(0, 0, size, size);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    texture.update();
    texture.hasAlpha = true;
    texture.getAlphaFromRGB = false;
    return texture;
}


/***/ },

/***/ "./src/scenes/world/codeTrophy.ts"
/*!****************************************!*\
  !*** ./src/scenes/world/codeTrophy.ts ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createCodeTrophy: () => (/* binding */ createCodeTrophy)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_constants__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/constants */ "./src/scenes/core/constants.ts");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};



/**
 * The C# trophy: a gold cup with two loop handles on a purple plinth, with a hexagon "C#" badge on
 * the front of the cup. It replaces the imported C# logo model (whose physics box ended up out of
 * step with what was drawn, so the tank drove straight through it).
 *
 * Like the AI trophies it can be pushed around: an invisible box collider carries the visible
 * parts, and its name ends in "-collider" so hits play the trophy sound.
 *
 * Built at size 1 in trophy space: y = 0 is the ground, the front faces -Z.
 */
var ID = "code-trophy";
/** Where the C# logo model stood (x, z). */
var POSITION = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector2(-117.93, -15.92);
var SCALE = 1.5;
var PALETTE = {
    plinth: "#5B3A8C",
    plinthTop: "#E8DCC6",
    gold: "#C9A35B",
    badge: "#7E57C2",
    letters: "#FFFFFF",
};
/** The cup's outline, turned around the Y axis: (radius, height) from the foot up and back down inside. */
var CUP_PROFILE = [
    [0, 1.6],
    [1.45, 1.6],
    [1.45, 1.85],
    [1.15, 2.05],
    [0.55, 2.2],
    [0.36, 2.55],
    [0.34, 3.1],
    // A knot halfway up the stem.
    [0.62, 3.3],
    [0.62, 3.55],
    [0.36, 3.75],
    [0.42, 4.15],
    // The bowl, widening up to a rolled rim.
    [0.95, 4.45],
    [1.5, 4.85],
    [1.88, 5.4],
    [2.1, 6.1],
    [2.2, 6.9],
    [2.42, 7.15],
    [2.42, 7.35],
    [2.2, 7.38],
    // Inside the bowl.
    [2.0, 7.2],
    [1.92, 6.4],
    [1.6, 5.5],
    [0.9, 5.0],
    [0, 4.9],
];
/** Collider size (trophy space), covering the plinth, the cup and its handles. */
var BOX = { width: 5.6, height: 7.4, depth: 4.4 };
function createCodeTrophy(scene) {
    var _a;
    removeLogoModel(scene);
    var yaw = _core_constants__WEBPACK_IMPORTED_MODULE_1__.FACE_CAMERA_YAW + 0.1;
    var collider = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateBox("".concat(ID, "-collider"), { width: BOX.width * SCALE, height: BOX.height * SCALE, depth: BOX.depth * SCALE }, scene);
    collider.position.set(POSITION.x, _core_constants__WEBPACK_IMPORTED_MODULE_1__.GROUND_Y + (BOX.height * SCALE / 2) + 0.05, POSITION.y);
    collider.rotation.y = yaw;
    collider.isVisible = false;
    collider.isPickable = false;
    // Same feel as the AI trophies: no bounce, slides and tips when bumped.
    var impostor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor(collider, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor.BoxImpostor, { mass: 4, friction: 0.6, restitution: 0 }, scene);
    collider.physicsImpostor = impostor;
    var body = impostor.physicsBody;
    if (body) {
        body.linearDamping = 0.15;
        body.angularDamping = 0.3;
    }
    var root = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode(ID, scene);
    root.parent = collider;
    root.position.y = -BOX.height * SCALE / 2;
    root.scaling.setAll(SCALE);
    for (var _i = 0, _b = buildModel(scene); _i < _b.length; _i++) {
        var mesh = _b[_i];
        mesh.parent = root;
        mesh.isPickable = false;
        // Moves with its physics body, so its world matrix mustn't be frozen.
        mesh.metadata = __assign(__assign({}, ((_a = mesh.metadata) !== null && _a !== void 0 ? _a : {})), { keepUnfrozen: true });
    }
}
/** The imported logo: a box with a physics body and the logo mesh as its child. */
function removeLogoModel(scene) {
    var _a, _b, _c;
    var logo = scene.getMeshByName("c#");
    if (!logo) {
        return;
    }
    // The scene loader doesn't set mesh.physicsImpostor, so find the body through the engine.
    (_c = ((_a = logo.physicsImpostor) !== null && _a !== void 0 ? _a : (_b = scene.getPhysicsEngine()) === null || _b === void 0 ? void 0 : _b.getImpostorForPhysicsObject(logo))) === null || _c === void 0 ? void 0 : _c.dispose();
    logo.dispose();
}
function buildModel(scene) {
    var _a;
    var gold = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "".concat(ID, "-gold"), PALETTE.gold, { roughness: 0.25, metallic: 0.75, clearCoat: 0.6 });
    var meshes = [];
    // Two-step plinth.
    var plinth = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createRoundedBox)("".concat(ID, "-plinth"), 4.4, 1.2, 4.2, 0.3, scene);
    plinth.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "".concat(ID, "-plinth-material"), PALETTE.plinth, { roughness: 0.45, clearCoat: 0.4 });
    plinth.position.y = 0.6;
    var top = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createRoundedBox)("".concat(ID, "-plinth-top"), 3.6, 0.4, 3.4, 0.15, scene);
    top.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "".concat(ID, "-plinth-top-material"), PALETTE.plinthTop, { roughness: 0.45, clearCoat: 0.35 });
    top.position.y = 1.4;
    meshes.push(plinth, top);
    // The cup, with both handles merged in (one draw call).
    var cup = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateLathe("".concat(ID, "-cup"), {
        shape: CUP_PROFILE.map(function (_a) {
            var r = _a[0], y = _a[1];
            return new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(r, y, 0);
        }),
        tessellation: 40,
        sideOrientation: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.DOUBLESIDE,
    }, scene);
    var handles = [-1, 1].map(function (side) { return createHandle(scene, side); });
    var goldParts = (_a = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.MergeMeshes(__spreadArray([cup], handles, true), true, true)) !== null && _a !== void 0 ? _a : cup;
    goldParts.name = "".concat(ID, "-gold-parts");
    goldParts.material = gold;
    meshes.push(goldParts);
    meshes.push.apply(meshes, createBadge(scene));
    return meshes;
}
/** A loop handle on one side of the bowl, from just under the rim curling out and back in lower down. */
function createHandle(scene, side) {
    var from = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(2.05, 6.6, 0);
    var out1 = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(3.3, 6.9, 0);
    var out2 = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(3.2, 5.0, 0);
    var to = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.55, 4.95, 0);
    var curve = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Curve3.CreateCubicBezier(from, out1, out2, to, 24).getPoints();
    var path = curve.map(function (point) { return new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(point.x * side, point.y, point.z); });
    return _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateTube("".concat(ID, "-handle-").concat(side), {
        path: path,
        radiusFunction: function (i) { return 0.2 + (0.06 * Math.sin((i / (path.length - 1)) * Math.PI)); },
        tessellation: 14,
        cap: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.CAP_ALL,
    }, scene);
}
/** A purple hexagon on the front of the bowl with a white "C#" on it. */
function createBadge(scene) {
    var centerY = 6.1;
    // Just in front of the bowl's surface at that height.
    var frontZ = -2.06;
    var hexagon = [];
    for (var i = 0; i < 6; i++) {
        var angle = (Math.PI / 6) + (i * Math.PI / 3);
        hexagon.push([Math.cos(angle) * 0.95, Math.sin(angle) * 0.95]);
    }
    var badge = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.extrudeOutline)("".concat(ID, "-badge"), hexagon, 0.3, 0.08, scene);
    badge.position.set(0, centerY, frontZ);
    badge.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "".concat(ID, "-badge-material"), PALETTE.badge, { roughness: 0.35, clearCoat: 0.7 });
    // The letters are built around the origin and then moved onto the badge.
    // "C": an open ring.
    var arc = [];
    for (var i = 0; i <= 20; i++) {
        var angle = 0.75 + ((i / 20) * (Math.PI * 2 - 1.5));
        arc.push(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.28 + (Math.cos(angle) * 0.45), Math.sin(angle) * 0.45, 0));
    }
    var letterC = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateTube("".concat(ID, "-c"), { path: arc, radius: 0.11, tessellation: 10, cap: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.CAP_ALL }, scene);
    // "#": two slanted uprights and two crossbars (tubes, so they merge with the "C").
    var stroke = function (name, x1, y1, x2, y2) { return _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateTube(name, {
        path: [new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(x1, y1, 0), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(x2, y2, 0)],
        radius: 0.06,
        tessellation: 8,
        cap: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.CAP_ALL,
    }, scene); };
    var sharpParts = [];
    for (var _i = 0, _a = [-0.13, 0.13]; _i < _a.length; _i++) {
        var offset = _a[_i];
        sharpParts.push(stroke("".concat(ID, "-sharp-v"), 0.52 + offset - 0.05, -0.3, 0.52 + offset + 0.05, 0.3));
        sharpParts.push(stroke("".concat(ID, "-sharp-h"), 0.27, offset, 0.77, offset));
    }
    var letters = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.MergeMeshes(__spreadArray([letterC], sharpParts, true), true, true);
    if (!letters) {
        return [badge];
    }
    letters.name = "".concat(ID, "-letters");
    letters.position.set(0, centerY, frontZ - 0.18);
    letters.scaling.setAll(0.82);
    letters.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "".concat(ID, "-letters-material"), PALETTE.letters, { roughness: 0.35, clearCoat: 0.6 });
    return [badge, letters];
}


/***/ },

/***/ "./src/scenes/world/fruitFactory.ts"
/*!******************************************!*\
  !*** ./src/scenes/world/fruitFactory.ts ***!
  \******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   restyleFruitFactory: () => (/* binding */ restyleFruitFactory)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");
/* harmony import */ var _core_constants__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/constants */ "./src/scenes/core/constants.ts");
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};



/**
 * Rebuilds the Fruit Factory corner (the desk with the PC) as a toy desk setup. The C# trophy next
 * to it is built in codeTrophy.ts.
 *
 * Every piece of the original desk model is replaced by a toy version built in code at the same
 * place and size: desk, monitor (reusing the Fruit Factory screenshot), PC tower, keyboard, mouse
 * and speakers, plus a few props. The originals are hidden; the invisible "fruit factory" box keeps
 * doing the physics.
 */
var PALETTE = {
    deskTop: "#E2B57E",
    deskEdge: "#B9834F",
    deskFrame: "#4F6F8F",
    drawer: "#E8DCC6",
    accent: "#E8869F",
    navy: "#344B63",
    slate: "#4F6F8F",
    sand: "#E8DCC6",
    cream: "#F4EBDD",
    coneDark: "#2A2C30",
    powerLight: "#7CF0B0",
    coffee: "#6B4430",
    pot: "#C9734F",
    soil: "#5E4436",
    leaves: ["#6E9F7E", "#5B8C70", "#82B08F"],
    title: "#F4EBDD",
};
function restyleFruitFactory(scene) {
    try {
        restyleDesk(scene);
    }
    catch (error) {
        console.error("Fruit Factory desk restyle failed", error);
    }
}
function createMaterials(scene) {
    var toy = function (name, hex, roughness, clearCoat, metallic) {
        if (roughness === void 0) { roughness = 0.45; }
        if (clearCoat === void 0) { clearCoat = 0.4; }
        if (metallic === void 0) { metallic = 0; }
        return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-ff-".concat(name), hex, { roughness: roughness, clearCoat: clearCoat, metallic: metallic });
    };
    var glow = function (name, hex) {
        var material = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("toy-ff-".concat(name), scene);
        material.disableLighting = true;
        material.emissiveColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString(hex);
        return material;
    };
    return {
        deskTop: toy("desk-top", PALETTE.deskTop, 0.5, 0.5),
        deskEdge: toy("desk-edge", PALETTE.deskEdge, 0.5, 0.4),
        deskFrame: toy("desk-frame", PALETTE.deskFrame),
        drawer: toy("drawer", PALETTE.drawer, 0.5, 0.35),
        accent: toy("accent", PALETTE.accent, 0.4, 0.5),
        navy: toy("navy", PALETTE.navy, 0.45, 0.4),
        slate: toy("slate", PALETTE.slate, 0.45, 0.45),
        sand: toy("sand", PALETTE.sand, 0.45, 0.4),
        cream: toy("cream", PALETTE.cream, 0.4, 0.5),
        coneDark: toy("cone", PALETTE.coneDark, 0.7, 0.1),
        coffee: toy("coffee", PALETTE.coffee, 0.2, 0.6),
        pot: toy("pot", PALETTE.pot, 0.55, 0.3),
        soil: toy("soil", PALETTE.soil, 0.9, 0),
        leaves: PALETTE.leaves.map(function (hex, i) { return toy("leaves-".concat(i), hex, 0.6, 0.15); }),
        powerLight: glow("power-light", PALETTE.powerLight),
    };
}
function restyleDesk(scene) {
    var factory = scene.getMeshByName("fruit factory");
    if (!factory) {
        return;
    }
    factory.computeWorldMatrix(true);
    var yaw = factory.rotationQuaternion ? factory.rotationQuaternion.toEulerAngles().y : factory.rotation.y;
    var right = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    var forward = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    var frame = {
        yaw: yaw,
        right: right,
        forward: forward,
        toWorld: function (x, y, z) { return right.scale(x).addInPlace(forward.scale(z)).addInPlaceFromFloats(0, y, 0); },
    };
    // The desk parts are not children of the "fruit factory" physics box (they hang under a
    // separate node with the same name), so look them up by their own, unique names.
    var find = function (name) { return scene.getMeshByName(name); };
    var table = find("Cube.001_table_0");
    if (!table) {
        console.warn("Fruit Factory desk not found, keeping the original");
        return;
    }
    var materials = createMaterials(scene);
    var deskBox = getFrameBox(table, frame);
    var deskTopY = deskBox.maxY;
    buildDesk(scene, frame, deskBox, materials);
    table.isVisible = false;
    // Each part is rebuilt independently; if one fails the original stays visible.
    var replace = function (name, build) {
        var mesh = find(name);
        if (!mesh) {
            return;
        }
        try {
            if (build(mesh)) {
                mesh.isVisible = false;
            }
        }
        catch (error) {
            console.error("Failed to rebuild ".concat(name), error);
        }
    };
    replace("monitor", function (mesh) { return buildMonitor(scene, frame, mesh, deskTopY, materials); });
    replace("Cube.005_cpu_0", function (mesh) { return buildPcTower(scene, frame, getFrameBox(mesh, frame), deskTopY, materials); });
    replace("Cube.004_keyboard_0", function (mesh) { return buildKeyboard(scene, frame, getFrameBox(mesh, frame), deskTopY, materials); });
    replace("Cube.008_mouse_0", function (mesh) { return buildMouse(scene, frame, getFrameBox(mesh, frame), deskTopY, materials); });
    replace("Cube.012_speakers_0", function (mesh) { return buildSpeakers(scene, frame, mesh, deskTopY, materials); });
    buildProps(scene, frame, deskBox, materials);
    // The 3D "Fruit Factory" title.
    var title = scene.getTransformNodeByName("Text");
    title === null || title === void 0 ? void 0 : title.getChildMeshes().forEach(function (mesh) {
        mesh.material = materials.cream;
    });
}
// ==================================================================== Desk
function buildDesk(scene, frame, box, materials) {
    var width = box.maxX - box.minX;
    var depth = box.maxZ - box.minZ;
    var centerX = (box.minX + box.maxX) / 2;
    var centerZ = (box.minZ + box.maxZ) / 2;
    var topY = box.maxY;
    var floorY = _core_constants__WEBPACK_IMPORTED_MODULE_2__.GROUND_Y - 0.1;
    // Two-tone top: a darker edge band with a lighter, slightly inset surface on it.
    var edgeThickness = 1.1;
    var edge = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-desk-edge", width, edgeThickness, depth, 0.5, scene);
    edge.material = materials.deskEdge;
    place(edge, frame, centerX, topY - 0.35 - (edgeThickness / 2), centerZ);
    var surface = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-desk-surface", width - 0.5, 0.5, depth - 0.5, 0.22, scene, 3);
    surface.material = materials.deskTop;
    place(surface, frame, centerX, topY - 0.25, centerZ);
    var underTop = topY - 0.35 - edgeThickness;
    // Legs on the right (the robot sits at the right-hand side of the desk) and a rail between them.
    var legX = box.maxX - 1.4;
    var legSize = 1.6;
    var legHeight = underTop - floorY + 0.2;
    for (var _i = 0, _a = [-1, 1]; _i < _a.length; _i++) {
        var side = _a[_i];
        var leg = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-desk-leg-".concat(side), legSize, legHeight, legSize, 0.5, scene);
        leg.material = materials.deskFrame;
        place(leg, frame, legX, floorY + (legHeight / 2), centerZ + (side * ((depth / 2) - 1.4)));
        // Little round feet
        var foot = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("ff-desk-foot-".concat(side), { diameter: 2.2, height: 0.5, tessellation: 20 }, scene);
        foot.material = materials.navy;
        place(foot, frame, legX, floorY + 0.25, centerZ + (side * ((depth / 2) - 1.4)));
    }
    var rail = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-desk-rail", 0.9, 0.9, depth - 2.8, 0.3, scene);
    rail.material = materials.deskFrame;
    place(rail, frame, legX, floorY + 1.8, centerZ);
    // Drawer unit on the left.
    var unitWidth = Math.min(8, width * 0.3);
    var unitHeight = underTop - floorY + 0.2;
    var unitX = box.minX + (unitWidth / 2) + 0.6;
    var unitDepth = depth - 1.6;
    var unit = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-desk-drawers", unitWidth, unitHeight, unitDepth, 0.55, scene);
    unit.material = materials.deskFrame;
    place(unit, frame, unitX, floorY + (unitHeight / 2), centerZ);
    var drawerCount = 3;
    var drawerGap = 0.45;
    var drawerHeight = (unitHeight - 1.2 - (drawerGap * (drawerCount - 1))) / drawerCount;
    var frontZ = centerZ + (unitDepth / 2);
    for (var i = 0; i < drawerCount; i++) {
        var y = floorY + 0.7 + (drawerHeight / 2) + (i * (drawerHeight + drawerGap));
        var drawer = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-desk-drawer-".concat(i), unitWidth - 1.2, drawerHeight, 0.6, 0.22, scene, 3);
        drawer.material = materials.drawer;
        place(drawer, frame, unitX, y, frontZ + 0.1);
        var handle = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-desk-handle-".concat(i), unitWidth * 0.35, 0.45, 0.5, 0.2, scene, 2);
        handle.material = materials.accent;
        place(handle, frame, unitX, y + (drawerHeight * 0.15), frontZ + 0.55);
    }
    // Back panel between the legs and the drawers.
    var panelLeft = unitX + (unitWidth / 2);
    var panelRight = legX - (legSize / 2);
    var panelHeight = Math.min(5, underTop - floorY - 1);
    var panel = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-desk-panel", panelRight - panelLeft + 0.4, panelHeight, 0.6, 0.25, scene, 3);
    panel.material = materials.deskFrame;
    place(panel, frame, (panelLeft + panelRight) / 2, underTop - (panelHeight / 2) + 0.1, box.minZ + 1.2);
}
// ==================================================================== Monitor
/**
 * New monitor with a rounded bezel, stand and a glowing screen. The screen reuses the original
 * monitor's texture: the corners of the original screen face are found in its mesh together with
 * their texture coordinates, so the screenshot appears exactly as it did before.
 */
function buildMonitor(scene, frame, monitor, deskTopY, materials) {
    var _a, _b;
    var texture = (_b = (_a = monitor.material) === null || _a === void 0 ? void 0 : _a.albedoTexture) !== null && _b !== void 0 ? _b : null;
    var screen = findScreenCorners(monitor, frame);
    if (!texture || !screen) {
        // Keep the original, just make the screen glow.
        var material = monitor.material;
        if (material instanceof _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PBRMaterial && material.albedoTexture) {
            material.emissiveTexture = material.albedoTexture;
            material.emissiveColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.45, 0.45, 0.45);
        }
        return false;
    }
    var corners = screen.corners, minX = screen.minX, maxX = screen.maxX, minY = screen.minY, maxY = screen.maxY, frontZ = screen.frontZ;
    var width = maxX - minX;
    var height = maxY - minY;
    var centerX = (minX + maxX) / 2;
    var centerY = (minY + maxY) / 2;
    var bezel = 0.9;
    var bezelDepth = 1.1;
    // Screen: a quad over the original screen with the original texture coordinates.
    var screenZ = frontZ + 0.12;
    var positions = [];
    var normals = [];
    var uvs = [];
    corners.forEach(function (corner) {
        var world = frame.toWorld(corner.x, corner.y, screenZ);
        positions.push(world.x, world.y, world.z);
        normals.push(frame.forward.x, 0, frame.forward.z);
        uvs.push(corner.u, corner.v);
    });
    var indices = [];
    (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.pushOrientedTriangle)(indices, positions, normals, 0, 1, 2);
    (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.pushOrientedTriangle)(indices, positions, normals, 0, 2, 3);
    var screenMesh = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.buildMesh)("ff-monitor-screen", positions, normals, indices, scene, uvs);
    var screenMaterial = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("toy-ff-screen", scene);
    screenMaterial.disableLighting = true;
    screenMaterial.emissiveTexture = texture;
    screenMesh.material = screenMaterial;
    screenMesh.isPickable = false;
    // Bezel, with a rounded back like a chunky toy monitor.
    var frameBox = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-monitor-bezel", width + (bezel * 2), height + (bezel * 2), bezelDepth, 0.55, scene);
    frameBox.material = materials.navy;
    place(frameBox, frame, centerX, centerY, frontZ + 0.05 - (bezelDepth / 2));
    var back = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-monitor-back", width * 0.6, height * 0.6, 1.6, 0.6, scene, 4, 0.85);
    back.material = materials.slate;
    place(back, frame, centerX, centerY, frontZ - bezelDepth - 0.6);
    // Power light on the bezel
    var led = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("ff-monitor-led", { diameter: 0.35, segments: 8 }, scene);
    led.material = materials.powerLight;
    place(led, frame, maxX + (bezel * 0.5), minY - (bezel * 0.5), frontZ + 0.1);
    // Stand: neck and base on the desk.
    var bottomY = minY - bezel;
    var neckHeight = Math.max(0.5, bottomY - deskTopY + 0.3);
    var neck = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-monitor-neck", 1.6, neckHeight, 1.0, 0.4, scene, 3);
    neck.material = materials.slate;
    place(neck, frame, centerX, deskTopY + (neckHeight / 2), frontZ - bezelDepth - 0.3);
    var base = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-monitor-base", 6, 0.55, 3.4, 0.27, scene, 3);
    base.material = materials.navy;
    place(base, frame, centerX, deskTopY + 0.27, frontZ - bezelDepth - 0.3);
    return true;
}
/**
 * Finds the original screen: the front-most vertices of the monitor whose texture coordinates are
 * in the screenshot part of the texture. Returns the four corners (in the desk frame) ordered
 * around the quad, each with its texture coordinate.
 */
function findScreenCorners(monitor, frame) {
    var positions = monitor.getVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.PositionKind);
    var uvData = monitor.getVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.UVKind);
    if (!positions || !uvData) {
        return null;
    }
    monitor.computeWorldMatrix(true);
    var world = monitor.getWorldMatrix();
    var point = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    var vertices = [];
    for (var i = 0; i < positions.length / 3; i++) {
        _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.TransformCoordinatesFromFloatsToRef(positions[i * 3], positions[(i * 3) + 1], positions[(i * 3) + 2], world, point);
        vertices.push({
            x: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Dot(point, frame.right),
            y: point.y,
            z: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Dot(point, frame.forward),
            u: uvData[i * 2],
            v: uvData[(i * 2) + 1],
        });
    }
    // The screenshot lives in the lower-left part of the texture.
    var inScreenshot = vertices.filter(function (vertex) { return vertex.u <= 0.3 && vertex.v <= 0.52; });
    if (inScreenshot.length < 4) {
        return null;
    }
    var frontZ = Math.max.apply(Math, inScreenshot.map(function (vertex) { return vertex.z; }));
    var front = inScreenshot.filter(function (vertex) { return vertex.z >= frontZ - 0.3; });
    if (front.length < 4) {
        return null;
    }
    var minX = Math.min.apply(Math, front.map(function (vertex) { return vertex.x; }));
    var maxX = Math.max.apply(Math, front.map(function (vertex) { return vertex.x; }));
    var minY = Math.min.apply(Math, front.map(function (vertex) { return vertex.y; }));
    var maxY = Math.max.apply(Math, front.map(function (vertex) { return vertex.y; }));
    if (maxX - minX < 2 || maxY - minY < 2) {
        return null;
    }
    var nearest = function (x, y) {
        var best = front[0];
        var bestDistance = Infinity;
        for (var _i = 0, front_1 = front; _i < front_1.length; _i++) {
            var vertex = front_1[_i];
            var distance = Math.hypot(vertex.x - x, vertex.y - y);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = vertex;
            }
        }
        return { x: x, y: y, u: best.u, v: best.v };
    };
    return {
        corners: [nearest(minX, maxY), nearest(maxX, maxY), nearest(maxX, minY), nearest(minX, minY)],
        minX: minX,
        maxX: maxX,
        minY: minY,
        maxY: maxY,
        frontZ: frontZ,
    };
}
// ==================================================================== Peripherals
function buildPcTower(scene, frame, box, deskTopY, materials) {
    // The original case is slightly tilted, so its measured box is a bit too big; shrink it so the
    // new case doesn't clip the speaker next to it.
    var width = box.maxX - box.minX - 1.6;
    var depth = box.maxZ - box.minZ - 0.8;
    var height = box.maxY - deskTopY;
    if (width < 1 || height < 1 || depth < 1) {
        return false;
    }
    var centerX = (box.minX + box.maxX) / 2;
    var centerZ = (box.minZ + box.maxZ) / 2;
    var frontZ = centerZ + (depth / 2);
    var body = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-pc-body", width, height, depth, 0.6, scene);
    body.material = materials.slate;
    place(body, frame, centerX, deskTopY + (height / 2), centerZ);
    // Front panel with grille bars, a power button and a light.
    var panel = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-pc-front", width - 0.6, height - 0.6, 0.4, 0.3, scene, 3);
    panel.material = materials.sand;
    place(panel, frame, centerX, deskTopY + (height / 2), frontZ - 0.05);
    var barCount = 4;
    for (var i = 0; i < barCount; i++) {
        var bar = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-pc-grille-".concat(i), width - 1.6, 0.35, 0.3, 0.15, scene, 2);
        bar.material = materials.navy;
        place(bar, frame, centerX, deskTopY + 0.9 + (i * 0.7), frontZ + 0.2);
    }
    var button = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("ff-pc-button", { diameter: 1.0, height: 0.3, tessellation: 20 }, scene);
    button.material = materials.accent;
    button.rotation.x = Math.PI / 2;
    button.position.copyFrom(frame.toWorld(centerX, deskTopY + height - 1.2, frontZ + 0.2));
    button.rotation.y = frame.yaw;
    button.isPickable = false;
    var light = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("ff-pc-light", { diameter: 0.32, segments: 8 }, scene);
    light.material = materials.powerLight;
    place(light, frame, centerX + (width * 0.28), deskTopY + height - 1.2, frontZ + 0.2);
    return true;
}
function buildKeyboard(scene, frame, box, deskTopY, materials) {
    var width = box.maxX - box.minX;
    var depth = box.maxZ - box.minZ;
    if (width < 1 || depth < 1) {
        return false;
    }
    var baseHeight = 0.55;
    var base = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-keyboard-base", width, baseHeight, depth, 0.25, scene, 3);
    base.material = materials.navy;
    place(base, frame, (box.minX + box.maxX) / 2, deskTopY + (baseHeight / 2), (box.minZ + box.maxZ) / 2);
    addKeycaps(scene, frame, __assign(__assign({}, box), { maxY: deskTopY + baseHeight }), materials);
    return true;
}
/**
 * Rows of rounded keycaps, with W, A, S and D picked out in sakura pink (the tank's controls).
 */
function addKeycaps(scene, frame, box, materials) {
    var cap = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-keycap", 1, 1, 1, 0.24, scene, 2);
    cap.material = materials.cream;
    var accentCap = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-keycap-accent", 1, 1, 1, 0.24, scene, 2);
    accentCap.material = materials.accent;
    var columns = 14;
    var rows = 5;
    var margin = 0.4;
    var pitchX = ((box.maxX - box.minX) - (margin * 2)) / columns;
    var pitchZ = ((box.maxZ - box.minZ) - (margin * 2)) / rows;
    var capHeight = 0.4;
    var y = box.maxY + (capHeight / 2) - 0.08;
    var rotation = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion.RotationYawPitchRoll(frame.yaw, 0, 0);
    // Rows go from the back of the keyboard (numbers) to the front (space bar).
    var accentKeys = new Set(["1,2", "2,1", "2,2", "2,3"]);
    var normal = [];
    var accent = [];
    for (var row = 0; row < rows; row++) {
        var z = box.minZ + margin + ((row + 0.5) * pitchZ);
        if (row === rows - 1) {
            normal.push(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Matrix.Compose(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(pitchX * 5.8, capHeight, pitchZ * 0.75), rotation, frame.toWorld((box.minX + box.maxX) / 2, y, z)));
            continue;
        }
        for (var column = 0; column < columns; column++) {
            var x = box.minX + margin + ((column + 0.5) * pitchX);
            var matrix = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Matrix.Compose(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(pitchX * 0.78, capHeight, pitchZ * 0.75), rotation, frame.toWorld(x, y, z));
            (accentKeys.has("".concat(row, ",").concat(column)) ? accent : normal).push(matrix);
        }
    }
    (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.addThinInstances)(cap, normal);
    (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.addThinInstances)(accentCap, accent);
}
function buildMouse(scene, frame, box, deskTopY, materials) {
    var centerX = (box.minX + box.maxX) / 2;
    var centerZ = (box.minZ + box.maxZ) / 2;
    var width = Math.max(1.1, box.maxX - box.minX);
    var depth = Math.max(1.6, box.maxZ - box.minZ);
    var pad = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-mouse-pad", width + 3.2, 0.2, depth + 2.4, 0.1, scene, 2);
    pad.material = materials.accent;
    place(pad, frame, centerX, deskTopY + 0.1, centerZ);
    var body = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("ff-mouse", { diameter: 1, segments: 16 }, scene);
    body.material = materials.sand;
    body.scaling.set(width, 0.75, depth);
    place(body, frame, centerX, deskTopY + 0.2, centerZ);
    var wheel = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("ff-mouse-wheel", { diameter: 0.4, height: 0.16, tessellation: 12 }, scene);
    wheel.material = materials.navy;
    wheel.rotation.z = Math.PI / 2;
    wheel.position.copyFrom(frame.toWorld(centerX, deskTopY + 0.58, centerZ - (depth * 0.22)));
    wheel.rotation.y = frame.yaw;
    wheel.isPickable = false;
    return true;
}
/** The original speakers are one mesh with a speaker on each side of the monitor. */
function buildSpeakers(scene, frame, mesh, deskTopY, materials) {
    var positions = mesh.getVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.PositionKind);
    if (!positions) {
        return false;
    }
    mesh.computeWorldMatrix(true);
    var world = mesh.getWorldMatrix();
    var point = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    var points = [];
    for (var i = 0; i < positions.length; i += 3) {
        _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.TransformCoordinatesFromFloatsToRef(positions[i], positions[i + 1], positions[i + 2], world, point);
        points.push({ x: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Dot(point, frame.right), y: point.y, z: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Dot(point, frame.forward) });
    }
    var middle = (Math.min.apply(Math, points.map(function (p) { return p.x; })) + Math.max.apply(Math, points.map(function (p) { return p.x; }))) / 2;
    var groups = [points.filter(function (p) { return p.x < middle; }), points.filter(function (p) { return p.x >= middle; })];
    groups.forEach(function (group, index) {
        if (!group.length) {
            return;
        }
        var minX = Math.min.apply(Math, group.map(function (p) { return p.x; }));
        var maxX = Math.max.apply(Math, group.map(function (p) { return p.x; }));
        var minZ = Math.min.apply(Math, group.map(function (p) { return p.z; }));
        var maxZ = Math.max.apply(Math, group.map(function (p) { return p.z; }));
        var maxY = Math.max.apply(Math, group.map(function (p) { return p.y; }));
        var width = Math.max(1.5, maxX - minX);
        var depth = Math.max(1.5, maxZ - minZ);
        var height = Math.max(2, maxY - deskTopY);
        var centerX = (minX + maxX) / 2;
        var centerZ = (minZ + maxZ) / 2;
        var body = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ff-speaker-".concat(index), width, height, depth, 0.45, scene, 3);
        body.material = materials.navy;
        place(body, frame, centerX, deskTopY + (height / 2), centerZ);
        // Woofer (big) and tweeter (small) on the front.
        var cones = [
            { diameter: Math.min(width, height) * 0.62, y: deskTopY + (height * 0.36) },
            { diameter: Math.min(width, height) * 0.3, y: deskTopY + (height * 0.78) },
        ];
        cones.forEach(function (cone, coneIndex) {
            if (cone.diameter < 0.3) {
                return;
            }
            var ring = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("ff-speaker-ring-".concat(index, "-").concat(coneIndex), { diameter: cone.diameter, height: 0.2, tessellation: 24 }, scene);
            ring.material = materials.cream;
            ring.rotation.x = Math.PI / 2;
            ring.position.copyFrom(frame.toWorld(centerX, cone.y, maxZ + 0.05));
            ring.rotation.y = frame.yaw;
            ring.isPickable = false;
            var inner = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("ff-speaker-cone-".concat(index, "-").concat(coneIndex), { diameter: cone.diameter * 0.62, height: 0.24, tessellation: 24 }, scene);
            inner.material = materials.coneDark;
            inner.rotation.x = Math.PI / 2;
            inner.position.copyFrom(frame.toWorld(centerX, cone.y, maxZ + 0.08));
            inner.rotation.y = frame.yaw;
            inner.isPickable = false;
        });
    });
    return true;
}
// ==================================================================== Props
function buildProps(scene, frame, deskBox, materials) {
    var deskTopY = deskBox.maxY;
    // Coffee mug on the front-left corner of the desk.
    var mugX = deskBox.minX + 2.4;
    var mugZ = deskBox.maxZ - 2.2;
    var mug = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("ff-mug", { diameter: 1.9, height: 2.1, tessellation: 24 }, scene);
    mug.material = materials.cream;
    place(mug, frame, mugX, deskTopY + 1.05, mugZ);
    var coffee = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("ff-mug-coffee", { diameter: 1.6, height: 0.1, tessellation: 24 }, scene);
    coffee.material = materials.coffee;
    place(coffee, frame, mugX, deskTopY + 1.95, mugZ);
    var handle = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateTorus("ff-mug-handle", { diameter: 1.1, thickness: 0.28, tessellation: 20 }, scene);
    handle.material = materials.accent;
    handle.rotation.x = Math.PI / 2;
    handle.position.copyFrom(frame.toWorld(mugX - 1.05, deskTopY + 1.05, mugZ));
    // Ring standing upright beside the mug, facing the front of the desk.
    handle.rotation.y = frame.yaw;
    handle.isPickable = false;
    // Potted plant on the floor beside the desk.
    var plantX = deskBox.minX - 3.6;
    // Slightly towards the front, clear of the C# trophy behind it.
    var plantZ = ((deskBox.minZ + deskBox.maxZ) / 2) + 3.5;
    var pot = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("ff-plant-pot", { diameterTop: 3.8, diameterBottom: 2.8, height: 3.4, tessellation: 28 }, scene);
    pot.material = materials.pot;
    place(pot, frame, plantX, _core_constants__WEBPACK_IMPORTED_MODULE_2__.GROUND_Y + 1.7, plantZ);
    var rim = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateTorus("ff-plant-rim", { diameter: 3.7, thickness: 0.45, tessellation: 28 }, scene);
    rim.material = materials.pot;
    place(rim, frame, plantX, _core_constants__WEBPACK_IMPORTED_MODULE_2__.GROUND_Y + 3.4, plantZ);
    var soil = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("ff-plant-soil", { diameter: 3.4, height: 0.2, tessellation: 24 }, scene);
    soil.material = materials.soil;
    place(soil, frame, plantX, _core_constants__WEBPACK_IMPORTED_MODULE_2__.GROUND_Y + 3.25, plantZ);
    var random = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRandom)(55);
    var leafTemplates = materials.leaves.map(function (material, i) {
        var leaf = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createLumpyBall)("ff-plant-leaf-".concat(i), scene, random, 1.2, 2);
        leaf.material = material;
        leaf.isVisible = false;
        return leaf;
    });
    var leafLayout = [
        { x: 0, y: 5.6, z: 0, r: 1.9 },
        { x: 1.2, y: 4.6, z: 0.4, r: 1.5 },
        { x: -1.1, y: 4.8, z: -0.3, r: 1.5 },
        { x: 0.2, y: 4.5, z: -1.2, r: 1.4 },
        { x: -0.3, y: 4.4, z: 1.2, r: 1.3 },
        { x: 0.4, y: 6.9, z: 0.2, r: 1.2 },
    ];
    leafLayout.forEach(function (layout, i) {
        var leaf = leafTemplates[i % leafTemplates.length].createInstance("ff-plant-leaves-".concat(i));
        leaf.position.copyFrom(frame.toWorld(plantX + layout.x, _core_constants__WEBPACK_IMPORTED_MODULE_2__.GROUND_Y + layout.y, plantZ + layout.z));
        leaf.scaling.set(layout.r, layout.r * 0.9, layout.r);
        leaf.rotation.y = random() * Math.PI * 2;
        leaf.isPickable = false;
    });
}
// ==================================================================== Helpers
/** Bounding box of a mesh's vertices, measured in the desk's frame. */
function getFrameBox(mesh, frame) {
    var _a;
    mesh.computeWorldMatrix(true);
    var positions = (_a = mesh.getVerticesData(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.PositionKind)) !== null && _a !== void 0 ? _a : [];
    var world = mesh.getWorldMatrix();
    var point = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    var box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
    for (var i = 0; i < positions.length; i += 3) {
        _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.TransformCoordinatesFromFloatsToRef(positions[i], positions[i + 1], positions[i + 2], world, point);
        var x = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Dot(point, frame.right);
        var z = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Dot(point, frame.forward);
        box.minX = Math.min(box.minX, x);
        box.maxX = Math.max(box.maxX, x);
        box.minY = Math.min(box.minY, point.y);
        box.maxY = Math.max(box.maxY, point.y);
        box.minZ = Math.min(box.minZ, z);
        box.maxZ = Math.max(box.maxZ, z);
    }
    return box;
}
/** Positions a mesh in the desk frame and turns it with the desk. */
function place(mesh, frame, x, y, z) {
    mesh.position.copyFrom(frame.toWorld(x, y, z));
    mesh.rotation.y = frame.yaw;
    mesh.isPickable = false;
}


/***/ },

/***/ "./src/scenes/world/fruitFactorySigns.ts"
/*!***********************************************!*\
  !*** ./src/scenes/world/fruitFactorySigns.ts ***!
  \***********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createFruitFactorySigns: () => (/* binding */ createFruitFactorySigns)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_staticBodies__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/staticBodies */ "./src/scenes/core/staticBodies.ts");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");
/* harmony import */ var _infoStand__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./infoStand */ "./src/scenes/world/infoStand.ts");
/* harmony import */ var _core_constants__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../core/constants */ "./src/scenes/core/constants.ts");
/* harmony import */ var _ui_style__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../ui/style */ "./src/scenes/ui/style.ts");






/**
 * The Fruit Factory's signs:
 *
 * - the 3D "FRUIT FACTORY" title is mounted on a toy shop sign behind the desk: a navy board with a
 *   sand rim on two posts, glowing marquee bulbs round the edge and toy fruit sitting on top;
 * - the description that used to lie on the ground is now a tilted info stand facing the camera,
 *   with the game's name, the description and a "Free on Google Play" pill.
 */
var FONT = _ui_style__WEBPACK_IMPORTED_MODULE_5__.UI.font;
var PALETTE = {
    board: "#344B63",
    rim: "#E8DCC6",
    post: "#8B6A50",
    bulb: "#FFE7A8",
    cream: "#F4EBDD",
    navy: "#344B63",
    pink: "#C9667F",
    muted: "#6B7B8C",
    apple: "#D9534F",
    orange: "#F0913A",
    pear: "#C9CF62",
    leaf: "#6E9F7E",
    stem: "#6B4F3A",
};
/** Where the info stand stands: beside the desk, not in front of it from the camera. */
var INFO_STAND_POSITION = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector2(-100, 35);
function createFruitFactorySigns(scene) {
    try {
        createTitleSign(scene);
    }
    catch (error) {
        console.error("Fruit Factory title sign failed", error);
    }
    try {
        createProjectInfoStand(scene);
    }
    catch (error) {
        console.error("Fruit Factory info stand failed", error);
    }
}
// ==================================================================== Title sign
function createTitleSign(scene) {
    var _a;
    var title = scene.getTransformNodeByName("Text");
    var letters = (_a = title === null || title === void 0 ? void 0 : title.getChildMeshes()) !== null && _a !== void 0 ? _a : [];
    if (!letters.length) {
        return;
    }
    var min = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(Infinity, Infinity, Infinity);
    var max = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(-Infinity, -Infinity, -Infinity);
    for (var _i = 0, letters_1 = letters; _i < letters_1.length; _i++) {
        var mesh = letters_1[_i];
        mesh.computeWorldMatrix(true);
        var box = mesh.getBoundingInfo().boundingBox;
        min = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Minimize(min, box.minimumWorld);
        max = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Maximize(max, box.maximumWorld);
    }
    // The letters run along X and face +Z (towards the camera); the board goes just behind them.
    var width = (max.x - min.x) + 4;
    var height = (max.y - min.y) + 3.4;
    var centerX = (min.x + max.x) / 2;
    var centerY = (min.y + max.y) / 2;
    var boardFront = min.z - 0.15;
    var depth = 0.8;
    var boardZ = boardFront - (depth / 2);
    var materials = {
        board: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "ff-title-board", PALETTE.board, { roughness: 0.45, clearCoat: 0.4 }),
        rim: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "ff-title-rim", PALETTE.rim, { roughness: 0.45, clearCoat: 0.4 }),
        post: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "ff-title-post", PALETTE.post, { roughness: 0.55, clearCoat: 0.3 }),
    };
    var board = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createRoundedBox)("ff-title-board", width, height, depth, 0.6, scene);
    board.material = materials.board;
    board.position.set(centerX, centerY, boardZ);
    var rim = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createRoundedBox)("ff-title-board-rim", width + 1.2, height + 1.2, depth * 0.7, 0.8, scene);
    rim.material = materials.rim;
    rim.position.set(centerX, centerY, boardZ - 0.2);
    // Posts from the ground up to the board, at its ends.
    var postTop = centerY;
    for (var _b = 0, _c = [-1, 1]; _b < _c.length; _b++) {
        var side = _c[_b];
        var x = centerX + (side * ((width / 2) - 2.2));
        var post = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createRoundedBox)("ff-title-post-".concat(side), 1.1, postTop - _core_constants__WEBPACK_IMPORTED_MODULE_4__.GROUND_Y, 1.1, 0.35, scene);
        post.material = materials.post;
        post.position.set(x, _core_constants__WEBPACK_IMPORTED_MODULE_4__.GROUND_Y + ((postTop - _core_constants__WEBPACK_IMPORTED_MODULE_4__.GROUND_Y) / 2), boardZ - 0.9);
        (0,_core_staticBodies__WEBPACK_IMPORTED_MODULE_1__.addStaticBox)(scene, post.position, 1.3, postTop - _core_constants__WEBPACK_IMPORTED_MODULE_4__.GROUND_Y, 1.3, { sound: "post" });
    }
    // Marquee bulbs round the edge of the board's front.
    var bulbMaterial = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("ff-title-bulb", scene);
    bulbMaterial.diffuseColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString(PALETTE.bulb);
    bulbMaterial.emissiveColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString(PALETTE.bulb).scale(0.85);
    bulbMaterial.specularColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.3, 0.3, 0.3);
    var bulb = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("ff-title-bulb", { diameter: 0.55, segments: 8 }, scene);
    bulb.material = bulbMaterial;
    bulb.isVisible = false;
    var inset = 0.7;
    var left = centerX - (width / 2) + inset;
    var right = centerX + (width / 2) - inset;
    var bottom = centerY - (height / 2) + inset;
    var top = centerY + (height / 2) - inset;
    var perimeter = [];
    var spacing = 1.6;
    var along = function (x0, y0, x1, y1) {
        var steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / spacing));
        for (var i = 0; i < steps; i++) {
            perimeter.push([x0 + (((x1 - x0) * i) / steps), y0 + (((y1 - y0) * i) / steps)]);
        }
    };
    along(left, bottom, right, bottom);
    along(right, bottom, right, top);
    along(right, top, left, top);
    along(left, top, left, bottom);
    perimeter.forEach(function (_a, i) {
        var x = _a[0], y = _a[1];
        var instance = bulb.createInstance("ff-title-bulb-".concat(i));
        instance.position.set(x, y, boardFront + 0.12);
        instance.isPickable = false;
    });
    // Toy fruit sitting on top of the board.
    var fruitY = centerY + (height / 2) + 0.6;
    createApple(scene, "ff-title-apple", new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(centerX - (width * 0.32), fruitY + 1.1, boardZ), 1.2);
    createOrange(scene, "ff-title-orange", new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(centerX - (width * 0.12), fruitY + 1, boardZ), 1.1);
    createCherries(scene, "ff-title-cherries", new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(centerX + (width * 0.12), fruitY + 0.6, boardZ));
    createPear(scene, "ff-title-pear", new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(centerX + (width * 0.32), fruitY + 1, boardZ), 1);
    for (var _d = 0, _e = [board, rim]; _d < _e.length; _d++) {
        var mesh = _e[_d];
        mesh.isPickable = false;
    }
}
function fruitMaterial(scene, name, hex) {
    var _a;
    return (_a = scene.getMaterialByName(name)) !== null && _a !== void 0 ? _a : (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, name, hex, { roughness: 0.35, clearCoat: 0.7 });
}
function addStemAndLeaf(scene, name, top, size, leafAngle) {
    var stem = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("".concat(name, "-stem"), { diameterTop: 0.12 * size, diameterBottom: 0.2 * size, height: 0.8 * size, tessellation: 8 }, scene);
    stem.material = fruitMaterial(scene, "ff-fruit-stem", PALETTE.stem);
    stem.position.set(top.x, top.y + (0.3 * size), top.z);
    stem.rotation.z = 0.25;
    var leaf = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("".concat(name, "-leaf"), { diameter: 1, segments: 8 }, scene);
    leaf.material = fruitMaterial(scene, "ff-fruit-leaf", PALETTE.leaf);
    leaf.scaling.set(0.7 * size, 0.12 * size, 0.35 * size);
    leaf.rotation.set(0, leafAngle, 0.5);
    leaf.position.set(top.x + (0.35 * size), top.y + (0.45 * size), top.z);
}
function createApple(scene, name, center, size) {
    var apple = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere(name, { diameter: 2 * size, segments: 20 }, scene);
    apple.material = fruitMaterial(scene, "ff-fruit-apple", PALETTE.apple);
    apple.scaling.y = 0.9;
    apple.position.copyFrom(center);
    addStemAndLeaf(scene, name, center.add(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 0.85 * size, 0)), size, 0.4);
}
function createOrange(scene, name, center, size) {
    var orange = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere(name, { diameter: 2 * size, segments: 20 }, scene);
    orange.material = fruitMaterial(scene, "ff-fruit-orange", PALETTE.orange);
    orange.position.copyFrom(center);
    var leaf = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("".concat(name, "-leaf"), { diameter: 1, segments: 8 }, scene);
    leaf.material = fruitMaterial(scene, "ff-fruit-leaf", PALETTE.leaf);
    leaf.scaling.set(0.6 * size, 0.12 * size, 0.3 * size);
    leaf.rotation.z = -0.3;
    leaf.position.set(center.x + (0.25 * size), center.y + (1.02 * size), center.z);
}
function createCherries(scene, name, base) {
    var material = fruitMaterial(scene, "ff-fruit-apple", PALETTE.apple);
    var stemMaterial = fruitMaterial(scene, "ff-fruit-leaf", PALETTE.leaf);
    var joint = base.add(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 2.2, 0));
    for (var _i = 0, _a = [-1, 1]; _i < _a.length; _i++) {
        var side = _a[_i];
        var cherry = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("".concat(name, "-").concat(side), { diameter: 1.2, segments: 14 }, scene);
        cherry.material = material;
        var position = base.add(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(side * 0.65, 0, 0));
        cherry.position.copyFrom(position);
        // Stem from the cherry's top to the shared joint.
        var from = position.add(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 0.5, 0));
        var stem = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateTube("".concat(name, "-stem-").concat(side), {
            path: [from, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Lerp(from, joint, 0.5).add(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(side * 0.25, 0.1, 0)), joint],
            radius: 0.07,
            tessellation: 6,
        }, scene);
        stem.material = stemMaterial;
    }
    var leaf = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("".concat(name, "-leaf"), { diameter: 1, segments: 8 }, scene);
    leaf.material = stemMaterial;
    leaf.scaling.set(0.8, 0.12, 0.4);
    leaf.rotation.z = 0.4;
    leaf.position.set(joint.x + 0.4, joint.y + 0.1, joint.z);
}
function createPear(scene, name, center, size) {
    var material = fruitMaterial(scene, "ff-fruit-pear", PALETTE.pear);
    var body = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere(name, { diameter: 2 * size, segments: 18 }, scene);
    body.material = material;
    body.position.copyFrom(center);
    var neck = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("".concat(name, "-neck"), { diameter: 1.3 * size, segments: 16 }, scene);
    neck.material = material;
    neck.position.set(center.x, center.y + (1.05 * size), center.z);
    addStemAndLeaf(scene, name, center.add(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 1.55 * size, 0)), size * 0.9, -0.5);
}
// ==================================================================== Info stand
/** Title, description, a "Free on Google Play" pill and a few drawn fruits. */
function createProjectInfoStand(scene) {
    (0,_infoStand__WEBPACK_IMPORTED_MODULE_3__.createInfoStand)(scene, {
        id: "ff-info-stand",
        x: INFO_STAND_POSITION.x,
        z: INFO_STAND_POSITION.y,
        draw: function (context) {
            var pad = 64;
            var bottom = (0,_infoStand__WEBPACK_IMPORTED_MODULE_3__.drawInfoText)(context, FONT, {
                eyebrow: "MY PROJECTS",
                eyebrowColor: PALETTE.pink,
                title: "Idle Fruit Factory",
                titleColor: PALETTE.navy,
                body: "My first Android mobile game. Download it for free on the Google Play Store.",
                bodyColor: PALETTE.muted,
                maxWidth: 580,
            });
            // Pill badge.
            var pillY = bottom + 18;
            var pillHeight = 76;
            context.font = "900 36px ".concat(FONT);
            var pillText = "Free on Google Play";
            var pillWidth = context.measureText(pillText).width + 120;
            (0,_infoStand__WEBPACK_IMPORTED_MODULE_3__.roundRect)(context, pad, pillY, pillWidth, pillHeight, pillHeight / 2);
            context.fillStyle = PALETTE.navy;
            context.fill();
            context.fillStyle = PALETTE.cream;
            // Little "play" triangle.
            context.beginPath();
            context.moveTo(pad + 34, pillY + 22);
            context.lineTo(pad + 60, pillY + (pillHeight / 2));
            context.lineTo(pad + 34, pillY + pillHeight - 22);
            context.closePath();
            context.fill();
            context.fillText(pillText, pad + 80, pillY + 50);
            // Fruit doodles on the right.
            drawApple(context, 890, 200, 72);
            drawOrange(context, 820, 410, 60);
            drawCherries(context, 935, 420);
        },
    });
}
function drawLeaf(context, x, y, size, angle) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.fillStyle = PALETTE.leaf;
    context.beginPath();
    context.ellipse(size / 2, 0, size / 2, size / 4.5, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
}
function drawApple(context, x, y, r) {
    context.fillStyle = PALETTE.stem;
    context.fillRect(x - 5, y - r - 26, 10, 34);
    drawLeaf(context, x + 6, y - r - 12, 56, -0.5);
    context.fillStyle = PALETTE.apple;
    context.beginPath();
    context.ellipse(x, y, r, r * 0.92, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255,255,255,0.35)";
    context.beginPath();
    context.ellipse(x - (r * 0.38), y - (r * 0.35), r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2);
    context.fill();
}
function drawOrange(context, x, y, r) {
    context.fillStyle = PALETTE.orange;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
    drawLeaf(context, x + 4, y - r + 4, 46, -0.3);
    context.fillStyle = "rgba(255,255,255,0.3)";
    context.beginPath();
    context.ellipse(x - (r * 0.35), y - (r * 0.35), r * 0.2, r * 0.13, -0.6, 0, Math.PI * 2);
    context.fill();
}
function drawCherries(context, x, y) {
    context.strokeStyle = PALETTE.leaf;
    context.lineWidth = 7;
    context.lineCap = "round";
    for (var _i = 0, _a = [-1, 1]; _i < _a.length; _i++) {
        var side = _a[_i];
        context.beginPath();
        context.moveTo(x + (side * 30), y);
        context.quadraticCurveTo(x + (side * 14), y - 60, x + 6, y - 96);
        context.stroke();
    }
    drawLeaf(context, x + 6, y - 96, 44, -0.2);
    context.fillStyle = PALETTE.apple;
    for (var _b = 0, _c = [-1, 1]; _b < _c.length; _b++) {
        var side = _c[_b];
        context.beginPath();
        context.arc(x + (side * 30), y + 18, 30, 0, Math.PI * 2);
        context.fill();
    }
}


/***/ },

/***/ "./src/scenes/world/ground.ts"
/*!************************************!*\
  !*** ./src/scenes/world/ground.ts ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   decorateGround: () => (/* binding */ decorateGround)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _playground__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./playground */ "./src/scenes/world/playground.ts");
/* harmony import */ var _roads__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./roads */ "./src/scenes/world/roads.ts");
/* harmony import */ var _core_staticBodies__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../core/staticBodies */ "./src/scenes/core/staticBodies.ts");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");
/* harmony import */ var _core_constants__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../core/constants */ "./src/scenes/core/constants.ts");
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};






/**
 * Gives the flat ground some character without changing its shape: a soft play-mat texture, and
 * decorations scattered around (bushes, boulders, pebbles, fallen petals under the trees and toy
 * flowers).
 *
 * Everything is placed from a fixed seed, so the layout is the same on every visit, and kept clear
 * of gameplay objects (anything with a physics body, the roads, signs and the spawn area). The
 * bushes and boulders are solid.
 */
/** Decorations are scattered within this distance of the world origin. */
var SCATTER_RADIUS = 230;
/** Keep the area around the tank's spawn point clear. */
var SPAWN_CLEAR_RADIUS = 28;
var PALETTE = {
    mat: "#337CA0",
    matAlt: "#3884A8",
    matSeam: "#2B6D8E",
    matSeamLight: "#4A93B6",
    pebbles: ["#C9BFAE", "#A99F8F", "#DDD3C2"],
    petals: ["#F3C6D1", "#F8DCE3"],
    stem: "#5E8F6D",
    flowerCenter: "#D9A13B",
    flowers: ["#F3C6D1", "#F4EBDD", "#E9AFBF"],
    bushes: ["#6E9F7E", "#5B8C70", "#82B08F"],
    boulders: ["#B8B1A3", "#9C968A", "#CFC7B8"],
};
function decorateGround(scene, treePositions) {
    try {
        restyleGroundMaterial(scene);
    }
    catch (error) {
        console.error("Ground restyle failed, keeping the original", error);
    }
    try {
        scatterDecorations(scene, treePositions);
    }
    catch (error) {
        console.error("Ground decorations failed", error);
    }
}
// ==================================================================== Play-mat ground
function restyleGroundMaterial(scene) {
    var ground = scene.getMeshByName("ground");
    if (!ground) {
        return;
    }
    var size = 512;
    var tilesPerTexture = 2;
    var tileWorldSize = 30;
    var texture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("toy-ground-mat", { width: size, height: size }, scene, true);
    var context = texture.getContext();
    var tile = size / tilesPerTexture;
    // Checker of two close blues, like interlocking foam play-mat tiles.
    for (var ty = 0; ty < tilesPerTexture; ty++) {
        for (var tx = 0; tx < tilesPerTexture; tx++) {
            context.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.mat : PALETTE.matAlt;
            context.fillRect(tx * tile, ty * tile, tile, tile);
        }
    }
    // Foam speckle.
    var random = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.createRandom)(3);
    for (var i = 0; i < 2600; i++) {
        var light = random() > 0.5;
        context.fillStyle = light ? "rgba(255,255,255,0.06)" : "rgba(0,30,60,0.07)";
        var radius = 0.6 + (random() * 1.6);
        context.beginPath();
        context.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
        context.fill();
    }
    // Embossed seams between tiles: a dark groove with a light edge next to it. Drawn on the
    // texture's edges as well so neighbouring repeats line up.
    for (var i = 0; i <= tilesPerTexture; i++) {
        var position = i * tile;
        context.fillStyle = PALETTE.matSeam;
        context.fillRect(position - 2, 0, 4, size);
        context.fillRect(0, position - 2, size, 4);
        context.fillStyle = PALETTE.matSeamLight;
        context.fillRect(position + 2, 0, 2, size);
        context.fillRect(0, position + 2, size, 2);
    }
    texture.update();
    texture.wrapU = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Texture.WRAP_ADDRESSMODE;
    texture.wrapV = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Texture.WRAP_ADDRESSMODE;
    texture.anisotropicFilteringLevel = 8;
    ground.computeWorldMatrix(true);
    var extent = ground.getBoundingInfo().boundingBox.extendSizeWorld;
    texture.uScale = (extent.x * 2) / (tileWorldSize * tilesPerTexture);
    texture.vScale = (extent.z * 2) / (tileWorldSize * tilesPerTexture);
    // Plain (non-PBR) material like the original, so the ground keeps the same brightness.
    var material = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("toy-ground", scene);
    material.diffuseTexture = texture;
    material.specularColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.06, 0.06, 0.06);
    ground.material = material;
}
// ==================================================================== Decorations
function scatterDecorations(scene, treePositions) {
    var random = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.createRandom)(2024);
    var blocked = collectBlockedAreas(scene);
    var isFree = function (x, z, margin) {
        if (Math.hypot(x, z) < SPAWN_CLEAR_RADIUS + margin) {
            return false;
        }
        return !blocked.some(function (area) { return x > area.minX - margin && x < area.maxX + margin && z > area.minZ - margin && z < area.maxZ + margin; });
    };
    var randomSpot = function (margin, minDistance) {
        if (minDistance === void 0) { minDistance = SPAWN_CLEAR_RADIUS; }
        for (var attempt = 0; attempt < 40; attempt++) {
            var angle = random() * Math.PI * 2;
            var distance = minDistance + (Math.sqrt(random()) * (SCATTER_RADIUS - minDistance));
            var x = Math.cos(angle) * distance;
            var z = Math.sin(angle) * distance;
            if (isFree(x, z, margin)) {
                return new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector2(x, z);
            }
        }
        return null;
    };
    // ---- Bushes first (they are solid, so later decorations avoid them).
    var bushTemplates = PALETTE.bushes.map(function (hex, i) { return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.createTemplate)((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.createLumpyBall)("deco-bush-puff-".concat(i), scene, random), (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.createToyMaterial)(scene, "toy-bush-".concat(i), hex, { roughness: 0.6, clearCoat: 0.15 })); });
    for (var i = 0; i < 20; i++) {
        var spot = randomSpot(9, 45);
        if (!spot) {
            continue;
        }
        var bush = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("deco-bush-".concat(i), scene);
        bush.position.set(spot.x, _core_constants__WEBPACK_IMPORTED_MODULE_5__.GROUND_Y, spot.y);
        bush.rotation.y = random() * Math.PI * 2;
        var puffCount = 3 + Math.floor(random() * 3);
        for (var p = 0; p < puffCount; p++) {
            var angle = (p / puffCount) * Math.PI * 2;
            var radius = 2.2 + (random() * 1.3);
            var offset = p === 0 ? 0 : 1.8 + (random() * 0.8);
            var puff = bushTemplates[Math.floor(random() * bushTemplates.length)].createInstance("deco-bush-".concat(i, "-").concat(p));
            puff.parent = bush;
            puff.position.set(Math.cos(angle) * offset, radius * 0.75, Math.sin(angle) * offset);
            puff.scaling.set(radius, radius * 0.85, radius);
            puff.rotation.y = random() * Math.PI * 2;
            puff.isPickable = false;
        }
        // A simple solid sphere so the tank bumps into the bush instead of driving through it.
        (0,_core_staticBodies__WEBPACK_IMPORTED_MODULE_3__.addStaticSphere)(scene, new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(spot.x, _core_constants__WEBPACK_IMPORTED_MODULE_5__.GROUND_Y + 2, spot.y), 3.5, { sound: "bush" });
        blocked.push({ minX: spot.x - 4, maxX: spot.x + 4, minZ: spot.y - 4, maxZ: spot.y + 4 });
    }
    // ---- Boulders: big solid rocks to steer around.
    var boulderMaterials = PALETTE.boulders.map(function (hex, i) { return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.createToyMaterial)(scene, "toy-boulder-".concat(i), hex, { roughness: 0.7, clearCoat: 0.15 }); });
    for (var i = 0; i < 10; i++) {
        var spot = randomSpot(8, 50);
        if (!spot) {
            continue;
        }
        var size = 2.6 + (random() * 2.6);
        var boulder = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.createLumpyBall)("deco-boulder-".concat(i), scene, random, 2.2, 2);
        boulder.material = boulderMaterials[i % boulderMaterials.length];
        boulder.scaling.set(size * (1 + (random() * 0.4)), size * 0.75, size);
        boulder.rotation.y = random() * Math.PI * 2;
        boulder.position.set(spot.x, _core_constants__WEBPACK_IMPORTED_MODULE_5__.GROUND_Y + (size * 0.45), spot.y);
        boulder.isPickable = false;
        (0,_core_staticBodies__WEBPACK_IMPORTED_MODULE_3__.addStaticSphere)(scene, boulder.position, size, { sound: "rock" });
        var margin = size + 1;
        blocked.push({ minX: spot.x - margin, maxX: spot.x + margin, minZ: spot.y - margin, maxZ: spot.y + margin });
    }
    // ---- Pebbles, alone and in small groups.
    var pebbleMeshes = PALETTE.pebbles.map(function (hex, i) {
        var pebble = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.createLumpyBall)("deco-pebble-".concat(i), scene, random, 1.8, 2);
        pebble.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.createToyMaterial)(scene, "toy-pebble-".concat(i), hex, { roughness: 0.65, clearCoat: 0.2 });
        return pebble;
    });
    var pebbleMatrices = pebbleMeshes.map(function () { return []; });
    for (var group = 0; group < 95; group++) {
        var spot = randomSpot(2);
        if (!spot) {
            continue;
        }
        var count = 1 + Math.floor(random() * 4);
        for (var i = 0; i < count; i++) {
            var x = spot.x + ((random() - 0.5) * 4);
            var z = spot.y + ((random() - 0.5) * 4);
            if (!isFree(x, z, 1)) {
                continue;
            }
            var size = 0.5 + (random() * 0.9);
            pebbleMatrices[Math.floor(random() * pebbleMeshes.length)].push(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Matrix.Compose(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(size, size * 0.6, size * (0.8 + (random() * 0.4))), _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion.RotationYawPitchRoll(random() * Math.PI * 2, 0, 0), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(x, _core_constants__WEBPACK_IMPORTED_MODULE_5__.GROUND_Y + (size * 0.15), z)));
        }
    }
    pebbleMeshes.forEach(function (mesh, i) { return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.addThinInstances)(mesh, pebbleMatrices[i]); });
    // ---- Fallen petals around each tree.
    var petalMeshes = PALETTE.petals.map(function (hex, i) {
        var petal = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("ground-petal-".concat(i), { diameter: 1, height: 0.06, tessellation: 10 }, scene);
        petal.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.createToyMaterial)(scene, "toy-ground-petal-".concat(i), hex, { roughness: 0.6 });
        return petal;
    });
    var petalMatrices = petalMeshes.map(function () { return []; });
    for (var _i = 0, treePositions_1 = treePositions; _i < treePositions_1.length; _i++) {
        var tree = treePositions_1[_i];
        for (var i = 0; i < 70; i++) {
            var angle = random() * Math.PI * 2;
            // More petals near the trunk, thinning out towards the canopy's edge.
            var distance = 3.5 + (Math.pow(random(), 0.7) * 13);
            var x = tree.x + (Math.cos(angle) * distance);
            var z = tree.z + (Math.sin(angle) * distance);
            var size = 0.6 + (random() * 0.5);
            petalMatrices[Math.floor(random() * petalMeshes.length)].push(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Matrix.Compose(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(size * 1.6, 1, size), _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion.RotationYawPitchRoll(random() * Math.PI * 2, (random() - 0.5) * 0.2, (random() - 0.5) * 0.2), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(x, _core_constants__WEBPACK_IMPORTED_MODULE_5__.GROUND_Y + 0.03 + (random() * 0.02), z)));
        }
    }
    petalMeshes.forEach(function (mesh, i) { return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.addThinInstances)(mesh, petalMatrices[i]); });
    // ---- Toy flowers in little clusters.
    var flowerMeshes = PALETTE.flowers.map(function (hex, i) { return createFlowerMesh(scene, "deco-flower-".concat(i), hex); });
    var flowerMatrices = flowerMeshes.map(function () { return []; });
    for (var cluster = 0; cluster < 26; cluster++) {
        var spot = randomSpot(4);
        if (!spot) {
            continue;
        }
        var colorIndex = Math.floor(random() * flowerMeshes.length);
        var count = 4 + Math.floor(random() * 5);
        for (var i = 0; i < count; i++) {
            var x = spot.x + ((random() - 0.5) * 6);
            var z = spot.y + ((random() - 0.5) * 6);
            if (!isFree(x, z, 1)) {
                continue;
            }
            var size = 1.3 + (random() * 0.6);
            flowerMatrices[random() < 0.75 ? colorIndex : Math.floor(random() * flowerMeshes.length)].push(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Matrix.Compose(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(size, size * (0.8 + (random() * 0.5)), size), _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion.RotationYawPitchRoll(random() * Math.PI * 2, (random() - 0.5) * 0.25, (random() - 0.5) * 0.25), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(x, _core_constants__WEBPACK_IMPORTED_MODULE_5__.GROUND_Y, z)));
        }
    }
    flowerMeshes.forEach(function (mesh, i) { return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.addThinInstances)(mesh, flowerMatrices[i]); });
}
/**
 * Areas to keep clear: every visible object standing on the ground (buildings, props, trees,
 * podium, signs, roads, targets, bricks...) plus invisible ones that have a physics body. The ground
 * itself and the tank are ignored.
 */
function collectBlockedAreas(scene) {
    var tank = scene.getMeshByName("tank_holder");
    // Roads are handled above with areas along their length (their bounding boxes would cover far
    // too much).
    var ignored = /^(ground|tank_holder|splatter\d*|ball|deco-|ground-petal|road-)/;
    // The ramps' run-up lanes and the roads stay clear too.
    var areas = __spreadArray(__spreadArray([], _playground__WEBPACK_IMPORTED_MODULE_1__.PLAYGROUND_LANES, true), (0,_roads__WEBPACK_IMPORTED_MODULE_2__.getRoadClearAreas)(), true).map(function (lane) { return (__assign({}, lane)); });
    for (var _i = 0, _a = scene.meshes; _i < _a.length; _i++) {
        var mesh = _a[_i];
        if (!mesh.isEnabled() || ignored.test(mesh.name) || (tank && mesh.isDescendantOf(tank))) {
            continue;
        }
        if (!mesh.isVisible && !mesh.physicsImpostor) {
            continue;
        }
        mesh.computeWorldMatrix(true);
        var box = mesh.getBoundingInfo().boundingBox;
        var width = box.maximumWorld.x - box.minimumWorld.x;
        var depth = box.maximumWorld.z - box.minimumWorld.z;
        if (width > 1000 || depth > 1000) {
            continue;
        }
        areas.push({ minX: box.minimumWorld.x, maxX: box.maximumWorld.x, minZ: box.minimumWorld.z, maxZ: box.maximumWorld.z });
    }
    return areas;
}
/** A small toy flower: stem, five rounded petals and a centre, merged into one mesh. */
function createFlowerMesh(scene, name, petalHex) {
    var stemMaterial = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.createToyMaterial)(scene, "".concat(name, "-stem"), PALETTE.stem, { roughness: 0.6 });
    var petalMaterial = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.createToyMaterial)(scene, "".concat(name, "-petals"), petalHex, { roughness: 0.5, clearCoat: 0.3 });
    var centerMaterial = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_4__.createToyMaterial)(scene, "".concat(name, "-center"), PALETTE.flowerCenter, { roughness: 0.45, clearCoat: 0.3 });
    var stem = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("".concat(name, "-stem"), { diameter: 0.16, height: 1.4, tessellation: 6 }, scene);
    stem.position.y = 0.7;
    stem.material = stemMaterial;
    var parts = [stem];
    for (var i = 0; i < 5; i++) {
        var angle = (i / 5) * Math.PI * 2;
        var petal = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("".concat(name, "-petal-").concat(i), { diameter: 0.5, segments: 6 }, scene);
        petal.scaling.set(1, 0.4, 1);
        petal.position.set(Math.cos(angle) * 0.3, 1.45, Math.sin(angle) * 0.3);
        petal.material = petalMaterial;
        parts.push(petal);
    }
    var center = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("".concat(name, "-center"), { diameter: 0.34, segments: 6 }, scene);
    center.position.y = 1.5;
    center.material = centerMaterial;
    parts.push(center);
    var flower = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.MergeMeshes(parts, true, true, undefined, false, true);
    if (!flower) {
        throw new Error("Failed to build flower mesh");
    }
    flower.name = name;
    return flower;
}


/***/ },

/***/ "./src/scenes/world/infoStand.ts"
/*!***************************************!*\
  !*** ./src/scenes/world/infoStand.ts ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createInfoStand: () => (/* binding */ createInfoStand),
/* harmony export */   drawInfoText: () => (/* binding */ drawInfoText),
/* harmony export */   roundRect: () => (/* binding */ roundRect)
/* harmony export */ });
/* unused harmony exports INFO_FACE_WIDTH, wrapText */
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_staticBodies__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/staticBodies */ "./src/scenes/core/staticBodies.ts");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");
/* harmony import */ var _core_constants__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../core/constants */ "./src/scenes/core/constants.ts");




/**
 * A tilted info stand facing the camera: a navy-framed panel leaning back on two wooden legs, with
 * a face drawn on a canvas (cream background, text, doodles). Used for the project and work
 * descriptions.
 */
var PALETTE = {
    frame: "#344B63",
    leg: "#8B6A50",
    face: "#F4EBDD",
};
/** The face is drawn on a canvas this many pixels wide. */
var INFO_FACE_WIDTH = 1024;
function createInfoStand(scene, options) {
    var _a, _b, _c, _d;
    var id = options.id;
    var panelWidth = (_a = options.width) !== null && _a !== void 0 ? _a : 22;
    var panelHeight = (_b = options.height) !== null && _b !== void 0 ? _b : 13;
    var tilt = (40 * Math.PI) / 180;
    var bottomY = 1.6;
    var root = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode(id, scene);
    root.position.set(options.x, _core_constants__WEBPACK_IMPORTED_MODULE_3__.GROUND_Y, options.z);
    root.rotation.y = _core_constants__WEBPACK_IMPORTED_MODULE_3__.FACE_CAMERA_YAW;
    // The panel leans back, so it faces up towards the camera (which looks down at ~30°).
    var panel = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("".concat(id, "-panel"), scene);
    panel.parent = root;
    panel.position.set(0, bottomY + ((panelHeight / 2) * Math.cos(tilt)), (panelHeight / 2) * Math.sin(tilt));
    panel.rotation.x = tilt;
    var frame = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createRoundedBox)("".concat(id, "-frame"), panelWidth + 1.4, panelHeight + 1.4, 0.7, 0.6, scene);
    frame.material = (_c = scene.getMaterialByName("info-stand-frame")) !== null && _c !== void 0 ? _c : (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "info-stand-frame", PALETTE.frame, { roughness: 0.45, clearCoat: 0.4 });
    frame.parent = panel;
    frame.position.z = 0.35;
    var face = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreatePlane("".concat(id, "-face"), { width: panelWidth, height: panelHeight }, scene);
    face.material = createFaceMaterial(scene, id, panelWidth, panelHeight, options.draw);
    face.parent = panel;
    face.position.z = -0.03;
    // Two legs behind the panel and a little foot at the front edge of each.
    var legMaterial = (_d = scene.getMaterialByName("info-stand-leg")) !== null && _d !== void 0 ? _d : (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "info-stand-leg", PALETTE.leg, { roughness: 0.55, clearCoat: 0.3 });
    var legZ = (panelHeight / 2) * Math.sin(tilt) + 0.8;
    var legHeight = panel.position.y;
    for (var _i = 0, _e = [-1, 1]; _i < _e.length; _i++) {
        var side = _e[_i];
        var leg = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createRoundedBox)("".concat(id, "-leg-").concat(side), 0.9, legHeight, 0.9, 0.3, scene);
        leg.material = legMaterial;
        leg.parent = root;
        leg.position.set(side * (panelWidth / 2 - 2.5), legHeight / 2, legZ);
        var foot = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createRoundedBox)("".concat(id, "-foot-").concat(side), 1.4, 0.6, legZ + 1.5, 0.25, scene);
        foot.material = legMaterial;
        foot.parent = root;
        foot.position.set(side * (panelWidth / 2 - 2.5), 0.3, legZ / 2);
    }
    for (var _f = 0, _g = root.getChildMeshes(); _f < _g.length; _f++) {
        var mesh = _g[_f];
        mesh.isPickable = false;
    }
    // Solid, so the tank bumps into it.
    root.computeWorldMatrix(true);
    var center = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.TransformCoordinates(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 4, legZ / 2), root.getWorldMatrix());
    (0,_core_staticBodies__WEBPACK_IMPORTED_MODULE_1__.addStaticBox)(scene, center, panelWidth + 1.4, 8, legZ + 3, { rotation: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion.RotationYawPitchRoll(_core_constants__WEBPACK_IMPORTED_MODULE_3__.FACE_CAMERA_YAW, 0, 0), sound: "solid" });
    return root;
}
function createFaceMaterial(scene, id, panelWidth, panelHeight, draw) {
    var width = INFO_FACE_WIDTH;
    var height = Math.round((width * panelHeight) / panelWidth);
    var texture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("".concat(id, "-texture"), { width: width, height: height }, scene, true);
    var context = texture.getContext();
    var redraw = function () {
        context.fillStyle = PALETTE.face;
        context.fillRect(0, 0, width, height);
        context.textAlign = "left";
        context.textBaseline = "alphabetic";
        draw(context, width, height);
        texture.update();
    };
    redraw();
    // Redraw with the rounded web font once it has loaded.
    if ("fonts" in document) {
        void document.fonts.load("900 40px Nunito").then(redraw).catch(function () { return undefined; });
    }
    var material = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("".concat(id, "-material"), scene);
    material.diffuseTexture = texture;
    material.specularColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.08, 0.08, 0.08);
    material.emissiveColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.22, 0.22, 0.22);
    return material;
}
/** Splits `text` into lines no wider than `maxWidth` in the context's current font. */
function wrapText(context, text, maxWidth) {
    var lines = [];
    var line = "";
    for (var _i = 0, _a = text.split(" "); _i < _a.length; _i++) {
        var word = _a[_i];
        var candidate = line ? "".concat(line, " ").concat(word) : word;
        if (context.measureText(candidate).width > maxWidth && line) {
            lines.push(line);
            line = word;
        }
        else {
            line = candidate;
        }
    }
    if (line) {
        lines.push(line);
    }
    return lines;
}
function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
}
/**
 * The standard layout: a small coloured eyebrow, a big title (shrunk to fit `maxWidth`), and a
 * wrapped description. Returns the y just below the description, for whatever comes next.
 */
function drawInfoText(context, font, text) {
    var pad = 64;
    context.fillStyle = text.eyebrowColor;
    context.font = "900 34px ".concat(font);
    context.fillText(text.eyebrow, pad, 96);
    var titleSize = 74;
    context.font = "900 ".concat(titleSize, "px ").concat(font);
    while (titleSize > 40 && context.measureText(text.title).width > text.maxWidth + 120) {
        titleSize -= 2;
        context.font = "900 ".concat(titleSize, "px ").concat(font);
    }
    context.fillStyle = text.titleColor;
    context.fillText(text.title, pad, 190);
    context.fillStyle = text.bodyColor;
    context.font = "800 40px ".concat(font);
    var lines = wrapText(context, text.body, text.maxWidth);
    lines.forEach(function (line, i) { return context.fillText(line, pad, 262 + (i * 52)); });
    return 262 + (lines.length * 52);
}


/***/ },

/***/ "./src/scenes/world/landmarks.ts"
/*!***************************************!*\
  !*** ./src/scenes/world/landmarks.ts ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   restyleLandmarks: () => (/* binding */ restyleLandmarks)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _roads__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./roads */ "./src/scenes/world/roads.ts");
/* harmony import */ var _core_staticBodies__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/staticBodies */ "./src/scenes/core/staticBodies.ts");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");
/* harmony import */ var _core_math__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../core/math */ "./src/scenes/core/math.ts");





/**
 * Restyles static landmarks from the editor scene to match the toy look: the social-media podium,
 * the roads (replaced by the road network in roads.ts) and the signs lying on the ground. The
 * original meshes keep their role (the podium keeps its physics body and the logos parented to
 * it); they are only hidden and replaced by toy-style geometry.
 */
var PALETTE = {
    podiumBody: "#E8DCC6",
    first: "#C9A35B",
    third: "#B07A52",
    second: "#AEB8C2",
    numbers: "#344B63",
    logoBlue: "#456F99",
    logoSakura: "#E8869F",
    slabs: ["#D8CBB4", "#CFC1A8", "#E0D4BF", "#C9B79C"],
    mortar: "#8F8372",
    edgePebbles: ["#9C9282", "#B3A893"],
    cobbleTint: "#C4C2BC",
};
function restyleLandmarks(scene) {
    try {
        restylePodium(scene);
    }
    catch (error) {
        console.error("Podium restyle failed, keeping the original", error);
    }
    try {
        restyleRoads(scene);
    }
    catch (error) {
        console.error("Road restyle failed, keeping the original", error);
    }
    try {
        restyleSigns(scene);
    }
    catch (error) {
        console.error("Sign restyle failed, keeping the originals", error);
    }
}
// ==================================================================== Podium
/**
 * The podium mesh is three boxes side by side (2nd, 1st, 3rd place). These are their extents in
 * the podium's local space, taken from its geometry; local +Z is up and local +Y is the front.
 * The third step no longer has a logo or target (X/Twitter was removed).
 */
var PODIUM_STEPS = [
    { place: 2, minX: -2.7, maxX: -1, topZ: 0.3 },
    { place: 1, minX: -1, maxX: 1, topZ: 1 },
    { place: 3, minX: 1, maxX: 2.64, topZ: -0.25 },
];
function restylePodium(scene) {
    var _a, _b, _c;
    var podium = scene.getMeshByName("podium");
    if (!podium) {
        return;
    }
    podium.computeWorldMatrix(true);
    var world = podium.getWorldMatrix();
    var front = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.TransformNormal(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 1, 0), world).normalize();
    var bodyMaterial = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createToyMaterial)(scene, "toy-podium-body", PALETTE.podiumBody, { roughness: 0.5, clearCoat: 0.35 });
    var capMaterials = {
        1: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createToyMaterial)(scene, "toy-podium-first", PALETTE.first, { roughness: 0.3, metallic: 0.6, clearCoat: 0.4 }),
        2: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createToyMaterial)(scene, "toy-podium-second", PALETTE.second, { roughness: 0.3, metallic: 0.6, clearCoat: 0.4 }),
        3: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createToyMaterial)(scene, "toy-podium-third", PALETTE.third, { roughness: 0.35, metallic: 0.5, clearCoat: 0.4 }),
    };
    var capThickness = 1.4;
    var capOverhang = 0.3;
    for (var _i = 0, PODIUM_STEPS_1 = PODIUM_STEPS; _i < PODIUM_STEPS_1.length; _i++) {
        var step = PODIUM_STEPS_1[_i];
        // World-space box of this step (the podium is only rotated by multiples of 90°).
        var corners = [
            new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(step.minX, -1, -1),
            new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(step.maxX, 1, step.topZ),
        ].map(function (corner) { return _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.TransformCoordinates(corner, world); });
        var min = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Minimize(corners[0], corners[1]);
        var max = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Maximize(corners[0], corners[1]);
        var size = max.subtract(min);
        var center = min.add(max).scaleInPlace(0.5);
        // Body, slightly inset so neighbouring steps read as separate blocks.
        var bodyHeight = size.y - capThickness + 0.2;
        var body = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("podium-step-".concat(step.place), size.x - 0.3, bodyHeight, size.z - 0.3, 0.9, scene);
        body.material = bodyMaterial;
        body.position.set(center.x, min.y + (bodyHeight / 2), center.z);
        // Medal-coloured cap; its top is exactly the old step top, where the logos stand.
        var cap = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("podium-cap-".concat(step.place), size.x + (capOverhang * 2) - 0.3, capThickness, size.z + (capOverhang * 2) - 0.3, 0.5, scene);
        cap.material = capMaterials[step.place];
        cap.position.set(center.x, max.y - (capThickness / 2), center.z);
        // Place number on the front face.
        var numberSize = Math.min(size.x, size.z, bodyHeight) * 0.55;
        var number = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreatePlane("toy-place-number-".concat(step.place), { size: numberSize }, scene);
        number.material = createNumberMaterial(scene, step.place);
        var frontOffset = (Math.abs(front.x) * size.x / 2) + (Math.abs(front.z) * size.z / 2) - 0.1;
        number.position.set(center.x + (front.x * frontOffset), min.y + (bodyHeight * 0.5), center.z + (front.z * frontOffset));
        // A plane faces -Z; turn it to face the podium's front.
        number.rotation.y = Math.atan2(-front.x, -front.z);
        [body, cap, number].forEach(function (mesh) {
            mesh.isPickable = false;
        });
        // Solid step (replacing the old three-step physics body below).
        (0,_core_staticBodies__WEBPACK_IMPORTED_MODULE_2__.addStaticBox)(scene, center, size.x, size.y, size.z, { sound: "solid" });
    }
    // Hide the old blocks (the logos stay parented to it). Its physics body is replaced by the
    // per-step boxes above, which follow the steps' shapes more closely. The scene loader doesn't
    // set mesh.physicsImpostor, so look the body up through the physics engine.
    podium.isVisible = false;
    (_c = ((_a = podium.physicsImpostor) !== null && _a !== void 0 ? _a : (_b = scene.getPhysicsEngine()) === null || _b === void 0 ? void 0 : _b.getImpostorForPhysicsObject(podium))) === null || _c === void 0 ? void 0 : _c.dispose();
    podium.physicsImpostor = null;
    for (var _d = 0, _e = podium.getChildMeshes(); _d < _e.length; _d++) {
        var child = _e[_d];
        var name_1 = child.name.toLowerCase();
        if (name_1.includes("twitter")) {
            child.setEnabled(false);
        }
        else if (name_1.includes("linkedin")) {
            child.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createToyMaterial)(scene, "toy-logo-".concat(name_1), PALETTE.logoBlue, { roughness: 0.4, clearCoat: 0.6 });
        }
        else if (name_1.includes("stlmesh")) {
            child.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createToyMaterial)(scene, "toy-logo-sakura", PALETTE.logoSakura, { roughness: 0.45, clearCoat: 0.5 });
        }
    }
}
function createNumberMaterial(scene, place) {
    var size = 256;
    var texture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("toy-podium-number-".concat(place, "-texture"), { width: size, height: size }, scene, true);
    texture.hasAlpha = true;
    var context = texture.getContext();
    context.clearRect(0, 0, size, size);
    context.fillStyle = PALETTE.numbers;
    context.font = "900 ".concat(size * 0.8, "px \"Arial Rounded MT Bold\", \"Nunito\", \"Trebuchet MS\", Arial, sans-serif");
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(place), size / 2, size * 0.54);
    texture.update();
    var material = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("toy-podium-number-".concat(place), scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.specularColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.1, 0.1, 0.1);
    material.emissiveColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.15, 0.15, 0.18);
    material.zOffset = -2;
    return material;
}
// ==================================================================== Roads
/**
 * Replaces the imported road patches with the road network (see roads.ts), using the same
 * cobblestone material and edge pebbles.
 */
function restyleRoads(scene) {
    for (var _i = 0, _a = scene.meshes.filter(function (mesh) { return /^road\d*$/i.test(mesh.name); }); _i < _a.length; _i++) {
        var road = _a[_i];
        road.setEnabled(false);
    }
    var random = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRandom)(42);
    var pebbles = PALETTE.edgePebbles.map(function (hex, i) {
        var pebble = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createLumpyBall)("road-edge-pebble-".concat(i), scene, random, 1.6, 2);
        pebble.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createToyMaterial)(scene, "toy-road-edge-".concat(i), hex, { roughness: 0.7, clearCoat: 0.15 });
        return pebble;
    });
    (0,_roads__WEBPACK_IMPORTED_MODULE_1__.createRoadNetwork)(scene, createCobbleMaterial(scene), pebbles);
}
/**
 * Cobblestone texture generated on a canvas: a colour map with stones in a few tones and darker
 * mortar, plus a matching normal map so the stones look raised with rounded edges.
 */
function createCobbleMaterial(scene) {
    var size = 512;
    var rows = 4;
    var columns = 3;
    var cellWidth = size / columns;
    var cellHeight = size / rows;
    var mortar = 7;
    var cornerRadius = 22;
    var bevel = 20;
    var random = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRandom)(9);
    var stoneColors = PALETTE.slabs.map(function (hex) { return _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString(hex); });
    var mortarColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString(PALETTE.mortar);
    var cellTone = [];
    var cellShade = [];
    for (var i = 0; i < rows * columns; i++) {
        cellTone.push(Math.floor(random() * stoneColors.length));
        cellShade.push(0.94 + (random() * 0.1));
    }
    var heights = new Float32Array(size * size);
    var colorTexture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("toy-cobble-color", { width: size, height: size }, scene, true);
    var colorContext = colorTexture.getContext();
    var colorImage = colorContext.createImageData(size, size);
    for (var y = 0; y < size; y++) {
        var row = Math.floor(y / cellHeight);
        var shift = (row % 2) * (cellWidth / 2);
        for (var x = 0; x < size; x++) {
            var shiftedX = (x + shift) % size;
            var column = Math.floor(shiftedX / cellWidth);
            // Rounded-rectangle distance from the stone's edge (positive inside the stone).
            var qx = (cellWidth / 2) - (mortar / 2) - Math.abs(shiftedX - ((column + 0.5) * cellWidth));
            var qy = (cellHeight / 2) - (mortar / 2) - Math.abs(y - ((row + 0.5) * cellHeight));
            var distance = Math.min(qx, qy);
            if (qx < cornerRadius && qy < cornerRadius) {
                distance = cornerRadius - Math.hypot(cornerRadius - qx, cornerRadius - qy);
            }
            var grain = (Math.sin(x * 0.9) * Math.sin(y * 1.3) * 0.5) + (random() - 0.5);
            var height = distance <= 0 ? 0 : (0,_core_math__WEBPACK_IMPORTED_MODULE_4__.smoothStep)(0, bevel, distance) + (grain * 0.015);
            heights[(y * size) + x] = height;
            var cell = (row * columns) + column;
            var stone = stoneColors[cellTone[cell]];
            var shade = distance <= 0 ? 1 : cellShade[cell] * (0.9 + (0.1 * (0,_core_math__WEBPACK_IMPORTED_MODULE_4__.smoothStep)(0, bevel, distance))) + (grain * 0.02);
            var base = distance <= 0 ? mortarColor : stone;
            var offset = ((y * size) + x) * 4;
            colorImage.data[offset] = clampByte(base.r * 255 * shade);
            colorImage.data[offset + 1] = clampByte(base.g * 255 * shade);
            colorImage.data[offset + 2] = clampByte(base.b * 255 * shade);
            colorImage.data[offset + 3] = 255;
        }
    }
    colorContext.putImageData(colorImage, 0, 0);
    colorTexture.update();
    var normalTexture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("toy-cobble-normal", { width: size, height: size }, scene, true);
    var normalContext = normalTexture.getContext();
    var normalImage = normalContext.createImageData(size, size);
    var strength = 6;
    var heightAt = function (x, y) { return heights[(((y + size) % size) * size) + ((x + size) % size)]; };
    for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
            var nx = (heightAt(x - 1, y) - heightAt(x + 1, y)) * strength;
            var ny = (heightAt(x, y - 1) - heightAt(x, y + 1)) * strength;
            var length_1 = Math.hypot(nx, ny, 1);
            var offset = ((y * size) + x) * 4;
            normalImage.data[offset] = clampByte(((nx / length_1) * 0.5 + 0.5) * 255);
            normalImage.data[offset + 1] = clampByte(((ny / length_1) * 0.5 + 0.5) * 255);
            normalImage.data[offset + 2] = clampByte(((1 / length_1) * 0.5 + 0.5) * 255);
            normalImage.data[offset + 3] = 255;
        }
    }
    normalContext.putImageData(normalImage, 0, 0);
    normalTexture.update();
    normalTexture.gammaSpace = false;
    [colorTexture, normalTexture].forEach(function (texture) {
        texture.wrapU = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Texture.WRAP_ADDRESSMODE;
        texture.wrapV = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Texture.WRAP_ADDRESSMODE;
        texture.anisotropicFilteringLevel = 8;
    });
    // Muted, slightly cool tint so the roads sit with the blue ground instead of glowing cream.
    var material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createToyMaterial)(scene, "toy-road-cobbles", PALETTE.cobbleTint, { roughness: 0.78, clearCoat: 0.08 });
    material.albedoTexture = colorTexture;
    material.bumpTexture = normalTexture;
    return material;
}
function clampByte(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}
// ==================================================================== Signs
/**
 * Signs lying on the ground: extruded 3D text, and the Fruit Factory description (white text on a
 * transparent image). Each gets a raised navy plate with a sand rim underneath, like a toy name
 * plate, and the 3D letters get a glossy cream plastic finish.
 */
function restyleSigns(scene) {
    var _a;
    // The description lying on the ground is replaced by the info stand in fruitFactorySigns.ts.
    (_a = scene.getMeshByName("ffdescription")) === null || _a === void 0 ? void 0 : _a.setEnabled(false);
}


/***/ },

/***/ "./src/scenes/world/mascots.ts"
/*!*************************************!*\
  !*** ./src/scenes/world/mascots.ts ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   restyleMascots: () => (/* binding */ restyleMascots)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");
/* harmony import */ var _core_constants__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/constants */ "./src/scenes/core/constants.ts");



/**
 * Gives the imported models (the big sword and the big symbol) the same toy finish as the rest
 * of the world: glossy plastic materials in the site's palette, plus a few small set pieces
 * around them. Their geometry, positions and physics are
 * unchanged.
 */
var PALETTE = {
    steel: "#C9D2DA",
    symbolInside: "#E8869F",
    symbolOutside: "#344B63",
    sand: "#E8DCC6",
    stone: "#CFC1A8",
};
function restyleMascots(scene) {
    try {
        restyleSword(scene);
    }
    catch (error) {
        console.error("Sword restyle failed, keeping the original", error);
    }
    try {
        restyleSymbol(scene);
    }
    catch (error) {
        console.error("Symbol restyle failed, keeping the original", error);
    }
}
/** The sword in toy steel, with a ring of stones where it's stuck in the ground. */
function restyleSword(scene) {
    var sword = scene.getMeshByName("berserk_sword");
    if (!sword) {
        return;
    }
    sword.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-sword-steel", PALETTE.steel, { roughness: 0.25, metallic: 0.55, clearCoat: 0.6 });
    sword.computeWorldMatrix(true);
    var center = sword.getBoundingInfo().boundingBox.centerWorld;
    var stone = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-sword-stone", PALETTE.stone, { roughness: 0.65, clearCoat: 0.15 });
    for (var i = 0; i < 7; i++) {
        var angle = ((i / 7) * Math.PI * 2) + 0.3;
        var rock = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("monument-sword-stone-".concat(i), { diameter: 1, segments: 8 }, scene);
        rock.material = stone;
        var size = 1.2 + ((i % 3) * 0.45);
        rock.scaling.set(size, size * 0.5, size * 0.9);
        rock.position.set(center.x + (Math.cos(angle) * 3.6), _core_constants__WEBPACK_IMPORTED_MODULE_2__.GROUND_Y + 0.15, center.z + (Math.sin(angle) * 3.6));
        rock.isPickable = false;
    }
}
/** The symbol in glossy pink on navy, standing on a low sand plinth. */
function restyleSymbol(scene) {
    var inside = scene.getMeshByName("berserk_symbol_inside");
    var outside = scene.getMeshByName("berserk_symbol_outside");
    if (inside) {
        inside.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-symbol-inside", PALETTE.symbolInside, { roughness: 0.4, clearCoat: 0.6 });
    }
    if (!outside) {
        return;
    }
    outside.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-symbol-outside", PALETTE.symbolOutside, { roughness: 0.45, clearCoat: 0.5 });
    // Low plinth under the symbol's footprint.
    outside.computeWorldMatrix(true);
    var box = outside.getBoundingInfo().boundingBox;
    var width = box.maximumWorld.x - box.minimumWorld.x;
    var depth = box.maximumWorld.z - box.minimumWorld.z;
    var plinth = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("monument-symbol-plinth", Math.min(width, 10) + 1, 1.2, Math.min(depth, 10) + 1, 0.5, scene);
    plinth.material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-symbol-plinth", PALETTE.sand, { roughness: 0.5, clearCoat: 0.35 });
    plinth.position.set(box.centerWorld.x, _core_constants__WEBPACK_IMPORTED_MODULE_2__.GROUND_Y + 0.5, box.centerWorld.z);
    plinth.isPickable = false;
}


/***/ },

/***/ "./src/scenes/world/playground.ts"
/*!****************************************!*\
  !*** ./src/scenes/world/playground.ts ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PLAYGROUND_LANES: () => (/* binding */ PLAYGROUND_LANES),
/* harmony export */   collideWithRamps: () => (/* binding */ collideWithRamps),
/* harmony export */   createPlayground: () => (/* binding */ createPlayground),
/* harmony export */   getPlaygroundHeight: () => (/* binding */ getPlaygroundHeight)
/* harmony export */ });
/* unused harmony export RAMP_COLLISION_GROUP */
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");
/* harmony import */ var _core_staticBodies__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/staticBodies */ "./src/scenes/core/staticBodies.ts");
/* harmony import */ var _core_constants__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../core/constants */ "./src/scenes/core/constants.ts");
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};




/**
 * Toy playground pieces to drive over and knock around:
 *
 * - a stunt park: a slalom of toy traffic cones leading to a kicker ramp, a gap, and a landing ramp,
 * - a hump bridge near the start: up a ramp, over a platform and down the other side.
 *
 * Ramps and platforms are solid for loose objects (bricks, cones, shots), but not for the tank: the
 * tank rides on them through `getPlaygroundHeight`, which tank/movement.ts uses for its own simple vertical
 * movement (so it follows the slopes smoothly, flies off ramp ends and lands).
 */
/** Ramps and platforms sit this far above the ground, just above any road under them. */
var SURFACE_LIFT = 0.05;
/**
 * cannon.js collision groups. Everything is in group 1 and collides with group 1 (cannon's
 * default). Ramps and platforms are in their own group, which only loose objects (bricks, cones,
 * trophies, shots) add to their collision mask with `collideWithRamps`; the tank doesn't, so it
 * drives onto them using its own height logic instead.
 */
var DEFAULT_COLLISION_GROUP = 1;
var RAMP_COLLISION_GROUP = 2;
/** Lets a loose object's body collide with the ramps and platforms too. */
function collideWithRamps(impostor) {
    var body = impostor === null || impostor === void 0 ? void 0 : impostor.physicsBody;
    if (body) {
        body.collisionFilterMask = DEFAULT_COLLISION_GROUP | RAMP_COLLISION_GROUP;
    }
}
var RAMPS = [
    // Stunt park: kicker (rising towards +X), a 14-unit gap, then the landing ramp (rising towards
    // -X). At full speed the tank clears the gap and lands about half way down the landing ramp.
    { name: "stunt-kicker", x: 113, z: -25, yaw: Math.PI / 2, length: 18, width: 16, height: 5 },
    { name: "stunt-landing", x: 147, z: -25, yaw: -Math.PI / 2, length: 22, width: 16, height: 5 },
    // Hump bridge south-east of the start.
    { name: "hump-up", x: 32, z: -70, yaw: Math.PI / 2, length: 12, width: 14, height: 3 },
    { name: "hump-down", x: 50, z: -70, yaw: -Math.PI / 2, length: 12, width: 14, height: 3 },
];
var PLATFORMS = [
    { name: "hump-top", x: 41, z: -70, yaw: Math.PI / 2, length: 6, width: 14, height: 3 },
];
var CONES = Array.from({ length: 7 }, function (_, i) { return ({
    x: 58 + (i * 6.5),
    z: -25 + (i % 2 === 0 ? 4.5 : -4.5),
}); });
/** Run-up lanes that decorations (bushes, boulders) must keep clear of. */
var PLAYGROUND_LANES = [
    { minX: 40, maxX: 165, minZ: -38, maxZ: -12 },
    { minX: 0, maxX: 80, minZ: -82, maxZ: -58 },
];
var PALETTE = {
    rampTop: "#F4EBDD",
    rampStripe: "#E8869F",
    rampSide: "#456F99",
    rampRail: "#344B63",
    cone: "#E8743B",
    coneStripe: "#F4EBDD",
    coneBase: "#344B63",
};
/**
 * Height of the playground surface (ramps and platforms) above the ground at a point, or 0 where
 * there is none.
 */
function getPlaygroundHeight(x, z) {
    var height = 0;
    for (var _i = 0, RAMPS_1 = RAMPS; _i < RAMPS_1.length; _i++) {
        var ramp = RAMPS_1[_i];
        var local = toLocal(ramp, x, z);
        if (Math.abs(local.across) <= ramp.width / 2 && Math.abs(local.along) <= ramp.length / 2) {
            height = Math.max(height, ramp.height * ((local.along + (ramp.length / 2)) / ramp.length));
        }
    }
    for (var _a = 0, PLATFORMS_1 = PLATFORMS; _a < PLATFORMS_1.length; _a++) {
        var platform = PLATFORMS_1[_a];
        var local = toLocal(platform, x, z);
        if (Math.abs(local.across) <= platform.width / 2 && Math.abs(local.along) <= platform.length / 2) {
            height = Math.max(height, platform.height);
        }
    }
    return height;
}
function toLocal(shape, x, z) {
    var dx = x - shape.x;
    var dz = z - shape.z;
    var sin = Math.sin(shape.yaw);
    var cos = Math.cos(shape.yaw);
    return { along: (dx * sin) + (dz * cos), across: (dx * cos) - (dz * sin) };
}
function createPlayground(scene) {
    var materials = {
        top: createStripedMaterial(scene),
        side: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-ramp-side", PALETTE.rampSide, { roughness: 0.45, clearCoat: 0.4 }),
        rail: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-ramp-rail", PALETTE.rampRail, { roughness: 0.4, clearCoat: 0.5 }),
    };
    for (var _i = 0, RAMPS_2 = RAMPS; _i < RAMPS_2.length; _i++) {
        var ramp = RAMPS_2[_i];
        try {
            createRamp(scene, ramp, materials);
        }
        catch (error) {
            console.error("Ramp \"".concat(ramp.name, "\" failed"), error);
        }
    }
    for (var _a = 0, PLATFORMS_2 = PLATFORMS; _a < PLATFORMS_2.length; _a++) {
        var platform = PLATFORMS_2[_a];
        try {
            createPlatform(scene, platform, materials);
        }
        catch (error) {
            console.error("Platform \"".concat(platform.name, "\" failed"), error);
        }
    }
    try {
        createCones(scene);
    }
    catch (error) {
        console.error("Cones failed", error);
    }
}
/**
 * A wedge: striped top sloping up along local +Z, blue sides and back, and a rail along each top
 * edge. Plus an invisible tilted slab under the slope for loose objects to collide with.
 */
function createRamp(scene, ramp, materials) {
    var l = ramp.length, w = ramp.width, h = ramp.height;
    var root = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("ramp-".concat(ramp.name), scene);
    // Raised a hair so roads running underneath don't poke through the low edge.
    root.position.set(ramp.x, _core_constants__WEBPACK_IMPORTED_MODULE_3__.GROUND_Y + SURFACE_LIFT, ramp.z);
    root.rotation.y = ramp.yaw;
    // Top: a single quad from the low edge (z = -l/2, y = 0) to the high edge (z = l/2, y = h).
    var top = buildQuad("ramp-".concat(ramp.name, "-top"), [
        [-w / 2, 0.02, -l / 2], [w / 2, 0.02, -l / 2], [w / 2, h, l / 2], [-w / 2, h, l / 2],
    ], scene, { u: w / 6, v: Math.hypot(l, h) / 6 });
    top.material = materials.top;
    top.parent = root;
    // Sides (triangles) and the back (a rectangle at the high end).
    var sides = [];
    for (var _i = 0, _a = [-1, 1]; _i < _a.length; _i++) {
        var side = _a[_i];
        sides.push(buildTriangle("ramp-".concat(ramp.name, "-side-").concat(side), [
            [side * w / 2, 0, -l / 2], [side * w / 2, 0, l / 2], [side * w / 2, h, l / 2],
        ], side, scene));
    }
    sides.push(buildQuad("ramp-".concat(ramp.name, "-back"), [
        [-w / 2, 0, l / 2], [w / 2, 0, l / 2], [w / 2, h, l / 2], [-w / 2, h, l / 2],
    ], scene));
    var body = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.MergeMeshes(sides, true, true);
    if (body) {
        body.name = "ramp-".concat(ramp.name, "-body");
        body.material = materials.side;
        body.parent = root;
    }
    // Rounded rails along the top edges, following the slope.
    var slope = Math.atan2(h, l);
    var slopeLength = Math.hypot(l, h);
    for (var _b = 0, _c = [-1, 1]; _b < _c.length; _b++) {
        var side = _c[_b];
        var rail = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("ramp-".concat(ramp.name, "-rail-").concat(side), 0.7, 0.6, slopeLength, 0.25, scene);
        rail.material = materials.rail;
        rail.parent = root;
        rail.rotation.x = -slope;
        rail.position.set(side * ((w / 2) - 0.2), (h / 2) + 0.2, 0);
    }
    for (var _d = 0, _e = root.getChildMeshes(); _d < _e.length; _d++) {
        var mesh = _e[_d];
        mesh.isPickable = false;
    }
    // Collider for loose objects: a slab whose top is the slope.
    var thickness = Math.min(2, h);
    var normal = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, Math.cos(slope), -Math.sin(slope));
    var center = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, h / 2, 0).subtract(normal.scale(thickness / 2));
    var worldCenter = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.TransformCoordinates(center, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Matrix.RotationY(ramp.yaw));
    (0,_core_staticBodies__WEBPACK_IMPORTED_MODULE_2__.addStaticBox)(scene, new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(ramp.x + worldCenter.x, _core_constants__WEBPACK_IMPORTED_MODULE_3__.GROUND_Y + worldCenter.y, ramp.z + worldCenter.z), w, thickness, slopeLength, __assign({ rotation: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion.RotationYawPitchRoll(ramp.yaw, -slope, 0) }, LOOSE_OBJECTS_ONLY));
}
/** A flat-topped block with the same look as the ramps. */
function createPlatform(scene, platform, materials) {
    var root = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("platform-".concat(platform.name), scene);
    root.position.set(platform.x, _core_constants__WEBPACK_IMPORTED_MODULE_3__.GROUND_Y + SURFACE_LIFT, platform.z);
    root.rotation.y = platform.yaw;
    var block = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("platform-".concat(platform.name, "-body"), platform.width, platform.height, platform.length, 0.15, scene);
    block.material = materials.side;
    block.parent = root;
    block.position.y = platform.height / 2;
    var top = buildQuad("platform-".concat(platform.name, "-top"), [
        [-platform.width / 2, platform.height + 0.02, -platform.length / 2],
        [platform.width / 2, platform.height + 0.02, -platform.length / 2],
        [platform.width / 2, platform.height + 0.02, platform.length / 2],
        [-platform.width / 2, platform.height + 0.02, platform.length / 2],
    ], scene, { u: platform.width / 6, v: platform.length / 6 });
    top.material = materials.top;
    top.parent = root;
    for (var _i = 0, _a = [-1, 1]; _i < _a.length; _i++) {
        var side = _a[_i];
        var rail = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("platform-".concat(platform.name, "-rail-").concat(side), 0.7, 0.6, platform.length, 0.25, scene);
        rail.material = materials.rail;
        rail.parent = root;
        rail.position.set(side * ((platform.width / 2) - 0.2), platform.height + 0.2, 0);
    }
    for (var _b = 0, _c = root.getChildMeshes(); _b < _c.length; _b++) {
        var mesh = _c[_b];
        mesh.isPickable = false;
    }
    (0,_core_staticBodies__WEBPACK_IMPORTED_MODULE_2__.addStaticBox)(scene, new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(platform.x, _core_constants__WEBPACK_IMPORTED_MODULE_3__.GROUND_Y + (platform.height / 2), platform.z), platform.width, platform.height, platform.length, __assign({ rotation: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion.RotationYawPitchRoll(platform.yaw, 0, 0) }, LOOSE_OBJECTS_ONLY));
}
/** Ramps and platforms collide with loose objects but let the tank through (it rides on the height map). */
var LOOSE_OBJECTS_ONLY = { group: RAMP_COLLISION_GROUP, mask: DEFAULT_COLLISION_GROUP, sound: "ramp" };
/**
 * Toy traffic cones: navy base, orange cone with a cream band. Light and loose, so the tank and
 * shots send them flying.
 */
function createCones(scene) {
    var coneMaterial = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-cone", PALETTE.cone, { roughness: 0.4, clearCoat: 0.6 });
    var stripeMaterial = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-cone-stripe", PALETTE.coneStripe, { roughness: 0.4, clearCoat: 0.6 });
    var baseMaterial = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-cone-base", PALETTE.coneBase, { roughness: 0.45, clearCoat: 0.4 });
    CONES.forEach(function (spot, i) {
        var height = 3.4;
        // The body is the collider: physics first, then the visible parts are parented to it.
        var collider = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("cone-".concat(i), { diameter: 2.2, height: height, tessellation: 12 }, scene);
        collider.position.set(spot.x, _core_constants__WEBPACK_IMPORTED_MODULE_3__.GROUND_Y + (height / 2) + 0.02, spot.z);
        collider.isVisible = false;
        collider.isPickable = false;
        collider.physicsImpostor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor(collider, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor.CylinderImpostor, { mass: 0.4, friction: 0.6, restitution: 0.2 }, scene);
        var parts = [];
        var base = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRoundedBox)("cone-".concat(i, "-base"), 2.5, 0.4, 2.5, 0.15, scene, 2);
        base.material = baseMaterial;
        base.position.y = (-height / 2) + 0.2;
        parts.push(base);
        var cone = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("cone-".concat(i, "-body"), { diameterTop: 0.35, diameterBottom: 1.9, height: height - 0.4, tessellation: 24 }, scene);
        cone.material = coneMaterial;
        cone.position.y = 0.2;
        parts.push(cone);
        var stripe = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("cone-".concat(i, "-stripe"), { diameterTop: 0.95, diameterBottom: 1.3, height: 0.7, tessellation: 24 }, scene);
        stripe.material = stripeMaterial;
        stripe.position.y = 0.45;
        parts.push(stripe);
        for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
            var part = parts_1[_i];
            part.parent = collider;
            part.isPickable = false;
            part.metadata = { keepUnfrozen: true };
        }
    });
}
/** Cream top with diagonal pink stripes, repeated over the surface. */
function createStripedMaterial(scene) {
    var size = 256;
    var texture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("toy-ramp-stripes", { width: size, height: size }, scene, true);
    var context = texture.getContext();
    context.fillStyle = PALETTE.rampTop;
    context.fillRect(0, 0, size, size);
    // Chevrons pointing up the slope (V runs along the slope).
    context.fillStyle = PALETTE.rampStripe;
    for (var i = 0; i < 2; i++) {
        var y = (i * size) / 2;
        context.beginPath();
        context.moveTo(0, y + (size * 0.3));
        context.lineTo(size / 2, y + (size * 0.05));
        context.lineTo(size, y + (size * 0.3));
        context.lineTo(size, y + (size * 0.42));
        context.lineTo(size / 2, y + (size * 0.17));
        context.lineTo(0, y + (size * 0.42));
        context.closePath();
        context.fill();
    }
    texture.update();
    texture.wrapU = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Texture.WRAP_ADDRESSMODE;
    texture.wrapV = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Texture.WRAP_ADDRESSMODE;
    var material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-ramp-top", "#FFFFFF", { roughness: 0.5, clearCoat: 0.3 });
    material.albedoTexture = texture;
    return material;
}
function buildQuad(name, corners, scene, uvScale) {
    if (uvScale === void 0) { uvScale = { u: 1, v: 1 }; }
    var positions = corners.flat();
    var a = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.FromArray(corners[0]);
    var b = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.FromArray(corners[1]);
    var d = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.FromArray(corners[3]);
    // Normal pointing out of the shape: up for the tops, +Z for the back.
    var normal = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.Cross(d.subtract(a), b.subtract(a)).normalize();
    if (normal.y < -0.01 || (Math.abs(normal.y) < 0.01 && normal.z < 0)) {
        normal = normal.scale(-1);
    }
    var normals = [0, 1, 2, 3].flatMap(function () { return [normal.x, normal.y, normal.z]; });
    var indices = [];
    (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.pushOrientedTriangle)(indices, positions, normals, 0, 1, 2);
    (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.pushOrientedTriangle)(indices, positions, normals, 0, 2, 3);
    var uvs = [0, 0, uvScale.u, 0, uvScale.u, uvScale.v, 0, uvScale.v];
    return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.buildMesh)(name, positions, normals, indices, scene, uvs);
}
function buildTriangle(name, corners, side, scene) {
    var positions = corners.flat();
    var normals = [0, 1, 2].flatMap(function () { return [side, 0, 0]; });
    var indices = [];
    (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.pushOrientedTriangle)(indices, positions, normals, 0, 1, 2);
    return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.buildMesh)(name, positions, normals, indices, scene, [0, 0, 1, 0, 1, 1]);
}


/***/ },

/***/ "./src/scenes/world/roads.ts"
/*!***********************************!*\
  !*** ./src/scenes/world/roads.ts ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createRoadNetwork: () => (/* binding */ createRoadNetwork),
/* harmony export */   getRoadClearAreas: () => (/* binding */ getRoadClearAreas)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _playground__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./playground */ "./src/scenes/world/playground.ts");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");
/* harmony import */ var _core_math__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../core/math */ "./src/scenes/core/math.ts");
/* harmony import */ var _core_constants__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../core/constants */ "./src/scenes/core/constants.ts");





/**
 * The road network:
 *
 * - a winding main loop past the start, the targets on the podium, the Berserk
 *   corner and AI trophies, the projects and back past the signpost;
 * - a stunt road that branches off it, runs through the cone slalom and under the jump ramps, then
 *   sweeps north and back into the loop;
 * - a hump road that leaves the stunt road, goes over the hump bridge and rejoins it before the
 *   jump;
 * - a path out towards the brick tower that thins out into stepping stones on the grass;
 * - a path to the work corner, which ends in stepping stones in front of it.
 *
 * To keep them from dominating the view, roads are not solid ribbons: they are laid as separate
 * paving slabs with thin strips of grass between them (two staggered rows on the main road,
 * single slabs with wider gaps and the odd missing one on side paths), with slightly ragged outer
 * edges and a few pebbles alongside. Side paths are narrower and wobble a little in width. The
 * cobble texture is mapped in world space, so slabs of different roads match where they meet.
 */
var ROAD_Y = _core_constants__WEBPACK_IMPORTED_MODULE_4__.GROUND_Y + 0.06;
/** Clearance kept around roads for decorations. */
var EDGE_MARGIN = 1;
/** World units per repeat of the cobble texture. */
var TEXTURE_SIZE = 8;
var SAMPLE_SPACING = 1.5;
/** How far before an open end a road starts to narrow. */
var FADE_LENGTH = 16;
var ROADS = [
    {
        name: "loop",
        width: 12,
        closed: true,
        main: true,
        points: [[0, 0], [26, 10], [50, 24], [57, 48], [46, 74], [28, 94], [2, 92], [-22, 76], [-44, 56], [-60, 32], [-60, 10], [-46, -6], [-24, -8]],
    },
    {
        // From the loop near the start, through the slalom and under both ramps, then round the
        // east side and back into the loop north of the podium.
        name: "stunt-road",
        width: 10,
        points: [[8, 3], [22, -12], [38, -22], [56, -25], [80, -25], [113, -25], [147, -25], [170, -20], [182, 2], [168, 36], [134, 54], [98, 60], [74, 67], [55, 62]],
    },
    {
        // Off the stunt road, over the hump bridge, and back onto it before the jump.
        name: "hump-road",
        width: 10,
        points: [[30, -19], [27, -38], [18, -58], [26, -70], [41, -70], [58, -71], [76, -74], [94, -62], [101, -42], [100, -28]],
    },
    {
        name: "tower-path",
        width: 9,
        fadeOut: true,
        points: [[-48, 52], [-64, 64], [-82, 70], [-98, 80]],
    },
    {
        name: "work-path",
        width: 9,
        fadeOut: true,
        points: [[-35, -7], [-38, -32], [-34, -58]],
    },
];
var ROAD_SAMPLES = ROADS.map(function (road, index) {
    var samples = sampleCurve(road.points, SAMPLE_SPACING, !!road.closed);
    var length = samples.length * SAMPLE_SPACING;
    samples.forEach(function (sample, i) {
        var distance = i * SAMPLE_SPACING;
        var half = road.width / 2;
        if (!road.main) {
            // Gentle, uneven wobble so side roads don't look machine-made.
            half *= 1 + (0.07 * Math.sin((distance * 0.21) + index)) + (0.04 * Math.sin((distance * 0.57) + (index * 2.3)));
        }
        if (road.fadeOut) {
            var remaining = length - distance;
            half *= 0.35 + (0.65 * (0,_core_math__WEBPACK_IMPORTED_MODULE_3__.smoothStep)(0, FADE_LENGTH, remaining));
        }
        sample.half = half;
    });
    return samples;
});
/**
 * Areas (axis-aligned squares) along the roads that decorations keep clear of.
 */
function getRoadClearAreas() {
    var areas = [];
    for (var _i = 0, ROAD_SAMPLES_1 = ROAD_SAMPLES; _i < ROAD_SAMPLES_1.length; _i++) {
        var samples = ROAD_SAMPLES_1[_i];
        for (var i = 0; i < samples.length; i += 3) {
            var s = samples[i];
            var half = s.half + EDGE_MARGIN + 1.5;
            areas.push({ minX: s.x - half, maxX: s.x + half, minZ: s.z - half, maxZ: s.z + half });
        }
    }
    return areas;
}
function createRoadNetwork(scene, cobbles, pebbles) {
    var random = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createRandom)(31);
    var pebbleMatrices = pebbles.map(function () { return []; });
    var addPebble = function (x, z) {
        if ((0,_playground__WEBPACK_IMPORTED_MODULE_1__.getPlaygroundHeight)(x, z) > 0) {
            return;
        }
        var size = 0.45 + (random() * 0.45);
        pebbleMatrices[Math.floor(random() * pebbles.length)].push(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Matrix.Compose(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(size, size * 0.55, size), _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion.RotationYawPitchRoll(random() * Math.PI * 2, 0, 0), new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(x, _core_constants__WEBPACK_IMPORTED_MODULE_4__.GROUND_Y + 0.05, z)));
    };
    var surfaces = [];
    ROAD_SAMPLES.forEach(function (samples, roadIndex) {
        var road = ROADS[roadIndex];
        surfaces.push.apply(surfaces, buildSlabs("road-".concat(road.name), samples, !!road.main, random, scene));
        var _loop_1 = function (side) {
            var edgeOffset = 0.8;
            var points = samples.map(function (s) { return ({
                x: s.x - (s.dz * side * (s.half + edgeOffset)),
                z: s.z + (s.dx * side * (s.half + edgeOffset)),
                nx: -s.dz * side,
                nz: s.dx * side,
            }); });
            if (road.closed) {
                points.push(points[0]);
            }
            for (var _b = 0, _c = splitRuns(points, function (p) { return !isInsideOtherRoad(p.x, p.z, roadIndex); }); _b < _c.length; _b++) {
                var run = _c[_b];
                for (var _d = 0, run_1 = run; _d < run_1.length; _d++) {
                    var p = run_1[_d];
                    if (random() < 0.18) {
                        var out = random() * 1.4;
                        addPebble(p.x + (p.nx * out), p.z + (p.nz * out));
                    }
                }
            }
        };
        // A loose scatter of pebbles along both edges (not where another road joins).
        for (var _i = 0, _a = [-1, 1]; _i < _a.length; _i++) {
            var side = _a[_i];
            _loop_1(side);
        }
        if (road.fadeOut) {
            surfaces.push.apply(surfaces, buildSteppingStones(road.name, samples, random, scene));
        }
    });
    var roadMesh = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.MergeMeshes(surfaces, true, true);
    if (roadMesh) {
        roadMesh.name = "road-network";
        roadMesh.material = cobbles;
        roadMesh.isPickable = false;
    }
    pebbles.forEach(function (mesh, i) { return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.addThinInstances)(mesh, pebbleMatrices[i]); });
}
// ==================================================================== Geometry
/**
 * Where a path fades out: flat cobble stones continuing along its direction, getting smaller and
 * further apart and wandering a little to the sides.
 */
function buildSteppingStones(name, samples, random, scene) {
    var end = samples[samples.length - 1];
    var stones = [];
    var distance = 1.5;
    for (var i = 0; i < 9; i++) {
        var t = i / 8;
        var sideways = (random() - 0.5) * (2.4 + (t * 2));
        var x = end.x + (end.dx * distance) - (end.dz * sideways);
        var z = end.z + (end.dz * distance) + (end.dx * sideways);
        var radius = (1.5 - (t * 0.8)) * (0.85 + (random() * 0.3));
        stones.push(buildDisc("road-".concat(name, "-stone-").concat(i), x, z, radius, radius * (0.75 + (random() * 0.25)), random() * Math.PI, ROAD_Y, scene));
        distance += 2.4 + (t * 2.6) + (random() * 0.8);
    }
    return stones;
}
/** Catmull-Rom curve through the points (optionally closed), resampled at even spacing. */
function sampleCurve(points, spacing, closed) {
    var dense = [];
    var p = points.map(function (_a) {
        var x = _a[0], z = _a[1];
        return new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector2(x, z);
    });
    var n = p.length;
    var at = function (i) { return (closed ? p[((i % n) + n) % n] : p[Math.max(0, Math.min(n - 1, i))]); };
    var segments = closed ? n : n - 1;
    for (var i = 0; i < segments; i++) {
        for (var t = 0; t < 1; t += 0.02) {
            dense.push(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector2.CatmullRom(at(i - 1), at(i), at(i + 1), at(i + 2), t));
        }
    }
    dense.push(closed ? p[0] : p[n - 1]);
    var samples = [dense[0]];
    var carried = 0;
    for (var i = 1; i < dense.length; i++) {
        var from = dense[i - 1];
        var to = dense[i];
        var segment = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector2.Distance(from, to);
        while (carried + segment >= spacing) {
            var t = (spacing - carried) / segment;
            var point = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector2.Lerp(from, to, t);
            samples.push(point);
            segment -= spacing - carried;
            from = point;
            carried = 0;
        }
        carried += segment;
    }
    if (!closed && _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector2.Distance(samples[samples.length - 1], dense[dense.length - 1]) > spacing * 0.3) {
        samples.push(dense[dense.length - 1]);
    }
    var count = samples.length;
    return samples.map(function (point, i) {
        var prev = closed ? samples[(i - 1 + count) % count] : samples[Math.max(0, i - 1)];
        var next = closed ? samples[(i + 1) % count] : samples[Math.min(count - 1, i + 1)];
        var direction = next.subtract(prev).normalize();
        return { x: point.x, z: point.y, dx: direction.x, dz: direction.y, half: 0 };
    });
}
/** True if a point lies on another road's surface. */
function isInsideOtherRoad(x, z, roadIndex) {
    return ROAD_SAMPLES.some(function (samples, i) {
        if (i === roadIndex) {
            return false;
        }
        var segments = ROADS[i].closed ? samples.length : samples.length - 1;
        for (var k = 0; k < segments; k++) {
            var a = samples[k];
            var b = samples[(k + 1) % samples.length];
            var abx = b.x - a.x;
            var abz = b.z - a.z;
            var t = Math.max(0, Math.min(1, (((x - a.x) * abx) + ((z - a.z) * abz)) / ((abx * abx) + (abz * abz) || 1)));
            var half = a.half + ((b.half - a.half) * t);
            if (Math.hypot(x - (a.x + (abx * t)), z - (a.z + (abz * t))) < half + 0.4) {
                return true;
            }
        }
        return false;
    });
}
/** Splits a sequence of points into the runs where `keep` holds. */
function splitRuns(points, keep) {
    var runs = [];
    var current = [];
    for (var _i = 0, points_1 = points; _i < points_1.length; _i++) {
        var point = points_1[_i];
        if (keep(point)) {
            current.push(point);
        }
        else if (current.length) {
            runs.push(current);
            current = [];
        }
    }
    if (current.length) {
        runs.push(current);
    }
    return runs;
}
/**
 * The road surface as separate paving slabs along the samples. Each slab covers a few samples,
 * is pulled back a little at both ends (leaving a strip of grass to the next one) and has a
 * slightly ragged outer edge. The main road has two rows of slabs split down the middle, with the
 * joints staggered; side paths have one row, wider gaps and the occasional missing slab.
 */
function buildSlabs(name, samples, main, random, scene) {
    var slabs = [];
    // Rows across the road, as fractions of the half-width (-1 = left edge, 1 = right edge).
    var rows = main
        ? [{ from: -1, to: -0.03 }, { from: 0.03, to: 1 }]
        : [{ from: -1, to: 1 }];
    rows.forEach(function (row, rowIndex) {
        // Stagger the joints between rows.
        var start = main && rowIndex === 1 ? 2 : 0;
        while (start < samples.length - 1) {
            var span = main ? 4 + Math.floor(random() * 3) : 3 + Math.floor(random() * 3);
            var end = Math.min(samples.length - 1, start + span);
            var skip = !main && random() < 0.1;
            if (!skip && end - start >= 1) {
                var gap = main ? 0.35 + (random() * 0.25) : 0.55 + (random() * 0.5);
                var narrow = main ? 1 : 0.88 + (random() * 0.12);
                slabs.push(buildSlab("".concat(name, "-slab-").concat(rowIndex, "-").concat(start), samples.slice(start, end + 1), row, gap, narrow, random, scene));
            }
            start = end;
        }
    });
    return slabs;
}
function buildSlab(name, run, row, gap, narrow, random, scene) {
    var positions = [];
    var normals = [];
    var uvs = [];
    var indices = [];
    var last = run.length - 1;
    run.forEach(function (s, i) {
        // Pull the ends in along the road to leave a gap to the next slab.
        var pull = i === 0 ? gap / 2 : i === last ? -gap / 2 : 0;
        var cx = s.x + (s.dx * pull);
        var cz = s.z + (s.dz * pull);
        for (var _i = 0, _a = [row.from, row.to]; _i < _a.length; _i++) {
            var edge = _a[_i];
            // Outer edges are a little ragged; the joint down the middle stays straight.
            var outer = Math.abs(edge) > 0.5;
            var offset = s.half * narrow * edge + (outer ? Math.sign(edge) * (random() - 0.6) * 0.5 : 0);
            var x = cx - (s.dz * offset);
            var z = cz + (s.dx * offset);
            positions.push(x, ROAD_Y, z);
            normals.push(0, 1, 0);
            uvs.push(x / TEXTURE_SIZE, z / TEXTURE_SIZE);
        }
    });
    for (var i = 0; i < last; i++) {
        var a = i * 2;
        (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.pushOrientedTriangle)(indices, positions, normals, a, a + 1, a + 2);
        (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.pushOrientedTriangle)(indices, positions, normals, a + 1, a + 3, a + 2);
    }
    return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.buildMesh)(name, positions, normals, indices, scene, uvs);
}
/** Flat (slightly oval) disc with world-space UVs, used for the stepping stones. */
function buildDisc(name, cx, cz, radiusX, radiusZ, rotation, y, scene) {
    var positions = [cx, y, cz];
    var normals = [0, 1, 0];
    var uvs = [cx / TEXTURE_SIZE, cz / TEXTURE_SIZE];
    var indices = [];
    var steps = 14;
    var cos = Math.cos(rotation);
    var sin = Math.sin(rotation);
    for (var i = 0; i < steps; i++) {
        var angle = (i / steps) * Math.PI * 2;
        var lx = Math.cos(angle) * radiusX;
        var lz = Math.sin(angle) * radiusZ;
        var x = cx + (lx * cos) - (lz * sin);
        var z = cz + (lx * sin) + (lz * cos);
        positions.push(x, y, z);
        normals.push(0, 1, 0);
        uvs.push(x / TEXTURE_SIZE, z / TEXTURE_SIZE);
    }
    for (var i = 0; i < steps; i++) {
        (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.pushOrientedTriangle)(indices, positions, normals, 0, 1 + i, 1 + ((i + 1) % steps));
    }
    return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.buildMesh)(name, positions, normals, indices, scene, uvs);
}


/***/ },

/***/ "./src/scenes/world/tradingGame.ts"
/*!*****************************************!*\
  !*** ./src/scenes/world/tradingGame.ts ***!
  \*****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createTradingGame: () => (/* binding */ createTradingGame)
/* harmony export */ });
/* harmony import */ var _ui_style__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../ui/style */ "./src/scenes/ui/style.ts");
/* harmony import */ var _ui_tradingHud__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../ui/tradingHud */ "./src/scenes/ui/tradingHud.ts");
/* harmony import */ var _infoStand__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./infoStand */ "./src/scenes/world/infoStand.ts");
/* harmony import */ var _workCorner__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./workCorner */ "./src/scenes/world/workCorner.ts");
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
 * Quantum Trader, the work corner's minigame: a 45-second trading round played with the tank.
 *
 * - Shoot BUY or SELL (the big buttons in front of the board) to start. The board turns into a live
 *   price chart.
 * - Shoot BUY to buy (or to close a short), SELL to sell short (or to close a long). Each trade is
 *   SHARES shares; profit is counted when a position is closed, and an open position is closed
 *   when time runs out.
 * - The market moves in trends that switch every few seconds. Shortly before a switch, the quantum
 *   core lights up mint (going up) or pink (going down): a "quantum-inspired" forecast, right
 *   SIGNAL_ACCURACY of the time. Trading with it is how you score.
 *
 * The best result is remembered in the browser.
 */
var ROUND_SECONDS = 45;
var SHARES = 100;
var START_PRICE = 100;
/** Trend speeds (price per second) and how long a trend lasts. */
var TREND_SPEED = 2.6;
var TREND_SECONDS = { min: 2.8, max: 4.6 };
/** Random wobble on top of the trend. */
var NOISE = 1.3;
/** How long before a trend change the core shows its forecast, and how often it's right. */
var SIGNAL_LEAD = 1.5;
var SIGNAL_ACCURACY = 0.8;
/** The forecast stays on this long into the new trend. */
var SIGNAL_LINGER = 0.6;
/** The card shows up this close to the corner. */
var HUD_DISTANCE = 75;
/**
 * The trading floor: during a round, driving further than this from the corner's centre starts a
 * short countdown (LEAVE_GRACE seconds), and the round is called off unless you come back.
 */
var LEAVE_DISTANCE = 60;
var LEAVE_GRACE = 2;
/** Price samples kept for the chart (one every SAMPLE_SECONDS). */
var SAMPLE_SECONDS = 0.1;
var HISTORY_SAMPLES = 160;
var SCREEN_FPS = 12;
var RESULTS_SECONDS = 8;
/** A shot often bounces off a button and hits it again; ignore repeat hits within this time. */
var PRESS_COOLDOWN = 0.5;
var BEST_KEY = "quantum-trader-best";
var COLORS = {
    background: _ui_style__WEBPACK_IMPORTED_MODULE_0__.UI.navyDeep,
    grid: "#33475C",
    line: _ui_style__WEBPACK_IMPORTED_MODULE_0__.UI.cream,
    up: _ui_style__WEBPACK_IMPORTED_MODULE_0__.UI.mint,
    down: _ui_style__WEBPACK_IMPORTED_MODULE_0__.UI.pink,
    muted: "#8FA1B3",
    gold: _ui_style__WEBPACK_IMPORTED_MODULE_0__.UI.gold,
};
function createTradingGame(context, corner) {
    return __awaiter(this, void 0, void 0, function () {
        var scene, tank, sounds, gui, ui, hud, board, buttons, setSignal, soundAt, state, best, timeLeft, resultsLeft, price, trend, trendLeft, nextTrend, signal, signalLeft, position, entry, realized, finalResult, newBest, message, messageLeft, sampleTimer, sampleCount, screenTimer, history, trades, pressedAt, clock, awayFor, idleTicker, flash, openProfit, startRound, closePosition, endRound, trade, press, pickTrend, forecast, stepMarket, screen, screenSize, updateScreen, W, H, font, drawChart, drawResults;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    scene = context.scene, tank = context.tank, sounds = context.sounds;
                    return [4 /*yield*/, __webpack_require__.e(/*! import() */ "vendors-node_modules_babylonjs_gui_index_js").then(__webpack_require__.bind(__webpack_require__, /*! @babylonjs/gui */ "./node_modules/@babylonjs/gui/index.js"))];
                case 1:
                    gui = _a.sent();
                    if (scene.isDisposed) {
                        return [2 /*return*/];
                    }
                    ui = gui.AdvancedDynamicTexture.CreateFullscreenUI("trading-ui", true, scene);
                    hud = (0,_ui_tradingHud__WEBPACK_IMPORTED_MODULE_1__.createTradingHud)(gui, ui);
                    board = corner.board, buttons = corner.buttons, setSignal = corner.setSignal;
                    soundAt = corner.center;
                    state = "idle";
                    best = loadBest();
                    timeLeft = 0;
                    resultsLeft = 0;
                    price = START_PRICE;
                    trend = "flat";
                    trendLeft = 0;
                    nextTrend = null;
                    signal = "none";
                    signalLeft = 0;
                    position = 0;
                    entry = 0;
                    realized = 0;
                    finalResult = 0;
                    newBest = false;
                    message = "";
                    messageLeft = 0;
                    sampleTimer = 0;
                    sampleCount = 0;
                    screenTimer = 0;
                    history = [];
                    trades = [];
                    pressedAt = { buy: -Infinity, sell: -Infinity };
                    clock = 0;
                    awayFor = 0;
                    idleTicker = function () { return (best !== null
                        ? "QUANTUM TRADER   \u25B2   SHOOT BUY OR SELL TO PLAY   \u25B2   BEST ".concat(formatMoney(best), "   \u25B2   ")
                        : "QUANTUM TRADER   \u25B2   SHOOT BUY OR SELL TO PLAY   \u25B2   ".concat(_workCorner__WEBPACK_IMPORTED_MODULE_3__.TICKER_TEXT)); };
                    board.setTicker(idleTicker());
                    flash = function (text) {
                        message = text;
                        messageLeft = 2.2;
                    };
                    openProfit = function () { return (position === 0 ? 0 : position * (price - entry) * SHARES); };
                    startRound = function () {
                        state = "playing";
                        timeLeft = ROUND_SECONDS;
                        price = START_PRICE;
                        trend = "flat";
                        trendLeft = 1.5;
                        nextTrend = null;
                        signal = "none";
                        signalLeft = 0;
                        position = 0;
                        realized = 0;
                        history.length = 0;
                        trades.length = 0;
                        sampleCount = 0;
                        sampleTimer = 0;
                        for (var i = 0; i < 20; i++) {
                            history.push(START_PRICE + ((Math.random() - 0.5) * 0.6));
                        }
                        flash("Market open! Watch the quantum core.");
                        board.setTicker("BUY LOW   ▲   SELL HIGH   ▲   WATCH THE QUANTUM CORE   ▲   MINT MEANS UP, PINK MEANS DOWN   ▲   ");
                        board.showScreen(true);
                        sounds.trade("start", soundAt);
                    };
                    closePosition = function () {
                        var profit = openProfit();
                        realized += profit;
                        position = 0;
                        return profit;
                    };
                    endRound = function (cancelled) {
                        setSignal("none");
                        if (cancelled) {
                            state = "idle";
                            board.showScreen(false);
                            board.setTicker(idleTicker());
                            return;
                        }
                        closePosition();
                        finalResult = realized;
                        newBest = best === null || finalResult > best;
                        if (newBest) {
                            best = finalResult;
                            saveBest(finalResult);
                        }
                        state = "results";
                        resultsLeft = RESULTS_SECONDS;
                        drawResults();
                        sounds.trade("end", soundAt);
                    };
                    trade = function (kind) {
                        var direction = kind === "buy" ? 1 : -1;
                        if (position === direction) {
                            flash(kind === "buy" ? "Already holding. Shoot SELL to take profit!" : "Already short. Shoot BUY to close it!");
                            return;
                        }
                        trades.push({ sample: sampleCount, kind: kind });
                        if (position === 0) {
                            position = direction;
                            entry = price;
                            flash("".concat(kind === "buy" ? "Bought" : "Sold short", " ").concat(SHARES, " at ").concat(price.toFixed(2)));
                            sounds.trade(kind, soundAt);
                            return;
                        }
                        var profit = closePosition();
                        flash("Closed for ".concat(formatMoney(profit)));
                        sounds.trade(profit >= 0 ? "profit" : "loss", soundAt);
                    };
                    press = function (kind) {
                        if (clock - pressedAt[kind] < PRESS_COOLDOWN) {
                            return;
                        }
                        pressedAt[kind] = clock;
                        buttons[kind].press();
                        if (state === "playing") {
                            trade(kind);
                        }
                        else if (state === "idle" || resultsLeft < RESULTS_SECONDS - 1.5) {
                            startRound();
                        }
                    };
                    buttons.buy.onHit.add(function () { return press("buy"); });
                    buttons.sell.onHit.add(function () { return press("sell"); });
                    pickTrend = function () {
                        var roll = Math.random();
                        // Keep the price roughly in range: lean towards trends that bring it back.
                        var lean = Math.max(-0.25, Math.min(0.25, (START_PRICE - price) / 60));
                        return roll < 0.4 + lean ? "up" : roll < 0.8 ? "down" : "flat";
                    };
                    forecast = function (actual) {
                        var right = Math.random() < SIGNAL_ACCURACY;
                        if (actual === "flat") {
                            return right ? "none" : Math.random() < 0.5 ? "up" : "down";
                        }
                        return right ? actual : actual === "up" ? "down" : "up";
                    };
                    stepMarket = function (dt) {
                        trendLeft -= dt;
                        if (nextTrend === null && trendLeft <= SIGNAL_LEAD) {
                            nextTrend = pickTrend();
                            signal = forecast(nextTrend);
                            signalLeft = trendLeft + SIGNAL_LINGER;
                            setSignal(signal);
                        }
                        if (trendLeft <= 0) {
                            trend = nextTrend !== null && nextTrend !== void 0 ? nextTrend : pickTrend();
                            nextTrend = null;
                            trendLeft = TREND_SECONDS.min + (Math.random() * (TREND_SECONDS.max - TREND_SECONDS.min));
                        }
                        if (signalLeft > 0) {
                            signalLeft -= dt;
                            if (signalLeft <= 0) {
                                signal = "none";
                                setSignal("none");
                            }
                        }
                        var drift = trend === "up" ? TREND_SPEED : trend === "down" ? -TREND_SPEED : 0;
                        price = Math.max(5, price + (drift * dt) + (gaussian() * NOISE * Math.sqrt(dt)));
                        sampleTimer += dt;
                        while (sampleTimer >= SAMPLE_SECONDS) {
                            sampleTimer -= SAMPLE_SECONDS;
                            sampleCount++;
                            history.push(price);
                            if (history.length > HISTORY_SAMPLES) {
                                history.shift();
                            }
                        }
                    };
                    screen = board.screen, screenSize = board.screenSize, updateScreen = board.updateScreen;
                    W = screenSize.width;
                    H = screenSize.height;
                    font = function (size) { return "900 ".concat(size, "px ").concat(_ui_style__WEBPACK_IMPORTED_MODULE_0__.UI.font); };
                    drawChart = function () {
                        screen.fillStyle = COLORS.background;
                        screen.fillRect(0, 0, W, H);
                        screen.textBaseline = "middle";
                        // Header: title, forecast and clock.
                        screen.textAlign = "left";
                        screen.fillStyle = COLORS.line;
                        screen.font = font(34);
                        screen.fillText("QUANTUM TRADER", 36, 44);
                        screen.textAlign = "right";
                        screen.fillStyle = timeLeft < 10 ? COLORS.down : COLORS.gold;
                        screen.font = font(40);
                        screen.fillText(formatTime(timeLeft), W - 36, 44);
                        var signalText = signal === "up" ? "SIGNAL ▲" : signal === "down" ? "SIGNAL ▼" : "SIGNAL —";
                        screen.fillStyle = signal === "up" ? COLORS.up : signal === "down" ? COLORS.down : COLORS.muted;
                        screen.font = font(30);
                        screen.textAlign = "center";
                        screen.fillText(signalText, W * 0.62, 44);
                        // Chart.
                        var left = 36;
                        var right = W - 170;
                        var top = 92;
                        var bottom = H - 86;
                        var low = Infinity;
                        var high = -Infinity;
                        for (var _i = 0, history_1 = history; _i < history_1.length; _i++) {
                            var value = history_1[_i];
                            low = Math.min(low, value);
                            high = Math.max(high, value);
                        }
                        if (position !== 0) {
                            low = Math.min(low, entry);
                            high = Math.max(high, entry);
                        }
                        var padding = Math.max(1.5, (high - low) * 0.15);
                        low -= padding;
                        high += padding;
                        var toY = function (value) { return bottom - (((value - low) / (high - low)) * (bottom - top)); };
                        var toX = function (index) { return left + ((index / (HISTORY_SAMPLES - 1)) * (right - left)); };
                        var offset = HISTORY_SAMPLES - history.length;
                        screen.strokeStyle = COLORS.grid;
                        screen.lineWidth = 2;
                        for (var i = 0; i <= 4; i++) {
                            var y = top + ((i / 4) * (bottom - top));
                            screen.beginPath();
                            screen.moveTo(left, y);
                            screen.lineTo(right, y);
                            screen.stroke();
                        }
                        if (position !== 0) {
                            screen.setLineDash([14, 10]);
                            screen.strokeStyle = position > 0 ? COLORS.up : COLORS.down;
                            screen.lineWidth = 3;
                            screen.beginPath();
                            screen.moveTo(left, toY(entry));
                            screen.lineTo(right, toY(entry));
                            screen.stroke();
                            screen.setLineDash([]);
                        }
                        var rising = history.length > 1 && history[history.length - 1] >= history[Math.max(0, history.length - 30)];
                        screen.strokeStyle = rising ? COLORS.up : COLORS.down;
                        screen.lineWidth = 6;
                        screen.lineJoin = "round";
                        screen.beginPath();
                        history.forEach(function (value, i) {
                            var x = toX(i + offset);
                            var y = toY(value);
                            if (i === 0) {
                                screen.moveTo(x, y);
                            }
                            else {
                                screen.lineTo(x, y);
                            }
                        });
                        screen.stroke();
                        // Trade markers: triangles under (buy) or over (sell) the line.
                        var firstSample = sampleCount - history.length + 1;
                        for (var _a = 0, trades_1 = trades; _a < trades_1.length; _a++) {
                            var t = trades_1[_a];
                            var index = t.sample - firstSample;
                            if (index < 0 || index >= history.length) {
                                continue;
                            }
                            var x = toX(index + offset);
                            var y = toY(history[index]);
                            var up = t.kind === "buy";
                            screen.fillStyle = up ? COLORS.up : COLORS.down;
                            screen.beginPath();
                            screen.moveTo(x, y + (up ? 14 : -14));
                            screen.lineTo(x - 13, y + (up ? 36 : -36));
                            screen.lineTo(x + 13, y + (up ? 36 : -36));
                            screen.closePath();
                            screen.fill();
                        }
                        // Current price tag.
                        var tagY = toY(price);
                        screen.fillStyle = rising ? COLORS.up : COLORS.down;
                        (0,_infoStand__WEBPACK_IMPORTED_MODULE_2__.roundRect)(screen, right + 12, tagY - 24, 140, 48, 12);
                        screen.fill();
                        screen.fillStyle = COLORS.background;
                        screen.font = font(30);
                        screen.textAlign = "center";
                        screen.fillText(price.toFixed(2), right + 82, tagY + 2);
                        // Footer: profit and position.
                        var total = realized + openProfit();
                        screen.textAlign = "left";
                        screen.font = font(36);
                        screen.fillStyle = total >= 0 ? COLORS.up : COLORS.down;
                        screen.fillText("P&L ".concat(formatMoney(total)), 36, H - 42);
                        screen.textAlign = "right";
                        screen.font = font(30);
                        screen.fillStyle = position === 0 ? COLORS.muted : position > 0 ? COLORS.up : COLORS.down;
                        screen.fillText(positionText(position, entry), W - 36, H - 42);
                        updateScreen();
                    };
                    drawResults = function () {
                        screen.fillStyle = COLORS.background;
                        screen.fillRect(0, 0, W, H);
                        screen.textAlign = "center";
                        screen.textBaseline = "middle";
                        screen.fillStyle = COLORS.gold;
                        screen.font = font(40);
                        screen.fillText(newBest ? "NEW BEST!" : "MARKET CLOSED", W / 2, H * 0.2);
                        screen.fillStyle = finalResult >= 0 ? COLORS.up : COLORS.down;
                        screen.font = font(120);
                        screen.fillText(formatMoney(finalResult), W / 2, H * 0.47);
                        screen.fillStyle = COLORS.line;
                        screen.font = font(32);
                        screen.fillText(best !== null ? "Best ".concat(formatMoney(best)) : "", W / 2, H * 0.7);
                        screen.fillStyle = COLORS.muted;
                        screen.font = font(28);
                        screen.fillText("Shoot BUY or SELL to play again", W / 2, H * 0.86);
                        updateScreen();
                    };
                    // ----- Loop
                    scene.onBeforeRenderObservable.add(function () {
                        var dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
                        clock += dt;
                        var distance = Math.hypot(tank.position.x - corner.center.x, tank.position.z - corner.center.z);
                        awayFor = distance > LEAVE_DISTANCE ? awayFor + dt : 0;
                        if (state === "playing") {
                            if (awayFor > LEAVE_GRACE) {
                                endRound(true);
                                flash("Round called off: you left the trading floor.");
                                messageLeft = 3.5;
                            }
                            else {
                                timeLeft -= dt;
                                stepMarket(dt);
                                messageLeft -= dt;
                                screenTimer -= dt;
                                if (screenTimer <= 0) {
                                    screenTimer = 1 / SCREEN_FPS;
                                    drawChart();
                                }
                                if (timeLeft <= 0) {
                                    endRound(false);
                                }
                            }
                        }
                        else if (state === "results") {
                            resultsLeft -= dt;
                            if (resultsLeft <= 0 || awayFor > LEAVE_GRACE) {
                                state = "idle";
                                board.showScreen(false);
                                board.setTicker(idleTicker());
                            }
                        }
                        messageLeft -= state === "playing" ? 0 : dt;
                        var showHud = state !== "idle" || distance < HUD_DISTANCE || messageLeft > 0;
                        hud.setVisible(showHud);
                        if (!showHud) {
                            return;
                        }
                        if (state === "idle" && messageLeft > 0) {
                            hud.set("QUANTUM TRADER", _ui_style__WEBPACK_IMPORTED_MODULE_0__.UI.pinkDeep, "Round called off", "You left the trading floor. Come back and shoot BUY or SELL to play again.");
                        }
                        else if (state === "playing" && awayFor > 0) {
                            hud.set("TRADING  ".concat(formatTime(timeLeft)), _ui_style__WEBPACK_IMPORTED_MODULE_0__.UI.pinkDeep, "Come back!", "Leaving the trading floor ends the round in ".concat(Math.max(0, LEAVE_GRACE - awayFor).toFixed(1), " s."), _ui_style__WEBPACK_IMPORTED_MODULE_0__.UI.pinkDeep);
                        }
                        else if (state === "idle") {
                            hud.set("QUANTUM TRADER", _ui_style__WEBPACK_IMPORTED_MODULE_0__.UI.navy, "Shoot BUY or SELL to play", "Buy low, sell high in ".concat(ROUND_SECONDS, " s. The quantum core glows mint or pink when it senses the market turning.").concat(best !== null ? " Best: ".concat(formatMoney(best)) : ""));
                        }
                        else if (state === "playing") {
                            var total = realized + openProfit();
                            var signalHint = signal === "up" ? "Core says UP: buy!" : signal === "down" ? "Core says DOWN: sell!" : "";
                            hud.set("TRADING  ".concat(formatTime(timeLeft)), timeLeft < 10 ? _ui_style__WEBPACK_IMPORTED_MODULE_0__.UI.pinkDeep : _ui_style__WEBPACK_IMPORTED_MODULE_0__.UI.gold, "P&L ".concat(formatMoney(total)), messageLeft > 0 ? message : signalHint || positionText(position, entry), total >= 0 ? "#3E9C6E" : _ui_style__WEBPACK_IMPORTED_MODULE_0__.UI.pinkDeep);
                        }
                        else {
                            hud.set(newBest ? "NEW BEST!" : "MARKET CLOSED", _ui_style__WEBPACK_IMPORTED_MODULE_0__.UI.mint, formatMoney(finalResult), "".concat(best !== null ? "Best ".concat(formatMoney(best), ". ") : "", "Shoot BUY or SELL to play again."), finalResult >= 0 ? "#3E9C6E" : _ui_style__WEBPACK_IMPORTED_MODULE_0__.UI.pinkDeep);
                        }
                    });
                    scene.onDisposeObservable.addOnce(function () { return ui.dispose(); });
                    return [2 /*return*/];
            }
        });
    });
}
function positionText(position, entry) {
    if (position === 0) {
        return "No position. Shoot BUY or SELL to trade.";
    }
    return "".concat(position > 0 ? "LONG" : "SHORT", " ").concat(SHARES, " @ ").concat(entry.toFixed(2));
}
function formatMoney(value) {
    var rounded = Math.round(value);
    return "".concat(rounded < 0 ? "−" : "+", "$").concat(Math.abs(rounded).toLocaleString("en-US"));
}
function formatTime(seconds) {
    var whole = Math.max(0, Math.ceil(seconds));
    return "0:".concat(whole.toString().padStart(2, "0"));
}
function gaussian() {
    // Box-Muller.
    var u = 1 - Math.random();
    var v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function loadBest() {
    try {
        var stored = window.localStorage.getItem(BEST_KEY);
        var value = stored === null ? NaN : Number(stored);
        return Number.isFinite(value) ? value : null;
    }
    catch (_a) {
        return null;
    }
}
function saveBest(value) {
    try {
        window.localStorage.setItem(BEST_KEY, String(Math.round(value)));
    }
    catch (_a) {
        // Private mode or blocked storage: the best score just isn't remembered.
    }
}


/***/ },

/***/ "./src/scenes/world/trees.ts"
/*!***********************************!*\
  !*** ./src/scenes/world/trees.ts ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TREE_POSITIONS: () => (/* binding */ TREE_POSITIONS),
/* harmony export */   instantiateTrees: () => (/* binding */ instantiateTrees)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");
/* harmony import */ var _core_staticBodies__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/staticBodies */ "./src/scenes/core/staticBodies.ts");
/* harmony import */ var _core_constants__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../core/constants */ "./src/scenes/core/constants.ts");
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};




var TRUNK_HEIGHT = 15;
var TRUNK_BOTTOM_DIAMETER = 5;
var TRUNK_TOP_DIAMETER = 3;
/** Height of the canopy's sway pivot (top of the trunk), relative to the tree's origin. */
var CANOPY_PIVOT_Y = 6;
// Natural sakura tones: pale blush blossoms rather than candy pink, on dark bark.
/** Trunk centers; the trunk is centered vertically on these points. */
var TREE_POSITIONS = [
    new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(78.3985, 5.1848, -11.2018),
    new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(47.5043, 5.1848, -36.9549),
    // Out west, where it doesn't stand between the camera and the work corner.
    new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(-126, 5.1848, -70),
    // Behind the work corner, as a backdrop (it used to hide the corner from the start).
    new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(-6, 5.1848, -97),
    new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(57.1332, 5.1848, 77.0256),
    // A few more towards the edges of the play area, away from the paths.
    new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(-72, 5.1848, 98),
    new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(-136, 5.1848, 40),
    new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(100, 5.1848, 72),
    new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(162, 5.1848, -58),
];
/** Trees further than this from the tank stop swaying and dropping petals (nobody sees them). */
var ANIMATION_DISTANCE = 160;
var PALETTE = {
    bark: "#5E4436",
    barkDark: "#47332A",
    puffs: ["#F3C6D1", "#E9AFBF", "#F8DCE3"],
    blossom: "#FFF7F8",
    petal: "#F6CFD9",
};
function instantiateTrees(_this) {
    var scene = _this.scene;
    var treeCoordinates = TREE_POSITIONS;
    var templates = createTreeTemplates(scene);
    var petalTexture = createPetalTexture(scene);
    var swayingCanopies = [];
    treeCoordinates.forEach(function (position, index) {
        var canopy = instantiateTree(templates, position, index, scene);
        var petals = createFallingPetals(scene, petalTexture, position, index);
        swayingCanopies.push({ node: canopy, phase: index * 1.7, position: position, petals: petals, active: true });
    });
    // A slow breeze. The canopies pivot at the top of the trunk. Only trees near the tank are
    // animated; far ones keep still and stop dropping petals.
    var tank = scene.getMeshByName("tank_holder");
    var time = 0;
    var lastDistanceCheck = -1;
    scene.onBeforeRenderObservable.add(function () {
        time += scene.getEngine().getDeltaTime() / 1000;
        if (tank && time - lastDistanceCheck > 0.5) {
            lastDistanceCheck = time;
            for (var _i = 0, swayingCanopies_1 = swayingCanopies; _i < swayingCanopies_1.length; _i++) {
                var tree = swayingCanopies_1[_i];
                var near = Math.hypot(tree.position.x - tank.position.x, tree.position.z - tank.position.z) < ANIMATION_DISTANCE;
                if (near !== tree.active) {
                    tree.active = near;
                    if (near) {
                        tree.petals.start();
                    }
                    else {
                        tree.petals.stop();
                    }
                }
            }
        }
        for (var _a = 0, swayingCanopies_2 = swayingCanopies; _a < swayingCanopies_2.length; _a++) {
            var _b = swayingCanopies_2[_a], node = _b.node, phase = _b.phase, active = _b.active;
            if (!active) {
                continue;
            }
            node.rotation.z = Math.sin((time * 0.7) + phase) * 0.018;
            node.rotation.x = Math.sin((time * 0.53) + (phase * 1.3)) * 0.012;
        }
    });
}
function createTreeTemplates(scene) {
    var bark = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-tree-bark", PALETTE.bark, { roughness: 0.75, clearCoat: 0.1 });
    var barkDark = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-tree-bark-dark", PALETTE.barkDark, { roughness: 0.8, clearCoat: 0.1 });
    var blossom = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-tree-blossom", PALETTE.blossom, { roughness: 0.45, clearCoat: 0.4 });
    var trunk = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("tree-trunk", {
        height: TRUNK_HEIGHT,
        diameterTop: TRUNK_TOP_DIAMETER,
        diameterBottom: TRUNK_BOTTOM_DIAMETER,
        tessellation: 24,
    }, scene);
    trunk.material = bark;
    trunk.isPickable = false;
    // The first tree uses this mesh directly; the others are clones (each needs its own physics body).
    var rootFlare = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createTemplate)(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("tree-root-flare", {
        height: 2.6,
        diameterTop: TRUNK_BOTTOM_DIAMETER - 0.3,
        diameterBottom: TRUNK_BOTTOM_DIAMETER + 2.6,
        tessellation: 24,
    }, scene), barkDark);
    var branchMesh = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("tree-branch", {
        height: 7.5,
        diameterTop: 0.9,
        diameterBottom: 1.6,
        tessellation: 12,
    }, scene);
    // Put the branch's base at its origin so it can be rotated around where it leaves the trunk.
    branchMesh.bakeTransformIntoVertices(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Matrix.Translation(0, 3.75, 0));
    var branch = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createTemplate)(branchMesh, bark);
    var random = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRandom)(7);
    var puffs = PALETTE.puffs.map(function (hex, i) {
        var material = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createToyMaterial)(scene, "toy-tree-puff-".concat(i), hex, { roughness: 0.65, clearCoat: 0.15 });
        return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createTemplate)((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createLumpyBall)("tree-puff-".concat(i), scene, random), material);
    });
    var blossomMesh = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("tree-blossom", { diameter: 1, segments: 6 }, scene);
    var blossomTemplate = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createTemplate)(blossomMesh, blossom);
    return { trunk: trunk, rootFlare: rootFlare, branch: branch, puffs: puffs, blossom: blossomTemplate };
}
/**
 * Builds one tree and returns its canopy node (for the sway animation).
 */
function instantiateTree(templates, position, index, scene) {
    var random = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_1__.createRandom)(1000 + index * 97);
    var tree = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("tree-".concat(index), scene);
    tree.position.copyFrom(position);
    tree.rotation.y = random() * Math.PI * 2;
    // Don't clone the first trunk's physics body along with the mesh: the copy would stay behind
    // as an invisible obstacle. Each trunk gets its own body at the end of this function.
    var trunk = index === 0 ? templates.trunk : templates.trunk.clone("tree-trunk-".concat(index), null, true, false);
    trunk.parent = tree;
    var rootFlare = templates.rootFlare.createInstance("tree-root-flare-".concat(index));
    rootFlare.parent = tree;
    // Sit the flare on the ground (y = -0.5), just sinking into it.
    rootFlare.position.y = (_core_constants__WEBPACK_IMPORTED_MODULE_3__.GROUND_Y - 0.1) - position.y + 1.3;
    // Everything above the trunk sways together around the top of the trunk.
    var canopy = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("tree-canopy-".concat(index), scene);
    canopy.parent = tree;
    canopy.position.y = CANOPY_PIVOT_Y;
    var branchAngles = [-0.55, 0.6];
    branchAngles.forEach(function (angle, i) {
        var branch = templates.branch.createInstance("tree-branch-".concat(index, "-").concat(i));
        branch.parent = canopy;
        branch.position.y = -1.5 - i;
        branch.rotation.z = angle;
        branch.rotation.y = (i * 1.9) + (random() * 0.6);
    });
    // Canopy: one big central puff, a ring of medium ones and a couple on top.
    var canopyCenterY = 8.6;
    var puffLayout = [{ x: 0, y: canopyCenterY, z: 0, r: 8.2 }];
    var ringCount = 5;
    for (var i = 0; i < ringCount; i++) {
        var angle = ((i / ringCount) * Math.PI * 2) + (random() * 0.5);
        var distance = 6.2 + (random() * 1.4);
        puffLayout.push({
            x: Math.cos(angle) * distance,
            y: canopyCenterY - 1.8 + (random() * 2.6),
            z: Math.sin(angle) * distance,
            r: 4.8 + (random() * 1.6),
        });
    }
    for (var i = 0; i < 2; i++) {
        var angle = random() * Math.PI * 2;
        puffLayout.push({
            x: Math.cos(angle) * 2.5,
            y: canopyCenterY + 4.6 + (random() * 0.8),
            z: Math.sin(angle) * 2.5,
            r: 4.4 + (random() * 1.0),
        });
    }
    puffLayout.forEach(function (layout, i) {
        var template = templates.puffs[Math.floor(random() * templates.puffs.length)];
        var puff = template.createInstance("tree-leaves-".concat(index, "-").concat(i));
        puff.parent = canopy;
        puff.position.set(layout.x, layout.y, layout.z);
        puff.scaling.set(layout.r, layout.r * 0.86, layout.r);
        puff.rotation.y = random() * Math.PI * 2;
    });
    // Little blossoms sitting on the outside of the canopy.
    var blossomCount = 26;
    for (var i = 0; i < blossomCount; i++) {
        var layout = puffLayout[Math.floor(random() * puffLayout.length)];
        var theta = random() * Math.PI * 2;
        var upness = (random() * 1.3) - 0.3;
        var horizontal = Math.sqrt(Math.max(0, 1 - (upness * upness)));
        var direction = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(Math.cos(theta) * horizontal, upness, Math.sin(theta) * horizontal).normalize();
        var blossom = templates.blossom.createInstance("tree-blossom-".concat(index, "-").concat(i));
        blossom.parent = canopy;
        blossom.position.set(layout.x + (direction.x * layout.r * 0.98), layout.y + (direction.y * layout.r * 0.86 * 0.98), layout.z + (direction.z * layout.r * 0.98));
        blossom.scaling.setAll(0.9 + (random() * 0.7));
    }
    tree.getChildMeshes().forEach(function (mesh) {
        var _a;
        mesh.isPickable = false;
        // The canopy moves, so the scene optimizer must not freeze these meshes.
        mesh.metadata = __assign(__assign({}, ((_a = mesh.metadata) !== null && _a !== void 0 ? _a : {})), { keepUnfrozen: true });
        mesh.computeWorldMatrix(true);
    });
    // Solid trunk (a plain static body: it never moves).
    trunk.computeWorldMatrix(true);
    var trunkBox = trunk.getBoundingInfo().boundingBox;
    var trunkSize = trunkBox.maximumWorld.subtract(trunkBox.minimumWorld);
    (0,_core_staticBodies__WEBPACK_IMPORTED_MODULE_2__.addStaticBox)(scene, trunkBox.centerWorld, trunkSize.x, trunkSize.y, trunkSize.z, { sound: "trunk" });
    return canopy;
}
/**
 * A few petals drifting down from each canopy.
 */
function createFallingPetals(scene, texture, treePosition, index) {
    var petals = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.ParticleSystem("tree-petals-".concat(index), 40, scene);
    petals.particleTexture = texture;
    petals.emitter = treePosition.add(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, CANOPY_PIVOT_Y + 8, 0));
    petals.minEmitBox = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(-8, -3, -8);
    petals.maxEmitBox = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(8, 1, 8);
    var petal = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString(PALETTE.petal);
    petals.color1 = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color4(petal.r, petal.g, petal.b, 1);
    petals.color2 = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color4(1, 0.93, 0.96, 1);
    petals.colorDead = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color4(petal.r, petal.g, petal.b, 0);
    petals.minSize = 0.7;
    petals.maxSize = 1.2;
    petals.minLifeTime = 5;
    petals.maxLifeTime = 7;
    petals.emitRate = 3;
    petals.gravity = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, -1.1, 0);
    petals.direction1 = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(-1, -0.6, -1);
    petals.direction2 = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(1, -0.2, 1);
    petals.minEmitPower = 0.5;
    petals.maxEmitPower = 1.5;
    petals.minAngularSpeed = -1.5;
    petals.maxAngularSpeed = 1.5;
    petals.minInitialRotation = 0;
    petals.maxInitialRotation = Math.PI * 2;
    petals.blendMode = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.ParticleSystem.BLENDMODE_STANDARD;
    petals.preWarmCycles = 120;
    petals.preWarmStepOffset = 5;
    petals.start();
    return petals;
}
/** Soft petal shape drawn once into a small texture. */
function createPetalTexture(scene) {
    var size = 64;
    var texture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("tree-petal-texture", { width: size, height: size }, scene, true);
    texture.hasAlpha = true;
    var context = texture.getContext();
    context.clearRect(0, 0, size, size);
    context.fillStyle = "#FFFFFF";
    context.beginPath();
    context.ellipse(size / 2, size / 2, size * 0.42, size * 0.24, Math.PI / 5, 0, Math.PI * 2);
    context.fill();
    texture.update();
    return texture;
}


/***/ },

/***/ "./src/scenes/world/waypointSigns.ts"
/*!*******************************************!*\
  !*** ./src/scenes/world/waypointSigns.ts ***!
  \*******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createWaypointSigns: () => (/* binding */ createWaypointSigns)
/* harmony export */ });
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _core_staticBodies__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/staticBodies */ "./src/scenes/core/staticBodies.ts");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");
/* harmony import */ var _core_constants__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../core/constants */ "./src/scenes/core/constants.ts");




var SCALE = 1.3;
var PALETTE = {
    board: "#F4EBDD",
    rim: "#344B63",
    letters: "#344B63",
    post: "#8B6A50",
    base: "#E8DCC6",
    cap: "#E8869F",
    gold: "#C9A35B",
};
/** Where the bullseye-topped "TARGET PRACTICE" sign stands: beside the podium, not in front of it. */
var TARGET_SIGN_POSITION = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector2(55, 2);
function createWaypointSigns(scene) {
    var _a;
    var projectsText = scene.getMeshByName("projects_sign");
    var targetText = scene.getMeshByName("target_text");
    var signposts = [];
    if (projectsText) {
        projectsText.computeWorldMatrix(true);
        var center = projectsText.getBoundingInfo().boundingBox.centerWorld;
        // The crossroads near the start: projects (the Fruit Factory) to the right on screen,
        // the targets on the podium to the left, and work straight ahead (on top of the post).
        signposts.push({
            id: "sign-crossroads",
            x: center.x,
            z: center.z,
            postHeight: 9.5,
            boards: [
                { label: "WORK", direction: 0, y: 11.9, length: 7.4, height: 4.2 },
                { label: "PROJECTS", direction: 1, y: 7.8, length: 11, height: 2.6 },
                { label: "TARGETS", direction: -1, y: 4.9, length: 10, height: 2.6 },
            ],
        });
    }
    if (targetText) {
        signposts.push({
            id: "sign-targets",
            x: TARGET_SIGN_POSITION.x,
            z: TARGET_SIGN_POSITION.y,
            postHeight: 8,
            bullseye: true,
            boards: [
                { label: "TARGET\nPRACTICE", direction: -1, y: 5.6, length: 11, height: 4 },
            ],
        });
    }
    var materials = {
        board: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "toy-signpost-board", PALETTE.board, { roughness: 0.45, clearCoat: 0.5 }),
        rim: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "toy-signpost-rim", PALETTE.rim, { roughness: 0.45, clearCoat: 0.4 }),
        post: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "toy-signpost-post", PALETTE.post, { roughness: 0.55, clearCoat: 0.3 }),
        base: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "toy-signpost-base", PALETTE.base, { roughness: 0.5, clearCoat: 0.3 }),
        cap: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "toy-signpost-cap", PALETTE.cap, { roughness: 0.35, clearCoat: 0.6 }),
        gold: (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createToyMaterial)(scene, "toy-signpost-gold", PALETTE.gold, { roughness: 0.25, metallic: 0.6, clearCoat: 0.6 }),
    };
    // Each new signpost replaces its text on the ground (which stays if the signpost fails).
    var replaces = { "sign-crossroads": projectsText, "sign-targets": targetText };
    for (var _i = 0, signposts_1 = signposts; _i < signposts_1.length; _i++) {
        var signpost = signposts_1[_i];
        try {
            createSignpost(scene, signpost, materials);
            (_a = replaces[signpost.id]) === null || _a === void 0 ? void 0 : _a.setEnabled(false);
        }
        catch (error) {
            console.error("Signpost \"".concat(signpost.id, "\" failed, keeping the original text"), error);
        }
    }
}
function createSignpost(scene, signpost, materials) {
    var id = signpost.id;
    var root = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode(id, scene);
    root.position.set(signpost.x, _core_constants__WEBPACK_IMPORTED_MODULE_3__.GROUND_Y, signpost.z);
    root.rotation.y = _core_constants__WEBPACK_IMPORTED_MODULE_3__.FACE_CAMERA_YAW;
    root.scaling.setAll(SCALE);
    var add = function (mesh, material) {
        mesh.material = material;
        mesh.parent = root;
        mesh.isPickable = false;
        return mesh;
    };
    // Sand base with a bevelled top, and the post.
    add((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createRoundedBox)("".concat(id, "-base"), 2.8, 0.7, 2.8, 0.25, scene), materials.base).position.y = 0.35;
    var post = add((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.createRoundedBox)("".concat(id, "-post"), 0.9, signpost.postHeight, 0.9, 0.3, scene), materials.post);
    post.position.y = 0.6 + (signpost.postHeight / 2);
    var top = 0.6 + signpost.postHeight;
    if (signpost.bullseye) {
        addBullseye(scene, "".concat(id, "-bullseye"), root, top + 1.15, materials);
    }
    else if (!signpost.boards.some(function (board) { return board.direction === 0; })) {
        var cap = add(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("".concat(id, "-cap"), { diameter: 1.3, segments: 16 }, scene), materials.cap);
        cap.position.y = top + 0.2;
    }
    signpost.boards.forEach(function (board, index) {
        createBoard(scene, "".concat(id, "-board-").concat(index), board, root, materials);
        // Solid box around the board and its rim.
        var center = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(boardOffset(board), board.y, -0.65);
        addSignCollider(scene, root, center, board.length + 0.6, board.height + 0.6, 0.8);
    });
    if (signpost.bullseye) {
        addSignCollider(scene, root, new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, top + 1.15, -0.4), 2.5, 2.5, 1);
    }
    // Static collider around the post so the tank bumps into it instead of driving through.
    addSignCollider(scene, root, new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, (signpost.postHeight + 0.6) / 2, 0), 1.4, signpost.postHeight + 0.6, 1.4);
}
/** Static collision box in the signpost's (scaled, rotated) space, so the tank hits the boards. */
function addSignCollider(scene, root, localCenter, width, height, depth) {
    root.computeWorldMatrix(true);
    (0,_core_staticBodies__WEBPACK_IMPORTED_MODULE_1__.addStaticBox)(scene, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.TransformCoordinates(localCenter, root.getWorldMatrix()), width * SCALE, height * SCALE, depth * SCALE, {
        rotation: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion.RotationYawPitchRoll(root.rotation.y, 0, 0),
        sound: "post",
    });
}
/** Sideways boards have their tail end over the post; an upward one is centred on it. */
function boardOffset(board) {
    return board.direction * ((board.length / 2) - 1.1);
}
/**
 * An arrow-shaped board (a pentagon pointing along `direction`) mounted in front of the post, its
 * tail end over the post, with a navy rim, the label and two gold bolts.
 */
function createBoard(scene, id, board, parent, materials) {
    var length = board.length, height = board.height, direction = board.direction;
    var tip = height * 0.55;
    var node = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode(id, scene);
    node.parent = parent;
    // The tail end sits on the post; the board reaches out towards the arrow's tip.
    node.position.set(boardOffset(board), board.y, -0.75);
    var up = direction === 0;
    // An upward arrow's tip is shorter, relative to its width.
    var upTip = height * 0.32;
    var arrow = function (l, h, t) { return (up
        ? [
            [-l / 2, -h / 2],
            [l / 2, -h / 2],
            [l / 2, (h / 2) - t],
            [0, h / 2],
            [-l / 2, (h / 2) - t],
        ]
        : [
            [-l / 2, -h / 2],
            [(l / 2) - t, -h / 2],
            [l / 2, 0],
            [(l / 2) - t, h / 2],
            [-l / 2, h / 2],
        ].map(function (_a) {
            var x = _a[0], y = _a[1];
            return [x * direction, y];
        })); };
    var tipSize = up ? upTip : tip;
    var front = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.extrudeOutline)("".concat(id, "-face"), arrow(length, height, tipSize), 0.5, 0.12, scene);
    front.material = materials.board;
    front.parent = node;
    var rim = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_2__.extrudeOutline)("".concat(id, "-rim"), arrow(length + 0.6, height + 0.6, tipSize + 0.3), 0.4, 0.1, scene);
    rim.material = materials.rim;
    rim.parent = node;
    rim.position.z = 0.2;
    // Label over the rectangular part of the board.
    var label = up
        ? createLabel(scene, "".concat(id, "-label"), board.label, length - 1.6, (height - upTip) * 0.8)
        : createLabel(scene, "".concat(id, "-label"), board.label, length - tip - 1.6, height * 0.8);
    if (label) {
        label.parent = node;
        if (up) {
            label.position.set(0, -upTip / 2, -0.27);
        }
        else {
            label.position.set((-direction * (tip / 2)) + (direction * 0.15), 0, -0.27);
        }
    }
    // Two bolts near the tail, where the board is "screwed" to the post.
    for (var _i = 0, _a = [-1, 1]; _i < _a.length; _i++) {
        var side = _a[_i];
        var bolt = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("".concat(id, "-bolt-").concat(side), { diameter: 0.34, segments: 8 }, scene);
        bolt.scaling.z = 0.45;
        bolt.material = materials.gold;
        bolt.parent = node;
        if (up) {
            // In the bottom corners.
            bolt.position.set(side * ((length / 2) - 0.45), -(height / 2) + 0.45, -0.27);
        }
        else {
            bolt.position.set(-direction * ((length / 2) - 0.45), side * height * 0.3, -0.27);
        }
    }
    for (var _b = 0, _c = node.getChildMeshes(); _b < _c.length; _b++) {
        var mesh = _c[_b];
        mesh.isPickable = false;
    }
}
/** Flat plane with the label in navy letters on a transparent background, sized to fit. */
function createLabel(scene, name, text, width, height) {
    var textureWidth = 1024;
    var textureHeight = Math.max(64, Math.round((textureWidth * height) / width));
    var texture;
    try {
        texture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("".concat(name, "-texture"), { width: textureWidth, height: textureHeight }, scene, true);
    }
    catch (_a) {
        return null;
    }
    texture.hasAlpha = true;
    var context = texture.getContext();
    context.clearRect(0, 0, textureWidth, textureHeight);
    context.fillStyle = PALETTE.letters;
    context.textAlign = "center";
    context.textBaseline = "middle";
    var lines = text.split("\n");
    var font = function (size) { return "900 ".concat(size, "px \"Arial Rounded MT Bold\", \"Nunito\", \"Trebuchet MS\", Arial, sans-serif"); };
    // Largest size that fits both the height (all lines) and the width (longest line).
    var size = (textureHeight / lines.length) * 0.82;
    context.font = font(size);
    var widest = Math.max.apply(Math, lines.map(function (line) { return context.measureText(line).width; }));
    if (widest > textureWidth * 0.96) {
        size *= (textureWidth * 0.96) / widest;
        context.font = font(size);
    }
    var lineHeight = textureHeight / lines.length;
    lines.forEach(function (line, i) { return context.fillText(line, textureWidth / 2, (lineHeight * (i + 0.5)) + (size * 0.04)); });
    texture.update();
    var material = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("".concat(name, "-material"), scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.specularColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.1, 0.1, 0.1);
    material.emissiveColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.15, 0.15, 0.18);
    var plane = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreatePlane(name, { width: width, height: height }, scene);
    plane.material = material;
    plane.isPickable = false;
    return plane;
}
/** A small target on top of the post: rings stepping out towards the camera. */
function addBullseye(scene, id, parent, y, materials) {
    var node = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode(id, scene);
    node.parent = parent;
    node.position.set(0, y, -0.2);
    // Cylinders stand along Y; tip them so their faces point at the camera (-Z).
    node.rotation.x = -Math.PI / 2;
    var rings = [
        { radius: 1.25, material: materials.rim, top: 0.2 },
        { radius: 1.05, material: materials.board, top: 0.3 },
        { radius: 0.75, material: materials.cap, top: 0.38 },
        { radius: 0.46, material: materials.board, top: 0.46 },
        { radius: 0.22, material: materials.gold, top: 0.56 },
    ];
    rings.forEach(function (ring, i) {
        var height = ring.top + 0.2;
        var disc = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("".concat(id, "-ring-").concat(i), { diameter: ring.radius * 2, height: height, tessellation: 40 }, scene);
        disc.material = ring.material;
        disc.parent = node;
        disc.position.y = ring.top - (height / 2);
        disc.isPickable = false;
    });
}


/***/ },

/***/ "./src/scenes/world/workCorner.ts"
/*!****************************************!*\
  !*** ./src/scenes/world/workCorner.ts ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TICKER_TEXT: () => (/* binding */ TICKER_TEXT),
/* harmony export */   createWorkCorner: () => (/* binding */ createWorkCorner)
/* harmony export */ });
/* unused harmony export WORK_CORNER_POSITION */
/* harmony import */ var _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babylonjs/core */ "./node_modules/@babylonjs/core/index.js");
/* harmony import */ var _audio_soundMaterials__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../audio/soundMaterials */ "./src/scenes/audio/soundMaterials.ts");
/* harmony import */ var _core_staticBodies__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/staticBodies */ "./src/scenes/core/staticBodies.ts");
/* harmony import */ var _core_toyStyle__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../core/toyStyle */ "./src/scenes/core/toyStyle.ts");
/* harmony import */ var _core_constants__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../core/constants */ "./src/scenes/core/constants.ts");
/* harmony import */ var _ui_style__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../ui/style */ "./src/scenes/ui/style.ts");
/* harmony import */ var _infoStand__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./infoStand */ "./src/scenes/world/infoStand.ts");
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};







/**
 * The work corner, in the open field south of the start, past the brick wall: straight ahead from
 * the crossroads sign, with a side path leading there from the main loop. The work itself is confidential, so the corner
 * hints at it rather than showing anything:
 *
 * - an info stand: quantum-inspired algorithms for financial trading software;
 * - a "quantum core" sculpture: a glowing sphere with a precessing state arrow and two orbiting
 *   rings, on a plinth;
 * - a toy trading board: candlesticks trending up, a gold trend line and a scrolling ticker strip;
 * - a briefcase stamped CONFIDENTIAL with a padlock, which can be pushed around;
 * - BUY and SELL buttons in front of the board, for the Quantum Trader minigame (see
 *   tradingGame.ts), which also uses the board as its screen and the core as its signal light.
 *
 * Laid out in a frame facing the camera: local x runs to the right on screen and local -z towards
 * the camera.
 */
/** Centre of the corner on the ground (x, z). */
var WORK_CORNER_POSITION = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector2(-20, -72);
/** Nothing animates when the tank is further away than this. */
var ANIMATION_DISTANCE = 170;
var FONT = _ui_style__WEBPACK_IMPORTED_MODULE_5__.UI.font;
var PALETTE = {
    navy: "#344B63",
    navyLight: "#4A6280",
    navyDeep: "#22313F",
    sand: "#E8DCC6",
    cream: "#F4EBDD",
    gold: "#C9A35B",
    wood: "#8B6A50",
    mint: "#7CC9A0",
    pink: "#E8869F",
    pinkDeep: "#C9667F",
    muted: "#6B7B8C",
    core: "#8FD3E8",
    leather: "#7A4E36",
    leatherDark: "#5B3828",
    stamp: "#C94F4F",
};
function createWorkCorner(scene) {
    var yaw = _core_constants__WEBPACK_IMPORTED_MODULE_4__.FACE_CAMERA_YAW;
    var right = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    var away = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    var frame = {
        yaw: yaw,
        toWorld: function (x, y, z) { return new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(WORK_CORNER_POSITION.x + (right.x * x) + (away.x * z), _core_constants__WEBPACK_IMPORTED_MODULE_4__.GROUND_Y + y, WORK_CORNER_POSITION.y + (right.z * x) + (away.z * z)); },
    };
    var materials = createMaterials(scene);
    var animations = [];
    var setSignal = null;
    var board = null;
    var buttons = null;
    var parts = [
        ["info stand", function () { return createWorkInfoStand(scene, frame); }],
        ["quantum core", function () {
                var core = createQuantumCore(scene, frame, materials);
                animations.push(core.animate);
                setSignal = core.setSignal;
            }],
        ["trading board", function () {
                board = createTradingBoard(scene, frame, materials);
                animations.push(board.animate);
            }],
        ["trade buttons", function () {
                buttons = {
                    buy: createTradeButton(scene, frame, materials, "buy", 16, -8),
                    sell: createTradeButton(scene, frame, materials, "sell", 30, -8),
                };
                animations.push(function (dt) {
                    buttons === null || buttons === void 0 ? void 0 : buttons.buy.animate(dt);
                    buttons === null || buttons === void 0 ? void 0 : buttons.sell.animate(dt);
                });
            }],
        ["briefcase", function () { return createBriefcase(scene, frame, materials); }],
    ];
    for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
        var _a = parts_1[_i], name_1 = _a[0], build = _a[1];
        try {
            build();
        }
        catch (error) {
            console.error("Work corner ".concat(name_1, " failed"), error);
        }
    }
    var tank = scene.getMeshByName("tank_holder");
    var center = frame.toWorld(0, 0, 0);
    scene.onBeforeRenderObservable.add(function () {
        if (tank && Math.hypot(tank.position.x - center.x, tank.position.z - center.z) > ANIMATION_DISTANCE) {
            return;
        }
        var dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
        for (var _i = 0, animations_1 = animations; _i < animations_1.length; _i++) {
            var animate = animations_1[_i];
            animate(dt);
        }
    });
    if (!setSignal || !board || !buttons) {
        return null;
    }
    return { center: center, setSignal: setSignal, board: board, buttons: buttons };
}
function createMaterials(scene) {
    var toy = function (name, hex, roughness, clearCoat, metallic) {
        if (roughness === void 0) { roughness = 0.45; }
        if (clearCoat === void 0) { clearCoat = 0.4; }
        if (metallic === void 0) { metallic = 0; }
        return (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createToyMaterial)(scene, "work-".concat(name), hex, { roughness: roughness, clearCoat: clearCoat, metallic: metallic });
    };
    var core = toy("core", PALETTE.core, 0.2, 0.9);
    core.emissiveColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString(PALETTE.core).toLinearSpace().scale(0.35);
    return {
        navy: toy("navy", PALETTE.navy),
        navyLight: toy("navy-light", PALETTE.navyLight, 0.5, 0.2),
        sand: toy("sand", PALETTE.sand, 0.45, 0.35),
        cream: toy("cream", PALETTE.cream, 0.45, 0.4),
        gold: toy("gold", PALETTE.gold, 0.25, 0.6, 0.6),
        wood: toy("wood", PALETTE.wood, 0.55, 0.3),
        mint: toy("mint", PALETTE.mint, 0.4, 0.5),
        pink: toy("pink", PALETTE.pink, 0.4, 0.5),
        core: core,
        leather: toy("leather", PALETTE.leather, 0.5, 0.35),
        leatherDark: toy("leather-dark", PALETTE.leatherDark, 0.5, 0.3),
    };
}
/** A node in the corner's frame at local (x, z), facing the camera; its children are built at size 1. */
function createAnchor(scene, name, frame, x, z, scale) {
    if (scale === void 0) { scale = 1; }
    var node = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode(name, scene);
    node.position.copyFrom(frame.toWorld(x, 0, z));
    node.rotation.y = frame.yaw;
    node.scaling.setAll(scale);
    return node;
}
function attach(mesh, parent, material, animated) {
    var _a;
    if (animated === void 0) { animated = false; }
    mesh.parent = parent;
    mesh.material = material;
    mesh.isPickable = false;
    if (animated) {
        mesh.metadata = __assign(__assign({}, ((_a = mesh.metadata) !== null && _a !== void 0 ? _a : {})), { keepUnfrozen: true });
    }
    return mesh;
}
/** Static collision box given in a node's (uniformly scaled) frame. */
function addCollider(scene, node, local, width, height, depth, sound) {
    if (sound === void 0) { sound = "solid"; }
    node.computeWorldMatrix(true);
    var scale = node.scaling.x;
    (0,_core_staticBodies__WEBPACK_IMPORTED_MODULE_2__.addStaticBox)(scene, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.TransformCoordinates(local, node.getWorldMatrix()), width * scale, height * scale, depth * scale, {
        rotation: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion.RotationYawPitchRoll(node.rotation.y, 0, 0),
        sound: sound,
    });
}
// ==================================================================== Info stand
function createWorkInfoStand(scene, frame) {
    var position = frame.toWorld(-19, 0, -4);
    (0,_infoStand__WEBPACK_IMPORTED_MODULE_6__.createInfoStand)(scene, {
        id: "work-info-stand",
        x: position.x,
        z: position.z,
        draw: function (context) {
            var pad = 64;
            var bottom = (0,_infoStand__WEBPACK_IMPORTED_MODULE_6__.drawInfoText)(context, FONT, {
                eyebrow: "MY WORK",
                eyebrowColor: PALETTE.pinkDeep,
                title: "Quantum-Inspired Trading",
                titleColor: PALETTE.navy,
                body: "I build software for financial trading, using quantum-inspired algorithms to solve hard optimisation problems. The rest is confidential.",
                bodyColor: PALETTE.muted,
                maxWidth: 600,
            });
            // "Confidential" pill with a padlock.
            var pillY = bottom + 14;
            var pillHeight = 72;
            context.font = "900 34px ".concat(FONT);
            var pillText = "Top secret, sorry!";
            var pillWidth = context.measureText(pillText).width + 116;
            (0,_infoStand__WEBPACK_IMPORTED_MODULE_6__.roundRect)(context, pad, pillY, pillWidth, pillHeight, pillHeight / 2);
            context.fillStyle = PALETTE.navy;
            context.fill();
            drawPadlock(context, pad + 46, pillY + (pillHeight / 2) + 4, 0.9, PALETTE.cream, PALETTE.navy);
            context.fillStyle = PALETTE.cream;
            context.fillText(pillText, pad + 82, pillY + 47);
            drawQubit(context, 880, 300, 82);
            drawCandles(context, 740, 560);
        },
    });
}
function drawPadlock(context, x, y, size, color, hole) {
    context.save();
    context.translate(x, y);
    context.scale(size, size);
    context.strokeStyle = color;
    context.lineWidth = 7;
    context.beginPath();
    context.arc(0, -12, 12, Math.PI, 0);
    context.lineTo(12, -4);
    context.moveTo(-12, -12);
    context.lineTo(-12, -4);
    context.stroke();
    context.fillStyle = color;
    (0,_infoStand__WEBPACK_IMPORTED_MODULE_6__.roundRect)(context, -19, -6, 38, 30, 6);
    context.fill();
    context.fillStyle = hole;
    context.beginPath();
    context.arc(0, 6, 4.5, 0, Math.PI * 2);
    context.fill();
    context.restore();
}
/** A Bloch sphere: a circle, its equator, axes and a state arrow. */
function drawQubit(context, x, y, r) {
    context.save();
    context.fillStyle = "#DDF1F6";
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = 6;
    context.strokeStyle = PALETTE.navy;
    context.stroke();
    context.lineWidth = 4;
    context.setLineDash([12, 10]);
    context.beginPath();
    context.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(x, y - r);
    context.lineTo(x, y + r);
    context.stroke();
    context.setLineDash([]);
    // State arrow.
    var tipX = x + (r * 0.55);
    var tipY = y - (r * 0.62);
    context.strokeStyle = PALETTE.pinkDeep;
    context.lineWidth = 8;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(tipX, tipY);
    context.stroke();
    context.fillStyle = PALETTE.pinkDeep;
    context.beginPath();
    context.arc(tipX, tipY, 11, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.navy;
    context.beginPath();
    context.arc(x, y, 8, 0, Math.PI * 2);
    context.fill();
    context.restore();
}
/** A few candlesticks trending up, with their base at (x, y). */
function drawCandles(context, x, y) {
    var candles = [[0, 40, -10, 52], [40, 22, 14, 52], [22, 74, 12, 86], [74, 58, 46, 92], [58, 120, 50, 134]];
    context.lineCap = "round";
    candles.forEach(function (_a, i) {
        var open = _a[0], close = _a[1], low = _a[2], high = _a[3];
        var cx = x + (i * 46);
        var up = close > open;
        context.strokeStyle = PALETTE.navy;
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(cx, y - low);
        context.lineTo(cx, y - high);
        context.stroke();
        context.fillStyle = up ? PALETTE.mint : PALETTE.pink;
        (0,_infoStand__WEBPACK_IMPORTED_MODULE_6__.roundRect)(context, cx - 15, y - Math.max(open, close), 30, Math.max(8, Math.abs(close - open)), 6);
        context.fill();
    });
}
// ==================================================================== Quantum core
/** Returns its animation step. */
/** The core's colours for each signal: its own pale blue, or mint / pink for up / down. */
var SIGNAL_COLORS = { none: PALETTE.core, up: PALETTE.mint, down: PALETTE.pink };
/** Where the state arrow leans for each signal (0 = straight up). */
var SIGNAL_TILT = { none: -0.6, up: -0.15, down: Math.PI - 0.15 };
function createQuantumCore(scene, frame, materials) {
    var root = createAnchor(scene, "work-quantum-core", frame, 2, 5, 1.5);
    attach((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("work-core-plinth", 6, 1.6, 6, 0.4, scene), root, materials.navy).position.y = 0.8;
    attach((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("work-core-plinth-top", 5.2, 0.3, 5.2, 0.12, scene), root, materials.sand).position.y = 1.75;
    var pillar = attach(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("work-core-pillar", { diameterTop: 0.6, diameterBottom: 1.4, height: 3.6, tessellation: 20 }, scene), root, materials.gold);
    pillar.position.y = 3.6;
    var coreY = 8.4;
    var core = attach(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("work-core-sphere", { diameter: 3.6, segments: 24 }, scene), root, materials.core);
    core.position.y = coreY;
    // The state arrow (a gold shaft with a pink ball on the end), precessing around the vertical.
    var precession = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("work-core-precession", scene);
    precession.parent = root;
    precession.position.y = coreY;
    var arrow = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("work-core-arrow", scene);
    arrow.parent = precession;
    arrow.rotation.z = -0.6;
    var shaft = attach(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("work-core-shaft", { diameter: 0.22, height: 3, tessellation: 10 }, scene), arrow, materials.gold, true);
    shaft.position.y = 1.5;
    var tip = attach(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("work-core-tip", { diameter: 0.7, segments: 12 }, scene), arrow, materials.pink, true);
    tip.position.y = 3;
    // Two tilted rings, each with a little bead running round it.
    var rings = [
        { tilt: 1.05, speed: 0.7, bead: materials.pink },
        { tilt: -1.05, speed: -0.5, bead: materials.mint },
    ].map(function (_a, i) {
        var tilt = _a.tilt, speed = _a.speed, bead = _a.bead;
        var holder = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("work-core-ring-holder-".concat(i), scene);
        holder.parent = root;
        holder.position.y = coreY;
        holder.rotation.z = tilt;
        var spinner = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("work-core-ring-".concat(i), scene);
        spinner.parent = holder;
        attach(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateTorus("work-core-torus-".concat(i), { diameter: 6, thickness: 0.22, tessellation: 48 }, scene), spinner, materials.cream, true);
        var beadMesh = attach(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateSphere("work-core-bead-".concat(i), { diameter: 0.6, segments: 10 }, scene), spinner, bead, true);
        beadMesh.position.x = 3;
        return { spinner: spinner, speed: speed };
    });
    addCollider(scene, root, new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 5.5, 0), 6.6, 11, 6.6);
    // The minigame's signal: the core lights up in the signal's colour, the arrow swings up or
    // down, and the rings spin faster.
    var material = materials.core;
    var targetColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString(PALETTE.core).toLinearSpace();
    var signal = "none";
    var tilt = SIGNAL_TILT.none;
    var time = 0;
    var animate = function (dt) {
        time += dt;
        var excited = signal !== "none";
        precession.rotation.y += dt * (excited ? 2.4 : 0.9);
        tilt += (SIGNAL_TILT[signal] - tilt) * Math.min(1, dt * 6);
        // A gentle nod, so it doesn't look like a plain turntable.
        arrow.rotation.z = tilt + (Math.sin(time * 0.8) * (excited ? 0.06 : 0.2));
        for (var _i = 0, rings_1 = rings; _i < rings_1.length; _i++) {
            var ring = rings_1[_i];
            ring.spinner.rotation.y += dt * ring.speed * (excited ? 3 : 1);
        }
        var blend = Math.min(1, dt * 8);
        _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.LerpToRef(material.albedoColor, targetColor, blend, material.albedoColor);
        var glow = excited ? 0.55 + (Math.sin(time * 9) * 0.15) : 0.35;
        _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.LerpToRef(material.emissiveColor, targetColor.scale(glow), blend, material.emissiveColor);
    };
    var setSignal = function (next) {
        signal = next;
        _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.FromHexString(SIGNAL_COLORS[next]).toLinearSpaceToRef(targetColor);
    };
    return { animate: animate, setSignal: setSignal };
}
// ==================================================================== Trading board
/** Open, close, low, high, in chart units (0 at the bottom of the chart area). */
var CANDLES = [
    [1.0, 2.0, 0.6, 2.4],
    [2.0, 1.4, 1.0, 2.3],
    [1.4, 3.0, 1.2, 3.4],
    [3.0, 3.8, 2.6, 4.2],
    [3.8, 3.1, 2.8, 4.1],
    [3.1, 4.9, 2.9, 5.3],
    [4.9, 4.4, 4.0, 5.4],
    [4.4, 6.4, 4.2, 6.8],
];
var TICKER_TEXT = "QUANTUM-INSPIRED ALGORITHMS   ▲   FINANCIAL TRADING   ▲   OPTIMISATION   ▲   SOFTWARE ENGINEERING   ▲   ";
function createTradingBoard(scene, frame, materials) {
    var root = createAnchor(scene, "work-trading-board", frame, 23, 3, 1.25);
    var width = 16;
    var height = 10.5;
    var centerY = 9;
    var depth = 0.8;
    attach((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("work-board", width, height, depth, 0.6, scene), root, materials.navy).position.y = centerY;
    var rim = attach((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("work-board-rim", width + 1.2, height + 1.2, depth * 0.7, 0.8, scene), root, materials.sand);
    rim.position.set(0, centerY, 0.2);
    for (var _i = 0, _a = [-1, 1]; _i < _a.length; _i++) {
        var side = _a[_i];
        var post = attach((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("work-board-post-".concat(side), 1.1, centerY, 1.1, 0.35, scene), root, materials.wood);
        post.position.set(side * (width / 2 - 2.2), centerY / 2, 0.9);
    }
    // Chart area: faint grid lines, the candles and a gold trend line in front.
    var front = -(depth / 2);
    var chartBottom = 5.6;
    var chartLeft = -6.3;
    var pitch = 1.8;
    var grid = [0, 1, 2, 3].map(function (i) {
        var line = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("work-board-grid-".concat(i), width - 2, 0.12, 0.1, 0.04, scene, 1);
        line.position.set(0, chartBottom + (i * 2.2), front - 0.05);
        return line;
    });
    var decor = [];
    decor.push.apply(decor, mergeInto("work-board-grid", grid, root, materials.navyLight));
    var ups = [];
    var downs = [];
    var wicks = [];
    CANDLES.forEach(function (_a, i) {
        var open = _a[0], close = _a[1], low = _a[2], high = _a[3];
        var x = chartLeft + (i * pitch);
        var bodyHeight = Math.max(0.3, Math.abs(close - open));
        var body = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("work-candle-".concat(i), 1.05, bodyHeight, 0.7, 0.14, scene, 2);
        body.position.set(x, chartBottom + ((open + close) / 2), front - 0.4);
        (close > open ? ups : downs).push(body);
        var wick = (0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("work-wick-".concat(i), 0.2, high - low, 0.25, 0.08, scene, 1);
        wick.position.set(x, chartBottom + ((low + high) / 2), front - 0.3);
        wicks.push(wick);
    });
    decor.push.apply(decor, mergeInto("work-candles-up", ups, root, materials.mint));
    decor.push.apply(decor, mergeInto("work-candles-down", downs, root, materials.pink));
    decor.push.apply(decor, mergeInto("work-wicks", wicks, root, materials.cream));
    // Trend line through the candles' closes, ending in an arrowhead past the last one.
    var path = CANDLES.map(function (_a, i) {
        var close = _a[1];
        return new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(chartLeft + (i * pitch), chartBottom + close + 0.9, front - 1);
    });
    var last = path[path.length - 1];
    var before = path[path.length - 2];
    var direction = last.subtract(before).normalize();
    var headBase = last.add(direction.scale(0.6));
    path.push(headBase);
    var line = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateTube("work-trend", { path: path, radius: 0.16, tessellation: 10, cap: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.CAP_ALL }, scene);
    var head = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("work-trend-head", { diameterTop: 0, diameterBottom: 0.9, height: 1, tessellation: 12 }, scene);
    head.position.copyFrom(headBase.add(direction.scale(0.5)));
    head.rotation.z = -Math.atan2(direction.x, direction.y);
    decor.push.apply(decor, mergeInto("work-trend-line", [line, head], root, materials.gold));
    // Ticker strip along the bottom of the board, scrolling sideways.
    var ticker = createTicker(scene, width - 1.6, 1.2);
    ticker.mesh.parent = root;
    ticker.mesh.position.set(0, 4.35, front - 0.03);
    // The minigame's screen over the chart area (between the ticker and the top of the board).
    var screenWidth = width - 1.6;
    var screenHeight = (centerY + (height / 2) - 0.7) - 5.1;
    var screenPixels = { width: 1024, height: Math.round((1024 * screenHeight) / screenWidth) };
    var screenTexture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("work-screen-texture", screenPixels, scene, true);
    var screenMaterial = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("work-screen-material", scene);
    screenMaterial.disableLighting = true;
    screenMaterial.emissiveTexture = screenTexture;
    screenMaterial.diffuseColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.Black();
    var screen = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreatePlane("work-screen", { width: screenWidth, height: screenHeight }, scene);
    screen.material = screenMaterial;
    screen.parent = root;
    screen.isPickable = false;
    screen.position.set(0, 5.1 + (screenHeight / 2), front - 0.04);
    screen.setEnabled(false);
    addCollider(scene, root, new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, (centerY + (height / 2) + 0.6) / 2, 0.3), width + 1.4, centerY + (height / 2) + 0.6, 2.4, "post");
    return {
        animate: function (dt) {
            ticker.texture.uOffset = (ticker.texture.uOffset + (dt * 0.045)) % 1;
        },
        showScreen: function (show) {
            screen.setEnabled(show);
            for (var _i = 0, decor_1 = decor; _i < decor_1.length; _i++) {
                var mesh = decor_1[_i];
                mesh.setEnabled(!show);
            }
        },
        screen: screenTexture.getContext(),
        screenSize: screenPixels,
        updateScreen: function () { return screenTexture.update(); },
        setTicker: ticker.setText,
    };
}
/** Merges meshes (built in the parent's frame) into one under `parent`. */
function mergeInto(name, meshes, parent, material) {
    var merged = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.MergeMeshes(meshes, true, true);
    if (!merged) {
        return [];
    }
    merged.name = name;
    attach(merged, parent, material);
    return [merged];
}
function createTicker(scene, width, height) {
    var textureWidth = 4096;
    var textureHeight = 128;
    var texture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("work-ticker-texture", { width: textureWidth, height: textureHeight }, scene, true);
    texture.wrapU = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Texture.WRAP_ADDRESSMODE;
    // Same aspect ratio as the strip, so the letters aren't stretched.
    texture.uScale = (width / height) / (textureWidth / textureHeight);
    var context = texture.getContext();
    var text = TICKER_TEXT;
    var draw = function () {
        context.fillStyle = PALETTE.navyDeep;
        context.fillRect(0, 0, textureWidth, textureHeight);
        context.font = "900 64px ".concat(FONT);
        context.textBaseline = "middle";
        // Whole copies of the text across the width (squeezed or stretched a little to fit), so
        // it tiles seamlessly as it scrolls.
        var textWidth = context.measureText(text).width;
        var copies = Math.max(1, Math.round(textureWidth / textWidth));
        var step = textureWidth / copies;
        for (var i = 0; i < copies; i++) {
            context.setTransform(step / textWidth, 0, 0, 1, i * step, 0);
            var x = 0;
            for (var _i = 0, _a = text.split(/(\u25B2)/); _i < _a.length; _i++) {
                var word = _a[_i];
                context.fillStyle = word === "\u25B2" ? PALETTE.mint : PALETTE.cream;
                context.fillText(word, x, (textureHeight / 2) + 4);
                x += context.measureText(word).width;
            }
        }
        context.setTransform(1, 0, 0, 1, 0, 0);
        texture.update();
    };
    draw();
    if ("fonts" in document) {
        void document.fonts.load("900 40px Nunito").then(draw).catch(function () { return undefined; });
    }
    var material = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("work-ticker-material", scene);
    material.disableLighting = true;
    material.emissiveTexture = texture;
    material.diffuseColor = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3.Black();
    var mesh = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreatePlane("work-ticker", { width: width, height: height }, scene);
    mesh.material = material;
    mesh.isPickable = false;
    var setText = function (next) {
        if (next !== text) {
            text = next;
            draw();
        }
    };
    return { mesh: mesh, texture: texture, setText: setText };
}
// ==================================================================== Trade buttons
var BUTTON_STYLE = {
    buy: { label: "BUY", arrow: "\u25B2", color: PALETTE.mint },
    sell: { label: "SELL", arrow: "\u25BC", color: PALETTE.pink },
};
/**
 * A big round arcade button on a post, facing the camera, for the minigame: shoot it to press it.
 * Built at (x, z) in the corner's frame.
 */
function createTradeButton(scene, frame, materials, kind, x, z) {
    var style = BUTTON_STYLE[kind];
    var id = "work-button-".concat(kind);
    var root = createAnchor(scene, id, frame, x, z, 1.2);
    var discY = 6.2;
    attach((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("".concat(id, "-base"), 2.8, 0.6, 2.8, 0.25, scene), root, materials.sand).position.y = 0.3;
    var post = attach((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("".concat(id, "-post"), 0.8, discY, 0.8, 0.3, scene), root, materials.wood);
    post.position.set(0, (discY / 2) + 0.3, 0.6);
    // Cylinders stand along Y; tip them so their faces point at the camera (-Z).
    var holder = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("".concat(id, "-holder"), scene);
    holder.parent = root;
    holder.position.set(0, discY, 0);
    holder.rotation.x = -Math.PI / 2;
    var rim = attach(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("".concat(id, "-rim"), { diameter: 5, height: 0.8, tessellation: 40 }, scene), holder, materials.navy);
    rim.position.y = 0.1;
    // The cap is what moves in when the button is pressed.
    var cap = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.TransformNode("".concat(id, "-cap"), scene);
    cap.parent = holder;
    var face = attach(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateCylinder("".concat(id, "-face"), { diameter: 4.1, height: 0.7, tessellation: 40 }, scene), cap, kind === "buy" ? materials.mint : materials.pink, true);
    face.position.y = 0.6;
    var label = createButtonLabel(scene, "".concat(id, "-label"), style.arrow, style.label);
    label.parent = cap;
    label.position.y = 0.97;
    label.rotation.x = Math.PI / 2;
    label.metadata = { keepUnfrozen: true };
    var onHit = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Observable();
    root.computeWorldMatrix(true);
    var scale = root.scaling.x;
    var position = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.TransformCoordinates(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, discY, -0.5), root.getWorldMatrix());
    var rotation = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Quaternion.RotationYawPitchRoll(root.rotation.y, 0, 0);
    // Only shots press it; the tank driving into it just bumps.
    (0,_core_staticBodies__WEBPACK_IMPORTED_MODULE_2__.addStaticBox)(scene, position, 5 * scale, 5 * scale, 1.6 * scale, {
        rotation: rotation,
        sound: "post",
        onHit: function (body) {
            if ((0,_audio_soundMaterials__WEBPACK_IMPORTED_MODULE_1__.getSoundMaterial)(body) === "ball") {
                onHit.notifyObservers();
            }
        },
    });
    (0,_core_staticBodies__WEBPACK_IMPORTED_MODULE_2__.addStaticBox)(scene, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3.TransformCoordinates(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, discY / 2, 0.6), root.getWorldMatrix()), 1.2 * scale, discY * scale, 1.2 * scale, { rotation: rotation, sound: "post" });
    var pressed = 0;
    return {
        position: position,
        onHit: onHit,
        press: function () {
            pressed = 1;
        },
        animate: function (dt) {
            if (pressed <= 0 && cap.position.y === 0) {
                return;
            }
            pressed = Math.max(0, pressed - (dt * 3));
            // In fast, back out slowly.
            cap.position.y = -0.45 * Math.sin(Math.min(1, pressed) * Math.PI * 0.5);
        },
    };
}
function createButtonLabel(scene, name, arrow, text) {
    var size = 256;
    var texture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("".concat(name, "-texture"), { width: size, height: size }, scene, true);
    texture.hasAlpha = true;
    var context = texture.getContext();
    var draw = function () {
        context.clearRect(0, 0, size, size);
        context.fillStyle = PALETTE.navyDeep;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = "900 54px ".concat(FONT);
        context.fillText(arrow, size / 2, size * 0.32);
        context.font = "900 ".concat(text.length > 3 ? 70 : 80, "px ").concat(FONT);
        context.fillText(text, size / 2, size * 0.64);
        texture.update();
    };
    draw();
    if ("fonts" in document) {
        void document.fonts.load("900 40px Nunito").then(draw).catch(function () { return undefined; });
    }
    var material = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("".concat(name, "-material"), scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.specularColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.1, 0.1, 0.1);
    material.emissiveColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.3, 0.3, 0.3);
    var plane = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreatePlane(name, { size: 3.4 }, scene);
    plane.material = material;
    plane.isPickable = false;
    return plane;
}
// ==================================================================== Briefcase
/** A pushable briefcase with a padlock and a CONFIDENTIAL stamp. */
function createBriefcase(scene, frame, materials) {
    var size = { width: 5, height: 3.8, depth: 1.6 };
    var collider = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateBox("work-briefcase-collider", size, scene);
    collider.position.copyFrom(frame.toWorld(-4, (size.height / 2) + 0.05, -9));
    collider.rotation.y = frame.yaw - 0.35;
    collider.isVisible = false;
    collider.isPickable = false;
    var impostor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor(collider, _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.PhysicsImpostor.BoxImpostor, { mass: 2, friction: 0.6, restitution: 0.05 }, scene);
    collider.physicsImpostor = impostor;
    var body = impostor.physicsBody;
    if (body) {
        body.linearDamping = 0.15;
        body.angularDamping = 0.3;
    }
    var add = function (mesh, material) { return attach(mesh, collider, material, true); };
    add((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("work-briefcase-body", size.width, size.height, size.depth, 0.35, scene), materials.leather);
    // A band round the middle where the lid closes.
    add((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("work-briefcase-band", size.width + 0.08, 0.35, size.depth + 0.08, 0.12, scene, 2), materials.leatherDark).position.y = 0.55;
    var handlePath = [];
    for (var i = 0; i <= 12; i++) {
        var angle = (i / 12) * Math.PI;
        handlePath.push(new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Vector3(Math.cos(angle) * 0.9, (size.height / 2) + (Math.sin(angle) * 0.7), 0));
    }
    add(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateTube("work-briefcase-handle", { path: handlePath, radius: 0.16, tessellation: 10, cap: _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Mesh.CAP_ALL }, scene), materials.leatherDark);
    // Latches and a padlock hanging from the middle.
    var front = -(size.depth / 2);
    for (var _i = 0, _a = [-1, 1]; _i < _a.length; _i++) {
        var side = _a[_i];
        add((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("work-briefcase-latch-".concat(side), 0.6, 0.5, 0.2, 0.08, scene, 1), materials.gold).position.set(side * 1.6, 0.55, front - 0.08);
    }
    var shackle = add(_babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreateTorus("work-briefcase-shackle", { diameter: 0.6, thickness: 0.12, tessellation: 20 }, scene), materials.gold);
    shackle.rotation.x = Math.PI / 2;
    shackle.position.set(0, 0.45, front - 0.15);
    add((0,_core_toyStyle__WEBPACK_IMPORTED_MODULE_3__.createRoundedBox)("work-briefcase-lock", 0.8, 0.7, 0.3, 0.12, scene, 2), materials.gold).position.set(0, -0.05, front - 0.18);
    var stamp = createStamp(scene);
    stamp.parent = collider;
    stamp.position.set(0, -1, front - 0.02);
    stamp.rotation.z = 0.12;
    stamp.metadata = { keepUnfrozen: true };
}
function createStamp(scene) {
    var width = 512;
    var height = 128;
    var texture = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.DynamicTexture("work-stamp-texture", { width: width, height: height }, scene, true);
    texture.hasAlpha = true;
    var context = texture.getContext();
    var draw = function () {
        context.clearRect(0, 0, width, height);
        context.strokeStyle = PALETTE.stamp;
        context.lineWidth = 10;
        (0,_infoStand__WEBPACK_IMPORTED_MODULE_6__.roundRect)(context, 10, 10, width - 20, height - 20, 18);
        context.stroke();
        context.fillStyle = PALETTE.stamp;
        context.font = "900 66px ".concat(FONT);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("CONFIDENTIAL", width / 2, (height / 2) + 4);
        texture.update();
    };
    draw();
    if ("fonts" in document) {
        void document.fonts.load("900 40px Nunito").then(draw).catch(function () { return undefined; });
    }
    var material = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial("work-stamp-material", scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.specularColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.1, 0.1, 0.1);
    material.emissiveColor = new _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.Color3(0.2, 0.2, 0.2);
    var plane = _babylonjs_core__WEBPACK_IMPORTED_MODULE_0__.MeshBuilder.CreatePlane("work-stamp", { width: 3.4, height: 0.85 }, scene);
    plane.material = material;
    plane.isPickable = false;
    return plane;
}


/***/ }

}]);
//# sourceMappingURL=src_scenes_tools_ts.624b0a8d2e0c44b4b72f.js.map