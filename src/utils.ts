export const onIdle = (callback: () => void) => {
  if ('scheduler' in globalThis) {
    return globalThis.scheduler.postTask(callback, {
      priority: 'background',
    });
  }
  if ('requestIdleCallback' in window) {
    return requestIdleCallback(callback);
  }
  return setTimeout(callback, 0);
};

export const serialize = (value: any) => {
  switch (typeof value) {
    case 'function':
      return value.toString();
    case 'string':
      return value;
    case 'object':
      if (value === null) {
        return 'null';
      }
      if (Array.isArray(value)) {
        return value.length > 0 ? '[…]' : '[]';
      }
      if (
        typeof value.$$typeof === 'symbol' &&
        String(value.$$typeof) === 'Symbol(react.element)'
      ) {
        // attempt to extract some name from the component
        return `<${value.type.displayName || value.type.name || ''}${
          Object.keys(value.props).length > 0 ? ' …' : ''
        }>`;
      }
      if (
        typeof value === 'object' &&
        value !== null &&
        value.constructor === Object
      ) {
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            return '{…}';
          }
        }
        return '{}';
      }
      // eslint-disable-next-line no-case-declarations
      const tagString = Object.prototype.toString.call(value).slice(8, -1);
      if (tagString === 'Object') {
        const proto = Object.getPrototypeOf(value);
        const constructor = proto?.constructor;
        if (typeof constructor === 'function') {
          return `${constructor.displayName || constructor.name || ''}{…}`;
        }
      }
      return `${tagString}{…}`;
    default:
      return String(value);
  }
};
