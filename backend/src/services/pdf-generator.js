const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');

const STORAGE_DIR = path.join(__dirname, '../../storage/pdfs');
const TEMPLATE_PATH = path.join(__dirname, '../../templates/batch-report.hbs');

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

async function generate(batch, steps, auditLogs) {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  const templateSrc = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const template = Handlebars.compile(templateSrc);

  const context = {
    batch: {
      ...batch,
      created_at_fmt: fmt(batch.created_at),
      started_at_fmt: fmt(batch.started_at),
      completed_at_fmt: fmt(batch.completed_at),
    },
    steps: steps.map((s) => ({
      ...s,
      completed_at_fmt: fmt(s.completed_at),
    })),
    steps_count: steps.length,
    audit_logs: auditLogs.map((log) => ({
      ...log,
      created_at_fmt: fmt(log.created_at),
      details_str: log.details ? JSON.stringify(log.details).replace(/[{}"]/g, '').replace(/,/g, ' | ') : '—',
    })),
    generated_at: fmt(new Date()),
  };

  const html = template(context);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const fileName = `batch-record-${batch.id}-${Date.now()}.pdf`;
    const filePath = path.join(STORAGE_DIR, fileName);
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '5mm', right: '5mm' },
    });
    return `storage/pdfs/${fileName}`;
  } finally {
    await browser.close();
  }
}

module.exports = { generate };
