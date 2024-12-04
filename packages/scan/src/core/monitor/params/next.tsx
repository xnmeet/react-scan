'use client';

import { useParams, usePathname, useSearchParams } from 'next/navigation.js';
import React from 'react';
import { Monitor } from '../..';
// import { computeRoute } from '../utils';
// does this work in pages and app router? Idk
export const useRoute = (): {
  route: string | null;
  path: string;
} => {
  const params = useParams();
  const searchParams = useSearchParams();
  const path = usePathname();

  // Until we have route parameters, we don't compute the route
  if (!params) {
    return { route: null, path };
  }
  // in Next.js@13, useParams() could return an empty object for pages router, and we default to searchParams.
  const finalParams = Object.keys(params).length
    ? (params as Record<string, string | string[]>)
    : Object.fromEntries(searchParams.entries());
  return { route: computeRoute(path, finalParams), path };
};

// adapted from vercel analytics https://github.dev/vercel/analytics
export function computeRoute(
  pathname: string | null,
  pathParams: Record<string, string | string[]> | null,
): string | null {
  if (!pathname || !pathParams) {
    return pathname;
  }

  let result = pathname;
  try {
    const entries = Object.entries(pathParams);
    // simple keys must be handled first
    for (const [key, value] of entries) {
      if (!Array.isArray(value)) {
        const matcher = turnValueToRegExp(value);
        if (matcher.test(result)) {
          result = result.replace(matcher, `/[${key}]`);
        }
      }
    }
    // array values next
    for (const [key, value] of entries) {
      if (Array.isArray(value)) {
        const matcher = turnValueToRegExp(value.join('/'));
        if (matcher.test(result)) {
          result = result.replace(matcher, `/[...${key}]`);
        }
      }
    }
    console.log('nice result', result);

    return result;
  } catch (e) {
    console.log('error!!', e);

    return pathname;
  }
}

function turnValueToRegExp(value: string): RegExp {
  return new RegExp(`/${escapeRegExp(value)}(?=[/?#]|$)`);
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function MonitorNext(props: { url?: string; apiKey: string }) {
  const { route, path } = useRoute();

  // we need to fix build so this doesn't get compiled to preact jsx
  return React.createElement(Monitor, {
    ...props,
    route,
    path,
  });
}
