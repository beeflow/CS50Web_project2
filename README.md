# Project 2

**Web Programming with Python and JavaScript**

The project contains a chat application for users. Every user can create a new channel and talk with other users.
The application remembers the selected channel, and after refresh page or reopen browser tab it shows the user last channel. 

## Files
1. static/main.js - javascript for communication with the backend
1. static/style.css - additional CSS for a webpage
1. templates/* templates for login page, sidebar, apology and chat
1. application.py - application file with rest endpoints and SocketIO 

### Personal touch
1. New message on different channel changes the color of its name
1. Supports emoji
1. Notifies all when new channel created