/**
 * An alternative m.Input that replaces the value-help button with a dynamic reset button. This control was developed
 * for the reason that no proper mobile autosuggest with dropdown exists in the framework yet
 */
sap.ui.define(['jquery.sap.global', 'sap/m/Input'],
    function(jQuery, Parent) {
        "use strict";

        var Control = Parent.extend('ui5lib.controls.Input', {
                init: function() {
                    Parent.prototype.init.apply(this,arguments);
                    this.setShowValueHelp(true);
                    this.attachLiveChange(this.checkInputForReset);
                },

                renderer: {}, /*function(){
                    debugger;
                    return Parent.prototype.renderer.apply(this, arguments);
                },*/

                onAfterRendering: function() {
                    if (Parent.prototype.onAfterRendering) ;{
                        Parent.prototype.onAfterRendering.apply(this, arguments);
                    }

                    var icon = this._getValueHelpIcon();
                    icon.setSrc("sap-icon://sys-cancel");
                    icon.setSize('1.25rem');
                    if(!this.__initIcon){ // small hack to get the icon to load so it can appear immediately as something is typed into it.
                        this.__initIcon = true;
                        this.setShowValueHelp(false);
                    }
                },

                checkInputForReset: function(evt){
                    var sVal = typeof(evt)==='string'? evt: evt.getParameter("newValue")
                    if(!sVal){
                        this.setShowValueHelp(false);
                    }else{
                        this.setShowValueHelp(true);
                    }
                },

                setValue: function(sVal){
                    this.checkInputForReset(sVal);
                    if (sap.m.Input.prototype.setValue) {
                        sap.m.Input.prototype.setValue.apply(this, arguments);
                    }
                },

                fireValueHelpRequest: function(){
                    this.destroySuggestionItems();
                    this.setShowSuggestion(false);
                    this.setValue("");
                    this.setShowSuggestion(true);
                }
            });

        return Control;

    }, /* bExport = */ true);
