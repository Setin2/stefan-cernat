import * as BABYLON from "@babylonjs/core";
import type { AdvancedDynamicTexture, Rectangle } from "@babylonjs/gui";

import { UI, createCard, createKeycap, createRow, createSpacer, createText, refreshWhenFontLoaded, type GuiModule } from "./style";

/** The help card hides itself after this long on first load. */
const AUTO_DISMISS_MS = 10000;

/**
 * The "how to play" help card and the H / M shortcut badge, plus the keyboard shortcuts that
 * drive them: H toggles the help, Esc closes it and M mutes all sound.
 */
export class ControlOverlay {
    private texture: AdvancedDynamicTexture | null = null;
    private panel: Rectangle | null = null;
    private hint: ControlHint | null = null;
    private dismissTimer: ReturnType<typeof setTimeout> | null = null;
    private muted = false;

    private readonly handleHotkeys = (event: KeyboardEvent) => {
        if (event.repeat) {
            return;
        }

        const key = event.key.toLowerCase();
        if (key === "h") {
            this.toggle();
        } else if (key === "escape") {
            this.hide();
        } else if (key === "m") {
            this.toggleMute();
        }
    };

    public constructor(private readonly scene: BABYLON.Scene) {}

    /** Builds the overlay and shows the help card (it hides itself after a while). */
    public async show(): Promise<void> {
        const gui = await import("@babylonjs/gui");
        if (this.scene.isDisposed) {
            return;
        }

        this.dispose();

        this.texture = gui.AdvancedDynamicTexture.CreateFullscreenUI("control-overlay", true, this.scene);
        const { panel, hint } = createControlOverlay(gui, this.texture, {
            onToggle: () => this.toggle(),
            onClose: () => this.hide(),
            onToggleMute: () => this.toggleMute(),
            isTouchDevice: window.matchMedia("(pointer: coarse)").matches,
        });
        this.panel = panel;
        this.hint = hint;
        this.updateHint();

        window.addEventListener("keydown", this.handleHotkeys);
        this.dismissTimer = setTimeout(() => this.hide(), AUTO_DISMISS_MS);
    }

    public dispose(): void {
        this.clearDismissTimer();
        window.removeEventListener("keydown", this.handleHotkeys);
        this.texture?.dispose();
        this.texture = null;
        this.panel = null;
        this.hint = null;
    }

    private toggle(): void {
        if (!this.panel) {
            return;
        }

        // Manual interaction takes over; don't let the first-load auto-dismiss hide a reopened panel.
        this.clearDismissTimer();
        this.panel.isVisible = !this.panel.isVisible;
        this.updateHint();
    }

    private hide(): void {
        this.clearDismissTimer();
        if (!this.panel?.isVisible) {
            return;
        }

        this.panel.isVisible = false;
        this.updateHint();
    }

    private toggleMute(): void {
        this.muted = !this.muted;
        BABYLON.Engine.audioEngine?.setGlobalVolume(this.muted ? 0 : 1);
        this.updateHint();
    }

    private updateHint(): void {
        this.hint?.update(!!this.panel?.isVisible, this.muted);
    }

    private clearDismissTimer(): void {
        if (this.dismissTimer) {
            clearTimeout(this.dismissTimer);
            this.dismissTimer = null;
        }
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
