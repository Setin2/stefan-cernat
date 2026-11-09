import { UI } from "./style";

/**
 * Opens a link the tank shot. Browsers only open new tabs straight from a click, tap or key press,
 * and a hit lands a moment after the shot, so the tab can be blocked (always on iPhones). When it
 * is, a "Open GitHub ↗" button pops up above the touch controls instead: a real link, so tapping it
 * always works.
 */

/** How long the button stays up. */
const SHOW_MS = 8000;

const STYLE = `
.link-prompt {
    position: fixed; left: 50%; bottom: calc(150px + env(safe-area-inset-bottom)); z-index: 16;
    transform: translateX(-50%); padding: 12px 22px; border: 3px solid ${UI.navy}; border-radius: 999px;
    background: ${UI.pink}; box-shadow: 0 4px 0 ${UI.navyDeep}; color: ${UI.navyDeep};
    font: 900 17px ${UI.font}; text-decoration: none; white-space: nowrap;
    animation: link-prompt-in 0.2s ease-out;
}
.link-prompt[hidden] { display: none; }
@keyframes link-prompt-in { from { opacity: 0; transform: translate(-50%, 8px); } }
@media (prefers-reduced-motion: reduce) { .link-prompt { animation: none; } }
`;

let prompt: HTMLAnchorElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

/** Opens `url` in a new tab, or offers a button for it if the browser blocked the tab. */
export function openLink(label: string, url: string): void {
    // Not "noopener": with it, window.open always returns null, so a blocked tab couldn't be told
    // apart from an opened one. The new tab's link back to this page is cut by hand instead.
    const opened = window.open(url, "_blank");
    if (opened) {
        opened.opener = null;
        return;
    }
    showPrompt(label, url);
}

function showPrompt(label: string, url: string): void {
    if (!prompt) {
        const style = document.createElement("style");
        style.textContent = STYLE;
        document.head.appendChild(style);
        prompt = document.createElement("a");
        prompt.className = "link-prompt";
        prompt.target = "_blank";
        prompt.rel = "noopener noreferrer";
        prompt.addEventListener("click", () => hidePrompt());
        document.body.appendChild(prompt);
    }
    prompt.href = url;
    prompt.textContent = `Open ${label} ↗`;
    prompt.hidden = false;
    if (hideTimer) {
        clearTimeout(hideTimer);
    }
    hideTimer = setTimeout(hidePrompt, SHOW_MS);
}

function hidePrompt(): void {
    if (prompt) {
        prompt.hidden = true;
    }
}
