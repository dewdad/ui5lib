sap.ui.define(['jquery.sap.global', 'sap/m/Input'],
    function(jQuery, Parent) {
        "use strict";

        var Control = Parent.extend('ui5lib.controls.Input', {
                init: function() {
                    this.setShowValueHelp(true);
                    this.attachLiveChange(this.checkInputForReset);
                },

                renderer: {},

                onAfterRendering: function() {
                    if (sap.m.Input.prototype.onAfterRendering) {
                        sap.m.Input.prototype.onAfterRendering.apply(this, arguments);
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
                    //var args = arguments;
                    //debugger;
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
                    this.setValue("");
                }
            });

        return Control;

    }, /* bExport = */ true);
