#!/usr/bin/env node

import { transform } from "lightningcss";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const cssDir = process.env.npm_package_config_cssDir || "./css";
const isWatch = process.argv.includes("--watch");
const isMinify = process.env.NODE_ENV === "production";

// Targets for modern browsers (LightningCSS handles transformation automatically)
const targets = {
	chrome: 90 << 16,
	firefox: 88 << 16,
	safari: 14 << 16,
	edge: 90 << 16,
};

// Recursively resolve @import statements
function resolveImports(file, processed = new Set()) {
	if (processed.has(file)) return "";
	processed.add(file);

	let content = readFileSync(file, "utf-8");

	// Replace @import with file contents
	content = content.replace(/@import\s+['"](.+?)['"]\s+layer\((\w+)\);?/g, (match, importPath) => {
		const resolvedPath = importPath.startsWith("./")
			? `${cssDir}/${importPath.slice(2)}`
			: importPath;
		try {
			return resolveImports(resolvedPath, processed);
		} catch {
			return match; // Keep original if file not found
		}
	});

	return content;
}

async function build() {
	try {
		let input = resolveImports(`${cssDir}/main.css`);

		const result = transform({
			code: Buffer.from(input),
			filename: `${cssDir}/main.css`,
			minify: isMinify,
			sourceMap: !isMinify,
			targets,
		});

		// Ensure dist directory exists
		mkdirSync("dist/css", { recursive: true });

		// Write CSS
		writeFileSync("dist/css/main.css", result.code.toString());

		// Write source map if available
		if (result.map && !isMinify) {
			writeFileSync("dist/css/main.css.map", result.map.toString());
		}

		// Copy tokens to dist
		mkdirSync("dist/tokens", { recursive: true });
		const primitiveTokens = readFileSync("tokens/primitive.tokens.json", "utf-8");
		const semanticTokens = readFileSync("tokens/semantic.tokens.json", "utf-8");
		writeFileSync("dist/tokens/primitive.tokens.json", primitiveTokens);
		writeFileSync("dist/tokens/semantic.tokens.json", semanticTokens);

		console.log(
			`✓ CSS built${isMinify ? " (minified)" : " (dev)"} → dist/css/main.css${result.map ? " + source map" : ""}`,
		);
	} catch (err) {
		console.error("✗ Build failed:", err.message);
		process.exit(1);
	}
}

if (isWatch) {
	console.log("watching css/...");
	// Simple watch (not using chokidar for zero dependencies)
	const watcher = { reload: () => build() };
	// In production, use proper watcher; for now, rebuild on demand
} else {
	await build();
}
