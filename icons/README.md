# ASI1 Icons

This directory contains the app icons for PWA installation.

## Required Icon Sizes

The following icon sizes are needed for the PWA to work properly:

- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`

## Creating Icons

You can create these icons in several ways:

### Option 1: Use an Online Generator
1. Visit [RealFaviconGenerator](https://realfavicongenerator.net/)
2. Upload a logo or design (512x512px recommended)
3. Generate and download all icon sizes

### Option 2: Use ImageMagick (if installed)
```bash
# Create a simple placeholder icon
convert -size 512x512 xc:#D4845C -fill white -font Arial -pointsize 200 \
  -gravity center -annotate +0+0 "ASI1" icon-512x512.png

# Resize to other sizes
for size in 72 96 128 144 152 192 384; do
  convert icon-512x512.png -resize ${size}x${size} icon-${size}x${size}.png
done
```

### Option 3: Design Your Own
Design a 512x512px icon with:
- Background color: `#D4845C` (warm coral)
- Text/Logo: White or `#FAF8F5` (cream)
- Simple, recognizable design

Then resize to all required sizes.

## Design Guidelines

- Keep the design simple and recognizable
- Use the app's color scheme (coral `#D4845C`, cream `#FAF8F5`)
- Ensure good contrast for visibility
- Test on both light and dark backgrounds
