"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

interface BookSpine {
  title: string;
  author: string;
  color: string;
  textColor: string;
  height: number;
  width: number;
  initialLean: number; // Initial rotation angle (in radians) when stacked
}

const books: BookSpine[] = [
  { title: "Neuromancer", author: "William Gibson", color: "#141210", textColor: "#F4EDE2", height: 180, width: 34, initialLean: -0.4 },
  { title: "Snow Crash", author: "Neal Stephenson", color: "#E6A62E", textColor: "#0B0908", height: 195, width: 36, initialLean: -0.3 },
  { title: "Dune", author: "Frank Herbert", color: "#1E1B18", textColor: "#D8CCB8", height: 210, width: 44, initialLean: -0.25 },
  { title: "Foundation", author: "Isaac Asimov", color: "#9C8F7A", textColor: "#F4EDE2", height: 175, width: 30, initialLean: 0.15 },
  { title: "1984", author: "George Orwell", color: "#C4881B", textColor: "#0B0908", height: 185, width: 32, initialLean: 0.25 },
  { title: "Fahrenheit 451", author: "Ray Bradbury", color: "#141210", textColor: "#E6A62E", height: 190, width: 35, initialLean: 0.3 },
  { title: "Hyperion", author: "Dan Simmons", color: "#E6A62E", textColor: "#1E1B18", height: 200, width: 42, initialLean: 0.35 },
  { title: "The Hobbit", author: "J.R.R. Tolkien", color: "#1E1B18", textColor: "#F4EDE2", height: 170, width: 38, initialLean: 0.4 },
];

export default function ShelfCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollProgress = useRef(0);
  const prefersReducedMotion = useReducedMotion();
  const [dimensions, setDimensions] = useState({ width: 800, height: 350 });

  // 1. Monitor resizing to update Canvas drawing bounds
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 350,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 2. Bind ScrollTrigger to update scroll progress
  useEffect(() => {
    if (prefersReducedMotion || !containerRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top 80%",
      end: "bottom 20%",
      scrub: true,
      onUpdate: (self) => {
        scrollProgress.current = self.progress;
      },
    });

    return () => trigger.kill();
  }, [prefersReducedMotion]);

  // 3. Main Canvas Draw Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Save baseline context
      ctx.save();

      // Horizontal Shelf Line Coordinates
      const shelfY = dimensions.height - 60;
      const shelfWidth = Math.min(650, dimensions.width - 40);
      const startX = (dimensions.width - shelfWidth) / 2;

      // Draw Wooden Shelf Base
      ctx.fillStyle = "#1E1B18";
      ctx.fillRect(startX - 10, shelfY, shelfWidth + 20, 10);
      ctx.fillStyle = "#E6A62E"; // highlight edge
      ctx.fillRect(startX - 10, shelfY, shelfWidth + 20, 2);

      // Center shelf offset calculation for scroll parallax
      const progress = scrollProgress.current;
      const shelfParallaxX = prefersReducedMotion ? 0 : (progress - 0.5) * 45;
      const shelfParallaxSkew = prefersReducedMotion ? 0 : (progress - 0.5) * 0.08;

      // Apply Shelf Parallax displacement
      ctx.translate(dimensions.width / 2 + shelfParallaxX, shelfY);
      ctx.transform(1, 0, shelfParallaxSkew, 1, 0, 0);

      // Width of book bundle
      const totalBooksWidth = books.reduce((acc, b) => acc + b.width, 0);
      let currentX = -totalBooksWidth / 2;

      // Draw Book Spines
      books.forEach((book, i) => {
        ctx.save();

        // Calculate Lean angle & Overshoot Settle
        let theta = 0;
        if (!prefersReducedMotion) {
          // Stagger book entry calculations
          const staggerStart = i * 0.06;
          const staggerEnd = staggerStart + 0.35;
          const bookProgress = Math.max(0, Math.min(1, (progress - staggerStart) / (staggerEnd - staggerStart)));

          if (bookProgress < 1) {
            // Settle equation: angle leans, overshoots to opposite sign, and dampens to 0
            theta = book.initialLean * (1 - bookProgress) * Math.cos(bookProgress * Math.PI * 1.5);
          } else {
            theta = 0;
          }
        }

        // Draw Book Spine relative coordinates
        ctx.translate(currentX + book.width / 2, 0);
        ctx.rotate(theta);

        // Draw spine block
        ctx.fillStyle = book.color;
        ctx.strokeStyle = "#9C8F7A"; // parchment border
        ctx.lineWidth = 1;
        
        const spineX = -book.width / 2;
        const spineY = -book.height;
        ctx.fillRect(spineX, spineY, book.width, book.height);
        ctx.strokeRect(spineX, spineY, book.width, book.height);

        // Draw gold highlights on spine edges
        ctx.fillStyle = "#E6A62E";
        ctx.fillRect(spineX + 2, spineY + 6, book.width - 4, 3);
        ctx.fillRect(spineX + 2, spineY + book.height - 10, book.width - 4, 3);

        // Render Vertical Spine Text
        ctx.save();
        ctx.translate(0, -book.height / 2);
        ctx.rotate(-Math.PI / 2);
        
        ctx.fillStyle = book.textColor;
        ctx.font = "bold 9px var(--font-sans), sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Truncate title if longer than spine height
        const displayTitle = book.title.length > 16 ? book.title.substring(0, 14) + "..." : book.title;
        ctx.fillText(displayTitle.toUpperCase(), 0, 0);
        ctx.restore();

        ctx.restore();
        currentX += book.width;
      });

      ctx.restore();

      // Loop rendering
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [dimensions, prefersReducedMotion]);

  return (
    <div ref={containerRef} className="w-full py-8 flex justify-center items-center">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full block bg-transparent pointer-events-none"
      />
    </div>
  );
}
