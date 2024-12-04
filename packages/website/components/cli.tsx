'use client';

import React, { useState } from 'react';

export default function CLI({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 relative">
      <div className="rounded-lg bg-neutral-100 p-2">
        <div className="border border-neutral-200 rounded-lg bg-white flex flex-col gap-2">
          <div className="p-2 flex gap-2 justify-between items-center border-b">
            <div className="flex gap-1">
              <div className="rounded-full h-2 w-2 bg-zinc-200" />
              <div className="rounded-full h-2 w-2 bg-zinc-200" />
              <div className="rounded-full h-2 w-2 bg-zinc-200" />
            </div>
            <div className="text-xs text-neutral-300">~</div>
          </div>
          <pre className="text-sm px-4 pb-2 whitespace-pre-wrap break-words relative group">
            <span className="text-neutral-500">
              # spin up an isolated browser instance with React Scan enabled
            </span>
            <br />$ npx react-scan@latest {`<URL>`}
            <button
              onClick={() => {
                void copyToClipboard();
                if (copied) return;
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="absolute right-4 top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded text-xs"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </pre>
        </div>
      </div>
    </div>
  );
}
