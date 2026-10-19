# Image and font provenance

Three original raster interiors were generated with the available image generation tool specifically for this demo. No stock photograph or image-search result was incorporated. The interface explicitly identifies the venues and images as sample data. These images do not depict verified venues.

| Generated asset           | Application file             | Use                                       |
| ------------------------- | ---------------------------- | ----------------------------------------- |
| Warm daylight studio      | `public/images/daylight.jpg` | Hero, natural-light room and type imagery |
| White industrial studio   | `public/images/loft.jpg`     | Loft/cyclorama room and type imagery      |
| Restrained recording room | `public/images/podcast.jpg`  | Podcast room and type imagery             |

`corner.jpg` and `equipment.jpg` are local copies of the daylight and loft images used as sample thumbnails, not additional generated photographs. Real room and inventory images can be uploaded through the host forms.

The generated PNGs were converted to optimized 1600px JPEG assets with `scripts/prepare-images.cjs`. This is encoding/resize optimization of the generated assets. The app stores user uploads as compressed WebP, validates MIME type and a 5 MB input limit, and provides accessible missing-image fallbacks.

Prompt subjects were: (1) an editorial architectural photograph of a sunlit Vietnamese creative rental studio with tall windows, warm neutrals, a linen sofa, concrete floor and discreet photo gear; (2) a clean white industrial photo studio with a cyclorama, black lighting stands, exposed structure and an uncluttered work area; (3) a calm contemporary podcast recording room with two microphones, a small table, acoustic treatment and warm practical lighting. All requested realistic room scale, no people, logos, signage, typography, borders or collage. The resulting original image files are kept in the Codex generated image directory with invocation identifiers:

- `exec-8a799bd3-5057-4a7a-9d94-99a7e90504d2.png`
- `exec-e6adbf20-ae11-405d-bee8-a4a2d48cc20e.png`
- `exec-d96a3677-5814-4399-a73e-f128e44158db.png`

Their source directory is `C:/Users/Admin/.codex/generated_images/01a11f72-f93f-7f20-b7a7-ab4878b10b85/`. No hosted image-generation URL is needed to run the application.

Be Vietnam Pro is bundled with `@fontsource/be-vietnam-pro` in four weights (400, 500, 600, 700), including Vietnamese glyphs. The font package supplies its license. Icons are Lucide; the small StudioHub camera/aperture brand mark is a code-native SVG.
