import type { Render } from '../instrumentation';
import { getLabelText } from '../utils';
import { MONO_FONT } from './outline';

export const log = (render: Render) => {
  let prevChangedProps: Record<string, any> | null = null;
  let nextChangedProps: Record<string, any> | null = null;

  if (render.changes) {
    for (let i = 0, len = render.changes.length; i < len; i++) {
      const { name, prevValue, nextValue, unstable } = render.changes[i];
      if (!unstable) continue;
      prevChangedProps ??= {};
      nextChangedProps ??= {};
      prevChangedProps[`${name} (prev)`] = prevValue;
      nextChangedProps[`${name} (next)`] = nextValue;
    }
  }

  if (!render.name || !prevChangedProps || !nextChangedProps) return;
  const labelText = getLabelText([render]);
  if (!labelText) return;
  // eslint-disable-next-line no-console
  console.group(
    `%c${labelText}`,
    'background: hsla(0,0%,70%,.3); border-radius:3px; padding: 0 2px;',
  );
  // eslint-disable-next-line no-console
  console.log('Memoize these props:');
  // eslint-disable-next-line no-console
  console.log(prevChangedProps, '!==', nextChangedProps);
  // eslint-disable-next-line no-console
  console.groupEnd();
};

export const logIntro = () => {
  // eslint-disable-next-line no-console
  console.log(
    '%cTry Million Lint to automatically optimize your app: https://million.dev',
    `font-weight:bold;font-size:14px;font-weight:bold;font-family:${MONO_FONT}`,
  );
};
