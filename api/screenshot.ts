import { chromium } from 'playwright-core';
import chromiumPackage from '@sparticuz/chromium';

export default async function handler(req, res) {
  const { date, view, startDate, endDate, host, d1, d2, w1, w2 } = req.query;

  // Rekonstruksi URL dengan menyertakan semua parameter konfigurasi layout
  let targetUrl = `${host}/?export=true&date=${date}&view=${view}&startDate=${startDate}&endDate=${endDate}`;
  
  if (d1) targetUrl += `&d1=${encodeURIComponent(d1)}`;
  if (d2) targetUrl += `&d2=${encodeURIComponent(d2)}`;
  if (w1) targetUrl += `&w1=${encodeURIComponent(w1)}`;
  if (w2) targetUrl += `&w2=${encodeURIComponent(w2)}`;

  let browser;
  try {
    // Konfigurasi khusus untuk Vercel Serverless
    browser = await chromium.launch({
      args: chromiumPackage.args,
      executablePath: await chromiumPackage.executablePath(),
      headless: chromiumPackage.headless,
    });

    // Gunakan viewport awal yang cukup besar untuk rendering awal
    const context = await browser.newContext({
      viewport: { width: 1440, height: 2000 },
      deviceScaleFactor: 2,
    });

    const page = await context.newPage();
    
    // Pergi ke halaman target
    await page.goto(targetUrl, { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });

    // Tunggu font dan chart selesai render
    await page.evaluateHandle('document.fonts.ready');
    await page.waitForSelector('.recharts-surface', { timeout: 15000 });
    
    // Tambahkan delay ekstra untuk memastikan animasi Recharts benar-benar selesai
    await page.waitForTimeout(2000);

    // Hitung tinggi total konten secara dinamis agar PDF tidak terpotong (Single Page)
    const dimensions = await page.evaluate(() => {
      // Kita ambil scrollHeight dari documentElement atau body
      return {
        width: 1440,
        height: Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
          document.documentElement.offsetHeight
        )
      };
    });

    // Generate PDF dengan tinggi yang sudah dihitung
    const pdf = await page.pdf({
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      // Jangan gunakan preferCSSPageSize: true agar tinggi kustom kita diutamakan
      preferCSSPageSize: false
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Zona9_Report_${date}.pdf"`);
    res.send(pdf);

  } catch (error) {
    console.error('PDF Render Error:', error);
    res.status(500).json({ error: 'Gagal merender PDF di server' });
  } finally {
    if (browser) await browser.close();
  }
}