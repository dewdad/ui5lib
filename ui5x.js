console.log("ui5x2.js is loaded");
this.ui5x = jQuery.extend((this.ui5x || {}),{
    _modLoadHandlers: {},
    _checkedModules: {},
    addModLoadHandler: function(modName, fnCb){
        var modLoadHandlers = this._modLoadHandlers[modName] || (this._modLoadHandlers[modName]=[]);
        if(this._checkedModules[modName] || inArray(modName, $.sap.getAllDeclaredModules())){
            fnCb();
            this._checkedModules[modName] = true;
        }
        else modLoadHandlers.push(fnCb);
    }
});

(function(fn) {
    jQuery.sap.require = function(){
        var modName = arguments[0].modName || arguments[0];
        var toRet = fn.apply(jQuery.sap, arguments);
        var loadHandlers = ui5x._modLoadHandlers[modName] || [];
        $.each(loadHandlers, function(i,fnCb){
            fnCb();
            loadHandlers.splice(i,1);
        });
        return toRet;
    }
})(jQuery.sap.require);

/**
 * This function serves the as typed typed controllers, but provides allot more, it offers a simple extension mechanism from
 * the first object produced by this method. It does not to override constructors and onInit methods, but rather chains them.
 * @param sExtName
 * @param extImpl
 * @param baseName
 * @param sType
 */
function ui5extend (sExtName, extImpl, baseName, sType){
    sType = sType ||  baseName.split('.').pop().toLowerCase();
    /* boilerplate code for typed Controller */
    jQuery.sap.declare(sExtName);
    jQuery.sap.declare({modName:sExtName, type:sType}); // declaring a special type of module
//    var extension = getObjProperty(window,sExtName,false);
    //eval(sExtName+' = function(){'+baseName+'.apply(this, arguments);}');
    setProperty(this, function () { // the constructor
        getObjProperty(window,baseName,false).apply(this, arguments);
        var ctor = getObjProperty(extImpl,'constructor',false);
        if(!!ctor){
            ctor.apply(this, arguments);
            //delete extImpl['constructor'];
        }
    }, sExtName);

    jQuery.sap.require(baseName); // this is currently required, as the Controller is not loaded by default

    getObjProperty(window,sExtName,false).prototype = jQuery.sap.newObject(getObjProperty(window,baseName,false).prototype); // chain the prototypes
    /* end of boilerplate code for typed Controller */
    getObjProperty(window,sExtName,false).extend = function(sExtendingName, oImpl) {
        return ui5extend(sExtendingName, oImpl, sExtName);
    };

    getObjProperty(window,sExtName,false).prototype.onInit = function() {
        try{getObjProperty(window,baseName,false).prototype.onInit.apply(this, arguments)}catch(e){}
        var onInit = getObjProperty(extImpl, 'onInit', false);
        if(!!onInit) onInit.apply(this, arguments);
    };

    $.each(extImpl, function(key,value){
        if(!inArray(key, ['onInit', 'constructor'])) getObjProperty(window, sExtName, false).prototype[key] = value;
    });
};

jQuery.sap.require("sap.ui.core.Element");
jQuery.sap.require("sap.ui.model.Model");

/**!!!           Element            !!!**/
// Need to consult with SAPUI5 on how to make this sound with multi-bound elements, or multiple aggregations
sap.ui.core.Element.prototype.setPropertyFire = function(sPropertyName, oValue, bSuppressInvalidate){
    var toReturn = this.setPropertyFire(sPropertyName, oValue, bSuppressInvalidate);
    this.fireChange();
};

sap.ui.core.Element.prototype.getContextProperty =
    sap.ui.core.Element.prototype.getBoundProperty = function(sPath){
        var context = this.getBindingContext();
        if(!!context){
            return context.oModel.getProperty(context.sPath+(!!sPath? ('/'+sPath): ''));
        }
        return undefined;
    };

sap.ui.core.Element.prototype.bindingProxy = function(){
    var oContext = this.getBindingContext();
    if(!oContext || !oContext.oModel.proxy) return;
    this.__prevBindingContext = oContext; // store for revert
    var proxyModel = oContext.oModel.proxy(oContext.sPath);
    this.setModel(proxyModel).bindElement('/data');
    return this;
};

sap.ui.core.Element.prototype.bindingRevert = function(){
    if(!this.__prevBindingContext) return;
    this.setModel(this.__prevBindingContext.oModel).bindElement(this.__prevBindingContext.sPath);
    delete this.__prevBindingContext;
    return this;
};

sap.ui.core.Element.prototype.x_AddUpdateRow = function(oData,sRowBindingPath, sIdProperty){
    var model = this.getModel();
    sIdProperty = sIdProperty || 'id';

    if(!!model){
        // If the RowBindingPath was not pass then extract from element binding info
        sRowBindingPath = sRowBindingPath || this.x_GetRowsBindingPath();
        return model.x_AddUpdateRow(oData, sRowBindingPath);
    }else{
        jQuery.sap.log.error('Element must have a model to execute function "x_AddUpdateRow"');
    }
};

sap.ui.core.Element.prototype.x_SetData = function(oData,sPath, sModelName){
    var model = this.x_GetSetModel(sModelName);
    if(!!model){
        return model.x_SetData(oData, sPath || '');
    }else{
        jQuery.sap.log.error('Element must have a model to execute function "x_AddUpdateRow"');
    }
};

sap.ui.core.Element.prototype.x_GetSetModel  = function(modelName){
    if(!this.getModel(modelName)){
        var jsmodel = new sap.uiext.model.json.JSONModel({});
        this.setModel(jsmodel, modelName);
    }
    return this.getModel(modelName);
};

sap.ui.core.Element.prototype.x_SetJSModel  = function(oData, sName){
    var jsmodel = new sap.uiext.model.json.JSONModel(oData);
    this.setModel(jsmodel, sName);
    return this;
};

/**
 * Takes a string path or Context object and deletes the branch by the given path in the element's model
 * @param {string | Context} context
 */
sap.ui.core.Element.prototype.x_ModelDeleteRow = function(context){
    context = sui.getBindingStr(context);
    if(isEmpty(context)){
        jQuery.sap.log.debug('A context argument must be passed for x_ModelDeleteRow to operate');
        return;
    }
    if(!!this.getModel().removeFrom)
        this.getModel().removeFrom(context);
};

sap.ui.core.Element.prototype.x_GetModelRows = function(){
    if(this.hasModel()){
        var rowsBindPath =  this.x_GetRowsBindingPath(),

            aggrObj = getFromObjPath(this.getModel().getData(), rowsBindPath, '/');
        if(isEmpty(aggrObj)) {
            var newArr = new Array();
            setToValue(this.getModel().getData(), newArr,rowsBindPath, '/');
            return newArr;
        }
        return aggrObj;
    }
    jQuery.sap.log.debug("Element must have model to use method x_GetModelRows");
    return false;
};

sap.ui.core.Element.prototype.x_GetModelRowByIndex = function(i){
    return this.x_GetModelRows()[i];
};

sap.ui.core.Element.prototype.x_BindAggregation = function(aggrgationName, sPath, oTemplate, oSorter, aFilters){
    var defaultAggr = aggrgationName ||this.x_GetRecordsAggregation();
    var path = sPath || ''; //sPath[0]!='/' && !this.getBindingContext()? '/'+sPath: sPath
    var bTemplate = oTemplate || this.x_GetBindingTemplate();
//	var bindInfo = {
//			path: sPath[0]!='/' && !this.getBindingContext()? '/'+sPath: sPath,
//					template: oTemplate || this.x_GetBindingTemplate()
//		};
    if(!!defaultAggr && !!bTemplate){
        this.bindAggregation(defaultAggr, path, bTemplate, oSorter, aFilters);
    }
};

sap.ui.core.Element.prototype.x_BindRecordsAggregation = function(sPath, oTemplate, oSorter, aFilters){
    var defaultAggr = this.x_GetRecordsAggregation();
    if(!!defaultAggr){
        this.x_BindAggregation(defaultAggr, sPath, oTemplate, oSorter, aFilters);
    }
};

sap.ui.core.Element.prototype.x_GetRecordsAggregation = function(){
    if(!!this.getRows)
        return "rows";
    else if(!!this.getItems)
        return "items";
    else if(!!this.getContent){
        return "content";
    }
    else{
        jQuery.sap.log.debug('The element has no records binding aggregation.');
        return null;
    }
};

sap.ui.core.Element.prototype.x_GetRecordsBindingPath = function(){
    return this.getBindingPath(this.x_GetRecordsAggregation());
};

sap.ui.core.Element.prototype.getBindingSizeLimit = function(){
    // defaulted to one hundred as suggested by SAPUI5 team due to that being the default value
    // for the library's elements
    return this.getModel() && this.getModel().iSizeLimit || 100;
};

sap.ui.core.Element.prototype.x_isRecordBound = function(){
    return !isEmpty(this.getBindingPath(this.x_GetRecordsAggregation()));
};

sap.ui.core.Element.prototype.x_GetModelLastRow = function(){
    var mRows = this.x_GetModelRows(), mLastIndex = mRows.length-1;
    return mRows[mLastIndex];
};

sap.ui.core.Element.prototype.x_GetAggregatingParent = function(){
    var parent = this;
    while(parent !== this.getUIArea()){
        if(!isEmpty(parent.getBindingPath('rows')))
            return parent;
        parent = parent.getParent()
    }
    return false;
};

sap.ui.core.Element.prototype.x_GetRowsBindingPath = function(){
    var aggrParent = this.x_GetAggregatingParent(), bContext = aggrParent.getBindingContext(),
        rBPath = aggrParent.getBindingPath('rows'), patt = new RegExp(bContext);

    if(!!bContext && !patt.test(rBPath))
        return [bContext, rBPath].join('/');

    return rBPath;
};

sap.ui.core.Element.prototype.x_GetBindingTemplate = function(aggr){
    var aggr = aggr || this.x_GetRecordsAggregation();
    return getFromObjPath(this, 'mBindingInfos.'+aggr+'.template');
};

sap.ui.core.Element.prototype.x_SetBindingTemplate = function(oTemplate, aggregationName){
    var aggregationName = aggregationName || this.x_GetRecordsAggregation();
    //if(!!getObjProperty(this, 'mBindingInfos.'+aggregationName))
    //setToValue(this, oTemplate, 'mBindingInfos.'+aggregationName+'.template');
    //this.x_BindingTemplate = oTemplate
    this.x_BindAggregation(aggregationName, null, oTemplate);
};

sap.ui.core.Element.prototype.x_GetLabel = function(){
    return $('label[for='+this.getId()+']');
};

/**
 * returns the label text for this input
 * @return {string}
 */
sap.ui.core.Element.prototype.x_GetLabelText = function(){
    return this.x_GetLabel().text().replace(/^[\s:]+|[\s:]+$/g,''); // trim and "user:" becomes "user"
};

sap.ui.model.SimpleType.extend("ui5lib.model.BoolInvert", {
    formatValue: function(oValue) {
        return !oValue;
    },
    parseValue: function(oValue) {
        return !oValue;
    },
    validateValue: function(oValue) {
        if (typeof oValue !== "boolean") {
            throw new sap.ui.model.ValidateException("BoolInvert must be boolean");
        }
    }
});

/*$.sap.require('sap.ui.table.TreeTable');
$.sap.declare('ui5lib.EditTreeTable');
sap.ui.table.TreeTable.extend("ui5lib.EditTreeTable", ui5lib.EditableTree = {
    metadata: {
        properties: {
            saveTimeOut: {type: "int", defaultValue: 3000},
            editModelProperty: {type: "string", defaultValue: "__edit"}, // property to set a row to edit mode
            editableModelProperty: {type: "string", defaultValue: ""} // which records/rows can be edited
        },
        events: {
            edit: {},
            save: {},
            cancel: {}
        }
    },
    init: function () {
        this._hasEditActionColumn = false;
        this.__proto__.__proto__.init.apply(this, arguments);
    },
    addColumn: function (oCol) {
        var template = oCol.getTemplate();
        if (!!template && !!template.fireChange) {
            if(!!template.setEditable) template.bindProperty("editable", this.getEditModelProperty());
            else template.bindProperty("enabled", this.getEditModelProperty());
        }
        return this.__proto__.__proto__.addColumn.apply(this, arguments);
    },
    onBeforeRendering: function () {
        var self = this;
        var tableId = this.getId();
        var editableProperty = this.getEditableModelProperty();
        var editProperty = this.getEditModelProperty();

        if (!this._hasEditActionColumn) {
            this.setModel(new sap.uiext.model.json.JSONModel({__editing: false}), tableId);

            var oHbox = new sap.ui.commons.layout.HorizontalLayout();

            function addActionContent() {
                if (!editableProperty || getObjProperty(this.getBoundProperty(), editableProperty)) {
                    //this.addContent(new sap.ui.commons.Label({text: "Web Site"}));
                    this.addContent(
                        new sap.ui.commons.layout.HorizontalLayout({content: [
                            new sap.ui.commons.Button({
                                icon: 'sap-icon://edit',
                                lite: true,
                                enabled: {path: tableId + ">/__editing", type: 'ui5lib.model.BoolInvert'},
                                //style: sap.ui.commons.ButtonStyle.Emph,
                                visible: {path: editProperty, type: 'ui5lib.model.BoolInvert'},
                                press: function (e) {
                                    var model = this.getModel();
                                    var path = this.getBindingContext().getPath();
                                    var obj = model.getProperty(path);
                                    model.addRevision('editPressed');
                                    model.setProperty(path + "/" + editProperty, true);
                                    self.setEditMode(true);
                                    //sap.m.MessageToast.show('Edit: ' + JSON.stringify(obj));
                                }
                            }),
                            new sap.ui.commons.layout.HorizontalLayout({visible: "{" + editProperty + "}", content: [
                                new sap.ui.commons.Button({style: "Accept", lite: true, icon: "sap-icon://save", press: function (evt) {
                                    self.onSave(evt, this.getBindingContext());
                                }}),
                                new sap.ui.commons.Button({style: "Reject", lite: true, icon: "sap-icon://decline", press: function (evt) {
                                    self.onCancel(evt, this.getBindingContext());
                                }})
                            ]})
                        ]})
                    );
                    return true;
                }
                else return false;
            }

            if (!!editableProperty) { // TODO: [TreeTable render bug] When the tree renders hidden controls in during branch expand those controls flicker and then become invisible
                oHbox.bindProperty("visible", {path: editableProperty, formatter: addActionContent})
            } else {
                addActionContent.call(oHbox);
            }

            this.addColumn(new sap.ui.table.Column({
                width: "100px",
                hAlign: "Center",
                label: new sap.ui.commons.Label({text: ""}),
                template: oHbox
            }));
            this._hasEditActionColumn = true;
        }
    },
    onCancel: function (evt, oContext) {
        this.fireCancel(evt, oContext);
        var model = oContext.getModel();
        var path = oContext.getPath();
        var obj = model.getProperty(path);
        model.restoreRevision('editPressed');
        model.setProperty(path + "/" + this.getEditModelProperty(), false);
        this.setEditMode(false);
    },
    onSave: function (evt, oContext) {
        var self = this;
        evt.oSource = this;
        evt.mParameters.id = this.getId();
        evt.data = oContext.getObject();
        evt.success = $.proxy(this.onSaveSuccess, this);
        evt.error = $.proxy(this.onSaveError, this);

        this.setBusy(true);
        this.fireSave({eventData:evt, dataContext:oContext});
        this._saveTimer = true;
        setTimeout(function () {
            if (!!self._saveTimer) self.onSaveError();
        }, this.getSaveTimeOut());
    },
    onSaveSuccess: function (sMsg) {
        this._saveTimer = false;
        jQuery.sap.require("sap.m.MessageToast");
        sap.m.MessageToast.show(sMsg || "The save operation completed successfully.");
        this.setBusy(false);
        this.setEditMode(false);
    },
    onSaveError: function (sMsg) {
        this._saveTimer = false;
        mui.ErrorMsg(sMsg || "The save operation failed!");
        this.setBusy(false);
    },
    setEditMode: function(bEditMode){
        this.getModel(this.getId()).setProperty("__editing", bEditMode);
    },
    renderer: {}
});

$.sap.require('sap.m.ColumnListItem');
$.sap.declare('ui5lib.ColumnListEditItem');
sap.m.ColumnListItem.extend("ui5lib.ColumnListEditItem",{
    metadata:{
        properties:{
            saveTimeOut: {type : "int", defaultValue: 3000}
        },
        events:{
            edit: {},
            save: {},
            cancel: {}
        }
    },
    /!*constructor:function(){
     console.log('ui5lib.ColumnListEditItem.ctor', this, arguments);
     return ui5lib.ColumnListEditItem.prototype.constructor.apply(this, arguments);
     },*!/
    init:function(){
        /!*var parent = this.getParent();
         if(!parent.getModel('___EDITMODE___')){
         parent.x_SetJSModel({editMode: false}, '___EDITMODE___')
         }*!/
        /!*<!--<HBox>
         <Button icon="sap-icon://edit" press="onEditPress" visible="{path:'view>/aggr/editMode', type:'ui5lib.model.BoolInvert'}" />
         <HBox visible="{view>/aggr/editMode}">
         <Button icon="sap-icon://save" press="onEditPress"/>
         </HBox>
         </HBox>-->*!/
        var self = this;
        var parent;
        var intervId = setInterval(function(){
            if(!!(parent = self.getParent())){
                if(!!parent.___LISTEDITITEM___){
                    clearInterval(intervId);
                }else{
                    parent.addColumn(new sap.m.Column({width: "86px"}));
                    parent.___LISTEDITITEM___ = true;
                    clearInterval(intervId);
                }
            }
        }, 10)

    },
    destroyClonedHeaders: function(){
        try {
            var toRet = sap.m.ColumnListItem.prototype.destroyClonedHeaders.apply(this, arguments);
            return toRet;
        }catch(e){}
    },
    onBeforeRendering: function(){
        var self = this;
        var parent = this.getParent();
        if(!parent.getModel('___EDITMODE___')){
            parent.x_SetJSModel({editMode: false}, '___EDITMODE___');
        }
        this.addCell(new sap.m.HBox({
            items: [
                new sap.m.Button({icon:"sap-icon://edit", visible:{path:'___EDITMODE___>/editMode', type:'ui5lib.model.BoolInvert'}, press: function(evt){
                    self.fireEdit(evt);
                    if(!evt.bPreventDefault){
                        self.onEdit(evt);
                    }
                }}),
                new sap.m.HBox({width:"84px", justifyContent:"SpaceBetween", visible: "{___EDITMODE___>/editMode}", items:[
                    new sap.m.Button({type:"Accept", icon:"sap-icon://save", press: function(evt){
                        self.onSave(evt);
                    }}),
                    new sap.m.Button({type:"Reject", icon:"sap-icon://decline", press: function(evt){
                        self.onCancel(evt);
                    }})
                ]})
            ]
        }));
    },
    onEdit: function(evt){
        this.bindingProxy();
        this.setEditMode(true);
        this.enableInputs(true);
    },
    onSave: function(evt){
        var self = this;
        evt.oSource = this;
        evt.mParameters.id = this.getId();
        evt.data = this.getBoundProperty();
        evt.success = $.proxy(this.onSaveSuccess, this);
        evt.error = $.proxy(this.onSaveError, this);

        this.setBusy(true);
        this.fireSave(evt);
        this._saveTimer = true;
        setTimeout(function(){
            if(!!self._saveTimer) self.onSaveError();
        }, this.getSaveTimeOut());
    },
    onSaveSuccess: function(sMsg){
        this._saveTimer = false;
        jQuery.sap.require("sap.m.MessageToast");
        sap.m.MessageToast.show(sMsg || "The save operation completed successfully.");
        this.setBusy(false);
        this.setEditMode(false);
    },
    onSaveError: function(sMsg){
        this._saveTimer = false;
        mui.ErrorMsg(sMsg || "The save operation failed!");
        this.setBusy(false);
    },
    onCancel: function(evt){
        this.fireCancel(evt);
        this.bindingRevert();
        this.enableInputs(false);
        this.setEditMode(false);
    },
    addCell: function(oCtrl){
        if(!!oCtrl.fireChange){
            if(oCtrl.setEditable){
                oCtrl.setEditable(false);
            }else oCtrl.setEnabled(false);

            this.__inputs = this.__inputs || [];
            this.__inputs.push(oCtrl);
        }
        return sap.m.ColumnListItem.prototype.addCell.apply(this, arguments);
    },
    setEditMode: function(bEditMode){
        if(bEditMode){
            this.x_SetJSModel({editMode:true},'___EDITMODE___');
        }else{
            this.setModel(null, '___EDITMODE___');
        }
    },
    enableInputs: function(bEnable){
        if(!!this.__inputs){
            this.__inputs.forEach(function(e){
                if(e.setEditable){
                    e.setEditable(bEnable);
                }else e.setEnabled(bEnable);
            });
        }
    },
    setBusy: function(bBusy){
        try{
            $('#'+this.getId()+' .sapMHBox').control()[0].setBusy(bBusy,0);
        }catch(e){
            console.debug(e);
        }
        this.enableInputs(bBusy);
    },
    renderer : {}
});*/

/**!!!           End Element           !!!**/

$.sap.require('sap.ui.model.odata.ODataListBinding');

(function(fn){
    sap.ui.model.odata.ODataListBinding.prototype.createFilterParams = function(aFilters){
        if(!!this._staticFilters)
            aFilters = (aFilters||[]).concat(this._staticFilters.concat(getValuesByKeys(this._staticFilters)) || []);
        return fn.apply(this, arguments);
    };
})(sap.ui.model.odata.ODataListBinding.prototype.createFilterParams);
// removed in favor of hijacking ODataListBinding.prototype.createFilterParams, as it occurs after the aFilters member is updated
/*(function(fn){
 sap.ui.model.odata.ODataListBinding.prototype.filter = function(aFilters){
 if(!!this._staticFilters)
 aFilters = (aFilters||[]).concat(this._staticFilters.concat(getValuesByKeys(this._staticFilters)) || []);
 return fn.apply(this, arguments);
 };
 })(sap.ui.model.odata.ODataListBinding.prototype.filter);*/

/**
 * adds static filters to the list binding object that will persist across filter calls
 * @param {string} sId? The id for the filter, this way filters can be updated or easily removed
 * @param {sap.ui.model.Filter | array} aFilters
 * @return {sap.ui.model.ListBinding} returns <code>this</code> to facilitate method chaining
 *
 * @public
 * @name sap.ui.model.odata.ODataListBinding#x_addFilter
 * @function
 */
sap.ui.model.odata.ODataListBinding.prototype.x_addFilter= function(sId, aFilters){
    if(typeof sId !== 'string'){
        if(arguments.length>1){
            console.error("sId must be a string");
            return;
        }
        aFilters = sId;
        sId = undefined;
    }else if(aFilters.length && aFilters.length>1){
        console.error("If an sId is assigned, only one filter may be given. Id's may be assigned inside the filters as well");
        return;
    }
    this._staticFilters = this._staticFilters || [];
    var that = this;
    aFilters = isArray(aFilters)? aFilters: [aFilters];
    aFilters.forEach(function(v){
        if(!!sId || !!v.id){
            that._staticFilters[(sId || v.id)] = v;
            delete v.id;
        }else{
            that._staticFilters.push(v);
        }
    });
    // removed in favor of hijacking ODataListBinding.prototype.createFilterParams, as it occurs after the aFilters member is updated
    // removeFromArray(this.aFilters, this._staticFilters.concat(getValuesByKeys(this._staticFilters)));

    return this.filter(this.aFilters);
};
/**
 * Removes a filter from the binding via filter id or value
 * @param {string | sap.ui.model.Filter} filter
 * @return {sap.ui.model.ListBinding} returns <code>this</code> to facilitate method chaining
 *
 * @public
 * @name sap.ui.model.odata.ODataListBinding#x_removeFilter
 * @function
 */
sap.ui.model.odata.ODataListBinding.prototype.x_removeFilter= function(filter){
    if(!this._staticFilters) return;

    if(typeof filter === 'string'){
        delete this._staticFilters[filter];
    }else if(filter instanceof  sap.ui.model.Filter){
        removeFromArray(this._staticFilters, filter);
    }else{
        throw new Error("Unrecognized filter type, needs to either id or sap.ui.model.Filter");
    }
    return this.filter(this.aFilters);
};

sap.ui.model.odata.ODataListBinding.prototype.x_removeAllFilters= function(filter){
    this._staticFilters = [];
    this.filter();
}


/**
 * Adds support to the ODataListBinding type to search on OData service endpoints.
 * it does so by building a specialized filter that is later extracted before XHR open and replaced
 * with a valid logical contains statement chained by "or" operator.
 * @param aFields   An array of strings corresponding to the service entity fields to be included in the search
 * @param sQuery    The search term
 * @return {sap.ui.model.ListBinding} returns <code>this</code> to facilitate method chaining
 */
sap.ui.model.odata.ODataListBinding.prototype.x_search = function(aFields, sQuery){
    // Add support for search ONCE
    if(!sap.ui.model.odata.ODataListBinding.prototype.x_searchSupport){
        // Overriding filter on oBinding to check for the search filter before issuing a filter on the binding
        /*(function(filter){
         sap.ui.model.odata.ODataListBinding.prototype.filter = function(aFilters){
         if(!!this.x_searchFilter){
         aFilters.push(this.x_searchFilter);
         }
         return filter.apply(this, arguments);
         };
         })(sap.ui.model.odata.ODataListBinding.prototype.filter);*/

        // Augmenting XHR open to serialize the special search filter from the binding's filter string
        (function() {
            var proxied = window.XMLHttpRequest.prototype.open;
            window.XMLHttpRequest.prototype.open = function() {
                if(arguments[1].search(/__SEARCHFILTER__/mg)>-1){
                    var matches = /__SEARCHFILTER__(.*?)__SEARCHFILTER__%20eq%20'?([a-z,A-Z,0-9, ,-,]+)'?/mgi.exec(arguments[1]);

                    // TODO: make sure there are fields listed in the special search filter
                    var filterColumns = $.map(matches[1].split('|'), function(v){
                        return "substringof('"+matches[2]+"',"+v+")";
                    });

                    var searchFilterStr = "("+filterColumns.join(" or ")+")";

                    arguments[1] = arguments[1].replace(matches[0], searchFilterStr);
                }
                return proxied.apply(this, arguments);
            };
        })();
        sap.ui.model.odata.ODataListBinding.prototype.x_searchSupport = true;
    }

    var aFilters = this.aFilters;
    //var aSorters = this.aSorters;

    // clear out the search filter
    /*aFilters = $.grep(aFilters, function(v){ if (v.sPath.search(/__/)<0) return true; });
     this.x_searchFilter= null;*/

    if(!!sQuery) { // add the special search filter to be serialized on xhr open
        /*this.x_searchFilter =*/
        var searchFilter = new sap.ui.model.Filter('__SEARCHFILTER__' + aFields.join('|') + '__SEARCHFILTER__', 'EQ', sQuery);
        searchFilter.id = "__SEARCHFILTER__";
        this.x_addFilter(searchFilter);
    }else{
        this.x_removeFilter("__SEARCHFILTER__");
    }
    return this/*.sort(aSorters)*/.filter(aFilters);

};

/**!!!          JSON Model              !!!**/

sap.ui.model.Model.prototype.x_SetData = function(dataObj, sPath, bMerge){
    var oData = this.getData() || {};
    var dataClone = clone(dataObj);

    if(!isEmpty(sPath))
        setProperty(oData, dataClone, sPath, '/'); // this provides mirroring where as the merge supplied by SUI5 only supplies updating
    else
        oData = dataClone;

    if(arguments.length>2) this.setData(oData, bMerge);
    else this.setData(oData);

    this.checkUpdate();
};

/**
 *
 * @param oData the data object to write to the model
 * @param sRowsBindPath the row binding path from the requesting UI element
 * @param sIdProperty the identifying property of the oData object
 * @return {int} number of rows in the row binding path
 */
sap.ui.model.Model.prototype.x_AddUpdateRow = function(oData, sRowsBindPath, sIdProperty){
    sIdProperty = sIdProperty || 'id';

    if(!sRowsBindPath){
        jQuery.sap.log.error('An sPath or sRowBindPath must be provided to model.x_AddUpdateRow"');
        return -1;
    }
    var modelRows = this.getProperty(sRowsBindPath), modelRowsLen;

    if(!modelRows){
        var mData={};
        setToValue(mData,[oData],sRowsBindPath, '/');
        this.setData(mData);
        modelRows = this.getProperty(sRowsBindPath);
    }

    modelRowsLen = modelRows.length;

    var objIndex = !!oData[sIdProperty]? indexOfKeyValue(modelRows, sIdProperty, oData[sIdProperty]): -1;
    //  if objIndex>-1 oData was found and this is an add operation, otherwise it is an update operation
    var sPath = sRowsBindPath + '/' + (objIndex>-1? objIndex: modelRowsLen);
    this.x_SetData(oData, sPath);
    // return row count
    return (objIndex>-1? modelRowsLen: modelRowsLen+1);
};

sap.ui.model.json.JSONModel.extend("sap.uiext.model.json.JSONModel", {
    metadata:{
        events: {
            "propertyChange":{}
        }
    },

    addRevision: function(key){
        var oData = clone(this.getData());
        this.__revisions = this.__revisions || [];

        if(!!key){
            if(typeof key === "string"){}
            else key = btoa(JSON.stringify(key)); // convert type to reconstructable key
            this.__revisions[key] = oData;
        }else{
            this.__revisions.push(oData);
        }
    },

    restoreRevision: function(key){
        if(!this.__revisions) return undefined;
        var oData =  !!key?
            (
                typeof key === "string"?
                    this.__revisions[key]:
                    this.__revisions[btoa(JSON.stringify(key))]
            ):
            this.__revisions.pop();
        if(!isEmpty(oData)) this.setData(oData);
    },

    validateInput: function(notify){
        if(!isEmpty(getObjProperty(this, 'validation_errors'))){
            if(!!notify){
                var messages = [];
                for(var errElem in this.validation_errors){
                    // TODO?: make inner loop to display messages for elements
                    messages.push(this.validation_errors[errElem].messages[0]);
                }
                if(!!sui) sui.input_validation.alert(messages);
            }
            return false;
        }
        return true;
    },
    /**
     *
     * @param sPath Absolute path inside the oData member of the model or the object passed through "oContext" param
     * @param oValue Value to write to sPath in the model object
     * @param oContext [optional]
     * @returns {*|void|sap.ui.base.ManagedObject|boolean|sap.uiext.model.json.JSONModel}
     */
    setProperty: function(sPath, oValue, oContext){
        var ret;
        if(!/^\//.test(arguments[0])){
            arguments[0] = '/'+arguments[0];
        }

        // Create path if it does not exist
        propertyGetSet(parentPath(sPath), this.oData, '/');
        ret = sap.ui.model.json.JSONModel.prototype.setProperty.apply(this, arguments);

        this.fireEvent('propertyChange', {sPath:sPath, oValue:oValue, oContext:oContext});
        return ret;
    },
    /**
     * the path to the property
     * @param {String | Object} sPath
     * @param {String | Object} [oContext]
     * @return {Object}
     */
    setData: function(){
        sap.ui.model.json.JSONModel.prototype.setData.apply(this, arguments);
        this.fireEvent('propertyChange', {sPath:'', oValue:arguments[0], oContext:'/'});
    },
    /**
     * Creates a subset of the model which is a proxy of it, changes will not affect the original model
     * unless commitChanges as been called on the proxy
     */
    proxy: function(sPath){
        var proxiedValue = this.getProperty(sPath||'/');
        var proxyModel = new sap.uiext.model.json.JSONModel({data:clone(proxiedValue)});
        proxyModel._dataSource = {model: this, path: sPath || '/'};
        return proxyModel;
    },
    revert: function(){
        var dataSrc = this.getDataSource();
        var srcModel = dataSrc.model;
        if(!!srcModel){
            this.setProperty('data', clone(srcModel.getProperty(dataSrc.path)));
        }
    },
    getDataSource: function(){return this._dataSource || {model:undefined, path:undefined};},
    commitChanges: function(){

    },
    removeFrom: function(sPath){
        removeObjProperty(this.getData(),sPath,'/');
        this.checkUpdate();
        var delPathArr = sPath.split('/');
        var changedPath = delPathArr.slice(0,delPathArr.length-1).join('/');
        this.fireEvent('propertyChange', {sPath:changedPath, oValue:null, oContext:'/', bindPath:changedPath});
    },
    renderer : {} // an empty renderer by convention inherits the parent renderer
});
/**!!!           END JSON Model             !!!**/

/**!!!           Start Framework Fiddling             !!!**/

// The following 3 closures are required to fix the model inheritance tree for fragments and fragment-dialogs (sadly these lie in different branches currently)

/*
 ui5x.addModLoadHandler("sap.ui.core.Fragment", function() {

 (function (fn) {
 sap.ui.fragment = function () {
 var controller = $.grep(arguments, function (v) {
 return v instanceof sap.ui.core.mvc.Controller;
 })[0];
 var fragment = fn.apply(null, arguments);
 if (!!controller){
 var view = controller.getView();
 view.addDependent(fragment); // fix fragment inheritance
 if(!!fragment._dialog) view.addDependent(fragment._dialog); // fix fragment-dialog inheritance
 }
 return fragment;
 }
 }(sap.ui.fragment));

 });

ui5x.addModLoadHandler("sap.ui.model.Context", function() {

    (function (fn) {
        sap.ui.model.Context = function () {
            debugger;
            return fn;
        }
    }(sap.ui.model.Context));

});
 */