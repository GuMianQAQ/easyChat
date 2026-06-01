export type MessageType = "chat" | "system" | "error" | "revoke" | "ai-stream-chunk" | "ai-stream-done";
export type ChatMessageType = "text" | "image" | "file";
export type MessageStatus = "sending" | "sent" | "failed";
export type MessageScope = "private" | "group" | "system";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "failed";

export type DockView = "chat" | "contacts" | "favorites" | "files" | "settings";
export type ThemeMode = "light" | "dark" | "system";
export type ContactPermission = "chat" | "limited";
export type ContactSource = "self" | "group" | "recent" | "system" | "manual";
export type AuthMode = "login" | "register";
export type FriendRequestStatus = "none" | "pending" | "received" | "accepted";

export interface MessageQuote {
  id: string;
  username: string;
  content: string;
  messageType: ChatMessageType;
  time: string;
}

export interface ServerMessage {
  id: string;
  messageId?: string;
  conversationId: string;
  messageScope: MessageScope;
  type: MessageType;
  messageType: ChatMessageType;
  senderId: string;
  senderName: string;
  operatorId?: string;
  targetUserId?: string;
  targetName?: string;
  content: string;
  createdAt: string;
  revokedAt?: string;
  onlineCount: number;
  avatar: string;
  quote?: MessageQuote | null;
  revoked?: boolean;
}

export interface ClientChatPayload {
  id: string;
  conversationId: string;
  messageScope: "private" | "group";
  type: "chat";
  messageType: ChatMessageType;
  targetUserId?: string;
  targetName?: string;
  content: string;
  avatar: string;
  quote?: MessageQuote | null;
}

export interface ClientRevokePayload {
  id: string;
  conversationId: string;
  messageScope: "private" | "group";
  targetUserId?: string;
  type: "revoke";
}

export type ClientMessagePayload = ClientChatPayload | ClientRevokePayload;

export interface ChatMessage {
  id: string;
  conversationId: string;
  messageScope: MessageScope;
  type: MessageType;
  messageType: ChatMessageType;
  senderId: string;
  senderName: string;
  targetUserId?: string;
  targetName?: string;
  content: string;
  createdAt: string;
  onlineCount: number;
  avatar: string;
  isSelf: boolean;
  quote?: MessageQuote | null;
  status?: MessageStatus;
  revoked?: boolean;
}

export interface Conversation {
  id: string;
  type: "private" | "group" | "system";
  title: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageType?: ChatMessageType;
  lastMessageTime?: string;
  unreadCount: number;
  muted?: boolean;
  pinned?: boolean;
  announcement?: string;
  memberCount?: number;
  createdBy?: string;
  targetUserId?: string;
  targetUsername?: string;
  targetNickname?: string;
  targetAvatar?: string;
  targetName?: string;
}

export interface ConversationPayload {
  id: string;
  type: "private" | "group" | "system";
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageType: ChatMessageType;
  lastMessageTime: string;
  unreadCount: number;
  pinned: boolean;
  muted: boolean;
  announcement?: string;
  memberCount?: number;
  createdBy?: string;
  targetUserId?: string;
  targetUsername?: string;
  targetNickname?: string;
  targetAvatar?: string;
  targetName?: string;
}

export interface MessagePagePayload {
  items: ServerMessage[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface MessageAroundPayload extends MessagePagePayload {
  anchorMessageId: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  gender: "unknown" | "male" | "female";
  region: string;
  signature: string;
  momentCover: string;
}

export interface PrivacySettings {
  allowSearch: boolean;
  allowFriendRequest: boolean;
  requireFriendVerify: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  gender?: "unknown" | "male" | "female";
  region?: string;
  signature?: string;
  momentCover?: string;
  isSelf: boolean;
  isFriend: boolean;
  requestStatus: FriendRequestStatus;
  requestId?: string;
  allowFriendRequest: boolean;
}

export interface LoginFormState {
  username: string;
  password: string;
}

export interface RegisterFormState {
  username: string;
  password: string;
  confirmPassword: string;
  nickname: string;
  avatar: string;
  captchaId: string;
  captchaCode: string;
  captchaImage: string;
}

export interface AuthDraft {
  mode: AuthMode;
  login: LoginFormState;
  register: RegisterFormState;
}

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  time: string;
  level: "info" | "success" | "warning" | "error";
  eventType: string;
}

export interface ContactItem {
  id: string;
  name: string;
  avatar: string;
  username?: string;
  friendId?: string;
  remark?: string;
  tags?: string[];
  phone?: string;
  description?: string;
  descriptionImages?: ContactDescriptionImage[];
  isStarred?: boolean;
  isBlocked?: boolean;
  blockedAt?: string;
  blockedByPeer?: boolean;
  permission?: ContactPermission;
  lastSeenAt?: string;
  gender?: "unknown" | "male" | "female";
  region?: string;
  signature?: string;
  addedAt?: string;
  source: ContactSource;
}

export interface FriendItem {
  id: string;
  friendId: string;
  username: string;
  nickname: string;
  avatar: string;
  gender: "unknown" | "male" | "female";
  region: string;
  signature: string;
  remark: string;
  tags: string[];
  phone: string;
  description: string;
  descriptionImages: ContactDescriptionImage[];
  isStarred: boolean;
  isBlocked: boolean;
  blockedAt: string;
  blockedByPeer: boolean;
  permission: ContactPermission;
  createdAt: string;
}

export interface ContactDescriptionImage {
  url: string;
  favorite: boolean;
}

export interface FriendRequestItem {
  id: string;
  requestId?: string;
  direction: "received" | "sent";
  fromUserId?: string;
  fromUsername?: string;
  fromNickname?: string;
  fromAvatar?: string;
  message: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  user: UserProfile;
}

export interface FavoriteItem {
  id: string;
  messageId: string;
  conversationId: string;
  conversationName: string;
  messageType: ChatMessageType;
  content: string;
  quoteContent: string;
  quoteMessageType: ChatMessageType | "";
  senderId: string;
  senderName: string;
  senderAvatar: string;
  messageCreatedAt: string;
  createdAt: string;
}

export interface FileRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  selectedAt: string;
  previewUrl?: string;
}

export interface UploadedFileItem {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  fileKind: string;
  messageCreatedAt: string;
  createdAt: string;
}

export interface MomentItem {
  id: string;
  authorId: string;
  author: MomentAuthor;
  content: string;
  images: string[];
  likeCount: number;
  likedByMe: boolean;
  comments: MomentCommentItem[];
  canDelete: boolean;
  createdAt: string;
}

export interface MomentAuthor {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
}

export interface MomentCommentItem {
  id: string;
  authorId: string;
  author: MomentAuthor;
  content: string;
  canDelete: boolean;
  createdAt: string;
}

export type CompletionGranularity = 'simple' | 'medium' | 'complex';
export type PredictionScope = 'all' | 'ai' | 'normal';

export interface UserSettings {
  theme: ThemeMode;
  rememberProfile: boolean;
  clearAfterSend: boolean;
  enterToSend: boolean;
  aiSearchEnabled: boolean;
  inputCompletion: boolean;
  completionGranularity: CompletionGranularity;
  completionScope: PredictionScope;
  questionPrediction: boolean;
  questionPredictionScope: PredictionScope;
}

// Group chat enhancement types

export interface GroupMemberItem {
  userId: string;
  username: string;
  nickname: string;
  avatar: string;
  role: "owner" | "admin" | "member";
  groupNickname: string;
  mutedUntil?: string | null;
}

export interface GroupConversationPayload {
  id: string;
  type: "group";
  name: string;
  avatar: string;
  announcement: string;
  remark: string;
  myNickname: string;
  myRole: "owner" | "admin" | "member";
  canEditGroupProfile: boolean;
  botEnabled: boolean;
  isMuted: boolean;
  memberCount: number;
  members: GroupMemberItem[];
}

export interface PinnedMessage {
  id: string;
  conversationId: string;
  messageType: ChatMessageType;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface GroupFileItem {
  id: string;
  senderId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface GroupInviteLink {
  id: string;
  conversationId: string;
  code: string;
  createdBy: string;
  maxUses: number;
  useCount: number;
  expiresAt?: string | null;
  createdAt: string;
}

export interface VoteOption {
  id: string;
  optionText: string;
  sortOrder: number;
  voteCount: number;
}

export interface Vote {
  id: string;
  conversationId: string;
  creatorId: string;
  question: string;
  allowMulti: boolean;
  anonymous: boolean;
  deadline?: string | null;
  createdAt: string;
  options: VoteOption[];
  totalVotes: number;
}

export interface SolitaireItem {
  id: string;
  userId: string;
  content: string;
  sortOrder: number;
  createdAt: string;
}

export interface Solitaire {
  id: string;
  conversationId: string;
  creatorId: string;
  title: string;
  createdAt: string;
  items: SolitaireItem[];
}

export interface GroupPermissions {
  who_can_change_name: "admin" | "all";
  who_can_change_avatar: "admin" | "all";
  who_can_change_announcement: "admin" | "all";
  who_can_create_vote: "admin" | "all";
  who_can_create_solitaire: "admin" | "all";
  mute_all: boolean;
}
