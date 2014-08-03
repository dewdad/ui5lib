(function(){

    var resourceName = "ui5lib.Controller";
    var baseController =  {
        constructor:function(){
            // implement base init
            var m = this.onInit;
            this.onInit = function(){
                this._initCustomFilters();
                this._initValidValues();
                //alert('base init');
                return m.apply(this, arguments);
            }
        },
        _initCustomFilters: function(){
            if(!!this._customFiltersObj) this.setViewModelProperty('customFilters',this._customFiltersObj());
        },
        _initValidValues: function(){
            var vVFields = this._validValues;
            var controller = this;
            if(!!vVFields){
                vVFields.forEach(function(el){
                    var entity, field, validValues;

                    entity = el.entity;
                    field = el.field;

                    validValues = controller.getViewModelProperty('/validValues/'+entity+'/'+field);

                    if(!validValues){
                        // TODO: get application service URI from Component
                        $.get("/cvs/v2/OData/getValidValues?resourceType='"+entity+"'&fieldName='"+field+"'", function(body, status, xhr){
                            var matchExp = new RegExp(field+'=\\[(.*)\\]', 'gm');
                            var responseStr = xhr.responseText;
                            var validValues = $.map(matchExp.exec(responseStr)[1].split(', '), function(value){return {desc: value};});
                            controller.setViewModelProperty('/validValues/'+entity+'/'+field, validValues);
                        });
                    }
                });
                //this.setViewModelProperty('customFilters',this._customFiltersObj());
            }
        },

        getCustomFilters: function(){
            return this.getViewModelProperty("customFilters");
        },
        getEventBus : function () {
            var sComponentId = sap.ui.core.Component.getOwnerIdFor(this.getView());
            return sap.ui.component(sComponentId).getEventBus();
        },
        myName: function(){
            return this.getView().getControllerName().split('.').pop();
        },
        getModelEntity: function(){
            return this._modelEntity || this.myName();
        },
        getRouter : function () {
            return sap.ui.core.UIComponent.getRouterFor(this);
        },
        getComponentId: function(oControl){
            return sap.ui.core.Component.getOwnerIdFor(oControl || this.getView());
        },
        getComponent: function(oControl){
            return sap.ui.getCore().getComponent(this.getComponentId());
        },
        geti18nBundle: function(){
            var sComponentId = this.getComponentId();
            return sap.ui.component(sComponentId).getModel("i18n").getResourceBundle();
        },
        toHome : function() {
            this.getRouter().navTo("home");
        },
        hasData: function(){
            return !isEmpty(arguments[0]);
        }
    };

    var addModelMembers = function(obj, models){
        var mObj = obj;
        $.each(models, function(index, value){
            mObj['get'+capsFirst(value)+'Model'] = function(){
                var core = this.getComponent();
                if(!core.getModel(value)) {
                    core.setModel(new sap.uiext.model.json.JSONModel(), value);
                }
                return core.getModel(value);
            };

            // There is some confusing code up ahead for the getters and setters that serves to default the getters/setters'
            // contexts to '/[modelEntity || ControllerName]' unless the sPath passed to them is absolute, in which case
            // they will behave as regular [get/set]Property on their respective models
            mObj['set'+capsFirst(value)+'ModelProperty']=function(sPath, oValue){
                var oModel = this['get'+capsFirst(value)+'Model']();
                var modelRootProperty = this.getModelEntity();
                var ret = oModel.setProperty(
                    (sPath.charAt(0)==='/')
                        ?sPath
                        :('/'+modelRootProperty+((typeof(sPath)!=='string')?'':'/'+sPath)),
                        oValue || sPath);
                oModel.checkUpdate();
                return ret;
            };
            mObj['get'+capsFirst(value)+'ModelProperty']=function(sPath){
                var oModel = this['get'+capsFirst(value)+'Model']();
                var modelRootProperty = this.getModelEntity();
                return oModel.getProperty((sPath.charAt(0)==='/')
                    ?sPath
                    :('/'+modelRootProperty+((!sPath)?'':'/'+sPath)));
            };
        });
    };

    // Call with all global model names,
    // this will produce:
    // get[ModelName]Model,
    // get[ModelName]ModelPropety,
    // set[ModelName]ModelPropety
    // methods on the base controller.
    // !!All access to global models will be done here only!!
    addModelMembers(baseController, ['view']);

    jQuery.sap.declare(resourceName);
    sap.ui.core.mvc.Controller.extend(resourceName, baseController);
}.call(this));