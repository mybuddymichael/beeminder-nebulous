import { readdir } from 'node:fs/promises'
import { join, extname } from 'node:path'

export async function find_markdown_files(
	folder_path: string,
): Promise<string[]> {
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
