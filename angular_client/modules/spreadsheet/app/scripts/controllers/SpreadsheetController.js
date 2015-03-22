/* globals  FieldDB, Q, sjcl, _, confirm, alert, prompt */
'use strict';
console.log("Declaring Loading the SpreadsheetStyleDataEntryController.");

/**
 * @ngdoc function
 * @name spreadsheetApp.controller:SpreadsheetStyleDataEntryController
 * @description
 * # SpreadsheetStyleDataEntryController
 * Controller of the spreadsheetApp
 */

var SpreadsheetStyleDataEntryController = function($scope, $rootScope, $resource, $filter, $document, Data, md5, $timeout, $modal, $log, $http) {
  console.log(" Loading the SpreadsheetStyleDataEntryController.");
  var debugging = false;
  if (debugging) {
    console.log($scope, $rootScope, $resource, $filter, $document, Data, md5, $timeout, $modal, $log, $http);
  }

  var reRouteUser = function(nextRoute) {
    if (window.location.hash.indexOf(nextRoute) === window.location.hash.length - nextRoute.length) {
      return;
    }
    window.location.assign("#/" + nextRoute);

    // try {
    //   if (!$scope.$$phase) {
    //     $scope.$apply(function() {
    //       console.log("  Re-routing the user to the " + nextRoute + " page");
    //       //http://joelsaupe.com/programming/angularjs-change-path-without-reloading/
    //       $location.path("/" + nextRoute, false);
    //     });
    //   }
    // } catch (e) {
    //   console.warn("reRouteUser generated an erorr", e);
    // }

  };


  if (FieldDB && FieldDB.FieldDBObject && FieldDB.FieldDBObject.application && $rootScope.contextualize) {
    $rootScope.application = $rootScope.application || FieldDB.FieldDBObject.application;
    if ($rootScope.contextualize("locale_faq") === "FAQ") {
      console.log("Locales already loaded.");
    } else {
      FieldDB.FieldDBObject.application.contextualizer.addMessagesToContextualizedStrings("ka", {
        "locale_settings": {
          "message": "პარამეტრები"
        }
      });

      $http.get("locales/en/messages.json").then(function(result) {
        var locales = result.data;
        console.log("Retrieving english localization", locales);
        FieldDB.FieldDBObject.application.contextualizer.addMessagesToContextualizedStrings("en", locales);
      });
      $http.get("locales/es/messages.json").then(function(result) {
        var locales = result.data;
        console.log("Retrieving spanish localization", locales);
        FieldDB.FieldDBObject.application.contextualizer.addMessagesToContextualizedStrings("es", locales);
      });
      $http.get("locales/fr/messages.json").then(function(result) {
        var locales = result.data;
        console.log("Retrieving french localization", locales);
        FieldDB.FieldDBObject.application.contextualizer.addMessagesToContextualizedStrings("fr", locales);
      });
    }
  }

  if (FieldDB && FieldDB.FieldDBObject) {
    FieldDB.FieldDBObject.bug = function(message) {
      if ($rootScope.openNotification) {
        $rootScope.notificationMessage = message;
        $rootScope.openNotification();
      } else {
        alert(message);
      }
    };
  }

  $rootScope.appVersion = "2.47.19.18.21ss";

  // Functions to open/close generic notification modal
  $rootScope.openNotification = function(size, showForgotPasswordInstructions) {
    if (showForgotPasswordInstructions) {
      $rootScope.showForgotPasswordInstructions = showForgotPasswordInstructions;
    } else {
      $rootScope.showForgotPasswordInstructions = false;
    }
    var modalInstance = $modal.open({
      templateUrl: 'views/notification-modal.html',
      controller: 'SpreadsheetNotificationController',
      size: size,
      resolve: {
        details: function() {
          return {};
        }
      }
    });

    modalInstance.result.then(function(any, stuff) {
      if (any || stuff) {
        console.warn("Some parameters were passed by the modal closing, ", any, stuff);
      }
    }, function() {
      $log.info('Export Modal dismissed at: ' + new Date());
    });
  };

  // Functions to open/close welcome notification modal
  $rootScope.openWelcomeNotificationDeprecated = function() {
    // $scope.welcomeNotificationShouldBeOpen = false; //never show this damn modal.
    reRouteUser("welcome");
  };

  document.addEventListener("notauthenticated", function() {
    if ($rootScope.application) {
      $rootScope.application.warn("user isn't able to see anything, show them the welcome page");
    }
    $rootScope.openWelcomeNotificationDeprecated();
  }, false);

  // TEST FOR CHROME BROWSER
  var isChrome = window.navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
  if (!isChrome) {
    $scope.notChrome = window.navigator.userAgent;
  }

  $scope.useAutoGlosser = true;
  try {
    var previousValue = localStorage.getItem("useAutoGlosser");
    if (previousValue === "false") {
      $scope.useAutoGlosser = false;
    }
  } catch (e) {
    console.log("Use autoglosser was not previously set.");
  }

  $scope.$watch('useAutoGlosser', function(newValue, oldValue) {
    console.log("useAutoGlosser", oldValue);
    localStorage.setItem("useAutoGlosser", newValue);
  });

  // Set/get/update user preferences
  var defaultPreferences = {
    "version": $rootScope.appVersion,
    "savedState": {
      "connection": "",
      "username": "",
      "password": ""
    }
  };

  //TODO move the default preferences somewher the SettingsController can access them. for now here is a hack for #1290
  window.defaultPreferences = defaultPreferences;


  $rootScope.updateAvailableFieldsInColumns = function() {
    if (!$rootScope.application || !$rootScope.application.corpus || !$rootScope.application.corpus.datumFields || !$rootScope.application.corpus.datumFields._collection || $rootScope.application.corpus.datumFields._collection.length < 1) {
      console.warn("the corpus isnt ready, not configuring the available fields in columns.");
      return;
    }

    try {
      $scope.judgementHelpText = $rootScope.application.corpus.datumFields.judgement.help;
    } catch (e) {
      console.warn("couldnt get the judgemetn help text for htis corpus for hte data entry hints");
    }

    var preferedSpreadsheetShape = $rootScope.application.corpus.prefs.preferedSpreadsheetShape;

    if (preferedSpreadsheetShape.rows > $rootScope.application.corpus.datumFields._collection.length - 1) {
      preferedSpreadsheetShape.rows = preferedSpreadsheetShape.rows || Math.ceil($rootScope.application.corpus.datumFields._collection.length / preferedSpreadsheetShape.columns);
    }
    if ($rootScope.application.corpus.datumFields.indexOf("syntacticTreeLatex") < 6) {
      $rootScope.application.corpus.upgradeCorpusFieldsToMatchDatumTemplate("fulltemplate");
    }

    if (preferedSpreadsheetShape.columns === 1) {
      $rootScope.fieldsInColumns.first = $rootScope.application.corpus.datumFields._collection.slice(
        1,
        preferedSpreadsheetShape.rows + 1
      );
      $rootScope.fieldsInColumns.second = [];
      $rootScope.fieldsInColumns.third = [];
      $scope.fieldSpanWidthClassName = "span10";
      $scope.columnWidthClass = "span10";
    } else if (preferedSpreadsheetShape.columns === 2) {
      $rootScope.fieldsInColumns.first = $rootScope.application.corpus.datumFields._collection.slice(
        1,
        preferedSpreadsheetShape.rows + 1
      );
      $rootScope.fieldsInColumns.second = $rootScope.application.corpus.datumFields._collection.slice(
        preferedSpreadsheetShape.rows + 1,
        preferedSpreadsheetShape.rows * 2 + 1
      );
      $rootScope.fieldsInColumns.third = [];
      $scope.fieldSpanWidthClassName = "span5";
      $scope.columnWidthClass = "span5";
    } else if (preferedSpreadsheetShape.columns === 3) {
      $rootScope.fieldsInColumns.first = $rootScope.application.corpus.datumFields._collection.slice(
        1,
        preferedSpreadsheetShape.rows + 1
      );
      $rootScope.fieldsInColumns.second = $rootScope.application.corpus.datumFields._collection.slice(
        preferedSpreadsheetShape.rows + 1,
        preferedSpreadsheetShape.rows * 2 + 1
      );
      $rootScope.fieldsInColumns.third = $rootScope.application.corpus.datumFields._collection.slice(
        preferedSpreadsheetShape.rows * 2 + 1,
        preferedSpreadsheetShape.rows * 3 + 1
      );
      $scope.fieldSpanWidthClassName = "span3";
      $scope.columnWidthClass = "span3";
    }
  };

  var updateAndOverwritePreferencesToCurrentVersion = function() {
    $scope.scopePreferences = $scope.scopePreferences || localStorage.getItem('SpreadsheetPreferences') || JSON.stringify(defaultPreferences);
    var prefsWereString;
    try {
      prefsWereString = JSON.parse($scope.scopePreferences);
    } catch (e) {
      console.warn("cant set $scope.scopePreferences, might have already been an object", e);
    }
    if (prefsWereString) {
      $scope.scopePreferences = prefsWereString;
    }

    /** Prior to 1.37 wipe personalization and use current defaults */
    if (!$scope.scopePreferences.version) {
      $rootScope.application.bug("Welcome to the Spring Field Method's session!\n\n We have introduced a new data entry template in this version. \nYou might want to review your settings to change the order and number of fields in the data entry template. Current defaults are set to 2 columns, with 3 rows each.");
      // localStorage.clear(); //why?? left over from debugging?
      // localStorage.setItem('SpreadsheetPreferences', JSON.stringify(defaultPreferences));
      $scope.scopePreferences = JSON.stringify(defaultPreferences);
      console.log("ignoring users preferences.");
    }

    var pieces = $scope.scopePreferences.version.split(".");
    var year = pieces[0],
      week = pieces[1];
    if (year < 2 || week < 47) {
      $scope.scopePreferences = JSON.stringify(defaultPreferences);
      console.log("ignoring users preferences.");
    }

    $scope.scopePreferences.savedState = $scope.scopePreferences.savedState || {};
    if ($rootScope.application.authentication.user &&
      $rootScope.application.authentication.user.username &&
      $rootScope.loginInfo &&
      $rootScope.loginInfo.password &&
      $rootScope.loginInfo.password.length > 2) {

      $scope.scopePreferences.savedState.username = $rootScope.application.authentication.user.username;
      $scope.scopePreferences.savedState.password = sjcl.encrypt("password", $rootScope.loginInfo.password);
    }

    localStorage.setItem('SpreadsheetPreferences', JSON.stringify($scope.scopePreferences));
  };

  // Set scope variables
  $scope.documentReady = false;
  $rootScope.fieldsInColumns = $rootScope.fieldsInColumns || {
    first: [],
    second: [],
    third: [],
    fourth: []
  };
  $scope.orderProp = "dateEntered";
  $rootScope.currentPage = $rootScope.currentPage || 0;
  $scope.reverse = true;
  // $scope.activeDatumIndex = 'newEntry';
  $scope.dataentry = false;
  $scope.searching = false;
  $rootScope.activeSubMenu = 'none';
  $scope.showCreateNewSessionDropdown = false;
  $scope.showEditSessionDetailsDropdown = false;
  $scope.currentDate = new Date();
  $scope.activities = [];
  $rootScope.newRecordHasBeenEdited = false;

  $scope.changeActiveSubMenu = function(subMenu) {
    if ($rootScope.activeSubMenu === subMenu) {
      $rootScope.activeSubMenu = 'none';
    } else if (subMenu === 'none' && $scope.searching === true) {
      return;
    } else {
      $rootScope.activeSubMenu = subMenu;
    }
  };

  $scope.showDataEntry = function() {
    reRouteUser("spreadsheet");
  };

  $scope.navigateVerifySaved = function(itemToDisplay) {
    if ($scope.saved === 'no') {
      $rootScope.notificationMessage = "Please save changes before continuing.";
      $rootScope.openNotification();
    } else if ($scope.saved === "saving") {
      $rootScope.notificationMessage = "Changes are currently being saved.\nPlease wait until this operation is done.";
      $rootScope.openNotification();
    } else if ($rootScope.newRecordHasBeenEdited === true) {
      $rootScope.notificationMessage = "Please click \'Create New\' and then save your changes before continuing.";
      $rootScope.openNotification();
    } else {

      $scope.appReloaded = true;

      $rootScope.loading = false;

      $scope.activeMenu = itemToDisplay;

      switch (itemToDisplay) {
        case "settings":
          $scope.dataentry = false;
          $scope.searching = false;
          $scope.changeActiveSubMenu('none');
          reRouteUser("settings");
          break;
        case "corpusSettings":
          $scope.dataentry = false;
          $scope.searching = false;
          $scope.changeActiveSubMenu('none');
          reRouteUser("corpussettings");
          break;
        case "home":
          $scope.dataentry = false;
          $scope.searching = false;
          $scope.changeActiveSubMenu('none');
          reRouteUser("corpora_list");
          break;
        case "searchMenu":
          $scope.changeActiveSubMenu(itemToDisplay);
          $scope.searching = true;
          $scope.activeDatumIndex = null;
          reRouteUser("spreadsheet");
          break;
        case "faq":
          $scope.dataentry = false;
          $scope.searching = false;
          $scope.changeActiveSubMenu('none');
          reRouteUser("faq");
          break;
        case "none":
          $scope.dataentry = true;
          $scope.searching = false;
          $scope.changeActiveSubMenu('none');
          reRouteUser("spreadsheet");
          break;
        case "register":
          reRouteUser("register");
          break;
        default:
          reRouteUser("spreadsheet");
          $scope.changeActiveSubMenu(itemToDisplay);
      }
    }
  };


  // Get sessions for pouchname; select specific session on saved state load
  $scope.loadSessions = function() {
    /* reset the sessions list if the corpus has changed */
    if ($rootScope.application.corpus && $rootScope.application.corpus.dbname && $rootScope.application.sessionsList && $rootScope.application.sessionsList.docs && $rootScope.application.sessionsList.docs.length > 0 && $rootScope.application.sessionsList.dbname !== $rootScope.application.corpus.dbname) {
      $rootScope.application.previousSessionsList = $rootScope.application.sessionsList;
      $rootScope.application.sessionsList = new FieldDB.DataList({
        title: {
          default: "locale_All_Elicitation_Sessions"
        },
        description: {
          default: "This list was automatically generated by looking in the corpus."
        },
        api: "sessions"
      });
    }

    /* avoid reloading sessions if they have already been loaded for this corpus */
    if ($rootScope.application.sessionsList && $rootScope.application.sessionsList.docs && $rootScope.application.sessionsList.docs.length > 0 && $rootScope.application.sessionsList.dbname === $rootScope.application.corpus.dbname) {
      console.log("sessions are already loaded", $rootScope.application.sessionsList);
      if (!$rootScope.application.corpus.currentSession && $rootScope.application.sessionsList.docs && $rootScope.application.sessionsList.docs._collection && $rootScope.application.sessionsList.docs._collection.length > 0) {
        console.log("   but corpus.currentSession wasnt defined, this should never happen.");
        $rootScope.application.corpus.currentSession = $rootScope.application.sessionsList.docs._collection[$rootScope.application.sessionsList.docs.length - 1];
      }
      return;
    }

    $scope.appReloaded = true;
    $rootScope.loading = true;

    $rootScope.application.sessionsList.dbname = $rootScope.application.corpus.dbname;
    $rootScope.application.corpus.fetchCollection($rootScope.application.sessionsList.api).then(function(results) {
      if ($rootScope.application.sessionsList.dbname !== $rootScope.application.corpus.dbname) {
        console.log("  the session list and corpus dont match they arent from the same databse, not adding these results to the list");
        return;
      }
      if (results.length <= $rootScope.application.sessionsList.length) {
        console.log("  sessions are already loaded", results, $rootScope.application.sessionsList);
        return;
      }

      $rootScope.application.sessionsList.confidential = $rootScope.application.corpus.confidential;
      $rootScope.application.sessionsList.populate(results.map(function(doc) {
        doc.url = $rootScope.application.corpus.url;
        return doc;
      }));

      // $rootScope.application.sessionsList.push({
      //   title: $rootScope.contextualize('locale_view_all_sessions_dropdown') || "All",
      //   _id: "none"
      // });

      /* Set the current session either form the user's last page load or to be the most recent session */
      if (!$rootScope.application.corpus.currentSession && $rootScope.application.sessionsList.docs && $rootScope.application.sessionsList.docs._collection && $rootScope.application.sessionsList.docs._collection.length > 0) {
        $rootScope.application.corpus.currentSession = $rootScope.application.sessionsList.docs._collection[$rootScope.application.sessionsList.docs.length - 1];
        $scope.currentSessionWasNotSetByAHuman = true;
      }
      $scope.newSession = $rootScope.application.corpus.newSession();
      $scope.documentReady = true;
      $rootScope.loading = false;
      $rootScope.saved = "yes";
    }, function(error) {
      $scope.documentReady = true;
      console.log("Error loading sessions.", error);
      $rootScope.application.bug("Error loading your list of elicitation sessions, please try loading page again.");
      $rootScope.loading = false;
    });
  };

  // Fetch data from server and put into template scope
  $scope.loadData = function() {

    console.log("loadData is deprecated.");
    if (true) {
      return;
    }
    console.warn("Clearing search terms");
    $scope.searchHistory = "";
  };

  $scope.loadAutoGlosserRules = function() {
    // Get precedence rules for Glosser
    Data.glosser($rootScope.application.corpus.pouchname)
      .then(function(rules) {
        localStorage.setItem($rootScope.application.corpus.pouchname + "precedenceRules", JSON.stringify(rules));

        // Reduce the rules such that rules which are found in multiple
        // source words are only used/included once.
        var reducedRules = _.chain(rules).groupBy(function(rule) {
          return rule.key.x + "-" + rule.key.y;
        }).value();

        // Save the reduced precedence rules in localStorage
        localStorage.setItem($rootScope.application.corpus.pouchname + "reducedRules",
          JSON.stringify(reducedRules));
      }, function(error) {
        console.log("Error retrieving precedence rules.", error);
      });

    // Get lexicon for Glosser and organize based on frequency
    Data.lexicon($rootScope.application.corpus.pouchname).then(function(lexicon) {
      var sortedLexicon = {};
      for (var i in lexicon) {
        if (lexicon[i].key.gloss) {
          if (sortedLexicon[lexicon[i].key.morpheme]) {
            sortedLexicon[lexicon[i].key.morpheme].push({
              gloss: lexicon[i].key.gloss,
              value: lexicon[i].value
            });
          } else {
            sortedLexicon[lexicon[i].key.morpheme] = [{
              gloss: lexicon[i].key.gloss,
              value: lexicon[i].value
            }];
          }
        }
      }
      var sorter = function(a, b) {
        return b.value - a.value;
      };
      // Sort each morpheme array by descending value
      for (var key in sortedLexicon) {
        sortedLexicon[key].sort(sorter);
      }
      localStorage.setItem(
        $rootScope.application.corpus.pouchname + "lexiconResults", JSON.stringify(sortedLexicon));
    }, function(error) {
      console.log("Error retrieving lexicon.", error);
    });
  };


  $scope.loginUser = function(loginDetails) {
    if (!loginDetails) {
      $rootScope.notificationMessage = "Please login.";
      $rootScope.openNotification();
      return;
    }
    $rootScope.clickSuccess = true;
    $rootScope.loginInfo = $rootScope.loginInfo || {};
    $rootScope.loginInfo.username = loginDetails.username.trim().toLowerCase().replace(/[^0-9a-z]/g, "");
    $rootScope.loginInfo.password = loginDetails.password;
    $rootScope.loginInfo.brand = $rootScope.application.brand;
    $rootScope.loginInfo.couchConnection = $rootScope.application.connection;

    // if (auth.user === "senhorzinho") {
    //   var r = confirm("Hello, developer! Would you like to enter developer mode?");
    //   if (r === true) {
    //     $rootScope.developer = true;
    //   }
    // }
    $rootScope.loading = true;

    $rootScope.application.authentication.resumingSessionPromise.then(function(user) {
      if (!user.rev && !$scope.loginUserFromScratchIsRunning) {
        console.warn("this user doesnt have any details on this device, forcing them to login completely.");
        $scope.loginUserFromScratch(loginDetails);
        return;
      }

    }, /* login failure */ function(reason) {
      $rootScope.notificationMessage = "Error logging in.\n" + reason;
      $rootScope.openNotification(null, true);
      $rootScope.loading = false;
    });
  };


  document.addEventListener("authenticated", function() {
    if (!$rootScope.application.authentication.user || !$rootScope.application.authentication.user.rev) {
      $rootScope.openWelcomeNotificationDeprecated();
      return;
    }
    $scope.corpora = $scope.corpora || new FieldDB.Collection();

    // Update saved state in Preferences
    updateAndOverwritePreferencesToCurrentVersion();

    // if ($rootScope.application.authentication.user.mostRecentIds && $rootScope.application.authentication.user.mostRecentIds.couchConnection && $rootScope.application.authentication.user.mostRecentIds.couchConnection.dbname) {
    //   $scope.selectCorpus($rootScope.application.authentication.user.mostRecentIds.couchConnection);
    // } else {
    // }
    $scope.documentReady = true;
    $rootScope.loading = false;
    try {
      if (!$scope.$$phase) {
        $scope.$apply(); //$digest or $apply
      }
    } catch (e) {
      console.warn("Rendering generated an erorr", e);
    }

  }, false);

  $scope.loginUserFromScratch = function(loginDetails) {
    if ($scope.loginUserFromScratchIsRunning) {
      console.warn("loginUserFromScratch is already running");
      return;
    }
    if (!$rootScope.application || !$rootScope.application.connection || !$rootScope.application.connection.authUrl) {
      $rootScope.application.bug("Unable to log in, please select a server.");
      return;
    }

    $scope.loginUserFromScratchIsRunning = true;

    $rootScope.clickSuccess = true;

    $rootScope.loginInfo = $rootScope.loginInfo || {};
    $rootScope.loginInfo.username = loginDetails.username.trim().toLowerCase().replace(/[^0-9a-z]/g, "");
    $rootScope.loginInfo.password = loginDetails.password;
    $rootScope.loginInfo.authUrl = $rootScope.application.connection.authUrl;

    $rootScope.application.authentication.login($rootScope.loginInfo).then(function() {
      $scope.loginUserFromScratchIsRunning = false;
      $scope.addActivity([{
        verb: "logged in",
        verbicon: "icon-check",
        directobjecticon: "icon-user",
        directobject: "",
        indirectobject: "",
        teamOrPersonal: "personal"
      }], "uploadnow");

    }, function(error) {
      $scope.loginUserFromScratchIsRunning = false;
      $rootScope.application.bug(error.userFriendlyErrors.join(" "));
    });
  };

  $scope.logout = function() {
    localStorage.removeItem('SpreadsheetPreferences');
    $rootScope.application.authentication.logout();
    // $scope.reloadPage();
  };

  $rootScope.setTemplateUsingCorpusPreferedTemplate = function() {
    if (true) {
      console.log("setting templates is deprecated.");
      return;
    }

  };

  $scope.loadCorpusFieldsAndPreferences = function() {
    // Update saved state in Preferences

    $scope.newFieldDatum = $scope.application.corpus.newDatum();
    $scope.loadSessions();
    $scope.loadUsersAndRoles();
  };

  $scope.selectCorpus = function(selectedCorpusConnection) {
    if (!selectedCorpusConnection) {
      $rootScope.notificationMessage = "Please select a database.";
      $rootScope.openNotification();
      return;
    }
    if (typeof selectedCorpusConnection === "string") {
      selectedCorpusConnection = {
        dbname: selectedCorpusConnection
      };
    }
    selectedCorpusConnection.dbname = selectedCorpusConnection.dbname || selectedCorpusConnection.pouchname;
    if (!selectedCorpusConnection.dbname) {
      console.warn("Somethign went wrong, the user selected a corpus connection that had no db info", selectedCorpusConnection);
      return;
    }
    if ($rootScope.application.corpus && $rootScope.application.corpus.dbname !== selectedCorpusConnection.dbname) {
      console.warn("The corpus already existed, and it was not the same as this one, removing it to use this one " + selectedCorpusConnection.dbname);
    }
    if ($scope.corpora && $scope.corpora[selectedCorpusConnection.pouchname]) {
      $rootScope.application.corpus = $scope.corpora[selectedCorpusConnection.pouchname];
      return;
    }

    $rootScope.application.corpus = new FieldDB.Corpus();
    $rootScope.application.corpus.loadOrCreateCorpusByPouchName(selectedCorpusConnection.pouchname).then(function(results) {
      console.log("loaded the corpus", results);
      $scope.corpora.add($rootScope.application.corpus);
      selectedCorpusConnection.parent = $rootScope.application.corpus;

      $scope.addActivity([{
        verb: "opened ",
        verbicon: "icon-eye",
        directobjecticon: "icon-cloud",
        directobject: $rootScope.application.corpus.title,
        indirectobject: "",
        teamOrPersonal: "personal"
      }], "uploadnow");

      $scope.addActivity([{
        verb: "opened ",
        verbicon: "icon-eye",
        directobjecticon: "icon-cloud",
        directobject: $rootScope.application.corpus.title,
        indirectobject: "",
        teamOrPersonal: "team"
      }], "uploadnow");
      $scope.loadCorpusFieldsAndPreferences();

    });
  };

  $rootScope.$watch('corpus.dbname', function(newValue, oldValue) {
    if (!$rootScope.application.corpus || !$rootScope.application.corpus.datumFields || !$rootScope.application.corpus._rev) {
      console.log("the corpus changed but it wasn't ready yet");
      return;
    }
    if (newValue === oldValue && newValue === $rootScope.application.corpus.dbname) {
      console.log("the corpus changed but it was the same corpus, not doing anything.");
      return;
    }
    $scope.loadCorpusFieldsAndPreferences();
  });

  $rootScope.$watch('corpus.currentSession', function(newValue, oldValue) {
    if (!$rootScope.application.corpus || !$rootScope.application.corpus.currentSession || !$rootScope.application.corpus.currentSession.goal) {
      return;
    }

    console.log("corpus.currentSession changed", oldValue);

    $scope.user.mostRecentIds.sessionid = $rootScope.application.corpus.currentSession.id;

    if ($scope.currentSessionWasNotSetByAHuman) {
      $scope.currentSessionWasNotSetByAHuman = false;
    } else {
      reRouteUser("spreadsheet");
    }
    $scope.dataentry = true;
  });

  $scope.changeViewToNewSession = function() {
    $scope.showCreateNewSessionDropdown = true;
    $scope.showEditSessionDetailsDropdown = false;
    $scope.changeActiveSubMenu("none");
    reRouteUser("corpora_list");
  };

  $scope.editSession = function() {
    var r = confirm("Are you sure you want to edit the session information?\nThis could take a while.");
    if (!r) {
      return;
    }
    // Save session record to all its datum
    $rootScope.application.corpus.currentSession.save().then(function() {
      var indirectObjectString = "in <a href='#corpus/" + $rootScope.application.corpus.pouchname + "'>" + $rootScope.application.corpus.title + "</a>";
      $scope.addActivity([{
        verb: "modified",
        verbicon: "icon-pencil",
        directobjecticon: "icon-calendar",
        directobject: "<a href='#session/" + $rootScope.application.corpus.currentSession.id + "'>" + $rootScope.application.corpus.currentSession.goal + "</a> ",
        indirectobject: indirectObjectString,
        teamOrPersonal: "personal"
      }, {
        verb: "modified",
        verbicon: "icon-pencil",
        directobjecticon: "icon-calendar",
        directobject: "<a href='#session/" + $rootScope.application.corpus.currentSession.id + "'>" + $rootScope.application.corpus.currentSession.goal + "</a> ",
        indirectobject: indirectObjectString,
        teamOrPersonal: "team"
      }], "uploadnow");

      // $rootScope.application.corpus.currentSession.docs.map(function(datum) {
      //   datum.session = $rootScope.application.corpus.currentSession;
      //   datum.save().then(function() {
      //       $rootScope.loading = false;
      //     },
      //     function() {
      //       $rootScope.application.bug("There was an error accessing the record.\nTry refreshing the page");
      //     });
      // });
    });
  };

  $scope.deleteEmptySession = function() {
    $scope.deleteSession();
  };

  $scope.deleteSession = function() {
    if (!$rootScope.application.corpus.currentSession || $rootScope.application.corpus.currentSession.id === "none") {
      $rootScope.notificationMessage = "You must select a session to delete.";
      $rootScope.openNotification();
    } else {
      var r = confirm("Are you sure you want to put this session in the trash?");
      if (!r) {
        return;
      }
      $rootScope.application.corpus.currentSession.trashed = "deleted";
      $rootScope.application.corpus.currentSession.save().then(function(response) {
        if (debugging) {
          console.log(response);
        }
        var indirectObjectString = "in <a href='#corpus/" + $rootScope.application.corpus.pouchname + "'>" + $rootScope.application.corpus.title + "</a>";
        $scope.addActivity([{
          verb: "deleted",
          verbicon: "icon-trash",
          directobjecticon: "icon-calendar",
          directobject: "<a href='#session/" + $rootScope.application.corpus.currentSession.id + "'>an elicitation session</a> ",
          indirectobject: indirectObjectString,
          teamOrPersonal: "personal"
        }, {
          verb: "deleted",
          verbicon: "icon-trash",
          directobjecticon: "icon-calendar",
          directobject: "<a href='#session/" + $rootScope.application.corpus.currentSession.id + "'>an elicitation session</a> ",
          indirectobject: indirectObjectString,
          teamOrPersonal: "team"
        }], "uploadnow");

        // Remove session from scope
        $rootScope.application.sessionsList.docs.remove($rootScope.application.corpus.currentSession);
        if ($rootScope.application.sessionsList.docs._collection.length > 0) {
          $rootScope.application.corpus.currentSession = $rootScope.application.sessionsList.docs._collection[$rootScope.application.sessionsList.docs._collection.length - 1];
        } else {
          $rootScope.application.bug("Please create an elicitation session before continuing.");
          reRouteUser("corpora_list");
        }

      }, function(error) {
        console.warn("there was an error deleting a session", error);
        $rootScope.application.bug("Error deleting session.\nTry refreshing the page.");
      });
    }
  };


  $scope.createNewSession = function(newSession) {
    $rootScope.loading = true;
    newSession.user = $rootScope.application.authentication.user.userMask;
    newSession.save().then(function() {

      var indirectObjectString = "in <a href='#corpus/" + $rootScope.application.corpus.pouchname + "'>" + $rootScope.application.corpus.title + "</a>";
      $scope.addActivity([{
        verb: "added",
        verbicon: "icon-pencil",
        directobjecticon: "icon-calendar",
        directobject: "<a href='#session/" + newSession.id + "'>" + newSession.goal + "</a> ",
        indirectobject: indirectObjectString,
        teamOrPersonal: "personal"
      }, {
        verb: "added",
        verbicon: "icon-pencil",
        directobjecticon: "icon-calendar",
        directobject: "<a href='#session/" + newSession.id + "'>" + newSession.goal + "</a> ",
        indirectobject: indirectObjectString,
        teamOrPersonal: "team"
      }], "uploadnow");

      $rootScope.application.corpus.currentSession = $rootScope.application.sessionsList.add(newSession);
      $scope.dataentry = true;
      $rootScope.loading = false;
      reRouteUser("spreadsheet");
    });
  };


  $scope.reloadPage = function() {
    if ($scope.saved === "no") {
      $rootScope.notificationMessage = "Please save changes before continuing.";
      $rootScope.openNotification();
    } else if ($scope.saved === "saving") {
      $rootScope.notificationMessage = "Changes are currently being saved.\nYou may refresh the data once this operation is done.";
      $rootScope.openNotification();
    } else {
      reRouteUser("");
      window.location.reload();
    }
  };


  $scope.deleteRecord = function(datum) {
    if (!datum.id) {
      $rootScope.notificationMessage = "Please save changes before continuing.";
      $rootScope.openNotification();
      $scope.activeDatumIndex = datum;
      // } else if (datum.audioVideo && datum.audioVideo[0]) {
      //   $rootScope.notificationMessage = "You must delete all recordings from this record first.";
      //   $rootScope.openNotification();
      //   $scope.activeDatumIndex = datum;
    } else {
      var r = confirm("Are you sure you want to put this datum in the trash?");
      if (r === true) {

        Data.async($rootScope.application.corpus.pouchname, datum.id)
          .then(function(recordToMarkAsDeleted) {
            recordToMarkAsDeleted.trashed = "deleted";
            var rev = recordToMarkAsDeleted._rev;
            console.log(rev);
            //Upgrade to v1.90
            if (recordToMarkAsDeleted.attachmentInfo) {
              delete recordToMarkAsDeleted.attachmentInfo;
            }
            Data.saveCouchDoc($rootScope.application.corpus.pouchname, recordToMarkAsDeleted)
              .then(function(response) {
                // Remove record from scope
                if (debugging) {
                  console.log(response);
                }
                var indirectObjectString = "in <a href='#corpus/" + $rootScope.application.corpus.pouchname + "'>" + $rootScope.application.corpus.title + "</a>";
                $scope.addActivity([{
                  verb: "deleted",
                  verbicon: "icon-trash",
                  directobjecticon: "icon-list",
                  directobject: "<a href='#data/" + datum.id + "'>a datum</a> ",
                  indirectobject: indirectObjectString,
                  teamOrPersonal: "personal"
                }, {
                  verb: "deleted",
                  verbicon: "icon-trash",
                  directobjecticon: "icon-list",
                  directobject: "<a href='#data/" + datum.id + "'>a datum</a> ",
                  indirectobject: indirectObjectString,
                  teamOrPersonal: "team"
                }], "uploadnow");

                // Remove record from all scope data and update
                var index = $scope.allData.indexOf(datum);
                $scope.allData.splice(index, 1);
                $scope.loadPaginatedData();

                $scope.saved = "yes";
                $scope.activeDatumIndex = null;
              }, function(error) {
                console.warn(error);
                $rootScope.application.bug("Error deleting record.\nTry refreshing the data first by clicking ↻.");
              });
          });
      }
    }
  };


  //TODO what does this do? can any of this be done in the SpreadsheetDatum file instead?
  // Here is what fieldData looks like:
  // {
  //   "field2": "",
  //   "field3": "",
  //   "field1": "hi does this call createRecord"
  // }

  $scope.createRecord = function(fieldDBDatum, $event) {
    if ($event && $event.type && $event.type === "submit" && $event.target) {
      $scope.setDataEntryFocusOn($event.target);
    }

    $rootScope.newRecordHasBeenEdited = false;
    $scope.newFieldDatum = $rootScope.application.corpus.newDatum();


    // Add record to all scope data and update
    // $scope.allData.push(fieldDBDatum); //inserts new data at the bottom for future pagination.
    // $scope.data.push(fieldDBDatum);
    // $scope.loadPaginatedData("newDatum"); //dont change pagination, just show it on this screen.
    $scope.activeDatumIndex = "newEntry";

    $scope.newFieldDatumhasAudio = false;
    $scope.saved = "no";

    try {
      if (!$scope.$$phase) {
        $scope.$digest(); //$digest or $apply
      }
    } catch (e) {
      console.warn("Digest errored", e);
    }
  };

  $rootScope.markNewAsEdited = function() {
    $rootScope.newRecordHasBeenEdited = true;
  };

  $rootScope.markAsNotSaved = function(datum) {
    datum.saved = "no";
    $scope.saved = "no";
  };

  // TODO why does this do somethign with datum tags, can any of this be done in the spreadsheet datum ?
  $rootScope.markAsEdited = function(utterance, datum, $event) {
    if (FieldDB && FieldDB.FieldDBObject) {
      var previous = new FieldDB.Datum(datum.fossil);
      var current = new FieldDB.Datum(datum);
      delete current.fossil;
      delete current.$$hashKey;
      delete current.modifiedByUser;
      delete previous.modifiedByUser;

      delete current._dateModified;
      delete previous._dateModified;

      if (previous.equals(current)) {
        console.log("The datum didnt actually change. Not marking as editied");
        return;
      } else {
        console.warn("+++++++++++++++++++++++++++++++++++++++++++++++++");
        console.warn("@hisakonog turning on debugmode for equality look below here.");
        console.warn("+++++++++++++++++++++++++++++++++++++++++++++++++");
        current.debugMode = true;
        current.debugMode = true;
        previous.equals(current);
        console.warn("+++++++++++++++++++++++++++++++++++++++++++++++++");
        console.warn("@hisakonog look in the above text for what attribute is not equal on the unchanged datum, we can add it to the list of attributes to ignore.");
        console.warn("+++++++++++++++++++++++++++++++++++++++++++++++++");
        // datum.saved = "no";
      }
    }

    datum.dateModified = JSON.parse(JSON.stringify(new Date()));
    datum.timestamp = Date.now();

    // Limit activity to one instance in the case of multiple edits to the same datum before 'save'
    if (!datum.saved || datum.saved === "fresh" || datum.saved === "yes") {

      // Dont Limit users array to unique usernames
      // datum.modifiedByUser.users = _.map(_.groupBy(datum.modifiedByUser.users, function(x) {
      //   return x.username;
      // }), function(grouped) {
      //   return grouped[0];
      // });
      var modifiedByUser = {
        "username": $rootScope.application.authentication.user.username,
        "gravatar": $rootScope.application.authentication.user.gravatar,
        "appVersion": $rootScope.appVersion,
        "timestamp": datum.timestamp
      };

      if (!datum.modifiedByUser || !datum.modifiedByUser.users) {
        datum.modifiedByUser = {
          "users": []
        };
      }
      datum.modifiedByUser.users.push(modifiedByUser);

      // Update activity feed
      var indirectObjectString = "in <a href='#corpus/" + $rootScope.application.corpus.pouchname + "'>" + $rootScope.application.corpus.title + "</a>";
      $scope.addActivity([{
        verb: "modified",
        verbicon: "icon-pencil",
        directobjecticon: "icon-list",
        directobject: "<a href='#corpus/" + $rootScope.application.corpus.pouchname + "/datum/" + datum.id + "'>" + utterance + "</a> ",
        indirectobject: indirectObjectString,
        teamOrPersonal: "personal"
      }, {
        verb: "modified",
        verbicon: "icon-pencil",
        directobjecticon: "icon-list",
        directobject: "<a href='#corpus/" + $rootScope.application.corpus.pouchname + "/datum/" + datum.id + "'>" + utterance + "</a> ",
        indirectobject: indirectObjectString,
        teamOrPersonal: "team"
      }]);
    }
    datum.saved = "no";
    $scope.saved = "no";

    if ($event && $event.type && $event.type === "submit") {
      $scope.selectRow($scope.activeDatumIndex + 1);
    }
  };

  $scope.addComment = function(datum) {
    var newComment = prompt("Enter new comment.");
    if (newComment === "" || newComment === null) {
      return;
    }
    var comment = {};
    comment.text = newComment;
    comment.username = $rootScope.application.authentication.user.username;
    comment.timestamp = Date.now();
    comment.gravatar = $rootScope.application.authentication.user.gravatar || "0df69960706112e38332395a4f2e7542";
    comment.timestampModified = Date.now();
    if (!datum.comments) {
      datum.comments = [];
    }
    datum.comments.push(comment);
    datum.saved = "no";
    $scope.saved = "no";
    datum.dateModified = JSON.parse(JSON.stringify(new Date()));
    datum.timestamp = Date.now();
    datum.lastModifiedBy = $rootScope.application.authentication.user.username;
    // $rootScope.currentPage = 0;
    // $rootScope.editsHaveBeenMade = true;

    var indirectObjectString = "on <a href='#data/" + datum.id + "'><i class='icon-pushpin'></i> " + $rootScope.application.corpus.title + "</a>";
    // Update activity feed
    $scope.addActivity([{
      verb: "commented",
      verbicon: "icon-comment",
      directobjecticon: "icon-list",
      directobject: comment.text,
      indirectobject: indirectObjectString,
      teamOrPersonal: "personal"
    }, {
      verb: "commented",
      verbicon: "icon-comment",
      directobjecticon: "icon-list",
      directobject: comment.text,
      indirectobject: indirectObjectString,
      teamOrPersonal: "team"
    }]);

  };

  $scope.deleteComment = function(comment, datum) {
    if ($rootScope.commentPermissions === false) {
      $rootScope.notificationMessage = "You do not have permission to delete comments.";
      $rootScope.openNotification();
      return;
    }
    if (comment.username !== $rootScope.application.authentication.user.username) {
      $rootScope.notificationMessage = "You may only delete comments created by you.";
      $rootScope.openNotification();
      return;
    }
    var verifyCommentDelete = confirm("Are you sure you want to remove the comment '" + comment.text + "'?");
    if (verifyCommentDelete === true) {
      for (var i in datum.comments) {
        if (datum.comments[i] === comment) {
          datum.comments.splice(i, 1);
        }
      }
    }
  };

  $scope.saveChanges = function() {
    var saveDatumPromises = [];

    var doSomethingElse = function(recordToBeSaved) {
      if (!recordToBeSaved || recordToBeSaved.saved !== "no") {
        //not saving this record
        return;
      }

      var promiseToSaveThisDatum;

      var utteranceForActivityFeed = "Datum";
      if (recordToBeSaved.utterance && recordToBeSaved.utterance !== "") {
        utteranceForActivityFeed = recordToBeSaved.utterance;
      }

      var indirectObjectString = "in <a href='#corpus/" + $rootScope.application.corpus.pouchname + "'>" + $rootScope.application.corpus.title + "</a>";
      var activities = [{
        verb: "added",
        verbicon: "icon-plus",
        directobjecticon: "icon-list",
        indirectobject: indirectObjectString,
        teamOrPersonal: "personal"
      }, {
        verb: "added",
        verbicon: "icon-plus",
        directobjecticon: "icon-list",
        indirectobject: indirectObjectString,
        teamOrPersonal: "team"
      }];

      if (recordToBeSaved.id) {
        activities[0].verb = "modified";
        activities[0].verbicon = "icon-pencil";
        activities[1].verb = "modified";
        activities[1].verbicon = "icon-pencil";
      } else {
        if ($rootScope.application.corpus.currentSession) {
          recordToBeSaved.session = $rootScope.application.corpus.currentSession; //TODO check this, should work since the users only open data by elicitation session.
        } else {
          $rootScope.application.bug("This appears to be a new record, but there isnt a current data entry session to associate it with. Please report this to support@lingsync.org");
        }
      }

      $scope.saved = "saving";
      recordToBeSaved.pouchname = $rootScope.application.corpus.pouchname;
      // spreadsheetDatum.dateModified =
      // recordToBeSaved.timestamp = Date.now(); // these come from the edit function, and from the create function because the save can happen minutes or hours after the user actually modifies/creates the datum.
      promiseToSaveThisDatum = Data.saveSpreadsheetDatum(recordToBeSaved);
      saveDatumPromises.push(promiseToSaveThisDatum);

      promiseToSaveThisDatum
        .then(function(spreadSheetDatum) {
          spreadSheetDatum.saved = "yes";
          activities[0].directobject = activities[1].directobject = "<a href='#corpus/" + $rootScope.application.corpus.pouchname + "/datum/" + spreadSheetDatum.id + "'>" + utteranceForActivityFeed + "</a> ";
          $scope.addActivity(activities, "uploadnow");
        }, function(reason) {
          console.log(reason);
          $scope.saved = "no";
          $rootScope.application.bug("There was an error saving a record. " + reason);
          // wish this would work:
          // $rootScope.notificationMessage = "There was an error saving a record. " + reason;
          // $rootScope.openNotification();
          // return;
        });

    };
    for (var index in $scope.allData) {
      console.log(index);
      if ($scope.allData.hasOwnProperty(index)) {
        doSomethingElse($scope.allData[index]);
      }
    }
    Q.all(saveDatumPromises).done(function(success, reason) {
      if (reason) {
        console.log(reason);
        $scope.saved = "no";
        $rootScope.application.bug("There was an error saving one or more records. Please try again.");
      } else {
        if ($scope.saved === "saving") {
          $scope.saved = "yes";
        }
      }
    });
  };


  // Set auto-save interval for 5 minutes
  var autoSave = window.setInterval(function() {
    if ($scope.saved === "no") {
      $scope.saveChanges();
    } else {
      // TODO Dont need to FIND BETTER WAY TO KEEP SESSION ALIVE;
      // if ($rootScope.loginInfo) {
      //   Data.login($rootScope.application.authentication.user.username,
      //     $rootScope.loginInfo.password);
      // }
    }
  }, 300000);
  if (debugging) {
    console.log("autoSave was defined but not used", autoSave);
  }


  $scope.selectRow = function(scopeIndex, targetDatumEntryDomElement) {
    // Do nothing if clicked row is currently selected
    if ($scope.activeDatumIndex === scopeIndex) {
      return;
    }
    if ($scope.searching !== true) {
      if ($rootScope.newRecordHasBeenEdited !== true) {
        $scope.activeDatumIndex = scopeIndex;
      } else {
        $scope.activeDatumIndex = scopeIndex + 1;
        $scope.createRecord($scope.newFieldDatum);
      }
      if (targetDatumEntryDomElement) {
        $scope.setDataEntryFocusOn(targetDatumEntryDomElement);
      }
    }
  };

  $scope.editSearchResults = function(scopeIndex) {
    $scope.activeDatumIndex = scopeIndex;
  };

  $scope.selectNone = function() {
    $scope.activeDatumIndex = undefined;
  };

  $scope.loadDataEntryScreen = function() {
    $scope.dataentry = true;
    $scope.navigateVerifySaved('none');
    $scope.loadData($scope.application.corpus.currentSession.id);
  };

  $scope.clearSearch = function() {
    $scope.searchTerm = '';
    $scope.searchHistory = null;
    $scope.loadData($scope.application.corpus.currentSession.id);
  };
  if (FieldDB && FieldDB.DatumField) {
    $scope.addedDatumField = new FieldDB.DatumField({
      id: Date.now(),
      label: "New Field " + Date.now()
    });
  } else {
    $scope.addedDatumField = {
      id: Date.now(),
      label: "New Field " + Date.now()
    };
  }

  $scope.updateCorpusDetails = function(corpus) {
    console.log("Saving corpus details, corpus passed in", corpus);

    $rootScope.application.corpus.save($rootScope.application.authentication.user).then(function(result) {
      console.log("Saved corpus details ", result);
      $scope.updateAvailableFieldsInColumns();
      var indirectObjectString = "in <a href='#corpus/" + $rootScope.application.corpus.pouchname + "'>" + $rootScope.application.corpus.title + "</a>";
      $scope.addActivity([{
        verb: "modified",
        verbicon: "icon-pencil",
        directobjecticon: "icon-cloud",
        directobject: "<a href='#corpus/" + $rootScope.application.corpus.pouchname + "'>" + $rootScope.application.corpus.title + "</a> ",
        indirectobject: indirectObjectString,
        teamOrPersonal: "personal"
      }, {
        verb: "modified",
        verbicon: "icon-pencil",
        directobjecticon: "icon-cloud",
        directobject: "<a href='#corpus/" + $rootScope.application.corpus.pouchname + "'>" + $rootScope.application.corpus.title + "</a> ",
        indirectobject: indirectObjectString,
        teamOrPersonal: "team"
      }], "uploadnow");
    }, function(reason) {
      console.log("Error saving corpus details.", reason);
      $rootScope.application.bug("Error saving corpus details.");
    });
  };

  $scope.runSearch = function(searchTerm) {
    // Create object from fields displayed in scope to later be able to
    // notify user if search result is from a hidden field
    var fieldsInScope = {};
    var mapFieldsToTrue = function(datumField) {
      fieldsInScope[datumField.id] = true;
    };
    for (var column in $scope.fieldsInColumns) {
      if ($scope.fieldsInColumns.hasOwnProperty(column)) {
        $scope.fieldsInColumns[column].map(mapFieldsToTrue);
      }
    }
    fieldsInScope.judgement = true;


    /* make the datumtags and comments always true since its only the compact view that doesnt show them? */

    fieldsInScope.comments = true;

    fieldsInScope.dateModified = true;
    // fieldsInScope.lastModifiedBy = true;

    if ($scope.searchHistory) {
      $scope.searchHistory = $scope.searchHistory + " > " + searchTerm;
    } else {
      $scope.searchHistory = searchTerm;
    }
    // Converting searchTerm to string to allow for integer searching
    searchTerm = searchTerm.toString().toLowerCase();
    var newScopeData = [];

    var thisDatumIsIN = function(spreadsheetDatum) {
      var dataString;

      for (var fieldkey in spreadsheetDatum) {
        // Limit search to visible data
        if (spreadsheetDatum[fieldkey] && fieldsInScope[fieldkey] === true) {
          if (fieldkey === "datumTags") {
            dataString = JSON.stringify(spreadsheetDatum.datumTags);
            dataString = dataString.toString().toLowerCase();
            if (dataString.indexOf(searchTerm) > -1) {
              return true;
            }
          } else if (fieldkey === "comments") {
            for (var j in spreadsheetDatum.comments) {
              for (var commentKey in spreadsheetDatum.comments[j]) {
                dataString = spreadsheetDatum.comments[j][commentKey].toString();
                if (dataString.indexOf(searchTerm) > -1) {
                  return true;
                }
              }
            }
          } else if (fieldkey === "dateModified") {
            //remove alpha characters from the date so users can search dates too, but not show everysearch result if the user is looking for "t" #1657
            dataString = spreadsheetDatum[fieldkey].toString().toLowerCase().replace(/[a-z]/g, " ");
            if (dataString.indexOf(searchTerm) > -1) {
              return true;
            }
          } else {
            dataString = spreadsheetDatum[fieldkey].toString().toLowerCase();
            if (dataString.indexOf(searchTerm) > -1) {
              return true;
            }
          }
        }
      }
      return false;
    };

    // if (!$scope.application.corpus.currentSession.id) {
    // Search allData in scope
    for (var i in $scope.allData) {
      // Determine if record should be included in session search
      var searchTarget = false;
      if (!$scope.application.corpus.currentSession.id) {
        searchTarget = true;
      } else if ($scope.allData[i].session._id === $scope.application.corpus.currentSession.id) {
        searchTarget = true;
      }
      if (searchTarget === true) {
        if (thisDatumIsIN($scope.allData[i])) {
          newScopeData.push($scope.allData[i]);
        }
      }
    }

    if (newScopeData.length > 0) {
      $scope.allData = newScopeData;
      if (!$rootScope.application.authentication.user || $rootScope.application.authentication.user.prefs || $rootScope.application.authentication.user.prefs.numVisibleDatum) {
        console.warn("the user isnt loaded, shouldnt be loading any data.");
        return;
      }
      var resultSize = $rootScope.application.authentication.user.prefs.numVisibleDatum;
      if (resultSize === "all") {
        resultSize = $scope.allData.length;
      }
      $scope.data = $scope.allData.slice(
        0, resultSize);
    } else {
      $rootScope.notificationMessage = "No records matched your search.";
      $rootScope.openNotification();
    }
  };

  $scope.selectAll = function() {
    for (var i in $scope.allData) {
      if (!$scope.application.corpus.currentSession.id) {
        $scope.allData[i].checked = true;
      } else if ($scope.allData[i].session._id === $scope.application.corpus.currentSession.id) {
        $scope.allData[i].checked = true;
      }
    }
  };

  $scope.exportResults = function(size) {

    var results = $filter('filter')($scope.allData, {
      checked: true
    });
    if (results.length > 0) {
      $scope.resultsMessage = results.length + " Record(s):";
      $scope.results = results;
    } else {
      $scope.resultsMessage = "Please select records to export.";
    }
    console.log(results);

    var modalInstance = $modal.open({
      templateUrl: 'views/export-modal.html',
      controller: 'SpreadsheetExportController',
      size: size,
      resolve: {
        details: function() {
          return {
            resultsMessageFromExternalController: $scope.resultsMessage,
            resultsFromExternalController: $scope.results,
          };
        }
      }
    });

    modalInstance.result.then(function(any, stuff) {
      if (any || stuff) {
        console.warn("Some parameters were passed by the modal closing, ", any, stuff);
      }
    }, function() {
      $log.info('Export Modal dismissed at: ' + new Date());
    });
  };


  // Add activities to scope object, to be uploaded when 'SAVE' is clicked
  $scope.addActivity = function(activityArray, uploadnow) {
    Data.blankActivityTemplate()
      .then(function(activitySampleJSON) {

        for (var index = 0; index < activityArray.length; index++) {
          var newActivityObject = JSON.parse(JSON.stringify(activitySampleJSON));
          var bareActivityObject = activityArray[index];

          bareActivityObject.verb = bareActivityObject.verb.replace("href=", "target='_blank' href=");
          bareActivityObject.directobject = bareActivityObject.directobject.replace("href=", "target='_blank' href=");
          bareActivityObject.indirectobject = bareActivityObject.indirectobject.replace("href=", "target='_blank' href=");

          newActivityObject.appVersion = $rootScope.appVersion;
          newActivityObject.verb = bareActivityObject.verb;
          newActivityObject.verbicon = bareActivityObject.verbicon;
          newActivityObject.directobjecticon = bareActivityObject.directobjecticon;
          newActivityObject.directobject = bareActivityObject.directobject;
          newActivityObject.indirectobject = bareActivityObject.indirectobject;
          newActivityObject.teamOrPersonal = bareActivityObject.teamOrPersonal;
          newActivityObject.user.username = $rootScope.application.authentication.user.username;
          newActivityObject.user.gravatar = $rootScope.application.authentication.user.gravatar || "0df69960706112e38332395a4f2e7542";
          newActivityObject.user.id = $rootScope.application.authentication.user.username;
          newActivityObject.user._id = $rootScope.application.authentication.user.username; //TODO remove this too eventually...
          newActivityObject.dateModified = JSON.parse(JSON.stringify(new Date())); //TODO #1109 eventually remove date modified?
          newActivityObject.timestamp = Date.now();

          $scope.activities.push(newActivityObject);

        }
        if (uploadnow) {
          $scope.uploadActivities();
        }
      });
  };

  $scope.uploadActivities = function() {
    // Save activities
    if ($scope.activities.length > 0) {
      var doSomethingDifferent = function(index) {
        if ($scope.activities[index]) {
          var activitydb;
          if ($scope.activities[index].teamOrPersonal === "team") {
            activitydb = $rootScope.application.corpus.pouchname + "-activity_feed";
          } else {
            activitydb = $rootScope.application.authentication.user.username + "-activity_feed";
          }
          $scope.activities[index].dbname = activitydb;
          $scope.activities[index].url = FieldDB.Database.prototype.BASE_DB_URL + "/" + activitydb;
          new FieldDB.Activity($scope.activities[index])
            .save()
            .then(function(response) {
                if (debugging) {
                  console.log("Saved new activity", response);
                }
                // Deleting so that indices in scope are unchanged
                delete $scope.activities[index];
              },
              function(reason) {
                console.warn("There was an error saving the activity. ", $scope.activities[index], reason);
                $rootScope.application.bug("There was an error saving the activity. ");
                $scope.saved = "no";
              });
        }
      };
      for (var i = 0; i < $scope.activities.length; i++) {
        doSomethingDifferent(i);
      }
    }
  };


  $scope.registerNewUser = function(newLoginInfo) {
    $rootScope.loading = true;
    $rootScope.application.authentication.register(newLoginInfo)
      .then(function(newUser) {
        $rootScope.loading = false;

        var preferences = window.defaultPreferences;
        console.warn("TODO test registerNewUser", newUser);
        preferences.savedState.connection = newUser.corpora[0];
        preferences.savedState.username = newUser.username;
        preferences.savedState.password = sjcl.encrypt("password", newLoginInfo.password);
        localStorage.setItem('SpreadsheetPreferences', JSON.stringify(preferences));

      }, function(err) {
        $rootScope.loading = false;
        console.warn(err);

        var message = "";
        if (err.status === 0) {
          message = "are you offline?";
          if ($rootScope.application.brand === "mcgill" || $rootScope.application.brand === "concordia" || $rootScope.application.brand === "localhost") {
            message = "Cannot contact " + $rootScope.application.connection.userFriendlyServerName + " server, have you accepted the server's security certificate? (please refer to your registration email)";
          }
        }
        if (err && err.status >= 400 && err.data.userFriendlyErrors) {
          message = err.data.userFriendlyErrors.join(" ");
        } else {
          message = "Cannot contact " + $rootScope.application.connection.userFriendlyServerName + " server, please report this.";
        }
        $rootScope.application.bug(message);

        window.setTimeout(function() {
          window.open("https://docs.google.com/forms/d/18KcT_SO8YxG8QNlHValEztGmFpEc4-ZrjWO76lm0mUQ/viewform");
        }, 1500);

      });
  };


  $scope.createNewCorpus = function(newCorpusInfo) {
    if (!newCorpusInfo) {
      $rootScope.notificationMessage = "Please enter a corpus name.";
      $rootScope.openNotification();
      return;
    }

    $rootScope.loading = true;
    var dataToPost = {};
    dataToPost.username = $rootScope.application.authentication.user.username.trim();
    dataToPost.password = $rootScope.loginInfo.password.trim();
    dataToPost.title = newCorpusInfo.title;

    if (dataToPost.title !== "") {
      // Create new corpus
      $rootScope.application.authentication.newCorpus(dataToPost)
        .then(function(response) {

          // Add new corpus to scope
          var newCorpusConnection = {};
          newCorpusConnection.pouchname = response.corpus.pouchname;
          newCorpusConnection.title = response.corpus.title;
          var directObjectString = "<a href='#corpus/" + response.corpus.pouchname + "'>" + response.corpus.title + "</a>";
          $scope.addActivity([{
            verb: "added",
            verbicon: "icon-plus",
            directobjecticon: "icon-cloud",
            directobject: directObjectString,
            indirectobject: "",
            teamOrPersonal: "personal"
          }], "uploadnow");

          alert("todo test this");
          $rootScope.application.authentication.user.corpora.unshift(newCorpusConnection);
          $scope.selectCorpus(newCorpusConnection);
          $rootScope.loading = false;
          reRouteUser("");
        });
    } else {
      $rootScope.notificationMessage = "Please verify corpus name.";
      $rootScope.openNotification();
      $rootScope.loading = false;
    }
  };

  $scope.loadUsersAndRoles = function() {
    if (!$rootScope.application.authentication.user || !$rootScope.application.authentication.user.roles) {
      console.warn("strangely the user isnt defined, or ready right now.");
      return;
    }
    if ($scope.loadedPermissionsForTeam === $rootScope.application.corpus.pouchname) {
      console.log("already loaded permissions for this team");
      return;
    }
    // Get all users and roles (for this corpus) from server

    var dataToPost = {};
    dataToPost.username = $rootScope.loginInfo.username;
    dataToPost.password = $rootScope.loginInfo.password;

    $rootScope.application.corpus.loadPermissions(dataToPost)
      .then(function(users) {
        if (!users) {
          console.log("User doesn't have access to roles.");
          users = {
            allusers: []
          };
        }
        // for (var i in users.allusers) {
        //   if (users.allusers[i].username === $rootScope.loginInfo.username) {
        //     $rootScope.application.authentication.user.gravatar = users.allusers[i].gravatar;
        //   }
        // }

        $scope.users = users;

        // Get privileges for logged in user
        if (!$rootScope.application.authentication.user || !$rootScope.application.authentication.user.roles) {
          console.warn("strangely the user isnt defined, or ready right now.");
          return;
        }
        $rootScope.admin = false;
        $rootScope.readPermissions = false;
        $rootScope.writePermissions = false;
        $rootScope.commentPermissions = false;
        $scope.loadedPermissionsForTeam = $rootScope.application.corpus.pouchname;
        if ($rootScope.application.authentication.user.roles.indexOf($rootScope.application.corpus.pouchname + "_admin") > -1) {
          $rootScope.admin = true;
        }
        if ($rootScope.application.authentication.user.roles.indexOf($rootScope.application.corpus.pouchname + "_reader") > -1) {
          $rootScope.readPermissions = true;
        }
        if ($rootScope.application.authentication.user.roles.indexOf($rootScope.application.corpus.pouchname + "_writer") > -1) {
          $rootScope.writePermissions = true;
        }
        if ($rootScope.application.authentication.user.roles.indexOf($rootScope.application.corpus.pouchname + "_commenter") > -1) {
          $rootScope.commentPermissions = true;
        }
        if (!$rootScope.commentPermissions && $rootScope.readPermissions && $rootScope.writePermissions) {
          $rootScope.commentPermissions = true;
        }
      });
  };

  $scope.updateUserRoles = function(newUserRoles) {
    if (!newUserRoles || !newUserRoles.usernameToModify) {
      $rootScope.notificationMessage = "Please select a username.";
      $rootScope.openNotification();
      return;
    }

    if (!newUserRoles.role) {
      $rootScope.notificationMessage = "You haven't selected any roles to add to " + newUserRoles.usernameToModify + "!\nPlease select at least one role..";
      $rootScope.openNotification();
      return;
    }

    $rootScope.loading = true;
    var rolesString = "";
    switch (newUserRoles.role) {
      /*
            NOTE THESE ROLES are not accurate reflections of the db roles,
            they are a simplification which assumes the
            admin -> writer -> commenter -> reader type of system.

            Infact some users (technical support or project coordinators) might be only admin,
            and some experiment participants might be only writers and
            cant see each others data.

            Probably the clients wanted the spreadsheet roles to appear implicative since its more common.
            see https://github.com/OpenSourceFieldlinguistics/FieldDB/issues/1113
          */
      case "admin":
        newUserRoles.admin = true;
        newUserRoles.reader = true;
        newUserRoles.commenter = true;
        newUserRoles.writer = true;
        rolesString += " Admin";
        break;
      case "read_write":
        newUserRoles.admin = false;
        newUserRoles.reader = true;
        newUserRoles.commenter = true;
        newUserRoles.writer = true;
        rolesString += " Writer Reader";
        break;
      case "read_only":
        newUserRoles.admin = false;
        newUserRoles.reader = true;
        newUserRoles.commenter = false;
        newUserRoles.writer = false;
        rolesString += " Reader";
        break;
      case "read_comment_only":
        newUserRoles.admin = false;
        newUserRoles.reader = true;
        newUserRoles.commenter = true;
        newUserRoles.writer = false;
        rolesString += " Reader Commenter";
        break;
      case "write_only":
        newUserRoles.admin = false;
        newUserRoles.reader = false;
        newUserRoles.commenter = true;
        newUserRoles.writer = true;
        rolesString += " Writer";
        break;
    }

    newUserRoles.pouchname = $rootScope.application.corpus.pouchname;

    var dataToPost = {};
    dataToPost.username = $rootScope.application.authentication.user.username.trim();
    dataToPost.password = $rootScope.loginInfo.password.trim();

    dataToPost.userRoleInfo = newUserRoles;

    Data.updateroles(dataToPost)
      .then(function(response) {
        if (debugging) {
          console.log(response);
        }
        var indirectObjectString = "on <a href='#corpus/" + $rootScope.application.corpus.pouchname + "'>" + $rootScope.application.corpus.title + "</a> as " + rolesString;

        $scope.loadedPermissionsForTeam = "";
        $scope.loadUsersAndRoles();

        $scope.addActivity([{
          verb: "modified",
          verbicon: "icon-pencil",
          directobjecticon: "icon-user",
          directobject: "<a href='http://lingsync.org/" + newUserRoles.usernameToModify + "'>" + newUserRoles.usernameToModify + "</a> ",
          indirectobject: indirectObjectString,
          teamOrPersonal: "personal"
        }, {
          verb: "modified",
          verbicon: "icon-pencil",
          directobjecticon: "icon-user",
          directobject: "<a href='http://lingsync.org/" + newUserRoles.usernameToModify + "'>" + newUserRoles.usernameToModify + "</a> ",
          indirectobject: indirectObjectString,
          teamOrPersonal: "team"
        }], "uploadnow");

        document.getElementById("userToModifyInput").value = "";
        $rootScope.loading = false;
        $scope.loadUsersAndRoles();
      }, function(error) {
        console.warn(error);
        $rootScope.loading = false;
      });
  };

  $scope.removeAccessFromUser = function(userid, roles) {
    if (!roles || roles.length === 0) {
      console.warn("no roles were requested to be removed. cant do anything");
      $rootScope.application.bug("There was a problem performing this operation. Please report this.");
    }
    // Prevent an admin from removing him/herself from a corpus if there are no other admins; This
    // helps to avoid a situation in which there is no admin for a
    // corpus
    if (roles === ["admin"] && $scope.users.admins.length < 2) {
      if ($scope.users.admins[0].username.indexOf(userid) > -1) {
        $rootScope.application.bug("You cannot remove the final admin from a corpus.\nPlease add someone else as corpus admin before removing the final admin.");
        return;
      }
    }
    var referingNoun = userid;
    if (referingNoun === $rootScope.application.authentication.user.username) {
      referingNoun = "yourself";
    }

    var r = confirm("Are you sure you want to remove " + roles.join(" ") + " access from " + referingNoun + " on " + $rootScope.application.corpus.title);
    if (r === true) {

      var dataToPost = {};
      dataToPost.username = $rootScope.application.authentication.user.username.trim();
      dataToPost.password = $rootScope.loginInfo.password.trim();
      dataToPost.serverCode = $rootScope.application.brand;
      dataToPost.pouchname = $rootScope.application.corpus.pouchname;

      dataToPost.users = [{
        username: userid,
        remove: roles,
        add: []
      }];

      Data.removeroles(dataToPost)
        .then(function(response) {
          if (debugging) {
            console.log(response);
          }
          $scope.loadedPermissionsForTeam = "";
          $scope.loadUsersAndRoles();
          var indirectObjectString = roles.join(" ") + "access from <a href='#corpus/" + $rootScope.application.corpus.pouchname + "'>" + $rootScope.application.corpus.title + "</a>";
          $scope.addActivity([{
            verb: "removed",
            verbicon: "icon-remove-sign",
            directobjecticon: "icon-user",
            directobject: userid,
            indirectobject: indirectObjectString,
            teamOrPersonal: "personal"
          }, {
            verb: "removed",
            verbicon: "icon-remove-sign",
            directobjecticon: "icon-user",
            directobject: userid,
            indirectobject: indirectObjectString,
            teamOrPersonal: "team"
          }], "uploadnow");

        });
    }
  };


  // $scope.commaList = function(tags) {
  //   var dataString = "";
  //   for (var i = 0; i < tags.length; i++) {
  //     if (i < (tags.length - 1)) {
  //       if (tags[i].tag) {
  //         dataString = dataString + tags[i].tag + ", ";
  //       }
  //     } else {
  //       if (tags[i].tag) {
  //         dataString = dataString + tags[i].tag;
  //       }
  //     }
  //   }
  //   if (dataString === "") {
  //     return "Tags";
  //   }
  //   return dataString;
  // };

  // Paginate data tables

  $scope.numberOfResultPages = function(numberOfRecords) {
    if (!numberOfRecords) {
      return 0;
    }
  };

  $scope.loadPaginatedData = function(why) {

    console.log("dont need loadPaginatedData anymore  ", why);
    if (true) {
      return;
    }
  };

  //TODO whats wrong with ng-cloak? woudlnt that solve this?
  $timeout(function() {
    if (document.getElementById("hideOnLoad")) {
      document.getElementById("hideOnLoad").style.visibility = "visible";
    }
  }, 100);



  // $scope.testFunction = function() {
  //   console.log($rootScope.currentPage);
  // };

  /**
   *  changes the current page, which is watched in a directive, which in turn calls loadPaginatedData above
   * @return {[type]} [description]
   */
  $scope.pageForward = function() {
    $scope.activeDatumIndex = null;
    $rootScope.currentPage = $rootScope.currentPage + 1;
  };

  /**
   *  changes the current page, which is watched in a directive, which in turn calls loadPaginatedData above
   * @return {[type]} [description]
   */
  $scope.pageBackward = function() {
    $scope.activeDatumIndex = null;
    $rootScope.currentPage = $rootScope.currentPage - 1;
  };


  $rootScope.$watch('currentPage', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      $scope.loadPaginatedData();
    } else {
      console.warn("currentPage changed, but is the same as before, not paginating data.", newValue, oldValue);
    }
  });

  $scope.flagAsDeleted = function(json, datum) {
    json.trashed = "deleted";
    if (datum) {
      $rootScope.markAsNotSaved(datum);
    }
  };

  $scope.deleteAttachmentFromCorpus = function(datum, filename, description) {
    if ($rootScope.writePermissions === false) {
      $rootScope.notificationMessage = "You do not have permission to delete attachments.";
      $rootScope.openNotification();
      return;
    }
    var r = confirm("Are you sure you want to put the file " + description + " (" + filename + ") in the trash?");
    if (r === true) {
      var record = datum.id + "/" + filename;
      console.log(record);
      Data.async($rootScope.application.corpus.pouchname, datum.id)
        .then(function(originalRecord) {
          // mark as trashed in scope
          var inDatumAudioFiles = false;
          for (var i in datum.audioVideo) {
            if (datum.audioVideo[i].filename === filename) {
              datum.audioVideo[i].description = datum.audioVideo[i].description + ":::Trashed " + Date.now() + " by " + $rootScope.application.authentication.user.username;
              datum.audioVideo[i].trashed = "deleted";
              inDatumAudioFiles = true;
              // mark as trashed in database record
              for (var k in originalRecord.audioVideo) {
                if (originalRecord.audioVideo[k].filename === filename) {
                  originalRecord.audioVideo[k] = datum.audioVideo[i];
                }
              }
            }
          }
          if (datum.audioVideo.length === 0) {
            datum.hasAudio = false;
          }
          originalRecord.audioVideo = datum.audioVideo;
          //Upgrade to v1.90
          if (originalRecord.attachmentInfo) {
            delete originalRecord.attachmentInfo;
          }
          // console.log(originalRecord);
          Data.saveCouchDoc($rootScope.application.corpus.pouchname, originalRecord)
            .then(function(response) {
              console.log("Saved attachment as trashed.");
              if (debugging) {
                console.log(response);
              }
              var indirectObjectString = "in <a href='#corpus/" + $rootScope.application.corpus.pouchname + "'>" + $rootScope.application.corpus.title + "</a>";
              $scope.addActivity([{
                verb: "deleted",
                verbicon: "icon-trash",
                directobjecticon: "icon-list",
                directobject: "<a href='#data/" + datum.id + "/" + filename + "'>the audio file " + description + " (" + filename + ") on " + datum.utterance + "</a> ",
                indirectobject: indirectObjectString,
                teamOrPersonal: "personal"
              }, {
                verb: "deleted",
                verbicon: "icon-trash",
                directobjecticon: "icon-list",
                directobject: "<a href='#data/" + datum.id + "/" + filename + "'>an audio file on " + datum.utterance + "</a> ",
                indirectobject: indirectObjectString,
                teamOrPersonal: "team"
              }], "uploadnow");

              // Dont actually let users delete data...
              // Data.async($rootScope.application.corpus.pouchname, datum.id)
              // .then(function(record) {
              //   // Delete attachment info for deleted record
              //   for (var key in record.attachmentInfo) {
              //     if (key === filename) {
              //       delete record.attachmentInfo[key];
              //     }
              //   }
              //   Data.saveCouchDoc($rootScope.application.corpus.pouchname, datum.id, record, record._rev)
              // .then(function(response) {
              //     if (datum.audioVideo.length === 0) {
              //       datum.hasAudio = false;
              //     }
              //     console.log("File successfully deleted.");
              //   });
              // });
            });
        });
    }
  };

  $scope.triggerExpandCollapse = function() {
    if ($scope.expandCollapse === true) {
      $scope.expandCollapse = false;
    } else {
      $scope.expandCollapse = true;
    }
  };

  $scope.getSavedState = function() {
    if ($scope.saved === "yes") {
      return {
        state: "Saved",
        class: "btn btn-success",
        icon: "fa whiteicon fa-folder",
        text: $rootScope.contextualize("locale_Saved")
      };
    } else if ($scope.saved === "no") {
      return {
        state: "Save",
        class: "btn btn-danger",
        icon: "fa whiteicon fa-save",
        text: $rootScope.contextualize("locale_Save")
      };
    } else {
      return {
        state: "Saving",
        class: "pulsing",
        icon: "fa whiteicon fa-folder-open",
        text: $rootScope.contextualize("locale_Saving")
      };
    }
  };

  $scope.contactUs = function() {
    window.open("https://docs.google.com/forms/d/18KcT_SO8YxG8QNlHValEztGmFpEc4-ZrjWO76lm0mUQ/viewform");
  };

  $scope.setDataEntryFocusOn = function(targetDatumEntryDomElement) {
    $timeout(function() {
      if (targetDatumEntryDomElement && targetDatumEntryDomElement[1]) {
        console.log("old focus", document.activeElement);
        targetDatumEntryDomElement[1].focus();
        console.log("new focus", document.activeElement);
      } else {
        console.warn("requesting focus on an element that doesnt exist.");
      }
    }, 500);
  };

  // Use this function to show objects on loading without displacing other elements
  $scope.hiddenOnLoading = function() {
    if ($rootScope.loading !== true) {
      return {
        'visibility': 'hidden'
      };
    } else {
      return {};
    }
  };

  // Hide loader when all content is ready
  $rootScope.$on('$viewContentLoaded', function() {
    // Return user to saved state, if it exists; only recover saved state on reload, not menu navigate
    if ($scope.appReloaded !== true) {
      updateAndOverwritePreferencesToCurrentVersion();
      // Update users to new saved state preferences if they were absent

      if ($scope.scopePreferences.savedState && $scope.scopePreferences.savedState.username && $scope.scopePreferences.savedState.password) {
        var autoBuiltLoginInfo = {};
        autoBuiltLoginInfo.username = $scope.scopePreferences.savedState.username;
        try {
          autoBuiltLoginInfo.password = sjcl.decrypt("password", $scope.scopePreferences.savedState.password);
        } catch (err) {
          // User's password has not yet been encrypted; encryption will be updated on login.
          autoBuiltLoginInfo.password = $scope.scopePreferences.savedState.password;
        }
        $scope.loginUser(autoBuiltLoginInfo);
      } else {
        $rootScope.openWelcomeNotificationDeprecated();
        $scope.documentReady = true;
      }
    } else {
      alert("waht does app reloaded do?");
    }
  });

  $scope.forgotPasswordInfo = {};
  $scope.forgotPasswordSubmit = function() {
    if (!$scope.forgotPasswordInfo.email) {
      $rootScope.notificationMessage = "You must enter the email you used when you registered (email is optional, If you did not provde an email you will need to contact us for help).";
      $rootScope.openNotification();
      return;
    }

    Data.forgotPassword($scope.forgotPasswordInfo)
      .then(function(response) {
        if (debugging) {
          console.log(response);
        }

        $scope.forgotPasswordInfo = {};
        $scope.showForgotPassword = false;
        $rootScope.notificationMessage = response.data.info.join(" ") || "Successfully emailed password.";
        $rootScope.openNotification();

      }, function(err) {
        console.warn(err);
        var message = "";
        if (err.status === 0) {
          message = "are you offline?";
          if ($rootScope.application.brand === "mcgill" || $rootScope.application.brand === "concordia") {
            message = "Cannot contact " + $rootScope.application.connection.userFriendlyServerName + " server, have you accepted the server's security certificate? (please refer to your registration email)";
          }
        }
        if (err && err.status >= 400 && err.data.userFriendlyErrors) {
          message = err.data.userFriendlyErrors.join(" ");
        } else {
          message = "Cannot contact " + $rootScope.application.connection.userFriendlyServerName + " server, please report this.";
        }

        $scope.showForgotPassword = false;
        $rootScope.notificationMessage = message;
        $rootScope.openNotification();

        // console.log(reason);
        // var message = "Please report this.";
        // if (reason.status === 0) {
        //   message = "Are you offline?";
        // } else {
        //   message = reason.data.userFriendlyErrors.join(" ");
        // }
        // $rootScope.notificationMessage = "Error updating password. " + message;
        // $rootScope.openNotification();
      });
  };

  $scope.resetPasswordInfo = {};
  $scope.changePasswordSubmit = function() {
    if ($scope.resetPasswordInfo.confirmpassword !== $scope.resetPasswordInfo.newpassword) {
      $rootScope.notificationMessage = "New passwords don't match.";
      $rootScope.openNotification();
      return;
    }

    $scope.resetPasswordInfo.username = $rootScope.application.authentication.user.username;
    Data.changePassword($scope.resetPasswordInfo)
      .then(function(response) {
        if (debugging) {
          console.log(response);
        }
        Data.login($scope.resetPasswordInfo.username, $scope.resetPasswordInfo.confirmpassword);


        $scope.scopePreferences.savedState.password = sjcl.encrypt("password", $scope.resetPasswordInfo.confirmpassword);
        localStorage.setItem('SpreadsheetPreferences', JSON.stringify($scope.scopePreferences));

        $scope.resetPasswordInfo = {};
        $scope.showResetPassword = false;
        $rootScope.notificationMessage = response.data.info.join(" ") || "Successfully updated password.";
        $rootScope.openNotification();


      }, function(err) {
        console.warn(err);
        var message = "";
        if (err.status === 0) {
          message = "are you offline?";
          if ($rootScope.application.brand === "mcgill" || $rootScope.application.brand === "concordia") {
            message = "Cannot contact " + $rootScope.application.connection.userFriendlyServerName + " server, have you accepted the server's security certificate? (please refer to your registration email)";
          }
        }
        if (err && err.status >= 400 && err.data.userFriendlyErrors) {
          message = err.data.userFriendlyErrors.join(" ");
        } else {
          message = "Cannot contact " + $rootScope.application.connection.userFriendlyServerName + " server, please report this.";
        }
        $scope.showResetPassword = false;

        $rootScope.notificationMessage = message;
        $rootScope.openNotification();

      });
  };


  $scope.newRecordHasBeenEditedButtonClass = function() {
    if ($rootScope.newRecordHasBeenEdited === true) {
      return "btn btn-danger";
    } else {
      return "btn btn-primary";
    }
  };


  $scope.mainBodyClass = function() {
    if ($rootScope.activeSubMenu === 'searchMenu') {
      return "mainBodySearching";
    } else {
      return "mainBody";
    }
  };

  window.onbeforeunload = function(e) {
    console.warn(e);
    if ($rootScope.application && $rootScope.application.authentication && $rootScope.application.authentication.user && typeof $rootScope.application.authentication.user.save === "function") {
      $rootScope.application.authentication.user.save();
    }
    if ($scope.saved === "no") {
      return "You currently have unsaved changes!\n\nIf you wish to save these changes, cancel and then save before reloading or closing this app.\n\nOtherwise, any unsaved changes will be abandoned.";
    } else {
      return;
    }
  };

};
SpreadsheetStyleDataEntryController.$inject = ["$scope", "$rootScope", "$resource", "$filter", "$document", "Data", "md5", "$timeout", "$modal", "$log", "$http"];
angular.module("spreadsheetApp").controller("SpreadsheetStyleDataEntryController", SpreadsheetStyleDataEntryController);
