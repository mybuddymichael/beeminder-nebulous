import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import { submit_to_beeminder } from '../src/beeminder-api'

// Mock fetch globally
const mock_fetch = mock() as any
global.fetch = mock_fetch

// Mock Date to ensure consistent test results
const mock_date = '2024-01-15'
const original_date = Date
global.Date = class extends Date {
	constructor(...args: any[]) {
		if (args.length === 0) {
			super(`${mock_date}T00:00:00.000Z`)
		} else {
			super(...(args as ConstructorParameters<typeof Date>))
		}
	}

	static now(): number {
		return new original_date(`${mock_date}T00:00:00.000Z`).getTime()
	}

	toISOString(): string {
		if (
			this.getTime() ===
			new original_date(`${mock_date}T00:00:00.000Z`).getTime()
		) {
			return `${mock_date}T00:00:00.000Z`
		}
		return super.toISOString()
	}
} as any

describe('submit_to_beeminder', () => {
	const original_env = process.env.BEEMINDER_API_KEY

	beforeEach(() => {
		// Clear mock between tests
		mock_fetch.mockClear()
	})

	afterEach(() => {
		// Restore original environment
		if (original_env !== undefined) {
			process.env.BEEMINDER_API_KEY = original_env
		} else {
			delete process.env.BEEMINDER_API_KEY
		}
	})

	describe('environment validation', () => {
		test('should throw error when BEEMINDER_API_KEY is not set', async () => {
			delete process.env.BEEMINDER_API_KEY

			await expect(submit_to_beeminder('test-goal', 100)).rejects.toThrow(
				'BEEMINDER_API_KEY not found in environment variables',
			)

			expect(mock_fetch).not.toHaveBeenCalled()
		})

		test('should throw error when BEEMINDER_API_KEY is empty string', async () => {
			process.env.BEEMINDER_API_KEY = ''

			await expect(submit_to_beeminder('test-goal', 100)).rejects.toThrow(
				'BEEMINDER_API_KEY not found in environment variables',
			)

			expect(mock_fetch).not.toHaveBeenCalled()
		})
	})

	describe('successful API submission', () => {
		beforeEach(() => {
			process.env.BEEMINDER_API_KEY = 'test-api-key'
		})

		test('should submit datapoint successfully', async () => {
			const mock_response = {
				id: '12345',
				value: 100,
				comment: 'Word count from beeminder-test-goal tagged files',
			}

			mock_fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mock_response),
			})

			const console_log_spy = mock(() => {})
			const original_console_log = console.log
			console.log = console_log_spy

			await submit_to_beeminder('test-goal', 100)

			// Verify fetch was called with correct parameters
			expect(mock_fetch).toHaveBeenCalledTimes(1)
			expect(mock_fetch).toHaveBeenCalledWith(
				'https://www.beeminder.com/api/v1/users/me/goals/test-goal/datapoints.json?auth_token=test-api-key',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						value: 100,
						requestid: 'wordcount-100-2024-01-15',
						comment: 'Word count from beeminder-test-goal tagged files',
					}),
				},
			)

			// Verify success message was logged
			expect(console_log_spy).toHaveBeenCalledWith(
				'Datapoint submitted successfully:',
				mock_response,
			)

			// Restore console.log
			console.log = original_console_log
		})

		test('should handle different goal slugs correctly', async () => {
			mock_fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			})

			await submit_to_beeminder('nebulous-work', 250)

			expect(mock_fetch).toHaveBeenCalledWith(
				'https://www.beeminder.com/api/v1/users/me/goals/nebulous-work/datapoints.json?auth_token=test-api-key',
				expect.objectContaining({
					body: JSON.stringify({
						value: 250,
						requestid: 'wordcount-250-2024-01-15',
						comment: 'Word count from beeminder-nebulous-work tagged files',
					}),
				}),
			)
		})

		test('should handle zero word count', async () => {
			mock_fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			})

			await submit_to_beeminder('test-goal', 0)

			expect(mock_fetch).toHaveBeenCalledWith(
				'https://www.beeminder.com/api/v1/users/me/goals/test-goal/datapoints.json?auth_token=test-api-key',
				expect.objectContaining({
					body: JSON.stringify({
						value: 0,
						requestid: 'wordcount-0-2024-01-15',
						comment: 'Word count from beeminder-test-goal tagged files',
					}),
				}),
			)
		})

		test('should handle large word count', async () => {
			mock_fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			})

			await submit_to_beeminder('test-goal', 999999)

			expect(mock_fetch).toHaveBeenCalledWith(
				'https://www.beeminder.com/api/v1/users/me/goals/test-goal/datapoints.json?auth_token=test-api-key',
				expect.objectContaining({
					body: JSON.stringify({
						value: 999999,
						requestid: 'wordcount-999999-2024-01-15',
						comment: 'Word count from beeminder-test-goal tagged files',
					}),
				}),
			)
		})
	})

	describe('API error handling', () => {
		beforeEach(() => {
			process.env.BEEMINDER_API_KEY = 'test-api-key'
		})

		test('should throw error on HTTP 400 response', async () => {
			mock_fetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				text: () => Promise.resolve('Bad Request: Invalid parameters'),
			})

			await expect(submit_to_beeminder('test-goal', 100)).rejects.toThrow(
				'Beeminder API error: 400 Bad Request: Invalid parameters',
			)
		})

		test('should throw error on HTTP 401 response', async () => {
			mock_fetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				text: () => Promise.resolve('Unauthorized: Invalid API key'),
			})

			await expect(submit_to_beeminder('test-goal', 100)).rejects.toThrow(
				'Beeminder API error: 401 Unauthorized: Invalid API key',
			)
		})

		test('should throw error on HTTP 404 response', async () => {
			mock_fetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				text: () => Promise.resolve('Not Found: Goal does not exist'),
			})

			await expect(
				submit_to_beeminder('non-existent-goal', 100),
			).rejects.toThrow(
				'Beeminder API error: 404 Not Found: Goal does not exist',
			)
		})

		test('should throw error on HTTP 500 response', async () => {
			mock_fetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				text: () => Promise.resolve('Internal Server Error'),
			})

			await expect(submit_to_beeminder('test-goal', 100)).rejects.toThrow(
				'Beeminder API error: 500 Internal Server Error',
			)
		})

		test('should handle empty error response', async () => {
			mock_fetch.mockResolvedValueOnce({
				ok: false,
				status: 422,
				text: () => Promise.resolve(''),
			})

			await expect(submit_to_beeminder('test-goal', 100)).rejects.toThrow(
				'Beeminder API error: 422 ',
			)
		})

		test('should handle network error', async () => {
			mock_fetch.mockRejectedValueOnce(new Error('Network connection failed'))

			await expect(submit_to_beeminder('test-goal', 100)).rejects.toThrow(
				'Network connection failed',
			)
		})

		test('should handle JSON parse error in error response', async () => {
			mock_fetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				text: () => Promise.reject(new Error('Failed to read response')),
			})

			await expect(submit_to_beeminder('test-goal', 100)).rejects.toThrow(
				'Failed to read response',
			)
		})

		test('should handle duplicate request gracefully', async () => {
			mock_fetch.mockResolvedValueOnce({
				ok: false,
				status: 422,
				text: () => Promise.resolve('{"errors":"Duplicate request"}'),
			})

			const console_log_spy = mock(() => {})
			const original_console_log = console.log
			console.log = console_log_spy

			// Should not throw an error
			await submit_to_beeminder('test-goal', 100)

			// Verify duplicate message was logged
			expect(console_log_spy).toHaveBeenCalledWith(
				'Datapoint already exists with this word count for today',
			)

			// Restore console.log
			console.log = original_console_log
		})

		test('should still throw error on 422 response that is not duplicate', async () => {
			mock_fetch.mockResolvedValueOnce({
				ok: false,
				status: 422,
				text: () => Promise.resolve('{"errors":"Invalid data format"}'),
			})

			await expect(submit_to_beeminder('test-goal', 100)).rejects.toThrow(
				'Beeminder API error: 422 {"errors":"Invalid data format"}',
			)
		})
	})

	describe('request format validation', () => {
		beforeEach(() => {
			process.env.BEEMINDER_API_KEY = 'test-api-key'
			mock_fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			})
		})

		test('should use correct HTTP method', async () => {
			await submit_to_beeminder('test-goal', 100)

			expect(mock_fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'POST',
				}),
			)
		})

		test('should set correct content type header', async () => {
			await submit_to_beeminder('test-goal', 100)

			expect(mock_fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: {
						'Content-Type': 'application/json',
					},
				}),
			)
		})

		test('should format request URL correctly', async () => {
			await submit_to_beeminder('my-special-goal', 100)

			expect(mock_fetch).toHaveBeenCalledWith(
				'https://www.beeminder.com/api/v1/users/me/goals/my-special-goal/datapoints.json?auth_token=test-api-key',
				expect.any(Object),
			)
		})

		test('should include all required fields in request body', async () => {
			await submit_to_beeminder('test-goal', 150)

			const call_args = mock_fetch.mock.calls[0]
			const request_body = JSON.parse(call_args[1].body)

			expect(request_body).toEqual({
				value: 150,
				requestid: 'wordcount-150-2024-01-15',
				comment: 'Word count from beeminder-test-goal tagged files',
			})
		})

		test('should generate unique request ID based on word count', async () => {
			// Mock separate responses for each call
			mock_fetch
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({}),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({}),
				})

			// Test different word counts generate different request IDs
			await submit_to_beeminder('test-goal', 100)
			await submit_to_beeminder('test-goal', 200)

			const first_call_body = JSON.parse(mock_fetch.mock.calls[0][1].body)
			const second_call_body = JSON.parse(mock_fetch.mock.calls[1][1].body)

			expect(first_call_body.requestid).toBe('wordcount-100-2024-01-15')
			expect(second_call_body.requestid).toBe('wordcount-200-2024-01-15')
			expect(first_call_body.requestid).not.toBe(second_call_body.requestid)
		})

		test('should generate same request ID for same word count', async () => {
			// Mock separate responses for each call
			mock_fetch
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({}),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({}),
				})

			await submit_to_beeminder('test-goal', 100)
			await submit_to_beeminder('different-goal', 100)

			const first_call_body = JSON.parse(mock_fetch.mock.calls[0][1].body)
			const second_call_body = JSON.parse(mock_fetch.mock.calls[1][1].body)

			expect(first_call_body.requestid).toBe('wordcount-100-2024-01-15')
			expect(second_call_body.requestid).toBe('wordcount-100-2024-01-15')
		})
	})

	describe('edge cases', () => {
		beforeEach(() => {
			process.env.BEEMINDER_API_KEY = 'test-api-key'
			mock_fetch.mockClear()
		})

		test('should handle goal slug with special characters', async () => {
			mock_fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			})

			await submit_to_beeminder('goal-with-dashes_and_underscores', 100)

			expect(mock_fetch).toHaveBeenCalledWith(
				'https://www.beeminder.com/api/v1/users/me/goals/goal-with-dashes_and_underscores/datapoints.json?auth_token=test-api-key',
				expect.any(Object),
			)
		})

		test('should handle very long API key', async () => {
			const long_api_key = 'a'.repeat(1000)
			process.env.BEEMINDER_API_KEY = long_api_key

			mock_fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			})

			await submit_to_beeminder('test-goal', 100)

			const call_args = mock_fetch.mock.calls[0]
			const request_url = call_args[0]
			expect(request_url).toBe(
				`https://www.beeminder.com/api/v1/users/me/goals/test-goal/datapoints.json?auth_token=${long_api_key}`,
			)
		})
	})
})
