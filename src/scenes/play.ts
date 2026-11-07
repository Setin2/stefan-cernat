import * as BABYLON from "@babylonjs/core";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Node } from "@babylonjs/core/node";
import type { AdvancedDynamicTexture, Rectangle } from "@babylonjs/gui";

import { instantiateTrees, TREE_POSITIONS } from "./trees";
import { instantiateBricks } from "./bricks";
import { initializeTankMovement, initializeShooting } from "./tank";
import { createToyTank, type ToyTank } from "./toyTank";
import { restyleLandmarks } from "./landmarks";
import { decorateGround } from "./ground";
import { restyleFruitFactory } from "./fruitFactory";
import { restyleMascots } from "./mascots";
import { createAiTrophies } from "./aiTrophies";
import { createWaypointSigns } from "./waypointSigns";
import { createTankTrail } from "./tankTrail";
import { createClouds } from "./clouds";
import { createFruitFactorySigns } from "./fruitFactorySigns";
import { collideWithRamps, createPlayground } from "./playground";
import { UI, createCard, createKeycap, createRow, createSpacer, createText, refreshWhenFontLoaded, type GuiModule } from "./uiStyle";
import { initializeShadows } from "./shadows";

export default class Play extends Node {
    private scene!: BABYLON.Scene;
    private camera!: BABYLON.FreeCamera;
    private bullet!: BABYLON.Sound;
    private tankSound!: BABYLON.Sound;
    private brickSound!: BABYLON.Sound;
    private tank!: BABYLON.AbstractMesh;
    private toyTank: ToyTank | null = null;
    private divFps: HTMLElement | null = null;
    private controlOverlayTexture: AdvancedDynamicTexture | null = null;
    private controlOverlayPanel: Rectangle | null = null;
    private controlOverlayHint: ControlHint | null = null;
    private controlDismissTimer: ReturnType<typeof setTimeout> | null = null;
    private isAudioMuted = false;
    private readonly handleControlHotkeys = (event: KeyboardEvent) => {
        if (event.repeat) {
            return;
        }

        const key = event.key.toLowerCase();
        if (key === "h") {
            this.toggleControlOverlay();
            return;
        }

        if (key === "escape") {
            this.hideControlOverlay();
            return;
        }

        if (key === "m") {
            this.toggleAudioMute();
        }
    };

    // @ts-ignore Babylon attaches script classes without calling Node's public constructor shape.
    protected constructor() {}

    /**
     * Called when the node is being initialized.
     * This function is called immediately after the constructor has been called.
     */
    public onInitialize(): void {
        this.initializeGlobalVariables();
        this.initializeTextures();
        this.divFps = document.getElementById("fps");
        this.configureFpsCounter();

        // Set physics after the required scene nodes are available.
        this.scene.enablePhysics();
        this.scene.getPhysicsEngine()?.setGravity(new BABYLON.Vector3(0, -40, 0));
        this.configurePhysicsSubsteps();

        this.easterEgg();
        this.play();
        this.optimizeScene();
        this.skipSleepingBodySync();

        this.onDisposeObservable.addOnce(() => {
            this.disposeControlOverlay();
        });
    }

    /**
     * Might add other easter eggs later if I feel like it
     */
    public easterEgg(): void {
        console.log("%c Very sly of you, but there is nothing to see here ;)", "color: #CE718F");
    }

    /**
     * Initialize constant variables and functionalities of the game
     */
    public play(): void {
        const rotationSpeed = 0.07;
        const forward = new BABYLON.Vector3(0, 0, 1);

        this.initializeTankModel();
        createTankTrail(this.scene, this.tank);
        instantiateTrees({ scene: this.scene });
        restyleLandmarks(this.scene);
        restyleFruitFactory(this.scene);
        createFruitFactorySigns(this.scene);
        restyleMascots(this.scene);
        try {
            createAiTrophies(this.scene);
        } catch (error) {
            console.error("AI trophies failed", error);
        }
        createWaypointSigns(this.scene);
        try {
            createPlayground(this.scene);
        } catch (error) {
            console.error("Playground failed", error);
        }
        instantiateBricks({ scene: this.scene, tank: this.tank, brickSound: this.brickSound }, -5, 8, -30, 3, [6, 6, 4, 2], 0);
        // Center and angle match where this wall has always been placed (it was previously
        // built at (130, -50) and then rotated 300 rad around the world origin).
        instantiateBricks({ scene: this.scene, tank: this.tank, brickSound: this.brickSound }, 47.1152, 8, 131.0731, 4, [6, 6, 6, 4], 4.6903);
        // New brick builds to knock over: a pyramid south of the start and a tower in the north-west.
        instantiateBricks({ scene: this.scene, tank: this.tank, brickSound: this.brickSound }, 25, 8, -100, 5, [5, 4, 3, 2, 1], 0.3);
        instantiateBricks({ scene: this.scene, tank: this.tank, brickSound: this.brickSound }, -64, 8, 76, 6, [1, 1, 1, 1, 1, 1], 0.4);
        // After the bricks: walls measure the ground height with a ray, and decorations avoid them.
        decorateGround(this.scene, TREE_POSITIONS);
        try {
            createClouds(this.scene, this.tank, this.camera);
        } catch (error) {
            console.error("Clouds failed", error);
        }
        try {
            this.initializeShadows();
        } catch (error) {
            console.error("Shadow initialization failed", error);
        }
        initializeTankMovement({ scene: this.scene, tank: this.tank, camera: this.camera, divFps: this.divFps, tankSound: this.tankSound, bullet: this.bullet }, rotationSpeed);
        void initializeShooting({
            scene: this.scene,
            tank: this.tank,
            camera: this.camera,
            divFps: this.divFps,
            tankSound: this.tankSound,
            bullet: this.bullet,
            onShoot: this.toyTank ? () => this.toyTank?.fire() : undefined,
            shotOrigin: this.toyTank?.muzzle,
        }, forward);
        void this.showControl();
    }

    /**
     * Swaps the imported tank model for the toy tank built in code. Add `?tank=classic` to the URL
     * to get the original model back for comparison.
     */
    private initializeTankModel(): void {
        const useClassicTank = new URLSearchParams(window.location.search).get("tank") === "classic";
        if (useClassicTank) {
            return;
        }

        try {
            this.toyTank = createToyTank(this.scene, this.tank);
            this.scene.getMeshByName("tank")?.setEnabled(false);
        } catch (error) {
            console.error("Toy tank creation failed, keeping the original model", error);
            this.toyTank?.root.dispose();
            this.toyTank = null;
        }
    }

    /**
     * Sunlight and shadows (see shadows.ts).
     */
    public initializeShadows(): void {
        initializeShadows(this.scene, {
            camera: this.camera,
            focus: () => this.tank.position,
        });
    }

    /**
     * Creates the reusable help overlay and shows it on first load.
     */
    public async showControl(): Promise<void> {
        const gui = await import("@babylonjs/gui");

        if (this.scene.isDisposed) {
            return;
        }

        this.disposeControlOverlay();

        const advancedTexture = gui.AdvancedDynamicTexture.CreateFullscreenUI("control-overlay", true, this.scene);
        const { panel, hint } = createControlOverlay(gui, advancedTexture, {
            onToggle: () => this.toggleControlOverlay(),
            onClose: () => this.hideControlOverlay(),
            onToggleMute: () => this.toggleAudioMute(),
            isTouchDevice: window.matchMedia("(pointer: coarse)").matches,
        });

        this.controlOverlayTexture = advancedTexture;
        this.controlOverlayPanel = panel;
        this.controlOverlayHint = hint;
        this.updateControlHint();

        window.addEventListener("keydown", this.handleControlHotkeys);

        this.controlDismissTimer = setTimeout(() => {
            this.hideControlOverlay();
        }, 10000);
    }

    public configureFpsCounter(): void {
        if (!this.divFps) {
            return;
        }

        const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
        this.divFps.hidden = isTouchDevice;
    }
    /**
     * Initializes the shared scene objects used across the gameplay helpers.
     */
    public initializeGlobalVariables(): void {
        this.scene = this.getScene();

        const camera = this.scene.getCameraByName("free_camera");
        if (!(camera instanceof BABYLON.FreeCamera)) {
            throw new Error("Missing required free_camera in the scene.");
        }

        const tank = this.scene.getMeshByName("tank_holder");
        if (!tank) {
            throw new Error("Missing required tank_holder mesh in the scene.");
        }

        this.camera = camera;
        this.tank = tank;

        this.bullet = new BABYLON.Sound("music", "assets/sounds/bullet.wav", this.scene, null, { loop: false, volume: 0.5 });
        this.tankSound = new BABYLON.Sound("tank", "assets/sounds/splash.mp3", this.scene, null, { loop: false, volume: 1 });
        this.brickSound = new BABYLON.Sound("brick", "assets/sounds/brick.mp3", this.scene, null, { loop: false, volume: 0.5 });

        this.tank.physicsImpostor = new BABYLON.PhysicsImpostor(this.tank, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1000, restitution: 0 }, this.scene);

        // Movement sets the tank's velocity every frame, so linear damping isn't needed. Keep strong
        // angular damping so knocks from bricks can't spin the tank between frames.
        const physicsBody = this.tank.physicsImpostor.physicsBody;
        if (physicsBody) {
            physicsBody.angularDamping = 0.98;
        }
    }

    /**
     * By default Babylon advances cannon.js with one step per frame, sized to the frame time. At
     * 60 fps a shot (200 units/s) moves ~3.3 units per step, about the thickness of a brick, so it
     * can pass straight through; at lower frame rates it gets worse. Splitting each frame into
     * equal sub-steps of at most 1/120s keeps the simulation stable at any frame rate while still
     * advancing exactly the frame's time, so motion stays smooth.
     */
    /**
     * Babylon copies every physics body's transform to its mesh (and back) on every physics step.
     * Bodies that cannon.js has put to sleep (settled bricks, cones, trophies) don't move, so that
     * work is skipped for them until something wakes them up.
     */
    private skipSleepingBodySync(): void {
        const SLEEPING = 2;
        for (const impostor of this.scene.getPhysicsEngine()?.getImpostors() ?? []) {
            const body = impostor.physicsBody as { sleepState?: number } | null;
            if (!body || impostor.mass === 0 || impostor.object === this.tank) {
                continue;
            }
            // Loose objects also land on and bump into the ramps (the tank rides them instead).
            collideWithRamps(impostor);
            const beforeStep = impostor.beforeStep;
            const afterStep = impostor.afterStep;
            // The two always run as a pair (a body can fall asleep during the step).
            let synced = false;
            impostor.beforeStep = () => {
                synced = body.sleepState !== SLEEPING;
                if (synced) {
                    beforeStep();
                }
            };
            impostor.afterStep = () => {
                if (synced) {
                    afterStep();
                }
            };
        }
    }

    private configurePhysicsSubsteps(): void {
        const plugin = this.scene.getPhysicsEngine()?.getPhysicsPlugin();
        if (!plugin) {
            return;
        }

        // Performance: resting bodies (bricks, trophies, spent shots) fall asleep and stop being
        // simulated until something hits them, and the broadphase sorts bodies along an axis
        // instead of testing every pair against every other. The tank never sleeps, since it's
        // moved by setting its velocity.
        const cannonPlugin = plugin as unknown as { world?: { allowSleep: boolean; broadphase: unknown }; BJSCANNON?: { SAPBroadphase?: new (world: unknown) => unknown } };
        const world = cannonPlugin.world;
        if (world) {
            world.allowSleep = true;
            const SAPBroadphase = cannonPlugin.BJSCANNON?.SAPBroadphase;
            if (SAPBroadphase) {
                world.broadphase = new SAPBroadphase(world);
            }
        }
        const tankBody = this.tank.physicsImpostor?.physicsBody as { allowSleep?: boolean } | undefined;
        if (tankBody) {
            tankBody.allowSleep = false;
        }

        const maxSubStepSeconds = 1 / 120;
        const executeStep = plugin.executeStep.bind(plugin);
        plugin.executeStep = (delta, impostors) => {
            const subSteps = Math.max(1, Math.ceil(delta / maxSubStepSeconds - 1e-6));
            const subStepSeconds = delta / subSteps;
            for (let i = 0; i < subSteps; i++) {
                executeStep(subStepSeconds, impostors);
            }
        };
    }

    /**
     * Initializes textures manually to keep them loading reliably in production builds.
     */
    public initializeTextures(): void {
        const fruitFactoryScreen = this.scene.getMeshByName("monitor");
        const screenMaterial = fruitFactoryScreen?.material;
        if (screenMaterial && "albedoTexture" in screenMaterial) {
            screenMaterial.albedoTexture = new Texture("assets/models/projects/monitor (Base Color).png", this.scene);
        }
    }

    public optimizeScene(): void {
        this.scene.skipPointerMovePicking = true;
        this.scene.skipPointerDownPicking = true;
        this.scene.skipPointerUpPicking = true;
        // Materials are not frozen: frozen materials bind the light and shadow data only once, so
        // the shadow map (which follows the camera) would never show up on them.
        this.getEngine().enableOfflineSupport = false;
        this.scene.blockMaterialDirtyMechanism = true;
        this.scene.collisionsEnabled = false;

        // disable mouse interactions
        this.scene.pointerMovePredicate = () => false;
        this.scene.pointerDownPredicate = () => false;
        this.scene.pointerUpPredicate = () => false;

        const movableMeshes = new Set(["tank", "tank_holder", "amongus", "splatter1", "splatter2", "splatter3"]);
        this.scene.meshes
            .filter((mesh) => !mesh.physicsImpostor && !movableMeshes.has(mesh.name) && !mesh.isDescendantOf(this.tank) && !mesh.metadata?.keepUnfrozen)
            .forEach((mesh) => {
                mesh.isPickable = false;
                mesh.doNotSyncBoundingInfo = true;
                mesh.freezeWorldMatrix();
            });
    }

    private clearControlDismissTimer(): void {
        if (this.controlDismissTimer) {
            clearTimeout(this.controlDismissTimer);
            this.controlDismissTimer = null;
        }
    }

    private disposeControlOverlay(): void {
        this.clearControlDismissTimer();

        window.removeEventListener("keydown", this.handleControlHotkeys);

        if (this.controlOverlayTexture) {
            this.controlOverlayTexture.dispose();
            this.controlOverlayTexture = null;
        }

        this.controlOverlayPanel = null;
        this.controlOverlayHint = null;
    }

    private toggleControlOverlay(): void {
        if (!this.controlOverlayPanel) {
            return;
        }

        // Manual interaction takes over; don't let the first-load auto-dismiss hide a reopened panel.
        this.clearControlDismissTimer();
        this.controlOverlayPanel.isVisible = !this.controlOverlayPanel.isVisible;
        this.updateControlHint();
    }

    private hideControlOverlay(): void {
        this.clearControlDismissTimer();

        if (!this.controlOverlayPanel || !this.controlOverlayPanel.isVisible) {
            return;
        }

        this.controlOverlayPanel.isVisible = false;
        this.updateControlHint();
    }

    private toggleAudioMute(): void {
        this.isAudioMuted = !this.isAudioMuted;
        BABYLON.Engine.audioEngine?.setGlobalVolume(this.isAudioMuted ? 0 : 1);
        this.updateControlHint();
    }

    private updateControlHint(): void {
        if (!this.controlOverlayHint) {
            return;
        }

        this.controlOverlayHint.update(!!this.controlOverlayPanel?.isVisible, this.isAudioMuted);
    }
}

/** The small badge in the top-right corner showing the H and M shortcuts. */
type ControlHint = { update: (helpVisible: boolean, muted: boolean) => void };

/**
 * The "how to play" card (bottom right, shown on first load) and the shortcut badge in the top
 * right corner, in the same toy style as the rest of the UI.
 */
function createControlOverlay(
    gui: GuiModule,
    ui: AdvancedDynamicTexture,
    options: {
        onToggle: () => void;
        onClose: () => void;
        onToggleMute: () => void;
        isTouchDevice: boolean;
    },
): { panel: Rectangle; hint: ControlHint } {
    const panel = createCard(gui, "controls-panel", { radius: 20 });
    panel.width = options.isTouchDevice ? "92%" : "370px";
    panel.height = "1px";
    panel.adaptHeightToChildren = true;
    panel.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_BOTTOM;
    panel.left = options.isTouchDevice ? "-4%" : "-22px";
    panel.top = "-24px";
    panel.isPointerBlocker = true;

    const stack = new gui.StackPanel("controls-panel-stack");
    stack.isVertical = true;
    stack.paddingTop = "16px";
    stack.paddingBottom = "18px";
    panel.addControl(stack);

    const eyebrow = createText(gui, "controls-eyebrow", "HOW TO PLAY", { size: 12, weight: "900", color: UI.pinkDeep });
    eyebrow.height = "18px";
    eyebrow.paddingLeft = "20px";
    stack.addControl(eyebrow);

    const title = createText(gui, "controls-title", options.isTouchDevice ? "Best on a desktop" : "Drive, aim and explore", { size: 24, weight: "900", color: UI.navy });
    title.height = "36px";
    title.paddingLeft = "20px";
    stack.addControl(title);

    const description = createText(gui, "controls-description", options.isTouchDevice
        ? "The portfolio is built around keyboard driving. You can look around here, but driving and shooting need a keyboard."
        : "Drive the tank between the projects and shoot the glowing targets to open links.", { size: 14, weight: "700", color: UI.muted });
    description.textWrapping = true;
    description.resizeToFit = true;
    description.paddingLeft = "20px";
    description.paddingRight = "20px";
    description.paddingBottom = "10px";
    stack.addControl(description);

    // One row per control: keycaps, then what they do.
    const rows: { keys: string[]; text: string }[] = [
        { keys: ["W", "A", "S", "D"], text: "Drive the tank" },
        { keys: ["E"], text: "Shoot glowing targets" },
        { keys: ["H"], text: "Show or hide this help" },
        { keys: ["M"], text: "Sound on or off" },
        { keys: ["Esc"], text: "Close the help" },
    ];
    rows.forEach((row, index) => {
        const line = createRow(gui, `controls-line-${index}`, 36);
        line.paddingLeft = "20px";
        line.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
        const keys = createRow(gui, `controls-keys-${index}`, 36);
        keys.width = "130px";
        row.keys.forEach((key, k) => {
            const cap = createKeycap(gui, `controls-key-${index}-${k}`, key);
            cap.paddingRight = "4px";
            cap.width = `${parseInt(String(cap.width), 10) + 4}px`;
            keys.addControl(cap);
        });
        line.addControl(keys);
        const text = createText(gui, `controls-text-${index}`, row.text, { size: 15, weight: "800", color: UI.text });
        text.width = "200px";
        line.addControl(text);
        stack.addControl(line);
    });

    const actions = createRow(gui, "controls-actions", 56);
    actions.paddingTop = "14px";
    actions.paddingLeft = "20px";
    actions.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    stack.addControl(actions);

    const closeButton = createButton(gui, "controls-close", "Got it!", UI.pink, UI.navyDeep, 110);
    closeButton.onPointerClickObservable.add(() => options.onClose());
    actions.addControl(closeButton);
    actions.addControl(createSpacer(gui, "controls-actions-gap", 10));
    const muteButton = createButton(gui, "controls-mute", "Sound on/off", UI.cream, UI.navy, 130);
    muteButton.onPointerClickObservable.add(() => options.onToggleMute());
    actions.addControl(muteButton);

    // Shortcut badge, top right (below the FPS counter): [H] Help  [M] Mute
    const badge = createCard(gui, "controls-hint-badge", { radius: 18, thickness: 2 });
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

    const badgeRow = createRow(gui, "controls-hint-row", 42);
    badgeRow.paddingLeft = "8px";
    badgeRow.paddingRight = "8px";
    badge.addControl(badgeRow);
    const helpText = createText(gui, "controls-hint-help", "", { size: 13, weight: "800", color: UI.navy });
    const muteText = createText(gui, "controls-hint-mute", "", { size: 13, weight: "800", color: UI.navy });
    for (const [key, text] of [["H", helpText], ["M", muteText]] as const) {
        badgeRow.addControl(createKeycap(gui, `controls-hint-key-${key}`, key));
        text.resizeToFit = true;
        text.paddingLeft = "7px";
        text.paddingRight = "9px";
        badgeRow.addControl(text);
    }
    badge.onPointerClickObservable.add(() => options.onToggle());

    ui.addControl(panel);
    ui.addControl(badge);
    refreshWhenFontLoaded(ui);

    const hint: ControlHint = {
        update(helpVisible, muted) {
            helpText.text = helpVisible ? "Hide help" : "Help";
            muteText.text = muted ? "Unmute" : "Mute";
        },
    };
    return { panel, hint };
}

/** Chunky rounded button with a hard shadow. */
function createButton(gui: GuiModule, name: string, label: string, background: string, color: string, width: number) {
    const button = gui.Button.CreateSimpleButton(name, label);
    button.width = `${width}px`;
    button.height = "40px";
    button.thickness = 3;
    button.cornerRadius = 20;
    button.color = UI.navy;
    button.background = background;
    button.shadowColor = UI.shadow;
    button.shadowOffsetY = 3;
    button.shadowBlur = 0;
    button.fontFamily = UI.font;
    button.fontWeight = "900";
    button.fontSize = 14;
    if (button.textBlock) {
        button.textBlock.color = color;
    }
    button.hoverCursor = "pointer";
    button.pointerEnterAnimation = () => {
        button.scaleX = 1.04;
        button.scaleY = 1.04;
    };
    button.pointerOutAnimation = () => {
        button.scaleX = 1;
        button.scaleY = 1;
    };
    return button;
}
