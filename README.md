# SSHane

SSHane is a wrapper over [ssh2](https://github.com/mscdex/ssh2) module. It is based on [shh](https://github.com/zeekay/shh).

# Installation

```
npm install sshane --save
```

# Usage

The client has a promise API so it works very well [co](https://github.com/tj/code)

``` js
var co = require("co");
var SSHane = require("sshane");

co(function* () {
    var client = new SSHane({host: "remoteServer", username: "root"});
    yield client.connect();
    console.log(yield client.exec("ls -alt");
    yield client.put("local/a.txt", "remote/b.txt");
    yield client.get("remote/b.txt", "local/c.txt");
    yield client.close();
}).catch(function (e) {
    console.error(e.stack);
})
```

To enable debug mode

```
DEBUG=sshane node yourscript.js
```