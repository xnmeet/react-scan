# <img src="https://react-scan.million.dev/logo.svg" /> React Scan

React Scan detects performance issues in your React app.

Previously, tools like [<Profiler />](https://react.dev/reference/react-devtools), [Why Did You Render?](https://github.com/welldone-software/why-did-you-render), and [React Devtools](https://legacy.reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html) required lots of manual code change, lacked simple visual cues, and had a high noise-to-signal ratio.

React Scan fixes this by automatically detecting and highlighting the components that are causing performance issues. This filters out the noise and focuses on the signal.

It's also just JavaScript, so you drop it in anywhere – script tag, npm, you name it!

[**Try it out! →**](https://react-scan.million.dev)

## Install

The simplest way to use it is to add this script to your app:

```html
<!-- import this BEFORE any scripts -->
<script src="https://unpkg.com/react-scan/dist/auto.global.js"></script>
```

Or, if you prefer, install via npm:

```bash
npm install react-scan
```

Then, in your app, import this **BEFORE** `react`:

```js
import { scan } from 'react-scan'; // import this BEFORE react
import React from 'react';

scan({
  enabled: true,
  log: true, // logs render info to console
});
```

> Looking for a more advanced version? Check out [Million Lint](https://million.dev)!

## How does it work?

## Future work

- [ ] problem finder
- [ ] FPS counter
- [ ] combobox ("total blocking time")
- [ ] vercel toolbar comment
- [ ] select open certain components
- [ ] only show the renders that matter
- [ ] wrap scan programmatically
- [ ] scan auto mode
- [ ] only show when there's main thread blocking
- [ ] add the stop im changing dude
- [ ] list of components and props
