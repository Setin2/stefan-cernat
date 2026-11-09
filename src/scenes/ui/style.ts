import type { AdvancedDynamicTexture, Control, Rectangle, StackPanel, TextBlock } from "@babylonjs/gui/2D";

/**
 * Shared look for the on-screen UI, matching the toy world: cream cards with a chunky navy outline
 * and a solid drop shadow, rounded bold type, keyboard keys drawn as little navy keycaps, and the
 * world's sakura pink and gold as accents.
 */

export type GuiModule = typeof import("@babylonjs/gui/2D");

export const UI = {
    cream: "#F4EBDD",
    sand: "#E8DCC6",
    navy: "#344B63",
    navyDeep: "#22313F",
    pink: "#E8869F",
    pinkDeep: "#C9667F",
    gold: "#D9A13B",
    mint: "#7CC9A0",
    text: "#2B3A4A",
    muted: "#6B7B8C",
    shadow: "rgba(26, 40, 56, 0.45)",
    font: "Nunito, \"Arial Rounded MT Bold\", \"Trebuchet MS\", sans-serif",
};

/**
 * Phones (in portrait) and other narrow screens: the corner cards would run into each other, so
 * the objective card spans the top and the other cards stack below it (see NARROW_LAYOUT).
 */
export function isNarrowScreen(): boolean {
    return window.innerWidth < 760;
}

/** Where things go on a narrow screen, from the top (the objective card is about 110 px tall). */
export const NARROW_LAYOUT = { margin: 12, belowObjective: 132, belowBadge: 184 };

/** Redraws the UI once the web font has loaded (text drawn before that uses the fallback font). */
export function refreshWhenFontLoaded(ui: AdvancedDynamicTexture): void {
    if (!("fonts" in document)) {
        return;
    }
    void Promise.all(["700", "800", "900"].map((weight) => document.fonts.load(`${weight} 16px Nunito`)))
        .then(() => ui.markAsDirty())
        .catch(() => undefined);
}

/** A cream card with a navy outline and a hard drop shadow. */
export function createCard(gui: GuiModule, name: string, options: { radius?: number; thickness?: number; background?: string; border?: string } = {}): Rectangle {
    const card = new gui.Rectangle(name);
    card.background = options.background ?? UI.cream;
    card.color = options.border ?? UI.navy;
    card.thickness = options.thickness ?? 3;
    card.cornerRadius = options.radius ?? 16;
    card.shadowColor = UI.shadow;
    card.shadowOffsetY = 4;
    card.shadowOffsetX = 0;
    card.shadowBlur = 0;
    return card;
}

export function createText(gui: GuiModule, name: string, text: string, options: { size?: number; weight?: string; color?: string; align?: "left" | "center" } = {}): TextBlock {
    const block = new gui.TextBlock(name, text);
    block.fontFamily = UI.font;
    block.fontSize = options.size ?? 15;
    block.fontWeight = options.weight ?? "700";
    block.color = options.color ?? UI.text;
    block.textHorizontalAlignment = options.align === "center" ? gui.Control.HORIZONTAL_ALIGNMENT_CENTER : gui.Control.HORIZONTAL_ALIGNMENT_LEFT;
    return block;
}

/** A keyboard key: navy rounded square with a cream letter and a darker "side" underneath. */
export function createKeycap(gui: GuiModule, name: string, key: string): Rectangle {
    const width = key.length > 1 ? 16 + (key.length * 9) : 28;
    const cap = new gui.Rectangle(name);
    cap.width = `${width}px`;
    cap.height = "28px";
    cap.thickness = 0;
    cap.cornerRadius = 7;
    cap.background = UI.navy;
    cap.shadowColor = UI.navyDeep;
    cap.shadowOffsetY = 3;
    cap.shadowBlur = 0;
    const label = createText(gui, `${name}-label`, key, { size: 13, weight: "900", color: UI.cream, align: "center" });
    label.top = "-1px";
    cap.addControl(label);
    return cap;
}

/** Horizontal row of controls with a fixed height. */
export function createRow(gui: GuiModule, name: string, height: number): StackPanel {
    const row = new gui.StackPanel(name);
    row.isVertical = false;
    row.height = `${height}px`;
    return row;
}

/** Fixed-width horizontal gap for rows. */
export function createSpacer(gui: GuiModule, name: string, width: number): Control {
    const spacer = new gui.Rectangle(name);
    spacer.width = `${width}px`;
    spacer.height = "1px";
    spacer.thickness = 0;
    return spacer;
}
