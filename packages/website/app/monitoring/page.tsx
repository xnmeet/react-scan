'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Waitlist from './(components)/waitlist';

export default function Monitoring() {
  const [sliderPosition, setSliderPosition] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: MouseEvent | TouchEvent) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const position = ((x - rect.left) / rect.width) * 100;
    setSliderPosition(Math.min(Math.max(position, 0), 100));
  };

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchmove', handleMove);
    };

    slider.addEventListener('mousedown', () => {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleMouseUp, { once: true });
    });

    slider.addEventListener('touchstart', () => {
      document.addEventListener('touchmove', handleMove);
      document.addEventListener('touchend', handleMouseUp, { once: true });
    });

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  return (
    <div className="max-w-xl mx-auto">
      <div className="space-y-4 mt-8">
        <div>
          <span className="font-bold">React Scan Monitoring</span> &middot;
          monitor component render performance
        </div>

        <div>
          We created React Scan Monitoring to quickly pinpoint unnecessary
          re-renders in React without flamegraphs (traditionally used by
          React/Chrome profiler).
        </div>

        <div>
          Think a grid of product tiles, search inputs, or components that
          depend on state managers. It{`'`}s painful to dig through the
          thousands of randomly colored rectangles with minified function names.
        </div>

        <div>
          Suddenly, hours have gone by and you{`'`}re still stuck. Not only
          that, you{`'`}re now behind on the 100 other tasks in your backlog.
        </div>

        <div>
          We{`'`}re frustrated with this status quo. Slow sites are bad for
          business. Let{`'`}s make it faster.
        </div>

        <Waitlist />

        <div
          ref={sliderRef}
          className="relative h-[400px] select-none cursor-ew-resize my-8 touch-none"
        >
          <div className="absolute inset-0">
            <Image
              src="/after.png"
              alt="After React Scan Monitoring"
              fill
              className="object-cover"
            />
          </div>
          <div
            className="absolute inset-0"
            style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
          >
            <Image
              src="/profiler.svg"
              alt="Before React Scan Monitoring"
              fill
              className="object-cover"
            />
          </div>
          <div
            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
              <div className="w-1 h-4 bg-gray-400 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
