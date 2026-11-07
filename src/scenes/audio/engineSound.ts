import { clamp } from "../core/math";
import type { SoundBoard } from "./soundBoard";

/**
 * The tank's motor: a little "putt-putt" toy engine (two detuned low oscillators, muffled and
 * pulsed) plus the rattle of the treads (filtered noise pulsing with the track cleats). Both
 * follow how fast the tank drives and turns, and fade out when it stops. It plays quietly in the
 * background, on the ambience channel that dips whenever a hit or shot plays (see SoundBoard).
 */

const MAX_SPEED = 38;
const MAX_TURN_SPEED = 4.2;
const VOLUME = 0.055;

export type EngineSound = {
    /** Call every frame with the tank's forward speed and turn rate. */
    update: (forwardSpeed: number, turnSpeed: number, airborne: boolean) => void;
};

export function createEngineSound(sounds: SoundBoard): EngineSound {
    let nodes: ReturnType<typeof buildEngine> | null = null;
    sounds.whenReady(() => {
        const output = sounds.getOutput();
        if (output) {
            nodes = buildEngine(output.context, output.ambience, output.noise);
        }
    });

    let level = 0;
    return {
        update(forwardSpeed, turnSpeed, airborne) {
            if (!nodes) {
                return;
            }
            const drive = Math.abs(forwardSpeed) / MAX_SPEED;
            const turn = Math.abs(turnSpeed) / MAX_TURN_SPEED;
            const target = clamp(Math.max(drive, turn * 0.55), 0, 1);
            // Rev up quickly, wind down a little slower.
            level += (target - level) * (target > level ? 0.12 : 0.06);

            const time = nodes.context.currentTime;
            const rev = level + (airborne ? 0.25 : 0);
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

function buildEngine(context: AudioContext, bus: AudioNode, noise: AudioBuffer) {
    const output = context.createGain();
    output.gain.value = 0;
    output.connect(bus);

    // Motor: two detuned oscillators, low-passed and pulsed by an LFO ("putt-putt").
    const muffle = context.createBiquadFilter();
    muffle.type = "lowpass";
    muffle.Q.value = 0.9;
    const motor = context.createGain();
    motor.gain.value = 0.55;
    muffle.connect(motor);
    motor.connect(output);

    const low = context.createOscillator();
    low.type = "sawtooth";
    const high = context.createOscillator();
    high.type = "square";
    const highGain = context.createGain();
    highGain.gain.value = 0.22;
    low.connect(muffle);
    high.connect(highGain);
    highGain.connect(muffle);

    const pulse = context.createOscillator();
    pulse.type = "sine";
    const pulseDepth = context.createGain();
    pulseDepth.gain.value = 0.4;
    pulse.connect(pulseDepth);
    pulseDepth.connect(motor.gain);

    // Treads: band-passed noise, pulsed at the rate the cleats pass.
    const tread = context.createBufferSource();
    tread.buffer = noise;
    tread.loop = true;
    const treadFilter = context.createBiquadFilter();
    treadFilter.type = "bandpass";
    treadFilter.frequency.value = 1100;
    treadFilter.Q.value = 0.9;
    const treadGain = context.createGain();
    treadGain.gain.value = 0;
    const treadPulse = context.createGain();
    treadPulse.gain.value = 0.5;
    const cleats = context.createOscillator();
    cleats.type = "square";
    const cleatDepth = context.createGain();
    cleatDepth.gain.value = 0.45;
    tread.connect(treadFilter);
    treadFilter.connect(treadPulse);
    treadPulse.connect(treadGain);
    treadGain.connect(output);
    cleats.connect(cleatDepth);
    cleatDepth.connect(treadPulse.gain);

    [low, high, pulse, cleats].forEach((oscillator) => oscillator.start());
    tread.start();
    return { context, output, low, high, pulse, muffle, treadGain, cleats };
}
