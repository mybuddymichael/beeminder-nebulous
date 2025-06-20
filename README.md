# beeminder-nebulous

Automatically tracks word counts from tagged markdown files and submits them as datapoints to [Beeminder](https://www.beeminder.com/) goals.

## What it does

This script:

1. Recursively searches through a folder of markdown files (e.g., an Obsidian vault)
2. Finds files tagged with `beeminder-<goal-slug>` in their YAML frontmatter
3. Counts the words in matching files (excluding frontmatter)
4. Submits the word count as a datapoint to your specified Beeminder goal

## Features

- **Duplicate protection**: Uses requestid to prevent duplicate datapoints
- **Safe re-runs**: Can run continuously
- **Frontmatter exclusion**: Only counts actual content, not YAML metadata

## Requirements

- [Bun](https://bun.sh) runtime
- Beeminder API key
- An odometer goal in Beeminder
- Markdown files with YAML frontmatter

## Setup

1. Create an [odometer goal](https://help.beeminder.com/article/68-odometer-goals) in Beeminder.
2. Get your [Beeminder API key](https://www.beeminder.com/settings/account#account-permissions) from your account settings.

## Usage

```bash
bun run index.ts --key <api-key> --goal <goal-slug> --folder <path-to-markdown-folder>
```

**Example:**

```bash
bun run index.ts --key your_api_key_here --goal nebulous-work --folder ~/Documents/my-notes
```

This will:

- Look for files tagged with `beeminder-nebulous-work` in `~/Documents/my-notes`
- Count words in those files
- Submit the count to your `nebulous-work` Beeminder goal

## File Format

Your markdown files should have YAML frontmatter with tags:

```markdown
---
created: '2025-05-30'
tags:
  - note
  - journal
  - beeminder-nebulous-work
---

Your content here...
```
