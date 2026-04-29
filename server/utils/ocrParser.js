/**
 * OCR text parser — extracts structured performance metrics from raw OCR text.
 * Handles X-marked selections (e.g., "X Yes • Mostly • Not") and free-text blocks.
 */

function parseOCRText(text) {
  const s = {};
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const full = text.toLowerCase();

  // ---- Helper: find which option is X-marked on a line ----
  function pickXMarked(line, options) {
    const low = line.toLowerCase();
    // Pattern: "X option1 • option2 • option3" or "X option1 | option2 | option3"
    for (const opt of options) {
      // Check if this option appears after an X (or checkmark) before the next option or bullet
      const idx = low.indexOf(opt);
      if (idx === -1) continue;
      // Look backward from option position for X or checkmark
      const before = low.slice(0, idx);
      // Check if there's an X within ~10 chars before this option
      const segment = before.slice(-15);
      if (/[x✓✔☑]/.test(segment) && !options.some(o => o !== opt && low.indexOf(o) > -1 && low.indexOf(o) < idx && /[x✓✔☑]/.test(low.slice(Math.max(0, low.indexOf(o) - 10), low.indexOf(o))))) {
        return opt;
      }
      // Also handle "option X" or "option: X" patterns
      const afterOpt = low.slice(idx + opt.length, idx + opt.length + 5);
      if (/[x✓✔☑]/.test(afterOpt)) return opt;
    }
    return null;
  }

  // ---- Helper: find line containing keyword and pick X-marked option ----
  function findCategorical(keywords, options) {
    for (let i = 0; i < lines.length; i++) {
      const low = lines[i].toLowerCase();
      if (keywords.some(k => low.includes(k))) {
        // Check this line and the next line(s) for the options
        const searchLines = [lines[i], lines[i + 1], lines[i + 2]].filter(Boolean).join(' ');
        const result = pickXMarked(searchLines, options);
        if (result) return result;
      }
    }
    return null;
  }

  // ---- Helper: extract text block after a heading ----
  function extractBlock(keywords, stopKeywords, maxLines = 10) {
    for (let i = 0; i < lines.length; i++) {
      const low = lines[i].toLowerCase();
      if (keywords.some(k => low.includes(k))) {
        // Skip label line itself (e.g., "Strengths / Wins (optional):" contains the text)
        let start = i;
        // If line ends with colon and has no real content, start from next line
        if (lines[i].match(/[:;]\s*$/) && lines[i].length < 40) {
          start = i + 1;
        }
        const block = [];
        for (let j = start; j < Math.min(lines.length, start + maxLines); j++) {
          const jLow = lines[j].toLowerCase();
          if (stopKeywords.some(sk => jLow.includes(sk))) break;
          // Skip lines that are just labels or option lists
          if (lines[j].match(/^[\d)\s]*$/) || lines[j].match(/^•/)) continue;
          block.push(lines[j]);
        }
        return block.join('\n').trim();
      }
    }
    return null;
  }

  // ---- Overall Status ----
  // Look for "Overall Status" line with X-marked option
  const statusOpts = ['red', 'amber', 'green'];
  const statusLine = findCategorical(['overall status', 'status (select'], statusOpts);
  if (statusLine) s.overall_status = statusLine;
  // Fallback: look for "X Red" pattern anywhere near "Overall Status"
  if (!s.overall_status) {
    const m = text.match(/overall status.*?([x✓✔☑])\s*(red|amber|green)/is);
    if (m) s.overall_status = m[2].toLowerCase();
  }

  // ---- Overall Reasons ----
  const reasons = extractBlock(
    ['overall reasons', 'overall reason', 'reasons:', 'reason:'],
    ['performance scorecard', 'strengths', 'delivery', 'quality', 'rework', 'communication', 'recommendation', '3)', 'scorecard'],
    8
  );
  if (reasons && reasons.length > 0) s.overall_reasons = reasons;

  // ---- Delivery ----
  const delivery = findCategorical(['delivery'], ['yes', 'mostly', 'not']);
  if (delivery) s.delivery = delivery === 'yes' ? 'yes' : delivery;
  if (!s.delivery) {
    const m = text.match(/delivery.*?([x✓✔☑])\s*(yes|mostly|not)/is);
    if (m) s.delivery = m[2].toLowerCase() === 'yes' ? 'yes' : m[2].toLowerCase();
  }

  // ---- Quality ----
  const quality = findCategorical(['quality'], ['good', 'mixed', 'poor']);
  if (quality) s.quality = quality;
  if (!s.quality) {
    const m = text.match(/quality.*?([x✓✔☑])\s*(good|mixed|poor)/is);
    if (m) s.quality = m[2].toLowerCase();
  }

  // ---- Rework ----
  const rework = findCategorical(['rework'], ['high', 'medium', 'low']);
  if (rework) s.rework = rework;
  if (!s.rework) {
    const m = text.match(/rework.*?([x✓✔☑])\s*(high|medium|low)/is);
    if (m) s.rework = m[2].toLowerCase();
  }

  // ---- Communication ----
  const commOpts = ['effective', 'needs improvement'];
  const comm = findCategorical(['communication'], commOpts);
  if (comm) s.communication = comm === 'effective' ? 'effective' : 'needs_improvement';
  if (!s.communication) {
    const m = text.match(/communication.*?([x✓✔☑])\s*(effective|needs)/is);
    if (m) s.communication = m[2].toLowerCase().startsWith('eff') ? 'effective' : 'needs_improvement';
  }

  // ---- Strengths / Wins ----
  const strengths = extractBlock(
    ['strengths', 'wins'],
    ['areas of improvement', 'improvement', 'support needed', 'support', 'recommendation', '4)', '5)', '6)'],
    8
  );
  if (strengths && strengths.length > 0) s.strengths = strengths;

  // ---- Areas of Improvement ----
  const areas = extractBlock(
    ['areas of improvement', 'improvement for the resource', 'improvement'],
    ['support needed', 'support', 'recommendation', '5)', '6)'],
    8
  );
  if (areas && areas.length > 0) s.areas_of_improvement = areas;

  // ---- Support Needed ----
  const support = extractBlock(
    ['support needed', 'support'],
    ['recommendation', 'recommend', 'areas of improvement', '6)'],
    8
  );
  if (support && support.length > 0) s.support_needed = support;

  // ---- Recommendation ----
  const recOpts = ['continue strong', 'continue meets', 'improvement plan', 'replacement', 'role change'];
  const rec = findCategorical(['recommendation'], recOpts);
  if (rec) {
    if (rec.includes('replacement')) s.recommendation = 'replacement';
    else if (rec.includes('role change')) s.recommendation = 'role_change';
    else if (rec.includes('improvement')) s.recommendation = 'continue_improvement';
    else if (rec.includes('meets')) s.recommendation = 'continue_meets';
    else if (rec.includes('strong')) s.recommendation = 'continue_strong';
  }
  if (!s.recommendation) {
    const m = text.match(/recommendation.*?([x✓✔☑])\s*(continue strong|continue meets|improvement|replacement|role change)/is);
    if (m) {
      const v = m[2].toLowerCase();
      if (v.includes('replacement')) s.recommendation = 'replacement';
      else if (v.includes('role change')) s.recommendation = 'role_change';
      else if (v.includes('improvement')) s.recommendation = 'continue_improvement';
      else if (v.includes('meets')) s.recommendation = 'continue_meets';
      else if (v.includes('strong')) s.recommendation = 'continue_strong';
    }
  }

  // ---- Period ----
  const pr = text.match(/(?:review period|period)[:\s]*([^\n]+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[^\n]+)/i);
  if (pr) s.period = pr[1].trim();

  // ---- Header Metadata Fields ----
  // Helper to clean up extracted values (remove underscores and extra whitespace)
  const cleanValue = (val) => {
    if (!val) return '';
    return val.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  };

  // Resource Name: extract text after label (handle underscores)
  const rn = text.match(/resource\s*name[:\s]+([a-z0-9_]+)/i);
  if (rn) s.resource_name = cleanValue(rn[1]);

  // Resource ID: extract alphanumeric ID
  const rid = text.match(/resource\s*id[:\s]+([a-z0-9_]+)/i);
  if (rid) s.resource_id_string = cleanValue(rid[1]);

  // Role / Team: extract text after label (before "Client Reporting" or similar)
  const rt = text.match(/role[\s\/]*team[:\s]+([a-z0-9_]+)/i);
  if (rt) s.role_team = cleanValue(rt[1]);

  // Manager: extract name after label
  const mgr = text.match(/manager[:\s]+([a-z]+)/i);
  if (mgr) s.manager_name = cleanValue(mgr[1]);

  // Prepared By: extract name after label
  const pb = text.match(/prepared\s*by[:\s]+([a-z0-9_]+)/i);
  if (pb) s.prepared_by = cleanValue(pb[1]);

  // Prepared On: extract date after label
  const po = text.match(/prepared\s*on[:\s]+([a-z0-9\s\-,\.]+)/i);
  if (po) s.prepared_on = cleanValue(po[1]);

  // ---- Areas of Improvement ----
  // Look for the text box content, not the checkbox labels
  const ai = text.match(/areas?\s*of\s*improvement[^:]*:\s*\n?\s*([a-z0-9_]+)/i);
  if (ai && !s.areas_of_improvement) s.areas_of_improvement = cleanValue(ai[1]);

  // ---- Support Needed ----
  const sn = text.match(/support\s*needed[^:]*:\s*\n?\s*([a-z0-9_]+)/i);
  if (sn) s.support_needed = cleanValue(sn[1]);

  // ---- Recommendation ----
  // Check for X mark before recommendation options
  const recMatch = text.match(/[x✓✔☑]\s*(continue\s*strong|continue\s*meets|improvement\s*plan)/i);
  if (recMatch) {
    const v = recMatch[1].toLowerCase();
    if (v.includes('strong')) s.recommendation = 'continue_strong';
    else if (v.includes('meets')) s.recommendation = 'continue_meets';
    else if (v.includes('improvement')) s.recommendation = 'continue_improvement';
  }

  return s;
}

module.exports = { parseOCRText };
