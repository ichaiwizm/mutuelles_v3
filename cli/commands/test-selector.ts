/**
 * Test Selector Command
 * ======================
 *
 * Open a page and test a specific selector.
 */

import { chromium } from 'playwright';

interface TestSelectorOptions {
  timeout?: number;
}

export async function testSelector(
  platform: string,
  selector: string,
  url: string,
  options: TestSelectorOptions
): Promise<void> {
  console.log(`\n🔬 Testing Selector`);
  console.log(`Platform: ${platform}`);
  console.log(`Selector: ${selector}`);
  console.log(`URL: ${url}`);
  console.log(`Timeout: ${options.timeout}ms\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  try {
    // Navigate to URL
    console.log('📍 Navigating to URL...');
    await page.goto(url, { timeout: options.timeout });

    // Wait for selector
    console.log('🔍 Waiting for selector...');
    const element = await page.waitForSelector(selector, { timeout: options.timeout });

    if (!element) {
      console.error('❌ Selector not found');
      return;
    }

    console.log('✅ Selector found!');

    // Get element info
    const tagName = await element.evaluate((el) => el.tagName);
    const text = await element.textContent();
    const isVisible = await element.isVisible();
    const boundingBox = await element.boundingBox();

    console.log('\nElement info:');
    console.log(`  Tag: ${tagName}`);
    console.log(`  Text: ${text?.substring(0, 50)}${text && text.length > 50 ? '...' : ''}`);
    console.log(`  Visible: ${isVisible}`);
    console.log(`  Position: x=${boundingBox?.x}, y=${boundingBox?.y}`);
    console.log(`  Size: w=${boundingBox?.width}, h=${boundingBox?.height}`);

    // Highlight element
    await element.evaluate((el) => {
      (el as HTMLElement).style.outline = '3px solid red';
      (el as HTMLElement).style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
    });

    // Take screenshot
    const screenshotPath = `screenshots/selector-test-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`\n📸 Screenshot saved: ${screenshotPath}`);

    console.log('\n✅ Selector test completed. Browser will stay open for inspection.');
    console.log('Press Ctrl+C to close.');

    // Keep browser open
    await new Promise(() => {}); // Wait forever
  } catch (error: any) {
    console.error(`\n❌ Selector test failed: ${error.message}`);
    throw error;
  } finally {
    // Cleanup handled by Ctrl+C
  }
}
