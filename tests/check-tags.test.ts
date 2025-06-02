import { test, expect, beforeEach, afterEach } from 'bun:test'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { has_tag } from '../src/check-tags'

const test_dir = join(__dirname, 'temp-test-files')

beforeEach(() => {
	try {
		rmSync(test_dir, { recursive: true, force: true })
	} catch {}
	mkdirSync(test_dir, { recursive: true })
})

afterEach(() => {
	try {
		rmSync(test_dir, { recursive: true, force: true })
	} catch {}
})

function create_test_file(filename: string, content: string): string {
	const file_path = join(test_dir, filename)
	writeFileSync(file_path, content, 'utf-8')
	return file_path
}

test('has_tag returns true when tag exists in frontmatter', async () => {
	const file_path = create_test_file(
		'with-tag.md',
		`---
created: '2025-05-30'
tags:
  - note
  - journal
  - beeminder-work
---

# Test Document

This is test content.
`,
	)

	const result = await has_tag(file_path, 'beeminder-work')
	expect(result).toBe(true)
})

test('has_tag returns false when tag does not exist in frontmatter', async () => {
	const file_path = create_test_file(
		'without-tag.md',
		`---
created: '2025-05-30'
tags:
  - note
  - journal
---

# Test Document

This is test content.
`,
	)

	const result = await has_tag(file_path, 'beeminder-work')
	expect(result).toBe(false)
})

test('has_tag returns false when file has no frontmatter', async () => {
	const file_path = create_test_file(
		'no-frontmatter.md',
		`# Test Document

This is test content without frontmatter.
`,
	)

	const result = await has_tag(file_path, 'beeminder-work')
	expect(result).toBe(false)
})

test('has_tag returns false when frontmatter has no tags field', async () => {
	const file_path = create_test_file(
		'no-tags-field.md',
		`---
created: '2025-05-30'
author: 'Test User'
---

# Test Document

This is test content.
`,
	)

	const result = await has_tag(file_path, 'beeminder-work')
	expect(result).toBe(false)
})

test('has_tag returns false when tags field is empty array', async () => {
	const file_path = create_test_file(
		'empty-tags.md',
		`---
created: '2025-05-30'
tags:
---

# Test Document

This is test content.
`,
	)

	const result = await has_tag(file_path, 'beeminder-work')
	expect(result).toBe(false)
})

test('has_tag returns false when tags field is not an array', async () => {
	const file_path = create_test_file(
		'tags-not-array.md',
		`---
created: '2025-05-30'
tags: single-tag
---

# Test Document

This is test content.
`,
	)

	const result = await has_tag(file_path, 'single-tag')
	expect(result).toBe(false)
})

test('has_tag handles single tag in array', async () => {
	const file_path = create_test_file(
		'single-tag-array.md',
		`---
created: '2025-05-30'
tags:
  - beeminder-work
---

# Test Document

This is test content.
`,
	)

	const result = await has_tag(file_path, 'beeminder-work')
	expect(result).toBe(true)
})

test('has_tag is case sensitive', async () => {
	const file_path = create_test_file(
		'case-sensitive.md',
		`---
created: '2025-05-30'
tags:
  - Beeminder-Work
  - BEEMINDER-WORK
---

# Test Document

This is test content.
`,
	)

	const lowercase_result = await has_tag(file_path, 'beeminder-work')
	const uppercase_result = await has_tag(file_path, 'BEEMINDER-WORK')
	const mixed_case_result = await has_tag(file_path, 'Beeminder-Work')

	expect(lowercase_result).toBe(false)
	expect(uppercase_result).toBe(true)
	expect(mixed_case_result).toBe(true)
})

test('has_tag handles exact string matching', async () => {
	const file_path = create_test_file(
		'exact-match.md',
		`---
created: '2025-05-30'
tags:
  - beeminder-work
  - beeminder-work-extra
  - work-beeminder
---

# Test Document

This is test content.
`,
	)

	const exact_match = await has_tag(file_path, 'beeminder-work')
	const partial_match_1 = await has_tag(file_path, 'beeminder')
	const partial_match_2 = await has_tag(file_path, 'work')

	expect(exact_match).toBe(true)
	expect(partial_match_1).toBe(false)
	expect(partial_match_2).toBe(false)
})

test('has_tag handles file that does not exist', async () => {
	const non_existent_path = join(test_dir, 'does-not-exist.md')

	const result = await has_tag(non_existent_path, 'beeminder-work')
	expect(result).toBe(false)
})

test('has_tag handles malformed YAML frontmatter', async () => {
	const file_path = create_test_file(
		'malformed-yaml.md',
		`---
created: '2025-05-30
tags:
  - note
  - journal
invalid: yaml: structure
---

# Test Document

This is test content.
`,
	)

	const result = await has_tag(file_path, 'note')
	expect(result).toBe(false)
})

test('has_tag handles file with frontmatter but minimal content', async () => {
	const file_path = create_test_file(
		'frontmatter-minimal.md',
		`---
created: '2025-05-30'
tags:
  - beeminder-work
---

`,
	)

	const result = await has_tag(file_path, 'beeminder-work')
	expect(result).toBe(true)
})

test('has_tag handles empty file', async () => {
	const file_path = create_test_file('empty.md', '')

	const result = await has_tag(file_path, 'beeminder-work')
	expect(result).toBe(false)
})

test('has_tag handles file with only frontmatter delimiters', async () => {
	const file_path = create_test_file(
		'empty-frontmatter.md',
		`---
---

# Test Document

This is test content.
`,
	)

	const result = await has_tag(file_path, 'beeminder-work')
	expect(result).toBe(false)
})

test('has_tag handles special characters in tag names', async () => {
	const file_path = create_test_file(
		'special-chars.md',
		`---
created: '2025-05-30'
tags:
  - beeminder-work_123
  - tag-with-dash
  - tag_with_underscore
  - tag.with.dots
---

# Test Document

This is test content.
`,
	)

	const underscore_result = await has_tag(file_path, 'beeminder-work_123')
	const dash_result = await has_tag(file_path, 'tag-with-dash')
	const dots_result = await has_tag(file_path, 'tag.with.dots')

	expect(underscore_result).toBe(true)
	expect(dash_result).toBe(true)
	expect(dots_result).toBe(true)
})

test('has_tag handles whitespace around tags', async () => {
	const file_path = create_test_file(
		'whitespace-tags.md',
		`---
created: '2025-05-30'
tags:
  -   spaced-tag
  - normal-tag
---

# Test Document

This is test content.
`,
	)

	const spaced_result = await has_tag(file_path, 'spaced-tag')
	const normal_result = await has_tag(file_path, 'normal-tag')

	expect(spaced_result).toBe(true)
	expect(normal_result).toBe(true)
})
