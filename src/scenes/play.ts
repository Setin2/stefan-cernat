import * as BABYLON from "@babylonjs/core";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Node } from "@babylonjs/core/node";
import { Control, AdvancedDynamicTexture, Image } from "@babylonjs/gui";

import { instantiateTrees } from './trees';
import { instantiateBricks } from './bricks';
import { initializeTankMovement, initializeShooting } from './tank';


export default class Play extends Node {
    private scene!: BABYLON.Scene;
    private camera!: BABYLON.FreeCamera;
    private bullet!: BABYLON.Sound;
    private tankSound!: BABYLON.Sound;
    private brickSound!: BABYLON.Sound;
    private tank!: BABYLON.AbstractMesh;
    private divFps: HTMLElement | null = null;

    // @ts-ignore ignoring the super call as we don't want to re-init
    protected constructor() {}

    /**
     * Called on the node is being initialized.
     * This function is called immediatly after the constructor has been called.
     */
    public onInitialize(): void {
        this.initializeGlobalVariables();
        this.initializeTextures();
        this.optimizeScene();
        this.divFps = document.getElementById("fps");

        // Set physics after the required scene nodes are available.
        this.camera.lockedTarget = this.tank;
        this.scene.enablePhysics();
        this.scene.getPhysicsEngine()?.setGravity(new BABYLON.Vector3(0, -40, 0));

        this.easterEgg();
        this.play();
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
        initializeTankMovement({ scene: this.scene, tank: this.tank, camera: this.camera, divFps: this.divFps, tankSound: this.tankSound, bullet: this.bullet }, rotationSpeed);
        initializeShooting({ scene: this.scene, tank: this.tank, camera: this.camera, divFps: this.divFps, tankSound: this.tankSound, bullet: this.bullet }, forward);
        this.showControl();
    }

    /**
     * Add image telling the player how to control the tank (+ under developement text)
     */
    public showControl(): void {
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const image = new Image("control", "assets/textures/control_final.png");
        image.width = "250px";
        image.height = "100px";
        image.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        image.paddingBottomInPixels = 40;
        advancedTexture.addControl(image);

        setTimeout(() => {
            advancedTexture.removeControl(image);
            advancedTexture.dispose();
        }, 7500);
    }


    /**
     * Initialize all global variables that will be used in other functions
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
            physicsBody.linearDamping = 0.999;
            physicsBody.angularDamping = 1;
        }
    }

    /**
     * We have to initialize textures manually inside code, otherwise they dont show up in production for some reason
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
}
