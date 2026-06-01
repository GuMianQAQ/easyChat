import { X } from "lucide-react";
import type { ReactNode } from "react";

interface GroupFeatureModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function GroupFeatureModal({ title, onClose, children }: GroupFeatureModalProps) {
  return (
    <div className="feature-modal-overlay" onClick={onClose}>
      <div className="feature-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feature-modal-header">
          <h3>{title}</h3>
          <button type="button" className="feature-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="feature-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
