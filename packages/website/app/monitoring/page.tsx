'use client';

import Link from 'next/link';

export default function Monitoring() {
  return (
    <div className="max-w-xl mx-auto">
      <div className="space-y-4 mt-8">
        <div>
          <span className="font-bold">React Scan Monitoring</span> &middot;
          monitor component render performance
        </div>

        <div>
          Web performance is a black box. Fixing end user performance issues is
          often guesswork because it’s unclear what is slow and why. Profile
          Aggregation ties lines of code to slow user interactions. Session
          Profiles show user timings, metrics, and profiles of an end user with
          a slow experience.
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4 !mb-8 w-full">
          <input
            type="email"
            placeholder="Enter your email"
            className="border-2 border-black px-2 py-2 w-full"
          />
          <Link
            href="https://github.com/aidenybai/react-scan#install"
            className="inline-block px-5 py-2 font-medium text-white bg-black text-center whitespace-nowrap"
          >
            Join waitlist
          </Link>
        </div>

        {/* <Companies /> */}
      </div>
    </div>
  );
}
