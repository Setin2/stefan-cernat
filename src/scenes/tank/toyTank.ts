import * as BABYLON from "@babylonjs/core";

import { buildMesh, createRoundedBox, createTemplate, createToyMaterial, pushOrientedTriangle } from "../core/toyStyle";
import { clamp, getYaw } from "../core/math";

/**
 * A toy-style tank built entirely from code: rounded plastic hull and turret, rubber tracks with
 * moving cleats, spinning road wheels, an antenna that wobbles, a wind-up key on the back and a
 * recoiling barrel.
 *
 * The model is purely visual. It is parented to the physics holder ("tank_holder"), which keeps
 * doing all the movement and collision work, and it animates itself by watching how the holder
 * moves each frame.
 *
 * All dimensions below are in world units. The holder is a 12-unit cube centered 6 units above the
 * ground, so the model root is placed at the bottom of the holder and scaled by 1/12 to undo the
 * holder's scaling. Local +Z is forward.
 */

export type ToyTank = {
    /** Root node of the visual model (child of the physics holder). */
    root: BABYLON.TransformNode;
    /** Where shots should leave the barrel, relative to the holder's position. */
    muzzle: { forward: number; height: number };
    /** Plays the firing animation (recoil, muzzle flash, body kick). */
    fire: () => void;
};

const HOLDER_SIZE = 12;

// Track layout
const TRACK_X = 4.6;            // distance from the center line to the middle of each track
const TRACK_WIDTH = 2.6;
const TRACK_END_Z = 5;          // z of the front/rear wheel centers
const TRACK_CENTER_Y = 1.8;     // height of the front/rear wheel centers
const TRACK_RADIUS = 1.8;       // outer radius of the belt around the end wheels
const TRACK_THICKNESS = 0.35;
const CLEAT_COUNT = 30;
const ROAD_WHEEL_RADIUS = 1.15;
const ROAD_WHEEL_Z = [-3.6, -1.8, 0, 1.8, 3.6];
const END_WHEEL_RADIUS = 1.3;
const RETURN_ROLLER_RADIUS = 0.42;
const RETURN_ROLLER_Z = [-2.6, 2.6];

// The turret narrows towards the top (top is this fraction of the base width/depth).
const TURRET_TAPER = 0.85;

// Gun layout
const BARREL_Y = 6.9;
const BARREL_START_Z = 3.6;
const BARREL_LENGTH = 7.5;

// Slate blue body with sakura pink accents (pink comes from the cherry trees, blue is its
// complement), warm sand details and brass fittings.
const PALETTE = {
    body: "#4F6F8F",
    bodyDark: "#344B63",
    cream: "#E8DCC6",
    gold: "#C9A35B",
    accent: "#E8869F",
    rubber: "#2A2C30",
    cleat: "#45484E",
    lens: "#FFE7A8",
};

export function createToyTank(scene: BABYLON.Scene, holder: BABYLON.AbstractMesh): ToyTank {
    const materials = createMaterials(scene);
    const meshes: BABYLON.AbstractMesh[] = [];
    const track = <T extends BABYLON.AbstractMesh>(mesh: T): T => {
        meshes.push(mesh);
        return mesh;
    };

    const root = new BABYLON.TransformNode("toy-tank-root", scene);
    root.parent = holder;
    root.position.set(0, -0.5, 0);
    root.scaling.setAll(1 / HOLDER_SIZE);

    // Everything above the tracks sits on this node so it can sway on its "suspension".
    const body = new BABYLON.TransformNode("toy-tank-body", scene);
    body.parent = root;
    const bodyPivotY = 3.6;
    body.position.y = bodyPivotY;
    const bodyContent = new BABYLON.TransformNode("toy-tank-body-content", scene);
    bodyContent.parent = body;
    bodyContent.position.y = -bodyPivotY;

    // ---------------------------------------------------------------- Hull
    const lowerHull = track(createRoundedBox("toy-tank-lower-hull", 6.6, 2.4, 12.4, 0.55, scene, 4, 1.06));
    lowerHull.material = materials.bodyDark;
    lowerHull.parent = bodyContent;
    lowerHull.position.set(0, 2.5, 0);

    const deck = track(createRoundedBox("toy-tank-deck", 12.4, 1.2, 12.8, 0.5, scene, 4, 0.95));
    deck.material = materials.body;
    deck.parent = bodyContent;
    deck.position.set(0, 4.55, 0);

    const glacis = track(createRoundedBox("toy-tank-glacis", 6.4, 0.9, 3.0, 0.4, scene));
    glacis.material = materials.body;
    glacis.parent = bodyContent;
    glacis.position.set(0, 3.25, 6.0);
    glacis.rotation.x = 0.55;

    // Rivets along the fenders for that snap-together toy look.
    const rivetTemplate = createTemplate(BABYLON.MeshBuilder.CreateSphere("toy-tank-rivet", { diameter: 0.38, segments: 8 }, scene), materials.cream);
    [-1, 1].forEach((side) => {
        for (let i = 0; i < 6; i++) {
            const rivet = track(rivetTemplate.createInstance(`toy-tank-rivet-${side}-${i}`));
            rivet.parent = bodyContent;
            rivet.position.set(side * 6.2, 4.55, -5 + i * 2);
        }
    });

    // Headlights
    [-1, 1].forEach((side) => {
        const housing = track(BABYLON.MeshBuilder.CreateCylinder(`toy-tank-headlight-${side}`, { diameter: 1.1, height: 0.7, tessellation: 20 }, scene));
        housing.material = materials.cream;
        housing.parent = bodyContent;
        housing.rotation.x = Math.PI / 2;
        housing.position.set(side * 4.3, 5.55, 5.7);

        const lens = track(BABYLON.MeshBuilder.CreateCylinder(`toy-tank-headlight-lens-${side}`, { diameter: 0.8, height: 0.12, tessellation: 20 }, scene));
        lens.material = materials.lens;
        lens.parent = bodyContent;
        lens.rotation.x = Math.PI / 2;
        lens.position.set(side * 4.3, 5.55, 6.07);
    });

    // Exhaust pipes
    [-1, 1].forEach((side) => {
        const pipe = track(BABYLON.MeshBuilder.CreateCylinder(`toy-tank-exhaust-${side}`, { diameter: 0.7, height: 1.6, tessellation: 16 }, scene));
        pipe.material = materials.gold;
        pipe.parent = bodyContent;
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(side * 3.2, 5.35, -6.3);
    });

    // Wind-up key on the back: the signature toy detail. It turns as the tank drives.
    const windUpKey = new BABYLON.TransformNode("toy-tank-key", scene);
    windUpKey.parent = bodyContent;
    windUpKey.position.set(0, 3.0, -6.2);
    const keyShaft = track(BABYLON.MeshBuilder.CreateCylinder("toy-tank-key-shaft", { diameter: 0.45, height: 1.6, tessellation: 12 }, scene));
    keyShaft.material = materials.gold;
    keyShaft.parent = windUpKey;
    keyShaft.rotation.x = Math.PI / 2;
    keyShaft.position.z = -0.6;
    [-1, 1].forEach((side) => {
        const wing = track(BABYLON.MeshBuilder.CreateCylinder(`toy-tank-key-wing-${side}`, { diameter: 1.7, height: 0.32, tessellation: 24 }, scene));
        // Flat discs lying in the plane of the shaft, like the bow of a real wind-up key.
        wing.material = materials.gold;
        wing.parent = windUpKey;
        wing.position.set(side * 0.95, 0, -1.45);
    });

    // ---------------------------------------------------------------- Turret
    const turret = new BABYLON.TransformNode("toy-tank-turret", scene);
    turret.parent = bodyContent;
    turret.position.set(0, 5.15, -0.6);

    const turretRing = track(BABYLON.MeshBuilder.CreateCylinder("toy-tank-turret-ring", { diameter: 6.4, height: 0.5, tessellation: 40 }, scene));
    turretRing.material = materials.cream;
    turretRing.parent = turret;
    turretRing.position.y = 0.25;

    const turretShell = track(createRoundedBox("toy-tank-turret-shell", 6.8, 2.6, 7.2, 0.75, scene, 5, TURRET_TAPER));
    turretShell.material = materials.body;
    turretShell.parent = turret;
    turretShell.position.y = 1.8;

    const cupola = track(BABYLON.MeshBuilder.CreateCylinder("toy-tank-cupola", { diameter: 2.4, height: 0.6, tessellation: 32 }, scene));
    cupola.material = materials.bodyDark;
    cupola.parent = turret;
    cupola.position.set(-1.4, 3.35, -1.4);

    const hatch = track(BABYLON.MeshBuilder.CreateSphere("toy-tank-hatch", { diameter: 2.1, segments: 20, slice: 0.5 }, scene));
    hatch.material = materials.cream;
    hatch.parent = turret;
    hatch.scaling.y = 0.55;
    hatch.position.set(-1.4, 3.6, -1.4);

    const periscope = track(createRoundedBox("toy-tank-periscope", 1.2, 0.7, 0.9, 0.2, scene));
    periscope.material = materials.cream;
    periscope.parent = turret;
    periscope.position.set(1.6, 3.3, 1.2);

    // Star decals on both turret sides
    const decalMaterial = createStarDecalMaterial(scene);
    [-1, 1].forEach((side) => {
        const decal = BABYLON.MeshBuilder.CreatePlane(`toy-star-decal-${side}`, { size: 1.7 }, scene);
        decal.material = decalMaterial;
        decal.parent = turret;
        // Sit on the sloped turret side: at mid-height the side is at 3.4 * (1 + TURRET_TAPER) / 2.
        const sideSlope = Math.atan((3.4 * (1 - TURRET_TAPER)) / 2.6);
        decal.position.set(side * ((3.4 * (1 + TURRET_TAPER) / 2) + 0.03), 1.8, -0.4);
        decal.rotation.y = -side * Math.PI / 2;
        decal.rotation.x = sideSlope;
        decal.isPickable = false;
    });

    // Antenna (wobbles on a spring)
    const antenna = new BABYLON.TransformNode("toy-tank-antenna", scene);
    antenna.parent = turret;
    antenna.position.set(1.9, 3.05, -2.2);
    const antennaBase = track(BABYLON.MeshBuilder.CreateCylinder("toy-tank-antenna-base", { diameter: 0.6, height: 0.4, tessellation: 12 }, scene));
    antennaBase.material = materials.bodyDark;
    antennaBase.parent = antenna;
    const antennaRod = track(BABYLON.MeshBuilder.CreateCylinder("toy-tank-antenna-rod", { diameterTop: 0.1, diameterBottom: 0.18, height: 4.2, tessellation: 8 }, scene));
    antennaRod.material = materials.rubber;
    antennaRod.parent = antenna;
    antennaRod.position.y = 2.1;
    const antennaTip = track(BABYLON.MeshBuilder.CreateSphere("toy-tank-antenna-tip", { diameter: 0.55, segments: 12 }, scene));
    antennaTip.material = materials.accent;
    antennaTip.parent = antenna;
    antennaTip.position.y = 4.25;

    // ---------------------------------------------------------------- Gun
    const mantlet = track(createRoundedBox("toy-tank-mantlet", 3.4, 2.0, 1.4, 0.55, scene, 4, 0.88));
    mantlet.material = materials.bodyDark;
    mantlet.parent = turret;
    mantlet.position.set(0, BARREL_Y - turret.position.y, BARREL_START_Z - turret.position.z - 0.3);

    // The barrel slides back on this node when firing.
    const barrel = new BABYLON.TransformNode("toy-tank-barrel", scene);
    barrel.parent = turret;
    barrel.position.set(0, BARREL_Y - turret.position.y, BARREL_START_Z - turret.position.z);

    const barrelTube = track(BABYLON.MeshBuilder.CreateCylinder("toy-tank-barrel-tube", { diameter: 0.9, height: BARREL_LENGTH, tessellation: 24 }, scene));
    barrelTube.material = materials.body;
    barrelTube.parent = barrel;
    barrelTube.rotation.x = Math.PI / 2;
    barrelTube.position.z = BARREL_LENGTH / 2;

    const barrelCollar = track(BABYLON.MeshBuilder.CreateCylinder("toy-tank-barrel-collar", { diameter: 1.2, height: 0.6, tessellation: 24 }, scene));
    barrelCollar.material = materials.cream;
    barrelCollar.parent = barrel;
    barrelCollar.rotation.x = Math.PI / 2;
    barrelCollar.position.z = 1.2;

    const muzzleBrake = track(BABYLON.MeshBuilder.CreateCylinder("toy-tank-muzzle", { diameter: 1.35, height: 1.2, tessellation: 24 }, scene));
    muzzleBrake.material = materials.gold;
    muzzleBrake.parent = barrel;
    muzzleBrake.rotation.x = Math.PI / 2;
    muzzleBrake.position.z = BARREL_LENGTH - 0.5;

    const muzzleFlash = BABYLON.MeshBuilder.CreateSphere("toy-tank-muzzle-flash", { diameter: 1.6, segments: 12 }, scene);
    muzzleFlash.material = materials.flash;
    muzzleFlash.parent = barrel;
    muzzleFlash.position.z = BARREL_LENGTH + 0.5;
    muzzleFlash.isVisible = false;
    muzzleFlash.isPickable = false;

    // ---------------------------------------------------------------- Tracks and wheels
    const wheelSpinners: { node: BABYLON.TransformNode; radius: number; side: number }[] = [];
    const cleatSides: { side: number; cleats: BABYLON.InstancedMesh[] }[] = [];

    const roadWheel = createWheelTemplates(scene, "road", ROAD_WHEEL_RADIUS, 2.0, materials);
    const endWheel = createWheelTemplates(scene, "end", END_WHEEL_RADIUS, 2.2, materials);
    const roller = createWheelTemplates(scene, "roller", RETURN_ROLLER_RADIUS, 1.6, materials);
    const cleatTemplate = createTemplate(createRoundedBox("toy-tank-cleat", TRACK_WIDTH + 0.2, 0.26, 0.5, 0.1, scene, 2), materials.cleat);

    [-1, 1].forEach((side) => {
        const trackGroup = new BABYLON.TransformNode(`toy-tank-track-${side}`, scene);
        trackGroup.parent = root;
        trackGroup.position.x = side * TRACK_X;

        const belt = track(createTrackBelt(`toy-tank-belt-${side}`, scene));
        belt.material = materials.rubber;
        belt.parent = trackGroup;

        const addWheel = (templates: WheelTemplates, radius: number, y: number, z: number, index: string) => {
            const spinner = new BABYLON.TransformNode(`toy-tank-wheel-${side}-${index}`, scene);
            spinner.parent = trackGroup;
            spinner.position.set(0, y, z);

            const wheelBody = track(templates.body.createInstance(`toy-tank-wheel-body-${side}-${index}`));
            wheelBody.parent = spinner;

            const hub = track(templates.hub.createInstance(`toy-tank-wheel-hub-${side}-${index}`));
            hub.parent = spinner;
            if (side < 0) {
                hub.rotation.y = Math.PI;
            }

            wheelSpinners.push({ node: spinner, radius, side });
        };

        const innerBottom = TRACK_CENTER_Y - TRACK_RADIUS + TRACK_THICKNESS;
        ROAD_WHEEL_Z.forEach((z, i) => addWheel(roadWheel, ROAD_WHEEL_RADIUS, innerBottom + ROAD_WHEEL_RADIUS, z, `road${i}`));
        addWheel(endWheel, END_WHEEL_RADIUS, TRACK_CENTER_Y, TRACK_END_Z, "front");
        addWheel(endWheel, END_WHEEL_RADIUS, TRACK_CENTER_Y, -TRACK_END_Z, "rear");
        const innerTop = TRACK_CENTER_Y + TRACK_RADIUS - TRACK_THICKNESS;
        RETURN_ROLLER_Z.forEach((z, i) => addWheel(roller, RETURN_ROLLER_RADIUS, innerTop - RETURN_ROLLER_RADIUS, z, `roller${i}`));

        const cleats: BABYLON.InstancedMesh[] = [];
        for (let i = 0; i < CLEAT_COUNT; i++) {
            const cleat = track(cleatTemplate.createInstance(`toy-tank-cleat-${side}-${i}`));
            cleat.parent = trackGroup;
            cleats.push(cleat);
        }
        cleatSides.push({ side, cleats });
    });

    meshes.forEach((mesh) => {
        mesh.isPickable = false;
    });

    // ---------------------------------------------------------------- Animation
    const cleatRadius = TRACK_RADIUS + 0.06;
    const cleatPerimeter = (4 * TRACK_END_Z) + (2 * Math.PI * cleatRadius);
    const cleatSpacing = cleatPerimeter / CLEAT_COUNT;
    const trackOffsets = new Map<number, number>([[-1, 0], [1, 0]]);
    const wheelAngles = new Map<BABYLON.TransformNode, number>();

    const placeCleats = () => {
        for (const { side, cleats } of cleatSides) {
            const offset = trackOffsets.get(side) ?? 0;
            cleats.forEach((cleat, i) => {
                setCleatPose(cleat, (i * cleatSpacing) + offset, cleatRadius, cleatPerimeter);
            });
        }
    };
    placeCleats();

    const previousPosition = holder.position.clone();
    let previousYaw = getYaw(holder);
    let previousSpeed = 0;
    let travelled = 0;
    let keyAngle = 0;
    const sway = { pitch: 0, pitchVelocity: 0, roll: 0, rollVelocity: 0 };
    const antennaSway = { x: 0, xVelocity: 0, z: 0, zVelocity: 0 };
    let recoil = 0;
    let flashTime = 0;

    const forwardVector = BABYLON.Vector3.Zero();
    const movement = BABYLON.Vector3.Zero();

    scene.onBeforeRenderObservable.add(() => {
        const deltaSeconds = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
        if (deltaSeconds <= 0) {
            return;
        }

        // How the holder actually moved this frame (after physics), so the wheels match reality,
        // including when the tank is blocked or pushed.
        const yaw = getYaw(holder);
        forwardVector.set(Math.sin(yaw), 0, Math.cos(yaw));
        holder.position.subtractToRef(previousPosition, movement);
        movement.y = 0;
        previousPosition.copyFrom(holder.position);

        const speed = BABYLON.Vector3.Dot(movement, forwardVector) / deltaSeconds;
        const yawRate = wrapAngle(yaw - previousYaw) / deltaSeconds;
        previousYaw = yaw;
        const acceleration = (speed - previousSpeed) / deltaSeconds;
        previousSpeed = speed;

        // Turning right speeds up the left track and slows the right one.
        for (const side of [-1, 1]) {
            const trackSpeed = speed - (side * yawRate * TRACK_X);
            trackOffsets.set(side, (trackOffsets.get(side) ?? 0) + (trackSpeed * deltaSeconds));
        }
        placeCleats();

        for (const wheel of wheelSpinners) {
            const trackSpeed = speed - (wheel.side * yawRate * TRACK_X);
            const angle = (wheelAngles.get(wheel.node) ?? 0) + ((trackSpeed / wheel.radius) * deltaSeconds);
            wheelAngles.set(wheel.node, angle);
            wheel.node.rotation.x = angle;
        }

        // Suspension: the nose lifts when accelerating, dips when braking, and the body leans
        // out of turns. Slightly under-damped so it settles with a little bounce.
        const clampedAcceleration = clamp(acceleration, -80, 80);
        const pitchTarget = clamp(-clampedAcceleration * 0.0011, -0.06, 0.06);
        const rollTarget = clamp(speed * yawRate * 0.0022, -0.05, 0.05);
        stepSpring(sway, "pitch", "pitchVelocity", pitchTarget, 140, 9, deltaSeconds);
        stepSpring(sway, "roll", "rollVelocity", rollTarget, 140, 9, deltaSeconds);
        body.rotation.x = sway.pitch;
        body.rotation.z = sway.roll;

        // A tiny rattle while driving, like a plastic toy on a hard floor.
        travelled += Math.abs(speed) * deltaSeconds;
        const rattle = Math.min(1, Math.abs(speed) / 10) * 0.06;
        body.position.y = bodyPivotY + (Math.sin(travelled * 1.7) * rattle);

        // Antenna whips back when accelerating and swings out in turns.
        stepSpring(antennaSway, "x", "xVelocity", clamp(-clampedAcceleration * 0.004, -0.3, 0.3), 70, 2.2, deltaSeconds);
        stepSpring(antennaSway, "z", "zVelocity", clamp(speed * yawRate * 0.01, -0.25, 0.25), 70, 2.2, deltaSeconds);
        antenna.rotation.x = antennaSway.x;
        antenna.rotation.z = antennaSway.z;

        keyAngle += speed * 0.12 * deltaSeconds;
        windUpKey.rotation.z = keyAngle;

        recoil *= Math.exp(-9 * deltaSeconds);
        barrel.position.z = BARREL_START_Z - turret.position.z - recoil;

        if (flashTime > 0) {
            flashTime -= deltaSeconds;
            const progress = 1 - Math.max(0, flashTime) / 0.09;
            muzzleFlash.isVisible = flashTime > 0;
            muzzleFlash.scaling.setAll(0.6 + progress * 0.9);
        }
    });

    const muzzleHeight = (root.position.y * HOLDER_SIZE) + BARREL_Y;
    return {
        root,
        muzzle: { forward: BARREL_START_Z + BARREL_LENGTH + 0.4, height: muzzleHeight },
        fire: () => {
            recoil = 1.0;
            flashTime = 0.09;
            muzzleFlash.isVisible = true;
            muzzleFlash.scaling.setAll(0.6);
            sway.pitchVelocity -= 0.9;
            antennaSway.xVelocity -= 2.5;
        },
    };
}

// ==================================================================== Helpers

type WheelTemplates = { body: BABYLON.Mesh; hub: BABYLON.Mesh };

type Materials = ReturnType<typeof createMaterials>;

function createMaterials(scene: BABYLON.Scene) {
    const plastic = (name: string, hex: string, roughness: number, metallic = 0, clearCoat = 0) =>
        createToyMaterial(scene, `toy-tank-${name}`, hex, { roughness, metallic, clearCoat });

    const lens = plastic("lens", PALETTE.lens, 0.2);
    lens.emissiveColor = BABYLON.Color3.FromHexString(PALETTE.lens).toLinearSpace().scale(0.9);

    const flash = new BABYLON.StandardMaterial("toy-tank-flash", scene);
    flash.disableLighting = true;
    flash.emissiveColor = BABYLON.Color3.FromHexString("#FFD27A");
    flash.alpha = 0.85;

    return {
        body: plastic("body", PALETTE.body, 0.5, 0, 0.55),
        bodyDark: plastic("body-dark", PALETTE.bodyDark, 0.55, 0, 0.4),
        cream: plastic("cream", PALETTE.cream, 0.55, 0, 0.35),
        gold: plastic("gold", PALETTE.gold, 0.32, 0.65, 0.3),
        accent: plastic("accent", PALETTE.accent, 0.45, 0, 0.5),
        rubber: plastic("rubber", PALETTE.rubber, 0.85),
        cleat: plastic("cleat", PALETTE.cleat, 0.75),
        lens,
        flash,
    };
}

/**
 * Wheel templates with their axle along X: a cream wheel body, and a gold hub cap with bolts on
 * the +X face (left-side wheels turn the hub around so it faces outward).
 */
function createWheelTemplates(scene: BABYLON.Scene, name: string, radius: number, width: number, materials: Materials): WheelTemplates {
    const axleAlongX = BABYLON.Matrix.RotationZ(Math.PI / 2);

    const tire = BABYLON.MeshBuilder.CreateCylinder(`toy-tank-${name}-tire`, { diameter: radius * 2, height: width, tessellation: 28 }, scene);
    const rim = BABYLON.MeshBuilder.CreateCylinder(`toy-tank-${name}-rim`, { diameter: radius * 1.35, height: width + 0.14, tessellation: 28 }, scene);
    const body = BABYLON.Mesh.MergeMeshes([tire, rim], true, true);
    if (!body) {
        throw new Error("Failed to build toy tank wheel");
    }
    body.bakeTransformIntoVertices(axleAlongX);
    body.name = `toy-tank-${name}-wheel`;
    createTemplate(body, materials.cream);

    const hubParts: BABYLON.Mesh[] = [];
    const cap = BABYLON.MeshBuilder.CreateCylinder(`toy-tank-${name}-cap`, { diameter: radius * 0.75, height: 0.2, tessellation: 20 }, scene);
    cap.position.y = (width / 2) + 0.12;
    hubParts.push(cap);
    const boltCount = 5;
    for (let i = 0; i < boltCount; i++) {
        const angle = (i / boltCount) * Math.PI * 2;
        const bolt = BABYLON.MeshBuilder.CreateSphere(`toy-tank-${name}-bolt-${i}`, { diameter: radius * 0.18, segments: 6 }, scene);
        bolt.position.set(Math.cos(angle) * radius * 0.5, (width / 2) + 0.1, Math.sin(angle) * radius * 0.5);
        hubParts.push(bolt);
    }
    const hub = BABYLON.Mesh.MergeMeshes(hubParts, true, true);
    if (!hub) {
        throw new Error("Failed to build toy tank wheel hub");
    }
    // Cylinder axis is Y; rotating -90° around Z points the +Y face toward +X.
    hub.bakeTransformIntoVertices(BABYLON.Matrix.RotationZ(-Math.PI / 2));
    hub.name = `toy-tank-${name}-hub`;
    createTemplate(hub, materials.gold);

    return { body, hub };
}

/**
 * Places one track cleat on the belt loop. Distance 0 is the front of the bottom run; distance
 * grows backwards along the bottom, up the rear, forwards along the top and down the front, which
 * is the direction the belt moves (relative to the tank) when driving forward.
 */
function setCleatPose(cleat: BABYLON.InstancedMesh, distance: number, radius: number, perimeter: number): void {
    let s = ((distance % perimeter) + perimeter) % perimeter;
    const straight = 2 * TRACK_END_Z;
    const arc = Math.PI * radius;
    let y: number;
    let z: number;
    let normalY: number;
    let normalZ: number;

    if (s < straight) {
        z = TRACK_END_Z - s;
        y = TRACK_CENTER_Y - radius;
        normalY = -1;
        normalZ = 0;
    } else if ((s -= straight) < arc) {
        const theta = s / radius;
        normalY = -Math.cos(theta);
        normalZ = -Math.sin(theta);
        z = -TRACK_END_Z + (normalZ * radius);
        y = TRACK_CENTER_Y + (normalY * radius);
    } else if ((s -= arc) < straight) {
        z = -TRACK_END_Z + s;
        y = TRACK_CENTER_Y + radius;
        normalY = 1;
        normalZ = 0;
    } else {
        s -= straight;
        const theta = s / radius;
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
function createTrackBelt(name: string, scene: BABYLON.Scene): BABYLON.Mesh {
    const midRadius = TRACK_RADIUS - (TRACK_THICKNESS / 2);
    const loop: { y: number; z: number; ny: number; nz: number }[] = [];
    const straightSteps = 6;
    const arcSteps = 20;

    for (let i = 0; i < straightSteps; i++) {
        const t = i / straightSteps;
        loop.push({ z: TRACK_END_Z - (2 * TRACK_END_Z * t), y: TRACK_CENTER_Y - midRadius, ny: -1, nz: 0 });
    }
    for (let i = 0; i < arcSteps; i++) {
        const theta = (i / arcSteps) * Math.PI;
        const ny = -Math.cos(theta);
        const nz = -Math.sin(theta);
        loop.push({ z: -TRACK_END_Z + (nz * midRadius), y: TRACK_CENTER_Y + (ny * midRadius), ny, nz });
    }
    for (let i = 0; i < straightSteps; i++) {
        const t = i / straightSteps;
        loop.push({ z: -TRACK_END_Z + (2 * TRACK_END_Z * t), y: TRACK_CENTER_Y + midRadius, ny: 1, nz: 0 });
    }
    for (let i = 0; i < arcSteps; i++) {
        const theta = (i / arcSteps) * Math.PI;
        const ny = Math.cos(theta);
        const nz = Math.sin(theta);
        loop.push({ z: TRACK_END_Z + (nz * midRadius), y: TRACK_CENTER_Y + (ny * midRadius), ny, nz });
    }

    const w = TRACK_WIDTH / 2;
    const t = TRACK_THICKNESS / 2;
    const b = 0.08;
    // Profile points: x offset, radial offset (outward), and the normal in (x, radial).
    const profile: [number, number, number, number][] = [
        [-w + b, t, -0.3, 1], [w - b, t, 0.3, 1], [w, t - b, 1, 0.3], [w, -t + b, 1, -0.3],
        [w - b, -t, 0.3, -1], [-w + b, -t, -0.3, -1], [-w, -t + b, -1, -0.3], [-w, t - b, -1, 0.3],
    ];

    const positions: number[] = [];
    const normals: number[] = [];
    for (const point of loop) {
        for (const [px, pr, nx, nr] of profile) {
            positions.push(px, point.y + (point.ny * pr), point.z + (point.nz * pr));
            const length = Math.hypot(nx, nr);
            normals.push(nx / length, (point.ny * nr) / length, (point.nz * nr) / length);
        }
    }

    const indices: number[] = [];
    const profileCount = profile.length;
    for (let i = 0; i < loop.length; i++) {
        const nextI = (i + 1) % loop.length;
        for (let j = 0; j < profileCount; j++) {
            const nextJ = (j + 1) % profileCount;
            const a = (i * profileCount) + j;
            const bIndex = (nextI * profileCount) + j;
            const c = (nextI * profileCount) + nextJ;
            const d = (i * profileCount) + nextJ;
            pushOrientedTriangle(indices, positions, normals, a, bIndex, c);
            pushOrientedTriangle(indices, positions, normals, a, c, d);
        }
    }

    return buildMesh(name, positions, normals, indices, scene);
}

/** Sand roundel with a sakura-pink star, drawn once into a small texture. */
function createStarDecalMaterial(scene: BABYLON.Scene): BABYLON.StandardMaterial {
    const size = 256;
    const texture = new BABYLON.DynamicTexture("toy-star-decal-texture", { width: size, height: size }, scene, true);
    texture.hasAlpha = true;
    const context = texture.getContext() as CanvasRenderingContext2D;
    const center = size / 2;

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
    for (let i = 0; i < 10; i++) {
        const angle = (-Math.PI / 2) + (i * Math.PI / 5);
        const pointRadius = i % 2 === 0 ? size * 0.38 : size * 0.16;
        const x = center + (Math.cos(angle) * pointRadius);
        const y = center + (Math.sin(angle) * pointRadius);
        if (i === 0) {
            context.moveTo(x, y);
        } else {
            context.lineTo(x, y);
        }
    }
    context.closePath();
    context.fill();
    context.stroke();
    texture.update();

    const material = new BABYLON.StandardMaterial("toy-star-decal", scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.emissiveColor = new BABYLON.Color3(0.25, 0.22, 0.2);
    material.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);
    material.zOffset = -2;
    return material;
}

function stepSpring<T extends Record<string, number>>(state: T, valueKey: keyof T, velocityKey: keyof T, target: number, stiffness: number, damping: number, deltaSeconds: number): void {
    const value = state[valueKey];
    const velocity = state[velocityKey] + (((stiffness * (target - value)) - (damping * state[velocityKey])) * deltaSeconds);
    state[velocityKey] = velocity as T[keyof T];
    state[valueKey] = (value + (velocity * deltaSeconds)) as T[keyof T];
}

function wrapAngle(angle: number): number {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
}
