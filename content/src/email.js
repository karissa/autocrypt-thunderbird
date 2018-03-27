
var Cc = self.Components.classes
var Ci = self.Components.interfaces
var Cu = self.Components.utils

module.exports = {
  getEmail, getAccountForIdentity
}

function getEmail (identity) {
  var account = getAccountForIdentity(identity)
  return account.defaultIdentity.email
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
