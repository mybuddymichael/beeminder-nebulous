export async function submit_to_beeminder(
	api_key: string,
	goal_slug: string,
	word_count: number,
): Promise<void> {
	const today = new Date().toISOString().split('T')[0]
	const request_id = `wordcount-${word_count}-${today}`
	const url = `https://www.beeminder.com/api/v1/users/me/goals/${goal_slug}/datapoints.json?auth_token=${api_key}`

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			value: word_count,
			requestid: request_id,
			comment: `Word count from beeminder-${goal_slug} tagged files`,
		}),
	})

	if (!response.ok) {
		const error_text = await response.text()

		// Handle duplicate request gracefully
		if (response.status === 422 && error_text.includes('Duplicate request')) {
			console.log('Datapoint already exists with this word count for today')
			return
		}

		throw new Error(`Beeminder API error: ${response.status} ${error_text}`)
	}

	const result = await response.json()
	console.log('Datapoint submitted successfully:', result)
}
