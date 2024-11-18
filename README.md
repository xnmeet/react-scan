# <img src="https://github.com/aidenybai/react-scan/blob/main/.github/assets/logo.svg" width="30" height="30" align="center" /> React Scan

React Scan detects performance issues in your React app.

Previously, tools like [`<Profiler />`](https://react.dev/reference/react-devtools), [Why Did You Render?](https://github.com/welldone-software/why-did-you-render), and [React Devtools](https://legacy.reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html) required lots of manual code change, lacked simple visual cues, and had noisy data.

Instead, React Scan automatically detects and highlights renders that cause performance issues. This shows you exactly which components you need to fix.

It's also just JavaScript, so you drop it in anywhere – script tag, npm, you name it!

### [**Try it out! →**](https://react-scan.million.dev)

![React Scan in action](https://raw.githubusercontent.com/aidenybai/react-scan/refs/heads/main/.github/assets/demo.gif?token=GHSAT0AAAAAAB4IOFACRC6P6E45TB2FPYFCZZV2AYA)

> Looking for a more advanced version? Check out [Million Lint](https://million.dev)!

## Install

Get started in 5 seconds, add this script to your app:

```html
<!-- import this BEFORE any scripts -->
<script src="https://unpkg.com/react-scan/dist/auto.global.js"></script>
```

Examples:

<ul>
<li>
<details>
<summary><b>Next.js (Pages Router)</b></summary>

<br />

Add the script tag to your `pages/_document.tsx`:

```jsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script src="https://unpkg.com/react-scan/dist/auto.global.js"></script>

        {/* rest of your scripts go under */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

</details>
</li>

<li>
<details>
<summary><b>Next.js (App Router)</b></summary>

<br />

Add the script tag to your `app/layout.tsx`:

```jsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://unpkg.com/react-scan/dist/auto.global.js"></script>
        {/* rest of your scripts go under */}
      </head>
      <body>{children}</body>
    </html>
  )
}
```

</details>
</li>

<li>
<details>
<summary><b>Vite / Create React App</b></summary>

<br />

Add the script tag to your `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <script src="https://unpkg.com/react-scan/dist/auto.global.js"></script>

    <!-- rest of your scripts go under -->
  </head>
  <body>
    <!-- ... -->
  </body>
</html>
```

</details>
</li>
</ul>

**_Or_**, install it via npm:

```bash
npm install react-scan
```

Then, in your app, import this **BEFORE** `react`:

```js
import { scan } from 'react-scan'; // import this BEFORE react
import React from 'react';

scan({
  enabled: true,
  log: true, // logs render info to console (default: false)
  clearLog: false, // clears the console per group of renders (default: false)
});
```

Or, if you prefer a more manual approach, use the `withScan` API:

```js
import { withScan } from 'react-scan';

const ExpensiveComponent = withScan(
  (props) => {
    // ...
  },
  { log: true },
);
```

And voilà! You're ready to go.

## Why React Scan?

React can be tricky to optimize.

The issue is that component props are compared by reference, not value. This is intentional – this way rendering can be cheap to run.

However, this makes it easy to accidentally cause unnecessary renders, making the the app slow. Even in production apps, with hundreds of engineers, can't fully optimize their apps (see [GitHub](https://github.com/aidenybai/react-scan/blob/main/.github/assets/github.mp4), [Twitter](https://github.com/aidenybai/react-scan/blob/main/.github/assets/twitter.mp4), and [Instagram](https://github.com/aidenybai/react-scan/blob/main/.github/assets/instagram.mp4)).

This often comes down to props that update in reference, like callbacks or object values. For example, the `onClick` function and `style` object are re-created on every render, causing `ExpensiveComponent` to slow down the app:

```jsx
<ExpensiveComponent onClick={() => alert('hi')} style={{ color: 'purple' }} />
```

React Scan helps you identify these issues by automatically detecting and highlighting renders that cause performance issues. Now, instead of guessing, you can see exactly which components you need to fix.

> Want to automatically fix these issues? Check out [Million Lint](https://million.dev)!

## Resources & Contributing Back

Want to try it out? Check the [our demo](https://react-scan.million.dev).

Looking to contribute back? Check the [Contributing Guide](https://github.com/aidenybai/react-scan/blob/main/.github/CONTRIBUTING.md) out.

Want to talk to the community? Hop in our [Discord](https://discord.gg/X9yFbcV2rF) and share your ideas and what you've build with React Scan.

Find a bug? Head over to our [issue tracker](https://github.com/aidenybai/react-scan/issues) and we'll do our best to help. We love pull requests, too!

We expect all contributors to abide by the terms of our [Code of Conduct](https://github.com/aidenybai/react-scan/blob/main/.github/CODE_OF_CONDUCT.md).

[**→ Start contributing on GitHub**](https://github.com/aidenybai/react-scan/blob/main/.github/CONTRIBUTING.md)

## Roadmap

- [x] Scan only for unnecessary renders ("unstable" props)
- [x] Scan API (`withScan`, `scan`)
- [ ] Don't show label if no reconciliation occurred ("client renders" in DevTools)
- [ ] Investigate `__REACT_DEVTOOLS_TARGET_WINDOW__`
- [x] Chrome extension (h/t [@biw](https://github.com/biw))
- [ ] "PageSpeed insights" for React
- [x] Cleanup config options
- [ ] Offscreen canvas on worker thread
- [ ] React Native support
- [ ] "global" counter using `sessionStorage`, aggregate count stats instead of immediate replacement
- [ ] Name / explain the actual problem
- [x] More explicit options override API (start log at certain area, stop log, etc.)
- [x] Expose primitives / internals for advanced use cases
- [x] Add context updates
- [ ] Simple FPS counter
- [ ] Drag and select areas of the screen to scan
- [x] Mode to show on main thread blocking
- [ ] Add a funny mascot, like the ["Stop I'm Changing" dude](https://www.youtube.com/shorts/FwOZdX7bDKI?app=desktop)

## Acknowledgments

React Scan takes inspiration from the following projects:

- [React Devtools](https://react.dev/learn/react-developer-tools) for the initial idea of [highlighting renders](https://medium.com/dev-proto/highlight-react-components-updates-1b2832f2ce48). We chose to diverge from this to provide a [better developer experience](https://x.com/aidenybai/status/1857122670929969551)
- [Million Lint](https://million.dev) for scanning and linting approaches
- [Why Did You Render?](https://github.com/welldone-software/why-did-you-render) for the concept of hijacking internals to detect unnecessary renders caused by "unstable" props

## License

React Scan is [MIT-licensed](LICENSE) open-source software by Aiden Bai, [Million Software, Inc.](https://million.dev), and [contributors](https://github.com/aidenybai/react-scan/graphs/contributors):
