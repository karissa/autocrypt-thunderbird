module.exports = function getCurrentMsgUriSpec () {
  try {
    if (self.gFolderDisplay.selectedMessages.length != 1)
      return "";
    return self.gFolderDisplay.selectedMessageUris[0];
  }
  catch (ex) {
    return "";
  }
}
