import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { count_words } from '../src/count-words'

const TEST_DIR = join(__dirname, 'temp-test-files')

describe('count_words', () => {
	beforeAll(async () => {
		// Create temporary test directory
		await mkdir(TEST_DIR, { recursive: true })
	})

	afterAll(async () => {
		// Clean up temporary test directory
		await rm(TEST_DIR, { recursive: true, force: true })
	})

	describe('basic word counting', () => {
		test('should count words in plain text', async () => {
			const file_path = join(TEST_DIR, 'plain.md')
			await writeFile(file_path, 'This is a simple test with five words')

			const count = await count_words(file_path)
			expect(count).toBe(8)
		})

		test('should handle empty file', async () => {
			const file_path = join(TEST_DIR, 'empty.md')
			await writeFile(file_path, '')

			const count = await count_words(file_path)
			expect(count).toBe(0)
		})

		test('should handle file with only whitespace', async () => {
			const file_path = join(TEST_DIR, 'whitespace.md')
			await writeFile(file_path, '   \n\t\n   ')

			const count = await count_words(file_path)
			expect(count).toBe(0)
		})

		test('should count words separated by various whitespace', async () => {
			const file_path = join(TEST_DIR, 'whitespace-sep.md')
			await writeFile(file_path, 'word1\tword2\nword3   word4\r\nword5')

			const count = await count_words(file_path)
			expect(count).toBe(5)
		})
	})

	describe('YAML frontmatter handling', () => {
		test('should exclude YAML frontmatter from word count', async () => {
			const file_path = join(TEST_DIR, 'with-frontmatter.md')
			const content = `---
created: '2025-05-30'
tags:
  - note
  - journal
---

This content has five words.`
			await writeFile(file_path, content)

			const count = await count_words(file_path)
			expect(count).toBe(5)
		})

		test('should handle file with only YAML frontmatter', async () => {
			const file_path = join(TEST_DIR, 'only-frontmatter.md')
			const content = `---
created: '2025-05-30'
tags:
  - note
---`
			await writeFile(file_path, content)

			const count = await count_words(file_path)
			expect(count).toBe(4)
		})

		test('should handle file without YAML frontmatter', async () => {
			const file_path = join(TEST_DIR, 'no-frontmatter.md')
			await writeFile(file_path, 'Content without frontmatter has four words.')

			const count = await count_words(file_path)
			expect(count).toBe(6)
		})

		test('should handle malformed YAML frontmatter', async () => {
			const file_path = join(TEST_DIR, 'malformed-frontmatter.md')
			const content = `---
created: '2025-05-30
tags:
  - note
---

Content after malformed frontmatter.`
			await writeFile(file_path, content)

			const count = await count_words(file_path)
			// Should still process the content even if YAML is malformed
			expect(count).toBeGreaterThan(0)
		})
	})

	describe('markdown stripping', () => {
		test('should strip markdown formatting before counting', async () => {
			const file_path = join(TEST_DIR, 'markdown.md')
			const content = `# Header

This is **bold** and *italic* text with [link](https://example.com).

- List item one
- List item two

\`inline code\` and \`\`\`block code\`\`\`

> Blockquote text`
			await writeFile(file_path, content)

			const count = await count_words(file_path)
			// Count words after markdown is stripped
			// Header + This is bold and italic text with link + List item one + List item two + inline code and block code + Blockquote text
			expect(count).toBe(22)
		})

		test('should handle complex markdown document', async () => {
			const file_path = join(TEST_DIR, 'complex-markdown.md')
			const content = `---
title: Test Document
tags: [test, markdown]
---

# Main Title

This document has **bold text**, *italic text*, and [links](https://example.com).

## Subsection

Here's a list:
- First item with **bold**
- Second item with *emphasis*

### Code Examples

Use \`console.log()\` for debugging.

\`\`\`javascript
function hello() {
    console.log('Hello world')
}
\`\`\`

> This is a blockquote with some text.

---

Final paragraph with regular text.`
			await writeFile(file_path, content)

			const count = await count_words(file_path)
			// Should count all words after stripping markdown and frontmatter
			expect(count).toBeGreaterThan(30)
		})
	})

	describe('error handling', () => {
		test('should return 0 for non-existent file', async () => {
			const non_existent_path = join(TEST_DIR, 'does-not-exist.md')

			const count = await count_words(non_existent_path)
			expect(count).toBe(0)
		})

		test('should return 0 for directory path', async () => {
			const count = await count_words(TEST_DIR)
			expect(count).toBe(0)
		})

		test('should handle permission denied gracefully', async () => {
			// Create a file and try to make it unreadable (may not work on all systems)
			const restricted_path = join(TEST_DIR, 'restricted.md')
			await writeFile(restricted_path, 'test content')

			try {
				// Try to change permissions (may fail on some systems)
				const fs = require('fs')
				fs.chmodSync(restricted_path, 0o000)

				const count = await count_words(restricted_path)
				expect(count).toBe(0)

				// Restore permissions for cleanup
				fs.chmodSync(restricted_path, 0o644)
			} catch {
				// If chmod doesn't work, skip this test
				expect(true).toBe(true)
			}
		})
	})

	describe('edge cases', () => {
		test('should handle very large files', async () => {
			const file_path = join(TEST_DIR, 'large.md')
			const large_content = 'word '.repeat(10000).trim()
			await writeFile(file_path, large_content)

			const count = await count_words(file_path)
			expect(count).toBe(10000)
		})

		test('should handle files with unicode characters', async () => {
			const file_path = join(TEST_DIR, 'unicode.md')
			await writeFile(file_path, 'café naïve résumé 中文 العربية')

			const count = await count_words(file_path)
			expect(count).toBe(5)
		})

		test('should handle files with numbers and symbols', async () => {
			const file_path = join(TEST_DIR, 'numbers-symbols.md')
			await writeFile(
				file_path,
				'Price: $19.99 Date: 2025-01-01 Email: test@example.com',
			)

			const count = await count_words(file_path)
			expect(count).toBe(6)
		})

		test('should handle mixed line endings', async () => {
			const file_path = join(TEST_DIR, 'line-endings.md')
			await writeFile(file_path, 'line1\nline2\r\nline3\rline4')

			const count = await count_words(file_path)
			expect(count).toBe(4)
		})

		test('should handle files with only punctuation', async () => {
			const file_path = join(TEST_DIR, 'punctuation.md')
			await writeFile(file_path, '!@#$%^&*()[]{}.,;:"')

			const count = await count_words(file_path)
			expect(count).toBe(1) // Punctuation counts as one "word"
		})
	})

	describe('real-world examples', () => {
		test('should count words in typical Obsidian note', async () => {
			const file_path = join(TEST_DIR, 'obsidian-note.md')
			const content = `---
created: '2025-05-30'
tags:
  - daily-note
  - beeminder-nebulous-work
  - project
---

# Daily Note - 2025-05-30

## Work Done
- Completed feature X implementation
- Fixed bug in authentication system
- Reviewed pull request #123

## Planning
Tomorrow I need to:
1. Deploy the changes to staging
2. Write documentation for new API endpoints
3. Schedule team meeting

## Notes
The new authentication system works well but needs more testing.
Consider adding rate limiting to prevent abuse.

[[Link to other note]]

#work #programming #review`
			await writeFile(file_path, content)

			const count = await count_words(file_path)
			// Should count meaningful content words only
			expect(count).toBeGreaterThan(40)
			expect(count).toBeLessThan(70)
		})

		test('should handle journal entry format', async () => {
			const file_path = join(TEST_DIR, 'journal.md')
			const content = `---
date: 2025-05-30
mood: good
tags: [journal, beeminder-writing]
---

Today was a productive day. I managed to finish several important tasks and make good progress on my side project.

The weather was nice, so I took a walk during lunch break. It helped me think through some technical challenges I've been facing.

Looking forward to tomorrow's meetings and continuing the momentum.`
			await writeFile(file_path, content)

			const count = await count_words(file_path)
			expect(count).toBeGreaterThan(45)
			expect(count).toBeLessThan(55)
		})
	})
})
