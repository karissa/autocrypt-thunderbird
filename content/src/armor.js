

module.exports = {
  /**
   * Get a list of all headers found in an armor message
   *
   * @param text String - ASCII armored message
   *
   * @return Object: key/value pairs of headers. All keys are in lowercase.
   */
  getArmorHeaders: function(text) {
    let headers = {};
    let b = this.locateArmoredBlocks(text);

    if (b.length === 0) {
      return headers;
    }

    let msg = text.substr(b[0].begin);

    let lx = new RegExp("\\n" + b[0].indent + "\\r?\\n");
    let hdrEnd = msg.search(lx);
    if (hdrEnd < 0) return headers;

    let lines = msg.substr(0, hdrEnd).split(/\r?\n/);

    let rx = new RegExp("^" + b[0].indent + "([^: ]+)(: )(.*)");
    // skip 1st line (ARMOR-line)
    for (let i = 1; i < lines.length; i++) {
      let m = lines[i].match(rx);
      if (m && m.length >= 4) {
        headers[m[1].toLowerCase()] = m[3];
      }
    }

    return headers;
  }
}
