import { chromium } from 'playwright-chromium';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', (msg) => {
    // Forward browser console messages to stdout
    console.log('[browser]', msg.type(), msg.text());
  });

  page.on('pageerror', (err) => {
    console.log('[pageerror]', err.message);
    if (err.stack) {
      console.log(err.stack);
    }
  });

  try {
    await page.goto('http://127.0.0.1:4173/', {
      waitUntil: 'load',
      timeout: 20000,
    });
    await page.waitForTimeout(2000);

    // Navigate to Chart View via sidebar
    const chartButton = await page.$('text=Chart View');
    if (chartButton) {
      await chartButton.click();
      await page.waitForTimeout(2000);
    }
  } catch (error) {
    console.log('[script-error]', error.message);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('[main-error]', error);
});

