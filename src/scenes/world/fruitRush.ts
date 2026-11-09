import * as BABYLON from "@babylonjs/core";

import { FACE_CAMERA_YAW, GROUND_Y } from "../core/constants";
import { createToyMaterial } from "../core/toyStyle";
import type { TankContext } from "../tank/context";
import { createMinigameHud } from "../ui/minigameHud";
import { UI } from "../ui/style";
import { createArcadeButton, type ArcadeButton } from "./arcadeButton";
import { keepGroundClear } from "./ground";

/**
 * Fruit Rush, the Fruit Factory's minigame (Idle Fruit Factory is a game about producing fruit):
 *
 * - Shoot the PLAY button beside the desk to start a ROUND_SECONDS round.
 * - The factory's sign shoots toy fruit in arcs onto the grass in front of the desk, faster and
 *   faster as the round goes on.
 * - Drive into fruit to collect it before it spoils (it shrinks away after a few seconds on the
 *   ground). Golden apples are rare and count GOLDEN_POINTS; quick pickups in a row climb in pitch.
 *
 * Fruit flies on simple hand-made arcs and bounces (no physics bodies), so even a busy round costs
 * little. The best score is remembered in the browser.
 */

const ROUND_SECONDS = 40;
/** Where the fruit lands: a disc on the grass in front of the desk (toward the camera). */
const FIELD = { x: -118, z: 14, radius: 12 };
/** To the side of the field (on screen), not between it and the camera. */
const BUTTON_POSITION = new BABYLON.Vector2(-129, 0);
/** Fruit launches from here if the factory's sign isn't found. */
const FALLBACK_LAUNCH = new BABYLON.Vector3(-96, 20, -6);
const GRAVITY = 40;
const FLIGHT_SECONDS = { min: 1.1, max: 1.6 };
/** Seconds between fruit, from the start of the round to the end. */
const SPAWN_INTERVAL = { start: 0.8, end: 0.38 };
/** Every so often the factory "overflows" and throws a handful at once. */
const BURST_EVERY = 9;
const BURST_SIZE = 4;
const GOLDEN_CHANCE = 0.07;
const GOLDEN_POINTS = 5;
/** How long fruit lasts on the ground, then how long it takes to shrink away. */
const LIFETIME = 6;
const SPOIL_SECONDS = 0.8;
const FRUIT_SCALE = 3;
/** The tank picks up fruit this close to its centre (it's about 12 units across). */
const COLLECT_RADIUS = 7.5;
/** Pickups closer together than this count as a streak. */
const STREAK_SECONDS = 1.3;
const HUD_DISTANCE = 45;
const LEAVE_DISTANCE = 55;
const LEAVE_GRACE = 2;
const RESULTS_SECONDS = 7;
const PRESS_COOLDOWN = 0.5;
const BEST_KEY = "fruit-rush-best";

type FruitKind = "apple" | "orange" | "pear" | "golden";
type Fruit = {
    mesh: BABYLON.InstancedMesh;
    kind: FruitKind;
    position: BABYLON.Vector3;
    velocity: BABYLON.Vector3;
    /** Seconds since it first touched the ground (negative while still flying). */
    groundTime: number;
    spin: BABYLON.Vector3;
};
type State = "idle" | "playing" | "results";

const COLORS = {
    apple: "#D9534F",
    orange: "#F0913A",
    pear: "#C9CF62",
    golden: "#F2C230",
    stem: "#6B4F3A",
    leaf: "#6E9F7E",
};

/** The PLAY button, built with the world (so ground decorations keep clear of it and the field). */
export function createFruitRushButton(scene: BABYLON.Scene): ArcadeButton {
    keepGroundClear({ minX: FIELD.x - FIELD.radius - 3, maxX: FIELD.x + FIELD.radius + 3, minZ: FIELD.z - FIELD.radius - 3, maxZ: FIELD.z + FIELD.radius + 3 });
    return createArcadeButton(scene, {
        id: "fruit-rush-button",
        x: BUTTON_POSITION.x,
        z: BUTTON_POSITION.y,
        yaw: FACE_CAMERA_YAW,
        color: COLORS.apple,
        symbol: "▶",
        label: "PLAY",
    });
}

export async function createFruitRush(context: TankContext, button: ArcadeButton): Promise<void> {
    const { scene, tank, sounds } = context;
    const gui = await import("@babylonjs/gui");
    if (scene.isDisposed) {
        return;
    }
    const hud = createMinigameHud(gui, scene, "fruit-rush");
    const templates = createFruitTemplates(scene);
    // Compile the fruit's shaders now (during loading), not when the first one flies out.
    await Promise.all(Object.values(templates).map((template) => template.material?.forceCompilationAsync(template, { useInstances: true }).catch(() => undefined)));
    if (scene.isDisposed) {
        return;
    }
    const launch = findLaunchPoint(scene);
    const fieldCenter = new BABYLON.Vector3(FIELD.x, GROUND_Y, FIELD.z);
    const restY = GROUND_Y + (FRUIT_SCALE * 0.45);

    let state: State = "idle";
    let best = loadBest();
    let timeLeft = 0;
    let resultsLeft = 0;
    let score = 0;
    let caught = 0;
    let missed = 0;
    let spawnTimer = 0;
    let burstTimer = 0;
    let streak = 0;
    let lastPickup = -Infinity;
    let newBest = false;
    let clock = 0;
    let pressedAt = -Infinity;
    let awayFor = 0;
    let message = "";
    let messageLeft = 0;
    const fruits: Fruit[] = [];
    let fruitCount = 0;

    const clearFruit = () => {
        for (const fruit of fruits) {
            fruit.mesh.dispose();
        }
        fruits.length = 0;
    };

    const startRound = () => {
        clearFruit();
        state = "playing";
        timeLeft = ROUND_SECONDS;
        score = 0;
        caught = 0;
        missed = 0;
        spawnTimer = 0.6;
        burstTimer = BURST_EVERY;
        streak = 0;
        sounds.trade("start", fieldCenter);
    };

    const endRound = (cancelled: boolean) => {
        clearFruit();
        if (cancelled) {
            state = "idle";
            message = "You drove off. Come back and shoot PLAY to try again.";
            messageLeft = 3.5;
            return;
        }
        newBest = best === null || score > best;
        if (newBest) {
            best = score;
            saveBest(score);
        }
        state = "results";
        resultsLeft = RESULTS_SECONDS;
        sounds.trade("end", fieldCenter);
    };

    button.onHit.add(() => {
        if (clock - pressedAt < PRESS_COOLDOWN) {
            return;
        }
        pressedAt = clock;
        button.press();
        if (state !== "playing" && (state === "idle" || resultsLeft < RESULTS_SECONDS - 1.5)) {
            startRound();
        }
    });

    const spawn = () => {
        // Somewhere in the field, not right on the button.
        const target = new BABYLON.Vector3();
        for (let attempt = 0; attempt < 8; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.sqrt(Math.random()) * FIELD.radius;
            target.set(FIELD.x + (Math.cos(angle) * distance), restY, FIELD.z + (Math.sin(angle) * distance));
            if (Math.hypot(target.x - BUTTON_POSITION.x, target.z - BUTTON_POSITION.y) > 7) {
                break;
            }
        }
        const kind: FruitKind = Math.random() < GOLDEN_CHANCE ? "golden" : (["apple", "orange", "pear"] as const)[Math.floor(Math.random() * 3)];
        const from = launch.add(new BABYLON.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 2));
        const time = FLIGHT_SECONDS.min + (Math.random() * (FLIGHT_SECONDS.max - FLIGHT_SECONDS.min));
        const velocity = new BABYLON.Vector3(
            (target.x - from.x) / time,
            ((target.y - from.y) + (0.5 * GRAVITY * time * time)) / time,
            (target.z - from.z) / time,
        );
        const mesh = templates[kind].createInstance(`fruit-rush-${kind}-${fruitCount++}`);
        mesh.isPickable = false;
        mesh.position.copyFrom(from);
        mesh.scaling.setAll(FRUIT_SCALE);
        fruits.push({
            mesh,
            kind,
            position: from,
            velocity,
            groundTime: -1,
            spin: new BABYLON.Vector3(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3),
        });
    };

    const updateFruit = (dt: number) => {
        for (let i = fruits.length - 1; i >= 0; i--) {
            const fruit = fruits[i];
            const { position, velocity } = fruit;

            // Flight and bounces.
            velocity.y -= GRAVITY * dt;
            position.addInPlace(velocity.scale(dt));
            if (position.y <= restY) {
                position.y = restY;
                if (fruit.groundTime < 0) {
                    fruit.groundTime = 0;
                }
                if (velocity.y < -5) {
                    velocity.y *= -0.4;
                    velocity.x *= 0.6;
                    velocity.z *= 0.6;
                } else {
                    velocity.y = 0;
                }
            }
            if (fruit.groundTime >= 0) {
                fruit.groundTime += dt;
                // Rolling to a stop.
                const friction = Math.exp(-2.5 * dt);
                velocity.x *= friction;
                velocity.z *= friction;
                fruit.spin.scaleInPlace(friction);
            }
            fruit.mesh.position.copyFrom(position);
            fruit.mesh.rotation.addInPlace(fruit.spin.scale(dt));
            if (fruit.kind === "golden") {
                fruit.mesh.rotation.y += dt * 3;
            }

            // Picked up by the tank?
            if (position.y < restY + 6 && Math.hypot(position.x - tank.position.x, position.z - tank.position.z) < COLLECT_RADIUS) {
                const golden = fruit.kind === "golden";
                score += golden ? GOLDEN_POINTS : 1;
                caught++;
                streak = clock - lastPickup < STREAK_SECONDS ? streak + 1 : 0;
                lastPickup = clock;
                sounds.pickup(golden, streak, position);
                fruit.mesh.dispose();
                fruits.splice(i, 1);
                continue;
            }

            // Spoiling: shrinks away after a while on the ground.
            const spoil = (fruit.groundTime - LIFETIME) / SPOIL_SECONDS;
            if (spoil > 0) {
                if (spoil >= 1) {
                    missed++;
                    fruit.mesh.dispose();
                    fruits.splice(i, 1);
                    continue;
                }
                fruit.mesh.scaling.setAll(FRUIT_SCALE * (1 - spoil));
            }
        }
    };

    scene.onBeforeRenderObservable.add(() => {
        const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
        clock += dt;
        messageLeft -= dt;
        const distance = Math.hypot(tank.position.x - FIELD.x, tank.position.z - FIELD.z);
        awayFor = distance > LEAVE_DISTANCE ? awayFor + dt : 0;

        if (state === "playing") {
            if (awayFor > LEAVE_GRACE) {
                endRound(true);
            } else {
                timeLeft -= dt;
                const progress = 1 - Math.max(0, timeLeft / ROUND_SECONDS);
                spawnTimer -= dt;
                if (spawnTimer <= 0 && timeLeft > 1.2) {
                    spawn();
                    spawnTimer = SPAWN_INTERVAL.start + ((SPAWN_INTERVAL.end - SPAWN_INTERVAL.start) * progress);
                }
                burstTimer -= dt;
                if (burstTimer <= 0 && timeLeft > 2) {
                    burstTimer = BURST_EVERY;
                    for (let i = 0; i < BURST_SIZE; i++) {
                        spawn();
                    }
                }
                updateFruit(dt);
                if (timeLeft <= 0) {
                    endRound(false);
                }
            }
        } else if (state === "results") {
            resultsLeft -= dt;
            if (resultsLeft <= 0 || awayFor > LEAVE_GRACE) {
                state = "idle";
            }
        }

        const showHud = state !== "idle" || distance < HUD_DISTANCE || messageLeft > 0;
        hud.setVisible(showHud);
        if (!showHud) {
            return;
        }
        if (state === "idle" && messageLeft > 0) {
            hud.set("FRUIT RUSH", UI.pinkDeep, "Round called off", message);
        } else if (state === "idle") {
            hud.set("FRUIT RUSH", UI.navy, "Shoot PLAY to start",
                `The factory is overflowing! Drive into the fruit to collect it before it spoils. Golden apples count ${GOLDEN_POINTS}.${best !== null ? ` Best: ${best}` : ""}`);
        } else if (state === "playing" && awayFor > 0) {
            hud.set(`FRUIT RUSH  ${formatTime(timeLeft)}`, UI.pinkDeep, "Come back!",
                `Leaving the orchard ends the round in ${Math.max(0, LEAVE_GRACE - awayFor).toFixed(1)} s.`, UI.pinkDeep);
        } else if (state === "playing") {
            const streakText = streak >= 2 && clock - lastPickup < STREAK_SECONDS ? `Streak x${streak + 1}!` : "Drive into the fruit before it spoils!";
            hud.set(`FRUIT RUSH  ${formatTime(timeLeft)}`, timeLeft < 10 ? UI.pinkDeep : UI.gold, `${score} fruit`, streakText, "#3E9C6E");
        } else {
            hud.set(newBest ? "NEW BEST!" : "HARVEST DONE", UI.mint, `${score} fruit`,
                `Caught ${caught}, ${missed} spoiled.${best !== null ? ` Best ${best}.` : ""} Shoot PLAY to go again.`, "#3E9C6E");
        }
    });

    scene.onDisposeObservable.addOnce(clearFruit);
}

/** The top of the factory's title sign (with the toy fruit on it), where fruit comes flying out. */
function findLaunchPoint(scene: BABYLON.Scene): BABYLON.Vector3 {
    const board = scene.getMeshByName("ff-title-board");
    if (!board) {
        return FALLBACK_LAUNCH.clone();
    }
    board.computeWorldMatrix(true);
    const box = board.getBoundingInfo().boundingBox;
    return new BABYLON.Vector3(box.centerWorld.x, box.maximumWorld.y + 2, box.centerWorld.z);
}

/**
 * One hidden template per kind of fruit, each a single mesh (body, stem and leaf merged, coloured
 * with vertex colours), so every fruit in flight is just an instance.
 */
function createFruitTemplates(scene: BABYLON.Scene): Record<FruitKind, BABYLON.Mesh> {
    const material = createToyMaterial(scene, "fruit-rush-material", "#FFFFFF", { roughness: 0.35, clearCoat: 0.7 });
    const golden = createToyMaterial(scene, "fruit-rush-golden", "#FFFFFF", { roughness: 0.2, metallic: 0.6, clearCoat: 0.8 });
    golden.emissiveColor = BABYLON.Color3.FromHexString(COLORS.golden).toLinearSpace().scale(0.25);

    const colored = (mesh: BABYLON.Mesh, hex: string) => {
        const color = BABYLON.Color3.FromHexString(hex).toLinearSpace();
        const count = mesh.getTotalVertices();
        const colors: number[] = [];
        for (let i = 0; i < count; i++) {
            colors.push(color.r, color.g, color.b, 1);
        }
        mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
        return mesh;
    };
    const stemAndLeaf = (name: string, top: number) => {
        const stem = colored(BABYLON.MeshBuilder.CreateCylinder(`${name}-stem`, { diameterTop: 0.1, diameterBottom: 0.16, height: 0.45, tessellation: 6 }, scene), COLORS.stem);
        stem.position.set(0, top + 0.15, 0);
        stem.rotation.z = 0.25;
        const leaf = colored(BABYLON.MeshBuilder.CreateSphere(`${name}-leaf`, { diameter: 1, segments: 6 }, scene), COLORS.leaf);
        leaf.scaling.set(0.42, 0.08, 0.2);
        leaf.rotation.z = 0.5;
        leaf.position.set(0.22, top + 0.22, 0);
        return [stem, leaf];
    };
    const build = (name: string, parts: BABYLON.Mesh[], templateMaterial: BABYLON.Material) => {
        const merged = BABYLON.Mesh.MergeMeshes(parts, true, true) ?? parts[0];
        merged.name = name;
        merged.material = templateMaterial;
        merged.isVisible = false;
        merged.isPickable = false;
        return merged;
    };
    const apple = (name: string, hex: string) => {
        const body = colored(BABYLON.MeshBuilder.CreateSphere(`${name}-body`, { diameter: 1, segments: 12 }, scene), hex);
        body.scaling.y = 0.9;
        return [body, ...stemAndLeaf(name, 0.42)];
    };

    const orangeBody = colored(BABYLON.MeshBuilder.CreateSphere("fruit-rush-orange-body", { diameter: 1, segments: 12 }, scene), COLORS.orange);
    const pearBody = colored(BABYLON.MeshBuilder.CreateSphere("fruit-rush-pear-body", { diameter: 1, segments: 12 }, scene), COLORS.pear);
    const pearNeck = colored(BABYLON.MeshBuilder.CreateSphere("fruit-rush-pear-neck", { diameter: 0.65, segments: 10 }, scene), COLORS.pear);
    pearNeck.position.y = 0.5;
    return {
        apple: build("fruit-rush-apple", apple("fruit-rush-apple", COLORS.apple), material),
        orange: build("fruit-rush-orange", [orangeBody, ...stemAndLeaf("fruit-rush-orange", 0.45).slice(1)], material),
        pear: build("fruit-rush-pear", [pearBody, pearNeck, ...stemAndLeaf("fruit-rush-pear", 0.78)], material),
        golden: build("fruit-rush-golden", apple("fruit-rush-golden", COLORS.golden), golden),
    };
}

function formatTime(seconds: number): string {
    const whole = Math.max(0, Math.ceil(seconds));
    return `0:${whole.toString().padStart(2, "0")}`;
}

function loadBest(): number | null {
    try {
        const stored = window.localStorage.getItem(BEST_KEY);
        const value = stored === null ? NaN : Number(stored);
        return Number.isFinite(value) ? value : null;
    } catch {
        return null;
    }
}

function saveBest(value: number): void {
    try {
        window.localStorage.setItem(BEST_KEY, String(Math.round(value)));
    } catch {
        // Private mode or blocked storage: the best score just isn't remembered.
    }
}
