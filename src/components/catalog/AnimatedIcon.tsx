import { useEffect, useState } from "react";

export function AnimatedIcon({ images, interval = 3000 }: { images: string[]; interval?: number }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setCurrentIndex((prev) => (prev + 1) % images.length), interval);
    return () => clearInterval(timer);
  }, [images.length, interval]);
  return <div style={{ position: "relative", width: "22px", height: "22px", margin: "0 auto" }}>{images.map((img, idx) => <img key={img} src={img} alt="icon" draggable={false} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: "6px", opacity: currentIndex === idx ? 1 : 0, transition: "opacity 0.6s ease-in-out", objectFit: "cover" }} />)}</div>;
}
