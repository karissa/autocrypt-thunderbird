var messageDecryptCb = require('./decryptcb')

module.exports = function (event) {
    event = event ? true : false;
    let contentType = "text/plain";
    if ('content-type' in self.currentHeaderData) contentType = self.currentHeaderData['content-type'].headerValue;
    // don't parse message if we know it's a PGP/MIME message
    if (((contentType.search(/^multipart\/signed(;|$)/i) === 0) && (contentType.search(/application\/pgp-signature/i) > 0)) ||
      ((contentType.search(/^multipart\/encrypted(;|$)/i) === 0) && (contentType.search(/application\/pgp-encrypted/i) > 0))) {
      messageDecryptCb(event, null);
      return;
    }
    // TODO: maybe parse mime tree URLS????
    messageDecryptCb(event, null);
  }
