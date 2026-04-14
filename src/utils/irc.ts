const toNumber = (value: string | null) =>
  value != null ? Number(value) : null;

export const getValue = (name: string, input: string) => {
  const match = input.match(new RegExp(`${name}=(.*?)(;| )`));
  return match && match[1] !== "" ? match[1] : null;
};

export const getBoolean = (name: string, input: string) =>
  input.includes(name + "=1");

export const getMessage = (input: string) => {
  const match = input.match(/ #.+? :(.+)$/m);
  return match ? match[1] : null;
};

export const getChannel = (input: string) => {
  const match = input.match(/ #([\S]+)/m);
  return match ? match[1] : null;
};

export const getClearchatUsername = (input: string) => {
  const match = input.match(/ :([\S]+)$/m);
  return match ? match[1] : null;
};

export const getJoinUsername = (input: string) => {
  const match = input.match(/:(.+?)!/);
  return match ? match[1] : null;
};

export const getUsername = (input: string) => {
  const match = input.match(/ :?(.+?)!/);
  return match ? match[1] : null;
};

export const isSubscriber = (input: string) => getBoolean("subscriber", input);
export const isMod = (input: string) => getBoolean("mod", input);
export const isVip = (input: string) => getBoolean("vip", input);
export const isTurbo = (input: string) => getBoolean("turbo", input);
export const isFirstMsg = (input: string) => getBoolean("first-msg", input);
export const isEmoteOnly = (input: string) => getBoolean("emote-only", input);
export const isMsgParamWasGifted = (input: string) =>
  getBoolean("msg_param_was_gifted", input);
export const isFollowersOnly = (input: string) =>
  getBoolean("followers-only", input);
export const isSubsOnly = (input: string) => getBoolean("subs-only", input);

export const getRoomId = (input: string) =>
  toNumber(getValue("room-id", input));

export const getDisplayName = (input: string) =>
  getValue("display-name", input);

export const getReplyUsername = (input: string) =>
  getValue("reply-parent-user-login", input);

export const getUserId = (input: string) =>
  toNumber(getValue("user-id", input));
export const getTargetUserId = (input: string) =>
  toNumber(getValue("target-user-id", input));

export const getBanDuration = (input: string) =>
  toNumber(getValue("ban-duration", input));

export const getId = (input: string) => getValue("id", input);
export const getTargetMsgId = (input: string) =>
  getValue("target-msg-id", input);
export const getLogin = (input: string) => getValue("login", input);
export const getColor = (input: string) => getValue("color", input);
export const getMsgParamColor = (input: string) =>
  getValue("msg-param-color", input);
export const getMsgId = (input: string) => getValue("msg_id", input);

export const getMsgParamSubPlan = (input: string) =>
  toNumber(getValue("msg-param-sub-plan", input));
export const getMsgParamCumulativeMonths = (input: string) =>
  toNumber(getValue("msg-param-cumulative-months", input));
export const getMsgParamMultimonthDuration = (input: string) =>
  toNumber(getValue("msg-param-multimonth-duration", input));
export const getMsgParamMultimonthTenure = (input: string) =>
  toNumber(getValue("msg-param-multimonth-tenure", input));
export const getMsgParamShouldShareStreak = (input: string) =>
  toNumber(getValue("msg-param-should-share-streak", input));
export const getMsgParamCommunityGiftId = (input: string) =>
  getValue("msg-param-community-gift-id", input);
export const getMsgParamMonths = (input: string) =>
  toNumber(getValue("msg-param-months", input));
export const getMsgParamGiftMonths = (input: string) =>
  toNumber(getValue("msg-param-gift-months", input));
export const getSystemMsg = (input: string) => getValue("system-msg", input);
export const getMsgParamRecipientUserName = (input: string) =>
  getValue("msg-param-recipient-user-name", input);

export const getMsgParamRecipientId = (input: string) =>
  toNumber(getValue("msg-param-recipient-id", input));
export const getTmiSentTimestamp = (input: string) =>
  toNumber(getValue("tmi-sent-ts", input));

export const getSlow = (input: string) => toNumber(getValue("slow", input));

export const getEmotes = (input: string) => {
  const emotes = getValue("emotes", input);
  if (emotes == null) return null;
  return emotes.split("/").map((emote) => {
    const [id, range] = emote.split(":");
    return { id, range };
  });
};
