const Cc = self.Components.classes;
const Ci = self.Components.interfaces;

module.exports = {
  get: function() {
    try {
      return Cc["@mozilla.org/intl/nslocaleservice;1"].getService(Ci.nsILocaleService).getApplicationLocale();
    }
    catch (ex) {
      return {
        getCategory: function(whatever) {
          // always return the application locale
          return Cc["@mozilla.org/intl/localeservice;1"].getService(Ci.mozILocaleService).getAppLocaleAsBCP47();
        }
      };
    }
  },

  /**
   * Retrieve a localized string from the enigmail.properties stringbundle
   *
   * @param aStr:       String                     - properties key
   * @param subPhrases: String or Array of Strings - [Optional] additional input to be embedded
   *                                                  in the resulting localized text
   *
   * @return String: the localized string
   */
  getString: function(aStr, subPhrases) {
    if (!self.gEnigStringBundle) {
      try {
        /* HACK: The string bundle cache is cleared on addon shutdown, however it doesn't appear to do so reliably.
          Errors can erratically happen on next load of the same file in certain instances. (at minimum, when strings are added/removed)
          The apparently accepted solution to reliably load new versions is to always create bundles with a unique URL so as to bypass the cache.
          This is accomplished by passing a random number in a parameter after a '?'. (this random ID is otherwise ignored)
          The loaded string bundle is still cached on startup and should still be cleared out of the cache on addon shutdown.
          This just bypasses the built-in cache for repeated loads of the same path so that a newly installed update loads cleanly. */
        let bundlePath = "chrome://autocrypt/locale/autocrypt.properties?" + Math.random();
        let strBundleService = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService);
        self.gEnigStringBundle = strBundleService.createBundle(bundlePath);
      }
      catch (ex) {
        console.error("locale.js: Error in instantiating stringBundleService\n");
      }
    }

    if (self.gEnigStringBundle) {
      try {
        if (subPhrases) {
          if (typeof(subPhrases) == "string") {
            return self.gEnigStringBundle.formatStringFromName(aStr, [subPhrases], 1);
          }
          else {
            return self.gEnigStringBundle.formatStringFromName(aStr, subPhrases, subPhrases.length);
          }
        }
        else {
          return self.gEnigStringBundle.GetStringFromName(aStr);
        }
      }
      catch (ex) {
        console.error("locale.js: Error in querying stringBundleService for string '" + aStr + "'\n");
      }
    }
    return aStr;
  },

  /**
   * Get the locale for the User Interface
   *
   * @return String  Locale (xx-YY)
   */
  getUILocale: function() {
    let ps = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);
    let uaPref = ps.getBranch("general.useragent.");

    try {
      return uaPref.getComplexValue("locale", Ci.nsISupportsString).data;
    }
    catch (e) {}
    return this.get().getCategory("NSILOCALE_MESSAGES").substr(0, 5);
  },

  shutdown: function(reason) {
    // flush string bundles on shutdown of the addon, such that it's no longer cached
    try {
      self.gEnigStringBundle = null;
      let strBundleService = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService);
      strBundleService.flushBundles();
    }
    catch (e) {}
  }
};
