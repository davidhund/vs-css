import StyleDictionary from "style-dictionary";

const PREFIX = "vs";
const cssDir = process.env.npm_package_config_cssDir || "./css";

// Custom format for CSS variables with light-dark() support
StyleDictionary.registerFormat({
	name: "css-light-dark",
	format: async ({ dictionary, options }) => {
		const tokens = dictionary.allTokens;
		const colorTokens = tokens.filter(
			(t) => t.$type === "color" && t.$extensions?.vs?.light && t.$extensions.vs.dark
		);
		const otherTokens = tokens.filter((t) => !(t.$type === "color" && t.$extensions?.vs?.light));

		const prefix = options.prefix ? `${options.prefix}-` : "";

		let output = `:root {\n\tcolor-scheme: light dark;\n`;

		// Generate color tokens with light-dark() values
		for (const token of colorTokens) {
			const lightValue = token.$extensions.vs.light;
			const darkValue = token.$extensions.vs.dark;
			const path = token.path.join("-");
			const varName = `--${prefix}${path}`;

			// Resolve references in light and dark values
			const resolvedLight = resolveReference(lightValue, tokens, prefix);
			const resolvedDark = resolveReference(darkValue, tokens, prefix);

			output += `\t${varName}: light-dark(${resolvedLight}, ${resolvedDark});\n`;
		}

		// Generate non-color tokens inside :root
		for (const token of otherTokens) {
			const path = token.path.join("-");
			const varName = `--${prefix}${path}`;
			let value = token.$value;

			// Resolve references
			if (typeof value === "string" && value.includes("{")) {
				value = resolveReference(value, tokens, prefix);
			}

			output += `\t${varName}: ${value};\n`;
		}

		output += `}\n`;

		return output;
	},
});

function resolveReference(value, tokens, prefix) {
	const refMatch = value.match(/\{([\w.]+)\}/);
	if (!refMatch) return value;

	const refPath = refMatch[1].split(".");
	const refToken = tokens.find((t) => JSON.stringify(t.path) === JSON.stringify(refPath));

	if (refToken) {
		const varName = `var(--${prefix}${refToken.path.join("-")})`;
		return value.replace(/\{[\w.]+\}/, varName);
	}

	return value;
}

export default {
	source: ["tokens/**/*.tokens.json"],
	include: ["tokens/**/*.tokens.json"],
	platforms: {
		css: {
			transformGroup: "css",
			buildPath: `${cssDir}/tokens/`,
			files: [
				{
					destination: "primitive.css",
					format: "css-light-dark",
					filter: (token) => {
						// Include only tokens from primitive.tokens.json
						return token.filePath?.includes("primitive.tokens.json");
					},
					options: {
						prefix: PREFIX,
					},
				},
				{
					destination: "semantic.css",
					format: "css-light-dark",
					filter: (token) => {
						// Include only tokens from semantic.tokens.json
						return token.filePath?.includes("semantic.tokens.json");
					},
					options: {
						prefix: PREFIX,
					},
				},
				{
					destination: "theme-warm.css",
					format: "css-light-dark",
					filter: (token) => {
						// Include only tokens from theme-warm.tokens.json
						return token.filePath?.includes("theme-warm.tokens.json");
					},
					options: {
						prefix: PREFIX,
					},
				},
			],
		},
	},
};
