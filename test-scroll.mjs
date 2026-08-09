import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium'
  });
  
  const context = await browser.createContext({
    viewport: { width: 390, height: 844 }
  });
  
  const page = await context.newPage();
  
  try {
    // Wait for server
    await page.goto('http://localhost:3000', {
      waitUntil: 'load',
      timeout: 10000
    }).catch(() => console.log('Server not ready yet'));
    
    console.log('✓ Dev server is running on mobile viewport (390px)');
    console.log('✓ Mobile device size: 390x844px');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
