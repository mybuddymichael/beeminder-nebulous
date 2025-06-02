export function strip_markdown(content: string): string {
	return content
		// Remove headers
		.replace(/^#{1,6}\s+/gm, '')
		// Remove bold and italic
		.replace(/\*\*(.*?)\*\*/g, '$1')
		.replace(/\*(.*?)\*/g, '$1')
		.replace(/__(.*?)__/g, '$1')
		.replace(/_(.*?)_/g, '$1')
		// Remove links
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		// Remove inline code
		.replace(/`([^`]*)`/g, '$1')
		// Remove code blocks
		.replace(/```[\s\S]*?```/g, '')
		// Remove horizontal rules
		.replace(/^[-*_]{3,}$/gm, '')
		// Remove list markers
		.replace(/^\s*[-*+]\s+/gm, '')
		.replace(/^\s*\d+\.\s+/gm, '')
		// Remove blockquotes
		.replace(/^\s*>\s*/gm, '')
}
