import React, { useState } from "react";
import {
  Chat,
  Channel,
  Window,
  ChannelHeader,
  MessageInput,
  MessageList,
} from "stream-chat-react";
import { StreamChat } from "stream-chat";
import "stream-chat-react/dist/css/v2/index.css";

const apiKey = process.env.REACT_APP_STREAM_API_KEY;
const client = StreamChat.getInstance(apiKey);

function App() {
  const [userId, setUserId] = useState("");
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);

  const loginUser = async () => {
    try {
      const response = await fetch("http://localhost:5000/create_user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, name: `User ${userId}` }),
      });

      const data = await response.json();
      if (data.token) {
        await client.connectUser(
          { id: userId, name: `User ${userId}` },
          data.token
        );
        setUser(userId);
      }
    } catch (error) {
      console.error("Error logging in user:", error);
    }
  };

  const createChannel = async () => {
    try {
      const otherUser = userId === "alice" ? "bob" : "alice";

      const response = await fetch("http://localhost:5000/create_chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user1: userId,
          user2: otherUser,
          creator_id: userId,
        }),
      });

      const data = await response.json();
      if (data.channel_id) {
        const channel = client.channel("messaging", data.channel_id, {
          members: [userId, otherUser],
        });
        await channel.watch();
        setChannel(channel);
      }
    } catch (error) {
      console.error("Error creating channel:", error);
    }
  };

  const handleLogin = async () => {
    setChannel(null);
    setUser(null);

    await loginUser();
    await createChannel();
  };

  const startAIChat = async () => {
    try {
      if (!channel) {
        alert("No active channel. Please log in and create a channel first.");
        return;
      }
  
      const response = await fetch("http://localhost:5000/ai_chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: channel.id,  // Pass the channel ID to the backend
          prompt_1: "Hello, AI!", // Initial message to start the conversation
        }),
      });
  
      if (response.ok) {
        console.log("AI chat started successfully");
      } else {
        const errorData = await response.json();
        console.error("Error starting AI chat:", errorData.error);
      }
    } catch (error) {
      console.error("Error starting AI chat:", error);
    }
  };
  
  // Add a button to trigger AI chat
  return (
    <div>
      {!user && (
        <div>
          <input
            type="text"
            placeholder="Enter user ID (e.g., alice)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <button onClick={handleLogin}>Login</button>
        </div>
      )}
      {user && !channel && <div>Loading channel...</div>}
      {channel && (
        <Chat client={client} theme="messaging light">
          <Channel channel={channel}>
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageInput />
            </Window>
          </Channel>
          <button onClick={startAIChat}>Start AI Chat - 5 messages</button> {/* AI chat button */}
        </Chat>
      )}
    </div>
  );
}

export default App;
