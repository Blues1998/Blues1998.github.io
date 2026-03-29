import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type PhotoMeta = {
  file: string;
  title: string;
  location: string;
  lat: number;
  lng: number;
  date: string;
  camera: string;
  settings: string;
  thumbSrc: string;
  viewerSrc: string;
  index: number;
};

type GlobePoint = {
  lat: number;
  lng: number;
  location: string;
  count: number;
  firstIndex: number;
  thumb: string;
};

export default function PhotoGlobe({ photos }: { photos: PhotoMeta[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  // Ref so globe.gl DOM callbacks always call the latest setter
  const openViewerRef = useRef<(index: number) => void>(() => {});
  openViewerRef.current = (index: number) => {
    setViewerIndex(index);
    setInfoOpen(false);
  };

  // Group photos by location → one pin per unique city
  const points: GlobePoint[] = Object.values(
    photos.reduce<Record<string, GlobePoint>>((acc, photo) => {
      const key = photo.location;
      if (!acc[key]) {
        acc[key] = {
          lat: photo.lat,
          lng: photo.lng,
          location: photo.location,
          count: 0,
          firstIndex: photo.index,
          thumb: photo.thumbSrc,
        };
      }
      acc[key].count++;
      return acc;
    }, {})
  );

  const closeViewer = useCallback(() => {
    setViewerIndex(null);
    setInfoOpen(false);
  }, []);

  const prevPhoto = useCallback(() => {
    setViewerIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null));
    setInfoOpen(false);
  }, [photos.length]);

  const nextPhoto = useCallback(() => {
    setViewerIndex((i) => (i !== null ? (i + 1) % photos.length : null));
    setInfoOpen(false);
  }, [photos.length]);

  // Keyboard nav when viewer is open
  useEffect(() => {
    if (viewerIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowLeft") prevPhoto();
      if (e.key === "ArrowRight") nextPhoto();
      if (e.key === "i" || e.key === "I") setInfoOpen((o) => !o);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewerIndex, closeViewer, prevPhoto, nextPhoto]);

  // Scroll lock while viewer is open
  useEffect(() => {
    document.body.style.overflow = viewerIndex !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [viewerIndex]);

  // Globe setup (runs once)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cleanup = () => {};

    import("globe.gl").then(({ default: Globe }) => {
      const globe = Globe({ animateIn: true })(el);

      globe
        .width(el.offsetWidth)
        .height(el.offsetHeight)
        .backgroundColor("#0f1117")
        .globeImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
        .atmosphereColor("#7c8aff")
        .atmosphereAltitude(0.12)
        // Photo thumbnails pinned at each location
        .htmlElementsData(points)
        .htmlLat("lat")
        .htmlLng("lng")
        .htmlAltitude(0.01)
        .htmlElement((d: GlobePoint) => {
          const wrapper = document.createElement("div");
          wrapper.className = "globe-pin";
          wrapper.style.cssText =
            "position:relative;cursor:pointer;pointer-events:auto;" +
            "transition:transform 0.15s ease,opacity 0.1s ease;";

          const img = document.createElement("img");
          img.src = d.thumb;
          img.width = 80;
          img.height = 54;
          img.draggable = false;
          img.style.cssText =
            "display:block;border-radius:4px;border:2px solid rgba(124,138,255,0.75);" +
            "box-shadow:0 2px 16px rgba(0,0,0,0.7);object-fit:cover;";
          wrapper.appendChild(img);

          if (d.count > 1) {
            const badge = document.createElement("span");
            badge.textContent = `+${d.count - 1}`;
            badge.style.cssText =
              "position:absolute;top:-7px;right:-7px;background:#7c8aff;color:#fff;" +
              "font-size:10px;font-weight:600;padding:1px 5px;border-radius:10px;" +
              "font-family:Inter,sans-serif;line-height:16px;";
            wrapper.appendChild(badge);
          }

          const label = document.createElement("div");
          label.textContent = d.location.split(",")[0];
          label.style.cssText =
            "text-align:center;font-size:10px;color:rgba(255,255,255,0.7);" +
            "margin-top:4px;white-space:nowrap;font-family:Inter,sans-serif;" +
            "opacity:0;transition:opacity 0.15s;";
          wrapper.appendChild(label);

          wrapper.addEventListener("pointerover", () => {
            wrapper.style.transform = "scale(1.12)";
            label.style.opacity = "1";
          });
          wrapper.addEventListener("pointerout", () => {
            wrapper.style.transform = "scale(1)";
            label.style.opacity = "0";
          });
          wrapper.addEventListener("click", (e) => {
            e.stopPropagation();
            openViewerRef.current(d.firstIndex);
          });

          return wrapper;
        });

      // Boost ambient light — full globe visible, no dark night-side
      const scene = (globe as any).scene?.();
      if (scene) {
        scene.traverse((obj: any) => {
          if (obj.type === "AmbientLight") obj.intensity = 2.5;
          if (obj.type === "DirectionalLight") obj.intensity = 0.2;
        });
      }

      // Face India on startup
      globe.pointOfView({ lat: 22, lng: 82, altitude: 2.5 }, 0);

      // Fade pins out as user zooms in (they'd overlap and clip at low altitude)
      const updatePinOpacity = (altitude: number) => {
        const opacity = Math.min(1, Math.max(0, (altitude - 0.7) / (1.2 - 0.7)));
        el.querySelectorAll<HTMLElement>(".globe-pin").forEach((pin) => {
          pin.style.opacity = String(opacity);
        });
      };
      globe.controls().addEventListener("change", () => {
        updatePinOpacity((globe.pointOfView() as { altitude: number }).altitude);
      });
      updatePinOpacity(2.5); // initial altitude

      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.4;
      globe.controls().addEventListener("start", () => {
        globe.controls().autoRotate = false;
      });

      const ro = new ResizeObserver(() => {
        globe.width(el.offsetWidth).height(el.offsetHeight);
      });
      ro.observe(el);

      cleanup = () => {
        ro.disconnect();
        el.innerHTML = "";
      };
    });

    return () => cleanup();
  }, []);

  const photo = viewerIndex !== null ? photos[viewerIndex] : null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {photo && (
        <div
          style={overlay}
          onClick={closeViewer}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
        >
          {/* Image stage */}
          <div style={stage} onClick={(e) => e.stopPropagation()}>
            <img
              src={photo.viewerSrc}
              alt={photo.title}
              draggable={false}
              style={viewerImg}
              onContextMenu={(e) => e.preventDefault()}
            />
            <div style={caption}>{photo.title}</div>
          </div>

          {/* Info panel */}
          {infoOpen && (
            <div style={infoPanel} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                {photo.title}
              </div>
              <div>{photo.location} · {photo.date}</div>
              <div style={{ color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                {photo.camera} · {photo.settings}
              </div>
            </div>
          )}

          {/* Buttons */}
          <button style={{ ...btn, top: "1.5rem", right: "1.5rem" }}
            onClick={(e) => { e.stopPropagation(); closeViewer(); }}
            aria-label="Close">✕</button>

          <button style={{ ...btn, bottom: "1.5rem", right: "1.5rem" }}
            onClick={(e) => { e.stopPropagation(); setInfoOpen((o) => !o); }}
            aria-label="Toggle info">i</button>

          <button style={{ ...btn, top: "50%", left: "1.5rem", transform: "translateY(-50%)", fontSize: "1.6rem" }}
            onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
            aria-label="Previous">‹</button>

          <button style={{ ...btn, top: "50%", right: "1.5rem", transform: "translateY(-50%)", fontSize: "1.6rem" }}
            onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
            aria-label="Next">›</button>
        </div>
      )}
    </div>
  );
}

// ─── Viewer styles ────────────────────────────────────────────────────────────

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  background: "rgba(0,0,0,0.95)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const stage: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  maxWidth: "90vw",
  maxHeight: "90dvh",
};

const viewerImg: CSSProperties = {
  maxWidth: "90vw",
  maxHeight: "85dvh",
  objectFit: "contain",
  display: "block",
  userSelect: "none",
  WebkitUserSelect: "none",
};

const caption: CSSProperties = {
  color: "rgba(255,255,255,0.45)",
  fontSize: "0.78rem",
  marginTop: "10px",
  fontFamily: "Inter, sans-serif",
};

const infoPanel: CSSProperties = {
  position: "fixed",
  bottom: "2rem",
  left: "50%",
  transform: "translateX(-50%)",
  background: "rgba(15,17,23,0.92)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "6px",
  padding: "12px 18px",
  color: "rgba(255,255,255,0.65)",
  fontSize: "0.82rem",
  fontFamily: "Inter, sans-serif",
  lineHeight: 1.6,
  backdropFilter: "blur(8px)",
  zIndex: 101,
  whiteSpace: "nowrap",
};

const btn: CSSProperties = {
  position: "fixed",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "50%",
  color: "rgba(255,255,255,0.75)",
  width: "2.5rem",
  height: "2.5rem",
  cursor: "pointer",
  fontSize: "1.1rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 101,
  backdropFilter: "blur(4px)",
  padding: 0,
  lineHeight: 1,
};
