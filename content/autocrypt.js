var EXPORTED_SYMBOLS = ["AutocryptWrapper"];

function initialize() {
  try {
    let appShellSvc = Cc["@mozilla.org/appshell/appShellService;1"].getService(Ci.nsIAppShellService);

    window = appShellSvc.hiddenDOMWindow;
    document = window.document;

    Services.scriptloader.loadSubScript("chrome://autocrypt/content/autocrypt-lib.js", null, "UTF-8");

    //this.openpgp = window.openpgp;
  }
  catch (ex) {
    console.log("openpgp.js: initialize: error: " + ex.message + "\n");
  }
}

var AutocryptWrapper = {
  get openpgp() {
    if (!window) {
      initialize();
    }

    return window.autocrypt;
  }
}
