var content;
var title;
function save_file() {
            var config = {type: 'saveFile', suggestedName: title + ".blt"};
            chrome.fileSystem.chooseFile(config, function(writableEntry) {
                var blob = new Blob([content], {type: 'text/plain'});
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
    document.getElementById("content").innerHTML = config.header + content + config.footer;
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

