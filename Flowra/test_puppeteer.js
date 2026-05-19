const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('HTTP ERROR:', response.status(), response.url());
    }
  });

  try {
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2', timeout: 15000 });
  } catch (e) {
    console.log("Goto error:", e.message);
  }

  const title = await page.title();
  console.log("TITLE:", title);
  
  await browser.close();
})();
