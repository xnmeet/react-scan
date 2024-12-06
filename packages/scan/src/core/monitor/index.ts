'use client';
import React from 'react';
import { scan, Store } from '..';
import { initPerformanceMonitoring } from './performance';
import { getSession } from './utils';

export const Monitoring = ({
  url,
  apiKey,
  path,
  route,
}: { url?: string; apiKey: string } & {
  route: string | null;
  path: string;
}) => {
  if (!apiKey)
    throw new Error('Please provide a valid API key for React Scan monitoring');

  // TODO(nisarg): Fix this default value after we confirm the URL
  url ??= 'https://monitoring.react-scan.com/api/v1/ingest';
  Store.monitor.value ??= {
    // components: new Map(),
    pendingRequests: 0,
    url,
    apiKey,
    interactions: [],
    session: getSession(),
    route,
    path,
  };
  Store.monitor.value.route = route;
  Store.monitor.value.path = path;

  React.useEffect(() => {
    scan({
      enabled: true,
      showToolbar: false,
    });
    return initPerformanceMonitoring();
  }, []);

  return null;
};
