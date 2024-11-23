import { spawn } from 'node:child_process';
import { chromium, firefox, webkit, type Browser, devices } from 'playwright';
import mri from 'mri';
import { intro, confirm, isCancel, cancel, spinner } from '@clack/prompts';
import { bgMagenta, dim, red } from 'kleur';
import { magenta } from 'kleur/colors';

const inferValidURL = (maybeURL: string) => {
  try {
    return new URL(maybeURL).href;
  } catch {
    try {
      return new URL(`https://${maybeURL}`).href;
    } catch {
      return 'about:blank';
    }
  }
};

const getBrowserDetails = async (browserType: string) => {
  switch (browserType) {
    case 'firefox':
      return { browserType: firefox, channel: undefined, name: 'firefox' };
    case 'webkit':
      return { browserType: webkit, channel: undefined, name: 'webkit' };
    default:
      return { browserType: chromium, channel: 'chrome', name: 'chrome' };
  }
};

const REPORT_CONSOLE_SIGNAL =
  '__SECRET_REACT_SCAN_REPORT_DATA_IGNORE_OR_YOU_WILL_BE_FIRED__';

const init = async () => {
  intro(`${bgMagenta('[·]')} React Scan`);
  const args = mri(process.argv.slice(2));
  let browser: Browser | undefined;

  const device = devices[args.device];
  const { browserType, channel, name } = await getBrowserDetails(args.browser);

  try {
    browser = await browserType.launch({
      headless: false,
      channel: channel,
    });
  } catch {
    /**/
  }

  if (!browser) {
    try {
      browser = await browserType.launch({ headless: false });
    } catch {
      await new Promise<void>(async (resolve, reject) => {
        const shouldInstall = await confirm({
          message:
            'No drivers found. Install Playwright Chromium driver to continue?',
        });
        if (isCancel(shouldInstall)) {
          cancel('Operation cancelled.');
          process.exit(0);
        }
        if (!shouldInstall) return process.exit(0);

        const installProcess = spawn(
          'npx',
          ['playwright@latest', 'install', 'chromium'],
          { stdio: 'inherit' },
        );

        installProcess.on('close', (code) => {
          if (!code) return resolve();
          reject(new Error(`Installation process exited with code ${code}`));
        });

        installProcess.on('error', (err) => {
          reject(err);
        });
      });

      try {
        browser = await chromium.launch({ headless: false });
      } catch {
        cancel(
          'No browser could be launched. Please run `npx playwright install` to install browser drivers.',
        );
      }
    }
  }

  if (!browser) {
    cancel(
      'No browser could be launched. Please run `npx playwright install` to install browser drivers.',
    );
    return;
  }

  const context = await browser.newContext({ bypassCSP: true, ...device });

  await context.addInitScript({
    content: `(() => {
      const NO_OP = () => {};
      let i = 0;
      globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        checkDCE: NO_OP,
        supportsFiber: true,
        renderers: new Map(),
        onScheduleFiberRoot: NO_OP,
        onCommitFiberRoot: NO_OP,
        onCommitFiberUnmount: NO_OP,
        inject(renderer) {
          const nextID = ++i;
          this.renderers.set(nextID, renderer);
          return nextID;
        },
      };
    })();`,
  });

  const page = await context.newPage();

  const scriptContent = process.env.REACT_SCAN_SCRIPT_CONTENT;

  const inputUrl = args._[0] || 'about:blank';

  const urlString = inferValidURL(inputUrl);

  await page.goto(urlString);

  await page.waitForLoadState('load');

  await page.waitForTimeout(500);

  await page.addScriptTag({
    content: `${scriptContent}\n//# sourceURL=react-scan.js`,
  });

  const generateReport = async () => {
    await page.evaluate(() => {
      const globalHook = globalThis.__REACT_SCAN__;
      if (!globalHook) return;
      const reportData = globalHook.ReactScanInternals.reportData;
      console.log(REPORT_CONSOLE_SIGNAL, JSON.stringify(reportData));
    });
  };

  const inject = async (url: string) => {
    const s = spinner();
    s.start(dim(`Navigating to: ${url}`));
    try {
      await page.waitForLoadState('load');
      await page.waitForTimeout(500);
      const hasReactScan = await page.evaluate(() => {
        return Boolean(globalThis.__REACT_SCAN__);
      });
      if (!hasReactScan) {
        await page.addScriptTag({
          content: scriptContent,
        });
      }
      await page.waitForTimeout(100);
      await page.evaluate(() => {
        if (typeof globalThis.reactScan !== 'function') return;
        globalThis.reactScan({ report: true });
        setInterval(() => {
          const globalHook = globalThis.__REACT_SCAN__;
          if (!globalHook) return;
          const reportData = globalHook.ReactScanInternals.reportData;
          if (!Object.keys(reportData).length) return;
          console.log(REPORT_CONSOLE_SIGNAL, JSON.stringify(reportData));
        }, 1000);
      });
      s.stop(url);
    } catch (e) {
      s.stop(red(`Failed to inject React Scan to: ${url}`));
    }
  };

  await inject(urlString);

  page.on('framenavigated', async (frame) => {
    if (frame !== page.mainFrame()) return;
    const url = frame.url();
    inject(url);
  });

  page.on('console', async (msg) => {
    const text = msg.text();
    console.log(text);
    if (!text.startsWith(REPORT_CONSOLE_SIGNAL)) return;
    const location = msg.location();
    const reportDataString = text.replace(REPORT_CONSOLE_SIGNAL, '').trim();
    const reportData = JSON.parse(reportDataString);
    for (const componentName in reportData) {
      const componentData = reportData[componentName];

      const badProps: string[] = [];
      for (let i = 0; i < (componentData.badRenders || []).length; i++) {
        const render = componentData.badRenders[i];
        if (render.type !== 'props' && render.name) continue;
        badProps.push(render.name);
      }
      console.log(
        `${componentName}: ×${componentData.count}${componentData.time ? ` (${componentData.time.toFixed(0)}ms)` : ''} - props: ${badProps.join(', ')}`,
      );
    }
  });
};

void init();
