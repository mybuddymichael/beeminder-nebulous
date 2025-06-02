export interface ParsedMarkdown {
	frontmatter: Record<string, any> | null
	content: string
}

export function parse_yaml_frontmatter(file_content: string): ParsedMarkdown {
	const frontmatter_regex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
	const match = file_content.match(frontmatter_regex)
	
	if (!match) {
		return { frontmatter: null, content: file_content }
	}
	
	const [, yaml_content, markdown_content] = match
	let frontmatter: Record<string, any> | null = null
	
	try {
		// Simple YAML parser for tags array
		const lines = yaml_content.split('\n')
		const parsed: Record<string, any> = {}
		
		let current_key = ''
		let in_array = false
		let array_items: string[] = []
		
		for (const line of lines) {
			const trimmed = line.trim()
			if (!trimmed) continue
			
			if (trimmed.startsWith('- ')) {
				if (in_array) {
					array_items.push(trimmed.slice(2).trim())
				}
			} else if (trimmed.includes(':')) {
				if (in_array && current_key) {
					parsed[current_key] = array_items
					array_items = []
					in_array = false
				}
				
				const [key, value] = trimmed.split(':', 2)
				current_key = key.trim()
				const trimmed_value = value?.trim()
				
				if (!trimmed_value) {
					in_array = true
					array_items = []
				} else {
					parsed[current_key] = trimmed_value.replace(/^['"]|['"]$/g, '')
					in_array = false
				}
			}
		}
		
		if (in_array && current_key) {
			parsed[current_key] = array_items
		}
		
		frontmatter = parsed
	} catch (error) {
		console.warn(`Failed to parse YAML frontmatter: ${error}`)
	}
	
	return { frontmatter, content: markdown_content }
}
