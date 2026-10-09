#!/usr/bin/env node
'use strict';
// Optional maintenance step. Normal website use requires neither Node nor MathJax.
// From a temporary build directory: npm install mathjax-full@3.2.2
// Then run this script with mathjax-full available on Node's module search path.
const fs = require('node:fs');
const path = require('node:path');
const {mathjax} = require('mathjax-full/js/mathjax.js');
const {TeX} = require('mathjax-full/js/input/tex.js');
const {SVG} = require('mathjax-full/js/output/svg.js');
const {liteAdaptor} = require('mathjax-full/js/adaptors/liteAdaptor.js');
const {RegisterHTMLHandler} = require('mathjax-full/js/handlers/html.js');
const {AllPackages} = require('mathjax-full/js/input/tex/AllPackages.js');
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const document = mathjax.document('', {
  InputJax: new TeX({packages: AllPackages}),
  OutputJax: new SVG({fontCache: 'none'})
});
const source = JSON.parse(fs.readFileSync(path.join(__dirname, 'equations.json'), 'utf8'));
const entries = {};
for (const tex of source.equations) {
  const container = document.convert(tex, {display: false});
  const svg = adaptor.firstChild(container);
  const markup = adaptor.outerHTML(svg);
  if (markup.includes('data-mml-node="merror"')) throw new Error(`Invalid LaTeX: ${tex}`);
  const viewBox = adaptor.getAttribute(svg, 'viewBox').split(/\s+/).map(Number);
  entries[tex] = {viewBox, body: adaptor.innerHTML(svg)};
}
const result = {generator: 'MathJax 3.2.2 / SVG', entries};
const output = path.join(__dirname, '../js/latex-equations.js');
fs.writeFileSync(output,
  '/* Generated from assets/latex/equations.json by MathJax. Do not edit by hand. */\n' +
  'window.PataconLatexEquations = ' + JSON.stringify(result) + ';\n');
fs.writeFileSync(path.join(__dirname, 'equations.tex'),
  '\\documentclass{article}\n\\usepackage{amsmath,amssymb}\n\\begin{document}\n' +
  source.equations.map(tex => '\\[\n' + tex + '\n\\]\n').join('') + '\\end{document}\n');
console.log(`Rendered ${Object.keys(entries).length} LaTeX formulas to ${output}`);
