import AddFriendPanel from "../chat/AddFriendPanel";
import CreateGroupPanel from "../chat/CreateGroupPanel";
import ChatView from "../chat/ChatView";
import UserProfileCard from "../common/UserProfileCard";
import ContactsView from "../contacts/ContactsView";
import FavoritesView from "../favorites/FavoritesView";
import FilesView from "../files/FilesView";
import MainLayout from "../layout/MainLayout";
import SettingsView from "../settings/SettingsView";
import type {
  ChatMessage,
  ConnectionStatus,
  ContactItem,
  Conversation,
  CurrentUser,
  DockView,
  FavoriteItem,
  FileRecord,
  FriendItem,
  FriendRequestItem,
  NotificationItem,
  PrivacySettings,
  UserProfile,
  UserSettings,
} from "../../types/chat";

interface AppShellProps {
  activeDock: DockView;
  onDockChange: (dock: DockView) => void;
  currentUser: CurrentUser;
  totalUnread: number;
  visibleConversations: Conversation[];
  activeConversationId: string;
  contactItems: ContactItem[];
  starredContacts: ContactItem[];
  selectedContactId: string;
  contactsManagementOpen: boolean;
  requestCount: number;
  filteredFavorites: FavoriteItem[];
  favoriteItems: FavoriteItem[];
  favoriteType: "all" | "image" | "chat";
  favoriteKeyword: string;
  onFavoriteTypeChange: (value: "all" | "image" | "chat") => void;
  onFavoriteKeywordChange: (value: string) => void;
  selectedFiles: FileRecord[];
  visibleActiveConversation: Conversation;
  status: ConnectionStatus;
  activeMessages: ChatMessage[];
  activeHasMore: boolean;
  activeLoadingMore: boolean;
  notifications: NotificationItem[];
  groupConversation: import("../../types/chat").GroupConversationPayload | null;
  favoriteIds: Set<string>;
  favoriteJumpMessageId: string;
  enterToSend: boolean;
  clearAfterSend: boolean;
  composerDisabledReason: string;
  draftContent: string;
  friends: FriendItem[];
  friendRequests: FriendRequestItem[];
  selectedContact?: ContactItem;
  privacySettings: PrivacySettings;
  blockedFriends: FriendItem[];
  roomName: string;
  friendPanelOpen: boolean;
  createGroupPanelOpen: boolean;
  friendSearchResult: UserProfile | null;
  friendSearching: boolean;
  friendSubmitting: boolean;
  friendSearchError: string;
  profileCard: { profile: UserProfile; x: number; y: number } | null;
  onConversationChange: (conversationId: string) => void;
  onOpenAddFriend: () => void;
  onOpenCreateGroup: () => void;
  onTogglePinned: (conversation: Conversation, next: boolean) => void;
  onMarkRead: (conversation: Conversation) => void;
  onToggleMuted: (conversation: Conversation, next: boolean) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onHideConversation: (conversation: Conversation) => void;
  onSelectContact: (id: string) => void;
  onOpenContactsManagement: () => void;
  onOpenContactRequests: () => void;
  onOpenProfileCard: (userId: string, x: number, y: number) => void;
  onOpenCurrentUserProfile: (x: number, y: number) => void;
  onOpenAvatarPreview: (src: string) => void;
  onUploadImage: (file: File) => Promise<string>;
  onSendText: (content: string, quote?: import("../../types/chat").MessageQuote | null) => boolean;
  onSendImage: (dataUrl: string, quote?: import("../../types/chat").MessageQuote | null) => Promise<boolean>;
  onCaptureScreen: (quote?: import("../../types/chat").MessageQuote | null) => Promise<boolean>;
  onDraftChange: (value: string) => void;
  onLoadMore: () => void;
  onRetry: (messageId: string) => void;
  onRevoke: (message: ChatMessage) => void;
  onDeleteLocal: (messageId: string) => void;
  onToggleFavoriteMessage: (message: ChatMessage) => void;
  onCopyMessage: (message: ChatMessage) => void;
  onCreateQuote: (message: ChatMessage) => import("../../types/chat").MessageQuote;
  onNotice: (title: string, content: string, level?: NotificationItem["level"]) => void;
  onJumpHandled: () => void;
  onToggleActiveConversationPinned: (next: boolean) => void;
  onToggleActiveConversationMuted: (next: boolean) => void;
  onClearConversation: () => void;
  onCloseContactsManagement: () => void;
  onOpenChatFromContact: (contact: ContactItem) => void;
  onUpdateContact: (contactId: string, patch: Partial<ContactItem>) => void;
  onSetContactPermission: (contactId: string, permission: import("../../types/chat").ContactPermission) => void;
  onAcceptRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onDeleteFriend: (friendId: string) => void;
  onToggleBlock: (friendId: string, nextBlocked: boolean) => void;
  onRemoveFavorite: (id: string) => void;
  onOpenFavorite: (item: FavoriteItem) => void;
  onPickFiles: (files: FileRecord[]) => void;
  settings: UserSettings;
  onSettingsChange: (value: UserSettings | ((prev: UserSettings) => UserSettings)) => void;
  onPrivacyChange: (next: PrivacySettings) => void;
  onProfileUpdate: (
    patch: Partial<Pick<CurrentUser, "nickname" | "gender" | "region" | "signature">>,
  ) => Promise<string | null>;
  onChangePassword: (
    oldPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => Promise<string | null>;
  onAvatarPick: (file: File) => Promise<void>;
  onResetAvatar: () => void;
  onClearFavorites: () => void;
  onClearContacts: () => void;
  onClearLoginCache: () => void;
  onUnblockFriend: (friendId: string) => void;
  onLogout: () => void;
  onCloseAddFriend: () => void;
  onCloseCreateGroup: () => void;
  onCreateGroupConversation: (name: string, memberIds: string[]) => Promise<string>;
  onUpdateGroupConversation: (
    conversationId: string,
    patch: {
      avatar?: string;
      name?: string;
      announcement?: string;
      remark?: string;
      myNickname?: string;
      isMuted?: boolean;
    },
  ) => Promise<import("../../types/chat").GroupConversationPayload | null>;
  onSearchFriend: (username: string) => void;
  onSendFriendRequest: (message: string) => void;
  onAcceptProfileRequest: (profile: UserProfile) => void;
  onOpenProfileFromPanel: (profile: UserProfile, x: number, y: number) => void;
  onOpenChatFromProfile: (profile: UserProfile) => void;
  onOpenSettingsFromProfile: () => void;
  onCloseProfileCard: () => void;
  onOpenSendRequestFromProfile: (profile: UserProfile) => void;
}

export default function AppShell(props: AppShellProps) {
  const {
    activeDock,
    onDockChange,
    currentUser,
    totalUnread,
    visibleConversations,
    activeConversationId,
    contactItems,
    starredContacts,
    selectedContactId,
    contactsManagementOpen,
    requestCount,
    filteredFavorites,
    favoriteItems,
    favoriteType,
    favoriteKeyword,
  selectedFiles,
  visibleActiveConversation,
  status,
  activeMessages,
    activeHasMore,
    activeLoadingMore,
    notifications,
    groupConversation,
    favoriteIds,
    favoriteJumpMessageId,
    enterToSend,
    clearAfterSend,
    composerDisabledReason,
    draftContent,
    friends,
    friendRequests,
    selectedContact,
    privacySettings,
    blockedFriends,
  roomName,
    friendPanelOpen,
    createGroupPanelOpen,
    friendSearchResult,
    friendSearching,
    friendSubmitting,
    friendSearchError,
    profileCard,
    onFavoriteTypeChange,
    onFavoriteKeywordChange,
    onConversationChange,
    onOpenAddFriend,
    onOpenCreateGroup,
    onTogglePinned,
    onMarkRead,
    onToggleMuted,
    onDeleteConversation,
    onHideConversation,
    onSelectContact,
    onOpenContactsManagement,
    onOpenContactRequests,
    onOpenProfileCard,
    onOpenCurrentUserProfile,
  onOpenAvatarPreview,
  onUploadImage,
  onSendText,
    onSendImage,
    onCaptureScreen,
    onDraftChange,
    onLoadMore,
    onRetry,
    onRevoke,
    onDeleteLocal,
    onToggleFavoriteMessage,
    onCopyMessage,
    onCreateQuote,
    onNotice,
    onJumpHandled,
    onToggleActiveConversationPinned,
    onToggleActiveConversationMuted,
    onClearConversation,
    onCloseContactsManagement,
    onOpenChatFromContact,
    onUpdateContact,
    onSetContactPermission,
    onAcceptRequest,
    onRejectRequest,
    onDeleteFriend,
    onToggleBlock,
    onRemoveFavorite,
    onOpenFavorite,
    onPickFiles,
    settings,
    onSettingsChange,
    onPrivacyChange,
    onProfileUpdate,
    onChangePassword,
    onAvatarPick,
    onResetAvatar,
    onClearFavorites,
    onClearContacts,
    onClearLoginCache,
    onUnblockFriend,
    onLogout,
    onCloseAddFriend,
    onCloseCreateGroup,
    onCreateGroupConversation,
    onUpdateGroupConversation,
    onSearchFriend,
    onSendFriendRequest,
    onAcceptProfileRequest,
    onOpenProfileFromPanel,
    onOpenChatFromProfile,
    onOpenSettingsFromProfile,
    onCloseProfileCard,
    onOpenSendRequestFromProfile,
  } = props;

  return (
    <>
      <MainLayout
        activeDock={activeDock}
        onDockChange={onDockChange}
        currentUsername={currentUser.nickname}
        currentAvatar={currentUser.avatar}
        chatUnreadCount={totalUnread}
        onOpenCurrentProfile={onOpenCurrentUserProfile}
        sidebarContent={
          activeDock === "chat" ? (
            <ChatView.ConversationList
              items={visibleConversations}
              activeConversationId={activeConversationId}
              onConversationChange={onConversationChange}
              onOpenAddFriend={onOpenAddFriend}
              onOpenCreateGroup={onOpenCreateGroup}
              onTogglePinned={onTogglePinned}
              onMarkRead={onMarkRead}
              onToggleMuted={onToggleMuted}
              onDeleteConversation={onDeleteConversation}
              onHideConversation={onHideConversation}
            />
          ) : activeDock === "contacts" ? (
            <ContactsView.List
              contacts={contactItems}
              starredContacts={starredContacts}
              selectedId={selectedContactId}
              managementOpen={contactsManagementOpen}
              requestCount={requestCount}
              onSelect={onSelectContact}
              onOpenManagement={onOpenContactsManagement}
              onOpenRequests={onOpenContactRequests}
              onOpenProfile={(contact, event) => onOpenProfileCard(contact.id, event.clientX + 12, event.clientY + 12)}
            />
          ) : activeDock === "favorites" ? (
            <FavoritesView.List
              favorites={filteredFavorites}
              allCount={favoriteItems.length}
              imageCount={favoriteItems.filter((item) => item.messageType === "image").length}
              activeType={favoriteType}
              onTypeChange={onFavoriteTypeChange}
              keyword={favoriteKeyword}
              onKeywordChange={onFavoriteKeywordChange}
            />
          ) : activeDock === "files" ? (
            <FilesView.List files={selectedFiles} />
          ) : (
            <SettingsView.Sidebar />
          )
        }
        mainContent={
          activeDock === "chat" ? (
            <ChatView.Main
              activeConversation={visibleActiveConversation}
              status={status}
              messages={activeMessages}
              hasMore={activeHasMore}
              loadingMore={activeLoadingMore}
              notifications={notifications}
              groupConversation={groupConversation}
              favoriteIds={favoriteIds}
              jumpToMessageId={favoriteJumpMessageId}
              enterToSend={enterToSend}
              clearAfterSend={clearAfterSend}
              composerDisabledReason={composerDisabledReason}
              draftContent={draftContent}
              onDraftChange={onDraftChange}
              onSendText={onSendText}
              onSendImage={onSendImage}
              onCaptureScreen={onCaptureScreen}
              onLoadMore={onLoadMore}
              onRetry={onRetry}
              onRevoke={onRevoke}
              onDeleteLocal={onDeleteLocal}
              onToggleFavorite={onToggleFavoriteMessage}
              onCopyMessage={onCopyMessage}
              onOpenProfile={(profile, event) => onOpenProfileCard(profile.userId, event.clientX + 12, event.clientY + 12)}
              onCreateQuote={onCreateQuote}
              onNotice={onNotice}
              onJumpHandled={onJumpHandled}
              onToggleConversationPinned={onToggleActiveConversationPinned}
              onToggleConversationMuted={onToggleActiveConversationMuted}
              onClearConversation={onClearConversation}
              onUploadImage={onUploadImage}
              onUpdateGroupConversation={onUpdateGroupConversation}
            />
          ) : activeDock === "contacts" ? (
            <ContactsView.Detail
              managementOpen={contactsManagementOpen}
              friends={friends}
              requests={friendRequests}
              contact={selectedContact}
              onCloseManagement={onCloseContactsManagement}
              onOpenManagement={onOpenContactsManagement}
              onOpenChat={onOpenChatFromContact}
              onUpdateContact={onUpdateContact}
              onSetPermission={onSetContactPermission}
              onAcceptRequest={onAcceptRequest}
              onRejectRequest={onRejectRequest}
              onDeleteFriend={onDeleteFriend}
              onToggleBlock={onToggleBlock}
              onOpenProfile={(contact, event) => onOpenProfileCard(contact.id, event.clientX + 12, event.clientY + 12)}
              onUploadImage={onUploadImage}
            />
          ) : activeDock === "favorites" ? (
            <FavoritesView.Detail
              favorites={filteredFavorites}
              activeType={favoriteType}
              onRemove={onRemoveFavorite}
              onOpen={onOpenFavorite}
            />
          ) : activeDock === "files" ? (
            <FilesView.Detail files={selectedFiles} onPickFiles={onPickFiles} />
          ) : (
            <SettingsView.Detail
              settings={settings}
              username={currentUser.username}
              nickname={currentUser.nickname}
              roomName={roomName}
              avatar={currentUser.avatar}
              gender={currentUser.gender}
              region={currentUser.region}
              signature={currentUser.signature}
              privacy={privacySettings}
              blockedFriends={blockedFriends}
              onSettingsChange={onSettingsChange}
              onPrivacyChange={onPrivacyChange}
              onProfileUpdate={onProfileUpdate}
              onChangePassword={onChangePassword}
              onAvatarPick={onAvatarPick}
              onResetAvatar={onResetAvatar}
              onClearFavorites={onClearFavorites}
              onClearContacts={onClearContacts}
              onClearLoginCache={onClearLoginCache}
              onUnblockFriend={onUnblockFriend}
            />
          )
        }
        onLogout={onLogout}
      />

      {friendPanelOpen ? (
        <AddFriendPanel
          open={friendPanelOpen}
          currentNickname={currentUser.nickname}
          currentUsername={currentUser.username}
          searchResult={friendSearchResult}
          searching={friendSearching}
          submitting={friendSubmitting}
          error={friendSearchError}
          onClose={onCloseAddFriend}
          onSearch={onSearchFriend}
          onSendRequest={onSendFriendRequest}
          onOpenChat={onOpenChatFromProfile}
          onAcceptRequest={onAcceptProfileRequest}
          onOpenProfile={(profile, event) => onOpenProfileFromPanel(profile, event.clientX + 12, event.clientY + 12)}
        />
      ) : null}

      {createGroupPanelOpen ? (
        <CreateGroupPanel
          open={createGroupPanelOpen}
          currentNickname={currentUser.nickname}
          currentUsername={currentUser.username}
          friends={friends}
          onClose={onCloseCreateGroup}
          onCreate={onCreateGroupConversation}
        />
      ) : null}

      {profileCard ? (
        <UserProfileCard
          profile={profileCard.profile}
          anchor={{ x: profileCard.x, y: profileCard.y }}
          onClose={onCloseProfileCard}
          onOpenSettings={onOpenSettingsFromProfile}
          onOpenChat={onOpenChatFromProfile}
          onSendRequest={onOpenSendRequestFromProfile}
          onOpenAvatarPreview={onOpenAvatarPreview}
        />
      ) : null}
    </>
  );
}
