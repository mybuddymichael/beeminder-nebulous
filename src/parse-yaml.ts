export interface ParsedMarkdown {
	frontmatter: Record<string, unknown> | null
	content: string
}

function process_array_item(
	trimmed: string,
	in_array: boolean,
	array_items: string[],
): void {
	if (in_array) {
		array_items.push(trimmed.slice(2).trim())
	}
}

function process_key_value_line(
	trimmed: string,
	current_key: string,
	in_array: boolean,
	array_items: string[],
	parsed: Record<string, unknown>,
): { current_key: string; in_array: boolean } {
	if (in_array && current_key) {
		parsed[current_key] = array_items
		array_items.length = 0
		in_array = false
	}

	const [key, value] = trimmed.split(':', 2)
	if (!key) return { current_key, in_array }

	current_key = key.trim()
	const trimmed_value = value?.trim()

	if (!trimmed_value) {
		in_array = true
		array_items.length = 0
	} else {
		parsed[current_key] = trimmed_value.replace(/^['"]|['"]$/g, '')
		in_array = false
	}

	return { current_key, in_array }
}

export function parse_yaml_frontmatter(file_content: string): ParsedMarkdown {
	const frontmatter_regex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
	const match = file_content.match(frontmatter_regex)

	if (!match) {
		return { frontmatter: null, content: file_content }
	}

	const [, yaml_content, markdown_content] = match
	let frontmatter: Record<string, unknown> | null = null

	if (!yaml_content || !markdown_content) {
		return { frontmatter: null, content: file_content }
	}

	try {
		const lines = yaml_content.split('\n')
		const parsed: Record<string, unknown> = {}

		let current_key = ''
		let in_array = false
		let array_items: string[] = []

		for (const line of lines) {
			const trimmed = line.trim()
			if (!trimmed) continue

			if (trimmed.startsWith('- ')) {
				process_array_item(trimmed, in_array, array_items)
			} else if (trimmed.includes(':')) {
				const result = process_key_value_line(
					trimmed,
					current_key,
					in_array,
					array_items,
					parsed,
				)
				current_key = result.current_key
				in_array = result.in_array
			}
		}

		if (in_array && current_key) {
			parsed[current_key] = array_items
		}

		frontmatter = parsed
	} catch (error) {
		console.warn(`Failed to parse YAML frontmatter: ${error}`)
	}

	return { frontmatter, content: markdown_content || '' }
}
