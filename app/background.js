var socket = chrome.socket || chrome.experimental.socket;
var find_servers_running = false;
var server_socket = null;

function start_server(requesting_window) {
    //  START SERVICE
    socket.create('udp', {}, function(createInfo) {
        server_socket = createInfo.socketId;
        socket.bind(server_socket, '0.0.0.0', 42424, function (result) {
            if (result < 0) console.error(result);
            socket.recvFrom(server_socket, function(recvFromInfo) {
                requesting_window.postMessage({command: 'client_request', message: recvFromInfo}, '*');
            });
        });
        var cleanup_timer;
        cleanup_timer = setInterval(function(){
                if (requesting_window.closed) {
                    socket.destroy(server_socket);
                    console.log("socket released");
                    clearInterval(cleanup_timer);
                }
            },
            5000
        );
    });
    // PUBLISH SERVICE
}

function find_servers() {
    socket.create('udp', {}, function(socketInfo) {
       var socketId = socketInfo.socketId;
       socket.bind(socketId, "0.0.0.0", 0, function(res) {
           if(res !== 0) {               
            throw('cannot bind socket');
           }
       });
       socket.sendTo(socketId, struct2ab({command: "discovering"}), '225.255.255.255', 42424, function(writeInfo) {
           if (writeInfo.bytesWritten < 0) console.error(writeInfo);
           console.log(writeInfo);
       });
    });  
}

function join_server(requesting_window, data) {
    socket.create('udp', {}, function(socketInfo) {
       var socketId = socketInfo.socketId;
       socket.bind(socketId, "0.0.0.0", 0, function(res) {
           if(res !== 0) {               
            throw('cannot bind socket');
           }
       });
       socket.sendTo(socketId, struct2ab({command: "hand_shake", name: data.name}), data.server_ip, 42424, function(writeInfo) {
           if (writeInfo.bytesWritten < 0) console.error(writeInfo);
       });
       socket.recvFrom(socketId, function(recvFromInfo) {
           requesting_window.postMessage({command: 'server_request', message: recvFromInfo}, '*');
       });
    });  
}

function send_to_client(data) {
   console.log("To client", data);
   socket.sendTo(server_socket, struct2ab(data.content), data.client.host, data.client.port, function(writeInfo) {
       if (writeInfo.bytesWritten < 0) console.error(writeInfo);
   });
}

var messageHandler = function(e) {
    console.log(e.data);
    var command = e.data.command;
    switch(command) {
        case 'start_server':
            start_server(e.source);
            break;
        case 'connect_to_host':
            join_server(e.source, e.data.data);
            break;
        case 'to_client':
            send_to_client(e.data.data);
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

function ab2struct(buf) {
  return JSON.parse(String.fromCharCode.apply(null, new Uint16Array(buf)));
}

function struct2ab(struct) {
  var str = JSON.stringify(struct);
  var buf = new ArrayBuffer(str.length*2); 
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html', {
    'width': 800,
    'height': 500
  }, function(win) {
       win.onload = function() {
            win.postMessage({command: 'init'}, '*');
       };
  });
});

