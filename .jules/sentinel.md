## 2026-03-30 - SVG Stored XSS via Asset Uploads
**Vulnerability:** Uploading SVG images containing embedded `<script>` tags or event handlers (`onload=`, `onerror=`) permitted execution of arbitrary JavaScript when the SVG asset URL was rendered in browser context or media picker previews.
**Learning:** Checking extension and MIME type alone (`image/svg+xml`) is insufficient for vector formats like SVG because valid SVGs can legally encapsulate script elements and event handler attributes that browsers execute.
**Prevention:** Always inspect the raw file content of uploaded SVG files for active content patterns such as `<script`, `javascript:`, and `on\w+=` event handlers before storing them on disk.
