#!/usr/bin/env node

import { readFileSync, writeFileSync, cpSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const __dirname = dirname(fileURLToPath(import.meta.url));

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const question = (query) =>
	new Promise((resolve) => {
		rl.question(query, resolve);
	});

const filesToCopy = [
	"build.mjs",
	"build-tokens.mjs",
	"styledictionary.config.js",
	".stylelintrc.json",
	"biome.json",
];

const foldersToCopy = ["css", "tokens"];

async function setup() {
	console.log("\n📦 vs-css setup\n");

	// Prompt for CSS folder location
	const defaultCssDir = process.env.npm_package_config_cssDir || "./css";
	const cssDir = await question(`CSS folder location (default: ${defaultCssDir}): `);
	const resolvedCssDir = cssDir.trim() || defaultCssDir;

	const projectRoot = process.cwd();
	const sourceRoot = __dirname;

	// Check for existing files
	console.log("\n🔍 Checking for existing files...");
	const filesToCheck = [...filesToCopy, resolvedCssDir];
	const existingFiles = filesToCheck.filter((f) => existsSync(resolve(projectRoot, f)));

	if (existingFiles.length > 0) {
		console.error(
			`\n❌ The following files/folders already exist:\n${existingFiles.map((f) => `  - ${f}`).join("\n")}\n`,
		);
		console.error("Remove them or choose a different CSS folder location.\n");
		rl.close();
		process.exit(1);
	}

	// Copy files
	console.log("\n📋 Copying files...");
	for (const file of filesToCopy) {
		const src = resolve(sourceRoot, file);
		const dest = resolve(projectRoot, file);
		try {
			cpSync(src, dest);
			console.log(`  ✓ ${file}`);
		} catch (err) {
			console.error(`  ✗ Failed to copy ${file}: ${err.message}`);
			rl.close();
			process.exit(1);
		}
	}

	// Copy folders
	console.log("\n📁 Copying folders...");
	for (const folder of foldersToCopy) {
		const src = resolve(sourceRoot, folder);
		const dest = folder === "css" ? resolve(projectRoot, resolvedCssDir) : resolve(projectRoot, folder);
		try {
			cpSync(src, dest, { recursive: true });
			const destPath = folder === "css" ? `${resolvedCssDir}/` : `${folder}/`;
			console.log(`  ✓ ${folder}/ → ${destPath}`);
		} catch (err) {
			console.error(`  ✗ Failed to copy ${folder}: ${err.message}`);
			rl.close();
			process.exit(1);
		}
	}

	// Update package.json
	console.log("\n📝 Updating package.json...");
	const packageJsonPath = resolve(projectRoot, "package.json");
	let packageJson;

	try {
		packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
	} catch (err) {
		console.error(`  ✗ Failed to read package.json: ${err.message}`);
		rl.close();
		process.exit(1);
	}

	// Add config
	if (!packageJson.config) {
		packageJson.config = {};
	}
	packageJson.config.cssDir = resolvedCssDir;

	// Add scripts
	if (!packageJson.scripts) {
		packageJson.scripts = {};
	}

	const scriptUpdates = {
		"css:tokens": "node build-tokens.mjs",
		"css:build": "node build.mjs",
		"css:dev": "node build.mjs --watch",
		"css:lint": `biome lint $npm_package_config_cssDir && stylelint "$npm_package_config_cssDir/**/*.css"`,
		"css:format": "biome format --write $npm_package_config_cssDir *.mjs *.json .stylelintrc.json",
	};

	for (const [key, value] of Object.entries(scriptUpdates)) {
		packageJson.scripts[key] = value;
		console.log(`  ✓ ${key}`);
	}

	// Add devDependencies
	console.log("\n📦 Adding devDependencies...");
	const sourcePackageJsonPath = resolve(sourceRoot, "package.json");
	const sourcePackageJson = JSON.parse(readFileSync(sourcePackageJsonPath, "utf-8"));

	if (!packageJson.devDependencies) {
		packageJson.devDependencies = {};
	}

	for (const [key, value] of Object.entries(sourcePackageJson.devDependencies || {})) {
		packageJson.devDependencies[key] = value;
		console.log(`  ✓ ${key}`);
	}

	try {
		writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, "\t")}\n`);
	} catch (err) {
		console.error(`  ✗ Failed to update package.json: ${err.message}`);
		rl.close();
		process.exit(1);
	}

	// Summary
	console.log("\n✅ Setup complete!\n");
	console.log("Next steps:");
	console.log("  1. npm install (to install added devDependencies)");
	console.log("  2. npm run css:build (to build CSS)");
	console.log("  3. npm run css:tokens (to generate tokens)");
	console.log("\nAvailable commands:");
	console.log("  npm run css:build  - Build CSS");
	console.log("  npm run css:dev    - Watch mode");
	console.log("  npm run css:tokens - Generate token files");
	console.log("  npm run css:lint   - Lint CSS");
	console.log("  npm run css:format - Format CSS\n");

	rl.close();
}

setup().catch((err) => {
	console.error("\n❌ Setup failed:", err.message);
	rl.close();
	process.exit(1);
});
