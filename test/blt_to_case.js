var fs = require('fs');

eval(fs.readFileSync('../app/js/data.js')+'');

fs.readdirSync('.').sort().some(function(fname) {
    if (fname.match('\.blt$')) {
        var blt = fs.readFileSync(fname);
        var c = STVDataBLT.bltToCase(blt);
        console.log(JSON.stringify(c, undefined, 2));
        return true;
    }
    return false;
});
