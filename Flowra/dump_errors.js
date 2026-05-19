const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.exposeFunction('logMessage', (type, msg, stack) => {
    console.log(`[${type}]`, msg, '\n', stack || '');
  });
  
  await page.evaluateOnNewDocument(() => {
    window.addEventListener('error', (event) => {
      window.logMessage('WINDOW ERROR', event.message, event.error && event.error.stack);
    });
    window.addEventListener('unhandledrejection', (event) => {
      window.logMessage('UNHANDLED REJECTION', event.reason && event.reason.message, event.reason && event.reason.stack);
    });
    const origError = console.error;
    console.error = function(...args) {
      if (args[0] && args[0] instanceof Error) {
        window.logMessage('CONSOLE ERROR', args[0].message, args[0].stack);
      } else {
        window.logMessage('CONSOLE ERROR', args.join(' '), new Error().stack);
      }
      return origError.apply(this, args);
    };
    const origWarn = console.warn;
    console.warn = function(...args) {
      if (args.join(' ').includes('mismatch')) {
        window.logMessage('CONSOLE WARN', args.join(' '), new Error().stack);
      }
      return origWarn.apply(this, args);
    };
  });

  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
