sap.ui.define(['jquery.sap.global', 'sap/m/CheckBox'],
    function (jQuery, Parent) {
        "use strict";
        var Control = Parent.extend('ui5lib.controls.TriStateCheckBox', {
            metadata: {
                properties: {
                    state: {type: 'int', defaultValue: 0},
                    /**
                     * An id for the parent checkbox of type ui5lib.controls.TriStateCheckBox
                     */
                    parent: {type : "string"}
                },
                associations: {
                    /*parent: {type: "ui5lib.controls.TriStateCheckBox", multiple: false},*/
                    nestedCheckBoxes: {type: "sap.m.CheckBox", multiple: true, singularName: "nestedCheckBox"}
                },

                setParent: function(sId){
                    if(!sId) return this;
                    var parentCheckBox = ui.byId(sId);

                    parentCheckBox.addNestedCheckBox(this); // so parent can update child (this) onSelect
                },

                addNestedCheckBox: function(oCheckBox){
                    var oParent = this;

                    oCheckBox.attachSelect(function () {
                            this.getSelect() ? oParent._selectedChildren += 1 : oParent._selectedChildren -= 1;
                            if (oParent._selectedChildren === 0) {
                                oParent.setState(0);
                            }
                            else if (oParent._selectedChildren === oParent.getNestedCheckBoxes().length) {
                                oParent.setState(1);
                            }
                            else {
                                oParent.setState(2);
                            }
                        }
                    );
                },

                onAfterRendering: function () {
                    var $this = this.$();
                    $this.find('div').removeClass('sapMCbMarkChecked');
                    $this.removeClass('triStateCheckBoxSelected');
                    $this.removeClass('triStateCheckBoxMixed');

                    if (this.getState() === 1) {
                        $this.addClass('triStateCheckBoxSelected');
                    } else if (this.getState() === 2) {
                        $this.addClass('triStateCheckBoxMixed');
                    }
                },

                fireSelect: function (s) {
                    var v = s.selected ? 1 : 0;
                    this.setState(v);
                    this.fireEvent('select', {'state': v});
                },
                registerChildren: function (allChildren) {
                    var oParent = this;
                    var nSelectedChildren = 0;
                    for (var i = 0; i < allChildren.length; i++) {
                        allChildren[i].attachSelect(function () {
                                this.getSelect() ? nSelectedChildren += 1 : nSelectedChildren -= 1;
                                if (nSelectedChildren === 0) {
                                    oParent.setState(0);
                                }
                                else if (nSelectedChildren === allChildren.length) {
                                    oParent.setState(1);
                                }
                                else {
                                    oParent.setState(2);
                                }
                            }
                        );
                    }
                    oParent.attachChange(function () {
                        if (this.getSelectionState() === "Checked") {
                            for (var i = 0; i < allChildren.length; i++) {
                                allChildren[i].setChecked(true);
                                nSelectedChildren = allChildren.length;
                            }
                        }
                        else {
                            for (var i = 0; i < allChildren.length; i++) {
                                allChildren[i].setChecked(false);
                                nSelectedChildren = 0;
                            }
                        }
                    });
                },

                renderer: {}
            }
        });

        jQuery('head').append('<style>.triStateCheckBoxSelected div:before {content: "\e05b"; font-family: "SAP-icons"; color: #007cc0;} .triStateCheckBoxMixed div:before { content: "\e17b"; font-family: "SAP-icons"; color: #007cc0;} </style>');
        return Control
    }
);

