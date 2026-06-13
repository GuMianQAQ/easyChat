import { useState } from "react";
import { ExternalLink } from "lucide-react";

interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
}

interface LinkPreviewProps {
  url: string;
  preview?: LinkPreviewData;
}

function LinkPreview({ url, preview }: LinkPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  if (!preview || (!preview.title && !preview.description)) {
    return null;
  }

  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <button type="button" className="link-preview" aria-label={preview.title || domain} onClick={handleClick}>
      {preview.image && !imageError ? (
        <div className="link-preview-image">
          <img
            src={preview.image}
            alt={preview.title || "链接预览"}
            loading="lazy"
            onError={() => setImageError(true)}
          />
        </div>
      ) : null}
      <div className="link-preview-content">
        {preview.title ? (
          <div className="link-preview-title">{preview.title}</div>
        ) : null}
        {preview.description ? (
          <div className="link-preview-description">{preview.description}</div>
        ) : null}
        <div className="link-preview-meta">
          {preview.favicon && !faviconError ? (
            <img
              className="link-preview-favicon"
              src={preview.favicon}
              alt=""
              onError={() => setFaviconError(true)}
            />
          ) : null}
          <span className="link-preview-domain">{domain}</span>
          <ExternalLink size={12} aria-hidden="true" />
        </div>
      </div>
    </button>
  );
}

export default LinkPreview;
