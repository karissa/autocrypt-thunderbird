const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

/*global gMsgCompose: false, getCurrentIdentity: false */

// Listen to message sending event
window.addEventListener('compose-send-message', onSendMessage, true);

function onSendMessage () {
  let msgcomposeWindow = document.getElementById("msgcomposeWindow");
  let sendMsgType = Number(msgcomposeWindow.getAttribute("msgtype"));
  gMsgCompose.compFields.setHeader('Random-Header', 'hello-world')
  var identity = getAccountForIdentity(getCurrentIdentity())
  //gMsgCompose.compFields.setHeader('My-Identity', identity)
}

function getAccountForIdentity (identity) {
  let accountManager = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager);

  for (let acct = 0; acct < accountManager.accounts.length; acct++) {
    let ac = accountManager.accounts.queryElementAt(acct, Ci.nsIMsgAccount);

    for (let i = 0; i < ac.identities.length; i++) {
      let id = ac.identities.queryElementAt(i, Ci.nsIMsgIdentity);
      if (id.key === identity.key) {
        return ac;
      }
    }
  }

  return null;
}
