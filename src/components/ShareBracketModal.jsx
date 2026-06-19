import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { toPng } from "html-to-image";

/**
 * Bracket Share Modal
 *
 * Props:
 *  - open: boolean
 *  - onClose: fn
 *  - shareUrl: string — the encoded /#/predictor?bracket=… URL
 *  - captureRef: React ref → DOM node to convert to PNG
 *  - winnerName: string — predicted champion (used in share text)
 */
export default function ShareBracketModal({ open, onClose, shareUrl, captureRef, winnerName }) {
  const [copied, setCopied] = useState(false);
  const [imgUrl, setImgUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState(null);
  const overlayRef = useRef(null);

  // Generate PNG when modal opens
  useEffect(() => {
    if (!open || !captureRef?.current) return;
    let cancelled = false;
    setGenerating(true);
    setErr(null);
    setImgUrl(null);

    // Give DOM a tick to render at full size
    const t = setTimeout(async () => {
      try {
        const dataUrl = await toPng(captureRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--bg") || "#020817",
          style: { transform: "none" },
        });
        if (!cancelled) setImgUrl(dataUrl);
      } catch (e) {
        if (!cancelled) setErr(e.message || "Could not generate image");
      } finally {
        if (!cancelled) setGenerating(false);
      }
    }, 250);

    return () => { cancelled = true; clearTimeout(t); };
  }, [open, captureRef]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === "Escape") onClose?.(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // ... handlers below ...

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ }
      document.body.removeChild(ta);
    }
  }

  function downloadPng() {
    if (!imgUrl) return;
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = `wc2026-bracket-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function nativeShare() {
    const shareText = winnerName
      ? `My WC 2026 prediction: ${winnerName} lifts the trophy 🏆 Check my full bracket:`
      : `Check out my FIFA World Cup 2026 bracket prediction:`;

    if (navigator.share) {
      try {
        const shareData = { title: "WC 2026 Bracket", text: shareText, url: shareUrl };
        // Attach PNG if supported
        if (imgUrl && navigator.canShare) {
          const blob = await (await fetch(imgUrl)).blob();
          const file = new File([blob], "wc2026-bracket.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            shareData.files = [file];
          }
        }
        await navigator.share(shareData);
      } catch { /* user cancelled */ }
    } else {
      copyLink();
    }
  }

  const xText = winnerName
    ? `My WC 2026 prediction: ${winnerName} lifts the trophy 🏆 See my full bracket: ${shareUrl}`
    : `Check out my FIFA World Cup 2026 bracket prediction: ${shareUrl}`;

  return createPortal((
    <div
      ref={overlayRef}
      className="share-overlay"
      data-testid="share-modal"
      onClick={(e) => { if (e.target === overlayRef.current) onClose?.(); }}
    >
      <div className="share-modal" role="dialog" aria-label="Share bracket">
        <div className="share-modal-head">
          <div>
            <div className="share-modal-eyebrow">Share</div>
            <div className="share-modal-title">Your WC 2026 Bracket</div>
            {winnerName && (
              <div className="share-modal-sub">Predicted champion: <strong>{winnerName}</strong></div>
            )}
          </div>
          <button data-testid="share-close" className="share-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="share-modal-body">
          {/* Preview */}
          <div className="share-preview">
            {generating && (
              <div className="share-preview-loading">
                <div className="flp-spinner" />
                <span>Generating preview…</span>
              </div>
            )}
            {err && (
              <div className="share-preview-error">⚠️ {err}</div>
            )}
            {imgUrl && !generating && (
              <img src={imgUrl} alt="Bracket preview" data-testid="share-preview-img" />
            )}
          </div>

          {/* URL field */}
          <div className="share-url-row">
            <input
              data-testid="share-url-input"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
            />
            <button data-testid="share-copy-btn" className="share-copy-btn" onClick={copyLink}>
              {copied ? "✓ Copied" : "Copy link"}
            </button>
          </div>

          {/* Actions */}
          <div className="share-actions">
            <button
              data-testid="share-png-btn"
              className="share-action-btn primary"
              onClick={downloadPng}
              disabled={!imgUrl}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download PNG
            </button>

            <button
              data-testid="share-native-btn"
              className="share-action-btn"
              onClick={nativeShare}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share
            </button>

            <a
              data-testid="share-twitter-btn"
              className="share-action-btn"
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zM17.083 19.77h1.833L7.084 4.126H5.117z"/>
              </svg>
              Post on X
            </a>

            <a
              data-testid="share-whatsapp-btn"
              className="share-action-btn"
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(xText)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.465 3.488"/>
              </svg>
              WhatsApp
            </a>
          </div>

          <p className="share-foot">
            Anyone with the link sees your exact picks. Predictions stay in their browser — yours stay safe.
          </p>
        </div>
      </div>
    </div>
  ), document.body);
}
