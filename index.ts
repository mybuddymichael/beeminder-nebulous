import { find_markdown_files } from './src/scan-files.ts'
import { has_tag } from './src/check-tags.ts'
import { count_words } from './src/count-words.ts'
import { submit_to_beeminder } from './src/beeminder-api.ts'

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

main()
