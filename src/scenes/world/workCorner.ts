import * as BABYLON from "@babylonjs/core";

import { getSoundMaterial } from "../audio/soundMaterials";
import { addStaticBox } from "../core/staticBodies";
import { createRoundedBox, createToyMaterial } from "../core/toyStyle";
import { GROUND_Y, FACE_CAMERA_YAW } from "../core/constants";
import { UI } from "../ui/style";
import { createInfoStand, drawInfoText, roundRect } from "./infoStand";

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
export const WORK_CORNER_POSITION = new BABYLON.Vector2(-20, -72);

/** Nothing animates when the tank is further away than this. */
const ANIMATION_DISTANCE = 170;

const FONT = UI.font;

const PALETTE = {
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

type Materials = ReturnType<typeof createMaterials>;

type Frame = {
    yaw: number;
    /** World position of a point given in the corner's frame. */
    toWorld: (x: number, y: number, z: number) => BABYLON.Vector3;
};

/** A "signal" shown by the quantum core: which way it expects the market to go next. */
export type CoreSignal = "up" | "down" | "none";

export type TradeButton = {
    /** World position of the button's face. */
    position: BABYLON.Vector3;
    /** Fires when a shot hits the button. */
    onHit: BABYLON.Observable<void>;
    /** Plays the press animation. */
    press: () => void;
};

/** What the minigame uses. */
export type WorkCorner = {
    center: BABYLON.Vector3;
    setSignal: (signal: CoreSignal) => void;
    board: TradingBoard;
    buttons: { buy: TradeButton; sell: TradeButton };
};

export function createWorkCorner(scene: BABYLON.Scene): WorkCorner | null {
    const yaw = FACE_CAMERA_YAW;
    const right = new BABYLON.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const away = new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const frame: Frame = {
        yaw,
        toWorld: (x, y, z) => new BABYLON.Vector3(
            WORK_CORNER_POSITION.x + (right.x * x) + (away.x * z),
            GROUND_Y + y,
            WORK_CORNER_POSITION.y + (right.z * x) + (away.z * z),
        ),
    };
    const materials = createMaterials(scene);
    const animations: ((dt: number) => void)[] = [];
    let setSignal: ((signal: CoreSignal) => void) | null = null;
    let board: TradingBoard | null = null;
    let buttons: { buy: ReturnType<typeof createTradeButton>; sell: ReturnType<typeof createTradeButton> } | null = null;

    const parts: [string, () => void][] = [
        ["info stand", () => createWorkInfoStand(scene, frame)],
        ["quantum core", () => {
            const core = createQuantumCore(scene, frame, materials);
            animations.push(core.animate);
            setSignal = core.setSignal;
        }],
        ["trading board", () => {
            board = createTradingBoard(scene, frame, materials);
            animations.push(board.animate);
        }],
        ["trade buttons", () => {
            buttons = {
                buy: createTradeButton(scene, frame, materials, "buy", 16, -8),
                sell: createTradeButton(scene, frame, materials, "sell", 30, -8),
            };
            animations.push((dt) => {
                buttons?.buy.animate(dt);
                buttons?.sell.animate(dt);
            });
        }],
        ["briefcase", () => createBriefcase(scene, frame, materials)],
    ];
    for (const [name, build] of parts) {
        try {
            build();
        } catch (error) {
            console.error(`Work corner ${name} failed`, error);
        }
    }

    const tank = scene.getMeshByName("tank_holder");
    const center = frame.toWorld(0, 0, 0);
    scene.onBeforeRenderObservable.add(() => {
        if (tank && Math.hypot(tank.position.x - center.x, tank.position.z - center.z) > ANIMATION_DISTANCE) {
            return;
        }
        const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
        for (const animate of animations) {
            animate(dt);
        }
    });

    if (!setSignal || !board || !buttons) {
        return null;
    }
    return { center, setSignal, board, buttons };
}

function createMaterials(scene: BABYLON.Scene) {
    const toy = (name: string, hex: string, roughness = 0.45, clearCoat = 0.4, metallic = 0) =>
        createToyMaterial(scene, `work-${name}`, hex, { roughness, clearCoat, metallic });
    const core = toy("core", PALETTE.core, 0.2, 0.9);
    core.emissiveColor = BABYLON.Color3.FromHexString(PALETTE.core).toLinearSpace().scale(0.35);
    return {
        navy: toy("navy", PALETTE.navy),
        navyLight: toy("navy-light", PALETTE.navyLight, 0.5, 0.2),
        sand: toy("sand", PALETTE.sand, 0.45, 0.35),
        cream: toy("cream", PALETTE.cream, 0.45, 0.4),
        gold: toy("gold", PALETTE.gold, 0.25, 0.6, 0.6),
        wood: toy("wood", PALETTE.wood, 0.55, 0.3),
        mint: toy("mint", PALETTE.mint, 0.4, 0.5),
        pink: toy("pink", PALETTE.pink, 0.4, 0.5),
        core,
        leather: toy("leather", PALETTE.leather, 0.5, 0.35),
        leatherDark: toy("leather-dark", PALETTE.leatherDark, 0.5, 0.3),
    };
}

/** A node in the corner's frame at local (x, z), facing the camera; its children are built at size 1. */
function createAnchor(scene: BABYLON.Scene, name: string, frame: Frame, x: number, z: number, scale = 1): BABYLON.TransformNode {
    const node = new BABYLON.TransformNode(name, scene);
    node.position.copyFrom(frame.toWorld(x, 0, z));
    node.rotation.y = frame.yaw;
    node.scaling.setAll(scale);
    return node;
}

function attach(mesh: BABYLON.Mesh, parent: BABYLON.Node, material: BABYLON.Material, animated = false): BABYLON.Mesh {
    mesh.parent = parent;
    mesh.material = material;
    mesh.isPickable = false;
    if (animated) {
        mesh.metadata = { ...(mesh.metadata ?? {}), keepUnfrozen: true };
    }
    return mesh;
}

/** Static collision box given in a node's (uniformly scaled) frame. */
function addCollider(scene: BABYLON.Scene, node: BABYLON.TransformNode, local: BABYLON.Vector3, width: number, height: number, depth: number, sound: "solid" | "post" = "solid"): void {
    node.computeWorldMatrix(true);
    const scale = node.scaling.x;
    addStaticBox(scene, BABYLON.Vector3.TransformCoordinates(local, node.getWorldMatrix()), width * scale, height * scale, depth * scale, {
        rotation: BABYLON.Quaternion.RotationYawPitchRoll(node.rotation.y, 0, 0),
        sound,
    });
}

// ==================================================================== Info stand

function createWorkInfoStand(scene: BABYLON.Scene, frame: Frame): void {
    const position = frame.toWorld(-19, 0, -4);
    createInfoStand(scene, {
        id: "work-info-stand",
        x: position.x,
        z: position.z,
        draw: (context) => {
            const pad = 64;
            const bottom = drawInfoText(context, FONT, {
                eyebrow: "MY WORK",
                eyebrowColor: PALETTE.pinkDeep,
                title: "Quantum-Inspired Trading",
                titleColor: PALETTE.navy,
                body: "I build software for financial trading, using quantum-inspired algorithms to solve hard optimisation problems. The rest is confidential.",
                bodyColor: PALETTE.muted,
                maxWidth: 600,
            });

            // "Confidential" pill with a padlock.
            const pillY = bottom + 14;
            const pillHeight = 72;
            context.font = `900 34px ${FONT}`;
            const pillText = "Top secret, sorry!";
            const pillWidth = context.measureText(pillText).width + 116;
            roundRect(context, pad, pillY, pillWidth, pillHeight, pillHeight / 2);
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

function drawPadlock(context: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, hole: string): void {
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
    roundRect(context, -19, -6, 38, 30, 6);
    context.fill();
    context.fillStyle = hole;
    context.beginPath();
    context.arc(0, 6, 4.5, 0, Math.PI * 2);
    context.fill();
    context.restore();
}

/** A Bloch sphere: a circle, its equator, axes and a state arrow. */
function drawQubit(context: CanvasRenderingContext2D, x: number, y: number, r: number): void {
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
    const tipX = x + (r * 0.55);
    const tipY = y - (r * 0.62);
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
function drawCandles(context: CanvasRenderingContext2D, x: number, y: number): void {
    const candles = [[0, 40, -10, 52], [40, 22, 14, 52], [22, 74, 12, 86], [74, 58, 46, 92], [58, 120, 50, 134]];
    context.lineCap = "round";
    candles.forEach(([open, close, low, high], i) => {
        const cx = x + (i * 46);
        const up = close > open;
        context.strokeStyle = PALETTE.navy;
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(cx, y - low);
        context.lineTo(cx, y - high);
        context.stroke();
        context.fillStyle = up ? PALETTE.mint : PALETTE.pink;
        roundRect(context, cx - 15, y - Math.max(open, close), 30, Math.max(8, Math.abs(close - open)), 6);
        context.fill();
    });
}

// ==================================================================== Quantum core

/** Returns its animation step. */
/** The core's colours for each signal: its own pale blue, or mint / pink for up / down. */
const SIGNAL_COLORS: Record<CoreSignal, string> = { none: PALETTE.core, up: PALETTE.mint, down: PALETTE.pink };
/** Where the state arrow leans for each signal (0 = straight up). */
const SIGNAL_TILT: Record<CoreSignal, number> = { none: -0.6, up: -0.15, down: Math.PI - 0.15 };

function createQuantumCore(scene: BABYLON.Scene, frame: Frame, materials: Materials): { animate: (dt: number) => void; setSignal: (signal: CoreSignal) => void } {
    const root = createAnchor(scene, "work-quantum-core", frame, 2, 5, 1.5);

    attach(createRoundedBox("work-core-plinth", 6, 1.6, 6, 0.4, scene), root, materials.navy).position.y = 0.8;
    attach(createRoundedBox("work-core-plinth-top", 5.2, 0.3, 5.2, 0.12, scene), root, materials.sand).position.y = 1.75;
    const pillar = attach(BABYLON.MeshBuilder.CreateCylinder("work-core-pillar", { diameterTop: 0.6, diameterBottom: 1.4, height: 3.6, tessellation: 20 }, scene), root, materials.gold);
    pillar.position.y = 3.6;

    const coreY = 8.4;
    const core = attach(BABYLON.MeshBuilder.CreateSphere("work-core-sphere", { diameter: 3.6, segments: 24 }, scene), root, materials.core);
    core.position.y = coreY;

    // The state arrow (a gold shaft with a pink ball on the end), precessing around the vertical.
    const precession = new BABYLON.TransformNode("work-core-precession", scene);
    precession.parent = root;
    precession.position.y = coreY;
    const arrow = new BABYLON.TransformNode("work-core-arrow", scene);
    arrow.parent = precession;
    arrow.rotation.z = -0.6;
    const shaft = attach(BABYLON.MeshBuilder.CreateCylinder("work-core-shaft", { diameter: 0.22, height: 3, tessellation: 10 }, scene), arrow, materials.gold, true);
    shaft.position.y = 1.5;
    const tip = attach(BABYLON.MeshBuilder.CreateSphere("work-core-tip", { diameter: 0.7, segments: 12 }, scene), arrow, materials.pink, true);
    tip.position.y = 3;

    // Two tilted rings, each with a little bead running round it.
    const rings = [
        { tilt: 1.05, speed: 0.7, bead: materials.pink },
        { tilt: -1.05, speed: -0.5, bead: materials.mint },
    ].map(({ tilt, speed, bead }, i) => {
        const holder = new BABYLON.TransformNode(`work-core-ring-holder-${i}`, scene);
        holder.parent = root;
        holder.position.y = coreY;
        holder.rotation.z = tilt;
        const spinner = new BABYLON.TransformNode(`work-core-ring-${i}`, scene);
        spinner.parent = holder;
        attach(BABYLON.MeshBuilder.CreateTorus(`work-core-torus-${i}`, { diameter: 6, thickness: 0.22, tessellation: 48 }, scene), spinner, materials.cream, true);
        const beadMesh = attach(BABYLON.MeshBuilder.CreateSphere(`work-core-bead-${i}`, { diameter: 0.6, segments: 10 }, scene), spinner, bead, true);
        beadMesh.position.x = 3;
        return { spinner, speed };
    });

    addCollider(scene, root, new BABYLON.Vector3(0, 5.5, 0), 6.6, 11, 6.6);

    // The minigame's signal: the core lights up in the signal's colour, the arrow swings up or
    // down, and the rings spin faster.
    const material = materials.core;
    const targetColor = BABYLON.Color3.FromHexString(PALETTE.core).toLinearSpace();
    let signal: CoreSignal = "none";
    let tilt = SIGNAL_TILT.none;
    let time = 0;
    const animate = (dt: number) => {
        time += dt;
        const excited = signal !== "none";
        precession.rotation.y += dt * (excited ? 2.4 : 0.9);
        tilt += (SIGNAL_TILT[signal] - tilt) * Math.min(1, dt * 6);
        // A gentle nod, so it doesn't look like a plain turntable.
        arrow.rotation.z = tilt + (Math.sin(time * 0.8) * (excited ? 0.06 : 0.2));
        for (const ring of rings) {
            ring.spinner.rotation.y += dt * ring.speed * (excited ? 3 : 1);
        }
        const blend = Math.min(1, dt * 8);
        BABYLON.Color3.LerpToRef(material.albedoColor, targetColor, blend, material.albedoColor);
        const glow = excited ? 0.55 + (Math.sin(time * 9) * 0.15) : 0.35;
        BABYLON.Color3.LerpToRef(material.emissiveColor, targetColor.scale(glow), blend, material.emissiveColor);
    };
    const setSignal = (next: CoreSignal) => {
        signal = next;
        BABYLON.Color3.FromHexString(SIGNAL_COLORS[next]).toLinearSpaceToRef(targetColor);
    };
    return { animate, setSignal };
}

// ==================================================================== Trading board

/** Open, close, low, high, in chart units (0 at the bottom of the chart area). */
const CANDLES: [number, number, number, number][] = [
    [1.0, 2.0, 0.6, 2.4],
    [2.0, 1.4, 1.0, 2.3],
    [1.4, 3.0, 1.2, 3.4],
    [3.0, 3.8, 2.6, 4.2],
    [3.8, 3.1, 2.8, 4.1],
    [3.1, 4.9, 2.9, 5.3],
    [4.9, 4.4, 4.0, 5.4],
    [4.4, 6.4, 4.2, 6.8],
];

export const TICKER_TEXT = "QUANTUM-INSPIRED ALGORITHMS   ▲   FINANCIAL TRADING   ▲   OPTIMISATION   ▲   SOFTWARE ENGINEERING   ▲   ";

/** The board, as the minigame uses it. */
export type TradingBoard = {
    animate: (dt: number) => void;
    /** Shows the screen (for the minigame) instead of the 3D chart, or the other way round. */
    showScreen: (show: boolean) => void;
    /** Canvas covering the chart area; call `updateScreen` after drawing on it. */
    screen: CanvasRenderingContext2D;
    screenSize: { width: number; height: number };
    updateScreen: () => void;
    setTicker: (text: string) => void;
};

function createTradingBoard(scene: BABYLON.Scene, frame: Frame, materials: Materials): TradingBoard {
    const root = createAnchor(scene, "work-trading-board", frame, 23, 3, 1.25);
    const width = 16;
    const height = 10.5;
    const centerY = 9;
    const depth = 0.8;

    attach(createRoundedBox("work-board", width, height, depth, 0.6, scene), root, materials.navy).position.y = centerY;
    const rim = attach(createRoundedBox("work-board-rim", width + 1.2, height + 1.2, depth * 0.7, 0.8, scene), root, materials.sand);
    rim.position.set(0, centerY, 0.2);
    for (const side of [-1, 1]) {
        const post = attach(createRoundedBox(`work-board-post-${side}`, 1.1, centerY, 1.1, 0.35, scene), root, materials.wood);
        post.position.set(side * (width / 2 - 2.2), centerY / 2, 0.9);
    }

    // Chart area: faint grid lines, the candles and a gold trend line in front.
    const front = -(depth / 2);
    const chartBottom = 5.6;
    const chartLeft = -6.3;
    const pitch = 1.8;
    const grid = [0, 1, 2, 3].map((i) => {
        const line = createRoundedBox(`work-board-grid-${i}`, width - 2, 0.12, 0.1, 0.04, scene, 1);
        line.position.set(0, chartBottom + (i * 2.2), front - 0.05);
        return line;
    });
    const decor: BABYLON.Mesh[] = [];
    decor.push(...mergeInto("work-board-grid", grid, root, materials.navyLight));

    const ups: BABYLON.Mesh[] = [];
    const downs: BABYLON.Mesh[] = [];
    const wicks: BABYLON.Mesh[] = [];
    CANDLES.forEach(([open, close, low, high], i) => {
        const x = chartLeft + (i * pitch);
        const bodyHeight = Math.max(0.3, Math.abs(close - open));
        const body = createRoundedBox(`work-candle-${i}`, 1.05, bodyHeight, 0.7, 0.14, scene, 2);
        body.position.set(x, chartBottom + ((open + close) / 2), front - 0.4);
        (close > open ? ups : downs).push(body);
        const wick = createRoundedBox(`work-wick-${i}`, 0.2, high - low, 0.25, 0.08, scene, 1);
        wick.position.set(x, chartBottom + ((low + high) / 2), front - 0.3);
        wicks.push(wick);
    });
    decor.push(...mergeInto("work-candles-up", ups, root, materials.mint));
    decor.push(...mergeInto("work-candles-down", downs, root, materials.pink));
    decor.push(...mergeInto("work-wicks", wicks, root, materials.cream));

    // Trend line through the candles' closes, ending in an arrowhead past the last one.
    const path = CANDLES.map(([, close], i) => new BABYLON.Vector3(chartLeft + (i * pitch), chartBottom + close + 0.9, front - 1));
    const last = path[path.length - 1];
    const before = path[path.length - 2];
    const direction = last.subtract(before).normalize();
    const headBase = last.add(direction.scale(0.6));
    path.push(headBase);
    const line = BABYLON.MeshBuilder.CreateTube("work-trend", { path, radius: 0.16, tessellation: 10, cap: BABYLON.Mesh.CAP_ALL }, scene);
    const head = BABYLON.MeshBuilder.CreateCylinder("work-trend-head", { diameterTop: 0, diameterBottom: 0.9, height: 1, tessellation: 12 }, scene);
    head.position.copyFrom(headBase.add(direction.scale(0.5)));
    head.rotation.z = -Math.atan2(direction.x, direction.y);
    decor.push(...mergeInto("work-trend-line", [line, head], root, materials.gold));

    // Ticker strip along the bottom of the board, scrolling sideways.
    const ticker = createTicker(scene, width - 1.6, 1.2);
    ticker.mesh.parent = root;
    ticker.mesh.position.set(0, 4.35, front - 0.03);

    // The minigame's screen over the chart area (between the ticker and the top of the board).
    const screenWidth = width - 1.6;
    const screenHeight = (centerY + (height / 2) - 0.7) - 5.1;
    const screenPixels = { width: 1024, height: Math.round((1024 * screenHeight) / screenWidth) };
    const screenTexture = new BABYLON.DynamicTexture("work-screen-texture", screenPixels, scene, true);
    const screenMaterial = new BABYLON.StandardMaterial("work-screen-material", scene);
    screenMaterial.disableLighting = true;
    screenMaterial.emissiveTexture = screenTexture;
    screenMaterial.diffuseColor = BABYLON.Color3.Black();
    const screen = BABYLON.MeshBuilder.CreatePlane("work-screen", { width: screenWidth, height: screenHeight }, scene);
    screen.material = screenMaterial;
    screen.parent = root;
    screen.isPickable = false;
    screen.position.set(0, 5.1 + (screenHeight / 2), front - 0.04);
    screen.setEnabled(false);

    addCollider(scene, root, new BABYLON.Vector3(0, (centerY + (height / 2) + 0.6) / 2, 0.3), width + 1.4, centerY + (height / 2) + 0.6, 2.4, "post");

    return {
        animate: (dt) => {
            ticker.texture.uOffset = (ticker.texture.uOffset + (dt * 0.045)) % 1;
        },
        showScreen: (show) => {
            screen.setEnabled(show);
            for (const mesh of decor) {
                mesh.setEnabled(!show);
            }
        },
        screen: screenTexture.getContext() as CanvasRenderingContext2D,
        screenSize: screenPixels,
        updateScreen: () => screenTexture.update(),
        setTicker: ticker.setText,
    };
}

/** Merges meshes (built in the parent's frame) into one under `parent`. */
function mergeInto(name: string, meshes: BABYLON.Mesh[], parent: BABYLON.Node, material: BABYLON.Material): BABYLON.Mesh[] {
    const merged = BABYLON.Mesh.MergeMeshes(meshes, true, true);
    if (!merged) {
        return [];
    }
    merged.name = name;
    attach(merged, parent, material);
    return [merged];
}

function createTicker(scene: BABYLON.Scene, width: number, height: number): { mesh: BABYLON.Mesh; texture: BABYLON.DynamicTexture; setText: (text: string) => void } {
    const textureWidth = 4096;
    const textureHeight = 128;
    const texture = new BABYLON.DynamicTexture("work-ticker-texture", { width: textureWidth, height: textureHeight }, scene, true);
    texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    // Same aspect ratio as the strip, so the letters aren't stretched.
    texture.uScale = (width / height) / (textureWidth / textureHeight);
    const context = texture.getContext() as CanvasRenderingContext2D;
    let text = TICKER_TEXT;
    const draw = () => {
        context.fillStyle = PALETTE.navyDeep;
        context.fillRect(0, 0, textureWidth, textureHeight);
        context.font = `900 64px ${FONT}`;
        context.textBaseline = "middle";
        // Whole copies of the text across the width (squeezed or stretched a little to fit), so
        // it tiles seamlessly as it scrolls.
        const textWidth = context.measureText(text).width;
        const copies = Math.max(1, Math.round(textureWidth / textWidth));
        const step = textureWidth / copies;
        for (let i = 0; i < copies; i++) {
            context.setTransform(step / textWidth, 0, 0, 1, i * step, 0);
            let x = 0;
            for (const word of text.split(/(\u25B2)/)) {
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
        void document.fonts.load("900 40px Nunito").then(draw).catch(() => undefined);
    }

    const material = new BABYLON.StandardMaterial("work-ticker-material", scene);
    material.disableLighting = true;
    material.emissiveTexture = texture;
    material.diffuseColor = BABYLON.Color3.Black();
    const mesh = BABYLON.MeshBuilder.CreatePlane("work-ticker", { width, height }, scene);
    mesh.material = material;
    mesh.isPickable = false;
    const setText = (next: string) => {
        if (next !== text) {
            text = next;
            draw();
        }
    };
    return { mesh, texture, setText };
}

// ==================================================================== Trade buttons

const BUTTON_STYLE = {
    buy: { label: "BUY", arrow: "\u25B2", color: PALETTE.mint },
    sell: { label: "SELL", arrow: "\u25BC", color: PALETTE.pink },
};

/**
 * A big round arcade button on a post, facing the camera, for the minigame: shoot it to press it.
 * Built at (x, z) in the corner's frame.
 */
function createTradeButton(scene: BABYLON.Scene, frame: Frame, materials: Materials, kind: "buy" | "sell", x: number, z: number): TradeButton & { animate: (dt: number) => void } {
    const style = BUTTON_STYLE[kind];
    const id = `work-button-${kind}`;
    const root = createAnchor(scene, id, frame, x, z, 1.2);
    const discY = 6.2;

    attach(createRoundedBox(`${id}-base`, 2.8, 0.6, 2.8, 0.25, scene), root, materials.sand).position.y = 0.3;
    const post = attach(createRoundedBox(`${id}-post`, 0.8, discY, 0.8, 0.3, scene), root, materials.wood);
    post.position.set(0, (discY / 2) + 0.3, 0.6);

    // Cylinders stand along Y; tip them so their faces point at the camera (-Z).
    const holder = new BABYLON.TransformNode(`${id}-holder`, scene);
    holder.parent = root;
    holder.position.set(0, discY, 0);
    holder.rotation.x = -Math.PI / 2;
    const rim = attach(BABYLON.MeshBuilder.CreateCylinder(`${id}-rim`, { diameter: 5, height: 0.8, tessellation: 40 }, scene), holder, materials.navy);
    rim.position.y = 0.1;

    // The cap is what moves in when the button is pressed.
    const cap = new BABYLON.TransformNode(`${id}-cap`, scene);
    cap.parent = holder;
    const face = attach(BABYLON.MeshBuilder.CreateCylinder(`${id}-face`, { diameter: 4.1, height: 0.7, tessellation: 40 }, scene), cap, kind === "buy" ? materials.mint : materials.pink, true);
    face.position.y = 0.6;
    const label = createButtonLabel(scene, `${id}-label`, style.arrow, style.label);
    label.parent = cap;
    label.position.y = 0.97;
    label.rotation.x = Math.PI / 2;
    label.metadata = { keepUnfrozen: true };

    const onHit = new BABYLON.Observable<void>();
    root.computeWorldMatrix(true);
    const scale = root.scaling.x;
    const position = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(0, discY, -0.5), root.getWorldMatrix());
    const rotation = BABYLON.Quaternion.RotationYawPitchRoll(root.rotation.y, 0, 0);
    // Only shots press it; the tank driving into it just bumps.
    addStaticBox(scene, position, 5 * scale, 5 * scale, 1.6 * scale, {
        rotation,
        sound: "post",
        onHit: (body) => {
            if (getSoundMaterial(body) === "ball") {
                onHit.notifyObservers();
            }
        },
    });
    addStaticBox(scene, BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(0, discY / 2, 0.6), root.getWorldMatrix()), 1.2 * scale, discY * scale, 1.2 * scale, { rotation, sound: "post" });

    let pressed = 0;
    return {
        position,
        onHit,
        press: () => {
            pressed = 1;
        },
        animate: (dt) => {
            if (pressed <= 0 && cap.position.y === 0) {
                return;
            }
            pressed = Math.max(0, pressed - (dt * 3));
            // In fast, back out slowly.
            cap.position.y = -0.45 * Math.sin(Math.min(1, pressed) * Math.PI * 0.5);
        },
    };
}

function createButtonLabel(scene: BABYLON.Scene, name: string, arrow: string, text: string): BABYLON.Mesh {
    const size = 256;
    const texture = new BABYLON.DynamicTexture(`${name}-texture`, { width: size, height: size }, scene, true);
    texture.hasAlpha = true;
    const context = texture.getContext() as CanvasRenderingContext2D;
    const draw = () => {
        context.clearRect(0, 0, size, size);
        context.fillStyle = PALETTE.navyDeep;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = `900 54px ${FONT}`;
        context.fillText(arrow, size / 2, size * 0.32);
        context.font = `900 ${text.length > 3 ? 70 : 80}px ${FONT}`;
        context.fillText(text, size / 2, size * 0.64);
        texture.update();
    };
    draw();
    if ("fonts" in document) {
        void document.fonts.load("900 40px Nunito").then(draw).catch(() => undefined);
    }
    const material = new BABYLON.StandardMaterial(`${name}-material`, scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    material.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    const plane = BABYLON.MeshBuilder.CreatePlane(name, { size: 3.4 }, scene);
    plane.material = material;
    plane.isPickable = false;
    return plane;
}

// ==================================================================== Briefcase

/** A pushable briefcase with a padlock and a CONFIDENTIAL stamp. */
function createBriefcase(scene: BABYLON.Scene, frame: Frame, materials: Materials): void {
    const size = { width: 5, height: 3.8, depth: 1.6 };
    const collider = BABYLON.MeshBuilder.CreateBox("work-briefcase-collider", size, scene);
    collider.position.copyFrom(frame.toWorld(-4, (size.height / 2) + 0.05, -9));
    collider.rotation.y = frame.yaw - 0.35;
    collider.isVisible = false;
    collider.isPickable = false;
    const impostor = new BABYLON.PhysicsImpostor(collider, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 2, friction: 0.6, restitution: 0.05 }, scene);
    collider.physicsImpostor = impostor;
    const body = impostor.physicsBody as { linearDamping?: number; angularDamping?: number } | null;
    if (body) {
        body.linearDamping = 0.15;
        body.angularDamping = 0.3;
    }

    const add = (mesh: BABYLON.Mesh, material: BABYLON.Material) => attach(mesh, collider, material, true);
    add(createRoundedBox("work-briefcase-body", size.width, size.height, size.depth, 0.35, scene), materials.leather);
    // A band round the middle where the lid closes.
    add(createRoundedBox("work-briefcase-band", size.width + 0.08, 0.35, size.depth + 0.08, 0.12, scene, 2), materials.leatherDark).position.y = 0.55;

    const handlePath: BABYLON.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
        const angle = (i / 12) * Math.PI;
        handlePath.push(new BABYLON.Vector3(Math.cos(angle) * 0.9, (size.height / 2) + (Math.sin(angle) * 0.7), 0));
    }
    add(BABYLON.MeshBuilder.CreateTube("work-briefcase-handle", { path: handlePath, radius: 0.16, tessellation: 10, cap: BABYLON.Mesh.CAP_ALL }, scene), materials.leatherDark);

    // Latches and a padlock hanging from the middle.
    const front = -(size.depth / 2);
    for (const side of [-1, 1]) {
        add(createRoundedBox(`work-briefcase-latch-${side}`, 0.6, 0.5, 0.2, 0.08, scene, 1), materials.gold).position.set(side * 1.6, 0.55, front - 0.08);
    }
    const shackle = add(BABYLON.MeshBuilder.CreateTorus("work-briefcase-shackle", { diameter: 0.6, thickness: 0.12, tessellation: 20 }, scene), materials.gold);
    shackle.rotation.x = Math.PI / 2;
    shackle.position.set(0, 0.45, front - 0.15);
    add(createRoundedBox("work-briefcase-lock", 0.8, 0.7, 0.3, 0.12, scene, 2), materials.gold).position.set(0, -0.05, front - 0.18);

    const stamp = createStamp(scene);
    stamp.parent = collider;
    stamp.position.set(0, -1, front - 0.02);
    stamp.rotation.z = 0.12;
    stamp.metadata = { keepUnfrozen: true };
}

function createStamp(scene: BABYLON.Scene): BABYLON.Mesh {
    const width = 512;
    const height = 128;
    const texture = new BABYLON.DynamicTexture("work-stamp-texture", { width, height }, scene, true);
    texture.hasAlpha = true;
    const context = texture.getContext() as CanvasRenderingContext2D;
    const draw = () => {
        context.clearRect(0, 0, width, height);
        context.strokeStyle = PALETTE.stamp;
        context.lineWidth = 10;
        roundRect(context, 10, 10, width - 20, height - 20, 18);
        context.stroke();
        context.fillStyle = PALETTE.stamp;
        context.font = `900 66px ${FONT}`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("CONFIDENTIAL", width / 2, (height / 2) + 4);
        texture.update();
    };
    draw();
    if ("fonts" in document) {
        void document.fonts.load("900 40px Nunito").then(draw).catch(() => undefined);
    }

    const material = new BABYLON.StandardMaterial("work-stamp-material", scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    const plane = BABYLON.MeshBuilder.CreatePlane("work-stamp", { width: 3.4, height: 0.85 }, scene);
    plane.material = material;
    plane.isPickable = false;
    return plane;
}
