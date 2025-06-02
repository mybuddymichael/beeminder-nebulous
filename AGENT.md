# Project details

This is a script that will look at directory of markdown files and count the number of words in the files within, then submit that number of words as a data point to a Beeminder goal.

The file should be run like this:

`bun run ~/files_synced_outside_of_icloud/beeminder-nebulous/index.ts <goal-slug> <path to folder of text files>`

## Beeminder API

- My Beeminder API key is stored in .env.local, with the key called BEEMINDER_API_KEY.
- The base URL for the Beeminder api is `https://www.beeminder.com/api/v1/`.
- Using the API key, URLs are constructed like this: `https://www.beeminder.com/api/v1/users/me/goals/<goal-slug>.json?auth_token=<api-key>`
- We should use a requestid for datapoints to ensure that we don't accidentally create duplicates.

### Datapoint endpoint

Here are the docs from the Beeminder API:

POST /users/me/goals/<goal-slug>/datapoints.json

Parameters
value (number)
[timestamp] (number). Defaults to "now" if none is passed in, or the existing timestamp if the datapoint is being updated rather than created (see requestid below).
[daystamp] (string). Optionally you can include daystamp instead of the timestamp. If both are included, timestamp takes precedence.
[comment] (string)
[requestid] (string): String to uniquely identify this datapoint (scoped to this goal. The same requestid can be used for different goals without being considered a duplicate). Clients can use this to verify that Beeminder received a datapoint (important for clients with spotty connectivity). Using requestids also means clients can safely resend datapoints without accidentally creating duplicates. If requestid is included and the datapoint is identical to the existing datapoint with that requestid then the datapoint will be ignored (the API will return "duplicate datapoint"). If requestid is included and the datapoint differs from the existing one with the same requestid then the datapoint will be updated. If no datapoint with the requestid exists then the datapoint is simply created. In other words, this is an upsert endpoint and requestid is an idempotency key.

## Bun's shell interface

Bun has a shell interface that works like this:

```typescript
import { $ } from 'bun'
const response = await fetch('https://example.com')
// Use Response as stdin.
await $`cat < ${response} | wc -c` // 1256
```

## Misc notes

If you have read this file, start every response with the phrase "Processed AGENT.md".
