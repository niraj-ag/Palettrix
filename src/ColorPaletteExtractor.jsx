import logo from "@/assets/color-circle.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import clsx from "clsx";
import ColorThief from "colorthief";
import { Check, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const colorThief = new ColorThief();

export default function ColorPaletteExtractor() {
  const [imageSrc, setImageSrc] = useState(null);
  const [colors, setColors] = useState([]);
  const [numColors, setNumColors] = useState(6);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [colorFormat, setColorFormat] = useState("hex");

  const [basePalette, setBasePalette] = useState([]);
  const lockedRef = useRef(new Set());

  const objectUrlRef = useRef(null);
  const dragCounter = useRef(0);
  const extractTimeout = useRef(null);

  // ---------- SAFE OBJECT URL ----------
  const setSafeImage = (file) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImageSrc(url);
    return url;
  };

  // ---------- EXTRACTION ----------
  const extractColors = useCallback((img, count) => {
  setIsLoading(true);

  const run = () => {
    try {
      // STEP 1 — always oversample to fixed size
      const RAW_SIZE = 24;

      const palette = colorThief.getPalette(img, RAW_SIZE);

      let hexColors = palette.map(([r, g, b]) =>
        rgbToHex(r, g, b)
      );

      hexColors = removeNearDuplicates(hexColors, 45);
      hexColors = sortByPerceptualWeight(hexColors);

      // ⭐ smart default only on first load
      setBasePalette(hexColors);

      setNumColors(prev =>
        imageSrc ? prev : getSmartColorCount(hexColors)
      );

      const visible = buildVisiblePalette(hexColors, count);
      setColors(visible);
    } catch (err) {
      console.error("Extraction failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run);
  } else {
    setTimeout(run, 0);
  }
}, []);

  // ---------- FILE PROCESS ----------
  const processFile = useCallback(
    (file) => {
      if (!file) return;

      const url = setSafeImage(file);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => extractColors(img, numColors);
    },
    [numColors, extractColors]
  );

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  // ---------- DRAG (ANTI-FLICKER) ----------
  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  // ---------- SLIDER DEBOUNCE ----------
  useEffect(() => {
    if (!imageSrc) return;

    clearTimeout(extractTimeout.current);

    extractTimeout.current = setTimeout(() => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageSrc;
      img.onload = () => extractColors(img, numColors);
    }, 220);

    return () => clearTimeout(extractTimeout.current);
  }, [numColors, imageSrc, extractColors]);

  // ---------- HELPERS ----------
  const rgbToHex = (r, g, b) =>
    "#" +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

  const hexToRgb = (hex) => {
    const bigint = parseInt(hex.slice(1), 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  };

  const colorDistance = (c1, c2) => {
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  const removeNearDuplicates = (hexColors, threshold = 55) => {
    const filtered = [];

    for (const hex of hexColors) {
      const rgb = hexToRgb(hex);

      const tooClose = filtered.some((existing) => {
        const existingRgb = hexToRgb(existing);
        return colorDistance(rgb, existingRgb) < threshold;
      });

      if (!tooClose) filtered.push(hex);
    }

    return filtered;
  };

  const getPerceptualScore = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    const brightness = (r + g + b) / 3;
    const saturation = max === 0 ? 0 : (max - min) / max;

    return brightness * 0.45 + saturation * 255 * 0.55;
  };

  const sortByPerceptualWeight = (hexColors) =>
    [...hexColors].sort(
      (a, b) => getPerceptualScore(b) - getPerceptualScore(a)
    );

  const copyColor = async (color) => {
    try {
      await navigator.clipboard.writeText(formatColor(color));;
      setCopied(color);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      console.warn("Clipboard failed");
    }
  };
  const buildVisiblePalette = (base, count) => {
  const locked = Array.from(lockedRef.current);

  const remaining = base.filter(c => !locked.includes(c));

  return [...locked, ...remaining].slice(0, count);
  };

  const toggleLock = (color) => {
  const set = lockedRef.current;

  if (set.has(color)) set.delete(color);
  else set.add(color);

  setColors(prev => [...prev]);
  };

  const copyAll = async () => {
  if (!colors.length) return;
  await navigator.clipboard.writeText(colors.join(", "));
};
const exportPalette = () => {
  const data = {
    name: "Palettrix Palette",
    colors,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "palettrix-palette.json";
  a.click();
  URL.revokeObjectURL(url);
};

const sharePalette = async () => {
  if (!colors.length) return;

  const encoded = encodeURIComponent(
    btoa(JSON.stringify(colors))
  );

  const url = `${window.location.href.split("?")[0]}?palette=${encoded}`;

  await navigator.clipboard.writeText(url);
};
const getSmartColorCount = (palette) => {
  // count distinct hues roughly
  const unique = palette.length;

  if (unique <= 6) return 5;
  if (unique <= 12) return 6;
  if (unique <= 18) return 7;
  return 8;
};
const reExtract = () => {
  if (!imageSrc) return;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imageSrc;
  img.onload = () => extractColors(img, numColors);
};

const paletteGradient = colors.length
  ? `linear-gradient(to right, ${colors.join(",")})`
  : "none";
  
  // ---------- CLEANUP ----------
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  // ---------- URL hydration ---------
  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("palette");

  if (!encoded) return;

  try {
    const decoded = JSON.parse(atob(decodeURIComponent(encoded)));

    if (Array.isArray(decoded)) {
      setColors(decoded);
      setBasePalette(decoded); // important for stability
    }
  } catch (err) {
    console.warn("Invalid palette in URL");
  }
}, []);
  // ---------- Converters ---------
  const formatColor = (hex) => {
  if (colorFormat === "hex") return hex;

  const { r, g, b } = hexToRgb(hex);

  if (colorFormat === "rgb") {
    return `rgb(${r}, ${g}, ${b})`;
  }

  if (colorFormat === "hsl") {
    const rN = r / 255;
    const gN = g / 255;
    const bN = b / 255;

    const max = Math.max(rN, gN, bN);
    const min = Math.min(rN, gN, bN);
    let h, s, l;

    l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case rN:
          h = (gN - bN) / d + (gN < bN ? 6 : 0);
          break;
        case gN:
          h = (bN - rN) / d + 2;
          break;
        default:
          h = (rN - gN) / d + 4;
      }
      h /= 6;
    }

    return `hsl(${Math.round(h * 360)}, ${Math.round(
      s * 100
    )}%, ${Math.round(l * 100)}%)`;
  }

  return hex;
};


  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-[#07070a] relative overflow-hidden text-white px-6 py-12">
      {/* glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-purple-600/20 blur-[140px] rounded-full" />
      <div className="pointer-events-none absolute top-1/2 -left-40 w-[500px] h-[500px] bg-blue-600/10 blur-[140px] rounded-full" />

      <div className="relative z-10 max-w-6xl mx-auto space-y-10">
        {/* header */}
        <div className="text-center space-y-4">
        {/* Logo + Brand */}
        <div className="flex flex-col items-center gap-2">
          <img
            src={logo}
            alt="Palettrix logo"
            className="h-14 w-14 md:h-16 md:w-16"
          />
          <span className="text-lg md:text-xl font-semibold tracking-tight">
            Palettrix
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Generate Color Palettes Designers Actually Trust
        </h1>

        {/* Subtext */}
        <p className="text-white/60 text-sm md:text-base max-w-xl mx-auto">
          Upload or drag an image to instantly extract clean, perceptually-ranked colors.
        </p>
      </div>

        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {/* LEFT */}
          <Card className="h-full flex flex-col bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-[...]">
            <CardHeader>
              <CardTitle>Image</CardTitle>
            </CardHeader>

            <CardContent className="flex flex-col gap-6 flex-1">
              {/* DROPZONE */}
              <label
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={clsx(
                  "block relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer",
                  isDragging
                    ? "border-violet-400 bg-violet-500/10 shadow-[0_0_30px_rgba(139,92,246,0.25)]"
                    : "border-white/15 hover:border-white/30"
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div className="p-6">
                  <Button
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0 shadow-lg pointer-events-none"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </Button>

                  <p className="text-xs text-white/50 text-center mt-3">
                    or drag and drop
                  </p>
                </div>
              </label>

              {/* SLIDER */}
              <div>
                <p className="text-sm mb-3 text-white/70">
                  Number of colors: {numColors}
                </p>
                <Slider
                  min={3}
                  max={10}
                  step={1}
                  value={[numColors]}
                  onValueChange={(v) => setNumColors(v[0])}
                  onValueCommit={() => reExtract()}
                  className="w-full touch-none"
                />
              </div>
              <div className="space-y-3">
              <p className="text-sm text-white/70">Color format</p>

              <div className="flex gap-2">
                {["hex", "rgb", "hsl"].map(fmt => (
                  <Button
                    key={fmt}
                    size="sm"
                    variant={colorFormat === fmt ? "default" : "secondary"}
                    onClick={() => setColorFormat(fmt)}
                    className="uppercase"
                  >
                    {fmt}
                  </Button>
                ))}
              </div>

              <Button
                onClick={reExtract}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600"
              >
                Re-extract Colors
              </Button>
            </div>

              {/* PREVIEW */}
              {imageSrc && (
                <div className="relative mt-auto">
                  <img
                    src={imageSrc}
                    alt="preview"
                    className="w-full rounded-xl border border-white/10"
                  />

                  {isLoading && (
                    <div className="absolute inset-0 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center text-sm animate-pulse">
                      Extracting…
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT */}
          <Card className="h-full flex flex-col bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-[...]">
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle>Palette</CardTitle>

                <div className="flex items-center gap-2 h-8 px-3">
                  <Button size="sm" variant="secondary" onClick={copyAll}>
                    Copy All
                  </Button>
                  <Button size="sm" variant="secondary" onClick={exportPalette}>
                    Export
                  </Button>
                  <Button size="sm" variant="secondary" onClick={sharePalette}>
                    Share Link
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col flex-1 min-h-0">
            {/* BODY */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {!colors.length ? (
                <div className="h-full flex flex-col items-center justify-center text-white/40 text-sm gap-2">
                  <span>Palette will appear here</span>
                  <span className="text-white/25 text-xs">Click colors to copy</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {colors.map((color, i) => (
                    <div
                      key={i}
                      onClick={() => copyColor(color)}
                      onDoubleClick={() => toggleLock(color)}
                      className="rounded-xl p-4 cursor-pointer relative group transition-all duration-200 hover:scale-[1.04] hover:shadow-xl active:scale-[0.98]"
                      style={{ background: color }}
                    >
                      <div className="absolute inset-0 rounded-xl ring-1 ring-black/10 group-hover:ring-white/40 transition" />

                      <div className="text-xs font-mono bg-black/50 backdrop-blur-sm px-2 py-1 rounded w-fit flex items-center gap-1">
                        {copied === color && <Check className="w-3 h-3" />}
                        {formatColor(color)}
                        {lockedRef.current.has(color) && (
                          <span className="text-[10px] ml-1 opacity-80">🔒</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOTTOM */}
            <div className="mt-auto space-y-3 pt-3">
              {colors.length > 0 && (
                <div className="text-center text-[11px] text-white/30">
                  Click a color to copy • Double-click to lock
                </div>
              )}

              {colors.length > 0 && (
                <div className="h-4 rounded-md border border-white/10 overflow-hidden">
                  <div className="h-full w-full" style={{ background: paletteGradient }} />
                </div>
              )}
            </div>
          </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

