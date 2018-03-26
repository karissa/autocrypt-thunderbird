
module.exports = getBodyElement

function getBodyElement () {
  var msgFrame
  for (var j = 0; j < window.frames.length; j++) {
    if (window.frames[j].name == "messagepane") {
      msgFrame = window.frames[j];
    }
  }
  return msgFrame && msgFrame.document.getElementsByTagName("body")[0];
}
