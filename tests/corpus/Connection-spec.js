"use strict";
var Connection;
var FieldDBObject;
try {
  /* globals FieldDB */
  if (FieldDB) {
    Connection = FieldDB.Connection;
    FieldDBObject = FieldDB.FieldDBObject;
  }
} catch (e) {
  Connection = require("./../../api/corpus/Connection").Connection;
  Connection.URLParser = require("url");
}

Connection = Connection || require("./../../api/corpus/Connection").Connection;
FieldDBObject = FieldDBObject || require("./../../api/FieldDBObject").FieldDBObject;

describe("Connection ", function() {

  describe("construction", function() {

    it("should load", function() {});

  });

  describe("serialization", function() {

    it("should serialize", function() {
      var connection = new Connection().toJSON();
      expect(connection).toEqual({
        fieldDBtype: "Connection",
        corpusUrls: undefined,
        brandLowerCase: "",
        version: connection.version,
        dbname: "",
        pouchname: "",
        website: "",
        title: "",
        titleAsUrl: ""
      });
    });

  });

  describe("knownConnections", function() {

    it("should have some known connections", function() {
      expect(Connection.knownConnections.localhost).toBeDefined();
      expect(Connection.knownConnections.beta).toBeDefined();
      expect(Connection.knownConnections.production).toBeDefined();
      expect(Connection.knownConnections.lingsync).toBeDefined();
      expect(Connection.knownConnections.mcgill).toBeDefined();
      expect(Connection.knownConnections.concordia).toBeDefined();
    });

    it("should be able to add known connections", function() {
      Connection.knownConnections.myproject = new Connection({
        // serverLabel: "myproject"
      });

      expect(Connection.knownConnections.myproject).toEqual(new Connection({
        _fieldDBtype: "Connection",
        _dateCreated: Connection.knownConnections.myproject._dateCreated
      }));
    });

  });

  describe("defaultConnection", function() {
    beforeEach(function() {
      process.env.NODE_ENV = "";
      Connection.otherwise = null;
      FieldDBObject.application = {
        serverLabel: ""
      };
    });

    it("should use beta as a defaultConnection", function() {
      process.env.NODE_ENV = "";
      var connection = Connection.defaultConnection();
      expect(connection instanceof Connection).toBeTruthy();

      expect(connection.serverLabel).toEqual("beta");
    });

    it("should use NODE_ENV as a defaultConnection", function() {
      process.env.NODE_ENV = "production";
      var connection = Connection.defaultConnection();

      expect(connection.serverLabel).toEqual("production");

      process.env.NODE_ENV = "development";
      connection = Connection.defaultConnection();

      expect(connection.serverLabel).toEqual("beta");
    });

    it("should be able to add known connections", function() {
      Connection.knownConnections.myproject = new Connection();
      expect(Connection.knownConnections.myproject).toEqual(new Connection({
        _fieldDBtype: "Connection",
        _dateCreated: Connection.knownConnections.myproject._dateCreated
      }));
    });

    it("should guess default for a server label", function() {
      var connection = Connection.defaultConnection("beta");
      expect(connection.serverLabel).toEqual("beta");
    });

    it("should guess default for userFriendlyServerName", function() {
      var connection = Connection.defaultConnection("McGill ProsodyLab");
      expect(connection.serverLabel).toEqual("mcgill");
    });

    it("should guess default for a chrome app", function() {
      var connection = Connection.defaultConnection("chrome-extension://eeipnabdeimobhlkfaiohienhibfcfpa/user.html");
      expect(connection.serverLabel).toEqual("beta");
    });

    it("should guess default for the prod chrome app", function() {
      var connection = Connection.defaultConnection("chrome-extension://ocmdknddgpmjngkhcbcofoogkommjfoj/user.html");
      expect(connection.serverLabel).toEqual("production");
    });

    it("should guess default for a known url", function() {
      var connection = Connection.defaultConnection("https://something.lingsync.org");
      expect(connection.serverLabel).toEqual("production");
    });

    it("should guess default for a new url", function() {
      var connection = Connection.defaultConnection("https://something.somewhereelse.org");
      expect(connection.serverLabel).toEqual("somewhereelse");
      expect(connection.userFriendlyServerName).toEqual("somewhereelse.org");
    });

    it("should use otherwise for a new chrome app", function() {
      var connection = Connection.defaultConnection("chrome-extension://hdfkfcibgbjomikilhmkdpkcfpecakhd/user.html");
      expect(connection.serverLabel).toEqual("beta");
    });

    it("should use otherwise for an app on the file system", function() {
      var connection = Connection.defaultConnection("file:///Users/somebody/anapp/user.html");
      expect(connection.serverLabel).toEqual("beta");
    });

    it("should use otherwise for userFriendlyServerName which doesnt exist", function() {
      var connection = Connection.defaultConnection("Something it doesnt know");
      expect(connection.serverLabel).toEqual("beta");
    });

    it("should use otherwise if specified", function() {
      var connection = Connection.defaultConnection();
      expect(connection.serverLabel).toEqual("beta");

      Connection.otherwise = "production";
      connection = Connection.defaultConnection();
      expect(connection.serverLabel).toEqual("production");
    });

    it("should use application.serverLabel if specified", function() {
      var connection = Connection.defaultConnection();
      expect(connection.serverLabel).toEqual("beta");

      FieldDBObject.application = {
        serverLabel: "lingsync"
      };
      connection = Connection.defaultConnection();
      expect(connection.serverLabel).toEqual("production");
    });

    it("should correct application.serverLabel if it doesnt exist in known connections", function() {
      FieldDBObject.application = {
        serverLabel: "someghingthatdoesntexistinknownconnections"
      };
      try {
        var connection = Connection.defaultConnection();
        expect(connection.serverLabel).toEqual("beta");
        expect(FieldDBObject.application.serverLabel).toEqual("lingsync_beta");
      } catch (err) {
        expect(err.message).toEqual("I dont know how to connect to someghingthatdoesntexistinknownconnections please report this.");
      }
    });

    it("should be able to get a default connection", function() {
      var connection = Connection.defaultConnection("Localhost");
      expect(connection).toEqual(new Connection({
        _fieldDBtype: "Connection",
        protocol: "https://",
        _domain: "localhost",
        port: "6984",
        path: "",
        serverLabel: "localhost",
        authUrls: ["https://localhost:3183"],
        corpusUrls: ["https://localhost:6984"],
        websiteUrls: ["https://localhost:3182"],
        userFriendlyServerName: "Localhost",
        _brandLowerCase: "localhost",
        _version: connection.version,
        clientUrls: [],
        lexiconUrls: [],
        searchUrls: [],
        audioUrls: [],
        activityUrls: [],
        _dateCreated: connection._dateCreated
      }));
    });
  });

  describe("urls", function() {
    beforeEach(function() {
      process.env.NODE_ENV = "";
      Connection.otherwise = null;
      if (FieldDBObject.application && FieldDBObject.application.serverLabel) {
        FieldDBObject.application.serverLabel = "";
      }
    });

    it("should be able to set an auth url", function() {
      var connection = Connection.defaultConnection("Localhost");
      expect(connection.authUrls).toEqual(["https://localhost:3183"]);
      expect(connection.authUrl).toEqual("https://localhost:3183");

      connection.authUrl = "https://auth.anotherserver.ca";
      expect(connection.authUrl).toEqual("https://auth.anotherserver.ca");
      expect(connection.authUrls).toEqual([
        "https://auth.anotherserver.ca",
        "https://localhost:3183"
      ]);

      connection.authUrl = "https://authdev.fieldlinguist.com:3183";
      expect(connection.authUrl).toEqual("https://auth.lingsync.org");
      expect(connection.authUrls).toEqual([
        "https://auth.lingsync.org",
        "https://auth.anotherserver.ca",
        "https://localhost:3183",
      ]);
      connection.authUrl = "https://localhost:3183";
      expect(connection.authUrl).toEqual("https://localhost:3183");
      expect(connection.authUrls).toEqual([
        "https://localhost:3183",
        "https://auth.lingsync.org",
        "https://auth.anotherserver.ca"
      ]);

      expect(Connection.knownConnections.localhost.authUrls).toEqual(["https://localhost:3183"]);
    });


    it("should be to deduce a dbname if entered invalidly", function() {
      var connection = new Connection();
      connection.dbname = "jenkins-firstcorpus";

      expect(connection.dbname).toEqual("jenkins-firstcorpus");
    });

    it("should be able to figure out a corpus url", function() {
      var connection = Connection.defaultConnection("Localhost");
      connection.dbname = "jenkins-firstcorpus";
      expect(connection.corpusUrl).toEqual("https://localhost:6984/jenkins-firstcorpus");
      expect(connection.corpusUrls).toEqual(["https://localhost:6984/jenkins-firstcorpus"]);

      connection = Connection.defaultConnection();
      connection.corpusUrl = "https://corpusdev.anotherserver.ca/jenkins-firstcorpus";
      expect(connection.corpusUrl).toEqual("https://corpusdev.anotherserver.ca/jenkins-firstcorpus");
      expect(connection.corpusUrls).toEqual([
        "https://corpusdev.anotherserver.ca/jenkins-firstcorpus"
      ]);

      connection.corpusUrl = "https://corpus.example.org/jenkins-firstcorpus";
      expect(connection.corpusUrl).toEqual("https://corpus.example.org/jenkins-firstcorpus");
      expect(connection.corpusUrls).toEqual([
        "https://corpus.example.org/jenkins-firstcorpus",
        "https://corpusdev.anotherserver.ca/jenkins-firstcorpus"
      ]);

      connection.corpusUrl = "https://localhost:6984/jenkins-firstcorpus";
      expect(connection.corpusUrl).toEqual("https://localhost:6984/jenkins-firstcorpus");
      expect(connection.corpusUrls).toEqual([
        "https://localhost:6984/jenkins-firstcorpus",
        "https://corpus.example.org/jenkins-firstcorpus",
        "https://corpusdev.anotherserver.ca/jenkins-firstcorpus"
      ]);
    });

    it("should not use a corpus server url without the dbname", function() {
      var connection = new Connection({
        dbname: "jenkins-firstcorpus",
        corpusUrls: [
          "https://anothertypeofdb.url.somewhere",
          "https://localhost:6984",
          "https://corpusdev.lingsync.org",
          "https://corpus.lingsync.org"
        ]
      });
      expect(connection.corpusUrl).toEqual("https://anothertypeofdb.url.somewhere");

      connection = new Connection({
        dbname: "jenkins-firstcorpus",
        corpusUrls: [
          "https://corpusdev.somewhere.org",
          "https://localhost:6984",
          "https://anothercorpus.url.somewhere",
          "https://corpus.lingsync.org"
        ]
      });
      expect(connection.corpusUrl).toEqual("https://corpusdev.somewhere.org/jenkins-firstcorpus");

      connection = Connection.defaultConnection("Localhost");
      connection.dbname = "jenkins-firstcorpus";
      expect(connection.corpusUrl).toEqual("https://localhost:6984/jenkins-firstcorpus");
    });

    it("should be able to get a couch url from a deprecated connection", function() {
      var connection = new Connection({
        "protocol": "https://",
        "domain": "corpus.example.org",
        "port": "443",
        "pouchname": "lingllama-communitycorpus",
        "path": "",
        "authUrls": ["https://auth.example.org"],
        "userFriendlyServerName": "Example.org",
        "corpusid": "",
        "title": "lingllama-communitycorpus",
        "description": "The details of this corpus are not public.",
        "titleAsUrl": "lingllama-communitycorpus"
      });
      expect(connection.corpusUrl).toEqual("https://corpus.example.org/lingllama-communitycorpus");
    });
  });

  describe("validateIdentifier", function() {
    it("should makes identifiers file safe", function() {
      var validation = Connection.validateIdentifier("a...a");
      expect(validation.identifier).toEqual("a___a");
      expect(validation.original).toEqual("a...a");
      expect(validation.changes[0]).toEqual("You asked to use a...a but we would reccomend using this instead: a___a the following are a list of reason's why.");
      expect(validation.changes[1]).toEqual("You have some characters which web servers wouldn't trust in your identifier.");
      expect(validation.equivalent()).toEqual(false);
    });

    it("should detect unsafe identifiers", function() {
      var validation = Connection.validateIdentifier("a.*-haaha script injection attack attempt file:///some/try");
      console.log(validation);
      expect(validation.identifier).toEqual("a__-haaha_script_injection_attack_attempt_file____some_try");
      expect(validation.original).toEqual("a.*-haaha script injection attack attempt file:///some/try");
      expect(validation.equivalent()).toEqual(false);
    });

    it("should survive undefined", function() {
      var validation = Connection.validateIdentifier();
      expect(validation.identifier).toEqual();
      expect(validation.original).toEqual();
      expect(validation.equivalent()).toEqual(false);
    });

    it("should survive arrays", function() {
      var validation = Connection.validateIdentifier(["some stuff", "also"]);
      console.log(validation);
      expect(validation.identifier).toEqual("some_stuff_also");
      expect(validation.original).toEqual(["some stuff", "also"]);
      expect(validation.equivalent()).toEqual(undefined);
    });

    it("should survive objects", function() {
      var validation = Connection.validateIdentifier({
        "some stuff": "also"
      });
      console.log(validation);
      expect(validation.identifier).toEqual("_object_object_");
      expect(validation.original).toEqual({
        "some stuff": "also"
      });
      expect(validation.equivalent()).toEqual(undefined);
    });
  });
});
