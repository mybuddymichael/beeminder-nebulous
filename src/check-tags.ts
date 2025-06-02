import { parse_yaml_frontmatter } from './parse-yaml'

export async function has_tag(
	file_path: string,
	tag: string,
): Promise<boolean> {
	try {
		const content = await Bun.file(file_path).text()
		const parsed = parse_yaml_frontmatter(content)

		if (parsed.frontmatter?.tags && Array.isArray(parsed.frontmatter.tags)) {
			return parsed.frontmatter.tags.includes(tag)
		}

		return false
	} catch (error) {
		console.error(`Error reading file ${file_path}:`, error)
		return false
	}
}
