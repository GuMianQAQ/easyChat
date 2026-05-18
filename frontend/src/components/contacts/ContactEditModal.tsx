import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ContactDescriptionImage, ContactItem } from "../../types/chat";

interface ContactEditModalProps {
  open: boolean;
  contact: ContactItem;
  onClose: () => void;
  onSave: (patch: Partial<ContactItem>) => void;
  onUploadImage: (file: File) => Promise<string>;
}

type ImageMenuState = {
  index: number;
  x: number;
  y: number;
} | null;

function normalizeImages(images?: ContactDescriptionImage[] | null): ContactDescriptionImage[] {
  return Array.isArray(images)
    ? images
        .filter((image) => image && typeof image.url === "string" && image.url.trim())
        .map((image) => ({ url: image.url.trim(), favorite: Boolean(image.favorite) }))
    : [];
}

function ContactEditModal({ open, contact, onClose, onSave, onUploadImage }: ContactEditModalProps) {
  const [remark, setRemark] = useState("");
  const [tags, setTags] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ContactDescriptionImage[]>([]);
  const [imageMenu, setImageMenu] = useState<ImageMenuState>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const tagsText = tags;

  useEffect(() => {
    if (!open) {
      setImageMenu(null);
      setError("");
      return;
    }
    setRemark(contact.remark || "");
    setTags((contact.tags || []).join("、"));
    setPhone(contact.phone || "");
    setDescription(contact.description || "");
    setImages(normalizeImages(contact.descriptionImages));
    setImageMenu(null);
    setError("");
  }, [contact, open]);

  useEffect(() => {
    if (!imageMenu) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) {
        setImageMenu(null);
        return;
      }
      if (!event.target.closest(".contact-edit-image-menu") && !event.target.closest(".contact-edit-image-tile")) {
        setImageMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setImageMenu(null);
      }
    };
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [imageMenu]);

  if (!open) {
    return null;
  }

  const addImages = async (files: FileList | File[]) => {
    const next: ContactDescriptionImage[] = [];
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          continue;
        }
        const url = await onUploadImage(file);
        next.push({ url, favorite: false });
      }
      if (next.length > 0) {
        setImages((previous) => [...previous, ...next]);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "图片上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      onSave({
        remark: remark.trim(),
        tags: tagsText
          .split(/[，,、\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
        phone: phone.trim(),
        description: description.trim(),
        descriptionImages: images,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveImageAs = (url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = url.split("/").pop() || "image";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleToggleFavorite = (index: number) => {
    setImages((previous) =>
      previous.map((image, currentIndex) =>
        currentIndex === index ? { ...image, favorite: !image.favorite } : image,
      ),
    );
    setImageMenu(null);
  };

  const handleDeleteImage = (index: number) => {
    setImages((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
    setImageMenu(null);
  };

  const selectedImage = imageMenu ? images[imageMenu.index] : null;
  const menuLeft = imageMenu ? Math.min(imageMenu.x, window.innerWidth - 160) : 0;
  const menuTop = imageMenu ? Math.min(imageMenu.y, window.innerHeight - 120) : 0;

  return (
    <div className="contact-edit-overlay" onMouseDown={onClose}>
      <div className="contact-edit-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="contact-edit-header">
          <strong>设置备注和标签</strong>
          <button type="button" className="contact-edit-close" onClick={onClose} aria-label="关闭">
            <X size={14} />
          </button>
        </div>

        <div className="contact-edit-body">
          <div className="contact-edit-field">
            <span className="contact-edit-label">备注名</span>
            <input
              className="contact-edit-input"
              value={remark}
              placeholder="添加备注"
              maxLength={64}
              onChange={(event) => setRemark(event.target.value)}
            />
          </div>

          <div className="contact-edit-field">
            <span className="contact-edit-label">标签</span>
            <input
              className="contact-edit-input"
              value={tagsText}
              placeholder="添加标签"
              maxLength={96}
              onChange={(event) => setTags(event.target.value)}
            />
          </div>

          <div className="contact-edit-field">
            <span className="contact-edit-label">电话</span>
            <div className="contact-edit-inline-add">
              <input
                className="contact-edit-input"
                value={phone}
                placeholder="添加电话"
                maxLength={32}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
          </div>

          <div className="contact-edit-field contact-edit-field-description">
            <span className="contact-edit-label">描述</span>
            <textarea
              className="contact-edit-textarea"
              value={description}
              placeholder="添加更多备注信息"
              maxLength={200}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="contact-edit-image-section">
            <button
              type="button"
              className="contact-edit-image-add"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Plus size={18} />
              <span>{uploading ? "上传中" : "添加图片"}</span>
            </button>

            <div className="contact-edit-image-grid">
              {images.map((image, index) => (
                <button
                  key={`${image.url}-${index}`}
                  type="button"
                  className={`contact-edit-image-tile ${image.favorite ? "contact-edit-image-tile-favorite" : ""}`}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setImageMenu({
                      index,
                      x: event.clientX,
                      y: event.clientY,
                    });
                  }}
                >
                  <img src={image.url} alt="" />
                  {image.favorite ? <span className="contact-edit-image-star">★</span> : null}
                </button>
              ))}
            </div>
          </div>

          {imageMenu && selectedImage ? (
            <div
              className="contact-edit-image-menu"
              style={{ left: `${menuLeft}px`, top: `${menuTop}px` }}
            >
              <button
                type="button"
                className="contact-edit-image-menu-item"
                onClick={() => {
                  handleSaveImageAs(selectedImage.url);
                  setImageMenu(null);
                }}
              >
                另存为
              </button>
              <button
                type="button"
                className="contact-edit-image-menu-item"
                onClick={() => handleToggleFavorite(imageMenu.index)}
              >
                {selectedImage.favorite ? "取消收藏" : "收藏"}
              </button>
              <button
                type="button"
                className="contact-edit-image-menu-item contact-edit-image-menu-item-danger"
                onClick={() => handleDeleteImage(imageMenu.index)}
              >
                删除
              </button>
            </div>
          ) : null}

          {error ? <div className="contact-edit-error">{error}</div> : null}
        </div>

        <div className="contact-edit-footer">
          <button type="button" className="contact-edit-button" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="contact-edit-button contact-edit-button-primary"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? "保存中" : "完成"}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            void addImages(event.target.files || []);
            event.currentTarget.value = "";
          }}
        />
      </div>
    </div>
  );
}

export default ContactEditModal;
