import * as BABYLON from "@babylonjs/core";

import { clamp } from "../core/math";
import { isSurface, type SoundMaterial, type SurfaceMaterial } from "./soundMaterials";

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
const HEARING_DISTANCE = 190;
/** At most this many impact sounds at once, and this many new ones per burst window. */
const MAX_IMPACT_VOICES = 14;
const MAX_IMPACTS_PER_BURST = 5;
const BURST_WINDOW_SECONDS = 0.06;
/** Slower impacts than this are silent (resting contacts, gentle nudges). */
const MIN_IMPACT_SPEED = 1.5;
/** Loose objects settle onto the ground after loading; their first bumps stay silent. */
const SETTLE_SECONDS = 3;
/** The tank can be stopped by the physics and by its own checks in the same moment: play one bump. */
const TANK_BUMP_COOLDOWN_SECONDS = 0.3;

type Voice = { output: GainNode };

export class SoundBoard {
    private context: AudioContext | null = null;
    private bus: GainNode | null = null;
    /** Background sounds (the engine), turned down briefly whenever something else plays. */
    private ambience: GainNode | null = null;
    private noise: AudioBuffer | null = null;
    private activeImpacts = 0;
    private burstStart = 0;
    private burstCount = 0;
    private readonly listener = new BABYLON.Vector3();
    private readonly listenerRight = new BABYLON.Vector3(1, 0, 0);
    private readonly onReady: (() => void)[] = [];
    private readonly quietUntil = performance.now() + (SETTLE_SECONDS * 1000);
    private lastTankBump = 0;

    public constructor(scene: BABYLON.Scene, private readonly tank: BABYLON.AbstractMesh, private readonly camera: BABYLON.Camera) {
        const audioEngine = BABYLON.Engine.audioEngine;
        if (!audioEngine) {
            return;
        }
        // We unlock audio ourselves on the first key press or click instead of showing Babylon's
        // speaker button.
        audioEngine.useCustomUnlockedButton = true;
        // The context has to exist before Babylon can resume it.
        const unlock = () => {
            this.ensureContext();
            audioEngine.unlock();
        };
        window.addEventListener("keydown", unlock);
        window.addEventListener("pointerdown", unlock);

        const observer = scene.onBeforeRenderObservable.add(() => {
            this.listener.copyFrom(this.tank.position);
            this.camera.getDirectionToRef(BABYLON.Axis.X, this.listenerRight);
        });
        scene.onDisposeObservable.addOnce(() => {
            window.removeEventListener("keydown", unlock);
            window.removeEventListener("pointerdown", unlock);
            scene.onBeforeRenderObservable.remove(observer);
            this.bus?.disconnect();
        });
    }

    /** Runs `callback` once audio is available (right away if it already is). */
    public whenReady(callback: () => void): void {
        if (this.isRunning()) {
            callback();
        } else {
            this.onReady.push(callback);
        }
    }

    /** The audio context and the bus every sound connects to, once audio is unlocked. */
    public getOutput(): { context: AudioContext; bus: GainNode; ambience: GainNode; noise: AudioBuffer } | null {
        return this.isRunning() && this.context && this.bus && this.ambience && this.noise
            ? { context: this.context, bus: this.bus, ambience: this.ambience, noise: this.noise }
            : null;
    }

    /** Dips the background sounds for a moment so a hit or shot stands out (`amount` 0 - 1). */
    private duck(amount: number): void {
        const context = this.context;
        const gain = this.ambience?.gain;
        if (!context || !gain) {
            return;
        }
        const time = context.currentTime;
        gain.cancelScheduledValues(time);
        gain.setTargetAtTime(Math.min(gain.value, 1 - (0.7 * clamp(amount, 0, 1))), time, 0.01);
        gain.setTargetAtTime(1, time + 0.12, 0.18);
    }

    /**
     * Whether audio can play. Never creates the audio context itself: browsers only allow that
     * after the player interacts with the page (and warn otherwise), so only `unlock` does.
     */
    private isRunning(): boolean {
        return this.context?.state === "running";
    }

    private ensureContext(): boolean {
        if (this.context) {
            return this.context.state === "running";
        }
        const audioEngine = BABYLON.Engine.audioEngine;
        const context = audioEngine?.audioContext;
        if (!audioEngine || !context || !audioEngine.masterGain) {
            return false;
        }
        this.context = context;

        // A gentle compressor keeps a wall collapsing into many hits from clipping.
        const compressor = context.createDynamicsCompressor();
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
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2) - 1;
        }

        const flush = () => {
            if (context.state === "running") {
                this.onReady.splice(0).forEach((callback) => callback());
            }
        };
        context.addEventListener("statechange", flush);
        flush();
        return context.state === "running";
    }

    // ----- Sounds ---------------------------------------------------------------------------

    /** The tank firing: a soft toy-cannon "thoomp" with a pop and a puff of air. */
    public shot(): void {
        const voice = this.createVoice(null, 1, 0.45);
        if (!voice) {
            return;
        }
        this.duck(1);
        const pitch = vary(0.06);
        this.tone(voice, { type: "sine", from: 165 * pitch, to: 46 * pitch, glide: 0.2, attack: 0.004, decay: 0.32, gain: 0.6 });
        this.tone(voice, { type: "triangle", from: 640 * pitch, to: 230 * pitch, glide: 0.05, attack: 0.002, decay: 0.07, gain: 0.13 });
        this.noiseBurst(voice, { filter: "bandpass", frequency: 1900, q: 0.8, attack: 0.001, decay: 0.06, gain: 0.32 });
        this.noiseBurst(voice, { filter: "lowpass", frequency: 650, q: 0.5, attack: 0.006, decay: 0.2, gain: 0.3 });
    }

    /** A link target hit: a cheerful two-note chime. */
    public chime(position: BABYLON.Vector3): void {
        const voice = this.createVoice(position, 1, 1.1);
        if (!voice) {
            return;
        }
        this.duck(0.8);
        [[880, 0], [1318.5, 0.09], [1760, 0.18]].forEach(([frequency, delay], i) => {
            this.tone(voice, { type: "triangle", from: frequency, attack: 0.004, decay: 0.55 - (i * 0.1), gain: 0.16, delay });
            this.tone(voice, { type: "sine", from: frequency * 2, attack: 0.004, decay: 0.3, gain: 0.05, delay });
        });
    }

    /** The tank landing after a jump; `speed` is how fast it was falling. */
    public land(speed: number): void {
        const strength = clamp((speed - 4) / 22, 0, 1);
        if (strength <= 0) {
            return;
        }
        const voice = this.createVoice(null, 0.3 + (0.7 * strength), 0.4);
        if (!voice) {
            return;
        }
        this.duck(strength);
        this.tone(voice, { type: "sine", from: 95, to: 42, glide: 0.18, attack: 0.003, decay: 0.3, gain: 0.7 });
        this.noiseBurst(voice, { filter: "lowpass", frequency: 500, q: 0.7, attack: 0.002, decay: 0.16, gain: 0.35 });
        this.clank(voice, 0.5);
    }

    /**
     * Two bodies hitting each other at `speed` (along the contact normal), at `position`. The
     * sound depends on what they're made of: wooden blocks clack (and thud on the ground), shots
     * boing, cones tap, trophies clunk, and scenery answers with its own sound: trees knock and
     * rustle, bushes rustle, boulders crack, signs knock and wobble, ramps thump.
     */
    public impact(a: SoundMaterial, b: SoundMaterial, speed: number, position: BABYLON.Vector3): void {
        const has = (material: SoundMaterial) => a === material || b === material;
        const other = (material: SoundMaterial) => (a === material ? b : a);
        if (speed < MIN_IMPACT_SPEED || performance.now() < this.quietUntil || (has("tank") && other("tank") === "ground")) {
            return;
        }
        if (has("tank")) {
            const now = performance.now() / 1000;
            if (now - this.lastTankBump < TANK_BUMP_COOLDOWN_SECONDS) {
                return;
            }
            this.lastTankBump = now;
        }
        const strength = Math.pow(clamp((speed - MIN_IMPACT_SPEED) / 22, 0, 1), 0.7);
        if (!this.allowImpact()) {
            return;
        }
        // Leaves keep rustling for a while after the hit.
        const rustles = has("trunk") || has("bush");
        const voice = this.createVoice(position, 0.15 + (0.85 * strength), rustles ? 0.9 : 0.35, true);
        if (!voice) {
            return;
        }
        this.duck(strength * 0.8);

        // Whatever moved into the scenery makes its own sound, and the scenery answers.
        const [mover, target] = isSurface(a) ? [b, a] : [a, b];
        const surface = isSurface(target) ? target : null;
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
        } else if (target !== mover) {
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
    }

    /** The sound a piece of scenery makes when it's hit. */
    private surface(voice: Voice, surface: SurfaceMaterial, strength: number): void {
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
    }

    // ----- Materials --------------------------------------------------------------------------

    /** A wooden toy block: a few inharmonic partials that die away fast, plus a click. */
    private wood(voice: Voice, strength: number, onGround: boolean): void {
        const base = 430 * vary(0.18) * (1 + (strength * 0.15));
        const length = 0.6 + (strength * 0.6);
        [[1, 1, 0.1], [2.32, 0.45, 0.06], [4.25, 0.22, 0.035]].forEach(([ratio, gain, decay]) => {
            this.tone(voice, { type: "sine", from: base * ratio, attack: 0.001, decay: decay * length, gain: gain * 0.45 * (onGround ? 0.6 : 1) });
        });
        this.noiseBurst(voice, { filter: "highpass", frequency: 2600, q: 0.7, attack: 0.0005, decay: 0.014, gain: 0.25 });
        if (onGround) {
            this.thud(voice, strength * 0.8);
        }
    }

    /** A rubber ball: a soft, low "boing". */
    private rubber(voice: Voice, strength: number): void {
        const pitch = vary(0.1);
        this.tone(voice, { type: "sine", from: 210 * pitch, to: 135 * pitch, glide: 0.08, attack: 0.003, decay: 0.1 + (strength * 0.06), gain: 0.5 });
        this.noiseBurst(voice, { filter: "lowpass", frequency: 900, q: 0.6, attack: 0.001, decay: 0.03, gain: 0.15 });
    }

    /** A hollow plastic cone: a short, bright tap. */
    private plastic(voice: Voice, strength: number): void {
        const base = 820 * vary(0.12);
        this.tone(voice, { type: "triangle", from: base, attack: 0.001, decay: 0.045 + (strength * 0.03), gain: 0.3 });
        this.tone(voice, { type: "sine", from: base * 1.93, attack: 0.001, decay: 0.03, gain: 0.12 });
        this.noiseBurst(voice, { filter: "bandpass", frequency: 3200, q: 1.2, attack: 0.0005, decay: 0.02, gain: 0.2 });
    }

    /** A heavy trophy on its plinth: a low clunk with a short ring. */
    private trophy(voice: Voice, strength: number): void {
        const base = 290 * vary(0.08);
        this.tone(voice, { type: "sine", from: base, attack: 0.002, decay: 0.12 + (strength * 0.08), gain: 0.4 });
        this.tone(voice, { type: "sine", from: base * 2.71, attack: 0.002, decay: 0.08, gain: 0.14 });
        this.thud(voice, strength);
    }

    /** A tree trunk: a deep wooden knock, and the leaves above shaking. */
    private trunk(voice: Voice, strength: number): void {
        const base = 150 * vary(0.1);
        this.tone(voice, { type: "sine", from: base, attack: 0.002, decay: 0.16 + (strength * 0.1), gain: 0.5 });
        this.tone(voice, { type: "sine", from: base * 2.63, attack: 0.002, decay: 0.08, gain: 0.2 });
        this.noiseBurst(voice, { filter: "bandpass", frequency: 900, q: 1.1, attack: 0.001, decay: 0.03, gain: 0.2 });
        this.thud(voice, strength * 0.7);
        this.rustle(voice, strength * 0.8, 0.06);
    }

    /** A bush: a soft, leafy rustle with a muffled bump. */
    private bush(voice: Voice, strength: number): void {
        this.rustle(voice, strength * 1.3, 0);
        this.tone(voice, { type: "sine", from: 110 * vary(0.1), to: 70, glide: 0.1, attack: 0.01, decay: 0.15, gain: 0.25 });
    }

    /** A boulder: a hard, gritty crack over a heavy thud. */
    private rock(voice: Voice, strength: number): void {
        const base = 720 * vary(0.12);
        this.tone(voice, { type: "triangle", from: base, attack: 0.0005, decay: 0.03, gain: 0.22 });
        this.tone(voice, { type: "sine", from: base * 2.3, attack: 0.0005, decay: 0.02, gain: 0.1 });
        this.noiseBurst(voice, { filter: "bandpass", frequency: 1600, q: 1, attack: 0.0005, decay: 0.05 + (strength * 0.03), gain: 0.35 });
        this.thud(voice, strength * 1.2);
    }

    /** A wooden sign post: a hollow plank knock, then the sign wobbling with a smaller knock. */
    private post(voice: Voice, strength: number): void {
        const base = 240 * vary(0.1);
        [[0, 1], [0.07, 0.35], [0.13, 0.15]].forEach(([delay, gain]) => {
            this.tone(voice, { type: "sine", from: base, attack: 0.001, decay: 0.12, gain: 0.45 * gain, delay });
            this.tone(voice, { type: "sine", from: base * 2.55, attack: 0.001, decay: 0.06, gain: 0.2 * gain, delay });
            this.tone(voice, { type: "sine", from: base * 4.8, attack: 0.001, decay: 0.035, gain: 0.1 * gain, delay });
        });
        this.noiseBurst(voice, { filter: "highpass", frequency: 2200, q: 0.7, attack: 0.0005, decay: 0.015, gain: 0.2 });
        this.thud(voice, strength * 0.5);
    }

    /** A ramp or platform: a hollow box thump. */
    private ramp(voice: Voice, strength: number): void {
        const base = 130 * vary(0.08);
        this.tone(voice, { type: "sine", from: base, attack: 0.002, decay: 0.2 + (strength * 0.08), gain: 0.45 });
        this.tone(voice, { type: "triangle", from: base * 2.4, attack: 0.002, decay: 0.09, gain: 0.15 });
        this.noiseBurst(voice, { filter: "lowpass", frequency: 700, q: 0.8, attack: 0.001, decay: 0.1, gain: 0.25 });
    }

    /** Leaves shaking: two soft swells of high, filtered noise. */
    private rustle(voice: Voice, strength: number, delay: number): void {
        const gain = 0.08 + (0.14 * clamp(strength, 0, 1));
        this.noiseBurst(voice, { filter: "bandpass", frequency: 3800, q: 0.6, attack: 0.04, decay: 0.45, gain, delay });
        this.noiseBurst(voice, { filter: "bandpass", frequency: 2600, q: 0.7, attack: 0.05, decay: 0.35, gain: gain * 0.7, delay: delay + 0.14 });
    }

    /** Something heavy meeting the ground: a low, short thump. */
    private thud(voice: Voice, strength: number): void {
        this.tone(voice, { type: "sine", from: 120 * vary(0.1), to: 55, glide: 0.1, attack: 0.002, decay: 0.12 + (strength * 0.1), gain: 0.5 });
        this.noiseBurst(voice, { filter: "lowpass", frequency: 380, q: 0.6, attack: 0.001, decay: 0.08, gain: 0.25 });
    }

    /** The tank's tin body rattling on a hit. */
    private clank(voice: Voice, strength: number): void {
        const base = 340 * vary(0.1);
        this.tone(voice, { type: "square", from: base, attack: 0.001, decay: 0.06 + (strength * 0.05), gain: 0.05 });
        this.tone(voice, { type: "sine", from: base * 2.68, attack: 0.001, decay: 0.12, gain: 0.07 });
    }

    // ----- Building blocks --------------------------------------------------------------------

    /**
     * Output for one sound: gain (for distance) and stereo pan towards `position`, or centred and
     * at full volume when there's no position (the tank's own sounds).
     */
    private createVoice(position: BABYLON.Vector3 | null, volume: number, length: number, isImpact = false): Voice | null {
        const output = this.getOutput();
        if (!output) {
            return null;
        }
        const { context, bus } = output;
        let pan = 0;
        if (position) {
            const dx = position.x - this.listener.x;
            const dz = position.z - this.listener.z;
            const distance = Math.hypot(dx, dz);
            const falloff = Math.pow(clamp(1 - (distance / HEARING_DISTANCE), 0, 1), 1.6);
            if (falloff <= 0.01) {
                return null;
            }
            volume *= falloff;
            pan = clamp(((dx * this.listenerRight.x) + (dz * this.listenerRight.z)) / 45, -0.75, 0.75);
        }

        const gain = context.createGain();
        gain.gain.value = volume;
        if (pan !== 0 && typeof context.createStereoPanner === "function") {
            const panner = context.createStereoPanner();
            panner.pan.value = pan;
            gain.connect(panner);
            panner.connect(bus);
        } else {
            gain.connect(bus);
        }

        if (isImpact) {
            this.activeImpacts++;
            setTimeout(() => {
                this.activeImpacts--;
            }, (length + 0.6) * 1000);
        }
        setTimeout(() => gain.disconnect(), (length + 1) * 1000);
        return { output: gain };
    }

    /** Limits how many impacts sound at once and how many start together (a collapsing wall). */
    private allowImpact(): boolean {
        const context = this.context;
        if (!context || this.activeImpacts >= MAX_IMPACT_VOICES) {
            return false;
        }
        const now = context.currentTime;
        if (now - this.burstStart > BURST_WINDOW_SECONDS) {
            this.burstStart = now;
            this.burstCount = 0;
        }
        return ++this.burstCount <= MAX_IMPACTS_PER_BURST;
    }

    /** An oscillator with a quick attack and exponential decay, optionally gliding in pitch. */
    private tone(voice: Voice, options: { type: OscillatorType; from: number; to?: number; glide?: number; attack: number; decay: number; gain: number; delay?: number }): void {
        const context = this.context;
        if (!context) {
            return;
        }
        const start = context.currentTime + (options.delay ?? 0);
        const oscillator = context.createOscillator();
        oscillator.type = options.type;
        oscillator.frequency.setValueAtTime(options.from, start);
        if (options.to !== undefined) {
            oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.to), start + (options.glide ?? options.decay));
        }
        const envelope = this.envelope(start, options.attack, options.decay, options.gain);
        oscillator.connect(envelope);
        envelope.connect(voice.output);
        oscillator.start(start);
        oscillator.stop(start + options.attack + options.decay + 0.05);
    }

    /** A burst of filtered white noise with a quick attack and exponential decay. */
    private noiseBurst(voice: Voice, options: { filter: BiquadFilterType; frequency: number; q: number; attack: number; decay: number; gain: number; delay?: number }): void {
        const context = this.context;
        if (!context || !this.noise) {
            return;
        }
        const start = context.currentTime + (options.delay ?? 0);
        const source = context.createBufferSource();
        source.buffer = this.noise;
        // Start somewhere random in the buffer so bursts don't repeat exactly.
        const offset = Math.random() * (this.noise.duration - 0.5);
        const filter = context.createBiquadFilter();
        filter.type = options.filter;
        filter.frequency.value = options.frequency * vary(0.1);
        filter.Q.value = options.q;
        const envelope = this.envelope(start, options.attack, options.decay, options.gain);
        source.connect(filter);
        filter.connect(envelope);
        envelope.connect(voice.output);
        source.start(start, offset);
        source.stop(start + options.attack + options.decay + 0.05);
    }

    private envelope(start: number, attack: number, decay: number, peak: number): GainNode {
        const gain = this.context!.createGain();
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
        return gain;
    }
}

/** A random factor around 1 (e.g. 0.1 gives 0.9 - 1.1). */
function vary(amount: number): number {
    return 1 + (((Math.random() * 2) - 1) * amount);
}
