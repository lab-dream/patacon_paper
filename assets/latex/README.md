# PATACON LaTeX labels

The mathematical labels in all six HTML animations are authored in LaTeX and
pre-rendered with MathJax 3.2.2 to inline SVG paths. The site does not need an
external CDN, web fonts, a TeX installation, or a server-side build to display
these existing formulas. Animation timing, layer order, playback, enlargement,
and Back-to-page behavior are unchanged.

## Files

- `equations.json`: the editable set of LaTeX expressions used by the diagrams.
- `equations.tex`: the same expressions in a standalone LaTeX document.
- `build-equations.cjs`: optional build tool for changes or additional equations.
- `../js/latex-equations.js`: generated vector equation cache.
- `../js/latex-labels.js`: small SVG placement helper used by the animations.

Every rendered label also carries its original expression in `data-tex`.
Descriptive subscripts such as `near`, `rand`, `root`, and `target` are upright
(`\mathrm{...}`), while mathematical variables and indices remain italic.
`C` and `M` are consistently typeset as `\mathcal{C}` and `\mathcal{M}`.

Existing photographs, raster figures, and MP4 video pixels were not modified.
The separate vector asset `../images/tgs-diagram.svg` also has pre-rendered
LaTeX labels; it is not currently used by the main HTML page.

## Upload

Upload the entire site's contents, including the two new `assets/js/latex-*`
files. The top-level `index.html` and `assets` folder stay in their original
locations. There is no additional installation step for visitors.

## Changing a formula

Add a new expression to `equations.json`, then use the identical expression
in the relevant animation's `latex(...)` call or `data-tex` attribute. The
`math(...)` helper builds LaTeX for common q-variable labels automatically.

To regenerate the browser cache, open a terminal in this directory and run:

```sh
npm install --no-save --package-lock=false mathjax-full@3.2.2
node build-equations.cjs
```

Do not upload `node_modules`; the browser only needs the generated JavaScript
cache and the supplied placement helper. The build also refreshes
`equations.tex`. An unbuilt formula is shown as its source and logs a warning,
rather than stopping the animation. The unused standalone SVG asset stores
its labels inline and is independent of this browser cache.

## Rendering reference

MathJax documentation: https://docs.mathjax.org/en/v3.2/options/output/svg.html
SVG output with `fontCache: 'none'` gives each cached formula self-contained
paths, avoiding shared-ID collisions between independently animated labels.
