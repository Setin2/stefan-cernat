import type { Scene } from "@babylonjs/core/scene";
import type { AdvancedDynamicTexture, Rectangle, TextBlock } from "@babylonjs/gui/2D";

import { NARROW_LAYOUT, UI, createCard, createText, isNarrowScreen, refreshWhenFontLoaded, type GuiModule } from "./style";

/**
 * A minigame's card (top centre): an eyebrow badge, a big line (time, score) and a smaller line
 * (hints). Each game shows its card near its corner or during a round.
 *
 * All the minigames share one full-screen GUI layer, which is switched off while none of their
 * cards is showing, so it costs nothing while you're driving around elsewhere.
 */
export type MinigameHud = {
    setVisible: (visible: boolean) => void;
    set: (badge: string, badgeColor: string, main: string, detail: string, mainColor?: string) => void;
};

type SharedLayer = { ui: AdvancedDynamicTexture; visible: Set<string> };
const layers = new WeakMap<Scene, SharedLayer>();

function getLayer(gui: GuiModule, scene: Scene): SharedLayer {
    let layer = layers.get(scene);
    if (!layer) {
        const ui = gui.AdvancedDynamicTexture.CreateFullscreenUI("minigame-ui", true, scene);
        if (ui.layer) {
            ui.layer.isEnabled = false;
        }
        refreshWhenFontLoaded(ui);
        layer = { ui, visible: new Set() };
        layers.set(scene, layer);
        scene.onDisposeObservable.addOnce(() => ui.dispose());
    }
    return layer;
}

export function createMinigameHud(gui: GuiModule, scene: Scene, name: string): MinigameHud {
    const layer = getLayer(gui, scene);
    const ui = layer.ui;
    const card: Rectangle = createCard(gui, `${name}-hud`);
    card.width = `${Math.min(340, window.innerWidth - (NARROW_LAYOUT.margin * 2))}px`;
    card.height = "1px";
    card.adaptHeightToChildren = true;
    card.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_CENTER;
    card.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_TOP;
    card.top = isNarrowScreen() ? `${NARROW_LAYOUT.belowBadge}px` : "18px";
    card.zIndex = 2;
    card.isPointerBlocker = false;
    card.isVisible = false;

    const stack = new gui.StackPanel(`${name}-hud-stack`);
    stack.isVertical = true;
    stack.paddingTop = "10px";
    stack.paddingBottom = "12px";
    card.addControl(stack);

    const badge = new gui.Rectangle(`${name}-hud-badge`);
    badge.height = "24px";
    badge.width = "1px";
    badge.adaptWidthToChildren = true;
    badge.thickness = 0;
    badge.cornerRadius = 12;
    const badgeText: TextBlock = createText(gui, `${name}-hud-badge-text`, "", { size: 12, weight: "900", color: UI.cream, align: "center" });
    badgeText.resizeToFit = true;
    badgeText.paddingLeft = "10px";
    badgeText.paddingRight = "10px";
    badge.addControl(badgeText);
    stack.addControl(badge);

    const main = createText(gui, `${name}-hud-main`, "", { size: 20, weight: "900", color: UI.navy, align: "center" });
    main.height = "32px";
    main.paddingTop = "6px";
    stack.addControl(main);

    const detail = createText(gui, `${name}-hud-detail`, "", { size: 14, weight: "800", color: UI.muted, align: "center" });
    detail.textWrapping = true;
    detail.resizeToFit = true;
    detail.paddingLeft = "14px";
    detail.paddingRight = "14px";
    detail.paddingTop = "2px";
    stack.addControl(detail);

    ui.addControl(card);

    let last = "";
    return {
        setVisible: (visible) => {
            if (card.isVisible === visible) {
                return;
            }
            card.isVisible = visible;
            if (visible) {
                layer.visible.add(name);
            } else {
                layer.visible.delete(name);
            }
            if (ui.layer) {
                ui.layer.isEnabled = layer.visible.size > 0;
            }
        },
        set: (badgeLabel, badgeColor, mainText, detailText, mainColor = UI.navy) => {
            const key = [badgeLabel, badgeColor, mainText, detailText, mainColor].join("|");
            if (key === last) {
                return;
            }
            last = key;
            badgeText.text = badgeLabel;
            badge.background = badgeColor;
            main.text = mainText;
            main.color = mainColor;
            detail.text = detailText;
        },
    };
}
