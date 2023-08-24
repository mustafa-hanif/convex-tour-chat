import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useState } from "react";
import { faker } from "@faker-js/faker";

// For demo purposes. In a real app, you'd have real user data.
const NAME = faker.person.firstName();

const Message = ({ message: _message }: { message: {
  author: string;
  body: string;
} }) => {
  if (_message.author === "function") {
    const objects = JSON.parse(`[${_message.body}]`);
    return <>
      <h2>Here are some amazing properties I found for you</h2>
      <ul>
        {objects.map((item: { id: Key | null | undefined; link: string | undefined; title: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; description: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; price: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; bedrooms: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; }) => {
          return <li key={item.id}>
            <h3><a href={item.link} target="_blank">{item.title}</a></h3>
            <div style={{ marginBottom: '10px' }}>{item.description}</div>
            <div style={{ marginBottom: '10px', color: 'green' }}>Price: {item.price}</div>
            <div style={{ marginBottom: '10px', color: 'gray' }}>Bedrooms: {item.bedrooms}</div>
          </li>
        })}
      </ul>
      </>
  }
  return <>{_message.body}</>;
};
export default function App() {
  const messages = useQuery(api.messages.list);
  const sendMessage = useMutation(api.messages.send);
  const likeMessage = useMutation(api.messages.like);

  const [newMessageText, setNewMessageText] = useState("");

  useEffect(() => {
    // Make sure scrollTo works on button click in Chrome
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 0);
  }, [messages]);

  return (
    <main className="chat">
      <header>
        <h1>Convex Chat</h1>
        <p>
          Connected as <strong>{NAME}</strong>
        </p>
      </header>
      {messages?.map((message) => (
        <article
          key={message._id}
          className={message.author === NAME ? "message-mine" : ""}
        >
          <div>{message.author}</div>

          <p>
            <Message message={message} />
          </p>
        </article>
      ))}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await sendMessage({ body: newMessageText, author: NAME });
          setNewMessageText("");
        }}
      >
        <input
          value={newMessageText}
          onChange={async (e) => {
            const text = e.target.value;
            setNewMessageText(text);
          }}
          placeholder="Write a message…"
        />
        <button type="submit" disabled={!newMessageText}>
          Send
        </button>
      </form>
    </main>
  );
}
