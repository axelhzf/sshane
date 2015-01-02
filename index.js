var Promise = require("bluebird");
var _ = require("underscore");
var fs = require("mz/fs");
var debug = require("debug")("sshane");
var Connection = require("ssh2");
var read = require('read-all-stream');
var split = require("split");
var fmt = require("util").format;

function Sshane(options) {
  var privateKeyPath = options.privateKey || process.env['SHH_PRIVATE_KEY'] || process.env['HOME'] + '/.ssh/id_rsa';
  var privateKey = fs.readFileSync(privateKeyPath);
  this.options = _.defaults(options, {
    username: process.env["USER"],
    privateKey: privateKey
  });
  this.connection = new Connection(this.options);
  this.startToken = "__SHH_START_TOKEN__";
  this.endToken = "__SHH_END_TOKEN__";
}

Sshane.prototype.connect = function () {
  var self = this;

  debug("Connecting to %s", self.options.host);
  return new Promise(function (resolve, reject) {
    self.connection.on("ready", function () {
      self.connection.sftp(function (err, sftp) {
        if (err) {
          debug("Error getting sftp connection");
          reject(sftp);
          return;
        }
        self.sftp = sftp;
        self.connection.shell(function (err, shell) {
          if (err) {
            debug("Error getting the shell");
            reject();
            return;
          }
          debug("Connected to %s", self.options.host);

          // this code need to be optimized using buffers
          self.shell = shell;
          self.shell.pipe(split());
          var bufs = [];
          self.shell.on("data", function (line) {
            line = line.toString("utf-8");
            if (line.match(self.startToken)) {
              bufs = [];
            }else if (line.match(self.endToken)) {
              shell.emit("result", bufs.join("\n"));
            } else {
              bufs.push(line);
            }
          });
          resolve();
        });
      });
    });
    self.connection.connect(self.options);
  });
};

Sshane.prototype.exec = function (cmd) {
  var self = this;
  debug("Executing %s", cmd);

  return new Promise(function (resolve, reject) {
    var execCmd = fmt("echo %s;%s; echo %s\r\n", self.startToken, cmd, self.endToken);
    self.shell.once("result", function (result) {
      resolve(result);
    });
    self.shell.write(execCmd);
  });
};

Sshane.prototype.close = function () {
  var self = this;
  return new Promise(function (resolve) {
    debug("Closing connection");
    self.connection.end();
    resolve();
  });
};

Sshane.prototype.put = function (localPath, remotePath) {
  var self = this;
  return new Promise(function (resolve, reject) {
    debug("Put %s to %s", localPath, remotePath);
    self.sftp.fastPut(localPath, remotePath, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    })
  });
};

Sshane.prototype.get = function (remotePath, localPath) {
  var self = this;
  return new Promise(function (resolve, reject) {
    debug("Get %s to %s", localPath, remotePath);
    self.sftp.fastGet(remotePath, localPath, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    })
  });
};

module.exports = Sshane;