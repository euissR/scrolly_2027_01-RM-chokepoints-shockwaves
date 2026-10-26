# Securing the EU's sea lanes (Shockwaves and chokepoints): source bundle

Internal working material. All texts and figures are placeholders. The concept note behind the project is EUISS Sensitive: do not circulate outside the project.

## What is here
- Shockwaves_and_chokepoints_mockup.html: the finished prototype. Open it in any browser; no server or internet needed.
- src/template.html: the page (CSS, markup, script, and the content data blocks near the top of the script). The map geometry is a placeholder, /*__MAP__*/null.
- src/map.json: Equal Earth map geometry (land, borders, graticule, sphere outline, default view), 1000 x 487 units, from Natural Earth 50 m with Antarctica removed.
- src/assemble.mjs: puts map.json into template.html and writes the single-file prototype. Run: node src/assemble.mjs (Node 18 or later, no packages).

## Where things are in template.html
Data blocks, in order: GROUPS (regions and their strategic overviews), SECTIONS (the five guiding-question titles), THEATRES, CHOKEPOINTS, SHOCKWAVES, THEMES. Places use plain latitude and longitude; the script projects them with the same Equal Earth formula as map.json.

## Not included
The script that generated map.json (d3-geo with geoEqualEarth fitted to width 1000) was run once and is not in this bundle. Use map.json as it is, or regenerate it from Natural Earth with any tool that applies the Equal Earth projection to a 1000-unit width; if you change the size or projection, the constants in the proj() function in template.html must change with it.
