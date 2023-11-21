import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useState } from "react";
import { faker } from "@faker-js/faker";

// For demo purposes. In a real app, you'd have real user data.
const NAME = faker.person.firstName();

type PropertyType = { 
  id: Key | null | undefined; 
  url: string | undefined; 
  Image: string | undefined;
  Location: string | undefined; 
  Title: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; 
  developer: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; 
  price: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; 
  bedrooms: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; 
}
const Message = ({ message: _message }: { message: {
  author: string;
  body: string;
} }) => {
  if (_message.author === "function") {
    const objects = JSON.parse(`[${_message.body}]`);
    return <>
      <ul>
        {objects.map((item: PropertyType) => {
          return <li key={item.id} style={{ listStyle: "none" }}>
            <img src={item.Image} width={200} />
            <h3><a href={item.url} target="_blank">{item.Title}</a></h3>
            <div style={{ marginBottom: '10px', color: 'black' }}>Price: {item.price}</div>
            <div style={{ marginBottom: '10px', color: 'black' }}>Developer: {item.developer}</div>
            <div style={{ marginBottom: '10px', color: 'black' }}>Bedrooms: {item.bedrooms}</div>
            <div style={{ marginBottom: '10px', color: 'black' }}>Location: {item.Location}</div>
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

  const [newMessageText, setNewMessageText] = useState("");

  useEffect(() => {
    // Make sure scrollTo works on button click in Chrome
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 0);
  }, [messages]);

  return (
    <main className="chat" style={{ marginBottom: 200 }}>
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
        style={{ marginTop: '500px' }}
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
      {messages?.[messages?.length-1]?.author !== 'assistant' ? <span style={{ marginLeft: '20px', fontStyle: "italic" }}>Agent is typing ...</span> : null}
    </main>
  );
}
