import type { Auth, Channel, User } from "@/interfaces/chat-controller";
import { MessageSource, MessageType } from "@/enums/message";

/**
 * Tracks navigation between pages in the Twitch SPA.
 */
const watchPageChanges = (onChange: () => void): void => {
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);

    const observer = new MutationObserver(() => {
      observer.disconnect();
      onChange();
    });

    observer.observe(document.querySelector("title") ?? document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  };

  window.addEventListener("popstate", onChange);
};

/**
 * Search for the React ChatController component in the Twitch Fiber tree.
 */
const getChatController = (attempt = 0): Promise<any> => {
  return new Promise((resolve) => {
    const try_ = () => {
      const el = document.querySelector(
        'section[data-test-selector="chat-room-component-layout"]',
      );
      if (!el) {
        if (attempt > 20) {
          resolve(null);
          return;
        }
        setTimeout(try_, 500);
        return;
      }

      const reactKey = Object.keys(el).find(
        (k) =>
          k.startsWith("__reactFiber$") ||
          k.startsWith("__reactInternalInstance$"),
      );
      if (!reactKey) {
        setTimeout(try_, 500);
        return;
      }

      let node = (el as any)[reactKey];
      while (node) {
        if (
          node.stateNode?.props?.messageHandlerAPI &&
          node.stateNode?.props?.chatConnectionAPI &&
          node.stateNode?.props?.channelID
        ) {
          resolve(node.stateNode);
          return;
        }
        node = node.return;
      }

      setTimeout(try_, 500);
    };

    try_();
  });
};

/**
 * It collects data from ChatController and sends it to the content script via postMessage.
 */
const send = async () => {
  const controller = await getChatController();
  if (!controller) return;

  // Auth data
  const auth: Auth | null =
    controller.props?.clientID && controller.props?.authToken
      ? {
          clientId: controller.props.clientID,
          token: controller.props.authToken,
        }
      : null;

  // Channel data
  const channel: Channel | null =
    controller.props?.channelID &&
    controller.props?.channelDisplayName &&
    controller.props?.channelLogin
      ? {
          id: controller.props.channelID,
          name: controller.props.channelDisplayName,
          username: controller.props.channelLogin,
          isFollowerMode: controller.props.followerModeEnabled ?? false,
          isEditor: controller.props.isCurrentUserEditor ?? false,
          isModerator: controller.props.isCurrentUserModerator ?? false,
          isVip: controller.props.isCurrentUserVIP ?? false,
        }
      : null;

  // User data
  const user: User | null =
    controller.props?.userID &&
    controller.props?.userDisplayName &&
    controller.props?.userLogin
      ? {
          id: controller.props.userID,
          name: controller.props.userDisplayName,
          username: controller.props.userLogin,
        }
      : null;

  // Sending data
  window.postMessage(
    {
      source: MessageSource.SITE,
      type: MessageType.CHAT_CONRROLLER,
      payload: { auth, channel, user },
    },
    "*",
  );
};

/**
 * Initializing the chat controller and monitoring it.
 */
const init = () => {
  send();
  watchPageChanges(send);
};

export const chatController = { init };
