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
        description: "The price range of the property",
      },
      bedrooms: {
        type: "integer",
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

    
    const response = openai.beta.chat.completions.stream({
      model: "gpt-3.5-turbo",
      functions,
      messages: [
        {
          // Provide a 'system' message to give GPT context about how to respond
          role: "system",
          content:
            "You are a real estate agent in Dubai from the company \"unique properties\", as your first message always talk about properties, you have to ask the investor what kind of property they are looking for, ask for questions such as location, price, number of bedrooms, number of bathrooms, type of property, etc. ask these questions one by one, use the provided functions to search for the property",
        } as ChatCompletionMessageParam,
      ].concat(openAiMessages),
    });

    // for await (const chunk of response) {
    //   console.log(chunk.choices[0]?.delta?.content || '');
    //   process.stdout.write(chunk.choices[0]?.delta?.content || '');
    // }

    // console.log(response);
    const chatCompletion = await response.finalChatCompletion();
    // Pull the message content out of the response
    responseContent = chatCompletion.choices[0].message?.content;
    console.log(responseContent);
    if (!responseContent) {
      const functionCallName = chatCompletion.choices[0].message?.function_call?.name;
      if(functionCallName === "getProperties") {
        const completionArguments: {
          Location?: string;
          bedrooms?: number;
          price?: string;
          developer?: string;
        } = JSON.parse(chatCompletion.choices[0].message?.function_call?.arguments ?? '{}');
        console.log(completionArguments);
        if (completionArguments.price?.includes('+')) {
          // completionArguments.price = completionArguments.price?.replace('+', '');
          completionArguments.price = `${completionArguments.price.split('')[0]}000000-100000000`;
        }
        if (completionArguments.price?.includes('>')) {
          // completionArguments.price = completionArguments.price?.replace('+', '');
          completionArguments.price = `${completionArguments.price.split('')[1]}000000-100000000`;
        }
        const p = completionArguments.price?.split('-') ?? [0, 10000000];
        let searchParameters: SearchParams = {
          'q'            : completionArguments?.Location ?? '*',
          'query_by'     : 'Location',
          // [10..100]
          'filter_by': completionArguments.price ? `price:[${p[0]}..${p[1]}]` : `price:>0`,
          'per_page'     : 5,
        }

        console.log(searchParameters);

        let searchResults = await typesense.collections('properties').documents().search(searchParameters);
        if (searchResults.hits?.length === 0) {
          await ctx.runMutation(api.messages.send, {
            author: "assistant",
            body: "Sorry, I don't have properties that match your criteria, however check back again soon for more properties.",
          });
          return;
        }
        // console.log(searchResults);
        // Send GPT's response as a new message
        await ctx.runMutation(api.messages.send, {
          author: "assistant",
          body: `I'll show you some properties in the area of ${completionArguments.Location ?? 'entire dubai'} around the price range of ${completionArguments.price ?? 'AED 0-10000000'}`,
        });
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