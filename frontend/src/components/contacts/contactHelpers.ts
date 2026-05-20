import type { ContactItem, ContactPermission } from "../../types/chat";

export function sourceLabel(contact: ContactItem): string {
  switch (contact.source) {
    case "self":
      return "当前用户";
    case "group":
      return "群聊";
    case "system":
      return "系统联系人";
    case "recent":
      return "最近联系人";
    default:
      return "通过账号搜索添加";
  }
}

export function permissionLabel(permission: ContactPermission | undefined): string {
  switch (permission) {
    case "limited":
      return "不可见";
    default:
      return "可聊天";
  }
}

export function genderLabel(gender?: string): string {
  if (gender === "male") {
    return "男";
  }
  if (gender === "female") {
    return "女";
  }
  return "";
}
