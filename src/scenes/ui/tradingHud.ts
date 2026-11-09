import type { AdvancedDynamicTexture, Rectangle, TextBlock } from "@babylonjs/gui";

import { UI, createCard, createText, refreshWhenFontLoaded, type GuiModule } from "./style";

/**
 * The Quantum Trader card (top centre): an eyebrow badge, a big line (time, profit) and a smaller
 * line (position, signal). Only shown near the work corner or during a round.
 */
export type TradingHud = {
    setVisible: (visible: boolean) => void;
    set: (badge: string, badgeColor: string, main: string, detail: string, mainColor?: string) => void;
};

export function createTradingHud(gui: GuiModule, ui: AdvancedDynamicTexture): TradingHud {
    const card: Rectangle = createCard(gui, "trading-hud");
    card.width = "340px";
    card.height = "1px";
    card.adaptHeightToChildren = true;
    card.horizontalAlignment = gui.Control.HORIZONTAL_ALIGNMENT_CENTER;
    card.verticalAlignment = gui.Control.VERTICAL_ALIGNMENT_TOP;
    card.top = "18px";
    card.zIndex = 2;
    card.isPointerBlocker = false;
    card.isVisible = false;

    const stack = new gui.StackPanel("trading-hud-stack");
    stack.isVertical = true;
    stack.paddingTop = "10px";
    stack.paddingBottom = "12px";
    card.addControl(stack);

    const badge = new gui.Rectangle("trading-hud-badge");
    badge.height = "24px";
    badge.width = "1px";
    badge.adaptWidthToChildren = true;
    badge.thickness = 0;
    badge.cornerRadius = 12;
    const badgeText: TextBlock = createText(gui, "trading-hud-badge-text", "", { size: 12, weight: "900", color: UI.cream, align: "center" });
    badgeText.resizeToFit = true;
    badgeText.paddingLeft = "10px";
    badgeText.paddingRight = "10px";
    badge.addControl(badgeText);
    stack.addControl(badge);

    const main = createText(gui, "trading-hud-main", "", { size: 20, weight: "900", color: UI.navy, align: "center" });
    main.height = "32px";
    main.paddingTop = "6px";
    stack.addControl(main);

    const detail = createText(gui, "trading-hud-detail", "", { size: 14, weight: "800", color: UI.muted, align: "center" });
    detail.textWrapping = true;
    detail.resizeToFit = true;
    detail.paddingLeft = "14px";
    detail.paddingRight = "14px";
    detail.paddingTop = "2px";
    stack.addControl(detail);

    ui.addControl(card);
    refreshWhenFontLoaded(ui);

    let last = "";
    return {
        setVisible: (visible) => {
            card.isVisible = visible;
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
