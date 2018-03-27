module.exports = getMimeTree

Components.utils.import("resource:///modules/jsmime.jsm"); /*global jsmime: false*/

function arrayBufferToString (buf) {
  var d = new TextDecoder()
  return d.decode(new Uint8Array(buf))
}

/**
 * Parse a MIME message and return a tree structure of TreeObject.
 *
 * TreeObject contains the following main parts:
 *     - partNum: String
 *     - headers: Map, containing all headers.
 *         Special headers for contentType and charset
 *     - body: String, if getBody == true
 *     - subParts: Array of TreeObject
 *
 * @param mimeStr: String  - a MIME structure to parse
 * @param getBody: Boolean - if true, delivers the body text of each MIME part
 *
 * @return TreeObject, or NULL in case of failure
 */
function getMimeTree (mimeStr, getBody) {

  let mimeTree = {
      partNum: "",
      headers: null,
      body: "",
      parent: null,
      subParts: []
    },
    stack = [],
    currentPart = "",
    currPartNum = "";

  const jsmimeEmitter = {

    createPartObj: function(partNum, headers, parent) {
      let ct;

      if (headers.has("content-type")) {
        ct = headers.contentType.type;
        let it = headers.get("content-type").entries();
        for (let i of it) {
          ct += '; ' + i[0] + '="' + i[1] + '"';
        }
      }

      return {
        partNum: partNum,
        headers: headers,
        fullContentType: ct,
        body: "",
        parent: parent,
        subParts: []
      };
    },

    /** JSMime API **/
    startMessage: function() {
      currentPart = mimeTree;
    },

    endMessage: function() {},

    startPart: function(partNum, headers) {
      //dump("mime.jsm: jsmimeEmitter.startPart: partNum=" + partNum + "\n");
      partNum = "1" + (partNum !== "" ? "." : "") + partNum;
      let newPart = this.createPartObj(partNum, headers, currentPart);

      if (partNum.indexOf(currPartNum) === 0) {
        // found sub-part
        currentPart.subParts.push(newPart);
      }
      else {
        // found same or higher level
        currentPart.subParts.push(newPart);
      }
      currPartNum = partNum;
      currentPart = newPart;
    },
    endPart: function(partNum) {
      //dump("mime.jsm: jsmimeEmitter.startPart: partNum=" + partNum + "\n");
      currentPart = currentPart.parent;
    },

    deliverPartData: function(partNum, data) {
      //dump("mime.jsm: jsmimeEmitter.deliverPartData: partNum=" + partNum + " / " + typeof data + "\n");
      console.log(partNum, data)
      if (typeof(data) === "string") {
        currentPart.body += data;
      }
      else {
        currentPart.body += arrayBufferToString(data);
      }
    }
  };

  let opt = {
    strformat: "unicode",
    bodyformat: getBody === false ? "none" : "decode"
  };


  try {
    let p = new jsmime.MimeParser(jsmimeEmitter, opt);
    p.deliverData(mimeStr);
    return mimeTree.subParts[0];
  }
  catch (ex) {
    return null;
  }
}
