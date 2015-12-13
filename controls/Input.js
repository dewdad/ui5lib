/**
 * An alternative m.Input that replaces the value-help button with a dynamic reset button. This control was developed
 * for the reason that no proper mobile autosuggest with dropdown exists in the framework yet
 */
sap.ui.define(['jquery.sap.global', 'sap/m/Input'],
    function (jQuery, Parent) {
        "use strict";

        var CANCELICO = "sap-icon://sys-cancel-2";
        var SEARCHICO = "sap-icon://search";
        var Control = Parent.extend('ui5lib.controls.Input', {

            metadata: {
                properties: {
                    showSearch: {type: "boolean", defaultValue: false}
                }
            },
            init: function () {
                Parent.prototype.init.apply(this, arguments);
                this.setShowValueHelp(true);
                this.attachLiveChange(this.checkInputForReset);
            },

            renderer: {}, /*function(){
             debugger;
             return Parent.prototype.renderer.apply(this, arguments);
             },*/

            onAfterRendering: function () {
                var showSearch = this.getShowSearch();
                if (Parent.prototype.onAfterRendering) {
                    Parent.prototype.onAfterRendering.apply(this, arguments);
                }

                var icon = this._getValueHelpIcon();
                icon.setSrc(showSearch? SEARCHICO: CANCELICO);
                icon.setSize('1.25rem');
                if (!this.__initIcon) { // small hack to get the icon to load so it can appear immediately as something is typed into it.
                    this.__initIcon = true;
                    if (!showSearch) this.setShowValueHelp(false);
                }
            },

            checkInputForReset: function (evt) {
                var sVal = typeof(evt) === 'string' ? evt : evt.getParameter("newValue")
                this.showCancel(!!sVal);
            },

            showCancel: function(bShow){
                if(this.getShowSearch()){
                    this._getValueHelpIcon().setSrc(bShow? CANCELICO: SEARCHICO);
                }else{
                    this.setShowValueHelp(bShow);
                }
            },

            setValue: function (sVal) {
                this.checkInputForReset(sVal);
                if (sap.m.Input.prototype.setValue) {
                    sap.m.Input.prototype.setValue.apply(this, arguments);
                }
            },

            fireValueHelpRequest: function () {
                this.destroySuggestionItems();
                this.setShowSuggestion(false);
                this.setValue("");
                this.fireChange({value: ''});
                this.setShowSuggestion(true);
            }
        });

        return Control;

    }, /* bExport = */ true);
