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
        const palette = colorThief.getPalette(img, count * 2);

        let hexColors = palette.map(([r, g, b]) =>
          rgbToHex(r, g, b)
        );

        hexColors = removeNearDuplicates(hexColors, 55);
        hexColors = sortByPerceptualWeight(hexColors);
        hexColors = hexColors.slice(0, count);

        setColors(hexColors);
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

    return brightness * 0.5 + saturation * 255 * 0.5;
  };

  const sortByPerceptualWeight = (hexColors) =>
    [...hexColors].sort(
      (a, b) => getPerceptualScore(b) - getPerceptualScore(a)
    );

  const copyColor = async (color) => {
    try {
      await navigator.clipboard.writeText(color);
      setCopied(color);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      console.warn("Clipboard failed");
    }
  };

  // ---------- CLEANUP ----------
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-[#07070a] relative overflow-hidden text-white px-6 py-12">
      {/* glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-purple-600/20 blur-[140px] rounded-full" />
      <div className="pointer-events-none absolute top-1/2 -left-40 w-[500px] h-[500px] bg-blue-600/10 blur-[140px] rounded-full" />

      <div className="relative z-10 max-w-6xl mx-auto space-y-10">
        {/* header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Extract Colors from Any Image
          </h1>
          <p className="text-white/60 text-sm">
            Upload or drag an image to generate a clean color palette instantly.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* LEFT */}
          <Card className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
            <CardHeader>
              <CardTitle>Image</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
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
                />
              </div>

              {/* PREVIEW */}
              {imageSrc && (
                <div className="relative">
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
          <Card className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
            <CardHeader>
              <CardTitle>Palette</CardTitle>
            </CardHeader>

            <CardContent>
              {!colors.length && (
                <div className="text-center text-white/40 text-sm py-10">
                  Palette will appear here
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {colors.map((color, i) => (
                  <div
                    key={i}
                    onClick={() => copyColor(color)}
                    className="rounded-xl p-4 cursor-pointer relative group transition-all duration-200 hover:scale-[1.04] hover:shadow-xl active:scale-[0.98]"
                    style={{ background: color }}
                  >
                    <div className="absolute inset-0 rounded-xl ring-1 ring-black/10 group-hover:ring-white/40 transition" />

                    <div className="text-xs font-mono bg-black/50 backdrop-blur-sm px-2 py-1 rounded w-fit flex items-center gap-1">
                      {copied === color && <Check className="w-3 h-3" />}
                      {color}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

