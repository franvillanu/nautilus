import * as esbuild from 'esbuild';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const isProd = process.argv.includes('--prod');
const isWatch = process.argv.includes('--watch');

// Ensure dist directory exists
if (!existsSync('dist')) {
    mkdirSync('dist');
}

// Build JS bundle
const jsResult = await esbuild.build({
    entryPoints: ['src/main.js'],
    bundle: true,
    outfile: 'dist/app.bundle.js',
    format: 'esm',
    minify: isProd,
    sourcemap: !isProd,
    metafile: true,
    logLevel: 'info',
});

// Build CSS bundle (just copies and optionally minifies)
const cssResult = await esbuild.build({
    entryPoints: ['style.css'],
    outfile: 'dist/style.bundle.css',
    minify: isProd,
    logLevel: 'info',
});

// Generate content hashes for cache busting
function getFileHash(filepath) {
    const content = readFileSync(filepath);
    return createHash('sha256').update(content).digest('hex').substring(0, 8);
}

const jsHash = getFileHash('dist/app.bundle.js');
const cssHash = getFileHash('dist/style.bundle.css');

// Update index.html with hashed bundle references
let indexHtml = readFileSync('index.html', 'utf-8');

// Remove all modulepreload links (no longer needed with bundle)
indexHtml = indexHtml.replace(/<link rel="modulepreload"[^>]*>\n?/g, '');

// Update script and style references (handles both initial build and rebuilds)
// Match script tag - more flexible pattern to catch all variations
indexHtml = indexHtml.replace(
    /<script type="module" src="(?:src\/main\.js|dist\/app\.bundle\.js)(?:\?v=[^"]+)?"><\/script>/g,
    `<script type="module" src="dist/app.bundle.js?v=${jsHash}"></script>`
);

// Match link tag - more flexible pattern to catch all variations
indexHtml = indexHtml.replace(
    /<link rel="stylesheet" href="(?:style\.css|dist\/style\.bundle\.css)(?:\?v=[^"]+)?">/g,
    `<link rel="stylesheet" href="dist/style.bundle.css?v=${cssHash}">`
);

writeFileSync('index.html', indexHtml);

console.log(`\n✅ Build complete!`);
console.log(`   JS:  dist/app.bundle.js?v=${jsHash}`);
console.log(`   CSS: dist/style.bundle.css?v=${cssHash}`);

if (isWatch) {
    console.log('\n👀 Watching for changes...');
    
    // Watch JS bundle
    const jsCtx = await esbuild.context({
        entryPoints: ['src/main.js'],
        bundle: true,
        outfile: 'dist/app.bundle.js',
        format: 'esm',
        sourcemap: true,
        logLevel: 'info',
    });
    
    // Watch CSS bundle
    const cssCtx = await esbuild.context({
        entryPoints: ['style.css'],
        outfile: 'dist/style.bundle.css',
        logLevel: 'info',
    });
    
    await Promise.all([jsCtx.watch(), cssCtx.watch()]);
}
