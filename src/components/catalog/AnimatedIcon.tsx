import { useEffect, useState } from "react";

export function AnimatedIcon({ images, interval = 2000 }: { images: string[]; interval?: number }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());

  const validImages = images.filter((img) => !failed.has(img));

  useEffect(() => {
    if (validImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validImages.length);
    }, interval);
    return () => clearInterval(timer);
  }, [validImages.length, interval]);

  if (validImages.length === 0) {
    return (
      <div style={{ position: "relative", width: "22px", height: "22px", margin: "0 auto" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "6px",
            background: "linear-gradient(135deg, rgba(var(--accent-color-rgb), 0.35), rgba(var(--accent-color-rgb), 0.15))",
            border: "1px solid rgba(var(--accent-color-rgb), 0.4)",
          }}
        />
      </div>
    );
  }

  const activeIndex = currentIndex % validImages.length;

  return (
    <div style={{ position: "relative", width: "22px", height: "22px", margin: "0 auto" }}>
      {validImages.map((img, idx) => (
        <img
          key={img}
          src={img}
          alt="icon"
          draggable={false}
          onError={() => setFailed((prev) => new Set(prev).add(img))}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius: "6px",
            opacity: activeIndex === idx ? 1 : 0,
            transition: "opacity 0.5s ease-in-out",
            objectFit: "cover",
          }}
        />
      ))}
    </div>
  );
}