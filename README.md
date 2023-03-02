# Talk-GPT

ChatGPT + Whisper + Text-to-speech.

- New user lands on webpage, sends their first req.
- First req is sent to ChatGPT.
- Generate a random token, serves as conversation id.
- Send the returned content and the ID to UI (store ID in state) and store the req, res in redis, where conv ID is the key.
- User sends next request, this time along with the conv ID. We get the prev reqs, res from redis based on ID and send the entire arary to OpenAI.

- Store conversation thread in redis.
- Redis json schema:
key: [
 {"role": "system", "content": "You are a helpful assistant."},
 {"role": "user", "content": "What's the capital of India?"},
 {"role": "assistant", "content": "New Delhi."},
]

- API response:
Request:
data: '{"model":"gpt-3.5-turbo","messages":[{"role":"system","content":"You are a helpful assistant."},{"role":"user","content":"hello world"}]}',
url: 'https://api.openai.com/v1/chat/completions'

Response:
data: {
  id: 'chatcmpl-6pV2lNkUAYEwb5gg6szaA9bGews9K',
  object: 'chat.completion',
  created: 1677732079,
  model: 'gpt-3.5-turbo-0301',
  usage: { prompt_tokens: 20, completion_tokens: 12, total_tokens: 32 },
  choices: [ [Object] ]
}

###### This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.
