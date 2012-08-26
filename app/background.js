function start_server() {
    chrome.experimental.socket.create('udp', '225.0.0.37', 5353, {
        onEvent: function(d) {
            var data = chrome.experimental.socket.read(d.socketId);
            console.log(data);
            }
        },
        function(socketInfo) {
          // The socket is created, now we want to connect to the service
          var socketId = socketInfo.socketId;
          chrome.experimental.socket.connect(socketId, function(result) {
            // We are now connected to the socket so send it some data
            chrome.experimental.socket.write(socketId, arrayBuffer,
              function(sendInfo) {
                console.log("wrote " + sendInfo.bytesWritten);
              }
            );
          });
        }
    );
}

var messageHandler = function(e) {
    console.log(e.data);
    var command = e.data.command;
    switch(command) {
        case 'start_server':
            start_server();
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
       }
  });
});

