"use node";
import { ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from "openai";
import TypeSense from 'typesense';
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { SearchParams } from "typesense/lib/Typesense/Documents";

// Initialize the OpenAI client with the given API key
const apiKey = process.env.OPENAI_API_KEY!;
const openai = new OpenAIApi(new Configuration({ apiKey }));

const functions = [{
  name: "getProperties",
  description: "Get a list of properties",
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "The location of the property",
      },
      price: {
        type: "string",
        description: "The price of the property",
      },
      bedrooms: {
        type: "number",
        description: "The number of bedrooms in the property",
      },
      bathrooms: {
        type: "number",
        description: "The number of bathrooms in the property",
      },
      type: {
        type: "string",
        description: "The type of property",
      },
    },
  }
}];

const typesense = new TypeSense.Client({
  nodes: [
    {
      host: 'f19sjwgqltdryvxap-1.a1.typesense.net',
      port: 443,
      protocol: 'https',
    },
  ],
  apiKey: 'AviqSvUdD5dMzKjWzqBdyRgMWNmYU1zg',
  connectionTimeoutSeconds: 2,
});


export const chat = action({
  args: {
    messages: v.array(
      v.object({
        author: v.string(),
        body: v.string(),
      })
    )
  },
  handler: async (ctx, { messages }) => {
    console.log(" iam in open ai ", messages);
    const openAiMessages: Array<{
      role: ChatCompletionRequestMessageRoleEnum;
      content: string;
    }> = messages.map((message) => {
      return {
        role: message.author === "assistant" ? "assistant" : "user",
        content: message.body,
      };
    });
    console.log('sending to open ai', [
      {
        // Provide a 'system' message to give GPT context about how to respond
        role: "system" as ChatCompletionRequestMessageRoleEnum,
        content:
          "You are a real estate agent",
      },
    ].concat(openAiMessages));
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      functions,
      messages: [
        {
          // Provide a 'system' message to give GPT context about how to respond
          role: "system" as ChatCompletionRequestMessageRoleEnum,
          content:
            "You are a real estate agent in Dubai, you have to ask the investor what kind of property they are looking for, ask for questions such as location, price, number of bedrooms, number of bathrooms, type of property, etc. ask these questions one by one, use the provided functions to search for the property",
        },
      ].concat(openAiMessages),
    });

    console.log(response);

    // Pull the message content out of the response
    const responseContent = response.data.choices[0].message?.content;
    if (!responseContent) {
      const functionCallName = response.data.choices[0].message?.function_call?.name;
      if(functionCallName === "getProperties") {
        const completionArguments: {
          location?: string;
          bedrooms?: number;
          price?: string;
        } = JSON.parse(response.data.choices[0].message?.function_call?.arguments ?? '{}');

        let searchParameters: SearchParams = {
          'q'            : completionArguments?.location ?? 'Dubai Marina',
          'query_by'     : 'location',
        }

        let searchResults = await typesense.collections('properties').documents().search(searchParameters);
        console.log(searchResults);
        // Send GPT's response as a new message
        await ctx.runMutation(api.messages.send, {
          author: "function",
          body: searchResults.hits?.map((hit) => {
            return JSON.stringify(hit.document);
          }).join(",") ?? '',
        });
        return
      }
    }
    // Send GPT's response as a new message
    await ctx.runMutation(api.messages.send, {
      author: "assistant",
      body: responseContent || "Sorry, I don't have an answer for that.",
    });
  },
});