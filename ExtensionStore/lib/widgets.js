var Logger = require("logger.js").Logger;
var log = new Logger("Widgets");

/**
 * A QWebView to display the description
 * @param {QWidget} parent
 */
 function DescriptionView(parent){
  var webPreviewsFontFamily = "Arial";
  var webPreviewsFontSize = UiLoader.dpiScale(12);

  QWebView.call(this, parent)

  this.setMinimumSize(0, 0);
  this.setSizePolicy(QSizePolicy.Maximum, QSizePolicy.Maximum);
  var settings = this.settings();
  settings.setFontFamily(QWebSettings.StandardFont, webPreviewsFontFamily);
  settings.setFontSize(QWebSettings.DefaultFontSize, webPreviewsFontSize);
}
DescriptionView.prototype = Object.create(QWebView.prototype)

/**
 * The QTreeWidgetTtem that represents a single extension in the store list.
 * @classdesc
 * @param {storeLib.Extension} extension           the extension which will be represented by this item
 * @param {storelib.LocalExtensionList} localList  the list of extensions installed on this machine
 * @param {QTreeWidget} parent                     the parent widget for this item
 */
 function ExtensionItem(extension, localList, parent) {
  this._parent = parent // this is the QTreeWidget
  var newExtensions = localList.getData("newExtensions", []);
  var extensionLabel = extension.name;

  if (newExtensions.indexOf(extension.id) != -1) extensionLabel += " ★new!"

  QTreeWidgetItem.call(this, [extensionLabel, icon], 1024);
  // add an icon in the middle column showing if installed and if update present
  if (localList.isInstalled(extension)) {
    var iconPath = style.ICONS.installed;
    this.setToolTip(1, "Extension is installed correctly.");
    var localExtension = localList.extensions[extension.id];
    // log.debug("checking files from "+extension.id, localList.checkFiles(localExtension));
    if (localExtension.currentVersionIsOlder(extension.version)) {
      iconPath = style.ICONS.update;
      this.setToolTip(1, "Update available:\ncurrently installed version : v" + extension.version);
    } else if (!localList.checkFiles(localExtension)) {
      iconPath = style.ICONS.error;
      this.setToolTip(1, "Some files from this extension are missing.");
    }
  } else {
    iconPath = style.ICONS.notInstalled;
  }
  var icon = new StyledImage(iconPath);
  icon.setAsIcon(this, 1);

  if (extension.iconUrl){
    // set up an icon if one is available
    log.debug("adding icon to extension "+ extension.name + " from url : "+extension.iconUrl)
    this.extensionIcon = new WebIcon(extension.iconUrl);
    this.extensionIcon.setToWidget(this);

  }else{
    // fallback to local icon
    var extensionIcon = new StyledImage(style.ICONS.defaultExtension);
    extensionIcon.setAsIcon(this, 0);
  }

  // store the extension id in the item
  this.setData(0, Qt.UserRole, extension.id);
}
ExtensionItem.prototype = Object.create(QTreeWidgetItem.prototype);


/**
 * A button that can also shows progress
 */
function ProgressButton(color){
  QToolButton.call(this);
  this.maximumWidth = this.minimumWidth = UiLoader.dpiScale(130);
  this.maximumHeight = this.minimumHeight = UiLoader.dpiScale(30);

  this._accentColor = color;
}
ProgressButton.prototype = Object.create(QToolButton.prototype)

/**
 * Basic implementation of determing Action state (install, uninstall, update)
 * by using the action tooltip.
 * @returns {Object} Object containing the state, default text and updating base.
 */
ProgressButton.prototype.getState = function() {
  var state;
  switch (this.defaultAction.toolTip) {
    case "install":
      state = {
        "state": "install",
        "defaultText": "Install",
        "progressText": "Installing"
      }
      break;
      case "uninstall":
        state = {
          "state": "uninstall",
          "defaultText": "Uninstall",
          "progressText": "Uninstalling"
        }
        break;
      case "update":
        state = {
          "state": "update",
          "defaultText": "Update",
          "progressText": "Updating"
        }
    default:
      break;
  }
  return state;
}

Object.defineProperty(ProgressButton.prototype, "text", {
  set: function (text) {
    this.defaultAction().text = text;
  }});

ProgressButton.prototype.setProgress = function (progress){
  var state = this.getState();

  if (progress < 0){
    // reset stylesheet by changing the accentColor
    this.accentColor = this.accentColor;
  } else if (progress < 1) {
    // this.text = "Installing...";
    this.enabled = false;

    // Set stylesheet to act as a progressbar.
    var progressStopL = progress;
    var progressStopR = progressStopL + 0.001;
    var progressStyleSheet = "QToolButton {" +
      "background-color:" +
      "  qlineargradient(" +
      "    spread:pad," +
      "    x1:0, y1:0, x2:1, y2:0," +
      "    stop: " + progressStopL + " " + this.accentColor + "," +
      "    stop:" + progressStopR + " " + style.COLORS["12DP"] +
      "  );"+
      "  border-color: transparent transparent " + this.accentColor + " transparent;" +
      "  color: white;" +
      "}";
    // Update widget with the new linear gradient progression.
    this.setStyleSheet(progressStyleSheet);

    // Update text with progress
    this.text = state.progressText + " " + Math.round((progressStopL * 100)) + "%";

  }else{
    // Configure widget to indicate the download is completed.
    this.setStyleSheet("QToolButton { border: none; background-color: " + this.accentColor + "; color: white}");
    this.enabled = true;
    this.text = state.defaultText;
  }
}

Object.defineProperty(ProgressButton.prototype, "accentColor", {
  get: function(){
    return this._accentColor;
  },
  set: function(newColor){
    this._accentColor = newColor;
    this.setStyleSheet(style.STYLESHEETS.progressButton.replace("@ACCENT", this._accentColor))
  }
})



/**
 * A Qt like custom signal that can be defined, connected and emitted.
 * As this signal is not actually threaded, the connected callbacks will be exectuted
 * directly when the signal is emited, and the rest of the code will execute after.
 * @param {type} type the type of value accepted as argument when calling emit()
 */
 function Signal(type){
  // this.emitType = type;
  this.connexions = [];
  this.blocked = false;
}

Signal.prototype.connect = function (context, slot){
  // support slot.connect(callback) synthax
  if (typeof slot === 'undefined'){
    var slot = context;
    var context = null;
  }
  this.connexions.push ({context: context, slot:slot});
}

Signal.prototype.disconnect = function(slot){
  if (typeof slot === "undefined"){
    this.connexions = [];
    return
  }

  for (var i in this.connexions){
    if (this.connexions[i].slot == slot){
      this.connexions.splice(i, 1);
    }
  }
}

Signal.prototype.emit = function () {
  if (this.blocked) return;

  // if (!(value instanceof this.type)){ // can't make it work for primitives, might try to fix later?
  //   throw new error ("Signal can't emit type "+ (typeof value) + ". Must be : " + this.type)
  // }

  var args = [];
  for (var i=0; i<arguments.length; i++){
    args.push(arguments[i]);
  }

  log.debug("emiting signal with "+ args);

  for (var i in this.connexions){
    var context = this.connexions[i].context;
    var slot = this.connexions[i].slot;
    log.debug("calling slot "+ slot);

    // support connecting signals to each other
    if (slot instanceof Signal){
      slot.emit.apply(context, args)
    }else{
      slot.apply(context, args);
    }
  }
}

Signal.prototype.toString = function(){
  return "Signal";
}

exports.Signal = Signal;
exports.ProgressButton = ProgressButton;
exports.DescriptionView = DescriptionView;
exports.ExtensionItem = ExtensionItem;