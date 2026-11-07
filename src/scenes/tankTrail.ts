import * as BABYLON from "@babylonjs/core";

/**
 * What the tank leaves behind while driving: pairs of tread prints pressed into the play mat that
 * fade away after a while, and little puffs of dust kicked up behind both tracks.
 *
 * Replaces the imported "splatter" decals. Everything follows the physics holder ("tank_holder"),
 * whatever tank model is shown on it.
 */

const GROUND_Y = -0.5;
/** Prints sit just above the road slabs (whose tops are at GROUND_Y + 0.15) so they show there too. */
const PRINT_Y = GROUND_Y + 0.17;

// Track layout in world units (see toyTank.ts): tracks 4.6 either side of the centre line,
// 2.6 wide, and the rear of the tracks 6.8 behind the centre.
const TRACK_X = 4.6;
const TRACK_WIDTH = 2.6;
const TRACK_REAR_Z = -6.8;

/** Distance driven between two prints, and the length of one print (slightly longer, so they join). */
const PRINT_SPACING = 1.9;
const PRINT_LENGTH = 2.1;
const PRINT_LIFETIME = 9;
const PRINT_FADE = 3.5;
const MAX_PRINTS = 420;

/** Below this speed (units per second) the tank leaves no prints or dust. */
const MIN_SPEED = 2;

const PALETTE = {
    print: "#123248",
    dust: "#E8DCC6",
};

export type TankTrail = {
    dispose: () => void;
};

export function createTankTrail(scene: BABYLON.Scene, holder: BABYLON.AbstractMesh): TankTrail | null {
    // The old decals are replaced by this trail.
    for (const name of ["splatter1", "splatter2", "splatter3"]) {
        scene.getMeshByName(name)?.setEnabled(false);
    }

    let prints: ReturnType<typeof createPrints> | null = null;
    let dust: BABYLON.ParticleSystem | null = null;
    try {
        prints = createPrints(scene);
    } catch (error) {
        console.error("Tank tread prints failed", error);
    }
    try {
        dust = createDust(scene, holder);
    } catch (error) {
        console.error("Tank dust failed", error);
    }
    if (!prints && !dust) {
        return null;
    }

    const lastPosition = holder.position.clone();
    // Height of the holder when on the ground; above it the tank is on a ramp or in the air, and
    // leaves no prints or dust (they would end up inside the ramp or on the ground below).
    const groundedY = holder.position.y;
    const lastPrintPosition = holder.position.clone();
    const forward = new BABYLON.Vector3();
    let time = 0;

    const observer = scene.onAfterRenderObservable.add(() => {
        const deltaSeconds = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
        time += deltaSeconds;

        const moved = Math.hypot(holder.position.x - lastPosition.x, holder.position.z - lastPosition.z);
        const speed = deltaSeconds > 0 ? moved / deltaSeconds : 0;
        lastPosition.copyFrom(holder.position);
        const onGround = holder.position.y < groundedY + 0.3;
        const driving = speed > MIN_SPEED && onGround;

        if (prints) {
            if (!driving) {
                // Restart the spacing from here, so the next print isn't stretched over a gap.
                lastPrintPosition.copyFrom(holder.position);
            } else {
                holder.computeWorldMatrix(true);
                holder.getDirectionToRef(BABYLON.Axis.Z, forward);
                forward.y = 0;
                forward.normalize();
                const yaw = Math.atan2(forward.x, forward.z);
                // Lay prints along the path in equal steps, even if a frame covered several.
                let travelled = BABYLON.Vector3.Distance(holder.position, lastPrintPosition);
                while (travelled >= PRINT_SPACING) {
                    const t = PRINT_SPACING / travelled;
                    BABYLON.Vector3.LerpToRef(lastPrintPosition, holder.position, t, lastPrintPosition);
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

    const dispose = () => {
        scene.onAfterRenderObservable.remove(observer);
        prints?.mesh.dispose();
        dust?.dispose();
    };
    scene.onDisposeObservable.addOnce(dispose);
    return { dispose };
}

/**
 * All prints are thin instances of one flat quad with a tread texture; each one has its own
 * colour (for fading) in a per-instance colour buffer, and is recycled oldest-first.
 */
function createPrints(scene: BABYLON.Scene) {
    const mesh = BABYLON.MeshBuilder.CreateGround("tank-trail-prints", { width: TRACK_WIDTH, height: PRINT_LENGTH }, scene);
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.hasVertexAlpha = true;
    mesh.metadata = { keepUnfrozen: true };

    const material = new BABYLON.StandardMaterial("tank-trail-prints-material", scene);
    material.diffuseTexture = createTreadTexture(scene);
    material.diffuseTexture.hasAlpha = true;
    material.useAlphaFromDiffuseTexture = true;
    material.specularColor = BABYLON.Color3.Black();
    material.diffuseColor = BABYLON.Color3.FromHexString(PALETTE.print);
    material.zOffset = -2;
    material.backFaceCulling = false;
    mesh.material = material;

    const matrices = new Float32Array(MAX_PRINTS * 16);
    const colors = new Float32Array(MAX_PRINTS * 4);
    const born = new Float32Array(MAX_PRINTS).fill(-1000);
    const hidden = BABYLON.Matrix.Scaling(0, 0, 0);
    for (let i = 0; i < MAX_PRINTS; i++) {
        hidden.copyToArray(matrices, i * 16);
    }
    mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
    mesh.thinInstanceSetBuffer("color", colors, 4, false);

    let next = 0;
    /** Time the newest print expires; nothing to update after that. */
    let lastExpiry = -1;
    const rotation = new BABYLON.Quaternion();
    const position = new BABYLON.Vector3();
    const scaling = BABYLON.Vector3.One();
    const matrix = new BABYLON.Matrix();
    let matricesDirty = false;

    return {
        mesh,
        /** One pair of prints, under both tracks, centred on `center` and turned to `yaw`. */
        stamp(center: BABYLON.Vector3, yaw: number, time: number): void {
            BABYLON.Quaternion.RotationYawPitchRollToRef(yaw, 0, 0, rotation);
            const rightX = Math.cos(yaw);
            const rightZ = -Math.sin(yaw);
            for (const side of [-1, 1]) {
                position.set(center.x + (rightX * side * TRACK_X), PRINT_Y, center.z + (rightZ * side * TRACK_X));
                BABYLON.Matrix.ComposeToRef(scaling, rotation, position, matrix);
                matrix.copyToArray(matrices, next * 16);
                born[next] = time;
                next = (next + 1) % MAX_PRINTS;
            }
            matricesDirty = true;
            lastExpiry = time + PRINT_LIFETIME;
        },
        /** Fades prints out at the end of their life and hides expired ones. */
        update(time: number): void {
            // All prints have faded: skip the loop and the buffer upload (one last pass hides them).
            if (time > lastExpiry + 1) {
                return;
            }
            for (let i = 0; i < MAX_PRINTS; i++) {
                const age = time - born[i];
                const alpha = age < 0 || age > PRINT_LIFETIME ? 0 : Math.min(1, (PRINT_LIFETIME - age) / PRINT_FADE) * 0.8;
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
function createTreadTexture(scene: BABYLON.Scene): BABYLON.DynamicTexture {
    const width = 128;
    const height = 128;
    const texture = new BABYLON.DynamicTexture("tank-trail-tread", { width, height }, scene, true);
    const context = texture.getContext() as CanvasRenderingContext2D;
    context.clearRect(0, 0, width, height);

    // A faint pressed-in band the width of the track...
    context.fillStyle = "rgba(255,255,255,0.45)";
    context.fillRect(width * 0.06, 0, width * 0.88, height);

    // ...with three chevron cleats along it (the texture's V runs along the direction of travel).
    context.fillStyle = "rgba(255,255,255,1)";
    for (let i = 0; i < 3; i++) {
        const y = (i + 0.5) * (height / 3);
        const thickness = height * 0.12;
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
    texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    return texture;
}

/** Soft sand-coloured puffs from the back of both tracks. */
function createDust(scene: BABYLON.Scene, holder: BABYLON.AbstractMesh): BABYLON.ParticleSystem {
    const dust = new BABYLON.ParticleSystem("tank-trail-dust", 300, scene);
    dust.particleTexture = createPuffTexture(scene);
    dust.emitter = holder;

    // Positions and directions are computed in world space from the holder's world matrix (the
    // holder is a scaled 12-unit cube, so local offsets are divided by its scale).
    const holderScale = holder.scaling.x || 1;
    const local = new BABYLON.Vector3();
    dust.startPositionFunction = (worldMatrix, positionToUpdate) => {
        const side = Math.random() < 0.5 ? -1 : 1;
        local.set(
            (side * TRACK_X + ((Math.random() - 0.5) * TRACK_WIDTH)) / holderScale,
            (GROUND_Y + 0.4 - holder.position.y) / holderScale,
            (TRACK_REAR_Z + (Math.random() * 0.8)) / holderScale,
        );
        BABYLON.Vector3.TransformCoordinatesToRef(local, worldMatrix, positionToUpdate);
    };
    const back = new BABYLON.Vector3();
    dust.startDirectionFunction = (worldMatrix, directionToUpdate) => {
        BABYLON.Vector3.TransformNormalFromFloatsToRef(0, 0, -1, worldMatrix, back);
        back.y = 0;
        back.normalize();
        directionToUpdate.set(
            (back.x * 2.5) + ((Math.random() - 0.5) * 3),
            2 + (Math.random() * 2.5),
            (back.z * 2.5) + ((Math.random() - 0.5) * 3),
        );
    };

    const color = BABYLON.Color3.FromHexString(PALETTE.dust);
    dust.addColorGradient(0, new BABYLON.Color4(color.r, color.g, color.b, 0));
    dust.addColorGradient(0.15, new BABYLON.Color4(color.r, color.g, color.b, 0.38));
    dust.addColorGradient(1, new BABYLON.Color4(color.r, color.g, color.b, 0));
    dust.addSizeGradient(0, 1.6);
    dust.addSizeGradient(1, 4.4);
    dust.minLifeTime = 0.6;
    dust.maxLifeTime = 1.1;
    dust.minEmitPower = 1;
    dust.maxEmitPower = 1.6;
    dust.minAngularSpeed = -1.5;
    dust.maxAngularSpeed = 1.5;
    dust.gravity = new BABYLON.Vector3(0, -2, 0);
    dust.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    dust.emitRate = 0;
    dust.start();
    return dust;
}

function createPuffTexture(scene: BABYLON.Scene): BABYLON.DynamicTexture {
    const size = 64;
    const texture = new BABYLON.DynamicTexture("tank-trail-puff", { width: size, height: size }, scene, false);
    const context = texture.getContext() as CanvasRenderingContext2D;
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
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
