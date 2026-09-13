import { build, context } from "esbuild";
import { copyFile, mkdir, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";

const watch = process.argv.includes("--watch");
const serve = process.argv.includes("--serve");
const outdir = "dist";

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

const options = {
  entryPoints: ["src/main.tsx"],
  bundle: true,
  outdir,
  entryNames: "heylisten",
  format: "esm",
  target: ["es2020"],
  external: ["/images/*"],
  jsx: "automatic",
  minify: !watch,
  sourcemap: watch,
  logLevel: "info",
};

async function copyStatics() {
  for (const f of ["index.html", "favicon.svg", "og.svg", "robots.txt", "sitemap.xml"]) {
    if (existsSync(`public/${f}`)) await copyFile(`public/${f}`, `${outdir}/${f}`);
  }
  await mkdir(`${outdir}/images`, { recursive: true });
  await copyFile(
     "images/background-1080.webp",
     `${outdir}/images/background.webp`,
  );
  await copyFile("images/logo.webp", `${outdir}/images/logo.webp`);
  await copyFile("images/rupia.webp", `${outdir}/images/rupia.webp`);
  await mkdir(`${outdir}/music`, { recursive: true });
  await copyFile(
    "music/Title Theme  The Legend of Zelda_ Ocarina of Time (Nintendo Switch 2).mp3",
    `${outdir}/music/theme.mp3`,
  );
  await copyFile("music/vuelo1navi.mp3", `${outdir}/music/navi-movement-1.mp3`);
  await copyFile("music/vuelo2navi.mp3", `${outdir}/music/navi-movement-2.mp3`);
  await mkdir(`${outdir}/assets`, { recursive: true }).catch(() => {});
}

if (watch) {
  await copyStatics();
  const ctx = await context(options);
  await ctx.watch();
  if (serve) {
    const port = Number(process.env.PORT || 5173);
    const server = createServer(async (req, res) => {
      let url = req.url === "/" ? "/index.html" : req.url.split("?")[0];
      const file = join(outdir, url);
      if (!existsSync(file) || !file.startsWith(outdir)) {
        const fallback = join(outdir, "index.html");
        const html = await readFile(fallback);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
        return;
      }
      const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".webp": "image/webp", ".mp3": "audio/mpeg", ".json": "application/json" };
      res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
      const buf = await readFile(file);
      res.end(buf);
    });
    server.listen(port, () => console.log(`http://localhost:${port}`));
  }
} else {
  await build(options);
  await copyStatics();
}
