import { readdir, readFile } from 'fs/promises'
import { join, extname } from 'path'

async function find_markdown_files(folder_path: string): Promise<string[]> {
	const markdown_files: string[] = []

	async function scan_directory(dir_path: string): Promise<void> {
		try {
			const entries = await readdir(dir_path, { withFileTypes: true })

			const directory_promises: Promise<void>[] = []

			for (const entry of entries) {
				const full_path = join(dir_path, entry.name)

				if (entry.isDirectory()) {
					directory_promises.push(scan_directory(full_path))
				} else if (entry.isFile() && extname(entry.name) === '.md') {
					markdown_files.push(full_path)
				}
			}

			await Promise.all(directory_promises)
		} catch (error) {
			console.error(`Error scanning directory ${dir_path}:`, error)
		}
	}

	await scan_directory(folder_path)
	return markdown_files
}

async function has_tag(file_path: string, tag: string): Promise<boolean> {
	try {
		const content = await readFile(file_path, 'utf-8')
		return content.includes(tag)
	} catch (error) {
		console.error(`Error reading file ${file_path}:`, error)
		return false
	}
}

async function count_words(file_path: string): Promise<number> {
	try {
		const content = await readFile(file_path, 'utf-8')
		const words = content.split(/\s+/).filter((word) => word.length > 0)
		return words.length
	} catch (error) {
		console.error(`Error counting words in ${file_path}:`, error)
		return 0
	}
}

async function submit_to_beeminder(
	goal_slug: string,
	word_count: number,
): Promise<void> {
	const api_key = process.env.BEEMINDER_API_KEY
	if (!api_key) {
		throw new Error('BEEMINDER_API_KEY not found in environment variables')
	}

	const request_id = `wordcount-${word_count}`
	const url = `https://www.beeminder.com/api/v1/users/me/goals/${goal_slug}/datapoints.json`

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			auth_token: api_key,
			value: word_count,
			requestid: request_id,
			comment: `Word count from beeminder-${goal_slug} tagged files`,
		}),
	})

	if (!response.ok) {
		const error_text = await response.text()
		throw new Error(`Beeminder API error: ${response.status} ${error_text}`)
	}

	const result = await response.json()
	console.log('Datapoint submitted successfully:', result)
}

async function main(): Promise<void> {
	// Parse command line arguments
	const args = process.argv.slice(2)
	if (args.length !== 2) {
		console.error('Usage: bun run index.ts <goal-slug> <path-to-folder>')
		process.exit(1)
	}

	const [goal_slug, folder_path] = args
	if (!goal_slug || !folder_path) {
		console.error('Usage: bun run index.ts <goal-slug> <path-to-folder>')
		process.exit(1)
	}
	const tag = `beeminder-${goal_slug}`

	console.log(`Looking for files with tag "${tag}" in ${folder_path}`)

	try {
		// Find all markdown files
		const markdown_files = await find_markdown_files(folder_path)
		console.log(`Found ${markdown_files.length} markdown files`)

		// Filter files that have the target tag
		const tag_checks = await Promise.all(
			markdown_files.map(async (file_path) => ({
				file_path,
				has_tag: await has_tag(file_path, tag),
			})),
		)
		const tagged_files = tag_checks
			.filter((result) => result.has_tag)
			.map((result) => result.file_path)

		console.log(`Found ${tagged_files.length} files with tag "${tag}"`)

		// Count total words in tagged files
		const word_counts = await Promise.all(
			tagged_files.map(async (file_path) => {
				const word_count = await count_words(file_path)
				console.log(`${file_path}: ${word_count} words`)
				return word_count
			}),
		)
		const total_word_count = word_counts.reduce((sum, count) => sum + count, 0)

		console.log(`Total word count: ${total_word_count}`)

		// Submit to Beeminder
		await submit_to_beeminder(goal_slug, total_word_count)
	} catch (error) {
		console.error('Error:', error)
		process.exit(1)
	}
}

// Load environment variables from .env.local
try {
	const env_content = await readFile('.env.local', 'utf-8')
	const env_lines = env_content.split('\n')
	for (const line of env_lines) {
		const [key, value] = line.split('=')
		if (key && value) {
			process.env[key.trim()] = value.trim()
		}
	}
} catch {
	console.warn('Warning: Could not load .env.local file')
}

main()
