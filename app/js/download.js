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
var content;
var title;
var extension;

function envelope(c, ext) {
    if (ext == "html") {
        return '<!DOCTYPE html><html><head><meta charset="utf8"/></head><body>' + c
        + "</body></html>";
    }
    else {
        return c;
    }
}

function save_file() {
            var config = {type: 'saveFile', suggestedName: title + "." + extension};
            chrome.fileSystem.chooseFile(config, function(writableEntry) {
                var blob = new Blob([envelope(content, extension)], {type: 'text/plain'});
                writableEntry.createWriter(function(writer) {
                        writer.onerror = function(e) {console.error(e);};
                        writer.onwriteend = function(e) {
                            console.log(e);
                        };
                        writer.write(blob);
                    }, function(e) {console.error(e);});
            });
}

var messageHandler = function(e) {
    var config = e.data;
    title = config.title;
    document.getElementById("title").innerHTML = title;
    content = config.content;
    extension = config.extension;
    document.getElementById("content").innerHTML = config.header + content + config.footer;
    if (config.print) {
        window.print();
    }
};
parent.addEventListener('message', messageHandler, false);

window.addEventListener('load', function() {
        document.getElementById("print").onclick = function() {
            window.print();
        };
        document.getElementById("save").onclick = function() {
            save_file();
        };
    }, false);

