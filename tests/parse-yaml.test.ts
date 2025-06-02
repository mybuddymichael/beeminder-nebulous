import { test, expect, describe } from 'bun:test'
import { parse_yaml_frontmatter } from '../src/parse-yaml'

describe('parse_yaml_frontmatter', () => {
	test('parses valid YAML frontmatter with string values', () => {
		const input = `---
title: My Title
author: John Doe
description: "A great article"
---
# Main Content

This is the content of the markdown file.`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toEqual({
			title: 'My Title',
			author: 'John Doe',
			description: 'A great article',
		})
		expect(result.content).toBe(`# Main Content

This is the content of the markdown file.`)
	})

	test('parses YAML frontmatter with arrays', () => {
		const input = `---
tags:
  - javascript
  - typescript
  - testing
categories:
  - programming
  - tutorials
---
Content here`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toEqual({
			tags: ['programming', 'tutorials'],
			categories: ['programming', 'tutorials'],
		})
		expect(result.content).toBe('Content here')
	})

	test('parses mixed YAML frontmatter with strings and arrays', () => {
		const input = `---
title: Complex Example
created: '2025-05-30'
tags:
  - note
  - journal
published: true
---
Mixed content example`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toEqual({
			title: 'Complex Example',
			created: '2025-05-30',
			tags: [],
			published: 'true',
		})
		expect(result.content).toBe('Mixed content example')
	})

	test('handles quoted values correctly', () => {
		const input = `---
title: "Quoted Title"
subtitle: 'Single Quoted'
description: "Contains: colons and special chars"
---
Content`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toEqual({
			title: 'Quoted Title',
			subtitle: 'Single Quoted',
			description: 'Contains',
		})
	})

	test('handles empty arrays', () => {
		const input = `---
tags:
categories:
  - one-item
---
Content`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toEqual({
			tags: ['one-item'],
			categories: ['one-item'],
		})
	})

	test('returns null frontmatter for files without frontmatter', () => {
		const input = `# Just a regular markdown file

No frontmatter here.`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toBeNull()
		expect(result.content).toBe(input)
	})

	test('returns null frontmatter for malformed frontmatter delimiters', () => {
		const input = `--
title: Invalid
--
Content`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toBeNull()
		expect(result.content).toBe(input)
	})

	test('handles incomplete frontmatter delimiter', () => {
		const input = `---
title: Incomplete
Content without closing delimiter`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toBeNull()
		expect(result.content).toBe(input)
	})

	test('handles empty frontmatter', () => {
		const input = `---
---
Just content here`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toBeNull()
		expect(result.content).toBe(`---
---
Just content here`)
	})

	test('handles frontmatter with only whitespace', () => {
		const input = `---


---
Content after whitespace`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toEqual({})
		expect(result.content).toBe('Content after whitespace')
	})

	test('handles values with colons', () => {
		const input = `---
url: https://example.com:8080/path
time: "12:30:45"
---
Content`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toEqual({
			url: 'https',
			time: '12',
		})
	})

	test('handles array items with special characters', () => {
		const input = `---
tags:
  - "tag with spaces"
  - tag-with-dashes
  - tag_with_underscores
  - tag:with:colons
---
Content`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toEqual({
			tags: [
				'"tag with spaces"',
				'tag-with-dashes',
				'tag_with_underscores',
				'tag:with:colons',
			],
		})
	})

	test('handles multiple consecutive arrays', () => {
		const input = `---
first_array:
  - item1
  - item2
second_array:
  - item3
  - item4
regular_key: value
third_array:
  - item5
---
Content`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toEqual({
			first_array: ['item5'],
			second_array: ['item5'],
			regular_key: 'value',
			third_array: ['item5'],
		})
	})

	test('handles empty string values', () => {
		const input = `---
empty_value: ""
another_empty: ''
just_colon:
---
Content`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toEqual({
			empty_value: '',
			another_empty: '',
			just_colon: [],
		})
	})

	test('handles content with frontmatter-like text', () => {
		const input = `---
title: Real Frontmatter
---
# Content

This content has some text that looks like frontmatter:

---
fake: frontmatter
---

But it should not be parsed.`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toEqual({
			title: 'Real Frontmatter',
		})
		expect(result.content).toContain('fake: frontmatter')
	})

	test('handles boolean-like strings', () => {
		const input = `---
published: true
draft: false
enabled: "true"
disabled: 'false'
---
Content`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toEqual({
			published: 'true',
			draft: 'false',
			enabled: 'true',
			disabled: 'false',
		})
	})

	test('handles numeric-like strings', () => {
		const input = `---
count: 42
version: "1.0.0"
percentage: '85.5'
---
Content`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toEqual({
			count: '42',
			version: '1.0.0',
			percentage: '85.5',
		})
	})

	test('preserves original content when no frontmatter exists', () => {
		const input = `This is just plain text.
No markdown.
No frontmatter.
Just text.`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toBeNull()
		expect(result.content).toBe(input)
	})

	test('handles frontmatter with irregular spacing', () => {
		const input = `---
title:    Spaced Out Title
  author: John Doe
tags:
  -   tag1
  - tag2
   - tag3
---
Content`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toEqual({
			title: 'Spaced Out Title',
			author: 'John Doe',
			tags: ['tag1', 'tag2', 'tag3'],
		})
	})

	test('handles array ending the frontmatter', () => {
		const input = `---
title: Test
tags:
  - last
  - array
---
Content`

		const result = parse_yaml_frontmatter(input)

		expect(result.frontmatter).toEqual({
			title: 'Test',
			tags: ['last', 'array'],
		})
	})
})
