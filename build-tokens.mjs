#!/usr/bin/env node

import StyleDictionary from "style-dictionary";

try {
	const sd = new StyleDictionary("styledictionary.config.js");
	await sd.buildAllPlatforms();
	console.log("✓ Tokens generated successfully");
} catch (err) {
	console.error("✗ Token generation failed:", err.message);
	process.exit(1);
}
