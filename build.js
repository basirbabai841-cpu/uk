// Builds ./dist: copies the pages, then fetches fonts, poster and videos.
// Runs on Vercel / Netlify automatically (npm run build). Asset failures warn, never break the deploy.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const root = __dirname, dist = path.join(root, 'dist'), A = path.join(dist, 'assets');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stratum-'));
const warn = (m) => console.warn('[warn] ' + m);

fs.rmSync(dist, { recursive: true, force: true });
['fonts', 'img', 'video'].forEach((d) => fs.mkdirSync(path.join(A, d), { recursive: true }));

// 1. pages
fs.readdirSync(root).filter((f) => f.endsWith('.html')).forEach((f) =>
  fs.copyFileSync(path.join(root, f), path.join(dist, f)));
console.log('pages copied');

// 2. fonts (Latin woff2 from @fontsource, renamed to the names index.html expects)
const fonts = [
  ['@fontsource/inter/files/inter-latin-400-normal.woff2', 'inter-s-400.woff2'],
  ['@fontsource/inter/files/inter-latin-700-normal.woff2', 'inter-s-700.woff2'],
  ['@fontsource/chakra-petch/files/chakra-petch-latin-700-normal.woff2', 'chakra-s-700.woff2'],
];
fonts.forEach(([src, name]) => {
  try { fs.copyFileSync(path.join(root, 'node_modules', src), path.join(A, 'fonts', name)); }
  catch (e) { warn('font ' + name + ': ' + e.message); }
});
console.log('fonts done');

async function download(url, file) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' -> HTTP ' + r.status);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}

const B = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/';
const PNG = 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/b5f79c5a-2ebd-41ef-865e-24c660ac98bd.png';
// [local name, source file, mode]  pp = ping-pong, plain = re-encode only
const videos = [
  ['background', 'hf_20260928_024808_abbfad57-4496-4906-9abc-49f0d153d287', 'vision'],
  ['expression', 'hf_20260928_025948_2befd859-101e-49a4-8cb0-cdbb28cb11a7', 'pp'],
  ['craftsmanship', 'hf_20260928_071544_17524fe8-2f07-4fbc-8a55-47518532df6f', 'plain'],
  ['refinement', 'hf_20260928_025948_9fe460cc-21c2-476c-8e61-6bf57c2d6775', 'pp'],
  ['balance', 'hf_20260928_072855_ba37e93c-1119-4b93-a3cd-6b29ced17dc2', 'pp'],
  ['origin', 'hf_20260928_031433_64aea4c7-c53b-4e13-a1fc-bd73673b4fa5', 'plain'],
];
const PP = '[0:v]split[a][b];[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1,fps=24';

(async () => {
  try {
    const png = path.join(tmp, 'bg.png');
    await download(PNG, png);
    await require('sharp')(png).webp({ quality: 90 }).toFile(path.join(A, 'img', 'background.webp'));
    console.log('poster done');
  } catch (e) { warn('poster: ' + e.message); }

  let ffmpeg = null;
  try { ffmpeg = require('ffmpeg-static'); } catch (e) { warn('ffmpeg-static missing'); }

  for (const [name, id, mode] of videos) {
    if (!ffmpeg) break;
    try {
      const src = path.join(tmp, name + '.mp4');
      await download(B + id + '.mp4', src);
      const out = path.join(A, 'video', name + '.mp4');
      const filt = mode === 'pp' ? ['-filter_complex', PP] : mode === 'plain' ? ['-vf', 'fps=24'] : [];
      const crf = mode === 'vision' ? '20' : '23';
      const r = cp.spawnSync(ffmpeg, ['-v', 'error', '-y', '-i', src, ...filt, '-an', '-c:v', 'libx264',
        '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'inherit' });
      if (r.status !== 0) throw new Error('ffmpeg exit ' + r.status);
      console.log('video done: ' + name);
    } catch (e) { warn('video ' + name + ': ' + e.message); }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('build complete -> dist/');
})();
