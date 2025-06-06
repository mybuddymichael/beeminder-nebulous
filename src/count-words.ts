import { parse_yaml_frontmatter } from './parse-yaml.js'
import { strip_markdown } from './strip-markdown.js'

export async function count_words(file_path: string): Promise<number> {
	try {
		const content = await Bun.file(file_path).text()
		const parsed = parse_yaml_frontmatter(content)
		const stripped_content = strip_markdown(parsed.content)
		const words = stripped_content
			.split(/\s+/)
			.filter((word) => word.trim().length > 0)
		return words.length
	} catch (error) {
		console.error(`Error counting words in ${file_path}:`, error)
		return 0
	}
}
