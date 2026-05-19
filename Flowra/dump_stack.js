const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.exposeFunction('logStack', (msg, stack) => {
    console.log('STACK:', msg, '\n', stack);
  });
  
  await page.evaluateOnNewDocument(() => {
    const origError = console.error;
    console.error = function(...args) {
      if (args[0] && args[0] instanceof TypeError) {
        window.logStack(args[0].message, args[0].stack);
      } else {
        window.logStack(args[0], new Error().stack);
      }
      return origError.apply(this, args);
    };
  });

  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  await browser.close();
})();
