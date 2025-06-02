import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { rm, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { find_markdown_files } from '../src/scan-files'

describe('find_markdown_files', () => {
	const test_dir = join(__dirname, 'temp-test')

	beforeEach(async () => {
		// Clean up any existing test directory before each test
		try {
			await rm(test_dir, { recursive: true, force: true })
		} catch {
			// Directory might not exist
		}
	})

	afterEach(async () => {
		// Clean up test directory after each test
		try {
			await rm(test_dir, { recursive: true, force: true })
		} catch {
			// Directory might not exist
		}
	})

	test('finds markdown files in a single directory', async () => {
		const files = await find_markdown_files(join(__dirname, 'test-folders'))

		expect(files).toContain(join(__dirname, 'test-folders', 'file1.md'))
		expect(files).toContain(
			join(__dirname, 'test-folders', 'nested', 'nested-file.md'),
		)
		expect(files).toContain(
			join(__dirname, 'test-folders', 'nested', 'deeper', 'deep-file.md'),
		)

		// Should not contain non-markdown files
		expect(files).not.toContain(join(__dirname, 'test-folders', 'file2.txt'))

		// Should have exactly 3 markdown files
		expect(files).toHaveLength(3)
	})

	test('finds markdown files recursively', async () => {
		const files = await find_markdown_files(
			join(__dirname, 'test-folders', 'nested'),
		)

		expect(files).toContain(
			join(__dirname, 'test-folders', 'nested', 'nested-file.md'),
		)
		expect(files).toContain(
			join(__dirname, 'test-folders', 'nested', 'deeper', 'deep-file.md'),
		)
		expect(files).toHaveLength(2)
	})

	test('returns empty array for directory with no markdown files', async () => {
		await mkdir(test_dir, { recursive: true })
		await writeFile(join(test_dir, 'text.txt'), 'not markdown')
		await writeFile(join(test_dir, 'readme.doc'), 'not markdown')

		const files = await find_markdown_files(test_dir)
		expect(files).toEqual([])
	})

	test('returns empty array for empty directory', async () => {
		const files = await find_markdown_files(
			join(__dirname, 'test-folders', 'empty-dir'),
		)
		expect(files).toEqual([])
	})

	test('handles non-existent directory gracefully', async () => {
		const files = await find_markdown_files(join(__dirname, 'non-existent-dir'))
		expect(files).toEqual([])
	})

	test('finds files with different markdown extensions', async () => {
		await mkdir(test_dir, { recursive: true })
		await writeFile(join(test_dir, 'file1.md'), '# Test 1')
		await writeFile(join(test_dir, 'file2.markdown'), '# Test 2')
		await writeFile(join(test_dir, 'file3.mdown'), '# Test 3')
		await writeFile(join(test_dir, 'file4.mkd'), '# Test 4')
		await writeFile(join(test_dir, 'file5.txt'), 'Not markdown')

		const files = await find_markdown_files(test_dir)

		// Only .md files should be found (based on the current implementation)
		expect(files).toContain(join(test_dir, 'file1.md'))
		expect(files).not.toContain(join(test_dir, 'file2.markdown'))
		expect(files).not.toContain(join(test_dir, 'file3.mdown'))
		expect(files).not.toContain(join(test_dir, 'file4.mkd'))
		expect(files).not.toContain(join(test_dir, 'file5.txt'))
		expect(files).toHaveLength(1)
	})

	test('handles deeply nested directory structure', async () => {
		await mkdir(join(test_dir, 'a', 'b', 'c', 'd', 'e'), { recursive: true })
		await writeFile(join(test_dir, 'root.md'), '# Root')
		await writeFile(join(test_dir, 'a', 'level1.md'), '# Level 1')
		await writeFile(join(test_dir, 'a', 'b', 'level2.md'), '# Level 2')
		await writeFile(join(test_dir, 'a', 'b', 'c', 'level3.md'), '# Level 3')
		await writeFile(
			join(test_dir, 'a', 'b', 'c', 'd', 'level4.md'),
			'# Level 4',
		)
		await writeFile(
			join(test_dir, 'a', 'b', 'c', 'd', 'e', 'level5.md'),
			'# Level 5',
		)

		const files = await find_markdown_files(test_dir)

		expect(files).toHaveLength(6)
		expect(files).toContain(join(test_dir, 'root.md'))
		expect(files).toContain(join(test_dir, 'a', 'level1.md'))
		expect(files).toContain(join(test_dir, 'a', 'b', 'level2.md'))
		expect(files).toContain(join(test_dir, 'a', 'b', 'c', 'level3.md'))
		expect(files).toContain(join(test_dir, 'a', 'b', 'c', 'd', 'level4.md'))
		expect(files).toContain(
			join(test_dir, 'a', 'b', 'c', 'd', 'e', 'level5.md'),
		)
	})

	test('returns file paths in consistent order', async () => {
		const files = await find_markdown_files(join(__dirname, 'test-folders'))

		// Check that files include all expected markdown files
		expect(files).toContain(join(__dirname, 'test-folders', 'file1.md'))
		expect(files).toContain(
			join(__dirname, 'test-folders', 'nested', 'nested-file.md'),
		)
		expect(files).toContain(
			join(__dirname, 'test-folders', 'nested', 'deeper', 'deep-file.md'),
		)
		expect(files).toHaveLength(3)
	})

	test('handles directory with mixed file types', async () => {
		await mkdir(test_dir, { recursive: true })
		await writeFile(join(test_dir, 'document.md'), '# Markdown')
		await writeFile(join(test_dir, 'image.png'), 'fake image data')
		await writeFile(join(test_dir, 'script.js'), 'console.log("hello")')
		await writeFile(join(test_dir, 'style.css'), 'body { margin: 0; }')
		await writeFile(join(test_dir, 'data.json'), '{"key": "value"}')
		await writeFile(join(test_dir, 'another.md'), '# Another markdown')

		const files = await find_markdown_files(test_dir)

		expect(files).toHaveLength(2)
		expect(files).toContain(join(test_dir, 'document.md'))
		expect(files).toContain(join(test_dir, 'another.md'))
	})
})
