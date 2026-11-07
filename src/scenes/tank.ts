import * as BABYLON from "@babylonjs/core";
import type { AdvancedDynamicTexture, Ellipse, Rectangle, TextBlock } from "@babylonjs/gui";

import { createToyTarget, type ToyTarget } from "./toyTarget";
import { collideWithRamps, getPlaygroundHeight } from "./playground";
import { UI, createCard, createRow, createText, refreshWhenFontLoaded, type GuiModule } from "./uiStyle";


type TankContext = {
    scene: BABYLON.Scene;
    tank: BABYLON.AbstractMesh;
    camera: BABYLON.FreeCamera;
    divFps: HTMLElement | null;
    tankSound: BABYLON.Sound;
    bullet: BABYLON.Sound;
    /** Called every time the tank fires (used by the toy tank model for recoil). */
    onShoot?: () => void;
    /** Where shots spawn, relative to the tank holder: distance forward and height. */
    shotOrigin?: { forward: number; height: number };
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
    // Ramps and platforms: the tank keeps its own height above the ground (see getPlaygroundHeight)
    // and falls with this gravity, so it rides up slopes, flies off ramp ends and lands.
    const tankGravity = 60;
    const maxClimbStep = 1.2;
    const maxLaunchSpeed = 22;
    let elevation = 0;
    let verticalSpeed = 0;
    let grounded = true;
    let modelPitch = 0;
    const toyModel = _this.scene.getTransformNodeByName("toy-tank-root");
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

    // Engine sound: replayed every 40 physics frames while driving. (The tread prints and dust are
    // in tankTrail.ts.)
    let engineSoundTick = 0;
    const updateEngineSound = () => {
        if (++engineSoundTick >= 40) {
            engineSoundTick = 0;
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
        // A surface much higher than the tank's bottom (the back of a ramp, a platform's side) is
        // a wall: stop instead of popping up onto it.
        if (getPlaygroundHeight(nextPosition.x, nextPosition.z) - elevation > maxClimbStep) {
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
            updateEngineSound();
        }

        const desiredTurnSpeed = turnInput * maxTurnSpeed;
        currentTurnSpeed = moveToward(currentTurnSpeed, desiredTurnSpeed, turnAcceleration * deltaSeconds);
        if (currentTurnSpeed !== 0) {
            _this.tank.rotate(BABYLON.Axis.Y, currentTurnSpeed * deltaSeconds, BABYLON.Space.WORLD);
        }

        updateVerticalMovement(deltaSeconds);

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

    /**
     * Follows the ground and ramps, keeping the upward speed a slope gives, so driving off the top
     * of a ramp launches the tank; in the air it falls until it lands. The visual model leans with
     * the slope (or noses up and down in the air).
     */
    function updateVerticalMovement(deltaSeconds: number): void {
        if (deltaSeconds <= 0) {
            return;
        }
        const position = _this.tank.position;
        const ground = getPlaygroundHeight(position.x, position.z);

        verticalSpeed -= tankGravity * deltaSeconds;
        const next = elevation + (verticalSpeed * deltaSeconds);
        if (next <= ground) {
            // On the surface: move with it, remembering how fast it carried the tank upwards.
            verticalSpeed = Math.min(maxLaunchSpeed, (ground - elevation) / deltaSeconds);
            elevation = ground;
            grounded = true;
        } else {
            elevation = next;
            grounded = false;
        }
        position.y = baseTankY + elevation;

        if (!toyModel) {
            return;
        }
        let targetPitch: number;
        if (grounded) {
            const yaw = getYaw(_this.tank);
            const fx = Math.sin(yaw) * 3;
            const fz = Math.cos(yaw) * 3;
            const ahead = getPlaygroundHeight(position.x + fx, position.z + fz);
            const behind = getPlaygroundHeight(position.x - fx, position.z - fz);
            targetPitch = Math.atan2(ahead - behind, 6);
        } else {
            targetPitch = Math.max(-0.45, Math.min(0.45, Math.atan2(verticalSpeed, Math.max(Math.abs(currentMoveSpeed), 12)) * 0.8));
        }
        modelPitch += (targetPitch - modelPitch) * Math.min(1, deltaSeconds * 10);
        // Positive rotation around X tips the nose (+Z) down, so nose-up is negative.
        toyModel.rotation.x = -modelPitch;
    }

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
 * Gives the player the ability to shoot with the tank.
 */
export async function initializeShooting(_this: TankContext, forward: BABYLON.Vector3): Promise<void> {
    const activeShots: ActiveShot[] = [];
    const shotOffset = _this.shotOrigin?.forward ?? 5;
    const shotHeightOffset = _this.shotOrigin?.height ?? 3;
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

    // Toy target models; the original meshes stay (hidden) for hit tests and labels.
    const targetMarks: Record<string, string> = { GitHub: "GH", LinkedIn: "in", "X / Twitter": "X" };
    const toyTargets = new Map<BABYLON.Mesh, ToyTarget>();
    const highlightColor = BABYLON.Color3.FromHexString("#f7b955");
    targets.forEach((target) => {
        let toyTarget: ToyTarget | null = null;
        try {
            toyTarget = createToyTarget(_this.scene, target.mesh, targetMarks[target.label] ?? "");
        } catch (error) {
            console.error("Toy target creation failed, keeping the original", error);
            target.mesh.isVisible = true;
        }

        if (toyTarget) {
            toyTargets.set(target.mesh, toyTarget);
            toyTarget.meshes.forEach((mesh) => highlightLayer.addMesh(mesh, highlightColor));
        } else {
            highlightLayer.addMesh(target.mesh, highlightColor);
        }
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
    let currentMood: ObjectiveMood = "explore";
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
        let nearestTargetMesh: BABYLON.Mesh | null = null;
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
                label.isVisible = false;
            }

            if (distanceSquared < nearestTargetDistanceSquared) {
                nearestTargetDistanceSquared = distanceSquared;
                nearbyTargetLabel = target.label;
                nearestTargetMesh = target.mesh;
            }

            if (distanceSquared <= targetHintRangeSquared && !discoveredTargets.has(target.mesh.name)) {
                discoveredTargets.add(target.mesh.name);
                currentObjectiveText = `You found ${target.label}! ${discoveredTargets.size} of ${totalTargetCount} links found.`;
                currentMood = "found";
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

        // Only the nearest target gets its name bubble: they stand close together on the podium.
        if (nearestTargetMesh && nearestTargetDistanceSquared <= targetHintRangeSquared) {
            const label = targetLabels.get(nearestTargetMesh);
            if (label) {
                label.isVisible = true;
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
        reticle.cooldown.color = hasRecentHit(now, hitFeedbackUntil) ? UI.mint : UI.gold;

        const hasAimLock = aimedTargetLabel !== "";
        reticle.frame.color = hasAimLock ? UI.pink : UI.cream;
        reticle.frame.thickness = hasAimLock ? 4 : 3;
        reticle.dot.background = hasAimLock ? UI.pink : UI.cream;
        reticle.label.color = hasAimLock ? UI.pinkDeep : UI.navy;
        reticle.label.text = hasAimLock
            ? `LOCKED: ${aimedTargetLabel}`
            : nearestTargetDistanceSquared <= targetHintRangeSquared
                ? `NEARBY: ${nearbyTargetLabel}`
                : `${discoveredTargets.size}/${totalTargetCount} LINKS FOUND`;
        // The sight only shows up when there is something to aim at (progress is in the corner card).
        const showSight = hasAimLock || nearestTargetDistanceSquared <= targetHintRangeSquared || hasRecentHit(now, hitFeedbackUntil);
        reticle.frame.isVisible = showSight;
        reticle.pill.isVisible = showSight;

        const isNearby = nearestTargetDistanceSquared <= targetHintRangeSquared;
        const nextObjectiveText = hasAimLock
            ? `${aimedTargetLabel} is locked on, ${formatDistance(Math.sqrt(aimedTargetDistanceSquared))}. Press E to fire!`
            : isNearby
                ? `${nearbyTargetLabel} is ${formatDistance(Math.sqrt(nearestTargetDistanceSquared))}. Turn toward it to lock on.`
                : "Drive around the island to find the glowing targets, your projects and links.";
        const nextMood: ObjectiveMood = hasAimLock ? "locked" : isNearby ? "nearby" : "explore";

        if (now >= currentStatusUntil) {
            currentMood = nextMood;
            if (nextObjectiveText !== currentObjectiveText) {
                objectiveHint.text = nextObjectiveText;
                currentObjectiveText = nextObjectiveText;
            }
        }
        objectiveHint.setStatus(currentMood, discoveredTargets.size, totalTargetCount);

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
                    toyTargets.get(target.mesh)?.hit();
                    window.open(target.url, "_blank", "noopener,noreferrer");
                    currentObjectiveText = `Direct hit! Opening ${target.label} in a new tab.`;
                    currentMood = "hit";
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
                    reticle.frame.color = UI.mint;
                    reticle.dot.background = UI.mint;
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
        _this.onShoot?.();

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
        collideWithRamps(shotBall.physicsImpostor);
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

/** What the objective card is currently about; sets its eyebrow label and colour. */
type ObjectiveMood = "explore" | "nearby" | "locked" | "found" | "hit";

type ObjectiveHint = {
    text: string;
    setStatus: (mood: ObjectiveMood, found: number, total: number) => void;
};

const OBJECTIVE_MOODS: Record<ObjectiveMood, { label: string; color: string }> = {
    explore: { label: "EXPLORE", color: UI.navy },
    nearby: { label: "TARGET NEARBY", color: UI.gold },
    locked: { label: "LOCKED ON", color: UI.pink },
    found: { label: "NEW LINK FOUND", color: UI.mint },
    hit: { label: "DIRECT HIT", color: UI.mint },
};

/**
 * The card in the top-left corner: a coloured eyebrow saying what is going on, progress pips for
 * the links found so far, and the current hint.
 */
function createObjectiveHint(gui: GuiModule, ui: AdvancedDynamicTexture): ObjectiveHint {
    const card = createCard(gui, "objective-hint");
    card.width = "360px";
    card.height = "1px";
    card.adaptHeightToChildren = true;
    card.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    card.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_TOP;
    card.left = "18px";
    card.top = "18px";
    card.zIndex = 2;
    card.isPointerBlocker = false;

    const stack = new gui.StackPanel("objective-hint-stack");
    stack.isVertical = true;
    stack.paddingTop = "12px";
    stack.paddingBottom = "14px";
    card.addControl(stack);

    const header = new gui.Grid("objective-hint-header");
    header.height = "26px";
    header.paddingLeft = "16px";
    header.paddingRight = "16px";
    header.addColumnDefinition(1);
    header.addColumnDefinition(90, true);
    stack.addControl(header);

    const badge = new gui.Rectangle("objective-hint-badge");
    badge.height = "24px";
    badge.width = "1px";
    badge.adaptWidthToChildren = true;
    badge.thickness = 0;
    badge.cornerRadius = 12;
    badge.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    const badgeText = createText(gui, "objective-hint-badge-text", "", { size: 12, weight: "900", color: UI.cream, align: "center" });
    badgeText.resizeToFit = true;
    badgeText.paddingLeft = "10px";
    badgeText.paddingRight = "10px";
    badge.addControl(badgeText);
    header.addControl(badge, 0, 0);

    const pips = createRow(gui, "objective-hint-pips", 24);
    pips.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    header.addControl(pips, 0, 1);
    const pipControls: Rectangle[] = [];

    const text = createText(gui, "objective-hint-text", "", { size: 15, weight: "700" });
    text.textWrapping = true;
    text.resizeToFit = true;
    text.lineSpacing = "2px";
    text.paddingLeft = "16px";
    text.paddingRight = "16px";
    text.paddingTop = "8px";
    stack.addControl(text);

    ui.addControl(card);
    refreshWhenFontLoaded(ui);

    let lastStatus = "";
    const hint: ObjectiveHint = {
        get text() {
            return text.text;
        },
        set text(value: string) {
            text.text = value;
        },
        setStatus(mood, found, total) {
            const key = `${mood}:${found}:${total}`;
            if (key === lastStatus) {
                return;
            }
            lastStatus = key;
            badgeText.text = OBJECTIVE_MOODS[mood].label;
            badge.background = OBJECTIVE_MOODS[mood].color;

            // One pip per link: filled pink once found.
            while (pipControls.length < total) {
                // Little toy blocks: sand while missing, pink once found.
                const slot = new gui.Rectangle(`objective-hint-pip-slot-${pipControls.length}`);
                slot.width = "24px";
                slot.height = "24px";
                slot.thickness = 0;
                const pip = new gui.Rectangle(`objective-hint-pip-${pipControls.length}`);
                pip.width = "18px";
                pip.height = "18px";
                pip.thickness = 2;
                pip.cornerRadius = 5;
                pip.color = UI.navy;
                slot.addControl(pip);
                pips.addControl(slot);
                pipControls.push(pip);
            }
            pipControls.forEach((pip, i) => {
                pip.background = i < found ? UI.pink : UI.sand;
            });
        },
    };
    return hint;
}

function createReticle(
    gui: GuiModule,
    ui: AdvancedDynamicTexture,
): { frame: Rectangle; dot: Rectangle; label: TextBlock; pill: Rectangle; cooldown: Ellipse } {
    // Round sight: a cream ring with a navy outline (drawn as the shadow) and a dot in the middle.
    const frame = new gui.Rectangle("reticle-frame");
    frame.width = "34px";
    frame.height = "34px";
    frame.thickness = 3;
    frame.cornerRadius = 17;
    frame.color = UI.cream;
    frame.background = "transparent";
    frame.shadowColor = UI.navyDeep;
    frame.shadowBlur = 0;
    frame.shadowOffsetY = 2;
    frame.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_CENTER;
    frame.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_CENTER;
    frame.isPointerBlocker = false;

    const dot = new gui.Rectangle("reticle-dot");
    dot.width = "8px";
    dot.height = "8px";
    dot.thickness = 0;
    dot.cornerRadius = 4;
    dot.background = UI.cream;
    frame.addControl(dot);

    // Grows while the gun reloads.
    const cooldown = new gui.Ellipse("reticle-cooldown");
    cooldown.width = "16px";
    cooldown.height = "16px";
    cooldown.thickness = 3;
    cooldown.color = UI.gold;
    cooldown.alpha = 0;
    cooldown.isPointerBlocker = false;
    ui.addControl(cooldown);

    // Status pill under the sight.
    const pill = createCard(gui, "reticle-pill", { radius: 12, thickness: 2 });
    pill.height = "26px";
    pill.width = "1px";
    pill.adaptWidthToChildren = true;
    pill.top = "40px";
    pill.shadowOffsetY = 3;
    pill.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_CENTER;
    pill.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_CENTER;
    pill.isPointerBlocker = false;

    const label = createText(gui, "reticle-label", "0/0 LINKS FOUND", { size: 12, weight: "900", color: UI.navy, align: "center" });
    label.resizeToFit = true;
    label.paddingLeft = "12px";
    label.paddingRight = "12px";
    label.isPointerBlocker = false;
    pill.addControl(label);

    ui.addControl(frame);
    ui.addControl(pill);

    // Hidden until a target is in range (see the update loop), so it doesn't sit on the tank.
    frame.isVisible = false;
    pill.isVisible = false;

    return { frame, dot, label, pill, cooldown };
}

function createHitFeedback(
    gui: GuiModule,
    ui: AdvancedDynamicTexture,
): { container: Rectangle; text: TextBlock } {
    const container = createCard(gui, "hit-feedback", { radius: 18, background: UI.mint, border: UI.navy });
    container.width = "150px";
    container.height = "40px";
    container.linkOffsetY = -96;
    container.isPointerBlocker = false;
    container.isVisible = false;

    const text = createText(gui, "hit-feedback-text", "DIRECT HIT!", { size: 16, weight: "900", color: UI.navyDeep, align: "center" });
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
    container.linkOffsetY = -96;
    container.isPointerBlocker = false;
    container.isVisible = false;

    const ring = new gui.Ellipse("impact-burst-ring");
    ring.width = "90px";
    ring.height = "90px";
    ring.thickness = 5;
    ring.color = UI.gold;
    ring.background = "rgba(217, 161, 59, 0.12)";
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

/**
 * A little speech-bubble card above a target with its name, shown when the tank is close by.
 */
function createTargetLabel(
    gui: GuiModule,
    ui: AdvancedDynamicTexture,
    mesh: BABYLON.AbstractMesh,
    label: string,
): Rectangle {
    const container = new gui.Rectangle(`label-${mesh.name}`);
    container.width = "170px";
    container.height = "70px";
    container.thickness = 0;
    container.linkOffsetY = -86;
    container.isPointerBlocker = false;
    container.isVisible = false;

    // Pointer: a rotated square peeking out under the card.
    const pointer = createCard(gui, `label-pointer-${mesh.name}`, { radius: 3 });
    pointer.width = "16px";
    pointer.height = "16px";
    pointer.rotation = Math.PI / 4;
    pointer.top = "24px";
    pointer.shadowOffsetY = 0;
    container.addControl(pointer);

    const card = createCard(gui, `label-card-${mesh.name}`, { radius: 14 });
    card.height = "54px";
    card.top = "-6px";
    card.shadowOffsetY = 0;
    container.addControl(card);

    const name = createText(gui, `label-name-${mesh.name}`, label, { size: 16, weight: "900", color: UI.navy, align: "center" });
    name.top = "-8px";
    card.addControl(name);
    const action = createText(gui, `label-action-${mesh.name}`, "Shoot to open", { size: 12, weight: "800", color: UI.pinkDeep, align: "center" });
    action.top = "11px";
    card.addControl(action);

    // The control must be on the texture before it can follow a mesh.
    ui.addControl(container);
    container.linkWithMesh(mesh);

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
