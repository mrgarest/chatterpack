export interface ChatController {
  auth: Auth | null;
  channel: Channel | null;
  user: User | null;
}

export interface Auth {
  clientId: string;
  token: string;
}

export interface Channel {
  id: string;
  name: string;
  username: string;
  isFollowerMode: boolean;
  isEditor: boolean;
  isModerator: boolean;
  isVip: boolean;
}

export interface User {
  id: string;
  name: string;
  username: string;
}
