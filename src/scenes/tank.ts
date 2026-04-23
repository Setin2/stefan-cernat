import * as BABYLON from "@babylonjs/core";
import type { AdvancedDynamicTexture, Rectangle, TextBlock } from "@babylonjs/gui";

type GuiModule = typeof import("@babylonjs/gui");

type TankContext = {
    scene: BABYLON.Scene;
    tank: BABYLON.AbstractMesh;
    camera: BABYLON.FreeCamera;
    divFps: HTMLElement | null;
    tankSound: BABYLON.Sound;
    bullet: BABYLON.Sound;
};

type TargetLink = {
    mesh: BABYLON.Mesh;
    hitRadiusSquared: number;
    url: string;
    label: string;
};

type ActiveShot = {
    mesh: BABYLON.InstancedMesh;
    dispose: () => void;
    disposeTimeout: ReturnType<typeof setTimeout>;
};

/**
 * Initialize the movement of the player tank.
 */
export function initializeTankMovement(_this: TankContext, rotationSpeed: number): void {
    const inputMap: Record<string, boolean> = {};
    const engine = _this.scene.getEngine();
    const forwardDirection = BABYLON.Vector3.Zero();
    const angularVelocity = BABYLON.Vector3.Zero();
    const nextVelocity = BABYLON.Vector3.Zero();
    const cameraTargetPosition = BABYLON.Vector3.Zero();
    const cameraFocusPoint = BABYLON.Vector3.Zero();
    const nextPosition = BABYLON.Vector3.Zero();
    const uprightRotation = BABYLON.Quaternion.Identity();
    const previousTankPosition = _this.tank.position.clone();
    const translationDelta = BABYLON.Vector3.Zero();
    const cameraOffset = _this.camera.position.subtract(_this.tank.position);
    const baseTankY = _this.tank.position.y;
    const treeTrunks = _this.scene.meshes.filter((mesh) => mesh.name.startsWith("tree-trunk"));
    const maxForwardSpeed = 38;
    const maxReverseSpeed = 20;
    const acceleration = 48;
    const deceleration = 44;
    const maxTurnSpeed = rotationSpeed * 60;
    const turnAcceleration = 12;
    const cameraFollowSharpness = 6;
    const tankCollisionRadius = getHorizontalRadius(_this.tank) * 0.55;
    let lastFpsUpdateTime = 0;
    let currentTurnSpeed = 0;
    let currentMoveSpeed = 0;
    let didTranslateThisFrame = false;

    _this.camera.lockedTarget = null;
    _this.tank.computeWorldMatrix(true);
    cameraFocusPoint.copyFrom(_this.tank.getBoundingInfo().boundingBox.centerWorld);
    _this.camera.setTarget(cameraFocusPoint);
    cameraTargetPosition.copyFrom(_this.camera.position);

    _this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");

    // Handle key down and key up events to update inputMap
    const handleKeyEvent = (evt: BABYLON.ActionEvent) => {
        inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type === "keydown";
    };

    _this.scene.actionManager = new BABYLON.ActionManager(_this.scene);
    _this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, handleKeyEvent));
    _this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, handleKeyEvent));

    // Create and manage splatter objects
    const splatterObjects = createSplatterObjects(_this);
    let currentSplatterIndex = 0;
    let tick = 0;

    // Update splatter positioning and rotation
    const updateSplatter = () => {
        if (!splatterObjects.length) {
            return;
        }

        if (++tick === 35) {
            splatterObjects[currentSplatterIndex].position.copyFrom(_this.tank.position);
        } else if (tick === 40) {
            const splatter = splatterObjects[currentSplatterIndex];
            splatter.position.y = 0;
            splatter.rotate(BABYLON.Axis.Y, Math.random() * 350 + 10, BABYLON.Space.WORLD);
            currentSplatterIndex = (currentSplatterIndex + 1) % splatterObjects.length;
            tick = 0;
            _this.tankSound.play();
        }
    };

    const applyMovement = (mesh: BABYLON.AbstractMesh, moveInput: number, deltaSeconds: number): number => {
        const physicsImpostor = mesh.physicsImpostor;
        if (!physicsImpostor) {
            return 0;
        }

        didTranslateThisFrame = false;

        const desiredSpeed = moveInput > 0 ? maxForwardSpeed : moveInput < 0 ? -maxReverseSpeed : 0;
        const speedDelta = (moveInput === 0 ? deceleration : acceleration) * deltaSeconds;
        currentMoveSpeed = moveToward(currentMoveSpeed, desiredSpeed, speedDelta);

        const yaw = getYaw(mesh);
        forwardDirection.set(Math.sin(yaw), 0, Math.cos(yaw));
        forwardDirection.normalize();

        nextPosition.copyFrom(mesh.position);
        nextPosition.y = baseTankY;
        nextPosition.addInPlace(forwardDirection.scale(currentMoveSpeed * deltaSeconds));

        if (collidesWithTree(nextPosition)) {
            currentMoveSpeed = 0;
        } else {
            mesh.position.x = nextPosition.x;
            mesh.position.z = nextPosition.z;
            didTranslateThisFrame = Math.abs(currentMoveSpeed) > 0;
        }

        nextVelocity.set(0, 0, 0);
        physicsImpostor.setLinearVelocity(nextVelocity);

        return currentMoveSpeed;
    };

    _this.scene.registerBeforeRender(() => {
        if (_this.divFps) {
            const now = performance.now();
            if (now - lastFpsUpdateTime >= 250) {
                _this.divFps.textContent = `${engine.getFps().toFixed()} fps`;
                lastFpsUpdateTime = now;
            }
        }

        const deltaSeconds = engine.getDeltaTime() / 1000;
        const moveInput = (inputMap["w"] ? 1 : 0) - (inputMap["s"] ? 1 : 0);
        const turnInput = (inputMap["d"] ? 1 : 0) - (inputMap["a"] ? 1 : 0);
        const currentForwardSpeed = applyMovement(_this.tank, moveInput, deltaSeconds);

        if (moveInput !== 0 && Math.abs(currentForwardSpeed) > 0.5) {
            updateSplatter();
        }

        const desiredTurnSpeed = turnInput * maxTurnSpeed;
        currentTurnSpeed = moveToward(currentTurnSpeed, desiredTurnSpeed, turnAcceleration * deltaSeconds);
        if (_this.tank.physicsImpostor) {
            angularVelocity.set(0, 0, 0);
            _this.tank.physicsImpostor.setAngularVelocity(angularVelocity);
        }
        if (currentTurnSpeed !== 0) {
            _this.tank.rotate(BABYLON.Axis.Y, currentTurnSpeed * deltaSeconds, BABYLON.Space.WORLD);
        }

        _this.tank.position.y = baseTankY;

        const rotationQuaternion = _this.tank.rotationQuaternion;
        if (rotationQuaternion) {
            BABYLON.Quaternion.RotationYawPitchRollToRef(getYaw(_this.tank), 0, 0, uprightRotation);
            rotationQuaternion.copyFrom(uprightRotation);
        } else {
            _this.tank.rotation.x = 0;
            _this.tank.rotation.z = 0;
        }

        if (didTranslateThisFrame) {
            _this.tank.position.subtractToRef(previousTankPosition, translationDelta);
            translationDelta.y = 0;
            cameraTargetPosition.addInPlace(translationDelta);
        }

        BABYLON.Vector3.LerpToRef(
            _this.camera.position,
            cameraTargetPosition,
            Math.min(1, cameraFollowSharpness * deltaSeconds),
            _this.camera.position,
        );

        previousTankPosition.copyFrom(_this.tank.position);
    });

    function moveToward(current: number, target: number, maxDelta: number): number {
        if (Math.abs(target - current) <= maxDelta) {
            return target;
        }

        return current + Math.sign(target - current) * maxDelta;
    }

    function getYaw(mesh: BABYLON.AbstractMesh): number {
        return mesh.rotationQuaternion ? mesh.rotationQuaternion.toEulerAngles().y : mesh.rotation.y;
    }

    function getHorizontalRadius(mesh: BABYLON.AbstractMesh): number {
        mesh.computeWorldMatrix(true);
        const extent = mesh.getBoundingInfo().boundingBox.extendSizeWorld;
        return Math.max(extent.x, extent.z);
    }

    function collidesWithTree(position: BABYLON.Vector3): boolean {
        for (const trunk of treeTrunks) {
            const trunkRadius = getHorizontalRadius(trunk);
            const dx = position.x - trunk.absolutePosition.x;
            const dz = position.z - trunk.absolutePosition.z;
            const minimumDistance = tankCollisionRadius + trunkRadius;

            if ((dx * dx) + (dz * dz) < minimumDistance * minimumDistance) {
                return true;
            }
        }

        return false;
    }
}

/**
 * Create and return splatter objects.
 */
function createSplatterObjects(_this: TankContext): BABYLON.AbstractMesh[] {
    const baseSplatter = _this.scene.getMeshByName("splatter1");
    if (!baseSplatter) {
        console.error("Base splatter object not found in the scene");
        return [];
    }
    if (!(baseSplatter instanceof BABYLON.Mesh)) {
        console.error("Base splatter object must be a mesh");
        return [];
    }

    return [baseSplatter, baseSplatter.createInstance("splatter2"), baseSplatter.createInstance("splatter3")];
}

/**
 * Gives the player the ability to shoot with the tank.
 */
export async function initializeShooting(_this: TankContext, forward: BABYLON.Vector3): Promise<void> {
    const activeShots: ActiveShot[] = [];
    const shotOffset = 5;
    const shotHeightOffset = 3;
    const shotRadius = 0.75;
    const targetHintRangeSquared = 42 * 42;
    const shotDirection = BABYLON.Vector3.Zero();
    const shotSpawnPosition = BABYLON.Vector3.Zero();
    const targetPosition = BABYLON.Vector3.Zero();
    const targetConfigs = [
        {
            name: "linkedin",
            label: "LinkedIn",
            position: new BABYLON.Vector3(69.8356, 4.4086, 46.3030),
            scaling: new BABYLON.Vector3(1.75, 1.75, 1.75),
            url: "https://www.linkedin.com/in/stefan-cernat/",
        },
        {
            name: "twitter",
            label: "X / Twitter",
            position: new BABYLON.Vector3(69.8356, 2.1121, 17.2901),
            scaling: new BABYLON.Vector3(1.5, 1.5, 1.5),
            url: "https://x.com/Setin2",
        },
    ];

    const github = _this.scene.getMeshByName("target_github");
    if (!(github instanceof BABYLON.Mesh)) {
        console.error("GitHub target not found in the scene");
        return;
    }

    const githubMaterial = github.material;
    if (githubMaterial && "albedoTexture" in githubMaterial) {
        githubMaterial.albedoTexture = new BABYLON.Texture("assets/models/target/target (Base Color).png", _this.scene);
    }

    const gui = await import("@babylonjs/gui");
    if (_this.scene.isDisposed) {
        return;
    }

    const highlightLayer = new BABYLON.HighlightLayer("target-highlight", _this.scene, {
        blurHorizontalSize: 0.6,
        blurVerticalSize: 0.6,
    });
    const targetUi = gui.AdvancedDynamicTexture.CreateFullscreenUI("target-hints", true, _this.scene);
    const objectiveHint = createObjectiveHint(gui, targetUi);

    const getHitRadiusSquared = (mesh: BABYLON.Mesh): number => {
        mesh.computeWorldMatrix(true);
        const radius = mesh.getBoundingInfo().boundingSphere.radiusWorld + shotRadius;
        return radius * radius;
    };

    const targetLabels = new Map<BABYLON.Mesh, Rectangle>();
    const targets: TargetLink[] = [{ mesh: github, hitRadiusSquared: getHitRadiusSquared(github), url: "https://github.com/Setin2", label: "GitHub" }];
    targetConfigs.forEach(({ name, label, position, scaling, url }) => {
        const target = github.clone(`target_${name}`);
        if (!(target instanceof BABYLON.Mesh)) {
            return;
        }

        target.position.copyFrom(position);
        target.scaling.copyFrom(scaling);
        targets.push({ mesh: target, hitRadiusSquared: getHitRadiusSquared(target), url, label });
    });

    targets.forEach((target) => {
        highlightLayer.addMesh(target.mesh, BABYLON.Color3.FromHexString("#f7b955"));
        targetLabels.set(target.mesh, createTargetLabel(gui, targetUi, target.mesh, target.label));
    });

    const applyVelocity = (mesh: BABYLON.InstancedMesh, direction: BABYLON.Vector3, power: number) => {
        const currentVelocity = mesh.physicsImpostor?.getLinearVelocity();
        if (!mesh.physicsImpostor || !currentVelocity) {
            return;
        }

        mesh.physicsImpostor.setLinearVelocity(currentVelocity.add(direction.scale(power)));
    };

    const ball = BABYLON.MeshBuilder.CreateSphere("ball", { segments: 16, diameter: 1.5 }, _this.scene);
    ball.parent = _this.camera;
    ball.isVisible = false;
    ball.isPickable = false;
    let canShoot = true;
    let currentObjectiveText = objectiveHint.text;

    const shotObserver = _this.scene.onBeforeRenderObservable.add(() => {
        let nearbyTargetLabel = "";
        let nearestTargetDistanceSquared = Number.POSITIVE_INFINITY;

        for (const target of targets) {
            targetPosition.copyFrom(target.mesh.absolutePosition);
            const distanceSquared = BABYLON.Vector3.DistanceSquared(_this.tank.absolutePosition, targetPosition);
            const label = targetLabels.get(target.mesh);

            if (label) {
                label.isVisible = distanceSquared <= targetHintRangeSquared;
            }

            if (distanceSquared < nearestTargetDistanceSquared) {
                nearestTargetDistanceSquared = distanceSquared;
                nearbyTargetLabel = target.label;
            }
        }

        const nextObjectiveText = nearestTargetDistanceSquared <= targetHintRangeSquared
            ? `Nearby target: ${nearbyTargetLabel}. Press E to shoot and open the link.`
            : "Drive with WASD. Press E to shoot the glowing targets and open social links.";

        if (nextObjectiveText !== currentObjectiveText) {
            objectiveHint.text = nextObjectiveText;
            currentObjectiveText = nextObjectiveText;
        }

        if (!activeShots.length) {
            return;
        }

        for (let shotIndex = activeShots.length - 1; shotIndex >= 0; shotIndex--) {
            const activeShot = activeShots[shotIndex];
            const shotPosition = activeShot.mesh.absolutePosition;

            for (const target of targets) {
                if (BABYLON.Vector3.DistanceSquared(shotPosition, target.mesh.absolutePosition) <= target.hitRadiusSquared) {
                    window.open(target.url, "_blank", "noopener,noreferrer");
                    currentObjectiveText = `Opening ${target.label}.`;
                    objectiveHint.text = currentObjectiveText;
                    clearTimeout(activeShot.disposeTimeout);
                    activeShot.dispose();
                    activeShots.splice(shotIndex, 1);
                    break;
                }
            }
        }
    });

    const handleShoot = () => {
        if (!canShoot) {
            return;
        }

        canShoot = false;
        _this.bullet.play();

        _this.tank.getDirectionToRef(forward, shotDirection);
        shotDirection.normalize();
        const shotBall = ball.createInstance("ball");
        shotBall.parent = null;

        shotDirection.scaleToRef(shotOffset, shotSpawnPosition);
        shotSpawnPosition.addInPlace(_this.tank.position);
        shotSpawnPosition.y += shotHeightOffset;
        shotBall.position.copyFrom(shotSpawnPosition);

        shotBall.physicsImpostor = new BABYLON.PhysicsImpostor(shotBall, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 0.5, restitution: 0 }, _this.scene);
        applyVelocity(shotBall, shotDirection, 200);

        setTimeout(() => { canShoot = true; }, 400);

        const disposeShot = () => {
            shotBall.physicsImpostor?.dispose();
            if (!shotBall.isDisposed()) {
                shotBall.dispose();
            }
        };

        const disposeTimeout = setTimeout(() => {
            disposeShot();
            const shotIndex = activeShots.findIndex((activeShot) => activeShot.mesh === shotBall);
            if (shotIndex !== -1) {
                activeShots.splice(shotIndex, 1);
            }
        }, 2000);

        activeShots.push({ mesh: shotBall, dispose: disposeShot, disposeTimeout });
    };

    _this.scene.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
            { trigger: BABYLON.ActionManager.OnKeyDownTrigger, parameter: 'e' },
            handleShoot
        )
    );

    _this.scene.onDisposeObservable.addOnce(() => {
        _this.scene.onBeforeRenderObservable.remove(shotObserver);
        activeShots.forEach((activeShot) => {
            clearTimeout(activeShot.disposeTimeout);
            activeShot.dispose();
        });
        activeShots.length = 0;

        targetUi.dispose();
        highlightLayer.dispose();

        if (!ball.isDisposed()) {
            ball.dispose();
        }
    });
}

function createObjectiveHint(gui: GuiModule, ui: AdvancedDynamicTexture): TextBlock {
    const container = new gui.Rectangle("objective-hint");
    container.width = "420px";
    container.height = "1px";
    container.adaptHeightToChildren = true;
    container.thickness = 1;
    container.cornerRadius = 18;
    container.color = "rgba(255,255,255,0.18)";
    container.background = "rgba(8, 10, 16, 0.68)";
    container.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    container.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_TOP;
    container.paddingTop = "18px";
    container.paddingLeft = "18px";
    container.zIndex = 2;

    const text = new gui.TextBlock("objective-hint-text");
    text.text = "Drive with WASD. Press E to shoot the glowing targets and open social links.";
    text.color = "#f4f7ff";
    text.fontSize = 15;
    text.fontFamily = "Inter, Segoe UI, sans-serif";
    text.textWrapping = true;
    text.resizeToFit = true;
    text.paddingLeft = "16px";
    text.paddingRight = "16px";
    text.paddingTop = "12px";
    text.paddingBottom = "12px";

    container.addControl(text);
    ui.addControl(container);

    return text;
}

function createTargetLabel(
    gui: GuiModule,
    ui: AdvancedDynamicTexture,
    mesh: BABYLON.AbstractMesh,
    label: string,
): Rectangle {
    const container = new gui.Rectangle(`label-${mesh.name}`);
    container.width = "128px";
    container.height = "42px";
    container.thickness = 1;
    container.cornerRadius = 14;
    container.color = "rgba(255,255,255,0.26)";
    container.background = "rgba(7, 9, 14, 0.74)";
    container.linkOffsetY = -80;
    container.isPointerBlocker = false;
    container.isVisible = false;

    const text = new gui.TextBlock(`label-text-${mesh.name}`);
    text.text = `${label}\nShoot to open`;
    text.color = "#fff3cf";
    text.fontSize = 13;
    text.fontFamily = "Inter, Segoe UI, sans-serif";
    text.textWrapping = true;

    container.addControl(text);
    container.linkWithMesh(mesh);
    ui.addControl(container);

    return container;
}
