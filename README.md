# 🎨 Color Palette Extractor

A fast, modern web tool that extracts clean, designer-friendly color palettes from any image. Built with React, Tailwind, and ColorThief for high visual accuracy and smooth UX.

> Upload or drag an image and instantly generate a curated palette you can actually trust.

---

## ✨ Features

* 🎯 **Accurate color extraction** using median-cut (ColorThief)
* 🧠 **Perceptual ranking** so important colors surface first
* 🧹 **Near-duplicate removal** to avoid muddy palettes
* ⚡ **Idle-time processing** for smooth performance
* 🎛 **Adjustable palette size** (3–10 colors)
* 🖱 **Drag & drop upload zone**
* 📋 **Click to copy hex values** with visual feedback
* 🌌 **Modern glass UI** with subtle motion and depth
* ♻️ **Memory-safe object URL handling**

---

## 🖼 Preview

*Add your screenshot here*

```
/docs/preview.png
```

---

## 🧱 Tech Stack

**Frontend**

* React (Vite)
* Tailwind CSS
* shadcn/ui
* Lucide Icons

**Color Engine**

* ColorThief (median cut quantization)
* Custom perceptual scoring
* RGB distance deduplication

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/color-palette-extractor.git
cd color-palette-extractor
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the dev server

```bash
npm run dev
```

Open:

```
http://localhost:5173
```

---

## 🧠 How It Works

Pipeline:

```
Image → ColorThief → Oversample → Deduplicate → Perceptual Sort → Display
```

### Why this matters

Most palette tools fail because they:

* overcount dark backgrounds
* return near-duplicate colors
* sort purely by frequency

This project fixes that by:

* clustering similar colors
* removing visually redundant tones
* ranking by brightness + saturation

Result: palettes that feel **human-correct**, not just mathematically correct.

---

## 🎯 Design Philosophy

This tool optimizes for:

* **Designer trust** over raw pixel math
* **Visual clarity** over maximum color count
* **Speed** without blocking the main thread
* **Modern SaaS feel** instead of generic UI kits

If a palette looks technically correct but visually wrong — it’s wrong.

---

## 📁 Project Structure

```
src/
  components/
    ui/            # shadcn components
  ColorPaletteExtractor.jsx
  App.jsx
```

---

## ⚙️ Key Implementation Details

### Idle extraction

Uses `requestIdleCallback` when available to prevent UI jank.

### Debounced slider

Prevents excessive recomputation while adjusting palette size.

### Anti-flicker drag handling

Uses a drag counter to avoid dropzone flicker — a subtle but important UX polish.

### Memory safety

Object URLs are properly revoked to prevent leaks during heavy usage.

---

## 🗺 Roadmap

* [ ] Copy-all colors
* [ ] Export palette (CSS / JSON / ASE)
* [ ] Lock colors
* [ ] Shareable palette links
* [ ] LAB color space upgrade
* [ ] Palette naming AI

---

## 🤝 Contributing

PRs welcome. If you’re improving:

* extraction accuracy
* perceptual ranking
* performance
* or UX polish

…you’re working in the right places.

---

## 📜 License

MIT — use it, ship it, improve it.

---

## 🧩 Final Note

Color extraction is easy.

**Trustworthy palettes are not.**

This project focuses on the subtle post-processing that makes designers actually rely on the output instead of double-checking it elsewhere.
