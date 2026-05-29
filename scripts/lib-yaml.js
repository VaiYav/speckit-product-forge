// scripts/lib-yaml.js
//
// Minimal, zero-dependency YAML subset parser shared by the Product Forge
// helper scripts (validate-traceability.js, gate-risk.js).
//
// Supports: block maps, block sequences, nesting by indentation, flow
// sequences [a, b], flow maps {k: v}, quoted/bare scalars, # comments,
// null/true/false/int/float. This is intentionally a SUBSET sized for the
// artifacts Product Forge itself produces (.forge-status.yml / traceability.yml
// / journeys.yml), NOT a general YAML engine. It has a self-test in each
// consumer's --selftest.

"use strict";

function stripComment(line) {
  // Remove a # comment that is not inside quotes.
  let inS = false, inD = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === "#" && !inS && !inD) {
      if (i === 0 || /\s/.test(line[i - 1])) return line.slice(0, i);
    }
  }
  return line;
}

function parseScalar(raw) {
  const s = raw.trim();
  if (s === "" || s === "~" || s === "null") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseFlow(raw) {
  const s = raw.trim();
  let i = 0;
  function skipWs() { while (i < s.length && /\s/.test(s[i])) i++; }
  function parseValue() {
    skipWs();
    if (s[i] === "[") return parseSeq();
    if (s[i] === "{") return parseMap();
    if (s[i] === '"' || s[i] === "'") return parseQuoted();
    let start = i;
    while (i < s.length && !",]}".includes(s[i])) i++;
    return parseScalar(s.slice(start, i));
  }
  function parseQuoted() {
    const q = s[i++]; let start = i;
    while (i < s.length && s[i] !== q) i++;
    const v = s.slice(start, i); i++;
    return v;
  }
  function parseSeq() {
    const arr = []; i++; skipWs();
    if (s[i] === "]") { i++; return arr; }
    while (i < s.length) {
      arr.push(parseValue()); skipWs();
      if (s[i] === ",") { i++; continue; }
      if (s[i] === "]") { i++; break; }
      break;
    }
    return arr;
  }
  function parseMap() {
    const obj = {}; i++; skipWs();
    if (s[i] === "}") { i++; return obj; }
    while (i < s.length) {
      skipWs();
      let k;
      if (s[i] === '"' || s[i] === "'") k = parseQuoted();
      else { let start = i; while (i < s.length && s[i] !== ":") i++; k = s.slice(start, i).trim(); }
      skipWs(); if (s[i] === ":") i++;
      const v = parseValue(); obj[String(k)] = v; skipWs();
      if (s[i] === ",") { i++; continue; }
      if (s[i] === "}") { i++; break; }
      break;
    }
    return obj;
  }
  return parseValue();
}

function parseYaml(text) {
  const rawLines = text.split(/\r?\n/);
  const lines = [];
  for (const rl of rawLines) {
    const noComment = stripComment(rl);
    if (noComment.trim() === "" || noComment.trim() === "---") continue;
    const indent = noComment.length - noComment.trimStart().length;
    lines.push({ indent, content: noComment.trimStart(), raw: noComment });
  }
  let idx = 0;

  function parseBlock(minIndent) {
    if (idx >= lines.length) return null;
    const first = lines[idx];
    if (first.indent < minIndent) return null;
    const isSeq = first.content.startsWith("- ") || first.content === "-";
    return isSeq ? parseSeqBlock(first.indent) : parseMapBlock(first.indent);
  }

  function isMapEntry(s) {
    const m = s.match(/^([^:\s][^:]*):(\s|$)/);
    return !!m;
  }

  function parseSeqBlock(indent) {
    const arr = [];
    while (idx < lines.length && lines[idx].indent === indent &&
           (lines[idx].content.startsWith("- ") || lines[idx].content === "-")) {
      const line = lines[idx];
      const after = line.content === "-" ? "" : line.content.slice(2);
      if (after.trim() === "") {
        idx++;
        arr.push(parseBlock(indent + 1));
      } else if (after.includes(":") && !after.trimStart().startsWith("[") && !after.trimStart().startsWith("{") && isMapEntry(after)) {
        const itemIndent = indent + 2;
        lines[idx] = { indent: itemIndent, content: after, raw: line.raw };
        arr.push(parseMapBlock(itemIndent));
      } else if (after.trim().startsWith("[") || after.trim().startsWith("{")) {
        arr.push(parseFlow(after));
        idx++;
      } else {
        arr.push(parseScalar(after));
        idx++;
      }
    }
    return arr;
  }

  function parseMapBlock(indent) {
    const obj = {};
    while (idx < lines.length && lines[idx].indent === indent &&
           !lines[idx].content.startsWith("- ")) {
      const line = lines[idx];
      const m = line.content.match(/^("[^"]*"|'[^']*'|[^:]+?):(.*)$/);
      if (!m) { idx++; continue; }
      const key = parseScalar(m[1]);
      const rest = m[2].trim();
      if (rest === "") {
        idx++;
        const child = parseBlock(indent + 1);
        obj[String(key)] = child === null ? null : child;
      } else if (rest.startsWith("[") || rest.startsWith("{")) {
        obj[String(key)] = parseFlow(rest);
        idx++;
      } else {
        obj[String(key)] = parseScalar(rest);
        idx++;
      }
    }
    return obj;
  }

  return parseBlock(0);
}

module.exports = { parseYaml, parseScalar, parseFlow, stripComment };
