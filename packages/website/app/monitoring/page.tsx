'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
    <div className="px-8 sm:px-20 pt-20 pb-4 max-w-[700px] mx-auto min-h-screen grid grid-rows-[auto_1fr_auto]">
      <div className="main-content">
        <nav className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 no-underline text-inherit">
            <Image
              src="/logo.svg"
              alt="react-scan-logo"
              width={30}
              height={30}
            />
            <h3>
              <strong className="font-mono">React Scan</strong>
            </h3>
          </Link>
          <div className="flex gap-4">
            <a
              href="https://github.com/aidenybai/react-scan#readme"
              className="text-neutral-600 underline hover:text-black"
              target="_blank"
              rel="noopener noreferrer"
            >
              install
            </a>
            <a
              href="https://github.com/aidenybai/react-scan"
              className="text-neutral-600 underline hover:text-black"
              target="_blank"
              rel="noopener noreferrer"
            >
              github
            </a>
          </div>
        </nav>

        <p className="py-4">
          React Scan &ldquo;scans&rdquo; your React app for slow renders. It&apos;s just
          JavaScript, so you drop it in anywhere &ndash; script tag, npm, you name
          it!
        </p>

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

      <div className="bg-white border-t border-neutral-100 pb-6">
        <br />
        <Link
          href="https://github.com/aidenybai/react-scan#readme"
          className="inline-block px-5 py-2 font-medium text-white bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg transition-all hover:scale-[1.02] hover:brightness-110 active:shadow-md active:shadow-purple-500/25"
        >
          Get started →
        </Link>
        <p>
          <small>
            Psst... need something more advanced? Check out:{' '}
            <a href="https://million.dev" className="text-neutral-600 underline hover:text-black">
              Million Lint
            </a>
          </small>
        </p>
      </div>
    </div>
  );
}
