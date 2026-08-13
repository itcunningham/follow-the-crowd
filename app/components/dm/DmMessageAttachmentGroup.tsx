"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DmMessageAttachmentView from "@/app/components/dm/DmMessageAttachment";
import DmImageLightbox from "@/app/components/dm/DmImageLightbox";
import DmImageGalleryOverview from "@/app/components/dm/DmImageGalleryOverview";
import {
  DM_ATTACHMENTS_BUCKET,
  isDmImageAttachment,
  type DmMessageAttachment,
} from "@/lib/dmAttachments";
import { signAttachmentPaths, toStorageObjectPath } from "@/lib/attachmentUrls";
import {
  DM_GALLERY_OVERVIEW_MIN_IMAGES,
  DM_IMAGE_BUBBLE_GRID_WIDTH_CLASS,
  DM_IMAGE_GRID_CELL_MAX_HEIGHT_CLASS,
  DM_IMAGE_GRID_CELL_MAX_WIDTH_CLASS,
  resolveVisibleGridImages,
} from "@/lib/dm/dmImageLayout";
import {
  getDmImageReservedSize,
  getKnownDmImageAspectRatio,
  recordDmImageAspectRatio,
} from "@/lib/dm/dmImageAttachmentDimensions";

/**
 * Which media overlay is currently open for this message's images, if any.
 * 1-4 images skip straight to "lightbox" on tap (existing behaviour); 5+
 * images go through "overview" first (Instagram-style browse-then-pick) —
 * see `openFromGrid` below. Closing the lightbox returns to "overview" only
 * when an overview exists in this message's flow, never the other way.
 */
type DmImageGroupView =
  | { mode: "closed" }
  | { mode: "overview" }
  | { mode: "lightbox"; index: number };

function handleImageContextMenu(
  event: React.MouseEvent<HTMLElement>,
  onContextMenu?: (event: React.MouseEvent<HTMLElement>) => void,
) {
  event.preventDefault();
  onContextMenu?.(event);
}

/**
 * Signed URLs for a message's attachments, keyed by attachment id.
 *
 * This component is the single place DM and Crew Chat attachments are rendered
 * (`DmTextMessageBubble` and `GroupChatMessageBubble` both come through here),
 * so signing here covers both surfaces, realtime inserts and paged history
 * without touching any of the four load paths.
 *
 * `resign` exists for one case only: an image whose URL outlived
 * SIGNED_URL_TTL_SECONDS while the view stayed open. It fires at most once per
 * attachment - `retriedRef` is the guard - because a 403 that is not about
 * expiry (revoked membership, deleted object) would otherwise retry forever
 * against a wall. There is deliberately no fallback to `file_url`: that string
 * is a dead public URL once the bucket is private, and reinstating it is the
 * defect this change removes.
 */
function useSignedAttachmentUrls(attachments: DmMessageAttachment[]) {
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const retriedRef = useRef<Set<string>>(new Set());

  // Identity of the attachment set, so re-renders with an equal-but-new array
  // do not re-sign on every paint.
  const attachmentKey = attachments
    .map((attachment) => `${attachment.id}:${attachment.file_url}`)
    .join("|");

  useEffect(() => {
    let active = true;
    retriedRef.current = new Set();

    const idByPath = new Map<string, string>();

    for (const attachment of attachments) {
      const path = toStorageObjectPath(attachment.file_url, DM_ATTACHMENTS_BUCKET);

      if (path) {
        idByPath.set(path, attachment.id);
      }
    }

    if (idByPath.size === 0) {
      // Nothing signable. No reset needed: `urls` is keyed by attachment id, so
      // a leftover entry could only be read if that same attachment rendered
      // again - which would mean it did have a valid path. Unreachable, and
      // resetting here synchronously would cascade a render.
      return;
    }

    void signAttachmentPaths([...idByPath.keys()], DM_ATTACHMENTS_BUCKET).then((signed) => {
      if (!active) {
        return;
      }

      const next = new Map<string, string>();

      for (const [path, id] of idByPath) {
        const url = signed.get(path);

        if (url) {
          next.set(id, url);
        }
      }

      setUrls(next);
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentKey]);

  const resign = useCallback(
    (attachmentId: string) => {
      if (retriedRef.current.has(attachmentId)) {
        return;
      }

      retriedRef.current.add(attachmentId);

      const attachment = attachments.find((candidate) => candidate.id === attachmentId);

      if (!attachment) {
        return;
      }

      const path = toStorageObjectPath(attachment.file_url, DM_ATTACHMENTS_BUCKET);

      if (!path) {
        return;
      }

      void signAttachmentPaths([path], DM_ATTACHMENTS_BUCKET).then((signed) => {
        const url = signed.get(path);

        if (url) {
          setUrls((previous) => new Map(previous).set(attachmentId, url));
        }
      });
    },
    [attachments],
  );

  return { urls, resign };
}

function ImageGridCell({
  attachment,
  src,
  onExpired,
  overlayCount,
  onOpen,
  onContextMenu,
}: {
  attachment: DmMessageAttachment;
  src: string | undefined;
  onExpired: () => void;
  overlayCount?: number;
  onOpen: () => void;
  onContextMenu?: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  // Same reasoning as DmMessageAttachment: state so the first decode re-renders
  // with the ratio-correct box.
  // Keyed to the attachment: this component is re-rendered in place with a
  // different attachment, so instance state alone would let one image inherit
  // another's learned ratio. React's documented reset-during-render pattern.
  const [ratioState, setRatioState] = useState(() => ({
    id: attachment.id,
    ratio: getKnownDmImageAspectRatio(attachment.id),
  }));

  if (ratioState.id !== attachment.id) {
    setRatioState({ id: attachment.id, ratio: getKnownDmImageAspectRatio(attachment.id) });
  }

  const aspectRatio =
    ratioState.id === attachment.id
      ? ratioState.ratio
      : getKnownDmImageAspectRatio(attachment.id);
  const knownAspectRatio = aspectRatio;
  // max-w-36 = 144px, max-h-40 = 160px. Reserved only until this image decodes;
  // see getDmImageReservedSize for why a zero-area lazy image never loads.
  const reserved = getDmImageReservedSize(attachment.id, 144, 160, knownAspectRatio);

  return (
    <button
      type="button"
      aria-label="Open image"
      className="ftc-dm-message-image-open relative block shrink-0 overflow-hidden rounded-lg"
      onClick={onOpen}
      onContextMenu={(event) => handleImageContextMenu(event, onContextMenu)}
      onDragStart={(event) => event.preventDefault()}
    >
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={attachment.file_name}
          draggable={false}
          width={reserved.width}
          height={reserved.height}
          className={`pointer-events-none h-auto ${DM_IMAGE_GRID_CELL_MAX_HEIGHT_CLASS} ${DM_IMAGE_GRID_CELL_MAX_WIDTH_CLASS}`}
          style={knownAspectRatio ? { aspectRatio: knownAspectRatio } : undefined}
          loading="lazy"
          onError={onExpired}
          onLoad={(event) => {
            const image = event.currentTarget;
            recordDmImageAspectRatio(attachment.id, image.naturalWidth, image.naturalHeight);

            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
              setRatioState({
                id: attachment.id,
                ratio: image.naturalWidth / image.naturalHeight,
              });
            }
          }}
        />
      ) : (
        // Holds the tile's footprint while the URL is being signed, so the
        // message does not reflow when the image arrives.
        <span
          aria-hidden="true"
          className="block bg-ftc-bg-elevated/40"
          style={{ width: reserved.width, height: reserved.height }}
        />
      )}
      {overlayCount ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-xl font-semibold text-white">
          +{overlayCount}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Renders a message's attachments. A single attachment preserves the
 * existing `DmMessageAttachmentView` layout untouched. Two or more images
 * render as a wrapping tile group, each tile kept at its own source aspect
 * ratio (no cropping) and capped to roughly half the shared bubble width so
 * pairs sit side by side, sharing the same max bubble width as single
 * images, with a fixed (not max-) width so the group gets a real,
 * predictable footprint the surrounding message row can align to the
 * sender's side. The whole group is one border/rounded-corner frame and
 * behaves as a single message; tapping any tile on a 2-4 image message opens
 * the lightbox directly on that image (including ones hidden behind the
 * "+N" tile); tapping any tile on a 5+ image message opens the
 * Instagram-style Gallery Overview first instead — browsing a large group by
 * jumping straight into one photo loses context.
 */
export default function DmMessageAttachmentGroup({
  attachments,
  isOwnMessage,
  onContextMenu,
}: {
  attachments: DmMessageAttachment[];
  isOwnMessage: boolean;
  onContextMenu?: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  const [view, setView] = useState<DmImageGroupView>({ mode: "closed" });
  const { urls, resign } = useSignedAttachmentUrls(attachments);

  if (attachments.length <= 1) {
    return (
      <>
        {attachments.map((attachment) => (
          <DmMessageAttachmentView
            key={attachment.id}
            attachment={attachment}
            src={urls.get(attachment.id)}
            onExpired={() => resign(attachment.id)}
            isOwnMessage={isOwnMessage}
            onContextMenu={onContextMenu}
          />
        ))}
      </>
    );
  }

  const imageAttachments = attachments.filter((attachment) =>
    isDmImageAttachment(attachment.file_type),
  );
  const fileAttachments = attachments.filter(
    (attachment) => !isDmImageAttachment(attachment.file_type),
  );
  const { visible: visibleImages, hiddenCount: hiddenImageCount } =
    resolveVisibleGridImages(imageAttachments);
  const hasGalleryOverview = imageAttachments.length >= DM_GALLERY_OVERVIEW_MIN_IMAGES;
  // Kept index-aligned with imageAttachments so lightbox/overview indices stay
  // correct. An image still being signed contributes an empty url rather than
  // the stored one - a missing image is recoverable, a dead public URL in the
  // DOM is the bug being fixed.
  const lightboxImages = imageAttachments.map((attachment) => ({
    url: urls.get(attachment.id) ?? "",
    name: attachment.file_name,
  }));

  function openFromGrid(index: number) {
    setView(hasGalleryOverview ? { mode: "overview" } : { mode: "lightbox", index });
  }

  function closeLightbox() {
    setView(hasGalleryOverview ? { mode: "overview" } : { mode: "closed" });
  }

  return (
    <div className="space-y-2">
      {visibleImages.length > 0 ? (
        <div
          className={`flex flex-wrap items-start gap-1 overflow-hidden rounded-2xl border border-ftc-border bg-ftc-bg-elevated/40 p-1 ${DM_IMAGE_BUBBLE_GRID_WIDTH_CLASS}`}
        >
          {visibleImages.map((attachment, index) => {
            const isOverlayTile = hiddenImageCount > 0 && index === visibleImages.length - 1;

            return (
              <ImageGridCell
                key={attachment.id}
                attachment={attachment}
                src={urls.get(attachment.id)}
                onExpired={() => resign(attachment.id)}
                overlayCount={isOverlayTile ? hiddenImageCount : undefined}
                onOpen={() => openFromGrid(isOverlayTile ? visibleImages.length : index)}
                onContextMenu={onContextMenu}
              />
            );
          })}
        </div>
      ) : null}
      {fileAttachments.map((attachment) => (
        <DmMessageAttachmentView
          key={attachment.id}
          attachment={attachment}
          src={urls.get(attachment.id)}
          onExpired={() => resign(attachment.id)}
          isOwnMessage={isOwnMessage}
          onContextMenu={onContextMenu}
        />
      ))}
      {view.mode === "overview" ? (
        <DmImageGalleryOverview
          images={lightboxImages}
          onSelect={(index) => setView({ mode: "lightbox", index })}
          onClose={() => setView({ mode: "closed" })}
        />
      ) : null}
      {view.mode === "lightbox" ? (
        <DmImageLightbox images={lightboxImages} initialIndex={view.index} onClose={closeLightbox} />
      ) : null}
    </div>
  );
}
