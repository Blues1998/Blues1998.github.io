import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { PlaygroundRow } from "../data/playground";

type PlaygroundGalleryProps = { rows: PlaygroundRow[] };

export default function PlaygroundGallery({ rows }: PlaygroundGalleryProps) {
  const [enhanced, setEnhanced] = useState(false);
  const cardRefs = useRef<HTMLElement[]>([]);

  const handleCardPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    event.currentTarget.style.setProperty("--card-pointer-x", `${x}%`);
    event.currentTarget.style.setProperty("--card-pointer-y", `${y}%`);
    event.currentTarget.style.setProperty("--card-pointer-active", "1");
  };

  const clearCardPointer = (event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--card-pointer-active", "0");
  };

  const normalizedRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        renderItems: row.direction === "rtl" ? [...row.items].reverse() : row.items,
      })),
    [rows],
  );

  useEffect(() => {
    setEnhanced(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cards = cardRefs.current.filter(Boolean);

    if (reduceMotion) {
      cards.forEach((card) => card.dataset.visible = "true");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.visible = "true";
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -10% 0px",
      },
    );

    cards.forEach((card, index) => {
      if (index < 3) {
        card.dataset.visible = "true";
      }
      observer.observe(card);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className={`playground-gallery${enhanced ? " is-enhanced" : ""}`} id="playground-gallery">
      {normalizedRows.map((row, rowIndex) => (
        <section
          key={`row-${rowIndex}`}
          className={`playground-row playground-row-${row.direction}`}
          aria-label={`Playground row ${rowIndex + 1}`}
        >
          {row.renderItems.map((item, itemIndex) => {
            const sharedProps = {
              ref: (node: HTMLElement | null) => {
                if (node) cardRefs.current[rowIndex * 6 + itemIndex] = node;
              },
              className: `playground-card panel-tone-${item.tone} panel-state-${item.statusLabel}`,
              "data-visible": "false",
              "data-direction": row.direction,
              style: {
                transitionDelay: `${itemIndex * 90}ms`,
                "--card-enter-x": `${(row.direction === "ltr" ? -1 : 1) * (40 + itemIndex * 14)}px`,
                "--card-enter-y": `${26 + itemIndex * 8}px`,
              } as CSSProperties,
              onPointerMove: handleCardPointerMove,
              onPointerLeave: clearCardPointer,
            };

            const inner = (
              <>
                <span className="playground-card-aura" aria-hidden="true" />
                <span className="playground-card-scanline" aria-hidden="true" />
                <span className="playground-card-frame" aria-hidden="true" />
                <span className="playground-card-frame-cut" aria-hidden="true" />
                <span className="playground-card-window" aria-hidden="true" />
                <div className="playground-card-topline">
                  <span className="playground-pill playground-pill-type">playground chamber</span>
                  <span className={`playground-pill playground-pill-status status-${item.statusLabel}`}>
                    {item.statusLabel}
                  </span>
                </div>
                <h2 className="playground-card-title">{item.title}</h2>
                <p className="playground-card-summary">{item.summary}</p>
                <div className="playground-card-tech" aria-label="Lab note tags">
                  {item.tags.map((tag) => (
                    <span key={`${item.slug}-${tag}`} className="playground-card-tag">{tag}</span>
                  ))}
                </div>
                <div className="playground-card-footer">
                  {item.href ? (
                    <>
                      <span className="playground-card-cta">enter chamber</span>
                      <span className="playground-card-secondary" aria-hidden="true">→</span>
                    </>
                  ) : (
                    <>
                      <span className="playground-card-cta">dormant module</span>
                      <span className="playground-card-secondary" aria-hidden="true">no public entry</span>
                    </>
                  )}
                </div>
              </>
            );

            return item.href ? (
              <a key={item.slug} href={item.href} {...sharedProps}>{inner}</a>
            ) : (
              <article key={item.slug} {...sharedProps}>{inner}</article>
            );
          })}
        </section>
      ))}
    </div>
  );
}
