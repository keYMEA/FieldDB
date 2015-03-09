var FieldDBObject = require("./../FieldDBObject").FieldDBObject;
var Diacritics = require("diacritic");
/**
 * @class Corpus connections by default define a set of web services which are used by that corpus,
 *         generally on one server. However, over time and use the user might move their audio data to
 *         different servers etc making it more conveint to provide a configuration object which by
 *         convention is the same server, but can be overriden and read by any of the client apps or
 *         webservices. The central authority for a users" corpus is in the user's details on the
 *         user's authentication server.
 *
 *         This class contains basic functions to manipulate CorpusConection json and schema,
 *         can be used as a shared model between clients and servers
 *
 *
 *
 * @param  {CorpusConnection} optionalRequestedCorpusConnection a object with minimally a dbname
 *
 * @param  {string} dbname                 a name space for the database also a url friendly permanent
 *                                         datbase name (composed of a username and an identifier)
 *
 * @param  {string} corpusid               a uuid of the corpus doc within the database which defines the corpus
 * @param  {string} dbname              @deprecated use dbname instead
 * @param  {string} protocol               @deprecated [https:, http] use corpusUrls instead
 * @param  {string} domain                 @deprecated use corpusUrls instead
 * @param  {string} port                   @deprecated use corpusUrls instead
 * @param  {string} path                   @deprecated use corpusUrls instead was used for McGill server
 *
 * @param  {string} userFriendlyServerName a server name that represents where (most of) the user's resources are
 *                                         for this corpus [Default, Beta, Original, Mcgill Prosody, Localhost, etc]
 *
 * @param  {array} clientUrls              an array of objects {"userFriendlyClientName" :
 *                                         [Spreadsheet, Prototype Online, Localhost Chrome App, Public Url, Acivity Feed, etc],
 *                                         url": completeUrlThatCouldBringSomeoneStraightToThisCorpus}
 * @param  {array} corpusUrls              an array of urls which could "compose" this corpus either by overllapping
 *                                         or by union (for the users who want to have meta corpora which combine multiple
 *                                         smaller corpora, or users with large corpora who would like to shard it across servers)
 * @param  {array} audioUrls               an array of audio/video/speech webservice urls which can be used with
 *                                         this corpus, could be youtube, sound cloud or other storage with or
 *                                         without a one-to-one mapping of namespace with this corpus
 * @param  {array} activityUrls            an array of activity feed urls where this corpus"s activities should
 *                                         be stored (usually only one, but oculd have the active one in
 *                                         position 0 and other older ones afterwards)
 *
 * @param  {array} authUrls                an array of strings indicating where a user could login to get to this corpus
 * @param  {array} lexiconUrls             an array of lexicon urls which can be used with this corpus
 * @param  {array} searchUrls              an array of search urls which can be used with this corpus
 *
 * @name  CorpusConnection
 * @extends FieldDBObject
 * @constructs
 */
var CorpusConnection = function CorpusConnection(options) {
  if (!this._fieldDBtype) {
    this._fieldDBtype = "CorpusConnection";
  }
  this.debug("Constructing CorpusConnection ", options);

  FieldDBObject.apply(this, arguments);
};



CorpusConnection.DEFAULT_LOCALHOST_CONNECTION = function(options) {
  return {
    "corpusid": "TBA",
    "dbname": options.dbname,
    "protocol": "https://",
    "domain": "localhost",
    "port": "3183",
    "path": "",
    "userFriendlyServerName": "Localhost",
    "authUrls": ["https://localhost:3182"],
    "clientUrls": [{
      "userFriendlyClientName": "Spreadsheet",
      "url": "chrome-extension://pcflbgejbbgijjbmaodhhbibegdfecjc/index.html"
    }, {
      "userFriendlyClientName": "Prototype Online",
      "url": "https://localhost:6984/" + options.dbname + "/_design/pages/corpus.html"
    }, {
      "userFriendlyClientName": "Localhost Chrome App",
      "url": "chrome-extension://kaaemcdklbfiiaihlnkmknkgbnkamcbh/user.html#corpus/" + options.dbname
    }, {
      "userFriendlyClientName": "Public Url",
      "url": "https://localhost:3182/" + options.username + "/" + options.corpusidentifier + "/" + options.dbname
    }, {
      "userFriendlyClientName": "Activity Feed",
      "url": "https://localhost:6984/" + options.dbname + "-activity_feed/_design/activity/activity_feed.html"
    }],
    "corpusUrls": ["https://localhost:6984/" + options.dbname],
    "lexiconUrls": ["https://localhost:3185/train/lexicon/" + options.dbname],
    "searchUrls": ["https://localhost:3195/search/" + options.dbname],
    "audioUrls": ["https://localhost:3184/" + options.dbname + "/utterances"],
    "activityUrls": ["https://localhost:6984/" + options.dbname + "-activity_feed"]
  };
};

CorpusConnection.prototype = Object.create(FieldDBObject.prototype, /** @lends CorpusConnection.prototype */ {

  constructor: {
    value: CorpusConnection
  },

  INTERNAL_MODELS: {
    value: {
      corpusid: FieldDBObject.DEFAULT_STRING,
      titleAsUrl: FieldDBObject.DEFAULT_STRING,
      dbname: FieldDBObject.DEFAULT_STRING,

      pouchname: FieldDBObject.DEFAULT_STRING,
      protocol: FieldDBObject.DEFAULT_STRING,
      domain: FieldDBObject.DEFAULT_STRING,
      port: FieldDBObject.DEFAULT_STRING,
      path: FieldDBObject.DEFAULT_STRING,
      userFriendlyServerName: FieldDBObject.DEFAULT_STRING,

      authUrls: FieldDBObject.DEFAULT_ARRAY,
      clientUrls: FieldDBObject.DEFAULT_ARRAY,
      corpusUrls: FieldDBObject.DEFAULT_ARRAY,
      lexiconUrls: FieldDBObject.DEFAULT_ARRAY,
      searchUrls: FieldDBObject.DEFAULT_ARRAY,
      audioUrls: FieldDBObject.DEFAULT_ARRAY,
      activityUrls: FieldDBObject.DEFAULT_ARRAY
    }
  },

  pouchname: {
    get: function() {
      return this.dbname;
    },
    set: function(value) {
      this.todo("pouchname is deprecated, use dbname instead");
      this.dbname = value;
    }
  },

  dbname: {
    get: function() {
      if (this.parent) {
        return this.parent.dbname;
      }
      return this._dbname;
    },
    set: function(value) {
      if (value === this._dbname) {
        return;
      }
      if (!value) {
        delete this._dbname;
        return;
      } else {
        if (typeof value.trim === "function") {
          value = value.trim();
          if (value !== "default") {
            var dbnameValidationResults = CorpusConnection.validateDbnameFormat(value);
            value = dbnameValidationResults.dbname;
            if (dbnameValidationResults.changes.length > 0) {
              console.log(dbnameValidationResults.changes.join("\n "));
              throw new Error(dbnameValidationResults.changes.join("\n "));
            }
            var pieces = value.split("-");
            if (pieces.length !== 2) {
              throw new Error("Database names should be composed of a username-datbaseidentifier" + value);
            }
          }
        }
      }
      this._dbname = value;
    }
  },

  owner: {
    get: function() {
      if (!this.dbname) {
        return;
      }
      var pieces = this.dbname.split("-");
      if (pieces.length !== 2) {
        throw new Error("Database names should be composed of a username-datbaseidentifier" + this.dbname);
      }
      var username = pieces[0];
      return username;
    }
  },

  title: {
    get: function() {
      if (this.parent) {
        this._title = this.parent.title;
      }
      return this._title;
    },
    set: function(value) {
      if (value === this._title) {
        return;
      }
      if (!value) {
        delete this._title;
        return;
      } else {
        if (typeof value.trim === "function") {
          value = value.trim();
        }
      }
      this._title = value;
    }
  },

  titleAsUrl: {
    get: function() {
      if (this.parent) {
        this._titleAsUrl = this.parent.titleAsUrl;
      }

      if (!this._titleAsUrl) {
        if (this.title) {
          this._titleAsUrl = this.sanitizeStringForFileSystem(this._title, "_").toLowerCase();
        } else if (this.dbname) {
          var pieces = this.dbname.split("-");
          if (pieces.length !== 2) {
            throw new Error("Database names should be composed of a username-datbaseidentifier" + this.dbname);
          }
          var corpusidentifier = pieces[0];
          this._titleAsUrl = corpusidentifier;
        }
      }
      return this._titleAsUrl;
    },
    set: function(value) {
      if (value === this._titleAsUrl) {
        return;
      }
      if (!value) {
        delete this._titleAsUrl;
        return;
      } else {
        if (typeof value.trim === "function") {
          value = value.trim();
        }
      }
      this._titleAsUrl = value;
    }
  },

  corpusUrl: {
    get: function() {
      if (!this._corpusUrl && this.domain) {

      }
      return this._corpusUrl || FieldDBObject.DEFAULT_STRING;
    },
    set: function(value) {
      if (value === this._corpusUrl) {
        return;
      }
      if (!value) {
        delete this._corpusUrl;
        return;
      } else {
        if (typeof value.trim === "function") {
          value = value.trim();
        }
      }
      this._corpusUrl = value;
    }
  },

  toJSON: {
    value: function(includeEvenEmptyAttributes, removeEmptyAttributes) {
      this.debug("Customizing toJSON ", includeEvenEmptyAttributes, removeEmptyAttributes);
      includeEvenEmptyAttributes = true;
      var json = FieldDBObject.prototype.toJSON.apply(this, arguments);

      delete json.dateCreated;
      delete json.dateModified;
      delete json.comments;

      // TODO eventually dont include the label and hint but now include it for backward compaitibilty
      json.pouchname = json.dbname = this.dbname || "";
      json.title = this.title || "";
      json.titleAsUrl = this.titleAsUrl || "";
      json.corpusUrl = this.corpusUrl  || "";

      json.fieldDBtype = this.fieldDBtype;
      delete json._type;

      this.debug(json);
      return json;
    }
  }


});

/**
 * Ensures that dbnames can be used inside of corpus identifiers, which are couchdb database names.
 *
 * @param  {string} originalDbname the desired dbname
 * @return {object}                  the resulting dbname, the original dbname, and the changes that were applied.
 */
CorpusConnection.validateDbnameFormat = function(originalDbname) {
  var dbname = originalDbname.toString();
  var changes = [];
  if (dbname.toLowerCase() !== dbname) {
    changes.push("The dbname has to be lowercase so that it can be used in your CouchDB database names.");
    dbname = dbname.toLowerCase();
  }

  if (dbname.split("-").length !== 2) {
    changes.push("We are using - as a reserved symbol in database names, so you can\"t use it in your dbname.");
    dbname = dbname.replace("-", ":::").replace(/-/g, "_").replace(":::", "-");
  }

  if (Diacritics.clean(dbname) !== dbname) {
    changes.push("You have to use ascii characters in your dbnames because your dbname is used in your in web urls, so its better if you can use something more web friendly.");
    dbname = Diacritics.clean(dbname);
  }

  if (dbname.replace(/[^a-z0-9_-]/g, "_") !== dbname) {
    changes.push("You have some characters which web servers wouldn\"t trust in your dbname.");
    dbname = dbname.replace(/[^a-z0-9_]/g, "_");
  }

  if (dbname.length < 4) {
    changes.push("Your dbname is really too short");
  }

  if (changes.length > 0) {
    changes.unshift("You asked to use " + originalDbname + " but that isn\"t a very url friendly dbname, we would reccomend using this instead: " + dbname);
  }

  return {
    "dbname": dbname,
    "original": originalDbname,
    "changes": changes
  };
};



/**
 * This is the base schema of a corpus connection, other fields may be added.
 * This schema is used by the API docs, it should be updated as the above newCorpusConnection changes.
 *
 * @type {Object}
 */
CorpusConnection.baseSchema = {
  "id": "CouchConnection",
  "properties": {
    "corpusid": {
      "type": "string"
    },
    "dbname": {
      "type": "string"
    },
    "pouchname": {
      "type": "string"
    },
    "protocol": {
      "type": "string"
    },
    "domain": {
      "type": "string"
    },
    "port": {
      "type": "string"
    },
    "path": {
      "type": "string"
    },
    "authUrl": {
      "items": {
        "$ref": "string"
      },
      "type": "Array"
    },
    "clientUrls": {
      "items": {
        "$ref": "ClientApp"
      },
      "type": "Array"
    },
    "corpusUrls": {
      "items": {
        "$ref": "string"
      },
      "type": "Array"
    },
    "lexiconUrls": {
      "items": {
        "$ref": "string"
      },
      "type": "Array"
    },
    "searchUrls": {
      "items": {
        "$ref": "string"
      },
      "type": "Array"
    },
    "audioUrls": {
      "items": {
        "$ref": "string"
      },
      "type": "Array"
    }
  }
};


exports.CorpusConnection = CorpusConnection;
