import { useState } from "preact/hooks";
import { render } from "preact";
import { cn } from "@/lib/utils";
import { goToTab } from "@/utils/navigation";

/** 
 * Extension icon.
 */
const ChatterpackIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 512 512">
        <path fill="var(--color-text-base)" d="M153.33,506.83c-30.07-7.47-54.44-19.99-73.13-37.56-18.7-17.58-32.44-38.72-41.23-63.46s-13.07-51.39-12.81-79.98c.25-28.56,4.47-57.28,12.67-86.16,14.83-51.54,35.54-94.03,62.09-127.49,26.56-33.43,55.98-59.07,88.29-76.87C221.5,17.49,254.26,6.5,287.48,2.33c33.22-4.17,63.89-2.74,92.07,4.26,23.86,5.93,44.48,15.22,61.85,27.92,17.37,12.67,29.93,27.96,37.64,45.84,7.71,17.88,8.89,37.56,3.57,59.03-4.16,16.72-13.06,31.6-26.68,44.69-13.64,13.09-31.59,22.07-53.82,26.93-22.23,4.86-48.88,3.43-79.89-4.28,9.04-13.95,16.19-26.37,21.41-37.25,5.24-10.85,8.85-20.33,10.88-28.46,4.14-16.69,3.13-28.97-3-36.86-6.14-7.86-14.95-13.2-26.41-16.05-13.85-3.44-28.21-1.68-43.12,5.25s-29.35,17.67-43.35,32.16c-14,14.52-26.41,31.33-37.24,50.41-10.84,19.1-19.34,39.03-25.51,59.81-15.08,52.5-17.41,94.49-6.97,125.97,10.41,31.49,29.24,50.58,56.43,57.34,21.01,5.22,46.41,2.42,76.22-8.43,29.79-10.83,61.44-30.58,94.92-59.27l8.24,6.61c-16.88,41.41-39.5,74.31-67.86,98.68-28.36,24.36-58.65,40.67-90.83,48.87-32.19,8.24-63.1,8.65-92.69,1.31l.03.05h-.06l.02-.03Z" />
    </svg>
);

/**
 * The button to open the extension settings in the Twitch header.
 */
const ChatterpackSettingsButton = () => {
    const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);

    return (
        <>
            <button
                aria-label="Chatterpack"
                onClick={() => goToTab({ to: "/commands" })}
                onMouseEnter={() => setTooltipVisible(true)}
                onMouseLeave={() => setTooltipVisible(false)}
            ><ChatterpackIcon /></button>

            {/* Tooltip */}
            <span
                role="tooltip"
                className={cn('chatterpack-tooltip')}
                style={{
                    opacity: tooltipVisible ? 1 : 0,
                    visibility: tooltipVisible ? "visible" : "hidden",
                }}>
                {/* Up arrow */}
                <span />
                Chatterpack
            </span>
        </>
    );
};

// Button class
const BUTTON_CLASS = "chatterpack-settings-button";

/**
 * Renders a Preact component inside a new div following the anchor element.
 * @param anchor
 * @returns Returns cleanup — removes the container from the DOM.
 */
const mountButton = (anchor: Element): (() => void) => {
    const container = document.createElement("div");
    container.className = BUTTON_CLASS;
    anchor.insertAdjacentElement("afterend", container);
    render(<ChatterpackSettingsButton />, container);
    return () => container.remove();
};

/**
 * Checks whether the button can be mounted and mounts it.
 * @returns Returns null if the button already exists or the anchor is not found.
 */
const tryInject = (): (() => void) | null => {
    if (document.querySelector(`.${BUTTON_CLASS}`)) return null;

    const anchor = document.querySelector('[data-a-target="whisper-box-button"]')?.closest(".VxLcr");
    if (!anchor) return null;

    return mountButton(anchor);
};

/**
 * It launches a MutationObserver that monitors the DOM and mounts the button as soon as Twitch renders the header.
 *
 * @returns cleanup — stops the observer and removes the button.
 */
export const injectChatterpackSettingsButton = (): (() => void) => {
    let cleanup: (() => void) | null = null;

    const observer = new MutationObserver(() => {
        cleanup = tryInject();
        if (cleanup) {
            // The button has been installed — the observer is no longer needed
            observer.disconnect();
        }
    });

    // If the header already exists, try it right now.
    cleanup = tryInject();

    // If it doesn't work right now, we'll wait using an observer
    if (!cleanup) {
        observer.observe(document.body ?? document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    return () => {
        observer.disconnect();
        cleanup?.();
    };
};