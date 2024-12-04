'use client';

import './react-scan';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Companies from '@/components/companies';
import CLI from '@/components/cli';

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div>
      <div>
        <div className="space-y-4 mt-8">
          <div>
            React Scan automatically detects performance issues in your React
            app.
          </div>

          <div>
            Previously, existing tools required lots of code change, lacked
            simple visual cues, and didn{"'"}t have a simple, portable API
          </div>

          <div>
            React Scan attempts to solve these problems:
            <ul className="list-disc list-inside pl-2 space-y-2 pt-2">
              <li>It requires no code changes – just drop it in</li>
              <li>It highlights exactly the components you need to optimize</li>
              <li>Use it via script tag, npm, CLI, you name it!</li>
            </ul>
          </div>

          <Companies />

          <hr />

          <h2 className="font-mono font-bold text-lg mt-6">Install</h2>

          <p className="mt-2">
            The fastest way to get started is to use the CLI:
          </p>

          <CLI command="npx react-scan@latest <URL>" />

          <div className="mt-4 text-xs">
            Install via {`<script>`} or npm instead?
            <a
              className="ml-1 text-neutral-600 underline hover:text-black"
              href="https://github.com/aidenybai/react-scan#readme"
            >
              Full installation guide →
            </a>
          </div>

          <h2 className="font-mono font-bold text-lg">Demo</h2>

          {isMobile ? (
            <div className="w-full my-8 flex justify-center">
              <Image
                src="/demo.gif"
                alt="React Scan Demo"
                className="max-w-full rounded-lg shadow-md"
                width={500}
                height={300}
              />
            </div>
          ) : (
            <div className="min-h-[100px]">
              <Image
                src="/demo.gif"
                alt="React Scan Demo"
                className="max-w-full rounded-lg shadow-md"
                width={500}
                height={300}
              />
            </div>
          )}
        </div>

        <hr />

        <div className="pb-6 mt-4">
          <Link
            href="https://github.com/aidenybai/react-scan#readme"
            className="inline-block px-5 py-2 font-medium text-white bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg transition-all hover:scale-[1.02] hover:brightness-110 active:shadow-md active:shadow-purple-500/25"
          >
            Get started →
          </Link>
        </div>
      </div>
    </div>
  );
}
