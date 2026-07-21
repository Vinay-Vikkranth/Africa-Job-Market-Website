import PDFDocument from "pdfkit";
import type { DashboardData } from "@/lib/dashboard-data";

export async function generatePdfReport(data: DashboardData, country: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).fillColor("#0f172a").text("Skills Observatory", { align: "center" });
    doc.fontSize(14).fillColor("#64748b").text("Africa Workforce Insights - Annual Report", {
      align: "center",
    });
    doc.moveDown();
    doc.fontSize(10).fillColor("#94a3b8").text(`Generated: ${new Date().toLocaleString()}`, {
      align: "center",
    });
    doc.moveDown(2);

    doc.fontSize(16).fillColor("#0f172a").text("Executive Summary");
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#334155");
    doc.text(`Country filter: ${country}`);
    doc.text(`Total job postings: ${data.kpis.totalJobs.toLocaleString()}`);
    doc.text(`Unique companies: ${data.kpis.uniqueCompanies.toLocaleString()}`);
    doc.text(`In-demand skills tracked: ${data.kpis.inDemandSkills.toLocaleString()}`);
    doc.text(
      `Average salary (USD): ${data.kpis.avgSalaryUsd > 0 ? `$${data.kpis.avgSalaryUsd.toLocaleString()}` : "N/A"}`,
    );
    doc.text(`Top skill-category share of demand: ${data.kpis.overallGapPct}%`);
    doc.text(
      `30-day job growth: ${data.kpis.growthPct == null ? "n/a" : `${data.kpis.growthPct}%`}`,
    );
    doc.moveDown();

    doc.fontSize(16).fillColor("#0f172a").text("Top 10 In-Demand Skills");
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#334155");
    data.topSkills.slice(0, 10).forEach((skill, i) => {
      doc.text(`${i + 1}. ${skill.name} - ${skill.demandPct}% (${skill.mentions} mentions)`);
    });
    doc.moveDown();

    doc.fontSize(16).fillColor("#0f172a").text("Jobs by Country");
    doc.moveDown(0.5);
    data.jobsByCountry.forEach((row) => {
      doc.fontSize(11).fillColor("#334155").text(`${row.country}: ${row.jobs.toLocaleString()} postings`);
    });
    doc.moveDown();

    doc.fontSize(16).fillColor("#0f172a").text("Data Sources");
    doc.moveDown(0.5);
    data.meta.dataSources.forEach((source) => {
      doc.fontSize(11).fillColor("#334155").text(`${source.source}: ${source._count.source} jobs`);
    });
    doc.moveDown(2);

    doc.fontSize(9).fillColor("#94a3b8").text(
      "This report is generated from live ingested job data (Remotive, Arbeitnow, BrighterMonday, Jobberman, Adzuna, Apify).",
      { align: "center" },
    );

    doc.end();
  });
}
