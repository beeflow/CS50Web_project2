import os
import emoji
from datetime import datetime
from html.parser import HTMLParser
from io import StringIO
from typing import List, Dict

from flask import Flask, session, request, render_template, redirect, jsonify
from flask_socketio import SocketIO, emit

from helpers import apology, login_required

MAX_MESSAGES_PER_CHANNEL = 100

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

users: List[str] = []

# {channel_name: [{"username": username, "message": message, "time": now()}, ]}
channels: Dict = {}


class MLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.strict = False
        self.convert_charrefs = True
        self.text = StringIO()

    def handle_data(self, d):
        self.text.write(d)

    def get_data(self):
        return self.text.getvalue()


def strip_tags(html):
    s = MLStripper()
    s.feed(html)
    return s.get_data()


@app.route("/")
@login_required
def index():
    if not users:
        return redirect('/logout')
    return render_template('chat.html')


@app.route("/channels")
@login_required
def get_channels():
    return jsonify({'success': True, 'channels': [channel for channel in channels]})


@app.route("/channels/<channel>")
@login_required
def get_channel(channel: str):
    return jsonify({'success': True, 'messages': channels.get(channel, [])})


@socketio.on('submit channel')
@login_required
def add_channel(data):
    channel: str = data['channel']
    try:
        channels[channel]
        emit('new channel', {'success': False, 'message': 'This channel already exists'}, broadcast=False)
        return
    except KeyError:
        pass

    channels.update({channel: []})
    emit('new channel', {'success': True, 'message': 'New channel added', 'channel': channel}, broadcast=True)


@socketio.on('submit message')
@login_required
def add_message(data):
    channel: str = data.get('channel')
    message: str = data.get('message')

    if not channel or not channel:
        emit('new message', {'success': False, 'message': 'Please type some message ;)'}, broadcast=False)
        return

    username, message, message_time = insert_message(channel=channel, message=message)
    emit(
        'new message',
        {'success': True, 'username': username, 'message': message, 'message_time': message_time, 'channel': channel},
        broadcast=True
    )


@app.route("/logout")
@login_required
def logout():
    # Forget any username
    username: str = session.get('username')

    try:
        username_index: int = users.index(username)
        del users[username_index]
    except ValueError:
        pass

    session.clear()

    # Redirect user to login form
    return redirect("/")


@app.route("/login", methods=['GET', 'POST'])
def login():
    """Log user in"""

    # Forget any user_id
    session.clear()

    # User reached route via GET (as by clicking a link or via redirect)
    if request.method == "GET":
        return render_template("login.html")

    # User reached route via POST (as by submitting a form via POST)
    # Ensure username was submitted
    if not request.form.get("username"):
        return apology("must provide username", 403)

    username: str = request.form.get("username")

    if username in users:
        return apology("This username is already taken...", 403)

    users.append(username)
    if not channels.get('general'):
        channels.update({"general": []})

    session['username'] = username

    # Redirect user to home page
    return redirect("/")


def insert_message(channel, message):
    username = session.get('username')
    message_time = datetime.now().strftime("%a, %d %b %Y %H:%M:%S")
    message = emoji.emojize(strip_tags(message), use_aliases=True)

    if len(channels.get(channel)) < MAX_MESSAGES_PER_CHANNEL:
        channels[channel].append({'username': username, 'message': message, 'time': datetime.now()})
        return username, message, message_time

    channel_messages: list = channels.get(channel)[::-1]
    channel_messages = channel_messages[:MAX_MESSAGES_PER_CHANNEL - 1]
    channel_messages = channel_messages[::-1]

    channel_messages.append({'username': username, 'message': message, 'time': message_time})
    channels[channel] = channel_messages

    return username, message, message_time
