var socket = chrome.socket || chrome.experimental.socket;

function start_server(requesting_window) {
    // START SERVICE
    // PUBLISH SERVICE
    socket.create('udp', {}, function(createInfo) {
        var publish_socket = createInfo.socketId;
        socket.bind(publish_socket, '225.0.0.42', 42424, function (result){
            if (result < 0) console.error(result);
            chrome.socket.recvFrom(publish_socket, function(recvFromInfo) {
                console.log(recvFromInfo);
            });

/*
            {
            onEvent: function(d) {
                var data = chrome.experimental.socket.read(d.socketId);
                console.log(data);
                }
            },
            function(socketInfo) {
              console.log('The socket is created, now we want to connect to the service');
              var socketId = socketInfo.socketId;
              socket.connect(socketId, function(result) {
                console.log('We are now connected to the socket so send it some data');
                socket.write(socketId, arrayBuffer,
                  function(sendInfo) {
                    console.log("wrote " + sendInfo.bytesWritten);
                  }
                );
              });
            }
*/
        });
        var cleanup_timer;
        cleanup_timer = setInterval(function(){
                if (requesting_window.closed) {
                    socket.destroy(publish_socket);
                    clearInterval(cleanup_timer);
                }
            },
            5000
        );
    });
}

var messageHandler = function(e) {
    console.log(e.data);
    var command = e.data.command;
    switch(command) {
        case 'start_server':
            start_server(e.source);
            break;
    }
};
window.addEventListener('message', messageHandler, false);

var myWin = null;
chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html', {
    'width': 400,
    'height': 500
  }, function(win) {
       myWin = win;
       win.onload = function() {
            win.postMessage({command: 'init'}, '*');
       };
  });
});

