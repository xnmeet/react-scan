"use client";

import Link from "next/link";
import { useRef } from "react";

export default function Monitoring() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  return (
    <div className="relative min-h-screen">
      <div className="max-w-[2560px] mx-auto px-4 lg:px-8">
        <div className="max-w-xl">
          <div className="mt-8 space-y-4">
            <div>
              <span className="font-bold">React Scan Monitoring</span> helps detect React components that cause the most lag for your users
            </div>

            <p>It takes less than 2 minutes to set up.</p>

            <div className="flex gap-4">
              <Link
                className="inline-flex items-center justify-center h-[38px] px-4 py-2 text-sm font-medium text-white rounded-md transition-all duration-200 ease-out bg-scan-600 hover:bg-scan-500 border border-scan-500 hover:border-scan-400 focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-scan-400"
                href="https://dashboard.react-scan.com/"
              >
                Get started
              </Link>

              <Link
                className="inline-flex items-center justify-center h-[38px] px-4 py-2 text-sm font-medium text-white rounded-md transition-all duration-200 ease-out bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-zinc-600"
                href="https://dashboard.react-scan.com/project/demo"
              >
                View a live demo
              </Link>
            </div>

            <div className="flex flex-wrap gap-4 text-gray-400 text-sm mt-2">
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>Quick setup</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>Free 30-day trial</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>No obligation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Demo iframe section */}
        <div className="mt-8 -mx-4 sm:-mx-20 lg:-mx-48 xl:-mx-64 2xl:-mx-[341.3333333333px]">
          <div className="relative w-full rounded-lg overflow-hidden shadow-2xl bg-zinc-900 aspect-[4/3] md:aspect-[16/9]">
            <iframe
              ref={iframeRef}
              onLoad={() => {
                try {
                  if (iframeRef.current?.contentWindow) {
                    iframeRef.current?.contentWindow?.scrollTo({
                      top: 1000,
                      left: 100,
                      behavior: "smooth",
                    });
                  }
                } catch (e) {
                }
              }}
              src="https://dashboard.react-scan.com/project/demo"
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
