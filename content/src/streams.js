/*global Components: false */
/*jshint -W097 */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm"); /*global XPCOMUtils: false */
Cu.import("resource://gre/modules/Services.jsm"); /* global Services: false */

const NS_RDONLY = 0x01;
const NS_WRONLY = 0x02;
const NS_CREATE_FILE = 0x08;
const NS_TRUNCATE = 0x20;
const DEFAULT_FILE_PERMS = 0x180; // equals 0600
const NS_LOCALFILEOUTPUTSTREAM_CONTRACTID = "@mozilla.org/network/file-output-stream;1";
const XPCOM_APPINFO = "@mozilla.org/xre/app-info;1";
const DIRSERVICE_CONTRACTID = "@mozilla.org/file/directory_service;1";
const NS_FILE_CONTRACTID = "@mozilla.org/file/local;1";
const NS_STRING_INPUT_STREAM_CONTRACTID = "@mozilla.org/io/string-input-stream;1";
const NS_INPUT_STREAM_CHNL_CONTRACTID = "@mozilla.org/network/input-stream-channel;1";
const IOSERVICE_CONTRACTID = "@mozilla.org/network/io-service;1";

var Streams = {

  /**
   * Create a new channel from a URL.
   *
   * @param url: String - URL specification
   *
   * @return: channel
   */
  createChannel: function(url) {
    let ioServ = Cc[IOSERVICE_CONTRACTID].getService(Ci.nsIIOService);

    let channel;
    if ("newChannel2" in ioServ) {
      // TB >= 48
      let loadingPrincipal = Services.scriptSecurityManager.getSystemPrincipal();
      channel = ioServ.newChannel2(url, null, null, null, loadingPrincipal, null, 0, Ci.nsIContentPolicy.TYPE_DOCUMENT);
    }
    else {
      channel = ioServ.newChannel(url, null, null);
    }

    return channel;
  },

  /**
   * Create a new channel from a URI.
   *
   * @param uri: Object - nsIURI
   *
   * @return: channel
   */
  createChannelFromURI: function(uri) {
    let ioServ = Cc[IOSERVICE_CONTRACTID].getService(Ci.nsIIOService);

    let channel;
    if ("newChannelFromURI2" in ioServ) {
      // TB >= 48
      let loadingPrincipal = Services.scriptSecurityManager.getSystemPrincipal();
      channel = ioServ.newChannelFromURI2(uri, null, loadingPrincipal, null, 0, Ci.nsIContentPolicy.TYPE_DOCUMENT);
    }
    else {
      channel = ioServ.newChannelFromURI(uri);
    }
    return channel;
  },
  /**
   * create an nsIStreamListener object to read String data from an nsIInputStream
   *
   * @onStopCallback: Function - function(data) that is called when the stream has stopped
   *                             string data is passed as |data|
   *
   * @return: the nsIStreamListener to pass to the stream
   */
  newStringStreamListener: function(onStopCallback) {
    return {
      data: "",
      inStream: Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream),
      _onStopCallback: onStopCallback,
      QueryInterface: XPCOMUtils.generateQI([Ci.nsIStreamListener, Ci.nsIRequestObserver]),

      onStartRequest: function(channel, ctxt) {
      },

      onStopRequest: function(channel, ctxt, status) {
        this.inStream = null;
        var cbFunc = this._onStopCallback;
        var cbData = this.data;

        setTimeout(function _cb() {
          cbFunc(cbData);
        });
      },

      onDataAvailable: function(req, sup, stream, offset, count) {
        this.inStream.setInputStream(stream);
        this.data += this.inStream.readBytes(count);
      }
    };
  },

  /**
   * create a nsIInputStream object that is fed with string data
   *
   * @uri:            nsIURI - object representing the URI that will deliver the data
   * @contentType:    String - the content type as specified in nsIChannel
   * @contentCharset: String - the character set; automatically determined if null
   * @data:           String - the data to feed to the stream
   *
   * @return nsIChannel object
   */
  newStringChannel: function(uri, contentType, contentCharset, data) {

    const inputStream = Cc[NS_STRING_INPUT_STREAM_CONTRACTID].createInstance(Ci.nsIStringInputStream);
    inputStream.setData(data, -1);

    if (!contentCharset || contentCharset.length === 0) {
      const ioServ = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
      const netUtil = ioServ.QueryInterface(Ci.nsINetUtil);
      const newCharset = {};
      const hadCharset = {};
      let mimeType;
      try {
        // Gecko >= 43
        mimeType = netUtil.parseResponseContentType(contentType, newCharset, hadCharset);
      }
      catch (ex) {
        // Gecko < 43
        mimeType = netUtil.parseContentType(contentType, newCharset, hadCharset);
      }
      contentCharset = newCharset.value;
    }

    const isc = Cc[NS_INPUT_STREAM_CHNL_CONTRACTID].createInstance(Ci.nsIInputStreamChannel);
    isc.setURI(uri);
    isc.contentStream = inputStream;

    const chan = isc.QueryInterface(Ci.nsIChannel);
    if (contentType && contentType.length) chan.contentType = contentType;
    if (contentCharset && contentCharset.length) chan.contentCharset = contentCharset;

    return chan;
  },

  newFileChannel: function(uri, file, contentType, deleteOnClose) {
    let inputStream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
    let behaviorFlags = Ci.nsIFileInputStream.CLOSE_ON_EOF;
    if (deleteOnClose) {
      behaviorFlags |= Ci.nsIFileInputStream.DELETE_ON_CLOSE;
    }
    const ioFlags = 0x01; // readonly
    const perm = 0;
    inputStream.init(file, ioFlags, perm, behaviorFlags);

    const isc = Cc[NS_INPUT_STREAM_CHNL_CONTRACTID].createInstance(Ci.nsIInputStreamChannel);

    isc.setURI(uri);
    isc.contentStream = inputStream;

    const chan = isc.QueryInterface(Ci.nsIChannel);
    if (contentType && contentType.length) chan.contentType = contentType;

    return chan;
  },

  createFileStream: function(filePath, permissions) {
    try {
      let localFile;
      if (typeof filePath == "string") {
        localFile = Cc[NS_FILE_CONTRACTID].createInstance(Ci.nsIFile);
        this.initPath(localFile, filePath);
      }
      else {
        localFile = filePath.QueryInterface(Ci.nsIFile);
      }

      if (localFile.exists()) {

        if (localFile.isDirectory() || !localFile.isWritable())
          throw Components.results.NS_ERROR_FAILURE;

        if (!permissions)
          permissions = localFile.permissions;
      }

      if (!permissions)
        permissions = DEFAULT_FILE_PERMS;

      const flags = NS_WRONLY | NS_CREATE_FILE | NS_TRUNCATE;

      const fileStream = Cc[NS_LOCALFILEOUTPUTSTREAM_CONTRACTID].createInstance(Ci.nsIFileOutputStream);

      fileStream.init(localFile, flags, permissions, 0);

      return fileStream;

    }
    catch (ex) {
      console.error(ex)
      return null;
    }
  },

  initPath: function(localFileObj, pathStr) {
    localFileObj.initWithPath(pathStr);

    if (!localFileObj.exists()) {
      localFileObj.persistentDescriptor = pathStr;
    }
  },

  writeFileContents: function (filePath, data, permissions) {
    try {
      const fileOutStream = this.createFileStream(filePath, permissions);

      if (data.length) {
        if (fileOutStream.write(data, data.length) != data.length) {
          throw Components.results.NS_ERROR_FAILURE;
        }

        fileOutStream.flush();
      }
      fileOutStream.close();
    }
    catch (ex) {
      console.error(ex)
      return false;
    }

    return true;
  },

};

module.exports = Streams
