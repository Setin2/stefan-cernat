import * as BABYLON from "@babylonjs/core";
import type { AdvancedDynamicTexture, Ellipse, Rectangle, TextBlock } from "@babylonjs/gui";

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
    /** Where the shot was on the previous frame, used for the swept hit test. */
    previousPosition: BABYLON.Vector3;
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
    const zeroVector = BABYLON.Vector3.Zero();
    const tankVelocity = BABYLON.Vector3.Zero();
    const cameraTargetPosition = BABYLON.Vector3.Zero();
    const cameraFocusPoint = BABYLON.Vector3.Zero();
    const nextPosition = BABYLON.Vector3.Zero();
    const uprightRotation = BABYLON.Quaternion.Identity();
    const previousTankPosition = _this.tank.position.clone();
    const translationDelta = BABYLON.Vector3.Zero();
    const baseTankY = _this.tank.position.y;
    // Tree trunks are static, so their collision footprint is computed once instead of every frame.
    const treeColliders = _this.scene.meshes
        .filter((mesh) => mesh.name.startsWith("tree-trunk"))
        .map((trunk) => {
            const radius = getHorizontalRadius(trunk);
            return { x: trunk.absolutePosition.x, z: trunk.absolutePosition.z, radius };
        });
    const maxDeltaSeconds = 0.1;
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

    // Key-up events are lost when the window loses focus, so release every key on blur.
    const releaseAllKeys = () => {
        for (const key in inputMap) {
            inputMap[key] = false;
        }
    };
    window.addEventListener("blur", releaseAllKeys);
    _this.scene.onDisposeObservable.addOnce(() => window.removeEventListener("blur", releaseAllKeys));

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

        const desiredSpeed = moveInput > 0 ? maxForwardSpeed : moveInput < 0 ? -maxReverseSpeed : 0;
        const speedDelta = (moveInput === 0 ? deceleration : acceleration) * deltaSeconds;
        currentMoveSpeed = moveToward(currentMoveSpeed, desiredSpeed, speedDelta);

        const yaw = getYaw(mesh);
        forwardDirection.set(Math.sin(yaw), 0, Math.cos(yaw));
        forwardDirection.normalize();

        // Trees are checked against where the tank will be after this step, so it stops cleanly
        // before a trunk instead of grinding against it.
        nextPosition.copyFrom(mesh.position);
        nextPosition.y = baseTankY;
        nextPosition.addInPlace(forwardDirection.scale(currentMoveSpeed * deltaSeconds));
        if (collidesWithTree(nextPosition)) {
            currentMoveSpeed = 0;
        }

        // The tank is moved by the physics engine using this velocity (rather than by setting its
        // position directly), so the engine knows how fast it is going: bricks and other loose
        // objects get knocked away with real momentum, and static objects still block it.
        forwardDirection.scaleToRef(currentMoveSpeed, tankVelocity);
        physicsImpostor.setLinearVelocity(tankVelocity);
        physicsImpostor.setAngularVelocity(zeroVector);

        return currentMoveSpeed;
    };

    // Runs once per frame, right before the physics step, so the velocity set here is what the
    // physics engine uses to move the tank this frame.
    const tankControllerObserver = _this.scene.onBeforePhysicsObservable.add(() => {
        // Clamp so a long pause (hidden tab, stalled frame) can't teleport the tank through obstacles.
        // Babylon clamps the physics step to the same 0.1s.
        const deltaSeconds = Math.min(engine.getDeltaTime() / 1000, maxDeltaSeconds);
        const moveInput = (inputMap["w"] ? 1 : 0) - (inputMap["s"] ? 1 : 0);
        const turnInput = (inputMap["d"] ? 1 : 0) - (inputMap["a"] ? 1 : 0);
        const currentForwardSpeed = applyMovement(_this.tank, moveInput, deltaSeconds);

        if (moveInput !== 0 && Math.abs(currentForwardSpeed) > 0.5) {
            updateSplatter();
        }

        const desiredTurnSpeed = turnInput * maxTurnSpeed;
        currentTurnSpeed = moveToward(currentTurnSpeed, desiredTurnSpeed, turnAcceleration * deltaSeconds);
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
    });

    // Runs after the physics step has moved the tank this frame.
    _this.scene.registerBeforeRender(() => {
        if (_this.divFps) {
            const now = performance.now();
            if (now - lastFpsUpdateTime >= 250) {
                _this.divFps.textContent = `${engine.getFps().toFixed()} fps`;
                lastFpsUpdateTime = now;
            }
        }

        const deltaSeconds = Math.min(engine.getDeltaTime() / 1000, maxDeltaSeconds);

        _this.tank.position.subtractToRef(previousTankPosition, translationDelta);
        translationDelta.y = 0;
        cameraTargetPosition.addInPlace(translationDelta);

        BABYLON.Vector3.LerpToRef(
            _this.camera.position,
            cameraTargetPosition,
            Math.min(1, cameraFollowSharpness * deltaSeconds),
            _this.camera.position,
        );

        previousTankPosition.copyFrom(_this.tank.position);
    });

    _this.scene.onDisposeObservable.addOnce(() => {
        _this.scene.onBeforePhysicsObservable.remove(tankControllerObserver);
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
        for (const tree of treeColliders) {
            const dx = position.x - tree.x;
            const dz = position.z - tree.z;
            const minimumDistance = tankCollisionRadius + tree.radius;

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
    const shotLifetimeMs = 2000;
    const shotCooldownMs = 400;
    const targetHintRangeSquared = 42 * 42;
    const targetAimRangeSquared = 52 * 52;
    const aimLockThreshold = 0.965;
    const recoilRecoverSpeed = 11;
    const shotDirection = BABYLON.Vector3.Zero();
    const shotSpawnPosition = BABYLON.Vector3.Zero();
    const targetPosition = BABYLON.Vector3.Zero();
    const tankForward = BABYLON.Vector3.Zero();
    const toTarget = BABYLON.Vector3.Zero();
    const recoilOffset = BABYLON.Vector3.Zero();
    const recoilStep = BABYLON.Vector3.Zero();
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
    const reticle = createReticle(gui, targetUi);
    const hitFeedback = createHitFeedback(gui, targetUi);
    const impactBurst = createImpactBurst(gui, targetUi);

    const getHitRadiusSquared = (mesh: BABYLON.Mesh): number => {
        // Derive the world radius from the local sphere and absolute scaling: radiusWorld is stale for
        // meshes with doNotSyncBoundingInfo (set by Play.optimizeScene and copied onto clones).
        mesh.computeWorldMatrix(true);
        const scaling = mesh.absoluteScaling;
        const maxScale = Math.max(Math.abs(scaling.x), Math.abs(scaling.y), Math.abs(scaling.z));
        const radius = mesh.getBoundingInfo().boundingSphere.radius * maxScale + shotRadius;
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
    let shotCooldownUntil = 0;
    let hitFeedbackUntil = 0;
    let impactBurstUntil = 0;
    let currentStatusUntil = 0;
    let currentObjectiveText = objectiveHint.text;
    let hitTarget: BABYLON.Mesh | null = null;
    let impactTarget: BABYLON.Mesh | null = null;
    const discoveredTargets = new Set<string>();
    const totalTargetCount = targets.length;
    // Recoil is applied as a temporary offset only for the rendered frame, so it never
    // fights with the camera follow logic in initializeTankMovement.
    const recoilRestoreObserver = _this.scene.onAfterRenderObservable.add(() => {
        _this.camera.position.subtractInPlace(recoilOffset);
    });

    const shotObserver = _this.scene.onBeforeRenderObservable.add(() => {
        const now = performance.now();
        const deltaSeconds = _this.scene.getEngine().getDeltaTime() / 1000;
        let nearbyTargetLabel = "";
        let nearestTargetDistanceSquared = Number.POSITIVE_INFINITY;
        let aimedTargetLabel = "";
        let aimedTargetDistanceSquared = Number.POSITIVE_INFINITY;
        let bestAimDot = aimLockThreshold;

        recoilStep.copyFrom(recoilOffset).scaleInPlace(Math.min(1, recoilRecoverSpeed * deltaSeconds));
        recoilOffset.subtractInPlace(recoilStep);
        _this.camera.position.addInPlace(recoilOffset);

        _this.tank.getDirectionToRef(forward, tankForward);
        tankForward.normalize();

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

            if (distanceSquared <= targetHintRangeSquared && !discoveredTargets.has(target.mesh.name)) {
                discoveredTargets.add(target.mesh.name);
                currentObjectiveText = `New link discovered: ${target.label}. ${discoveredTargets.size} of ${totalTargetCount} found.`;
                objectiveHint.text = currentObjectiveText;
                currentStatusUntil = now + 2400;
            }

            if (distanceSquared > targetAimRangeSquared) {
                continue;
            }

            toTarget.copyFrom(target.mesh.absolutePosition).subtractInPlace(_this.tank.absolutePosition);
            toTarget.normalize();
            const aimDot = BABYLON.Vector3.Dot(tankForward, toTarget);
            if (aimDot >= bestAimDot) {
                bestAimDot = aimDot;
                aimedTargetLabel = target.label;
                aimedTargetDistanceSquared = distanceSquared;
            }
        }

        if (hitTarget && now >= hitFeedbackUntil) {
            hitFeedback.container.isVisible = false;
            hitTarget = null;
        }

        if (impactTarget && now >= impactBurstUntil) {
            impactBurst.container.isVisible = false;
            impactTarget = null;
        }

        const cooldownProgress = Math.min(1, Math.max(0, (shotCooldownUntil - now) / shotCooldownMs));
        reticle.cooldown.alpha = cooldownProgress > 0 ? 0.95 : 0;
        reticle.cooldown.width = `${Math.max(16, cooldownProgress * 56)}px`;
        reticle.cooldown.height = `${Math.max(16, cooldownProgress * 56)}px`;
        reticle.cooldown.color = hasRecentHit(now, hitFeedbackUntil) ? "rgba(141,247,176,0.4)" : "rgba(247,185,85,0.28)";

        const hasAimLock = aimedTargetLabel !== "";
        reticle.frame.color = hasAimLock ? "#f7b955" : "rgba(255,255,255,0.52)";
        reticle.frame.thickness = hasAimLock ? 2 : 1;
        reticle.dot.background = hasAimLock ? "#f7b955" : "rgba(255,255,255,0.85)";
        reticle.label.text = hasAimLock
            ? `LOCKED: ${aimedTargetLabel}`
            : nearestTargetDistanceSquared <= targetHintRangeSquared
                ? `NEARBY: ${nearbyTargetLabel}`
                : `${discoveredTargets.size}/${totalTargetCount} LINKS FOUND`;

        const nextObjectiveText = hasAimLock
            ? `Target locked: ${aimedTargetLabel} (${formatDistance(Math.sqrt(aimedTargetDistanceSquared))}). Press E to fire.`
            : nearestTargetDistanceSquared <= targetHintRangeSquared
                ? `Target in range: ${nearbyTargetLabel} (${formatDistance(Math.sqrt(nearestTargetDistanceSquared))}). Turn toward it to lock on.`
                : `Explore the island to discover glowing targets, projects, and social links. ${discoveredTargets.size} of ${totalTargetCount} links found.`;

        if (now >= currentStatusUntil && nextObjectiveText !== currentObjectiveText) {
            objectiveHint.text = nextObjectiveText;
            currentObjectiveText = nextObjectiveText;
        }

        if (!activeShots.length) {
            return;
        }

        for (let shotIndex = activeShots.length - 1; shotIndex >= 0; shotIndex--) {
            const activeShot = activeShots[shotIndex];
            const shotPosition = activeShot.mesh.absolutePosition;
            let didHit = false;

            for (const target of targets) {
                // Test the whole path travelled since the last frame: at 200 units/s a shot moves
                // several units per frame and could otherwise skip straight past a target.
                if (segmentDistanceSquared(activeShot.previousPosition, shotPosition, target.mesh.absolutePosition) <= target.hitRadiusSquared) {
                    didHit = true;
                    window.open(target.url, "_blank", "noopener,noreferrer");
                    currentObjectiveText = `Direct hit. Opening ${target.label} in a new tab.`;
                    objectiveHint.text = currentObjectiveText;
                    currentStatusUntil = now + 2200;
                    hitTarget = target.mesh;
                    hitFeedback.container.linkWithMesh(target.mesh);
                    hitFeedback.container.isVisible = true;
                    hitFeedbackUntil = now + 900;
                    impactTarget = target.mesh;
                    impactBurst.container.linkWithMesh(target.mesh);
                    impactBurst.container.isVisible = true;
                    impactBurstUntil = now + 420;
                    reticle.frame.color = "#8df7b0";
                    reticle.dot.background = "#8df7b0";
                    reticle.label.text = `DIRECT HIT: ${target.label}`;
                    clearTimeout(activeShot.disposeTimeout);
                    activeShot.dispose();
                    activeShots.splice(shotIndex, 1);
                    break;
                }
            }

            if (!didHit) {
                activeShot.previousPosition.copyFrom(shotPosition);
            }
        }
    });

    const handleShoot = () => {
        if (!canShoot) {
            return;
        }

        canShoot = false;
        shotCooldownUntil = performance.now() + shotCooldownMs;
        _this.bullet.play();

        _this.tank.getDirectionToRef(forward, shotDirection);
        shotDirection.normalize();
        recoilOffset.addInPlaceFromFloats(-shotDirection.x * 0.22, 0.18, -shotDirection.z * 0.22);
        const shotBall = ball.createInstance("ball");
        shotBall.parent = null;

        shotDirection.scaleToRef(shotOffset, shotSpawnPosition);
        shotSpawnPosition.addInPlace(_this.tank.position);
        shotSpawnPosition.y += shotHeightOffset;
        shotBall.position.copyFrom(shotSpawnPosition);

        shotBall.physicsImpostor = new BABYLON.PhysicsImpostor(shotBall, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 0.5, restitution: 0 }, _this.scene);
        // Shots inherit the tank's motion, so firing while driving still goes where you aim.
        const tankVelocity = _this.tank.physicsImpostor?.getLinearVelocity();
        if (tankVelocity) {
            shotBall.physicsImpostor.setLinearVelocity(tankVelocity);
        }
        applyVelocity(shotBall, shotDirection, 200);

        setTimeout(() => { canShoot = true; }, shotCooldownMs);

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
        }, shotLifetimeMs);

        activeShots.push({ mesh: shotBall, previousPosition: shotSpawnPosition.clone(), dispose: disposeShot, disposeTimeout });
    };

    _this.scene.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
            { trigger: BABYLON.ActionManager.OnKeyDownTrigger, parameter: 'e' },
            handleShoot
        )
    );

    _this.scene.onDisposeObservable.addOnce(() => {
        _this.scene.onBeforeRenderObservable.remove(shotObserver);
        _this.scene.onAfterRenderObservable.remove(recoilRestoreObserver);
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
    text.text = "Explore the island to discover glowing targets, projects, and social links.";
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

function createReticle(
    gui: GuiModule,
    ui: AdvancedDynamicTexture,
): { frame: Rectangle; dot: Rectangle; label: TextBlock; cooldown: Ellipse } {
    const frame = new gui.Rectangle("reticle-frame");
    frame.width = "28px";
    frame.height = "28px";
    frame.thickness = 1;
    frame.cornerRadius = 8;
    frame.color = "rgba(255,255,255,0.52)";
    frame.background = "rgba(10, 12, 18, 0.12)";
    frame.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_CENTER;
    frame.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_CENTER;
    frame.isPointerBlocker = false;

    const dot = new gui.Rectangle("reticle-dot");
    dot.width = "4px";
    dot.height = "4px";
    dot.thickness = 0;
    dot.cornerRadius = 999;
    dot.background = "rgba(255,255,255,0.85)";
    frame.addControl(dot);

    const cooldown = new gui.Ellipse("reticle-cooldown");
    cooldown.width = "16px";
    cooldown.height = "16px";
    cooldown.thickness = 2;
    cooldown.color = "rgba(247,185,85,0.28)";
    cooldown.alpha = 0;
    cooldown.isPointerBlocker = false;
    ui.addControl(cooldown);

    const label = new gui.TextBlock("reticle-label");
    label.text = "0/0 LINKS FOUND";
    label.color = "rgba(255,255,255,0.72)";
    label.fontSize = 12;
    label.fontFamily = "Inter, Segoe UI, sans-serif";
    label.top = "28px";
    label.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_CENTER;
    label.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_CENTER;
    label.isPointerBlocker = false;

    ui.addControl(frame);
    ui.addControl(label);

    return { frame, dot, label, cooldown };
}

function createHitFeedback(
    gui: GuiModule,
    ui: AdvancedDynamicTexture,
): { container: Rectangle; text: TextBlock } {
    const container = new gui.Rectangle("hit-feedback");
    container.width = "116px";
    container.height = "34px";
    container.thickness = 1;
    container.cornerRadius = 16;
    container.color = "rgba(141,247,176,0.55)";
    container.background = "rgba(10, 28, 18, 0.78)";
    container.linkOffsetY = -92;
    container.isPointerBlocker = false;
    container.isVisible = false;

    const text = new gui.TextBlock("hit-feedback-text");
    text.text = "Direct hit";
    text.color = "#8df7b0";
    text.fontSize = 13;
    text.fontFamily = "Inter, Segoe UI, sans-serif";
    container.addControl(text);

    ui.addControl(container);

    return { container, text };
}

function createImpactBurst(
    gui: GuiModule,
    ui: AdvancedDynamicTexture,
): { container: Rectangle; ring: Ellipse } {
    const container = new gui.Rectangle("impact-burst-anchor");
    container.width = "1px";
    container.height = "1px";
    container.thickness = 0;
    container.background = "transparent";
    container.linkOffsetY = -92;
    container.isPointerBlocker = false;
    container.isVisible = false;

    const ring = new gui.Ellipse("impact-burst-ring");
    ring.width = "82px";
    ring.height = "82px";
    ring.thickness = 3;
    ring.color = "rgba(141,247,176,0.75)";
    ring.background = "rgba(141,247,176,0.1)";
    ring.alpha = 0.9;
    container.addControl(ring);

    ui.addControl(container);

    return { container, ring };
}

function hasRecentHit(now: number, hitFeedbackUntil: number): boolean {
    return now < hitFeedbackUntil;
}

function formatDistance(distance: number): string {
    return `${Math.max(1, Math.round(distance))}m away`;
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

/**
 * Squared distance from a point to the segment between start and end.
 */
function segmentDistanceSquared(start: BABYLON.Vector3, end: BABYLON.Vector3, point: BABYLON.Vector3): number {
    const sx = end.x - start.x;
    const sy = end.y - start.y;
    const sz = end.z - start.z;
    const lengthSquared = (sx * sx) + (sy * sy) + (sz * sz);
    let t = 0;
    if (lengthSquared > 0) {
        t = (((point.x - start.x) * sx) + ((point.y - start.y) * sy) + ((point.z - start.z) * sz)) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
    }

    const dx = start.x + (sx * t) - point.x;
    const dy = start.y + (sy * t) - point.y;
    const dz = start.z + (sz * t) - point.z;
    return (dx * dx) + (dy * dy) + (dz * dz);
}
