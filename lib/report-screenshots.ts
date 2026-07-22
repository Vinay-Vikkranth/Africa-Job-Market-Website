import type { Browser } from "puppeteer-core";

export const REPORT_CAPTURE_IDS = [
  "snapshot",
  "jobs-by-country",
  "top-skills",
  "skill-gap",
  "demand-vs-supply",
] as const;

export type ReportCaptureId = (typeof REPORT_CAPTURE_IDS)[number];
export type ReportImages = Partial<Record<ReportCaptureId, Buffer>>;

const VIEWPORT = { width: 1440, height: 1000 };
// Recharts animates bars/pies in on mount — give them time to finish before capturing.
const CHART_SETTLE_MS = 1200;

async function launchBrowser(): Promise<Browser> {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = await import("puppeteer-core");
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Local/dev: use the full `puppeteer` package's bundled Chromium.
  const puppeteer = await import("puppeteer");
  return puppeteer.launch({ headless: true }) as unknown as Promise<Browser>;
}

/**
 * Screenshots the live dashboard's chart elements (marked with
 * data-report-capture) so the PDF report can embed real chart images
 * instead of redrawing them.
 */
export async function captureReportImages(baseUrl: string, country: string): Promise<ReportImages> {
  const images: ReportImages = {};
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);

    const url = `${baseUrl}/?country=${encodeURIComponent(country)}`;
    await page.goto(url, { waitUntil: "networkidle0", timeout: 25000 });
    await new Promise((resolve) => setTimeout(resolve, CHART_SETTLE_MS));

    for (const id of REPORT_CAPTURE_IDS) {
      const el = await page.$(`[data-report-capture="${id}"]`);
      if (!el) continue;
      const buffer = await el.screenshot({ type: "png" });
      images[id] = buffer as Buffer;
    }
  } catch (error) {
    console.error("Report screenshot capture failed:", error);
  } finally {
    if (browser) await browser.close();
  }

  return images;
}
