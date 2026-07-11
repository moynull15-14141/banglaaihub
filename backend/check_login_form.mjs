import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
const inputs = await page.locator('input').evaluateAll(els => els.map(e => ({type: e.type, name: e.name, id: e.id, placeholder: e.placeholder})));
console.log(JSON.stringify(inputs, null, 2));
await browser.close();
