# Hush Diagram Assets

Status: Proposed  
Last updated: 2026-08-17

Every diagram is stored as a pair:

- `.excalidraw` is the editable source.
- `.svg` is the rendered image embedded in Markdown.

The architecture, security, and design directories match the document that owns each diagram. Keep both files together and use the same base name.

## Update a diagram

1. Open the `.excalidraw` source in Excalidraw or a compatible editor.
2. Preserve the diagram title, scope, and evidence status from the owning document.
3. Export the updated diagram as SVG over the paired `.svg` file.
4. Confirm the Markdown image and source links resolve from the owning document.
5. Check that the SVG contains no scripts, external resources, secrets, or unverified production details.

Do not edit only the SVG. Contributors must be able to reproduce the rendered image from the editable source.
