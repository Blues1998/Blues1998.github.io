import { useEffect, useMemo, useRef, useState } from "react";
import type { PlaygroundRow } from "../data/playground";

type PlaygroundGalleryProps = {
  rows: PlaygroundRow[];
};

function resolveHref(href: string) {
  const base = import.meta.env.BASE_URL || "/";
  return /^(?:[a-z]+:)?\/\//i.test(href) ? href : `${base}${href.replace(/^\//, "")}`;
}

function isExternalHref(href: string) {
  return /^(?:[a-z]+:)?\/\//i.test(href);
}

export default function PlaygroundGallery({ rows }: PlaygroundGalleryProps) {
  const [enhanced, setEnhanced] = useState(false);
  const cardRefs = useRef<HTMLElement[]>([]);
  const rowRefs = useRef<HTMLElement[]>([]);

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
    const rowsEl = rowRefs.current.filter(Boolean);

    if (reduceMotion) {
      cards.forEach((card) => card.dataset.visible = "true");
      rowsEl.forEach((row) => row.style.setProperty("--row-shift", "0px"));
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

    const updateRows = () => {
      const viewportHeight = window.innerHeight;
      rowsEl.forEach((row, index) => {
        const rect = row.getBoundingClientRect();
        const progress = ((viewportHeight - rect.top) / (viewportHeight + rect.height)) * 2 - 1;
        const clamped = Math.max(-1, Math.min(1, progress));
        const direction = index % 2 === 0 ? 1 : -1;
        row.style.setProperty("--row-shift", `${clamped * 34 * direction}px`);
      });
    };

    updateRows();
    window.addEventListener("scroll", updateRows, { passive: true });
    window.addEventListener("resize", updateRows);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateRows);
      window.removeEventListener("resize", updateRows);
    };
  }, []);

  return (
    <div className={`playground-gallery${enhanced ? " is-enhanced" : ""}`} id="playground-gallery">
      {normalizedRows.map((row, rowIndex) => (
        <section
          key={`row-${rowIndex}`}
          ref={(node) => {
            if (node) rowRefs.current[rowIndex] = node;
          }}
          className={`playground-row playground-row-${row.direction}`}
          aria-label={`Playground row ${rowIndex + 1}`}
        >
          {row.renderItems.map((item, itemIndex) => {
            const primaryLabel =
              item.status === "live"
                ? "Open live build"
                : item.status === "concept"
                  ? "Open concept notes"
                  : "Open project";

            return (
              <article
                key={item.slug}
                ref={(node) => {
                  if (node) {
                    cardRefs.current[rowIndex * 6 + itemIndex] = node;
                  }
                }}
                className={`playground-card status-${item.status} type-${item.type}`}
                data-visible="false"
                data-direction={row.direction}
                style={{ transitionDelay: `${itemIndex * 90}ms` }}
              >
                <a
                  className="playground-card-primary"
                  href={resolveHref(item.primaryHref)}
                  aria-label={`${item.title} — ${primaryLabel}`}
                  rel={isExternalHref(item.primaryHref) ? "noreferrer" : undefined}
                />

                <div className="playground-card-topline">
                  <span className="playground-pill playground-pill-type">{item.type}</span>
                  <span className={`playground-pill playground-pill-status status-${item.status}`}>
                    {item.status}
                  </span>
                  {item.featured && (
                    <span className="playground-pill playground-pill-featured">featured</span>
                  )}
                </div>

                <h2 className="playground-card-title">{item.title}</h2>
                <p className="playground-card-summary">{item.summary}</p>
                {item.note && <p className="playground-card-note">{item.note}</p>}

                <div className="playground-card-tech" aria-label="Technologies used">
                  {item.tech.map((tag) => (
                    <span key={`${item.slug}-${tag}`} className="playground-card-tag">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="playground-card-footer">
                  <span className="playground-card-cta">{primaryLabel}</span>
                  {item.secondaryHref && (
                    <a
                      className="playground-card-secondary"
                      href={resolveHref(item.secondaryHref)}
                      rel={isExternalHref(item.secondaryHref) ? "noreferrer" : undefined}
                    >
                      More
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}
