"use node";
import OpenAI from "openai";
import TypeSense from 'typesense';
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { SearchParams } from "typesense/lib/Typesense/Documents";
import { ChatCompletionMessageParam } from "openai/resources";

// Initialize the OpenAI client with the given API key
const apiKey = process.env.OPENAI_API_KEY!;
const openai = new OpenAI({ apiKey });

const functions = [{
  name: "getProperties",
  description: "Get a list of properties",
  parameters: {
    type: "object",
    properties: {
      Location: {
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
      developer: {
        type: "string",
        description: "The developer of the property",
      },
      property_type: {
        type: "string",
        description: "The type of property, such as Apartment, townhouse",
      },
    },
  }
}];

const typesense = new TypeSense.Client({
  nodes: [
    {
      host: 'b41imwj5v9z7kh8op-1.a1.typesense.net',
      port: 443,
      protocol: 'https',
    },
  ],
  apiKey: 'MvoOo0pKHLNh83OaxjHGeMMvTBntJmHc',
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
    const openAiMessages: Array<ChatCompletionMessageParam> = messages.map((message) => {
      return {
        role: message.author === "assistant" ? "assistant" : "user",
        content: message.body,
      };
    });
    // console.log('sending to open ai', [
    //   {
    //     // Provide a 'system' message to give GPT context about how to respond
    //     role: "system" as ChatCompletionRequestMessageRoleEnum,
    //     content:
    //       "You are a real estate agent",
    //   },
    // ].concat(openAiMessages));

    let responseContent: string | null = "";
    try {

    
    const response = await openai.beta.chat.completions.stream({
      model: "gpt-3.5-turbo",
      functions,
      stream: true,
      messages: [
        {
          // Provide a 'system' message to give GPT context about how to respond
          role: "system",
          content:
            "You are a real estate agent in Dubai from the company \"unique properties\", as your first message always talk about properties, you have to ask the investor what kind of property they are looking for, ask for questions such as location, price, number of bedrooms, number of bathrooms, type of property, etc. ask these questions one by one, use the provided functions to search for the property",
        } as ChatCompletionMessageParam,
      ].concat(openAiMessages),
    });

    for await (const chunk of response) {
      console.log(chunk.choices[0]?.delta?.content || '');
      process.stdout.write(chunk.choices[0]?.delta?.content || '');
    }

    console.log(response);
    const chatCompletion = await response.finalChatCompletion();
    // Pull the message content out of the response
    responseContent = chatCompletion.choices[0].message?.content;
    if (!responseContent) {
      const functionCallName = chatCompletion.choices[0].message?.function_call?.name;
      if(functionCallName === "getProperties") {
        const completionArguments: {
          Location?: string;
          bedrooms?: number;
          price?: string;
          developer?: string;
        } = JSON.parse(chatCompletion.choices[0].message?.function_call?.arguments ?? '{}');

        let searchParameters: SearchParams = {
          'q'            : completionArguments?.Location ?? 'Dubai Marina',
          'query_by'     : 'Location',
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
  } catch (error) { 
    if (error instanceof OpenAI.APIError) {
      console.error(error.status);  // e.g. 401
      console.error(error.message); // e.g. The authentication token you passed was invalid...
      console.error(error.code);  // e.g. 'invalid_api_key'
      console.error(error.type);  // e.g. 'invalid_request_error'
    } else {
      // Non-API error
      console.log(error);
    }
  }
    // Send GPT's response as a new message
    await ctx.runMutation(api.messages.send, {
      author: "assistant",
      body: responseContent || "Sorry, I don't have an answer for that.",
    });
  },
});