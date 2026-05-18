const groups = [
  { id: "settings-account", title: "账号", description: "头像、昵称、资料" },
  { id: "settings-appearance", title: "外观", description: "主题与显示" },
  { id: "settings-preferences", title: "偏好", description: "输入与发送" },
  { id: "settings-privacy", title: "隐私", description: "搜索与好友权限" },
  { id: "settings-blacklist", title: "黑名单", description: "已拉黑好友" },
  { id: "settings-data", title: "本地数据", description: "本地缓存" },
];

function SettingsSidebar() {
  return (
    <div className="settings-sidebar-list">
      {groups.map((group) => (
        <button
          key={group.id}
          type="button"
          className="settings-sidebar-item"
          onClick={() =>
            document.getElementById(group.id)?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          <strong>{group.title}</strong>
          <span>{group.description}</span>
        </button>
      ))}
    </div>
  );
}

export default SettingsSidebar;
