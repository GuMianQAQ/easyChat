import type { ConnectionStatus } from "../../types/chat";

interface StatusDotProps {
  status: ConnectionStatus;
  withLabel?: boolean;
}

const statusLabel: Record<ConnectionStatus, string> = {
  disconnected: "未连接",
  connecting: "连接中",
  connected: "已连接",
  failed: "连接失败",
};

function StatusDot({ status, withLabel = true }: StatusDotProps) {
  return (
    <span className={`status-inline status-inline-${status}`}>
      <span className="status-inline-dot" />
      {withLabel ? <span>{statusLabel[status]}</span> : null}
    </span>
  );
}

export default StatusDot;
