# SagarBhumkar-Portfolio

Static portfolio. Preview locally with `python -m http.server 8000`, then open
`http://localhost:8000`.

- Project artwork and the portrait load from the local `images` directory.
- The palette icon opens seven color themes on desktop and mobile. The selection
  is saved in browser storage when available; Escape closes the picker.
- Sections and skill bars animate as they enter the viewport. Reduced-motion
  preferences disable these effects; content remains visible without JavaScript.
- Google Fonts and Font Awesome require an internet connection.
- The CSS 3D hero includes layered portrait artwork, orbital rings, and floating
  technology cards. All main sections have decorative 3D cubes, rings, and grid
  floors. About, skills, experience, projects, and contact panels respond to mouse
  movement with tilt and a soft light reflection.
- Scrolling moves the decorative scene and technology ribbon, fills the top
  progress bar, and updates the desktop chapter compass. Reduced motion keeps the
  scene static. These effects use local CSS/JavaScript with no WebGL dependency.
- Panels and section sculptures change perspective with scrolling across the
  page. Mobile uses gentler scroll depth and no touch tilt. Focused panels stay
  flat so links and form fields remain easy to use. Reduced motion disables all
  scroll/interactive transforms while preserving the static layered styling.
- With JavaScript enabled, the portfolio runs as six full-screen chapters.
  Scroll inside a chapter to read all content; scroll again at its boundary to
  rotate and blend into the next/previous chapter. Touch swipes at a boundary,
  arrow/Page Up/Page Down keys, section dots, navigation links, and Previous/Next
  controls also navigate. Previous scrolling enters at the end of the prior
  chapter. Links preserve section hashes and browser Back/Forward navigation.
- Inactive chapters are inert and hidden from assistive technology. Reduced
  motion switches chapters instantly. Without JavaScript the original
  continuous document remains readable.