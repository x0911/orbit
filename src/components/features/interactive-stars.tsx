"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface InteractiveStarsProps {
  name: string;
  defaultValue: number;
}

export default function InteractiveStars({
  name,
  defaultValue,
}: InteractiveStarsProps) {
  const [rating, setRating] = useState(defaultValue);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={rating} />
      
      <div
        className="flex gap-1"
        role="radiogroup"
        aria-label="Star rating selector"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            setRating((r) => Math.min(5, r + 1));
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            setRating((r) => Math.max(1, r - 1));
          }
        }}
      >
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => setRating(num)}
            onMouseEnter={() => setHoverRating(num)}
            onMouseLeave={() => setHoverRating(null)}
            role="radio"
            aria-checked={rating === num}
            aria-label={`${num} Star${num > 1 ? "s" : ""}`}
            className="p-1 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded text-amber-500 cursor-pointer"
          >
            <Star
              className={`w-7 h-7 transition-all ${
                num <= displayRating ? "fill-current scale-110" : "opacity-20 hover:opacity-50"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
