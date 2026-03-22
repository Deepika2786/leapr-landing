#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║           LEAPR SITEMAP GENERATOR 🗺️                    ║
 * ║  Run this AFTER generate-seo-pages.js finishes           ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * HOW TO RUN:
 *   node generate-sitemap.js
 *
 * OUTPUT:
 *   sitemap.xml → copy this into your leapr-landing root folder
 *   Then submit to Google Search Console
 */

const fs   = require('fs');
const path = require('path');

const BASE_URL   = 'https://leapr.co';
const OUTPUT_DIR = './generated';
const TODAY      = new Date().toISOString().split('T')[0]; // e.g. 2026-03-22

// ─── COLLECT ALL GENERATED HTML FILES ────────────────────────────────────────
function getAllHtmlFiles(dir, baseDir = dir) {
  let files = [];
  if (!fs.existsSync(dir)) {
    console.error(`❌ ./generated folder not found. Run generate-seo-pages.js first!`);
    process.exit(1);
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllHtmlFiles(fullPath, baseDir));
    } else if (entry.name.endsWith('.html')) {
      // Get relative path from generated/ folder
      const rel = path.relative(baseDir, fullPath);
      files.push(rel);
    }
  }
  return files;
}

// ─── PRIORITY + CHANGEFREQ BY PAGE TYPE ──────────────────────────────────────
function getMetaForPath(relPath) {
  if (relPath.startsWith('transition/'))       return { priority: '0.9', changefreq: 'monthly' };
  if (relPath.startsWith('find-your-twin/'))   return { priority: '0.9', changefreq: 'monthly' };
  if (relPath.startsWith('ready-for/'))        return { priority: '0.8', changefreq: 'monthly' };
  if (relPath.startsWith('why-no-interviews/'))return { priority: '0.8', changefreq: 'monthly' };
  if (relPath.startsWith('skills-gap/'))       return { priority: '0.8', changefreq: 'monthly' };
  if (relPath.startsWith('community/'))        return { priority: '0.8', changefreq: 'monthly' };
  if (relPath.startsWith('india-to-us/'))      return { priority: '0.8', changefreq: 'monthly' };
  if (relPath.startsWith('after-layoff/'))     return { priority: '0.7', changefreq: 'monthly' };
  if (relPath.startsWith('career-change-at-')) return { priority: '0.7', changefreq: 'monthly' };
  return { priority: '0.5', changefreq: 'monthly' };
}

// ─── BUILD SITEMAP ────────────────────────────────────────────────────────────
function buildSitemap(files) {
  const staticPages = [
    { loc: '/',        priority: '1.0', changefreq: 'weekly'  },
    { loc: '/privacy', priority: '0.3', changefreq: 'yearly'  },
    { loc: '/terms',   priority: '0.3', changefreq: 'yearly'  },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- ═══ STATIC PAGES ═══ -->
`;

  // Static pages
  for (const page of staticPages) {
    xml += `  <url>
    <loc>${BASE_URL}${page.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>\n`;
  }

  // Group generated pages by type for readability
  const groups = {
    'transition':        [],
    'find-your-twin':    [],
    'ready-for':         [],
    'why-no-interviews': [],
    'skills-gap':        [],
    'community':         [],
    'india-to-us':       [],
    'career-change-at':  [],
    'after-layoff':      [],
  };

  for (const file of files) {
    const normalized = file.replace(/\\/g, '/'); // Windows path fix
    let grouped = false;
    for (const key of Object.keys(groups)) {
      if (normalized.startsWith(key)) {
        groups[key].push(normalized);
        grouped = true;
        break;
      }
    }
    if (!grouped) groups['transition'].push(normalized); // fallback
  }

  // Write each group
  for (const [groupName, groupFiles] of Object.entries(groups)) {
    if (groupFiles.length === 0) continue;

    xml += `\n  <!-- ═══ ${groupName.toUpperCase()} (${groupFiles.length} pages) ═══ -->\n`;

    for (const file of groupFiles.sort()) {
      // Convert file path to URL
      // e.g. transition/data-analyst-to-pm.html → /transition/data-analyst-to-pm
      const urlPath = '/' + file.replace(/\.html$/, '').replace(/\\/g, '/');
      const { priority, changefreq } = getMetaForPath(file);

      xml += `  <url>
    <loc>${BASE_URL}${urlPath}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>\n`;
    }
  }

  xml += `\n</urlset>`;
  return xml;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function main() {
  console.log('\n🗺️  Leapr Sitemap Generator\n');

  const files = getAllHtmlFiles(OUTPUT_DIR);
  console.log(`📄 Found ${files.length} generated pages`);

  const sitemap = buildSitemap(files);

  // Write to generated/ folder
  const outPath = path.join(OUTPUT_DIR, 'sitemap.xml');
  fs.writeFileSync(outPath, sitemap, 'utf8');

  console.log(`✅ sitemap.xml created with ${files.length + 3} URLs`);
  console.log(`📁 Location: ${path.resolve(outPath)}`);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Copy sitemap.xml into your leapr-landing root:
   cp generated/sitemap.xml ~/OneDrive/Desktop/leapr-landing/sitemap.xml

2. Push to Vercel (with your other pages):
   git add . && git commit -m "Add sitemap" && git push && git push vercel main --force

3. Verify it's live at:
   https://leapr.co/sitemap.xml

4. Submit to Google Search Console:
   → Go to https://search.google.com/search-console
   → Select leapr.co property
   → Click Sitemaps in left menu
   → Enter: sitemap.xml
   → Click Submit

5. Submit to Bing Webmaster Tools too:
   → https://www.bing.com/webmasters
   → Same process — covers DuckDuckGo too!

Google will start crawling your 488 pages within days! 🚀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main();
