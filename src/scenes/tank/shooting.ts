import * as BABYLON from "@babylonjs/core";
import type { Rectangle } from "@babylonjs/gui";

import { segmentDistanceSquared } from "../core/math";
import { UI } from "../ui/style";
import { createHitFeedback, createImpactBurst, createObjectiveHint, createReticle, createTargetLabel, type ObjectiveMood } from "../ui/targetHud";
import { collideWithRamps } from "../world/playground";
import type { TankContext } from "./context";
import { createToyTarget, type ToyTarget } from "./toyTarget";

/**
 * A rubber ball: heavy enough to knock a brick clean out of a wall (it rolls a few bricks' lengths
 * away), and bouncy enough to hop off the ground.
 */
const SHOT_PHYSICS = { mass: 0.3, friction: 0.4, restitution: 0.8 };

/** The link targets are drawn after everything else, in this rendering group (see the glow). */
const TARGET_RENDERING_GROUP = 1;
/** Further than this from the tank, the targets are off screen and don't need their glow. */
const GLOW_DISTANCE = 150;

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

    const highlightColor = BABYLON.Color3.FromHexString("#f7b955");
    const gui = await import("@babylonjs/gui");
    if (_this.scene.isDisposed) {
        return;
    }

    // The glow only renders the targets (they're drawn in their own rendering group, keeping the
    // depth of everything drawn before them so they're still hidden behind things in front). By
    // default a highlight layer re-renders every visible mesh each frame, ~250 extra draw calls,
    // just to glow two targets. It's also switched off while the tank is far from them.
    const highlightLayer = new BABYLON.HighlightLayer("target-highlight", _this.scene, {
        blurHorizontalSize: 0.6,
        blurVerticalSize: 0.6,
        renderingGroupId: TARGET_RENDERING_GROUP,
    });
    _this.scene.setRenderingAutoClearDepthStencil(TARGET_RENDERING_GROUP, false, false, false);
    const addGlow = (mesh: BABYLON.AbstractMesh) => {
        mesh.renderingGroupId = TARGET_RENDERING_GROUP;
        if (mesh instanceof BABYLON.Mesh) {
            highlightLayer.addMesh(mesh, highlightColor);
        }
    };
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
    const targetMarks: Record<string, string> = { GitHub: "GH", LinkedIn: "in" };
    const toyTargets = new Map<BABYLON.Mesh, ToyTarget>();
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
            toyTarget.meshes.forEach(addGlow);
        } else {
            addGlow(target.mesh);
        }
        // The rest of the target (its mark) is drawn with it, so the target can't cover it.
        target.mesh.getChildMeshes(false).forEach((mesh) => {
            mesh.renderingGroupId = TARGET_RENDERING_GROUP;
        });
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

        highlightLayer.isEnabled = nearestTargetDistanceSquared <= GLOW_DISTANCE * GLOW_DISTANCE;

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
                    _this.sounds.chime(target.mesh.absolutePosition);
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
        _this.sounds.shot();
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

        shotBall.physicsImpostor = new BABYLON.PhysicsImpostor(shotBall, BABYLON.PhysicsImpostor.SphereImpostor, SHOT_PHYSICS, _this.scene);
        collideWithRamps(shotBall.physicsImpostor);
        _this.impacts.track(shotBall.physicsImpostor, "ball");
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
function hasRecentHit(now: number, hitFeedbackUntil: number): boolean {
    return now < hitFeedbackUntil;
}

function formatDistance(distance: number): string {
    return `${Math.max(1, Math.round(distance))}m away`;
}
