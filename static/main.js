document.addEventListener('DOMContentLoaded', () => {
    let navbarHeight = document.querySelector('#navbar').offsetHeight;
    let chatFormHeight = document.querySelector('#chat-form').offsetHeight;
    let chatTitleHeight = document.querySelector('#chat-title').offsetHeight;
    let addChannelFormHeight = document.querySelector('#add-channel-form').offsetHeight + 70;
    let sidebarHeaderHeight = document.querySelector('.sidebar-header').offsetHeight + 50;

    document.querySelector('#sidebar').style.height = window.innerHeight - navbarHeight + "px";
    document.querySelector('#chats').style.maxHeight = window.innerHeight - navbarHeight - addChannelFormHeight - sidebarHeaderHeight + "px";
    document.querySelector("#chat-window").style.height = window.innerHeight - navbarHeight - chatTitleHeight - chatFormHeight + "px";

    if (document.querySelector('#add-channel-form-group').offsetWidth >= document.querySelector('#sidebar').offsetWidth - 5) {
        document.querySelector('#sidebar-button-text').innerHTML = '';
    }

    const scrollChatWindow = () => {
        let chatWindow = document.querySelector('#chat-window');
        console.log(chatWindow.scrollTop - chatWindow.scrollHeight + chatWindow.offsetHeight);
        if (chatWindow.scrollTop - chatWindow.scrollHeight + chatWindow.offsetHeight > -120) {
            document.querySelector('#chat-window').scrollTop = document.querySelector('#chat-window').scrollHeight;
        }
    }

    const loadChannels = () => {
        const request = new XMLHttpRequest();
        request.open('GET', '/channels');

        request.onload = () => {
            const data = JSON.parse(request.responseText);

            if (data.success) {
                let template = Handlebars.compile(document.querySelector('#channel-name').innerHTML);
                document.querySelector('#chats').innerHTML = template({'values': data.channels});
                initChannelsLinks();
            } else {
                alert(data.error);
            }
        }

        request.send();
    }

    const loadChannel = channel => {
        const request = new XMLHttpRequest();
        request.open('GET', `/channels/${channel}`);

        request.onload = () => {
            const data = JSON.parse(request.responseText);

            if (data.success) {
                let template = Handlebars.compile(document.querySelector('#message-box').innerHTML);
                document.querySelector('#chat-window').innerHTML = template({'values': data.messages});

                document.querySelector('#chat-title').innerHTML = channel;
                document.querySelector('#channel_name').innerHTML = channel;
                localStorage.setItem('currentChannel', channel);
                document.querySelector('#chat-window').dataset.channel = channel;
                document.querySelector('#chat-window').scrollTop = document.querySelector('#chat-window').scrollHeight;
                document.querySelectorAll('.channel-link').forEach(link => {
                    if (link.dataset.channel === channel) {
                        link.style.fontWeight = 'bold';
                        link.style.color = '#6c757d';
                    } else {
                        link.style.fontWeight = 'initial';
                    }
                });
                convertMarkdown();
            } else {
                alert(data.error);
            }
        };

        request.send();
    };

    const initChannelsLinks = () => {
        document.querySelectorAll('.channel-link').forEach(link => {
            const channel = link.dataset.channel;

            link.onclick = () => {
                loadChannel(channel);
                document.querySelector('#chat-window').dataset.channel = channel;
                return false;
            };
        });
    }

    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
    socket.on('connect', () => {
        document.querySelector('#add-channel-form').onsubmit = () => {
            const channelName = document.querySelector('#channel_name').value;
            if (channelName === '') {
                return false;
            }
            socket.emit('submit channel', {'channel': channelName})
            document.querySelector('#channel_name').value = '';
            return false;
        };

        document.querySelector('#send-message-form').onsubmit = () => {
            const channelName = localStorage.getItem('currentChannel');
            const message = document.querySelector('#message').value;

            if (message === '') {
                return false;
            }

            socket.emit('submit message', {'channel': channelName, 'message': message})
            document.querySelector('#message').value = '';
            return false;
        };
    });

    socket.on('new channel', data => {
        if (data.success) {
            let template = Handlebars.compile(document.querySelector('#channel-name').innerHTML);
            document.querySelector('#chats').innerHTML += template({'values': [data.channel]});
            initChannelsLinks();
        }

        alert(data.message)
    });

    socket.on('new message', data => {
        if (!data.success) {
            alert(data.message);
            return;
        }

        let template = Handlebars.compile(document.querySelector('#message-box').innerHTML);
        if (data.channel === document.querySelector('#chat-window').dataset.channel) {
            document.querySelector('#chat-window').innerHTML += template({
                'values': [{
                    "message": data.message,
                    "username": data.username,
                    "time": data.message_time
                }]
            });
            scrollChatWindow();
        } else {
            document.querySelectorAll('.channel-link').forEach(link => {
                if (link.dataset.channel === data.channel) {
                    link.style.color = '#dc3545';
                }
            })
        }
    })

    loadChannels();

    if (!localStorage.getItem('currentChannel')) {
        localStorage.setItem('currentChannel', 'general');
    }

    loadChannel(localStorage.getItem('currentChannel'));
})