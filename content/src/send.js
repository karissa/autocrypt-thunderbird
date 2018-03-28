var crypto = require('crypto')
var streams = require('./streams')
var account = require('./email')

module.exports = simpleSendMessage

const XPCOM_APPINFO = "@mozilla.org/xre/app-info;1";
const DIRSERVICE_CONTRACTID = "@mozilla.org/file/directory_service;1";
const NS_FILE_CONTRACTID = "@mozilla.org/file/local;1";

var Cc = self.Components.classes
var Ci = self.Components.interfaces
var Cu = self.Components.utils

/**
 * Send message (simplified API)
 *
 * @param aParams: Object -
 *    - identity: Object - The identity the user picked to send the message
 *    - to:       String - The recipients. This is a comma-separated list of
 *                       valid email addresses that must be escaped already. You probably want to use
 *                       nsIMsgHeaderParser.MakeFullAddress to deal with names that contain commas.
 *    - cc (optional) Same remark.
 *    - bcc (optional) Same remark.
 *    - returnReceipt (optional) Boolean: ask for a receipt
 *    - receiptType (optional) Number: default: take from identity
 *    - requestDsn (optional) Boolean: request a Delivery Status Notification
 *    - securityInfo (optional)
 *
 * @param body: complete message source
 * @param callbackFunc: function(Boolean) - return true if message was sent successfully
 *                                           false otherwise
 *
 * @return Boolean - true: everything was OK to send the message
 */
function simpleSendMessage (aParams, body, callbackFunc) {
  let fields = Cc["@mozilla.org/messengercompose/composefields;1"]
    .createInstance(Ci.nsIMsgCompFields);
  let identity = aParams.identity;

  fields.from = identity.email;
  fields.to = aParams.to;
  if ("cc" in aParams) fields.cc = aParams.cc;
  if ("bcc" in aParams) fields.bcc = aParams.bcc;
  fields.returnReceipt = ("returnReceipt" in aParams) ? aParams.returnReceipt : identity.requestReturnReceipt;
  fields.receiptHeaderType = ("receiptType" in aParams) ? aParams.receiptType : identity.receiptHeaderType;
  fields.DSN = ("requestDsn" in aParams) ? aParams.requestDsn : identity.requestDSN;
  if ("securityInfo" in aParams) fields.securityInfo = aParams.securityInfo;

  fields.messageId = crypto.randomBytes(27).toString('base64') + '-autocrypt'
  body = "Message-Id: " + fields.messageId + "\r\n" + body;

  let listener = {
    onStartSending: function() {},
    onProgress: function() {},
    onStatus: function() {},
    onGetDraftFolderURI: function() {},
    onStopSending: function(aMsgID, aStatus, aMsg, aReturnFile) {
      if (callbackFunc) callbackFunc(true);
    },
    onSendNotPerformed: function(aMsgID, aStatus) {
      if (callbackFunc) callbackFunc(false);
    }
  };

  return sendMessage(body, fields, listener, identity, callbackFunc);
}

function sendMessage (msgData, compFields, listener, identity, callbackFunc) {
  let tmpFile;
  try {
    tmpFile = getTempDirObj();
    tmpFile.append("message.eml");
    tmpFile.createUnique(0, 384); // == 0600, octal is deprecated
  }
  catch (ex) {
    callbackFunc(ex)
    return false;
  }

  result = streams.writeFileContents(tmpFile, msgData);
  if (!result) throw new Error('failed to write file contents')

  let acct = account.getAccountForIdentity(identity);
  if (!acct) return false;

  let msgSend = Cc["@mozilla.org/messengercompose/send;1"].createInstance(Ci.nsIMsgSend);
  msgSend.sendMessageFile(identity,
    acct.key,
    compFields,
    tmpFile,
    true, // Delete  File On Completion
    false, (Services.io.offline ? Ci.nsIMsgSend.nsMsgQueueForLater : Ci.nsIMsgSend.nsMsgDeliverNow),
    null,
    listener,
    null,
    ""); // password

  return true;
}

function getTempDirObj () {
  const TEMPDIR_PROP = "TmpD";

  try {
    const dsprops = Cc[DIRSERVICE_CONTRACTID].getService().
    QueryInterface(Ci.nsIProperties);
    return dsprops.get(TEMPDIR_PROP, Ci.nsIFile);
  }
  catch (ex) {
    // let's guess ...
    const tmpDirObj = Cc[NS_FILE_CONTRACTID].createInstance(Ci.nsIFile);
    if (EnigmailOS.getOS() == "WINNT") {
      tmpDirObj.initWithPath("C:/TEMP");
    }
    else {
      tmpDirObj.initWithPath("/tmp");
    }
    return tmpDirObj;
  }
}
