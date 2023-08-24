import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Grab the most recent messages.
    const messages = await ctx.db.query("messages").order("desc").take(100);
    const messagesWithLikes = await Promise.all(
      messages.map(async (message) => {
        // Find the likes for each message
        const likes = await ctx.db
          .query("likes")
          .withIndex("byMessageId", (q) => q.eq("messageId", message._id))
          .collect();
        // Join the count of likes with the message data
        return {
          ...message,
          likes: likes.length,
        };
      })
    );
    // Reverse the list so that it's in chronological order.
    return messagesWithLikes.reverse();
  },
});

export const send = mutation({
  args: { body: v.string(), author: v.string() },
  handler: async (ctx, { body, author }) => {
    // Send a new message.
    await ctx.db.insert("messages", { body, author });
    const messages = await ctx.db.query("messages").order("asc").take(100);
    console.log(author !== "assistant", author);
    if (author !== "assistant" && author !== "function") {
      console.log("sending to open ai");
      // Schedule the chat action to run immediately
      await ctx.scheduler.runAfter(0, api.openai.chat, {
        messages: messages.map((message) => {
          return {
            author: message.author,
            body: message.body,
          };
        }),
      });
    }
  },
});

export const like = mutation({
  args: { liker: v.string(), messageId: v.id("messages") },
  handler: async (ctx, { liker, messageId }) => {
    // Send a new message.
    await ctx.db.insert("likes", { liker, messageId });
  },
});

