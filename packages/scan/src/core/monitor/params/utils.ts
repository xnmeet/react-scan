// adapted from vercel analytics https://github.dev/vercel/analytics
type DynamicSegmentFormatter = {
  param: (key: string) => string;
  catchAll: (key: string) => string;
};

function computeRouteWithFormatter(
  pathname: string | null,
  pathParams: Record<string, string | string[]> | null,
  formatter: DynamicSegmentFormatter,
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
          result = result.replace(matcher, formatter.param(key));
        }
      }
    }
    // array values next
    for (const [key, value] of entries) {
      if (Array.isArray(value)) {
        const matcher = turnValueToRegExp(value.join('/'));
        if (matcher.test(result)) {
          result = result.replace(matcher, formatter.catchAll(key));
        }
      }
    }
    return result;
  } catch (e) {
    console.log('error!!', e);
    return pathname;
  }
}

// Next.js style routes (default)
export function computeRoute(
  pathname: string | null,
  pathParams: Record<string, string | string[]> | null,
): string | null {
  return computeRouteWithFormatter(pathname, pathParams, {
    param: (key) => `/[${key}]`,
    catchAll: (key) => `/[...${key}]`,
  });
}

export function computeReactRouterRoute(
  pathname: string | null,
  pathParams: Record<string, string | string[]> | null,
): string | null {
  return computeRouteWithFormatter(pathname, pathParams, {
    param: (key) => `/:${key}`,
    catchAll: (key) => `/*${key}`,
  });
}

export function turnValueToRegExp(value: string): RegExp {
  return new RegExp(`/${escapeRegExp(value)}(?=[/?#]|$)`);
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
