import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Monitor as BaseMonitor } from '..';
import { computeReactRouterRoute } from './utils';
import type { RouteInfo } from './types';

const useRoute = (): RouteInfo => {
  const params = useParams();
  const { pathname } = useLocation();

  if (!params || Object.keys(params).length === 0) {
    return { route: null, path: pathname };
  }

  const validParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined),
  ) as Record<string, string | string[]>;

  return {
    route: computeReactRouterRoute(pathname, validParams),
    path: pathname,
  };
};

function ReactRouterMonitor(props: { url?: string; apiKey: string }) {
  const { route, path } = useRoute();
  return React.createElement(BaseMonitor, {
    ...props,
    route,
    path,
  });
}

export { ReactRouterMonitor as Monitor };
