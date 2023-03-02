import { env } from "~/env.mjs";

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { Redis } from '@upstash/redis'
import { Configuration, OpenAIApi } from "openai";
import { TRPCError } from "@trpc/server";

const configuration = new Configuration({
  apiKey: env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const redis = new Redis({
  url: env.UPSTASH_URL,
  token: env.UPSTASH_TOKEN,
})

export const gptRouter = createTRPCRouter({

  getGptResponse: publicProcedure
    .input(z.object({
      userContent: z.string(),
      conversationId: z.string().optional(),
    }))
    .query(async ({ input }) => (
      await talkToGpt(input.userContent, input?.conversationId)
    )),
});

type ChatThread = {
    role: "user" | "assistant" | "system";
    content: string;
}[];

async function talkToGpt(userContent: string, conversationId?: string) {

  if (!conversationId) {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": userContent},
      ]
    });

    if (response.status != 200) throw new TRPCError({
      message: "Error in API request.",
      code: "INTERNAL_SERVER_ERROR",
    })

    const chatThread = [
      {role: "system", content: "You are a helpful assistant."},
      {role: "user", content: userContent},
      {role: "assistant", content: response.data.choices[0]?.message?.content},
    ]

    // No need to await, cuz we don't need response.
    redis.json.set(response.data.id, "$", chatThread, {nx:true});
    return {
      conversationId: response.data.id,
      completion: response.data.choices[0]?.message?.content,
    };
  }
  // Since there IS a `conversationId`, it's not a new thread
  // We get the previous conversations in this thread from redis and send them along with the new msg.
  const prevChatThread: ChatThread = (await redis.json.get(conversationId, "$"))[0];
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      ...prevChatThread,
      {"role": "user", "content": userContent},
    ]
  });

  if (response.status != 200) throw new TRPCError({
    message: "Error in API request.",
    code: "INTERNAL_SERVER_ERROR",
  });

  redis.json.arrappend(conversationId, "$", response.data.choices[0]?.message);
  return {
    conversationId: response.data.id,
    completion: response.data.choices[0]?.message,
  };

}
