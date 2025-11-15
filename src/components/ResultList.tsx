import { useCallback, useEffect, useRef, useState } from "react";
import type { WheelEvent as ReactWheelEvent } from "react";
import type { SearchResult } from "../types";
import { pickFallbackIcon } from "../utils/fallbackIcon";

export type ResultListProps = {
    results: SearchResult[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    onActivate: (item: SearchResult) => void;
    resolveResultTag: (item: SearchResult) => string;
};

export const ResultList = ({
    results,
    selectedIndex,
    onSelect,
    onActivate,
    resolveResultTag,
}: ResultListProps) => {
    if (results.length === 0) {
        return null;
    }

    const listRef = useRef<HTMLDivElement | null>(null);
    const activeId = results[selectedIndex]?.id;
    const [{ visible, thumbHeight, thumbOffset }, setScrollbarState] = useState({
        visible: false,
        thumbHeight: 0,
        thumbOffset: 0,
    });
    const handleWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
        if (!listRef.current) {
            return;
        }
        event.preventDefault();
        const scrollTarget = listRef.current;
        scrollTarget.scrollBy({
            top: event.deltaY,
            left: 0,
            behavior: "auto",
        });
    }, []);

    useEffect(() => {
        if (!listRef.current || !activeId) {
            return;
        }
        const activeElement = listRef.current.querySelector<HTMLDivElement>(
            `[data-result-id="${activeId}"]`,
        );
        if (activeElement && typeof activeElement.scrollIntoView === "function") {
            activeElement.scrollIntoView({ block: "nearest" });
        }
    }, [activeId]);

    useEffect(() => {
        const listElement = listRef.current;
        if (!listElement) {
            return;
        }

        const updateThumb = () => {
            const { scrollHeight, clientHeight, scrollTop } = listElement;
            const canScroll = scrollHeight - clientHeight > 1;
            if (!canScroll) {
                setScrollbarState((prev) => (prev.visible ? { visible: false, thumbHeight: 0, thumbOffset: 0 } : prev));
                return;
            }

            const trackHeight = clientHeight;
            const thumbSize = Math.max((clientHeight / scrollHeight) * trackHeight, 32);
            const maxOffset = trackHeight - thumbSize;
            const offset = scrollTop / (scrollHeight - clientHeight);
            setScrollbarState({
                visible: true,
                thumbHeight: thumbSize,
                thumbOffset: maxOffset * offset,
            });
        };

        updateThumb();

        const handleScroll = () => {
            requestAnimationFrame(updateThumb);
        };

        listElement.addEventListener("scroll", handleScroll, { passive: true });

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => {
                updateThumb();
            });
            resizeObserver.observe(listElement);
        }

        return () => {
            listElement.removeEventListener("scroll", handleScroll);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };
    }, [results.length]);

    return (
        <div className="result-list__container" onWheel={handleWheel}>
            <div
                ref={listRef}
                className="result-list"
                role="listbox"
                aria-activedescendant={activeId}
            >
                {results.map((item, index) => {
                    const isActive = index === selectedIndex;
                    const visual = pickFallbackIcon(item);
                    return (
                        <div
                            key={item.id}
                            className={isActive ? "result-item active" : "result-item"}
                            role="option"
                            aria-selected={isActive}
                            data-result-id={item.id}
                        >
                            <button
                                type="button"
                                className="result-button"
                                onClick={() => onSelect(index)}
                                onDoubleClick={() => onActivate(item)}
                                onMouseEnter={() => onSelect(index)}
                            >
                                {item.icon ? (
                                    <img
                                        src={`data:image/png;base64,${item.icon}`}
                                        className="result-icon"
                                        alt="result icon"
                                    />
                                ) : (
                                    <div
                                        className="result-icon placeholder"
                                        style={{
                                            background: visual.background,
                                            color: visual.color,
                                        }}
                                    >
                                        {visual.glyph}
                                    </div>
                                )}
                                <div className="result-meta">
                                    <div className="result-title-row">
                                        <span className="result-title">{item.title}</span>
                                        <span className="result-tag">{resolveResultTag(item)}</span>
                                    </div>
                                    <div className="result-subtitle" title={item.subtitle}>
                                        {item.subtitle}
                                    </div>
                                </div>
                                <div className="result-shortcut" aria-hidden="true">
                                    {String(index + 1).padStart(2, "0")}
                                </div>
                            </button>
                        </div>
                    );
                })}
            </div>
            {visible ? (
                <div className="result-scrollbar" aria-hidden="true">
                    <div className="result-scrollbar__track">
                        <div
                            className="result-scrollbar__thumb"
                            style={{
                                height: `${thumbHeight}px`,
                                transform: `translateY(${thumbOffset}px)`,
                            }}
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
};
