Cu.import("chrome://autocrypt/content/autocrypt.js"); /*global Autocrypt: false */

window.addEventListener("load", function(e) {
  startup();
}, false);

function startup() {
  Autocrypt()
}
