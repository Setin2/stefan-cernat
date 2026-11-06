import * as BABYLON from "@babylonjs/core";

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

const PALETTE = {
    body: "#F67FAA",
    bodyDark: "#D9568A",
    cream: "#FFF4E2",
    gold: "#F7B955",
    rubber: "#2E2B33",
    cleat: "#4A4652",
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
    antennaTip.material = materials.gold;
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
    const environment = createToyEnvironment(scene);

    const plastic = (name: string, hex: string, roughness: number, metallic = 0, clearCoat = 0) => {
        const material = new BABYLON.PBRMaterial(`toy-tank-${name}`, scene);
        material.albedoColor = BABYLON.Color3.FromHexString(hex).toLinearSpace();
        material.metallic = metallic;
        material.roughness = roughness;
        material.reflectionTexture = environment;
        material.environmentIntensity = 0.6;
        if (clearCoat > 0) {
            // Glossy varnish layer: crisp highlights on top of the softer plastic underneath.
            material.clearCoat.isEnabled = true;
            material.clearCoat.intensity = clearCoat;
            material.clearCoat.roughness = 0.12;
        }
        return material;
    };

    const lens = plastic("lens", PALETTE.lens, 0.2);
    lens.emissiveColor = BABYLON.Color3.FromHexString(PALETTE.lens).toLinearSpace().scale(0.9);

    const flash = new BABYLON.StandardMaterial("toy-tank-flash", scene);
    flash.disableLighting = true;
    flash.emissiveColor = BABYLON.Color3.FromHexString("#FFD27A");
    flash.alpha = 0.85;

    return {
        body: plastic("body", PALETTE.body, 0.45, 0, 0.8),
        bodyDark: plastic("body-dark", PALETTE.bodyDark, 0.5, 0, 0.6),
        cream: plastic("cream", PALETTE.cream, 0.45, 0, 0.7),
        gold: plastic("gold", PALETTE.gold, 0.28, 0.55, 0.5),
        rubber: plastic("rubber", PALETTE.rubber, 0.85),
        cleat: plastic("cleat", PALETTE.cleat, 0.75),
        lens,
        flash,
    };
}

/**
 * The scene has no environment map, so PBR plastic would only be lit by the direct lights and
 * look flat. This builds a tiny sky-to-ground gradient cube map just for the toy tank's materials:
 * it gives the plastic soft sky-coloured fill from above, darker undersides, and reflections for
 * the glossy highlights. It only depends on height, so face orientation doesn't matter.
 */
function createToyEnvironment(scene: BABYLON.Scene): BABYLON.RawCubeTexture {
    const size = 32;
    const zenith = BABYLON.Color3.FromHexString("#D6E4FF");
    const sky = BABYLON.Color3.FromHexString("#F4F1FF");
    const horizon = BABYLON.Color3.FromHexString("#FFE6D2");
    const ground = BABYLON.Color3.FromHexString("#5E7552");
    const color = new BABYLON.Color3();

    const faceNames = ["right", "left", "up", "down", "front", "back"] as const;
    const faceAxes: Record<typeof faceNames[number], [BABYLON.Vector3, BABYLON.Vector3, BABYLON.Vector3]> = {
        right: [new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, 0, -1), new BABYLON.Vector3(0, -1, 0)],
        left: [new BABYLON.Vector3(-1, 0, 0), new BABYLON.Vector3(0, 0, 1), new BABYLON.Vector3(0, -1, 0)],
        up: [new BABYLON.Vector3(0, 1, 0), new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, 0, 1)],
        down: [new BABYLON.Vector3(0, -1, 0), new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, 0, -1)],
        front: [new BABYLON.Vector3(0, 0, 1), new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, -1, 0)],
        back: [new BABYLON.Vector3(0, 0, -1), new BABYLON.Vector3(-1, 0, 0), new BABYLON.Vector3(0, -1, 0)],
    };

    const faces = faceNames.map((faceName) => {
        const [normal, axisX, axisY] = faceAxes[faceName];
        const data = new Uint8Array(size * size * 4);
        for (let py = 0; py < size; py++) {
            for (let px = 0; px < size; px++) {
                const u = (((px + 0.5) / size) * 2) - 1;
                const v = (((py + 0.5) / size) * 2) - 1;
                const dirY = (normal.y + (axisX.y * u) + (axisY.y * v)) / Math.hypot(
                    normal.x + (axisX.x * u) + (axisY.x * v),
                    normal.y + (axisX.y * u) + (axisY.y * v),
                    normal.z + (axisX.z * u) + (axisY.z * v),
                );

                if (dirY >= 0) {
                    BABYLON.Color3.LerpToRef(horizon, sky, Math.min(1, dirY * 2.5), color);
                    BABYLON.Color3.LerpToRef(color, zenith, Math.max(0, (dirY - 0.4) / 0.6), color);
                    if (dirY > 0.82) {
                        // Bright "studio light" cap for crisp highlights on top surfaces.
                        BABYLON.Color3.LerpToRef(color, BABYLON.Color3.White(), Math.min(1, (dirY - 0.82) / 0.08), color);
                    }
                } else {
                    BABYLON.Color3.LerpToRef(horizon, ground, Math.min(1, -dirY * 4), color);
                }

                const offset = ((py * size) + px) * 4;
                data[offset] = Math.round(color.r * 255);
                data[offset + 1] = Math.round(color.g * 255);
                data[offset + 2] = Math.round(color.b * 255);
                data[offset + 3] = 255;
            }
        }
        return data;
    });

    const texture = new BABYLON.RawCubeTexture(scene, faces, size, BABYLON.Constants.TEXTUREFORMAT_RGBA, BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE, true);
    texture.gammaSpace = true;
    texture.name = "toy-tank-environment";

    // Diffuse image-based lighting needs spherical harmonics; compute them from the same data on
    // the CPU instead of reading the texture back from the GPU.
    texture.sphericalPolynomial = BABYLON.CubeMapToSphericalPolynomialTools.ConvertCubeMapToSphericalPolynomial({
        size,
        right: faces[0],
        left: faces[1],
        up: faces[2],
        down: faces[3],
        front: faces[4],
        back: faces[5],
        format: BABYLON.Constants.TEXTUREFORMAT_RGBA,
        type: BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE,
        gammaSpace: true,
    });

    return texture;
}

/** Hidden source mesh for instances. */
function createTemplate(mesh: BABYLON.Mesh, material: BABYLON.Material): BABYLON.Mesh {
    mesh.material = material;
    mesh.isVisible = false;
    mesh.isPickable = false;
    return mesh;
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

/**
 * Box with all edges and corners rounded by `radius`: each face is a grid that is extra dense
 * near the edges, and every vertex is pushed onto the rounded surface. `taper` below 1 makes the
 * top narrower than the bottom (above 1, wider).
 */
function createRoundedBox(name: string, width: number, height: number, depth: number, radius: number, scene: BABYLON.Scene, segments = 4, taper = 1): BABYLON.Mesh {
    const half = [width / 2, height / 2, depth / 2];
    const r = Math.min(radius, ...half);
    const inner = half.map((h) => h - r);
    const samples = half.map((h, axis) => {
        const i = inner[axis];
        const values: number[] = [];
        for (let k = 0; k <= segments; k++) {
            values.push(-h + ((h - i) * k / segments));
        }
        for (let k = 0; k <= segments; k++) {
            const value = i + ((h - i) * k / segments);
            if (value > values[values.length - 1] + 1e-6) {
                values.push(value);
            }
        }
        return values;
    });

    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const point = [0, 0, 0];

    for (let axis = 0; axis < 3; axis++) {
        for (const sign of [-1, 1]) {
            const uAxis = (axis + 1) % 3;
            const vAxis = (axis + 2) % 3;
            const uValues = samples[uAxis];
            const vValues = samples[vAxis];
            const start = positions.length / 3;

            for (const u of uValues) {
                for (const v of vValues) {
                    point[axis] = sign * half[axis];
                    point[uAxis] = u;
                    point[vAxis] = v;

                    const nearest = point.map((value, i) => clamp(value, -inner[i], inner[i]));
                    const offset = point.map((value, i) => value - nearest[i]);
                    const length = Math.hypot(offset[0], offset[1], offset[2]);
                    const normal = length > 1e-9 ? offset.map((value) => value / length) : [0, 0, 0].map((_, i) => (i === axis ? sign : 0));

                    const x = nearest[0] + (normal[0] * r);
                    const y = nearest[1] + (normal[1] * r);
                    const z = nearest[2] + (normal[2] * r);

                    // Taper: scale x and z linearly with height, from 1 at the bottom to `taper` at
                    // the top. Normals follow the inverse transpose of that deformation.
                    const scale = 1 - ((1 - taper) * ((y + half[1]) / (2 * half[1])));
                    const scaleSlope = -(1 - taper) / (2 * half[1]);
                    const nx = normal[0] / scale;
                    const ny = normal[1] - ((x * scaleSlope * normal[0]) / scale) - ((z * scaleSlope * normal[2]) / scale);
                    const nz = normal[2] / scale;
                    const normalLength = Math.hypot(nx, ny, nz);

                    positions.push(x * scale, y, z * scale);
                    normals.push(nx / normalLength, ny / normalLength, nz / normalLength);
                }
            }

            const columns = vValues.length;
            for (let ui = 0; ui < uValues.length - 1; ui++) {
                for (let vi = 0; vi < columns - 1; vi++) {
                    const a = start + (ui * columns) + vi;
                    const b = start + ((ui + 1) * columns) + vi;
                    const c = start + ((ui + 1) * columns) + vi + 1;
                    const d = start + (ui * columns) + vi + 1;
                    pushOrientedTriangle(indices, positions, normals, a, b, c);
                    pushOrientedTriangle(indices, positions, normals, a, c, d);
                }
            }
        }
    }

    return buildMesh(name, positions, normals, indices, scene);
}

/**
 * Adds a triangle wound the way Babylon expects for a front face whose outward normal is the
 * vertex normal (Babylon's front faces have (b - a) x (c - a) pointing away from the normal).
 */
function pushOrientedTriangle(indices: number[], positions: number[], normals: number[], a: number, b: number, c: number): void {
    const ax = positions[a * 3], ay = positions[(a * 3) + 1], az = positions[(a * 3) + 2];
    const e1x = positions[b * 3] - ax, e1y = positions[(b * 3) + 1] - ay, e1z = positions[(b * 3) + 2] - az;
    const e2x = positions[c * 3] - ax, e2y = positions[(c * 3) + 1] - ay, e2z = positions[(c * 3) + 2] - az;
    const cx = (e1y * e2z) - (e1z * e2y);
    const cy = (e1z * e2x) - (e1x * e2z);
    const cz = (e1x * e2y) - (e1y * e2x);
    const nx = normals[a * 3] + normals[b * 3] + normals[c * 3];
    const ny = normals[(a * 3) + 1] + normals[(b * 3) + 1] + normals[(c * 3) + 1];
    const nz = normals[(a * 3) + 2] + normals[(b * 3) + 2] + normals[(c * 3) + 2];

    if ((cx * nx) + (cy * ny) + (cz * nz) > 0) {
        indices.push(a, c, b);
    } else {
        indices.push(a, b, c);
    }
}

function buildMesh(name: string, positions: number[], normals: number[], indices: number[], scene: BABYLON.Scene): BABYLON.Mesh {
    const mesh = new BABYLON.Mesh(name, scene);
    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.normals = normals;
    vertexData.indices = indices;
    vertexData.applyToMesh(mesh);
    return mesh;
}

/** Cream roundel with a gold star, drawn once into a small texture. */
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

    context.fillStyle = PALETTE.gold;
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

function getYaw(mesh: BABYLON.AbstractMesh): number {
    return mesh.rotationQuaternion ? mesh.rotationQuaternion.toEulerAngles().y : mesh.rotation.y;
}

function wrapAngle(angle: number): number {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
