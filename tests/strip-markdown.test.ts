import { describe, test, expect } from 'bun:test'
import { strip_markdown } from '../src/strip-markdown'

describe('strip_markdown', () => {
	test('should handle empty string', () => {
		expect(strip_markdown('')).toBe('')
	})

	test('should handle plain text without markdown', () => {
		const input = 'This is just plain text with no markdown formatting.'
		expect(strip_markdown(input)).toBe(input)
	})

	describe('headers', () => {
		test('should remove h1 headers', () => {
			expect(strip_markdown('# Header 1')).toBe('Header 1')
		})

		test('should remove h2 headers', () => {
			expect(strip_markdown('## Header 2')).toBe('Header 2')
		})

		test('should remove h6 headers', () => {
			expect(strip_markdown('###### Header 6')).toBe('Header 6')
		})

		test('should remove headers in multiline text', () => {
			const input = `# Main Title
Some content here
## Subtitle
More content`
			const expected = `Main Title
Some content here
Subtitle
More content`
			expect(strip_markdown(input)).toBe(expected)
		})
	})

	describe('bold and italic', () => {
		test('should remove double asterisk bold', () => {
			expect(strip_markdown('This is **bold** text')).toBe('This is bold text')
		})

		test('should remove single asterisk italic', () => {
			expect(strip_markdown('This is *italic* text')).toBe(
				'This is italic text',
			)
		})

		test('should remove double underscore bold', () => {
			expect(strip_markdown('This is __bold__ text')).toBe('This is bold text')
		})

		test('should remove single underscore italic', () => {
			expect(strip_markdown('This is _italic_ text')).toBe(
				'This is italic text',
			)
		})

		test('should handle multiple formatting in same line', () => {
			expect(
				strip_markdown('**bold** and *italic* and __bold__ and _italic_'),
			).toBe('bold and italic and bold and italic')
		})

		test('should handle nested formatting', () => {
			expect(strip_markdown('**bold _and italic_ together**')).toBe(
				'bold and italic together',
			)
		})
	})

	describe('links', () => {
		test('should remove simple links', () => {
			expect(strip_markdown('[Link text](https://example.com)')).toBe(
				'Link text',
			)
		})

		test('should remove links with empty text', () => {
			expect(strip_markdown('[](https://example.com)')).toBe('')
		})

		test('should remove multiple links', () => {
			expect(
				strip_markdown(
					'Visit [Google](https://google.com) or [GitHub](https://github.com)',
				),
			).toBe('Visit Google or GitHub')
		})

		test('should handle links in sentences', () => {
			expect(
				strip_markdown(
					'Check out this [awesome project](https://example.com) for more info.',
				),
			).toBe('Check out this awesome project for more info.')
		})
	})

	describe('code', () => {
		test('should remove inline code', () => {
			expect(strip_markdown('Use the `console.log()` function')).toBe(
				'Use the console.log() function',
			)
		})

		test('should remove code blocks', () => {
			const input = `Here is some code:
\`\`\`javascript
function hello() {
	console.log('Hello world')
}
\`\`\`
And here is more text.`
			const expected = `Here is some code:
javascript
function hello() {
	console.log('Hello world')
}

And here is more text.`
			expect(strip_markdown(input)).toBe(expected)
		})

		test('should remove code blocks with language specifier', () => {
			const input = `\`\`\`typescript
const x: number = 42
\`\`\``
			expect(strip_markdown(input)).toBe('typescript\nconst x: number = 42\n')
		})

		test('should handle multiple inline code snippets', () => {
			expect(strip_markdown('Run `npm install` then `npm start`')).toBe(
				'Run npm install then npm start',
			)
		})
	})

	describe('horizontal rules', () => {
		test('should remove dashes horizontal rule', () => {
			expect(strip_markdown('---')).toBe('')
		})

		test('should remove asterisks horizontal rule', () => {
			expect(strip_markdown('***')).toBe('*')
		})

		test('should remove underscores horizontal rule', () => {
			expect(strip_markdown('___')).toBe('_')
		})

		test('should remove longer horizontal rules', () => {
			expect(strip_markdown('----------')).toBe('')
		})

		test('should handle horizontal rules in multiline text', () => {
			const input = `Section 1
---
Section 2`
			const expected = `Section 1

Section 2`
			expect(strip_markdown(input)).toBe(expected)
		})
	})

	describe('lists', () => {
		test('should remove dash list markers', () => {
			const input = `- Item 1
- Item 2
- Item 3`
			const expected = `Item 1
Item 2
Item 3`
			expect(strip_markdown(input)).toBe(expected)
		})

		test('should remove asterisk list markers', () => {
			const input = `* Item 1
* Item 2`
			const expected = `Item 1
Item 2`
			expect(strip_markdown(input)).toBe(expected)
		})

		test('should remove plus list markers', () => {
			const input = `+ Item 1
+ Item 2`
			const expected = `Item 1
Item 2`
			expect(strip_markdown(input)).toBe(expected)
		})

		test('should remove numbered list markers', () => {
			const input = `1. First item
2. Second item
10. Tenth item`
			const expected = `First item
Second item
Tenth item`
			expect(strip_markdown(input)).toBe(expected)
		})

		test('should handle indented lists', () => {
			const input = `  - Indented item
    * Nested item`
			const expected = `Indented item
Nested item`
			expect(strip_markdown(input)).toBe(expected)
		})
	})

	describe('blockquotes', () => {
		test('should remove simple blockquote', () => {
			expect(strip_markdown('> This is a quote')).toBe('This is a quote')
		})

		test('should remove multiline blockquotes', () => {
			const input = `> This is line 1 of quote
> This is line 2 of quote`
			const expected = `This is line 1 of quote
This is line 2 of quote`
			expect(strip_markdown(input)).toBe(expected)
		})

		test('should handle indented blockquotes', () => {
			expect(strip_markdown('  > Indented quote')).toBe('Indented quote')
		})
	})

	describe('complex combinations', () => {
		test('should handle document with all markdown elements', () => {
			const input = `# Main Title

This is a paragraph with **bold** and *italic* text.

## Subsection

Here's a [link](https://example.com) and some \`inline code\`.

### List Example

- Item with **bold text**
- Item with [link](https://test.com)
1. Numbered item
2. Another numbered item

> This is a blockquote with *emphasis*

\`\`\`javascript
console.log('code block')
\`\`\`

---

Final paragraph.`

			const expected = `Main Title

This is a paragraph with bold and italic text.

Subsection

Here's a link and some inline code.

List Example
Item with bold text
Item with link
Numbered item
Another numbered item
This is a blockquote with emphasis

javascript
console.log('code block')




Final paragraph.`

			expect(strip_markdown(input)).toBe(expected)
		})

		test('should handle edge case with empty markdown elements', () => {
			const input = `****
____
[]()`
			const expected = `

`
			expect(strip_markdown(input)).toBe(expected)
		})

		test('should handle text with markdown-like but invalid syntax', () => {
			const input =
				'This has * single asterisk and _ single underscore but not ** or __'
			// Single asterisks and underscores should be treated as italic
			expect(strip_markdown(input)).toBe(
				'This has  single asterisk and  single underscore but not * or _',
			)
		})
	})
})
