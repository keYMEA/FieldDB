var FieldDBObject = require("./../FieldDBObject").FieldDBObject;

/**
 * @class InsertUnicode allows a user to use IPA symbols, characters other than Roman alphabets, etc..
 *    Users can add new symbols. Added symbols are saved and stored, and will show up next time the user
 *    opens InsertUnicode box.
 *
 * @name  InsertUnicode
 * @extends FieldDBObject
 * @constructs
 */
var InsertUnicode = function InsertUnicode(options) {
  this.debug("Constructing InsertUnicode length: ", options);
  FieldDBObject.apply(this, arguments);
  this._fieldDBtype = "InsertUnicode";
};

InsertUnicode.prototype = Object.create(FieldDBObject.prototype, /** @lends InsertUnicode.prototype */ {
  constructor: {
    value: InsertUnicode
  },

  defaults: {
    value: {
      symbol: "",
      tipa: "",
      useCount: 0
    }
  },
  symbol: {
    get: function() {
      return this._symbol;
    },
    set: function(value) {
      if (value === this._symbol) {
        return;
      }
      if (!value) {
        delete this._symbol;
        return;
      }
      if (typeof value.trim === "function") {
        value = value.trim();
      }
      this._symbol = value.trim();
    }
  }

});
exports.InsertUnicode = InsertUnicode;
