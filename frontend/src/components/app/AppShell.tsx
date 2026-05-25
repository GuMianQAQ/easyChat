import AddFriendPanel from "../chat/AddFriendPanel";
import ChatView from "../chat/ChatView";
import CreateGroupPanel from "../chat/CreateGroupPanel";
import UserProfileCard from "../common/UserProfileCard";
import ContactsView from "../contacts/ContactsView";
import FavoritesView from "../favorites/FavoritesView";
import FilesView from "../files/FilesView";
import MainLayout from "../layout/MainLayout";
import SettingsView from "../settings/SettingsView";
import DesktopWindowFrame from "./DesktopWindowFrame";
import type {
  ChatMessage,
  ConnectionStatus,
  ContactItem,
  ContactPermission,
  Conversation,
  CurrentUser,
  DockView,
  FavoriteItem,
  FileRecord,
  FriendItem,
  FriendRequestItem,
  GroupConversationPayload,
  MessageQuote,
  NotificationItem,
  PrivacySettings,
  UserProfile,
  UserSettings,
} from "../../types/chat";

interface ChatShellState {
  visibleConversations: Conversation[];
  activeConversationId: string;
  visibleActiveConversation: Conversation;
  status: ConnectionStatus;
  activeMessages: ChatMessage[];
  activeHasMore: boolean;
  activeLoadingMore: boolean;
  notifications: NotificationItem[];
  groupConversation: GroupConversationPayload | null;
  favoriteIds: Set<string>;
  favoriteJumpMessageId: string;
  enterToSend: boolean;
  clearAfterSend: boolean;
  composerDisabledReason: string;
  draftContent: string;
}

interface ChatShellActions {
  onConversationChange: (conversationId: string) => void;
  onOpenAddFriend: () => void;
  onOpenCreateGroup: () => void;
  onTogglePinned: (conversation: Conversation, next: boolean) => void;
  onMarkRead: (conversation: Conversation) => void;
  onToggleMuted: (conversation: Conversation, next: boolean) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onHideConversation: (conversation: Conversation) => void;
  onUploadImage: (file: File) => Promise<string>;
  onSendText: (content: string, quote?: MessageQuote | null) => boolean;
  onSendImage: (dataUrl: string, quote?: MessageQuote | null) => Promise<boolean>;
  onCaptureScreen: (quote?: MessageQuote | null) => Promise<boolean>;
  onDraftChange: (value: string) => void;
  onLoadMore: () => void;
  onRetry: (messageId: string) => void;
  onRevoke: (message: ChatMessage) => void;
  onDeleteLocal: (messageId: string) => void;
  onToggleFavoriteMessage: (message: ChatMessage) => void;
  onCopyMessage: (message: ChatMessage) => void;
  onCreateQuote: (message: ChatMessage) => MessageQuote;
  onNotice: (title: string, content: string, level?: NotificationItem["level"]) => void;
  onJumpHandled: () => void;
  onToggleActiveConversationPinned: (next: boolean) => void;
  onToggleActiveConversationMuted: (next: boolean) => void;
  onClearConversation: () => void;
  onLeaveGroupConversation: (conversation: Conversation) => Promise<boolean>;
  onDismissGroupConversation: (conversation: Conversation) => Promise<boolean>;
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
  ) => Promise<GroupConversationPayload | null>;
}

interface AppShellProps {
  activeDock: DockView;
  onDockChange: (dock: DockView) => void;
  currentUser: CurrentUser;
  totalUnread: number;
  chatState: ChatShellState;
  chatActions: ChatShellActions;
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
  onSelectContact: (id: string) => void;
  onOpenContactsManagement: () => void;
  onOpenContactRequests: () => void;
  onOpenProfileCard: (userId: string, x: number, y: number) => void;
  onOpenCurrentUserProfile: (x: number, y: number) => void;
  onOpenAvatarPreview: (src: string) => void;
  onCloseContactsManagement: () => void;
  onOpenChatFromContact: (contact: ContactItem) => void;
  onOpenContactMoments: (contact: ContactItem) => void;
  onUpdateContact: (contactId: string, patch: Partial<ContactItem>) => void;
  onSetContactPermission: (contactId: string, permission: ContactPermission) => void;
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
  onSearchFriend: (username: string) => void;
  onSendFriendRequest: (message: string) => void;
  onAcceptProfileRequest: (profile: UserProfile) => void;
  onOpenProfileFromPanel: (profile: UserProfile, x: number, y: number) => void;
  onOpenChatFromProfile: (profile: UserProfile) => void;
  onOpenSettingsFromProfile: () => void;
  onCloseProfileCard: () => void;
  onOpenSendRequestFromProfile: (profile: UserProfile) => void;
}

export default function AppShell({
  activeDock,
  onDockChange,
  currentUser,
  totalUnread,
  chatState,
  chatActions,
  contactItems,
  starredContacts,
  selectedContactId,
  contactsManagementOpen,
  requestCount,
  filteredFavorites,
  favoriteItems,
  favoriteType,
  favoriteKeyword,
  onFavoriteTypeChange,
  onFavoriteKeywordChange,
  selectedFiles,
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
  onSelectContact,
  onOpenContactsManagement,
  onOpenContactRequests,
  onOpenProfileCard,
  onOpenCurrentUserProfile,
  onOpenAvatarPreview,
  onCloseContactsManagement,
  onOpenChatFromContact,
  onOpenContactMoments,
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
  onSearchFriend,
  onSendFriendRequest,
  onAcceptProfileRequest,
  onOpenProfileFromPanel,
  onOpenChatFromProfile,
  onOpenSettingsFromProfile,
  onCloseProfileCard,
  onOpenSendRequestFromProfile,
}: AppShellProps) {
  return (
    <DesktopWindowFrame>
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
                items={chatState.visibleConversations}
                activeConversationId={chatState.activeConversationId}
                onConversationChange={chatActions.onConversationChange}
                onOpenAddFriend={chatActions.onOpenAddFriend}
                onOpenCreateGroup={chatActions.onOpenCreateGroup}
                onTogglePinned={chatActions.onTogglePinned}
                onMarkRead={chatActions.onMarkRead}
                onToggleMuted={chatActions.onToggleMuted}
                onDeleteConversation={chatActions.onDeleteConversation}
                onHideConversation={chatActions.onHideConversation}
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
                onOpenProfile={(contact, event) =>
                  onOpenProfileCard(contact.id, event.clientX + 12, event.clientY + 12)
                }
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
                activeConversation={chatState.visibleActiveConversation}
                status={chatState.status}
                messages={chatState.activeMessages}
                hasMore={chatState.activeHasMore}
                loadingMore={chatState.activeLoadingMore}
                notifications={chatState.notifications}
                groupConversation={chatState.groupConversation}
                favoriteIds={chatState.favoriteIds}
                jumpToMessageId={chatState.favoriteJumpMessageId}
                enterToSend={chatState.enterToSend}
                clearAfterSend={chatState.clearAfterSend}
                composerDisabledReason={chatState.composerDisabledReason}
                draftContent={chatState.draftContent}
                onDraftChange={chatActions.onDraftChange}
                onSendText={chatActions.onSendText}
                onSendImage={chatActions.onSendImage}
                onCaptureScreen={chatActions.onCaptureScreen}
                onLoadMore={chatActions.onLoadMore}
                onRetry={chatActions.onRetry}
                onRevoke={chatActions.onRevoke}
                onDeleteLocal={chatActions.onDeleteLocal}
                onToggleFavorite={chatActions.onToggleFavoriteMessage}
                onCopyMessage={chatActions.onCopyMessage}
                onOpenProfile={(profile, event) =>
                  onOpenProfileCard(profile.userId, event.clientX + 12, event.clientY + 12)
                }
                onCreateQuote={chatActions.onCreateQuote}
                onNotice={chatActions.onNotice}
                onJumpHandled={chatActions.onJumpHandled}
                onToggleConversationPinned={chatActions.onToggleActiveConversationPinned}
                onToggleConversationMuted={chatActions.onToggleActiveConversationMuted}
                onClearConversation={chatActions.onClearConversation}
                onLeaveGroupConversation={chatActions.onLeaveGroupConversation}
                onDismissGroupConversation={chatActions.onDismissGroupConversation}
                onUploadImage={chatActions.onUploadImage}
                onUpdateGroupConversation={chatActions.onUpdateGroupConversation}
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
                onOpenMoments={onOpenContactMoments}
                onUpdateContact={onUpdateContact}
                onSetPermission={onSetContactPermission}
                onAcceptRequest={onAcceptRequest}
                onRejectRequest={onRejectRequest}
                onDeleteFriend={onDeleteFriend}
                onToggleBlock={onToggleBlock}
                onOpenProfile={(contact, event) =>
                  onOpenProfileCard(contact.id, event.clientX + 12, event.clientY + 12)
                }
                onUploadImage={chatActions.onUploadImage}
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
            onOpenProfile={(profile, event) =>
              onOpenProfileFromPanel(profile, event.clientX + 12, event.clientY + 12)
            }
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
    </DesktopWindowFrame>
  );
}
