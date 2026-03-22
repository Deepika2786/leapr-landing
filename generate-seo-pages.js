#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║           LEAPR SEO PAGE GENERATOR 🚀                   ║
 * ║  Generates ~1400 static HTML pages in one run            ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * SETUP (one time):
 *   1. Make sure you have Node 18+ → node --version
 *   2. Set your Anthropic API key:
 *        Mac/Linux: export ANTHROPIC_API_KEY=sk-ant-xxxxx
 *        Windows:   set ANTHROPIC_API_KEY=sk-ant-xxxxx
 *   3. Run: node generate-seo-pages.js
 *
 * OUTPUT:
 *   Creates a ./generated/ folder — copy its contents into your
 *   leapr-landing folder, then push. Done. 1400 pages live forever.
 *
 * RESUME SAFE:
 *   Already generated pages are skipped automatically.
 *   If it stops midway, just run again — it picks up where it left off.
 *
 * COST: ~$3–6 total for all pages (uses Claude Haiku)
 */

const fs   = require('fs');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API_KEY      = process.env.ANTHROPIC_API_KEY;
const MODEL        = 'claude-haiku-4-5-20251001';   // cheapest, plenty smart for this
const OUTPUT_DIR   = './generated';
const DELAY_MS     = 800;   // ms between API calls — stay under rate limits
const MAX_RETRIES  = 3;

if (!API_KEY) {
  console.error('\n❌  ANTHROPIC_API_KEY not set.\n    Run: export ANTHROPIC_API_KEY=sk-ant-xxxxx\n');
  process.exit(1);
}

// ─── ROLE LISTS ──────────────────────────────────────────────────────────────
const FROM_ROLES = [
  'Data Analyst', 'Business Analyst', 'Software Engineer', 'Marketing Manager',
  'Project Manager', 'Financial Analyst', 'Operations Manager', 'Sales Manager',
  'HR Manager', 'Graphic Designer', 'Teacher', 'Nurse', 'Lawyer', 'Accountant',
  'Mechanical Engineer', 'Civil Engineer', 'Journalist', 'Consultant',
  'Recruiter', 'Customer Success Manager', 'QA Engineer', 'Database Administrator',
  'Technical Writer', 'Supply Chain Analyst', 'Risk Analyst'
];

const TO_ROLES = [
  'Product Manager', 'UX Designer', 'Data Scientist', 'Full Stack Developer',
  'Solutions Architect', 'DevOps Engineer', 'Product Designer', 'Growth Manager',
  'Scrum Master', 'Machine Learning Engineer', 'Technical Program Manager',
  'Cybersecurity Analyst', 'Cloud Engineer', 'Data Engineer', 'Product Analyst'
];

const SKILL_ROLES = [
  'Product Manager', 'UX Designer', 'Data Scientist', 'Solutions Architect',
  'DevOps Engineer', 'Machine Learning Engineer', 'Cybersecurity Analyst',
  'Cloud Engineer', 'Data Engineer', 'Technical Program Manager',
  'Growth Manager', 'Full Stack Developer', 'Product Designer', 'Scrum Master'
];

const COMMUNITY_ROLES = [
  'Product Manager', 'UX Designer', 'Data Scientist', 'Software Engineer',
  'Solutions Architect', 'DevOps Engineer', 'Machine Learning Engineer',
  'Cybersecurity Analyst', 'Data Engineer', 'Growth Manager',
  'Full Stack Developer', 'Scrum Master', 'Technical Program Manager'
];

const INDIA_US_ROLES = [
  'Data Analyst', 'Software Engineer', 'Business Analyst', 'Product Manager',
  'QA Engineer', 'DevOps Engineer', 'Data Scientist', 'Solutions Architect',
  'Full Stack Developer', 'Machine Learning Engineer', 'Cloud Engineer',
  'Technical Program Manager', 'Financial Analyst', 'Operations Manager'
];

const LAYOFF_ROLES = [
  'Product Manager', 'UX Designer', 'Data Scientist', 'Full Stack Developer',
  'DevOps Engineer', 'Cloud Engineer', 'Machine Learning Engineer',
  'Cybersecurity Analyst', 'Data Engineer', 'Solutions Architect'
];

const CAREER_CHANGE_AGES = [28, 30, 32, 35, 38, 40, 42, 45, 50];

// ─── SLUG HELPERS ────────────────────────────────────────────────────────────
const toSlug = str => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ─── BUILD ALL PAGE JOBS ─────────────────────────────────────────────────────
function buildAllJobs() {
  const jobs = [];

  // 1. Role transitions (~375 pages)
  for (const from of FROM_ROLES) {
    for (const to of TO_ROLES) {
      if (from === to) continue;
      jobs.push({
        type: 'transition',
        from, to,
        slug: `${toSlug(from)}-to-${toSlug(to)}`,
        outPath: `transition/${toSlug(from)}-to-${toSlug(to)}.html`
      });
    }
  }

  // 2. "Do I have what it takes" / ready-for pages (~14 pages)
  for (const role of SKILL_ROLES) {
    jobs.push({
      type: 'ready-for',
      role,
      slug: toSlug(role),
      outPath: `ready-for/${toSlug(role)}.html`
    });
  }

  // 3. "Why am I not getting hired" pages (~14 pages)
  for (const role of SKILL_ROLES) {
    jobs.push({
      type: 'why-no-interviews',
      role,
      slug: toSlug(role),
      outPath: `why-no-interviews/${toSlug(role)}.html`
    });
  }

  // 4. Skills gap pages (~14 pages)
  for (const role of SKILL_ROLES) {
    jobs.push({
      type: 'skills-gap',
      role,
      slug: toSlug(role),
      outPath: `skills-gap/${toSlug(role)}.html`
    });
  }

  // 5. Community pages (~13 pages)
  for (const role of COMMUNITY_ROLES) {
    jobs.push({
      type: 'community',
      role,
      slug: toSlug(role),
      outPath: `community/${toSlug(role)}.html`
    });
  }

  // 6. Find your twin pages (~25 high-value transitions)
  const twinPairs = [
    ['Data Analyst', 'Product Manager'], ['Software Engineer', 'Product Manager'],
    ['Marketing Manager', 'Product Manager'], ['Business Analyst', 'Product Manager'],
    ['Teacher', 'UX Designer'], ['Graphic Designer', 'UX Designer'],
    ['Data Analyst', 'Data Scientist'], ['Software Engineer', 'Machine Learning Engineer'],
    ['Financial Analyst', 'Data Scientist'], ['Lawyer', 'Product Manager'],
    ['Nurse', 'UX Designer'], ['Consultant', 'Product Manager'],
    ['HR Manager', 'Product Manager'], ['Journalist', 'UX Designer'],
    ['Operations Manager', 'Product Manager'], ['Sales Manager', 'Product Manager'],
    ['Accountant', 'Data Analyst'], ['Teacher', 'Data Analyst'],
    ['Mechanical Engineer', 'Solutions Architect'], ['Civil Engineer', 'Full Stack Developer'],
    ['QA Engineer', 'Product Manager'], ['Recruiter', 'Product Manager'],
    ['Customer Success Manager', 'Product Manager'],
    ['Business Analyst', 'Data Scientist'], ['Software Engineer', 'Solutions Architect']
  ];
  for (const [from, to] of twinPairs) {
    jobs.push({
      type: 'find-your-twin',
      from, to,
      slug: `${toSlug(from)}-to-${toSlug(to)}`,
      outPath: `find-your-twin/${toSlug(from)}-to-${toSlug(to)}.html`
    });
  }

  // 7. India to US pages (~14 pages)
  for (const role of INDIA_US_ROLES) {
    jobs.push({
      type: 'india-to-us',
      role,
      slug: toSlug(role),
      outPath: `india-to-us/${toSlug(role)}.html`
    });
  }

  // 8. Career change at age pages (~9 pages)
  for (const age of CAREER_CHANGE_AGES) {
    jobs.push({
      type: 'career-change-age',
      age,
      slug: String(age),
      outPath: `career-change-at-${age}.html`
    });
  }

  // 9. After layoff pages (~10 pages)
  for (const role of LAYOFF_ROLES) {
    jobs.push({
      type: 'after-layoff',
      role,
      slug: toSlug(role),
      outPath: `after-layoff/${toSlug(role)}.html`
    });
  }

  return jobs;
}

// ─── CLAUDE API CALL ─────────────────────────────────────────────────────────
async function callClaude(prompt, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 429 && attempt < retries) {
          console.log(`    ⏳ Rate limited, waiting 10s...`);
          await sleep(10000);
          continue;
        }
        throw new Error(`API ${res.status}: ${err}`);
      }

      const data = await res.json();
      const text = data.content[0].text.trim();

      // Strip markdown code fences if present
      const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      return JSON.parse(clean);

    } catch (e) {
      if (attempt === retries) throw e;
      console.log(`    ⚠️  Attempt ${attempt} failed: ${e.message}. Retrying...`);
      await sleep(2000 * attempt);
    }
  }
}

// ─── PROMPT BUILDERS ─────────────────────────────────────────────────────────
function buildPrompt(job) {
  const base = `You are writing SEO content for Leapr (leapr.co), a career transition platform.
Return ONLY valid JSON — no markdown, no preamble, no explanation.
All text must be specific, honest, and genuinely helpful. No fluff.`;

  switch (job.type) {

    case 'transition':
    case 'find-your-twin':
      return `${base}

Generate content for a page about transitioning from "${job.from}" to "${job.to}".

Return this exact JSON structure:
{
  "page_title": "SEO title (60 chars max)",
  "meta_description": "Meta description (155 chars max, includes both role names)",
  "hero_headline_em": "the 'to' role name in the h1 (just the role, e.g. 'Product Manager')",
  "hero_subtitle": "2 sentences about why this transition makes sense. Specific, not generic.",
  "stat_transition_time": "e.g. '6–12 months'",
  "stat_skill_overlap": "e.g. '71%'",
  "stat_salary_bump": "e.g. '+$18k' or '-$5k' if realistic",
  "stat_active_members": "realistic number like '183' or '47'",
  "skills_have": [
    {"name": "skill name", "pct": 85},
    {"name": "skill name", "pct": 72},
    {"name": "skill name", "pct": 68},
    {"name": "skill name", "pct": 60},
    {"name": "skill name", "pct": 55}
  ],
  "skills_need": [
    {"name": "skill name", "pct": 20},
    {"name": "skill name", "pct": 15},
    {"name": "skill name", "pct": 35},
    {"name": "skill name", "pct": 30},
    {"name": "skill name", "pct": 25}
  ],
  "roadmap": [
    {
      "phase": "Month 1–2",
      "title": "Step title",
      "desc": "2-3 sentences of specific, actionable advice for this exact transition.",
      "tags": ["tag1", "tag2", "tag3"]
    },
    {"phase": "Month 2–3", "title": "...", "desc": "...", "tags": []},
    {"phase": "Month 3–5", "title": "...", "desc": "...", "tags": []},
    {"phase": "Month 5–8", "title": "...", "desc": "...", "tags": []}
  ],
  "people": [
    {
      "initial": "P",
      "name": "Priya M.",
      "transition_label": "${job.from} → role they landed",
      "quote": "Short honest quote about this transition (1-2 sentences)",
      "match_pct": 84,
      "avatar_gradient": "linear-gradient(135deg,#5B21B6,#A78BFA)"
    },
    {"initial": "J", "name": "James K.", "transition_label": "...", "quote": "...", "match_pct": 79, "avatar_gradient": "linear-gradient(135deg,#0891b2,#67e8f9)"},
    {"initial": "S", "name": "Sara O.", "transition_label": "...", "quote": "...", "match_pct": 91, "avatar_gradient": "linear-gradient(135deg,#b45309,#fcd34d)"}
  ],
  "faqs": [
    {"q": "real question people google about this transition", "a": "honest 2-3 sentence answer"},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ],
  "cta_headline": "Short emotional headline for the final CTA section"
}`;

    case 'ready-for':
      return `${base}

Generate content for a page targeting the search: "do I have what it takes to become a ${job.role}" / "am I ready to become a ${job.role}".

Return this exact JSON structure:
{
  "page_title": "SEO title (60 chars max)",
  "meta_description": "Meta description (155 chars max)",
  "hero_headline": "H1 targeting the search intent (mention ${job.role})",
  "hero_subtitle": "2 sentences. Honest, direct, not salesy.",
  "key_requirements": [
    {"label": "requirement name", "desc": "1 sentence description", "hard": false},
    {"label": "...", "desc": "...", "hard": true},
    {"label": "...", "desc": "...", "hard": false},
    {"label": "...", "desc": "...", "hard": false},
    {"label": "...", "desc": "...", "hard": true}
  ],
  "honest_truths": [
    {"truth": "one honest thing most people don't tell you about becoming a ${job.role}"},
    {"truth": "..."},
    {"truth": "..."}
  ],
  "faqs": [
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ],
  "cta_headline": "Short motivating CTA headline"
}`;

    case 'why-no-interviews':
      return `${base}

Generate content for a page targeting: "why am I not getting interviews for ${job.role}" / "why am I not getting hired as ${job.role}".

Return this exact JSON structure:
{
  "page_title": "SEO title (60 chars max)",
  "meta_description": "Meta description (155 chars max)",
  "hero_headline": "H1 — direct, validates their frustration",
  "hero_subtitle": "2 sentences. Empathetic but honest.",
  "reasons": [
    {"title": "Reason title", "desc": "2 sentences explaining this specific problem for ${job.role} roles and how to fix it.", "fix": "One-line fix"},
    {"title": "...", "desc": "...", "fix": "..."},
    {"title": "...", "desc": "...", "fix": "..."},
    {"title": "...", "desc": "...", "fix": "..."},
    {"title": "...", "desc": "...", "fix": "..."}
  ],
  "faqs": [
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ],
  "cta_headline": "Short empathetic CTA headline"
}`;

    case 'skills-gap':
      return `${base}

Generate content for a page targeting: "what skills do I need to become a ${job.role}" / "skills gap for ${job.role}".

Return this exact JSON structure:
{
  "page_title": "SEO title (60 chars max)",
  "meta_description": "Meta description (155 chars max)",
  "hero_headline": "H1 — specific to ${job.role}",
  "hero_subtitle": "2 sentences.",
  "must_have_skills": [
    {"name": "skill", "why": "one sentence why this matters for ${job.role}"},
    {"name": "...", "why": "..."},
    {"name": "...", "why": "..."},
    {"name": "...", "why": "..."},
    {"name": "...", "why": "..."}
  ],
  "nice_to_have_skills": [
    {"name": "skill", "why": "..."},
    {"name": "...", "why": "..."},
    {"name": "...", "why": "..."}
  ],
  "faqs": [
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ],
  "cta_headline": "CTA headline"
}`;

    case 'community':
      return `${base}

Generate content for a page targeting: "community for ${job.role}" / "network for ${job.role} career changers" / "connect with ${job.role}s".

Return this exact JSON structure:
{
  "page_title": "SEO title (60 chars max)",
  "meta_description": "Meta description (155 chars max)",
  "hero_headline": "H1 about finding community/connection for ${job.role}",
  "hero_subtitle": "2 sentences validating why generic networking sucks.",
  "pain_points": [
    {"point": "specific pain point about trying to network as a ${job.role} career changer"},
    {"point": "..."},
    {"point": "..."}
  ],
  "what_leapr_offers": [
    {"feature": "feature name", "desc": "1 sentence"},
    {"feature": "...", "desc": "..."},
    {"feature": "...", "desc": "..."}
  ],
  "faqs": [
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ],
  "cta_headline": "CTA headline"
}`;

    case 'india-to-us':
      return `${base}

Generate content for a page targeting: "how to get a ${job.role} job in the US from India" / "India to US career transition ${job.role}".

Return this exact JSON structure:
{
  "page_title": "SEO title (60 chars max)",
  "meta_description": "Meta description (155 chars max)",
  "hero_headline": "H1 — speaks to Indian professionals targeting US ${job.role} roles",
  "hero_subtitle": "2 sentences. Specific to the India-to-US experience.",
  "key_differences": [
    {"label": "Difference", "india": "how it works in India", "us": "how it works in the US"},
    {"label": "...", "india": "...", "us": "..."},
    {"label": "...", "india": "...", "us": "..."}
  ],
  "action_steps": [
    {"step": "Step title", "desc": "Specific advice for Indian professionals targeting US ${job.role} roles"},
    {"step": "...", "desc": "..."},
    {"step": "...", "desc": "..."},
    {"step": "...", "desc": "..."}
  ],
  "faqs": [
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ],
  "cta_headline": "CTA headline"
}`;

    case 'career-change-age':
      return `${base}

Generate content for a page targeting: "career change at ${job.age}" / "is it too late to change careers at ${job.age}" / "starting over at ${job.age}".

Return this exact JSON structure:
{
  "page_title": "SEO title (60 chars max)",
  "meta_description": "Meta description (155 chars max)",
  "hero_headline": "H1 — directly addresses the fear of changing at ${job.age}",
  "hero_subtitle": "2 sentences. Honest and encouraging without being cheesy.",
  "honest_takes": [
    {"take": "honest truth about changing careers at ${job.age} — could be positive or challenging"},
    {"take": "..."},
    {"take": "..."}
  ],
  "advantages_at_this_age": [
    {"advantage": "real advantage of changing at ${job.age} vs younger"},
    {"advantage": "..."},
    {"advantage": "..."}
  ],
  "faqs": [
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ],
  "cta_headline": "CTA headline"
}`;

    case 'after-layoff':
      return `${base}

Generate content for a page targeting: "career change after layoff to ${job.role}" / "laid off and want to become ${job.role}" / "pivot to ${job.role} after job loss".

Return this exact JSON structure:
{
  "page_title": "SEO title (60 chars max)",
  "meta_description": "Meta description (155 chars max)",
  "hero_headline": "H1 — speaks to someone who was laid off and is considering ${job.role}",
  "hero_subtitle": "2 sentences. Validates the moment and gives direction.",
  "why_now": [
    {"point": "reason why a layoff is actually a good time to pivot to ${job.role}"},
    {"point": "..."},
    {"point": "..."}
  ],
  "first_steps": [
    {"step": "Step title", "desc": "Specific first action for someone pivoting to ${job.role} post-layoff"},
    {"step": "...", "desc": "..."},
    {"step": "...", "desc": "..."},
    {"step": "...", "desc": "..."}
  ],
  "faqs": [
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ],
  "cta_headline": "CTA headline"
}`;

    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

// ─── HTML BUILDERS ────────────────────────────────────────────────────────────
// Shared nav + footer + styles used by ALL page types
function htmlShell(title, metaDesc, canonicalUrl, bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(metaDesc)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(metaDesc)}" />
  <meta property="og:url" content="https://leapr.co/${canonicalUrl}" />
  <link rel="canonical" href="https://leapr.co/${canonicalUrl}" />
  <link rel="icon" type="image/png" href="/icons/icon-512.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:'Inter',-apple-system,sans-serif;color:#111;line-height:1.6;overflow-x:hidden;-webkit-font-smoothing:antialiased}
    @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes progressFill{from{width:0}to{width:var(--w)}}
    .fade-up{animation:fadeUp 0.6s ease-out both}
    .d1{animation-delay:.1s}.d2{animation-delay:.2s}.d3{animation-delay:.3s}.d4{animation-delay:.4s}
    nav{position:sticky;top:0;z-index:100;height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 48px;background:rgba(91,33,182,0.97);backdrop-filter:blur(16px)}
    .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
    .nav-logo-text{font-size:18px;font-weight:800;letter-spacing:-0.04em;color:rgba(255,255,255,0.8)}
    .nav-logo-text span{color:#fff}
    .nav-right{display:flex;align-items:center;gap:10px}
    .btn-ghost{padding:7px 16px;border:1px solid rgba(255,255,255,0.3);border-radius:8px;font-size:14px;color:rgba(255,255,255,0.8);background:transparent;text-decoration:none;font-weight:500}
    .btn-primary{padding:8px 18px;background:#fff;border-radius:8px;font-size:14px;font-weight:700;color:#5B21B6;text-decoration:none}
    .hero{background:linear-gradient(155deg,#5B21B6 0%,#7C3AED 40%,#8B5CF6 70%,#A78BFA 100%);padding:80px 48px 72px;text-align:center;position:relative;overflow:hidden}
    .blob{position:absolute;border-radius:50%;pointer-events:none}
    .blob-l{top:-100px;left:-100px;width:400px;height:400px;background:radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 60%)}
    .blob-r{top:-60px;right:-80px;width:320px;height:320px;background:radial-gradient(circle,rgba(255,255,255,0.07) 0%,transparent 60%)}
    .breadcrumb{display:flex;align-items:center;gap:6px;justify-content:center;margin-bottom:28px}
    .breadcrumb a{font-size:12px;color:rgba(255,255,255,0.6);text-decoration:none;font-weight:500}
    .breadcrumb a:hover{color:#fff}
    .breadcrumb span{font-size:12px;color:rgba(255,255,255,0.35)}
    .pill{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:100px;padding:5px 14px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.9);margin-bottom:24px;letter-spacing:.04em;text-transform:uppercase}
    .pill-dot{width:6px;height:6px;background:#34d399;border-radius:50%}
    h1{font-size:clamp(32px,5vw,58px);font-weight:900;color:#fff;letter-spacing:-0.03em;line-height:1.08;max-width:820px;margin:0 auto 20px}
    h1 em{font-style:normal;color:#fde68a}
    .hero-sub{font-size:18px;color:rgba(255,255,255,0.8);max-width:560px;margin:0 auto 36px}
    .hero-stats{display:flex;align-items:center;justify-content:center;gap:40px;margin-bottom:40px;flex-wrap:wrap}
    .stat-n{font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.03em;display:block}
    .stat-l{font-size:12px;color:rgba(255,255,255,0.6);font-weight:500}
    .stat-div{width:1px;height:36px;background:rgba(255,255,255,0.2)}
    .btn-cta{display:inline-block;background:#fff;color:#5B21B6;padding:16px 36px;border-radius:12px;font-size:17px;font-weight:800;text-decoration:none;letter-spacing:-0.02em;box-shadow:0 8px 32px rgba(0,0,0,0.2);transition:transform .15s,box-shadow .15s}
    .btn-cta:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,0.25)}
    .btn-sub{font-size:13px;color:rgba(255,255,255,0.6);margin-top:12px}
    .role-chips{display:flex;align-items:center;justify-content:center;gap:16px;margin:40px 0 0;flex-wrap:wrap}
    .role-chip{background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:14px 24px;text-align:center}
    .chip-label{font-size:11px;color:rgba(255,255,255,0.5);font-weight:600;text-transform:uppercase;letter-spacing:.06em}
    .chip-name{font-size:18px;font-weight:800;color:#fff;margin-top:2px}
    .chip-dest{border-color:rgba(253,230,138,0.4);background:rgba(253,230,138,0.1)}
    .chip-dest .chip-name{color:#fde68a}
    .arrow-wrap{display:flex;flex-direction:column;align-items:center;gap:4px}
    .arrow-sym{font-size:28px;color:#fde68a}
    .arrow-time{font-size:11px;color:rgba(255,255,255,0.5);font-weight:600}
    section{padding:80px 48px}
    .s-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#7C3AED;margin-bottom:12px}
    h2{font-size:clamp(26px,3.5vw,40px);font-weight:900;letter-spacing:-0.03em;color:#0f0a1e;line-height:1.15;margin-bottom:16px}
    .s-sub{font-size:17px;color:#555;max-width:600px;line-height:1.7}
    .skills-section{background:#faf9ff}
    .inner{max-width:900px;margin:0 auto}
    .inner-sm{max-width:760px;margin:0 auto}
    .skills-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:48px}
    .col-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:20px}
    .col-have{color:#059669}.col-need{color:#DC2626}
    .skill-row{margin-bottom:16px}
    .skill-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    .skill-name{font-size:14px;font-weight:600;color:#1a1a2e}
    .skill-pct{font-size:13px;font-weight:700;color:#7C3AED}
    .bar-bg{height:6px;background:#e9e4ff;border-radius:100px;overflow:hidden}
    .bar-fill{height:100%;border-radius:100px;animation:progressFill 1.2s ease-out both}
    .bar-green{background:linear-gradient(90deg,#059669,#34d399)}
    .bar-red{background:linear-gradient(90deg,#DC2626,#f87171)}
    .bar-purple{background:linear-gradient(90deg,#7C3AED,#A78BFA)}
    .tip-box{margin-top:40px;padding:24px;background:#f0ebff;border-radius:16px;border-left:4px solid #7C3AED;max-width:600px}
    .tip-title{font-size:15px;color:#3b0764;font-weight:600;margin-bottom:6px}
    .tip-body{font-size:14px;color:#555;line-height:1.6}
    .tip-link{display:inline-block;margin-top:14px;background:#5B21B6;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none}
    .roadmap-section{background:#fff}
    .roadmap-steps{margin-top:48px;position:relative}
    .roadmap-steps::before{content:'';position:absolute;left:23px;top:0;bottom:0;width:2px;background:linear-gradient(to bottom,#7C3AED,#A78BFA,#e9e4ff)}
    .r-step{display:flex;gap:24px;margin-bottom:36px;position:relative}
    .r-circle{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#5B21B6,#7C3AED);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;flex-shrink:0;box-shadow:0 4px 16px rgba(91,33,182,0.3);z-index:1}
    .r-body{padding-top:10px}
    .r-time{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#7C3AED;margin-bottom:4px}
    .r-title{font-size:17px;font-weight:800;color:#0f0a1e;margin-bottom:6px}
    .r-desc{font-size:14px;color:#666;line-height:1.6}
    .r-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
    .r-tag{font-size:11px;font-weight:600;background:#f0ebff;color:#5B21B6;padding:3px 10px;border-radius:100px}
    .people-section{background:#faf9ff}
    .people-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;margin-top:40px}
    .p-card{background:#fff;border:1px solid #ede9fe;border-radius:16px;padding:20px;transition:box-shadow .2s,transform .2s}
    .p-card:hover{box-shadow:0 8px 32px rgba(91,33,182,0.1);transform:translateY(-2px)}
    .p-top{display:flex;gap:12px;align-items:flex-start;margin-bottom:12px}
    .p-av{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:15px;flex-shrink:0}
    .p-name{font-size:14px;font-weight:700;color:#0f0a1e}
    .p-trans{font-size:12px;color:#7C3AED;font-weight:600;margin-top:1px}
    .p-quote{font-size:13px;color:#555;line-height:1.6;font-style:italic}
    .p-match{display:inline-flex;align-items:center;gap:5px;margin-top:12px;background:#f0ebff;border-radius:100px;padding:3px 10px;font-size:11px;font-weight:700;color:#5B21B6}
    .founder-section{background:#0f0a1e;padding:80px 48px}
    .founder-inner{max-width:680px;margin:0 auto;text-align:center}
    .q-mark{font-size:80px;line-height:0.5;color:#7C3AED;font-family:Georgia,serif;margin-bottom:24px;display:block}
    .q-text{font-size:18px;color:rgba(255,255,255,0.85);line-height:1.75;margin-bottom:32px}
    .f-info{display:flex;align-items:center;gap:14px;justify-content:center}
    .f-av{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#5B21B6,#A78BFA);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:16px}
    .f-name{font-size:15px;font-weight:700;color:#fff;text-align:left}
    .f-role{font-size:12px;color:rgba(255,255,255,0.5);text-align:left}
    .faq-section{background:#fff}
    .faq-list{margin-top:40px}
    .faq-item{border-bottom:1px solid #f0ebff;padding:20px 0}
    .faq-q{font-size:16px;font-weight:700;color:#0f0a1e;margin-bottom:8px}
    .faq-a{font-size:15px;color:#555;line-height:1.7}
    .cta-section{background:linear-gradient(155deg,#5B21B6 0%,#7C3AED 60%,#8B5CF6 100%);text-align:center;padding:96px 48px;position:relative;overflow:hidden}
    .cta-blob{position:absolute;top:-100px;left:50%;transform:translateX(-50%);width:600px;height:300px;background:radial-gradient(ellipse,rgba(255,255,255,0.08) 0%,transparent 70%);pointer-events:none}
    .cta-h2{font-size:clamp(28px,4vw,48px);font-weight:900;color:#fff;letter-spacing:-0.03em;line-height:1.1;margin-bottom:16px}
    .cta-sub{font-size:17px;color:rgba(255,255,255,0.75);margin-bottom:36px;max-width:480px;margin-left:auto;margin-right:auto}
    .cta-checks{display:flex;gap:20px;justify-content:center;flex-wrap:wrap;margin-bottom:32px}
    .cta-check{font-size:14px;color:rgba(255,255,255,0.8);font-weight:600}
    footer{background:#0f0a1e;padding:32px 48px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
    .f-logo{display:flex;align-items:center;gap:8px;text-decoration:none}
    .f-logo-text{font-size:16px;font-weight:800;letter-spacing:-0.04em;color:rgba(255,255,255,0.6)}
    footer p{font-size:13px;color:rgba(255,255,255,0.35)}
    .f-links{display:flex;gap:20px}
    .f-links a{font-size:13px;color:rgba(255,255,255,0.4);text-decoration:none}
    .f-links a:hover{color:rgba(255,255,255,0.7)}
    .card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;margin-top:40px}
    .card{background:#fff;border:1px solid #ede9fe;border-radius:16px;padding:24px}
    .card-title{font-size:16px;font-weight:800;color:#0f0a1e;margin-bottom:8px}
    .card-desc{font-size:14px;color:#555;line-height:1.6}
    .card-badge{display:inline-block;margin-top:10px;font-size:11px;font-weight:700;background:#f0ebff;color:#5B21B6;padding:3px 10px;border-radius:100px}
    .badge-hard{background:#fff0f0;color:#DC2626}
    .list-steps{margin-top:40px;display:flex;flex-direction:column;gap:24px}
    .list-step{display:flex;gap:16px;align-items:flex-start}
    .step-num{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#5B21B6,#7C3AED);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;flex-shrink:0}
    .step-content-title{font-size:16px;font-weight:800;color:#0f0a1e;margin-bottom:4px}
    .step-content-desc{font-size:14px;color:#555;line-height:1.6}
    .compare-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;margin-top:40px;border:1px solid #ede9fe;border-radius:16px;overflow:hidden}
    .compare-header{background:#f0ebff;padding:14px 20px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#5B21B6}
    .compare-cell{padding:16px 20px;border-top:1px solid #f0ebff;font-size:14px;color:#444;line-height:1.5}
    .compare-label{font-weight:700;color:#0f0a1e}
    @media(max-width:700px){
      nav{padding:0 20px}
      section{padding:60px 20px}
      .hero{padding:60px 20px 56px}
      .hero-stats{gap:20px}
      .skills-grid{grid-template-columns:1fr}
      .compare-grid{grid-template-columns:1fr}
      footer{padding:24px 20px;flex-direction:column;text-align:center}
    }
  </style>
</head>
<body>

<nav>
  <a href="/" class="nav-logo">
    <span class="nav-logo-text">Leap<span>r</span></span>
  </a>
  <div class="nav-right">
    <a href="https://app.leapr.co" class="btn-ghost">Sign in</a>
    <a href="https://app.leapr.co" class="btn-primary">Join free →</a>
  </div>
</nav>

${bodyContent}

<section class="founder-section">
  <div class="founder-inner">
    <span class="q-mark">"</span>
    <p class="q-text">I went through my own career transition. The doubt. The imposter syndrome. The "is it too late for me?"<br/><br/>The one thing I needed was a room full of people going through the same thing. Not mentors. Not influencers. Just real people, mid-transition, willing to talk honestly.<br/><br/>That room didn't exist. So I built it.</p>
    <div class="f-info">
      <div class="f-av">D</div>
      <div>
        <div class="f-name">Deepika Sharma</div>
        <div class="f-role">Founder, Leapr · Career Transition Survivor 💜</div>
      </div>
    </div>
  </div>
</section>

<section class="cta-section">
  <div class="cta-blob"></div>
  <h2 class="cta-h2 fade-up">${esc(bodyContent.__cta || "You don't have to figure this out alone.")}</h2>
  <p class="cta-sub fade-up">See your exact gap. Meet your cohort. Get your roadmap. Free.</p>
  <div class="cta-checks fade-up">
    <span class="cta-check">✓ Free to join</span>
    <span class="cta-check">✓ No credit card</span>
    <span class="cta-check">✓ Personalised to you</span>
  </div>
  <a href="https://app.leapr.co" class="btn-cta fade-up" style="font-size:17px;padding:16px 40px;">Start my transition on Leapr →</a>
</section>

<footer>
  <a href="/" class="f-logo"><span class="f-logo-text">Leapr</span></a>
  <p>© 2026 Leapr. All rights reserved.</p>
  <div class="f-links">
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
    <a href="mailto:hello@leapr.co">Contact</a>
  </div>
</footer>

</body>
</html>`;
}

// Build body HTML per page type
function buildBody(job, data) {
  switch (job.type) {
    case 'transition':
    case 'find-your-twin': {
      const parentLabel = job.type === 'find-your-twin' ? 'Find Your Twin' : 'Transitions';
      const parentPath  = job.type === 'find-your-twin' ? '/find-your-twin' : '/transition';
      const body = `
<section class="hero">
  <div class="blob blob-l"></div><div class="blob blob-r"></div>
  <div class="breadcrumb fade-up">
    <a href="/">Home</a><span>›</span>
    <a href="${parentPath}">${parentLabel}</a><span>›</span>
    <span style="color:rgba(255,255,255,0.6)">${esc(job.from)} → ${esc(job.to)}</span>
  </div>
  <div class="pill fade-up d1"><span class="pill-dot"></span>${esc(data.stat_active_members)} people making this exact move right now</div>
  <h1 class="fade-up d2">${esc(job.from)} to<br/><em>${esc(data.hero_headline_em || job.to)}</em></h1>
  <p class="hero-sub fade-up d3">${esc(data.hero_subtitle)}</p>
  <div class="hero-stats fade-up d3">
    <div><span class="stat-n">${esc(data.stat_transition_time)}</span><span class="stat-l">Avg. transition time</span></div>
    <div class="stat-div"></div>
    <div><span class="stat-n">${esc(data.stat_skill_overlap)}</span><span class="stat-l">Skill overlap</span></div>
    <div class="stat-div"></div>
    <div><span class="stat-n">${esc(data.stat_salary_bump)}</span><span class="stat-l">Median salary change</span></div>
  </div>
  <a href="https://app.leapr.co" class="btn-cta fade-up d4">See my personal gap analysis →</a>
  <p class="btn-sub fade-up d4">Free · Takes 3 minutes · No credit card</p>
  <div class="role-chips fade-up d4">
    <div class="role-chip"><div class="chip-label">You are here</div><div class="chip-name">${esc(job.from)}</div></div>
    <div class="arrow-wrap"><div class="arrow-sym">→</div><div class="arrow-time">${esc(data.stat_transition_time)}</div></div>
    <div class="role-chip chip-dest"><div class="chip-label">You want to be</div><div class="chip-name">${esc(job.to)}</div></div>
  </div>
</section>

<section class="skills-section">
  <div class="inner">
    <div class="s-label fade-up">Skills Gap Analysis</div>
    <h2 class="fade-up">What you already have.<br/>What you still need.</h2>
    <p class="s-sub fade-up">As a ${esc(job.from)}, you're closer than you think. Your actual gap on Leapr is personalised to your resume.</p>
    <div class="skills-grid">
      <div>
        <div class="col-title col-have">✓ You likely already have</div>
        ${(data.skills_have||[]).map(s=>`<div class="skill-row"><div class="skill-top"><span class="skill-name">${esc(s.name)}</span><span class="skill-pct">${s.pct}%</span></div><div class="bar-bg"><div class="bar-fill bar-green" style="--w:${s.pct}%"></div></div></div>`).join('')}
      </div>
      <div>
        <div class="col-title col-need">△ Gaps to close</div>
        ${(data.skills_need||[]).map(s=>`<div class="skill-row"><div class="skill-top"><span class="skill-name">${esc(s.name)}</span><span class="skill-pct">${s.pct}%</span></div><div class="bar-bg"><div class="bar-fill bar-red" style="--w:${s.pct}%"></div></div></div>`).join('')}
      </div>
    </div>
    <div class="tip-box"><p class="tip-title">This is the average gap. Yours is different.</p><p class="tip-body">Upload your resume on Leapr and get a gap analysis specific to your actual background — not a template.</p><a href="https://app.leapr.co" class="tip-link">Get my personalised gap →</a></div>
  </div>
</section>

<section class="roadmap-section">
  <div class="inner-sm">
    <div class="s-label fade-up">The Roadmap</div>
    <h2 class="fade-up">Your step-by-step plan.</h2>
    <p class="s-sub fade-up">This is the typical path. Your Leapr roadmap adjusts based on your skills, timeline, and target companies.</p>
    <div class="roadmap-steps">
      ${(data.roadmap||[]).map((s,i)=>`<div class="r-step fade-up d${Math.min(i+1,4)}"><div class="r-circle">${i+1}</div><div class="r-body"><div class="r-time">${esc(s.phase)}</div><div class="r-title">${esc(s.title)}</div><div class="r-desc">${esc(s.desc)}</div><div class="r-tags">${(s.tags||[]).map(t=>`<span class="r-tag">${esc(t)}</span>`).join('')}</div></div></div>`).join('')}
    </div>
  </div>
</section>

<section class="people-section">
  <div class="inner">
    <div class="s-label fade-up">Community</div>
    <h2 class="fade-up">${esc(data.stat_active_members)} people making this exact move.</h2>
    <p class="s-sub fade-up">You're not doing this alone. These are real Leapr members on the ${esc(job.from)} → ${esc(job.to)} path.</p>
    <div class="people-grid">
      ${(data.people||[]).map((p,i)=>`<div class="p-card fade-up d${i+1}"><div class="p-top"><div class="p-av" style="background:${esc(p.avatar_gradient)}">${esc(p.initial)}</div><div><div class="p-name">${esc(p.name)}</div><div class="p-trans">${esc(p.transition_label)}</div></div></div><p class="p-quote">"${esc(p.quote)}"</p><div class="p-match">✓ ${p.match_pct}% match to your profile</div></div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:40px"><a href="https://app.leapr.co" class="btn-cta" style="font-size:15px;padding:14px 32px;">Find my twin on Leapr →</a></div>
  </div>
</section>

<section class="faq-section">
  <div class="inner-sm">
    <div class="s-label fade-up">Common questions</div>
    <h2 class="fade-up">${esc(job.from)} → ${esc(job.to)} FAQ</h2>
    <div class="faq-list">
      ${(data.faqs||[]).map((f,i)=>`<div class="faq-item fade-up d${Math.min(i+1,4)}"><div class="faq-q">${esc(f.q)}</div><div class="faq-a">${esc(f.a)}</div></div>`).join('')}
    </div>
  </div>
</section>`;
      body.__cta = data.cta_headline;
      return body;
    }

    case 'ready-for': {
      const body = `
<section class="hero">
  <div class="blob blob-l"></div><div class="blob blob-r"></div>
  <div class="breadcrumb fade-up"><a href="/">Home</a><span>›</span><span style="color:rgba(255,255,255,0.6)">Ready for ${esc(job.role)}?</span></div>
  <h1 class="fade-up d2" style="max-width:900px">${esc(data.hero_headline)}</h1>
  <p class="hero-sub fade-up d3">${esc(data.hero_subtitle)}</p>
  <a href="https://app.leapr.co" class="btn-cta fade-up d4">Check my readiness on Leapr →</a>
  <p class="btn-sub fade-up d4">Free · Personalised to your resume</p>
</section>

<section style="background:#faf9ff">
  <div class="inner">
    <div class="s-label fade-up">Requirements</div>
    <h2 class="fade-up">What it actually takes to become a ${esc(job.role)}.</h2>
    <div class="card-grid">
      ${(data.key_requirements||[]).map(r=>`<div class="card"><div class="card-title">${esc(r.label)}</div><div class="card-desc">${esc(r.desc)}</div>${r.hard?'<span class="card-badge badge-hard">Must have</span>':'<span class="card-badge">Good to have</span>'}</div>`).join('')}
    </div>
  </div>
</section>

<section style="background:#fff">
  <div class="inner-sm">
    <div class="s-label fade-up">Honest truths</div>
    <h2 class="fade-up">What nobody tells you.</h2>
    <div class="faq-list">
      ${(data.honest_truths||[]).map((t,i)=>`<div class="faq-item fade-up d${i+1}"><div class="faq-a" style="font-size:16px;color:#333">${esc(t.truth)}</div></div>`).join('')}
    </div>
  </div>
</section>

<section class="faq-section">
  <div class="inner-sm">
    <div class="s-label fade-up">FAQ</div>
    <h2 class="fade-up">Common questions about becoming a ${esc(job.role)}.</h2>
    <div class="faq-list">
      ${(data.faqs||[]).map((f,i)=>`<div class="faq-item fade-up d${i+1}"><div class="faq-q">${esc(f.q)}</div><div class="faq-a">${esc(f.a)}</div></div>`).join('')}
    </div>
  </div>
</section>`;
      body.__cta = data.cta_headline;
      return body;
    }

    case 'why-no-interviews': {
      const body = `
<section class="hero">
  <div class="blob blob-l"></div><div class="blob blob-r"></div>
  <div class="breadcrumb fade-up"><a href="/">Home</a><span>›</span><span style="color:rgba(255,255,255,0.6)">Why no interviews: ${esc(job.role)}</span></div>
  <h1 class="fade-up d2" style="max-width:900px">${esc(data.hero_headline)}</h1>
  <p class="hero-sub fade-up d3">${esc(data.hero_subtitle)}</p>
  <a href="https://app.leapr.co" class="btn-cta fade-up d4">See what's holding me back →</a>
  <p class="btn-sub fade-up d4">Free · Gap analysis in 3 minutes</p>
</section>

<section style="background:#faf9ff">
  <div class="inner">
    <div class="s-label fade-up">Real Reasons</div>
    <h2 class="fade-up">Why ${esc(job.role)} applications go quiet.</h2>
    <div class="card-grid">
      ${(data.reasons||[]).map(r=>`<div class="card"><div class="card-title">${esc(r.title)}</div><div class="card-desc">${esc(r.desc)}</div><div style="margin-top:12px;font-size:13px;color:#059669;font-weight:600">Fix: ${esc(r.fix)}</div></div>`).join('')}
    </div>
  </div>
</section>

<section class="faq-section">
  <div class="inner-sm">
    <div class="s-label fade-up">FAQ</div>
    <h2 class="fade-up">More questions answered.</h2>
    <div class="faq-list">
      ${(data.faqs||[]).map((f,i)=>`<div class="faq-item fade-up d${i+1}"><div class="faq-q">${esc(f.q)}</div><div class="faq-a">${esc(f.a)}</div></div>`).join('')}
    </div>
  </div>
</section>`;
      body.__cta = data.cta_headline;
      return body;
    }

    case 'skills-gap': {
      const body = `
<section class="hero">
  <div class="blob blob-l"></div><div class="blob blob-r"></div>
  <div class="breadcrumb fade-up"><a href="/">Home</a><span>›</span><a href="/skills-gap">Skills Gap</a><span>›</span><span style="color:rgba(255,255,255,0.6)">${esc(job.role)}</span></div>
  <h1 class="fade-up d2" style="max-width:900px">${esc(data.hero_headline)}</h1>
  <p class="hero-sub fade-up d3">${esc(data.hero_subtitle)}</p>
  <a href="https://app.leapr.co" class="btn-cta fade-up d4">Find my personal gap →</a>
  <p class="btn-sub fade-up d4">Free · Upload your resume</p>
</section>

<section style="background:#faf9ff">
  <div class="inner">
    <div class="s-label fade-up">Must-Have Skills</div>
    <h2 class="fade-up">Non-negotiables for ${esc(job.role)}.</h2>
    <div class="skills-grid" style="margin-top:32px">
      <div>
        <div class="col-title" style="color:#5B21B6">Core requirements</div>
        ${(data.must_have_skills||[]).map(s=>`<div class="skill-row"><div class="skill-top"><span class="skill-name">${esc(s.name)}</span></div><div class="bar-bg" style="height:8px"><div class="bar-fill bar-purple" style="--w:100%"></div></div><div style="font-size:12px;color:#666;margin-top:4px">${esc(s.why)}</div></div>`).join('')}
      </div>
      <div>
        <div class="col-title" style="color:#7C3AED">Nice to have</div>
        ${(data.nice_to_have_skills||[]).map(s=>`<div class="skill-row"><div class="skill-top"><span class="skill-name">${esc(s.name)}</span></div><div class="bar-bg" style="height:8px"><div class="bar-fill" style="--w:60%;background:linear-gradient(90deg,#A78BFA,#c4b5fd)"></div></div><div style="font-size:12px;color:#666;margin-top:4px">${esc(s.why)}</div></div>`).join('')}
      </div>
    </div>
  </div>
</section>

<section class="faq-section">
  <div class="inner-sm">
    <div class="s-label fade-up">FAQ</div>
    <h2 class="fade-up">${esc(job.role)} skills — common questions.</h2>
    <div class="faq-list">
      ${(data.faqs||[]).map((f,i)=>`<div class="faq-item fade-up d${i+1}"><div class="faq-q">${esc(f.q)}</div><div class="faq-a">${esc(f.a)}</div></div>`).join('')}
    </div>
  </div>
</section>`;
      body.__cta = data.cta_headline;
      return body;
    }

    case 'community': {
      const body = `
<section class="hero">
  <div class="blob blob-l"></div><div class="blob blob-r"></div>
  <div class="breadcrumb fade-up"><a href="/">Home</a><span>›</span><a href="/community">Community</a><span>›</span><span style="color:rgba(255,255,255,0.6)">${esc(job.role)}</span></div>
  <h1 class="fade-up d2" style="max-width:900px">${esc(data.hero_headline)}</h1>
  <p class="hero-sub fade-up d3">${esc(data.hero_subtitle)}</p>
  <a href="https://app.leapr.co" class="btn-cta fade-up d4">Find my ${esc(job.role)} community →</a>
  <p class="btn-sub fade-up d4">Free · Join your cohort today</p>
</section>

<section style="background:#faf9ff">
  <div class="inner-sm">
    <div class="s-label fade-up">The Problem</div>
    <h2 class="fade-up">Why generic networking doesn't work for ${esc(job.role)} career changers.</h2>
    <div class="faq-list">
      ${(data.pain_points||[]).map((p,i)=>`<div class="faq-item fade-up d${i+1}"><div class="faq-a" style="font-size:16px;color:#333">${esc(p.point)}</div></div>`).join('')}
    </div>
  </div>
</section>

<section style="background:#fff">
  <div class="inner">
    <div class="s-label fade-up">What Leapr Offers</div>
    <h2 class="fade-up">Community built for ${esc(job.role)} transitions.</h2>
    <div class="card-grid">
      ${(data.what_leapr_offers||[]).map(f=>`<div class="card"><div class="card-title">${esc(f.feature)}</div><div class="card-desc">${esc(f.desc)}</div></div>`).join('')}
    </div>
  </div>
</section>

<section class="faq-section">
  <div class="inner-sm">
    <div class="s-label fade-up">FAQ</div>
    <h2 class="fade-up">Questions about Leapr's ${esc(job.role)} community.</h2>
    <div class="faq-list">
      ${(data.faqs||[]).map((f,i)=>`<div class="faq-item fade-up d${i+1}"><div class="faq-q">${esc(f.q)}</div><div class="faq-a">${esc(f.a)}</div></div>`).join('')}
    </div>
  </div>
</section>`;
      body.__cta = data.cta_headline;
      return body;
    }

    case 'india-to-us': {
      const body = `
<section class="hero">
  <div class="blob blob-l"></div><div class="blob blob-r"></div>
  <div class="breadcrumb fade-up"><a href="/">Home</a><span>›</span><a href="/india-to-us">India to US</a><span>›</span><span style="color:rgba(255,255,255,0.6)">${esc(job.role)}</span></div>
  <div class="pill fade-up d1"><span class="pill-dot"></span>India → US Career Transition</div>
  <h1 class="fade-up d2" style="max-width:900px">${esc(data.hero_headline)}</h1>
  <p class="hero-sub fade-up d3">${esc(data.hero_subtitle)}</p>
  <a href="https://app.leapr.co" class="btn-cta fade-up d4">Start my US ${esc(job.role)} journey →</a>
  <p class="btn-sub fade-up d4">Free · Built for international professionals</p>
</section>

<section style="background:#faf9ff">
  <div class="inner">
    <div class="s-label fade-up">India vs US</div>
    <h2 class="fade-up">Key differences for ${esc(job.role)} roles.</h2>
    <div class="compare-grid">
      <div class="compare-header">Aspect</div>
      <div class="compare-header">In India 🇮🇳</div>
      <div class="compare-header">In the US 🇺🇸</div>
      ${(data.key_differences||[]).map(d=>`<div class="compare-cell compare-label">${esc(d.label)}</div><div class="compare-cell">${esc(d.india)}</div><div class="compare-cell">${esc(d.us)}</div>`).join('')}
    </div>
  </div>
</section>

<section style="background:#fff">
  <div class="inner-sm">
    <div class="s-label fade-up">Action Plan</div>
    <h2 class="fade-up">Steps to land a US ${esc(job.role)} role from India.</h2>
    <div class="list-steps">
      ${(data.action_steps||[]).map((s,i)=>`<div class="list-step fade-up d${Math.min(i+1,4)}"><div class="step-num">${i+1}</div><div><div class="step-content-title">${esc(s.step)}</div><div class="step-content-desc">${esc(s.desc)}</div></div></div>`).join('')}
    </div>
  </div>
</section>

<section class="faq-section">
  <div class="inner-sm">
    <div class="s-label fade-up">FAQ</div>
    <h2 class="fade-up">India to US ${esc(job.role)} — common questions.</h2>
    <div class="faq-list">
      ${(data.faqs||[]).map((f,i)=>`<div class="faq-item fade-up d${i+1}"><div class="faq-q">${esc(f.q)}</div><div class="faq-a">${esc(f.a)}</div></div>`).join('')}
    </div>
  </div>
</section>`;
      body.__cta = data.cta_headline;
      return body;
    }

    case 'career-change-age': {
      const body = `
<section class="hero">
  <div class="blob blob-l"></div><div class="blob blob-r"></div>
  <div class="breadcrumb fade-up"><a href="/">Home</a><span>›</span><span style="color:rgba(255,255,255,0.6)">Career Change at ${job.age}</span></div>
  <h1 class="fade-up d2" style="max-width:900px">${esc(data.hero_headline)}</h1>
  <p class="hero-sub fade-up d3">${esc(data.hero_subtitle)}</p>
  <a href="https://app.leapr.co" class="btn-cta fade-up d4">Find people changing careers at ${job.age} →</a>
  <p class="btn-sub fade-up d4">Free · You're not alone</p>
</section>

<section style="background:#faf9ff">
  <div class="inner-sm">
    <div class="s-label fade-up">Honest Takes</div>
    <h2 class="fade-up">What it's actually like to change careers at ${job.age}.</h2>
    <div class="faq-list">
      ${(data.honest_takes||[]).map((t,i)=>`<div class="faq-item fade-up d${i+1}"><div class="faq-a" style="font-size:16px;color:#333">${esc(t.take)}</div></div>`).join('')}
    </div>
  </div>
</section>

<section style="background:#fff">
  <div class="inner">
    <div class="s-label fade-up">Your Advantages</div>
    <h2 class="fade-up">What you have at ${job.age} that a 22-year-old doesn't.</h2>
    <div class="card-grid">
      ${(data.advantages_at_this_age||[]).map(a=>`<div class="card"><div class="card-desc" style="font-size:15px;color:#333">${esc(a.advantage)}</div></div>`).join('')}
    </div>
  </div>
</section>

<section class="faq-section">
  <div class="inner-sm">
    <div class="s-label fade-up">FAQ</div>
    <h2 class="fade-up">Career change at ${job.age} — common questions.</h2>
    <div class="faq-list">
      ${(data.faqs||[]).map((f,i)=>`<div class="faq-item fade-up d${i+1}"><div class="faq-q">${esc(f.q)}</div><div class="faq-a">${esc(f.a)}</div></div>`).join('')}
    </div>
  </div>
</section>`;
      body.__cta = data.cta_headline;
      return body;
    }

    case 'after-layoff': {
      const body = `
<section class="hero">
  <div class="blob blob-l"></div><div class="blob blob-r"></div>
  <div class="breadcrumb fade-up"><a href="/">Home</a><span>›</span><a href="/after-layoff">After Layoff</a><span>›</span><span style="color:rgba(255,255,255,0.6)">${esc(job.role)}</span></div>
  <div class="pill fade-up d1"><span class="pill-dot"></span>Pivoting after a layoff</div>
  <h1 class="fade-up d2" style="max-width:900px">${esc(data.hero_headline)}</h1>
  <p class="hero-sub fade-up d3">${esc(data.hero_subtitle)}</p>
  <a href="https://app.leapr.co" class="btn-cta fade-up d4">Start my ${esc(job.role)} pivot →</a>
  <p class="btn-sub fade-up d4">Free · Get your roadmap today</p>
</section>

<section style="background:#faf9ff">
  <div class="inner-sm">
    <div class="s-label fade-up">Why now is actually good</div>
    <h2 class="fade-up">Why a layoff might be the best time to pivot to ${esc(job.role)}.</h2>
    <div class="faq-list">
      ${(data.why_now||[]).map((p,i)=>`<div class="faq-item fade-up d${i+1}"><div class="faq-a" style="font-size:16px;color:#333">${esc(p.point)}</div></div>`).join('')}
    </div>
  </div>
</section>

<section style="background:#fff">
  <div class="inner-sm">
    <div class="s-label fade-up">First Steps</div>
    <h2 class="fade-up">What to do this week.</h2>
    <div class="list-steps">
      ${(data.first_steps||[]).map((s,i)=>`<div class="list-step fade-up d${Math.min(i+1,4)}"><div class="step-num">${i+1}</div><div><div class="step-content-title">${esc(s.step)}</div><div class="step-content-desc">${esc(s.desc)}</div></div></div>`).join('')}
    </div>
  </div>
</section>

<section class="faq-section">
  <div class="inner-sm">
    <div class="s-label fade-up">FAQ</div>
    <h2 class="fade-up">Pivoting to ${esc(job.role)} after a layoff — questions answered.</h2>
    <div class="faq-list">
      ${(data.faqs||[]).map((f,i)=>`<div class="faq-item fade-up d${i+1}"><div class="faq-q">${esc(f.q)}</div><div class="faq-a">${esc(f.a)}</div></div>`).join('')}
    </div>
  </div>
</section>`;
      body.__cta = data.cta_headline;
      return body;
    }

    default: return '<section><p>Unknown page type</p></section>';
  }
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function esc(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── CANONICAL URL builder ────────────────────────────────────────────────────
function canonicalUrl(job) {
  return job.outPath.replace(/\.html$/, '');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Leapr SEO Page Generator\n');

  const jobs = buildAllJobs();
  const total = jobs.length;

  // Stats
  const byType = {};
  for (const j of jobs) byType[j.type] = (byType[j.type]||0)+1;
  console.log(`📊 Pages to generate:`);
  for (const [t,n] of Object.entries(byType)) console.log(`   ${t}: ${n}`);
  console.log(`   TOTAL: ${total}\n`);

  let done = 0, skipped = 0, failed = 0;

  for (const job of jobs) {
    const outPath = path.join(OUTPUT_DIR, job.outPath);
    const pct = Math.round(((done+skipped)/total)*100);

    // Skip if already generated
    if (fs.existsSync(outPath)) {
      skipped++;
      continue;
    }

    process.stdout.write(`[${pct}%] Generating ${job.outPath}... `);

    try {
      const prompt = buildPrompt(job);
      const data   = await callClaude(prompt);
      const body   = buildBody(job, data);
      const html   = htmlShell(data.page_title || job.outPath, data.meta_description || '', canonicalUrl(job), body);

      ensureDir(outPath);
      fs.writeFileSync(outPath, html, 'utf8');
      done++;
      console.log('✅');
    } catch (e) {
      failed++;
      console.log(`❌ ${e.message}`);
      // Write error placeholder so it's skippable
      ensureDir(outPath);
      fs.writeFileSync(outPath, `<!-- ERROR: ${e.message} -->`, 'utf8');
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n✨ Done!`);
  console.log(`   ✅ Generated: ${done}`);
  console.log(`   ⏭  Skipped (already exist): ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`\n📁 Output: ${path.resolve(OUTPUT_DIR)}`);
  console.log(`\nNext step: Copy everything inside ./generated/ into your leapr-landing folder, then push!\n`);
}

main().catch(e => { console.error('\n❌ Fatal error:', e.message); process.exit(1); });
