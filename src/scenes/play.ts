import * as BABYLON from "@babylonjs/core";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Node } from "@babylonjs/core/node";
import type { AdvancedDynamicTexture, Rectangle, TextBlock } from "@babylonjs/gui";

import { instantiateTrees } from "./trees";
import { instantiateBricks } from "./bricks";
import { initializeTankMovement, initializeShooting } from "./tank";

export default class Play extends Node {
    private scene!: BABYLON.Scene;
    private camera!: BABYLON.FreeCamera;
    private bullet!: BABYLON.Sound;
    private tankSound!: BABYLON.Sound;
    private brickSound!: BABYLON.Sound;
    private tank!: BABYLON.AbstractMesh;
    private divFps: HTMLElement | null = null;
    private controlOverlayTexture: AdvancedDynamicTexture | null = null;
    private controlOverlayPanel: Rectangle | null = null;
    private controlOverlayHint: TextBlock | null = null;
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
        this.camera.lockedTarget = this.tank;
        this.scene.enablePhysics();
        this.scene.getPhysicsEngine()?.setGravity(new BABYLON.Vector3(0, -40, 0));

        this.easterEgg();
        this.play();
        this.optimizeScene();

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

        instantiateTrees({ scene: this.scene });
        instantiateBricks({ scene: this.scene, tank: this.tank, brickSound: this.brickSound }, -5, 8, -30, 3, [6, 6, 4, 2], 0);
        instantiateBricks({ scene: this.scene, tank: this.tank, brickSound: this.brickSound }, 130, 8, -50, 4, [6, 6, 6, 4], 300);
        try {
            this.initializeShadows();
        } catch (error) {
            console.error("Shadow initialization failed", error);
        }
        initializeTankMovement({ scene: this.scene, tank: this.tank, camera: this.camera, divFps: this.divFps, tankSound: this.tankSound, bullet: this.bullet }, rotationSpeed);
        void initializeShooting({ scene: this.scene, tank: this.tank, camera: this.camera, divFps: this.divFps, tankSound: this.tankSound, bullet: this.bullet }, forward);
        void this.showControl();
    }

    /**
     * Creates a dedicated shadow-casting light and applies shadows to visible scene meshes.
     */
    public initializeShadows(): void {
        const lightDirection = new BABYLON.Vector3(-1, -2, -1).normalize();

        const shadowLight = new BABYLON.DirectionalLight(
            "shadow_sun",
            lightDirection,
            this.scene,
        );
        shadowLight.position = new BABYLON.Vector3(60, 220, 40);
        shadowLight.intensity = 0.65;
        shadowLight.shadowMinZ = 1;
        shadowLight.shadowMaxZ = 500;
        shadowLight.autoCalcShadowZBounds = false;
        shadowLight.autoUpdateExtends = false;
        shadowLight.orthoLeft = -220;
        shadowLight.orthoRight = 220;
        shadowLight.orthoTop = 220;
        shadowLight.orthoBottom = -220;

        const shadowGenerator = new BABYLON.ShadowGenerator(2048, shadowLight);
        shadowGenerator.usePercentageCloserFiltering = true;
        shadowGenerator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_HIGH;
        shadowGenerator.bias = 0.0015;
        shadowGenerator.normalBias = 0.05;
        shadowGenerator.depthScale = 25;
        shadowGenerator.forceBackFacesOnly = true;
        shadowGenerator.setDarkness(0.25);

        const shadowMap = shadowGenerator.getShadowMap();
        if (!shadowMap) {
            return;
        }

        const excludedShadowMeshes = new Set([
            "ball",
            "splatter1",
            "splatter2",
            "splatter3",
            "ffdescription",
            "monitor",
        ]);

        const shouldCastShadow = (mesh: BABYLON.AbstractMesh): boolean => {
            if (excludedShadowMeshes.has(mesh.name)) {
                return false;
            }

            const normalizedName = mesh.name.toLowerCase();
            const sourceName = mesh instanceof BABYLON.InstancedMesh ? mesh.sourceMesh.name.toLowerCase() : "";
            const searchableName = `${normalizedName} ${sourceName}`;

            return searchableName.includes("tank") ||
                searchableName.includes("brick") ||
                searchableName.includes("tree-trunk") ||
                searchableName.includes("tree-leaves") ||
                searchableName.includes("text") ||
                searchableName.includes("arrow") ||
                searchableName.includes("project") ||
                searchableName.includes("target") ||
                searchableName.includes("podium") ||
                searchableName.includes("practice") ||
                searchableName.includes("github") ||
                searchableName.includes("linkedin") ||
                searchableName.includes("twitter") ||
                searchableName.includes("amongus") ||
                searchableName.includes("statue") ||
                searchableName.includes("berserk") ||
                searchableName.includes("guts") ||
                searchableName.includes("monument") ||
                searchableName.includes("table") ||
                searchableName.includes("desk") ||
                searchableName.includes("chair");
        };

        this.scene.meshes.forEach((mesh) => {
            if (!mesh.isEnabled() || !mesh.isVisible) {
                return;
            }

            if (mesh instanceof BABYLON.Mesh && mesh.material) {
                mesh.receiveShadows = true;
            } else if (mesh instanceof BABYLON.InstancedMesh && mesh.sourceMesh.material) {
                mesh.sourceMesh.receiveShadows = true;
            }

            if (shouldCastShadow(mesh)) {
                shadowGenerator.addShadowCaster(mesh, false);
            }
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

        const physicsBody = this.tank.physicsImpostor.physicsBody;
        if (physicsBody) {
            physicsBody.linearDamping = 0.6;
            physicsBody.angularDamping = 0.98;
        }
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

        const fruitFactoryDescriptionText = this.scene.getMeshByName("ffdescription");
        const descriptionMaterial = fruitFactoryDescriptionText?.material;
        if (descriptionMaterial && "diffuseTexture" in descriptionMaterial && "opacityTexture" in descriptionMaterial) {
            const descriptionTexture = new Texture("assets/textures/fruit factory description.png", this.scene);
            descriptionMaterial.diffuseTexture = descriptionTexture;
            descriptionMaterial.opacityTexture = descriptionTexture;
        }
    }

    public optimizeScene(): void {
        this.scene.skipPointerMovePicking = true;
        this.scene.skipPointerDownPicking = true;
        this.scene.skipPointerUpPicking = true;
        this.scene.freezeMaterials();
        this.getEngine().enableOfflineSupport = false;
        this.scene.blockMaterialDirtyMechanism = true;
        this.scene.collisionsEnabled = false;

        // disable mouse interactions
        this.scene.pointerMovePredicate = () => false;
        this.scene.pointerDownPredicate = () => false;
        this.scene.pointerUpPredicate = () => false;

        const movableMeshes = new Set(["tank", "tank_holder", "amongus", "splatter1"]);
        this.scene.meshes
            .filter((mesh) => !mesh.physicsImpostor && !movableMeshes.has(mesh.name))
            .forEach((mesh) => {
                mesh.isPickable = false;
                mesh.doNotSyncBoundingInfo = true;
                mesh.freezeWorldMatrix();
            });
    }

    private disposeControlOverlay(): void {
        if (this.controlDismissTimer) {
            clearTimeout(this.controlDismissTimer);
            this.controlDismissTimer = null;
        }

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

        this.controlOverlayPanel.isVisible = !this.controlOverlayPanel.isVisible;
        this.updateControlHint();
    }

    private hideControlOverlay(): void {
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

        const soundAction = this.isAudioMuted ? "Unmute" : "Mute";
        const helpAction = this.controlOverlayPanel?.isVisible ? "Hide help" : "Show help";
        this.controlOverlayHint.text = `H ${helpAction}   M ${soundAction}`;
    }
}

type GuiModule = typeof import("@babylonjs/gui");

function createControlOverlay(
    gui: GuiModule,
    ui: AdvancedDynamicTexture,
    options: {
        onToggle: () => void;
        onClose: () => void;
        onToggleMute: () => void;
        isTouchDevice: boolean;
    },
): { panel: Rectangle; hint: TextBlock } {
    const panel = new gui.Rectangle("controls-panel");
    panel.width = options.isTouchDevice ? "92%" : "380px";
    panel.height = "1px";
    panel.adaptHeightToChildren = true;
    panel.thickness = 1;
    panel.cornerRadius = 18;
    panel.color = "rgba(255,255,255,0.14)";
    panel.background = "rgba(7, 9, 14, 0.78)";
    panel.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_BOTTOM;
    panel.paddingRight = options.isTouchDevice ? "16px" : "22px";
    panel.paddingBottom = "20px";
    panel.isPointerBlocker = true;

    const stack = new gui.StackPanel("controls-panel-stack");
    stack.isVertical = true;
    stack.width = 1;
    stack.paddingTop = "18px";
    stack.paddingBottom = "18px";
    panel.addControl(stack);

    const eyebrow = new gui.TextBlock("controls-eyebrow");
    eyebrow.text = "Controls";
    eyebrow.color = "#f7b955";
    eyebrow.fontSize = 12;
    eyebrow.fontFamily = "Inter, Segoe UI, sans-serif";
    eyebrow.height = "18px";
    eyebrow.textHorizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    eyebrow.paddingLeft = "18px";
    eyebrow.paddingRight = "18px";
    stack.addControl(eyebrow);

    const title = new gui.TextBlock("controls-title");
    title.text = options.isTouchDevice ? "Desktop gives the full experience" : "Drive, aim, and explore";
    title.color = "#f5f7ff";
    title.fontSize = 24;
    title.height = "34px";
    title.textHorizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    title.paddingTop = "4px";
    title.paddingLeft = "18px";
    title.paddingRight = "18px";
    stack.addControl(title);

    const description = new gui.TextBlock("controls-description");
    description.text = options.isTouchDevice
        ? "This portfolio is built around keyboard driving. You can still look around, but movement and shooting are best on desktop."
        : "Use the tank to move between projects and shoot glowing targets to open links.";
    description.color = "rgba(255,255,255,0.76)";
    description.fontSize = 14;
    description.textWrapping = true;
    description.resizeToFit = true;
    description.textHorizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    description.paddingTop = "10px";
    description.paddingLeft = "18px";
    description.paddingRight = "18px";
    description.paddingBottom = "8px";
    stack.addControl(description);

    [
        "W A S D  Move tank",
        "E  Shoot glowing targets",
        "H  Reopen or hide this help",
        "M  Mute or unmute sound",
        "Esc  Close the help panel",
    ].forEach((line, index) => {
        const item = new gui.TextBlock(`controls-line-${index}`);
        item.text = line;
        item.color = "#f4f7ff";
        item.fontSize = 15;
        item.height = "26px";
        item.textHorizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
        item.paddingLeft = "18px";
        item.paddingRight = "18px";
        stack.addControl(item);
    });

    const actionRow = new gui.StackPanel("controls-actions");
    actionRow.isVertical = false;
    actionRow.height = "42px";
    actionRow.paddingTop = "14px";
    actionRow.paddingLeft = "18px";
    actionRow.paddingRight = "18px";
    stack.addControl(actionRow);

    const muteButton = gui.Button.CreateSimpleButton("controls-mute", "Toggle sound");
    muteButton.width = "132px";
    muteButton.height = "38px";
    muteButton.thickness = 0;
    muteButton.cornerRadius = 18;
    muteButton.color = "#0b0d12";
    muteButton.background = "#f7b955";
    muteButton.fontSize = 14;
    muteButton.onPointerClickObservable.add(() => options.onToggleMute());
    actionRow.addControl(muteButton);

    const closeButton = gui.Button.CreateSimpleButton("controls-close", "Close");
    closeButton.width = "92px";
    closeButton.height = "38px";
    closeButton.thickness = 1;
    closeButton.cornerRadius = 18;
    closeButton.color = "#f5f7ff";
    closeButton.background = "rgba(255,255,255,0.08)";
    closeButton.fontSize = 14;
    closeButton.paddingLeft = "10px";
    closeButton.onPointerClickObservable.add(() => options.onClose());
    actionRow.addControl(closeButton);

    const hintBadge = new gui.Rectangle("controls-hint-badge");
    hintBadge.width = options.isTouchDevice ? "210px" : "198px";
    hintBadge.height = "36px";
    hintBadge.thickness = 1;
    hintBadge.cornerRadius = 18;
    hintBadge.color = "rgba(255,255,255,0.16)";
    hintBadge.background = "rgba(8, 10, 16, 0.58)";
    hintBadge.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    hintBadge.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_TOP;
    hintBadge.paddingTop = "52px";
    hintBadge.paddingRight = "12px";
    hintBadge.isPointerBlocker = true;

    const hintText = new gui.TextBlock("controls-hint-text");
    hintText.color = "#f4f7ff";
    hintText.fontSize = 13;
    hintText.fontFamily = "Inter, Segoe UI, sans-serif";
    hintBadge.addControl(hintText);

    hintBadge.onPointerClickObservable.add(() => options.onToggle());

    ui.addControl(panel);
    ui.addControl(hintBadge);

    return { panel, hint: hintText };
}
