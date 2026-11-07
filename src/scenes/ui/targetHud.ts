import type * as BABYLON from "@babylonjs/core";
import type { AdvancedDynamicTexture, Ellipse, Rectangle, TextBlock } from "@babylonjs/gui";

import { UI, createCard, createRow, createText, refreshWhenFontLoaded, type GuiModule } from "./style";

/**
 * The in-game target HUD: the objective card (top left), the sight in the middle of the screen,
 * hit feedback and the name bubbles above targets. Driven by tank/shooting.ts.
 */

/** What the objective card is currently about; sets its eyebrow label and colour. */
export type ObjectiveMood = "explore" | "nearby" | "locked" | "found" | "hit";

export type ObjectiveHint = {
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
export function createObjectiveHint(gui: GuiModule, ui: AdvancedDynamicTexture): ObjectiveHint {
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

export function createReticle(
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

export function createHitFeedback(
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

export function createImpactBurst(
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

/**
 * A little speech-bubble card above a target with its name, shown when the tank is close by.
 */
export function createTargetLabel(
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
