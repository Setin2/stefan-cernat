import { openLink } from "../../src/scenes/ui/linkPrompt";

describe("openLink", () => {
    afterEach(() => {
        jest.restoreAllMocks();
        document.querySelector(".link-prompt")?.setAttribute("hidden", "");
    });

    it("opens the link in a new tab and cuts the tab's link back to the site", () => {
        const tab = { opener: window as unknown } as Window;
        const open = jest.spyOn(window, "open").mockReturnValue(tab);
        openLink("GitHub", "https://github.com/Setin2");
        expect(open).toHaveBeenCalledWith("https://github.com/Setin2", "_blank");
        expect(tab.opener).toBeNull();
        const prompt = document.querySelector<HTMLAnchorElement>(".link-prompt");
        expect(prompt === null || prompt.hidden).toBe(true);
    });

    it("offers a button for the link when the browser blocks the new tab", () => {
        jest.spyOn(window, "open").mockReturnValue(null);
        openLink("LinkedIn", "https://www.linkedin.com/in/stefan-cernat/");
        const prompt = document.querySelector<HTMLAnchorElement>(".link-prompt")!;
        expect(prompt.hidden).toBe(false);
        expect(prompt.textContent).toBe("Open LinkedIn ↗");
        expect(prompt.href).toBe("https://www.linkedin.com/in/stefan-cernat/");
        expect(prompt.target).toBe("_blank");
        expect(prompt.rel).toContain("noopener");
        // Tapping it hides it again.
        prompt.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        expect(prompt.hidden).toBe(true);
    });

    it("goes away by itself after a while", () => {
        jest.useFakeTimers();
        jest.spyOn(window, "open").mockReturnValue(null);
        openLink("GitHub", "https://github.com/Setin2");
        const prompt = document.querySelector<HTMLAnchorElement>(".link-prompt")!;
        expect(prompt.hidden).toBe(false);
        jest.advanceTimersByTime(9000);
        expect(prompt.hidden).toBe(true);
        jest.useRealTimers();
    });
});
