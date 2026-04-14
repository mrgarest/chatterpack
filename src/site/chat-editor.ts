import { MessageSource, MessageType } from "@/enums/message";

// Flag to prevent recursion.
let isInternalProcess = false;

/**
 * A recursive search of the Slate editor to gain direct access to text manipulation methods.
 * @param node - The starting DOM node.
 */
function getSlateEditor(node: HTMLElement): any {
  const fiberKey = Object.keys(node).find(
    (key) =>
      key.startsWith("__reactInternalInstance$") ||
      key.startsWith("__reactFiber$"),
  );
  if (!fiberKey) return null;

  let current = (node as any)[fiberKey];
  while (current) {
    if (current.pendingProps?.editor) return current.pendingProps.editor;
    current = current.return;
  }
  return null;
}

/**
 * Text capture and preparation for processing
 * @param execute - whether to initiate sending (Enter/Click) or just replace (Space)
 */
function handleCommand(execute: boolean) {
  if (isInternalProcess) return false;

  const editorNode = document.querySelector(
    '[data-slate-editor="true"]',
  ) as HTMLElement;
  const text = editorNode?.innerText;

  // Check if the text contains the trigger
  if (!text || !text.trim().startsWith("!")) return false;

  isInternalProcess = true;

  window.postMessage(
    {
      source: MessageSource.SITE,
      type: MessageType.CHAT_MESSAGE,
      payload: { text: text, execute: execute },
    },
    "*",
  );

  return true;
}

// Key processing
window.addEventListener(
  "keydown",
  (e: KeyboardEvent) => {
    if (!e.isTrusted) return;

    // Press Enter
    if (e.key === "Enter" && !e.shiftKey) {
      if (handleCommand(true)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }

    // Press Space
    if (e.key === " " || e.code === "Space") {
      handleCommand(false);
    }
  },
  true,
);

//  Click the Send button
window.addEventListener(
  "click",
  (e: MouseEvent) => {
    if (!e.isTrusted) return;

    const isSendBtn = (e.target as HTMLElement).closest(
      '[data-a-target="chat-send-button"]',
    );

    if (isSendBtn && handleCommand(true)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  true,
);

/**
 * Message listener for chat manipulation and command execution.
 * @param event
 * @returns
 */
const handleMessage = (event: MessageEvent) => {
  const editorNode = document.querySelector(
    '[data-slate-editor="true"]',
  ) as HTMLElement;

  // Unblock the process if the command is not found
  if (event.data.type === MessageType.COMMAND_NOT_FOUND) {
    isInternalProcess = false;

    if (event.data.payload?.execute && editorNode) {
      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
      });
      editorNode.dispatchEvent(enterEvent);
    }
    return;
  }

  // We are only interested in chat messages
  if (event.data.type !== MessageType.CHAT_MESSAGE) return;

  const { text, execute } = event.data.payload;

  const editor = getSlateEditor(editorNode);
  if (!editor) {
    isInternalProcess = false;
    return;
  }

  try {
    editor.withoutNormalizing(() => {
      // Clear the selection so that Slate doesn't look for the cursor in the removed nodes
      editor.selection = null;

      // Cleaning Slate
      while (editor.children.length > 0) {
        editor.apply({
          type: "remove_node",
          path: [0],
          node: editor.children[0],
        });
      }

      // Insert new text
      editor.apply({
        type: "insert_node",
        path: [0],
        node: {
          type: "paragraph",
          children: [{ text: text }],
        },
      });
    });

    // Focus at the end of the text
    const point = { path: [0, 0], offset: text.length };
    editor.selection = { anchor: point, focus: point };

    // Force the focus back to the DOM element
    editorNode.focus();

    // If it was a request to submit (Enter/Click) — simulate an Enter
    if (execute) {
      setTimeout(() => {
        const enterEvent = new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
        });
        editorNode.dispatchEvent(enterEvent);

        setTimeout(() => {
          isInternalProcess = false;
        }, 150);
      }, 10);
    } else {
      // If it was a transformation, unblock the process
      isInternalProcess = false;
    }
  } catch (e) {
    if (__DEBUG__) {
      console.error("[ChatEditor] sync error", e);
    }
    isInternalProcess = false;
  }
};

export const chatEditor = { handleMessage };
