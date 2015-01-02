var expect = require("chai").expect;

var path = require("path");
var fs = require("mz/fs");
var exec = require("mz/child_process").exec;

var Sshane = require("../index");

describe("Sshane ", function () {

  var client;

  beforeEach(function * () {
    client = new Sshane({host: "localhost", user: "axelhzf"});
    yield client.connect();
  });

  afterEach(function * ()  {
    yield client.close();
  });

  it("should connect to localhost and exec a command", function* () {
    var result = yield client.exec("ls " + __dirname);
    expect(result).to.eql("index.spec.js\n");
  });

  it("should put and get a file", function* () {
    var tmpPath = path.join(__dirname, "tmp");
    var aFile = path.join(tmpPath, "a");
    exec("rm -rf " +  tmpPath);
    try {
      yield exec("mkdir -p " + tmpPath);
      yield exec("touch " + aFile);
      yield client.put(aFile, path.join(tmpPath, "a-put"));
      yield client.get(aFile, path.join(tmpPath, "a-get"));
      var result = yield client.exec("ls " + tmpPath);
      expect(result).to.eql([
        "a",
        "a-get",
        "a-put"
      ].join("\n") + "\n");
    } finally {
      yield exec("rm -rf " + tmpPath);
    }
  });

});