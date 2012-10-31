/*
 * Licensed to Václav Novák under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. ElasticSearch licenses this
 * file to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var socket = chrome.socket || chrome.experimental.socket;
var find_servers_running = false;
var server_socket = null;

function start_server(requesting_window) {
    //  START SERVICE
    socket.create('udp', {}, function(createInfo) {
        server_socket = createInfo.socketId;
        socket.bind(server_socket, '0.0.0.0', 42424, function (result) {
            if (result < 0) console.error(result);
            var rfunc;
            rfunc = function(recvFromInfo) {
                requesting_window.postMessage({command: 'client_request', message: recvFromInfo}, '*');
                socket.recvFrom(server_socket, rfunc);
            };
            socket.recvFrom(server_socket, rfunc);
        });
        chrome.runtime.onSuspend.addListener(function(){
            socket.destroy(server_socket);
            console.log("server socket released");
        });
    });
    // PUBLISH SERVICE
    socket.create('udp', {}, function(createInfo) {
        var publish_socket = createInfo.socketId;
        socket.bind(publish_socket, '255.255.255.255', 42425, function (result) {
            if (result < 0) console.error(result);
            var rfunc = function(recvFromInfo) {
                console.warn(recvFromInfo);
                socket.recvFrom(publish_socket, rfunc);
            };
            socket.recvFrom(publish_socket, rfunc);
        });
        chrome.runtime.onSuspend.addListener(function(){
            socket.destroy(publish_socket);
            console.log("publish socket released");
        });
    });
}

function find_servers(requesting_window) {
    socket.create('udp', {}, function(socketInfo) {
       var socketId = socketInfo.socketId;
       socket.bind(socketId, "0.0.0.0", 0, function(res) {
           if(res !== 0) {
            throw('cannot bind socket');
           }
           socket.sendTo(socketId, struct2ab({command: "discovering"}), '225.255.255.255', 42425, function(writeInfo) {
               if (writeInfo.bytesWritten < 0) console.error(writeInfo);
               console.log(writeInfo);
           });
       });
       chrome.runtime.onSuspend.addListener(function(){
           socket.destroy(socketId);
           console.log("search socket released");
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
           socket.sendTo(socketId, struct2ab({command: "hand_shake", name: data.name}), data.server_ip, 42424, function(writeInfo) {
               if (writeInfo.bytesWritten < 0) console.error(writeInfo);
           });
           var rfunc = function(recvFromInfo) {
               requesting_window.postMessage({command: 'server_request', socketId: socketId, message: recvFromInfo}, '*');
               socket.recvFrom(socketId, rfunc);
           };
           socket.recvFrom(socketId, rfunc);
       });
       chrome.runtime.onSuspend.addListener(function(){
           socket.destroy(socketId);
           console.log("client socket released");
       });
    });
}

function send_to_client(data) {
   console.log("To client", data);
   socket.sendTo(server_socket, struct2ab(data.content), data.client.host, data.client.port, function(writeInfo) {
       if (writeInfo.bytesWritten < 0) console.error(writeInfo);
   });
}

function send_to_server(socketId, server_host, data) {
   console.log("To server", data);
   socket.sendTo(socketId, struct2ab(data), server_host, 42424, function(writeInfo) {
       if (writeInfo.bytesWritten < 0) console.error(writeInfo);
   });
}

var messageHandler = function(e) {
    var command = e.data.command;
    console.log(command);
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
        case 'to_server':
            send_to_server(e.data.socketId, e.data.server_host, e.data.data);
            break;
        case 'download_data':
            display_data(e.data.data);
            break;
        case 'search_servers':
            if (e.data.data) {
                find_servers(e.source);
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

function display_data(config) {
    console.log("popping up");
  chrome.app.window.create('download.html', {
    'width':  1000,
    'height': 600
  }, function(win) {
       win.contentWindow.config = config;
  });
}

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
