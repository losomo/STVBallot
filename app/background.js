var socket = chrome.socket || chrome.experimental.socket;
var find_servers_running = false;

function start_server(requesting_window) {
    // TODO START SERVICE
    // PUBLISH SERVICE
    socket.create('udp', {}, function(createInfo) {
        var publish_socket = createInfo.socketId;
        socket.bind(publish_socket, '225.0.0.42', 42424, function (result) {
            if (result < 0) console.error(result);
            socket.recvFrom(publish_socket, null, function(recvFromInfo) {
                console.log(recvFromInfo);
            });
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

function find_servers() {
    socket.create('udp', {}, function(socketInfo) {
       var socketId = socketInfo.socketId;
       socket.sendTo(socketId, str2ab("discovering"), '225.0.0.42', 42424, function(writeInfo) {
           if (writeInfo.bytesWritten < 0) console.error(writeInfo);
       });
    });  
}

var messageHandler = function(e) {
    console.log(e.data);
    var command = e.data.command;
    switch(command) {
        case 'start_server':
            start_server(e.source);
            break;
        case 'search_servers':
            if (e.data.data) {
                find_servers();
            }
            else {
                find_servers_running = false;
            }
            break;
        default:
            console.warn(e.data);
    }
};
window.addEventListener('message', messageHandler, false);

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length*2); 
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

var myWin = null;
chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html', {
    'width': 800,
    'height': 500
  }, function(win) {
       myWin = win;
       win.onload = function() {
            win.postMessage({command: 'init'}, '*');
       };
  });
});

