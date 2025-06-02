import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { rm, mkdir } from 'fs/promises'
import { join } from 'path'
import { $ } from 'bun'
import { delete_datapoint } from '../src/beeminder-api.ts'

const goal_slug = 'test-nebulous' // This is an actual odometer goal in Beeminder!

function extract_datapoint_id(script_output: string): string | null {
	const match = script_output.match(/id[:\s]+"([^"]+)"/)
	return match?.[1] || null
}

async function get_datapoints_from_api(goal_slug: string): Promise<any[]> {
	const api_key = process.env.BEEMINDER_API_KEY
	if (!api_key) {
		throw new Error('BEEMINDER_API_KEY not found in environment variables')
	}

	const url = `https://www.beeminder.com/api/v1/users/me/goals/${goal_slug}/datapoints.json?auth_token=${api_key}`
	const response = await fetch(url)

	if (!response.ok) {
		throw new Error(`Failed to fetch datapoints: ${response.status}`)
	}

	return (await response.json()) as any[]
}

describe('End-to-end testing', () => {
	const test_dir = join(__dirname, 'temp-e2e-test')
	const created_datapoints: Array<{ goal_slug: string; datapoint_id: string }> =
		[]

	beforeEach(async () => {
		// Clean up any existing test directory
		try {
			await rm(test_dir, { recursive: true, force: true })
		} catch {
			// Directory might not exist
		}
		await mkdir(test_dir, { recursive: true })

		// Clear the datapoints tracking array
		created_datapoints.length = 0
	})

	afterEach(async () => {
		// Clean up test directory
		try {
			await rm(test_dir, { recursive: true, force: true })
		} catch {
			// Directory might not exist
		}

		// Clean up created datapoints
		await Promise.all(
			created_datapoints.map(async ({ goal_slug, datapoint_id }) => {
				try {
					await delete_datapoint(goal_slug, datapoint_id)
				} catch (error) {
					console.warn(`Failed to delete datapoint ${datapoint_id}:`, error)
				}
			}),
		)
	})

	test('submits word count for files with correct tag', async () => {
		const tag_name = `beeminder-${goal_slug}`

		// Create test files with the beeminder-test-nebulous tag
		const file1_content = `---
created: '2025-06-02'
tags:
  - note
  - ${tag_name}
---

# Test Document 1

This is a test document with some content to count.
It has multiple sentences and should contribute to the word count.
`

		const file2_content = `---
created: '2025-06-02'
tags:
  - journal
  - ${tag_name}
---

# Another Test Document

More content here for testing.
This file also has the correct tag.
`

		const file3_content = `---
created: '2025-06-02'
tags:
  - note
  - different-tag
---

# File Without Target Tag

This file should not be counted because it doesn't have the target tag.
`

		await Bun.write(join(test_dir, 'file1.md'), file1_content)
		await Bun.write(join(test_dir, 'file2.md'), file2_content)
		await Bun.write(join(test_dir, 'file3.md'), file3_content)

		// Get initial datapoints count
		const initial_datapoints = await get_datapoints_from_api(goal_slug)
		const initial_count = initial_datapoints.length

		// Run the main script
		const result = await $`bun run index.ts ${goal_slug} ${test_dir}`.text()

		// Check that the script ran successfully
		expect(result).toContain(`Looking for files with tag "${tag_name}"`)
		expect(result).toContain('Found 3 markdown files')
		expect(result).toContain(`Found 2 files with tag "${tag_name}"`)
		expect(result).toContain('Datapoint submitted successfully')

		// Extract and track the created datapoint ID for cleanup
		const datapoint_id = extract_datapoint_id(result)
		expect(datapoint_id).toBeTruthy()
		if (datapoint_id) {
			created_datapoints.push({ goal_slug, datapoint_id })
		}

		// Verify a new datapoint was created
		const final_datapoints = await get_datapoints_from_api(goal_slug)
		expect(final_datapoints.length).toBeGreaterThan(initial_count)

		// Find the most recent datapoint (should be the one we just created)
		const latest_datapoint = final_datapoints[0] // API returns newest first by default

		// Verify the datapoint has the expected properties
		expect(latest_datapoint.value).toBeGreaterThan(0)
		expect(latest_datapoint.value).toEqual(39)
		expect(latest_datapoint.comment).toContain(
			`Word count from beeminder-${goal_slug} tagged files`,
		)

		// Verify the requestid format
		const today = new Date().toISOString().split('T')[0]
		expect(latest_datapoint.requestid).toContain(
			`wordcount-${latest_datapoint.value}-${today}`,
		)
	})

	test('handles directory with no matching files', async () => {
		const tag_name = `beeminder-${goal_slug}`

		// Create files without the target tag
		const file_content = `---
	created: '2025-06-02'
	tags:
	  - note
	  - different-tag
	---

	# File Without Target Tag

	This file should not be counted.
	`

		await Bun.write(join(test_dir, 'file1.md'), file_content)

		// Get initial datapoints count
		const initial_datapoints = await get_datapoints_from_api(goal_slug)
		const initial_count = initial_datapoints.length

		// Run the main script
		const result = await $`bun run index.ts ${goal_slug} ${test_dir}`.text()

		// Check that the script found no matching files
		expect(result).toContain(`Found 0 files with tag "${tag_name}"`)
		expect(result).toContain('Total word count: 0')

		// Extract and track the created datapoint ID for cleanup
		const datapoint_id = extract_datapoint_id(result)
		expect(datapoint_id).toBeTruthy()
		if (datapoint_id) {
			created_datapoints.push({ goal_slug, datapoint_id })
		}

		// Verify a datapoint was still created (with 0 value)
		const final_datapoints = await get_datapoints_from_api(goal_slug)
		expect(final_datapoints.length).toBeGreaterThan(initial_count)

		const latest_datapoint = final_datapoints[0]
		expect(latest_datapoint.value).toBe(0)
	})

	test('handles empty directory', async () => {
		// Don't create any files - test with empty directory

		// Get initial datapoints count
		const initial_datapoints = await get_datapoints_from_api(goal_slug)
		const initial_count = initial_datapoints.length

		// Run the main script
		const result = await $`bun run index.ts ${goal_slug} ${test_dir}`.text()

		// Check that the script handled empty directory
		expect(result).toContain('Found 0 markdown files')
		expect(result).toContain('Total word count: 0')

		// Extract and track the created datapoint ID for cleanup
		const datapoint_id = extract_datapoint_id(result)
		expect(datapoint_id).toBeTruthy()
		if (datapoint_id) {
			created_datapoints.push({ goal_slug, datapoint_id })
		}

		// Verify a datapoint was created with 0 value
		const final_datapoints = await get_datapoints_from_api(goal_slug)
		expect(final_datapoints.length).toBeGreaterThan(initial_count)

		const latest_datapoint = final_datapoints[0]
		expect(latest_datapoint.value).toBe(0)
	})

	test('prevents duplicate datapoints on same day with same word count', async () => {
		const tag_name = `beeminder-${goal_slug}`

		// Create a simple test file
		const file_content = `---
	created: '2025-06-02'
	tags:
	  - ${tag_name}
	---

	# Simple Test

	Just a few words here.
	`

		await Bun.write(join(test_dir, 'file.md'), file_content)

		// Run the script twice
		const result1 = await $`bun run index.ts ${goal_slug} ${test_dir}`.text()
		const result2 = await $`bun run index.ts ${goal_slug} ${test_dir}`.text()

		// First run should succeed
		expect(result1).toContain('Datapoint submitted successfully')

		// Extract and track the created datapoint ID for cleanup
		const datapoint_id = extract_datapoint_id(result1)
		if (datapoint_id) {
			created_datapoints.push({ goal_slug, datapoint_id })
		}

		// Second run should handle duplicate gracefully
		expect(result2).toContain(
			'Datapoint already exists with this word count for today',
		)
	})
})
