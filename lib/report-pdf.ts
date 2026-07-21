import PDFDocument from "pdfkit";
import type { DashboardData } from "@/lib/dashboard-data";

const PAGE_MARGIN = 50;
const INK = "#0f172a";
const MUTED = "#64748b";
const FAINT = "#94a3b8";
const ACCENT = "#2563eb";
const BORDER = "#e2e8f0";
const STRIPE = "#f8fafc";

function contentWidth(doc: PDFKit.PDFDocument) {
  return doc.page.width - PAGE_MARGIN * 2;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottom = doc.page.height - PAGE_MARGIN;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 40);
  doc.moveDown(0.6);
  doc
    .fontSize(13)
    .fillColor(INK)
    .font("Helvetica-Bold")
    .text(title, PAGE_MARGIN, doc.y, { continued: false });
  const lineY = doc.y + 4;
  doc
    .moveTo(PAGE_MARGIN, lineY)
    .lineTo(PAGE_MARGIN + contentWidth(doc), lineY)
    .lineWidth(1)
    .strokeColor(ACCENT)
    .stroke();
  doc.moveDown(0.8);
  doc.font("Helvetica");
}

function drawTable(
  doc: PDFKit.PDFDocument,
  columns: { label: string; width: number; align?: "left" | "right" }[],
  rows: string[][],
) {
  const rowHeight = 22;
  const tableX = PAGE_MARGIN;
  const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);

  const drawHeader = () => {
    const y = doc.y;
    doc.rect(tableX, y, tableWidth, rowHeight).fill(INK);
    let x = tableX;
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
    columns.forEach((col) => {
      doc.text(col.label, x + 8, y + 7, {
        width: col.width - 16,
        align: col.align ?? "left",
      });
      x += col.width;
    });
    doc.y = y + rowHeight;
  };

  ensureSpace(doc, rowHeight * 2);
  drawHeader();

  doc.font("Helvetica").fontSize(9.5);
  rows.forEach((row, i) => {
    if (doc.y + rowHeight > doc.page.height - PAGE_MARGIN) {
      doc.addPage();
      drawHeader();
      doc.font("Helvetica").fontSize(9.5);
    }
    const y = doc.y;
    if (i % 2 === 1) {
      doc.rect(tableX, y, tableWidth, rowHeight).fill(STRIPE);
    }
    doc.strokeColor(BORDER).lineWidth(0.5);
    doc.rect(tableX, y, tableWidth, rowHeight).stroke();

    let x = tableX;
    columns.forEach((col, colIndex) => {
      doc.fillColor("#334155").text(row[colIndex] ?? "", x + 8, y + 6.5, {
        width: col.width - 16,
        align: col.align ?? "left",
      });
      x += col.width;
    });
    doc.y = y + rowHeight;
  });

  doc.moveDown(1);
}

function kpiGrid(doc: PDFKit.PDFDocument, items: { label: string; value: string }[]) {
  const colWidth = contentWidth(doc) / 2;
  const rowHeight = 40;
  const startX = PAGE_MARGIN;

  for (let i = 0; i < items.length; i += 2) {
    ensureSpace(doc, rowHeight);
    const y = doc.y;
    const pair = items.slice(i, i + 2);

    pair.forEach((item, idx) => {
      const x = startX + idx * colWidth;
      doc.roundedRect(x, y, colWidth - 12, rowHeight - 8, 4).fillAndStroke(STRIPE, BORDER);
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(MUTED)
        .text(item.label.toUpperCase(), x + 12, y + 8, { width: colWidth - 36 });
      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor(INK)
        .text(item.value, x + 12, y + 20, { width: colWidth - 36 });
    });

    doc.y = y + rowHeight;
  }
  doc.moveDown(0.5);
}

export async function generatePdfReport(data: DashboardData, country: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, bufferPages: true, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const generatedAt = new Date();

    // --- Header band ---
    doc.rect(0, 0, doc.page.width, 110).fill(INK);
    doc
      .fontSize(22)
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .text("Skills Observatory", PAGE_MARGIN, 32);
    doc
      .fontSize(11)
      .fillColor("#cbd5e1")
      .font("Helvetica")
      .text("Africa Workforce Insights — Analytics Report", PAGE_MARGIN, 60);
    doc
      .fontSize(9)
      .fillColor("#94a3b8")
      .text(`Country filter: ${country}  |  Generated: ${generatedAt.toLocaleString()}`, PAGE_MARGIN, 80);

    doc.y = 130;

    // --- Executive summary ---
    sectionTitle(doc, "Executive Summary");
    kpiGrid(doc, [
      { label: "Total job postings", value: data.kpis.totalJobs.toLocaleString() },
      { label: "Unique companies", value: data.kpis.uniqueCompanies.toLocaleString() },
      { label: "In-demand skills tracked", value: data.kpis.inDemandSkills.toLocaleString() },
      {
        label: "Average salary (USD)",
        value: data.kpis.avgSalaryUsd > 0 ? `$${data.kpis.avgSalaryUsd.toLocaleString()}` : "N/A",
      },
      { label: "Overall skill gap index", value: `${data.kpis.overallGapPct}%` },
      { label: "30-day job growth", value: `${data.kpis.growthPct}%` },
    ]);

    // --- Top skills ---
    sectionTitle(doc, "Top In-Demand Skills");
    drawTable(
      doc,
      [
        { label: "#", width: 30 },
        { label: "Skill", width: contentWidth(doc) - 30 - 90 - 90 },
        { label: "Demand", width: 90, align: "right" },
        { label: "Mentions", width: 90, align: "right" },
      ],
      data.topSkills
        .slice(0, 10)
        .map((skill, i) => [String(i + 1), skill.name, `${skill.demandPct}%`, skill.mentions.toLocaleString()]),
    );

    // --- Jobs by country ---
    sectionTitle(doc, "Jobs by Country");
    drawTable(
      doc,
      [
        { label: "Country", width: contentWidth(doc) - 150 },
        { label: "Job Postings", width: 150, align: "right" },
      ],
      data.jobsByCountry.map((row) => [row.country, row.jobs.toLocaleString()]),
    );

    // --- Data sources ---
    sectionTitle(doc, "Data Sources");
    drawTable(
      doc,
      [
        { label: "Source", width: contentWidth(doc) - 150 },
        { label: "Jobs Ingested", width: 150, align: "right" },
      ],
      data.meta.dataSources.map((source) => [source.source, source._count.source.toLocaleString()]),
    );

    // --- Footer on every page ---
    const pageRange = doc.bufferedPageRange();
    for (let i = 0; i < pageRange.count; i++) {
      doc.switchToPage(i);
      const bottom = doc.page.height - 34;
      doc
        .moveTo(PAGE_MARGIN, bottom)
        .lineTo(doc.page.width - PAGE_MARGIN, bottom)
        .lineWidth(0.5)
        .strokeColor(BORDER)
        .stroke();
      doc
        .fontSize(8)
        .fillColor(FAINT)
        .font("Helvetica")
        .text(
          "Generated from live ingested job data (Remotive, Arbeitnow, BrighterMonday, Jobberman, Adzuna, Apify).",
          PAGE_MARGIN,
          bottom + 8,
          { width: contentWidth(doc) - 80, align: "left" },
        );
      doc.text(`Page ${i + 1} of ${pageRange.count}`, doc.page.width - PAGE_MARGIN - 80, bottom + 8, {
        width: 80,
        align: "right",
      });
    }

    doc.end();
  });
}
