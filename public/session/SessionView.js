define([
    "use!backbone", 
    "use!handlebars", 
    "session/Session",
    "text!session/session.handlebars",
    "libs/Utils"
], function(
    Backbone, 
    Handlebars, 
    Session, 
    sessionTemplate
) {
  var SessionView = Backbone.View.extend(
  /** @lends SessionView.prototype */
  {
    /**
     * @class Session View
     *
     * @extends Backbone.View
     * @constructs
     */
    initialize : function() {
      Utils.debug("SESSION init: " + this.el);
      
      this.model.bind('change', this.render, this);
    },

    /**
     * The underlying model of the SessionView is a Session.
     */
    model : Session,
    
    /**
     * The Handlebars template rendered as the SessionView.
     */
    template: Handlebars.compile(sessionTemplate),
    
    /**
     * Renders the SessionView.
     */
    render : function() {
      Utils.debug("SESSION render: " + this.el);
      
      // Disply the SessionView
      this.setElement("#session");
      $(this.el).html(this.template(this.model.toJSON()));
      
      return this;
    },
    
    /**
     * Initialize the sample Session.
     * 
     * @param {Corpus} corpus The corpus associated with this Session.
     */
    loadSample : function(corpus) {
      this.model.set({
        user : "sapir",
        informant : "Tillohash",
        corpus : corpus,
        language : "Cusco Quechua",
        goal : "Working on naya"
      });
    }
  });
  
  return SessionView;
}); 