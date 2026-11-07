import type * as BABYLON from "@babylonjs/core";

import { clamp } from "../core/math";
import { getPlaygroundHeight } from "../world/playground";

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
const FOOTPRINT_X = [-5.9, 0, 5.9];
const FOOTPRINT_Z = Array.from({ length: 19 }, (_, i) => -6.3 + (i * 0.7));
const FOOTPRINT = FOOTPRINT_X.flatMap((x) => FOOTPRINT_Z.map((z) => {
    const overhang = Math.max(0, Math.abs(z) - 5);
    return { x, z, lift: 1.8 - Math.sqrt((1.8 * 1.8) - (overhang * overhang)) };
}));
const SUM_X2 = FOOTPRINT.reduce((sum, p) => sum + (p.x * p.x), 0);
const SUM_Z2 = FOOTPRINT.reduce((sum, p) => sum + (p.z * p.z), 0);
/** How far ahead of the centre the front (or back) of the tracks reaches, for the wall check. */
const LEAD_Z = 7;

const GRAVITY = 60;
const MAX_LAUNCH_SPEED = 22;
/** Steeper steps than this (the back of a ramp, a platform's side) are walls. */
const MAX_CLIMB_STEP = 1.2;
const MAX_TILT = 0.5;
/** How quickly the model's tilt follows the surface (per second). */
const GROUNDED_TILT_RATE = 14;
const AIR_PITCH_RATE = 6;
const AIR_ROLL_RATE = 3;

export type GroundContact = {
    /** Moves the tank vertically and tilts the model; call once per physics frame. */
    update: (deltaSeconds: number, yaw: number, forwardSpeed: number) => void;
    /**
     * Whether the tank at (x, z) heading `yaw` would drive into a wall, moving forwards
     * (direction 1) or backwards (-1).
     */
    isBlocked: (x: number, z: number, yaw: number, direction: 1 | -1) => boolean;
    /** Whether the tank is in the air (off a ramp, or falling off an edge). */
    isAirborne: () => boolean;
};

export function createGroundContact(
    tank: BABYLON.AbstractMesh,
    model: BABYLON.TransformNode | null,
    /** Called when the tank lands after being in the air, with how fast it was falling. */
    onLand?: (fallSpeed: number) => void,
): GroundContact {
    const baseY = tank.position.y;
    const heights = new Array<number>(FOOTPRINT.length).fill(0);
    let elevation = 0;
    let verticalSpeed = 0;
    let grounded = true;
    let pitch = 0;
    let roll = 0;

    const sampleFootprint = (x: number, z: number, sin: number, cos: number) => {
        // Babylon is left-handed: local +z is (sin, cos) and local +x is (cos, -sin) in world x/z.
        FOOTPRINT.forEach((p, i) => {
            heights[i] = getPlaygroundHeight(x + (p.x * cos) + (p.z * sin), z - (p.x * sin) + (p.z * cos));
        });
    };

    /** Height of the tank's centre at which its lowest point, tilted as now, touches the surface. */
    const supportHeight = () => {
        const tanPitch = Math.tan(pitch);
        const tanRoll = Math.tan(roll);
        let support = 0;
        FOOTPRINT.forEach((p, i) => {
            support = Math.max(support, heights[i] - (p.z * tanPitch) - (p.x * tanRoll) - p.lift);
        });
        return support;
    };

    const update = (deltaSeconds: number, yaw: number, forwardSpeed: number) => {
        if (deltaSeconds <= 0) {
            return;
        }
        const sin = Math.sin(yaw);
        const cos = Math.cos(yaw);
        const position = tank.position;
        sampleFootprint(position.x, position.z, sin, cos);

        // Tilt: on the ground, towards the plane that best fits the surface under the tracks; in
        // the air, the nose follows the flight path and the roll levels out.
        if (grounded) {
            let slopeZ = 0;
            let slopeX = 0;
            FOOTPRINT.forEach((p, i) => {
                slopeZ += p.z * heights[i];
                slopeX += p.x * heights[i];
            });
            const rate = Math.min(1, deltaSeconds * GROUNDED_TILT_RATE);
            pitch += (clamp(Math.atan(slopeZ / SUM_Z2), -MAX_TILT, MAX_TILT) - pitch) * rate;
            roll += (clamp(Math.atan(slopeX / SUM_X2), -MAX_TILT, MAX_TILT) - roll) * rate;
        } else {
            const flightPitch = Math.atan2(verticalSpeed, Math.max(Math.abs(forwardSpeed), 12)) * 0.8;
            pitch += (clamp(flightPitch, -0.45, 0.45) - pitch) * Math.min(1, deltaSeconds * AIR_PITCH_RATE);
            roll -= roll * Math.min(1, deltaSeconds * AIR_ROLL_RATE);
        }

        const support = supportHeight();
        verticalSpeed -= GRAVITY * deltaSeconds;
        const next = elevation + (verticalSpeed * deltaSeconds);
        if (next <= support) {
            // On the surface: move with it, keeping the speed it gives (so the lip of a ramp launches
            // the tank and it stays glued to a downhill slope). A landing never pushes it back up.
            const surfaceSpeed = (support - elevation) / deltaSeconds;
            if (!grounded) {
                onLand?.(-verticalSpeed);
            }
            verticalSpeed = grounded ? Math.min(MAX_LAUNCH_SPEED, surfaceSpeed) : Math.min(0, surfaceSpeed);
            elevation = support;
            grounded = true;
        } else {
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

    const isBlocked = (x: number, z: number, yaw: number, direction: 1 | -1) => {
        const sin = Math.sin(yaw);
        const cos = Math.cos(yaw);
        const lead = LEAD_Z * direction;
        const leadBottom = elevation + (lead * Math.tan(pitch));
        for (const across of FOOTPRINT_X) {
            const leadX = x + (across * cos) + (lead * sin);
            const leadZ = z - (across * sin) + (lead * cos);
            const ahead = getPlaygroundHeight(leadX, leadZ);
            // A sudden step (not a slope) that rises clearly above the bottom of the tracks.
            const behind = getPlaygroundHeight(leadX - (1.5 * direction * sin), leadZ - (1.5 * direction * cos));
            if (ahead - behind > MAX_CLIMB_STEP && ahead - leadBottom > MAX_CLIMB_STEP) {
                return true;
            }
        }
        return false;
    };

    return { update, isBlocked, isAirborne: () => !grounded };
}
