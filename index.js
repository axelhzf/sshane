var Promise = require("bluebird");
var _ = require("underscore");
var fs = require("mz/fs");
var debug = require("debug")("sshane");
var Connection = require("ssh2");
var read = require('read-all-stream');
var fmt = require("util").format;

function Sshane(options) {
  var privateKeyPath = options.privateKey || process.env['SHH_PRIVATE_KEY'] || process.env['HOME'] + '/.ssh/id_rsa';
  var privateKey = fs.readFileSync(privateKeyPath);
  this.options = _.defaults(options, {
    username: process.env["USER"],
    privateKey: privateKey
  });
  this.connection = new Connection(this.options);
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
        } else {
          debug("Connected to %s", self.options.host);
          self.sftp = sftp;
          resolve();
        }
      });
    });
    self.connection.connect(self.options);
  });
};

Sshane.prototype.exec = function (cmd) {
  var self = this;
  debug("Executing %s", cmd);
  return new Promise(function (resolve, reject) {
    self.connection.exec(cmd, function (err, stream) {
      if (err) reject();

      var resultCode;

      read(stream, 'utf-8', function (err, data) {
        if (err) {
          return reject(new Error(fmt("Error reading stream result from `%s`", cmd)));
        } else if (resultCode !== 0) {
          var e = new Error(fmt("Executing `%s` return error code %d", cmd, resultCode));
          reject(e);
        } else {
          resolve(data);
        }
      });

      stream.on('exit', function (code, signal) {
        resultCode = code;
      }).on('close', function () {
        //debug("stream close");
      }).stderr.on('data', function (data) {
          console.log('STDERR: ' + data);
        });
    });
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