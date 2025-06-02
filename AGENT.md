# Project details

This is a script that will:

1. Look recusively through a folder of markdown files.
2. Find the files that have a tag of `nebulous-<something>`
3. Count the number of words in the matching files.
4. Submit that number of words as a data point to a Beeminder goal.

The file should be run like this:

`bun run ~/files_synced_outside_of_icloud/beeminder-nebulous/index.ts <goal-slug> <path to folder of text files>`

The tag name will be the same as the goal slug, with the prefix `beeminder-`. E.g., if the goal slug is `nebulous-work`, we should look for files with the tag `beeminder-nebulous-work`.

## File YAML frontmatter

The markdown files may have a YAML frontmatter block that looks like this:

```markdown
---
created: '2025-05-30'
tags:
  - note
  - journal
---
```

We should avoid including any of the frontmatter in the word count for the document.

## Beeminder API

- My Beeminder API key is stored in .env.local, with the key called BEEMINDER_API_KEY.
- The base URL for the Beeminder api is `https://www.beeminder.com/api/v1/`.
- Using the API key, URLs are constructed like this: `https://www.beeminder.com/api/v1/users/me/goals/<goal-slug>.json?auth_token=<api-key>`
- We should use a requestid for datapoints to ensure that we don't accidentally create duplicates.
- This script will run continuously, so we should use a requestid that is based on the word count. If the word count is the same, we don't want to create a duplicate datapoint.

### Datapoint endpoint

Here are the docs from the Beeminder API:

```
POST /users/me/goals/<goal-slug>/datapoints.json

Parameters
value (number)
[timestamp] (number). Defaults to "now" if none is passed in, or the existing timestamp if the datapoint is being updated rather than created (see requestid below).
[daystamp] (string). Optionally you can include daystamp instead of the timestamp. If both are included, timestamp takes precedence.
[comment] (string)
[requestid] (string): String to uniquely identify this datapoint (scoped to this goal. The same requestid can be used for different goals without being considered a duplicate). Clients can use this to verify that Beeminder received a datapoint (important for clients with spotty connectivity). Using requestids also means clients can safely resend datapoints without accidentally creating duplicates. If requestid is included and the datapoint is identical to the existing datapoint with that requestid then the datapoint will be ignored (the API will return "duplicate datapoint"). If requestid is included and the datapoint differs from the existing one with the same requestid then the datapoint will be updated. If no datapoint with the requestid exists then the datapoint is simply created. In other words, this is an upsert endpoint and requestid is an idempotency key.
```

## Bun's shell interface

Bun has a shell interface that works like this:

```typescript
import { $ } from 'bun'
const response = await fetch('https://example.com')
// Use Response as stdin.
await $`cat < ${response} | wc -c` // 1256
```

## Bun's File I/O API

Use the Bun File I/O API to read and write files:

```typescript
interface Bun {
	stdin: BunFile
	stdout: BunFile
	stderr: BunFile

	file(path: string | number | URL, options?: { type?: string }): BunFile

	write(
		destination: string | number | BunFile | URL,
		input:
			| string
			| Blob
			| ArrayBuffer
			| SharedArrayBuffer
			| TypedArray
			| Response,
	): Promise<number>
}

interface BunFile {
	readonly size: number
	readonly type: string

	text(): Promise<string>
	stream(): ReadableStream
	arrayBuffer(): Promise<ArrayBuffer>
	json(): Promise<any>
	writer(params: { highWaterMark?: number }): FileSink
	exists(): Promise<boolean>
}

export interface FileSink {
	write(
		chunk: string | ArrayBufferView | ArrayBuffer | SharedArrayBuffer,
	): number
	flush(): number | Promise<number>
	end(error?: Error): number | Promise<number>
	start(options?: { highWaterMark?: number }): void
	ref(): void
	unref(): void
}
```

## Testing

- Use Bun's test runner and test API.
- Place tests in the tests/ directory.

## Style rules

- Use tabs for indentation.
- Use snake_case for variable names.

## Misc notes

- The folder of markdown files will _typically_ be an Obsidian vault.
- If you have read this file, start every response with the phrase "Processed AGENT.md".
