from flask import Flask, request, jsonify
from flask_cors import CORS
from stream_chat import StreamChat
import os
from dotenv import load_dotenv
import openai

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Stream API Configuration
API_KEY = os.getenv("REACT_APP_STREAM_API_KEY")
API_SECRET = os.getenv("STREAM_API_SECRET")
chat_client = StreamChat(api_key=API_KEY, api_secret=API_SECRET)

@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Welcome to the Stream Chat API!"}), 200

@app.route('/create_user', methods=['POST'])
def create_user():
    data = request.json
    user_id = data.get('user_id')
    name = data.get('name')
    image = data.get('image', None)

    user_data = {"id": user_id, "name": name, "image": image}
    chat_client.upsert_user(user_data)
    token = chat_client.create_token(user_id)

    return jsonify({"user_id": user_id, "token": token, "name": name}), 200

@app.route('/create_chat', methods=['POST'])
def create_chat():
    data = request.json
    user1 = data.get('user1')
    user2 = data.get('user2')
    creator_id = data.get('creator_id')

    sorted_users = sorted([user1, user2])
    channel_name = f"{sorted_users[0]}_{sorted_users[1]}"

    chat_client.upsert_users([
        {"id": sorted_users[0], "name": f"User {sorted_users[0]}"},
        {"id": sorted_users[1], "name": f"User {sorted_users[1]}"}
    ])

    channel = chat_client.channel("messaging", channel_name, {
        "members": sorted_users,
        "created_by": creator_id
    })
    channel.create(user_id=creator_id)

    return jsonify({
        "channel_id": channel_name,
        "details": f"Channel between {sorted_users[0]} and {sorted_users[1]}"
    }), 200

@app.route('/ai_chat', methods=['POST'])
def ai_chat():
    data = request.json
    channel_id = data.get('channel_id')
    prompt_1 = data.get('prompt_1', "Hello, how are you?")
    ai_user_1 = {"id": "ai_character_1", "name": "AI Character 1"}
    ai_user_2 = {"id": "ai_character_2", "name": "AI Character 2"}

    chat_client.upsert_users([ai_user_1, ai_user_2])

    channel = chat_client.channel("messaging", channel_id, {"members": [ai_user_1["id"], ai_user_2["id"]]})
    channel.create(user_id=ai_user_1["id"])

    current_speaker = ai_user_1
    current_prompt = prompt_1

    for _ in range(5):
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a character engaging in a conversation."},
                {"role": "user", "content": current_prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )
        ai_response = response.choices[0].message.content.strip()

        channel.send_message({
            "text": ai_response,
        }, user_id=current_speaker['id'])

        current_speaker = ai_user_2 if current_speaker == ai_user_1 else ai_user_1
        current_prompt = ai_response

    return jsonify({"message": "AI conversation completed"}), 200


if __name__ == '__main__':
    app.run(debug=True)
